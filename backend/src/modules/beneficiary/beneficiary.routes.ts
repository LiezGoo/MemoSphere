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

const beneficiarySchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255).transform((value) => value.toLowerCase()),
  relationship: z.string().trim().min(1).max(80),
});
function hash(value: string) { return createHash('sha256').update(value).digest('hex'); }
function appUrl(path: string) { return new URL(path, environment.APP_BASE_URL ?? environment.FRONTEND_URL).toString(); }

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
    try {
      const parsed = beneficiarySchema.safeParse(request.body);
      if (!parsed.success) throw new RequestValidationError('Invalid beneficiary data.');
      const owner = await getOwnerForUser(request.authenticatedUserId!);
      const existing = await prisma.beneficiary.findFirst({
        where: { ownerId: owner.id, email: parsed.data.email, status: { notIn: ['REMOVED', 'REVOKED'] } },
      });
      if (existing) throw new ConflictError('This beneficiary already exists.');

      const rawToken = randomBytes(32).toString('base64url');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
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
      await recordAudit({ ownerId: owner.id, actorUserId: request.authenticatedUserId, action: 'BENEFICIARY_CREATED', resourceType: 'BENEFICIARY', resourceId: record.id, result: 'ALLOWED' });

      const idempotencyKey = `invitation:${record.id}:created:${record.createdAt.toISOString()}`;
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
        await legacyMailer.sendBeneficiaryInvite({
          email: record.email,
          beneficiaryName: record.fullName,
          ownerName: owner.displayName,
          verifyUrl: appUrl(`/verify-email?token=${encodeURIComponent(rawToken)}&purpose=invitation`),
          declineUrl: appUrl(`/verify-email?token=${encodeURIComponent(rawToken)}&purpose=decline`),
        });
        await prisma.emailOutbox.update({ where: { id: outbox.id }, data: { status: 'sent', sentAt: new Date(), attempts: 1, lastError: null } });
        response.status(201).json({ success: true, data: { beneficiary: record, delivery: 'Invitation email sent.' } });
      } catch (error) {
        const safeMessage = error instanceof Error ? error.message.slice(0, 500) : 'Invitation email delivery failed.';
        await prisma.emailOutbox.update({
          where: { id: outbox.id },
          data: { status: 'pending', attempts: 1, lastError: safeMessage, nextAttemptAt: new Date(Date.now() + 60_000) },
        });
        next(new ServiceUnavailableError('The beneficiary was saved, but the invitation email could not be sent. Please retry.'));
      }
    } catch (error) { next(error); }
  });
  router.patch('/:id', async (request, response, next) => {
    try { const parsed = beneficiarySchema.partial().safeParse(request.body); if (!parsed.success) throw new RequestValidationError('Invalid beneficiary data.'); const owner = await getOwnerForUser(request.authenticatedUserId!); const record = await prisma.beneficiary.update({ where: { id: request.params.id, ownerId: owner.id }, data: parsed.data }); response.json({ success: true, data: { beneficiary: record } }); } catch (error) { next(error); }
  });
  router.delete('/:id', async (request, response, next) => {
    try { const owner = await getOwnerForUser(request.authenticatedUserId!); await prisma.beneficiary.update({ where: { id: request.params.id, ownerId: owner.id }, data: { status: 'REMOVED' } }); await recordAudit({ ownerId: owner.id, actorUserId: request.authenticatedUserId, action: 'BENEFICIARY_REMOVED', resourceType: 'BENEFICIARY', resourceId: request.params.id, result: 'ALLOWED' }); response.status(204).send(); } catch (error) { next(error); }
  });
  return router;
}