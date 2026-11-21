import { Router } from 'express';
import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { ConflictError, RequestValidationError, ServiceUnavailableError } from '../../exceptions/index.js';
import { authenticateUser } from '../../middleware/authenticateUser.js';
import { createRateLimiter } from '../../middleware/rateLimiter.js';
import { recordAudit } from '../../utils/audit.js';
import { getOwnerForUser } from '../../utils/owner.js';
import type { AuthService } from '../auth/auth.types.js';
import { legacyMailer } from '../legacy/legacy-mailer.js';
import { environment } from '../../config/environment.js';
import { createNotification } from '../../utils/notifications.js';
import { MailDeliveryError } from '../legacy/legacy-mailer.js';
import { createOutboxEmailToken } from '../legacy/email-token.js';

const beneficiarySchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255).transform((value) => value.toLowerCase()),
  relationship: z.string().trim().min(1).max(80),
});
function hash(value: string) { return createHash('sha256').update(value).digest('hex'); }
function appUrl(path: string) { return new URL(path, environment.APP_BASE_URL ?? environment.FRONTEND_URL).toString(); }
function invitationDiagnostic(requestId: string, event: string, details: Record<string, unknown> = {}) {
  console.info(JSON.stringify({ level: 'info', event, requestId, ...details }));
}
function safeErrorCategory(error: unknown) {
  if (error instanceof MailDeliveryError) return `mail_${error.kind}${error.status ? `_${error.status}` : ''}`;
  if (error instanceof Error) {
    const safeCategories: Record<string, string> = {
      MAIL_MODE_LOG: 'mail_mode_log',
      DELIVERY_NOT_CONFIRMED: 'delivery_not_confirmed',
    };
    if (safeCategories[error.message]) return safeCategories[error.message];
  }
  if (typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string' && /^[A-Z]\d{4}$/.test(error.code)) return `database_${error.code}`;
  return error instanceof Error ? error.name : 'unknown_error';
}

export function createBeneficiaryRouter(authService: AuthService) {
  const router = Router();
  router.use(authenticateUser(authService));
  const inviteLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 10,
    key: (request) => request.authenticatedUserId ?? request.ip ?? 'unknown',
  });
  router.get('/', async (request, response, next) => {
    try { const owner = await getOwnerForUser(request.authenticatedUserId!); const records = await prisma.beneficiary.findMany({ where: { ownerId: owner.id, status: { not: 'REMOVED' } }, include: { policies: { select: { id: true, name: true, status: true } } }, orderBy: { createdAt: 'desc' } }); response.json({ success: true, data: { beneficiaries: records } }); } catch (error) { next(error); }
  });
  router.post('/', inviteLimiter, async (request, response, next) => {
    const requestId = String(response.locals.requestId ?? 'unassigned');
    let stage = 'invitation_request_received';
    invitationDiagnostic(requestId, stage);
    try {
      const parsed = beneficiarySchema.safeParse(request.body);
      if (!parsed.success) throw new RequestValidationError('Invalid beneficiary data.');
      const owner = await getOwnerForUser(request.authenticatedUserId!);
      const existing = await prisma.beneficiary.findFirst({
        where: { ownerId: owner.id, email: parsed.data.email, status: { notIn: ['REMOVED', 'REVOKED'] } },
      });
      if (existing) throw new ConflictError('This beneficiary already exists.');

      const idempotencyKey = `invitation:${randomBytes(16).toString('hex')}`;
      const rawToken = createOutboxEmailToken(idempotencyKey);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      stage = 'beneficiary_record_create_started';
      const record = await prisma.beneficiary.create({
        data: {
          ownerId: owner.id,
          ...parsed.data,
          status: 'INVITED',
          invitationTokenHash: hash(rawToken),
          invitationExpiresAt: expiresAt,
          invitationUsedAt: null,
        },
      });
      stage = 'beneficiary_invitation_record_created';
      invitationDiagnostic(requestId, stage);
      await recordAudit({ ownerId: owner.id, actorUserId: request.authenticatedUserId, action: 'BENEFICIARY_CREATED', resourceType: 'BENEFICIARY', resourceId: record.id, result: 'ALLOWED' });

      stage = 'invitation_outbox_create_started';
      const outbox = await prisma.emailOutbox.create({
        data: {
          toEmail: record.email,
          template: 'invitation',
          payload: { beneficiaryId: record.id, beneficiaryName: record.fullName, ownerName: owner.displayName },
          idempotencyKey,
          status: 'pending',
        },
      });
      try {
        stage = 'email_sending_function_invoked';
        invitationDiagnostic(requestId, stage, {
          mailMode: environment.MAIL_MODE,
          mailProvider: environment.MAIL_PROVIDER,
        });
        const delivery = await legacyMailer.sendBeneficiaryInvite({
          email: record.email,
          beneficiaryName: record.fullName,
          ownerName: owner.displayName,
          verifyUrl: appUrl(`/verify-email?token=${encodeURIComponent(rawToken)}&purpose=invitation`),
          declineUrl: appUrl(`/verify-email?token=${encodeURIComponent(rawToken)}&purpose=decline`),
          requestId,
          idempotencyKey,
        });
        if (!delivery.sent) throw new Error(environment.MAIL_MODE === 'log' ? 'MAIL_MODE_LOG' : 'DELIVERY_NOT_CONFIRMED');
        await prisma.emailOutbox.update({ where: { id: outbox.id }, data: { status: 'sent', sentAt: new Date(), attempts: 1, lastError: null } });
        response.status(201).json({ success: true, data: { beneficiary: record, delivery: 'Invitation email sent.' } });
      } catch (error) {
        stage = 'email_delivery_failed';
        console.error(JSON.stringify({ level: 'error', event: stage, requestId, errorCategory: safeErrorCategory(error) }));
        const permanent = error instanceof MailDeliveryError && error.kind === 'permanent';
        const quota = error instanceof MailDeliveryError && error.kind === 'quota';
        const retryAfter = error instanceof MailDeliveryError && error.retryAfterMs !== undefined ? error.retryAfterMs : quota ? Math.max(0, Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() + 1) - Date.now()) : 60_000;
        const safeMessage = error instanceof Error ? error.message.slice(0, 500) : 'Invitation email delivery failed.';
        await prisma.emailOutbox.update({
          where: { id: outbox.id },
          data: { status: permanent ? 'failed' : 'pending', attempts: 1, lastError: safeMessage, nextAttemptAt: new Date(Date.now() + retryAfter) },
        });
        if (permanent && error instanceof MailDeliveryError && error.status === 422) await createNotification({ userId: request.authenticatedUserId!, type: 'SECURITY', title: 'Email address could not receive an invitation', body: 'The invitation email could not be delivered because the address is invalid. Update it to try again.', link: '/legacy-policy', dedupeKey: `mail-invalid-address:${outbox.id}` });
        if (quota) await createNotification({ userId: request.authenticatedUserId!, type: 'SECURITY', title: 'Email sending paused for today', body: 'MemoSphere reached today’s email sending limit. Pending notices will resume tomorrow.', link: '/legacy-policy', dedupeKey: `resend-daily-limit:${new Date().toISOString().slice(0, 10)}:${request.authenticatedUserId}` });
        next(new ServiceUnavailableError('The beneficiary was saved, but the invitation email could not be sent. Please retry.'));
      }
    } catch (error) {
      console.error(JSON.stringify({ level: 'error', event: 'invitation_request_failed', requestId, stage, errorCategory: safeErrorCategory(error) }));
      next(error);
    }
  });
  router.patch('/:id', async (request, response, next) => {
    try { const parsed = beneficiarySchema.partial().safeParse(request.body); if (!parsed.success) throw new RequestValidationError('Invalid beneficiary data.'); const owner = await getOwnerForUser(request.authenticatedUserId!); const record = await prisma.beneficiary.update({ where: { id: request.params.id, ownerId: owner.id }, data: parsed.data }); response.json({ success: true, data: { beneficiary: record } }); } catch (error) { next(error); }
  });
  router.delete('/:id', async (request, response, next) => {
    try { const owner = await getOwnerForUser(request.authenticatedUserId!); await prisma.beneficiary.update({ where: { id: request.params.id, ownerId: owner.id }, data: { status: 'REMOVED' } }); await recordAudit({ ownerId: owner.id, actorUserId: request.authenticatedUserId, action: 'BENEFICIARY_REMOVED', resourceType: 'BENEFICIARY', resourceId: request.params.id, result: 'ALLOWED' }); response.status(204).send(); } catch (error) { next(error); }
  });
  return router;
}
