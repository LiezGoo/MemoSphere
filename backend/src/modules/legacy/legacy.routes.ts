import { createHash, randomBytes } from 'node:crypto';
import { Router } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { ConflictError, InputValidationError, ResourceNotFound, ServiceUnavailableError } from '../../exceptions/index.js';
import { authenticateUser } from '../../middleware/authenticateUser.js';
import { verifySameOrigin } from '../../middleware/csrfOrigin.js';
import { createRateLimiter } from '../../middleware/rateLimiter.js';
import { getOwnerForUser } from '../../utils/owner.js';
import { createNotification } from '../../utils/notifications.js';
import { legacyMailer } from './legacy-mailer.js';
import { environment } from '../../config/environment.js';
import type { AuthService } from '../auth/auth.types.js';

const idSchema = z.string().min(1).max(191);
const clean = (value: string) => value.replace(/<[^>]*>/g, '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
const beneficiaryCreateSchema = z.object({ fullName: z.string().trim().min(2).max(100).transform(clean), email: z.string().trim().email().max(255).transform((v) => v.toLowerCase()), relationship: z.string().trim().max(80).transform(clean).nullable().optional() }).strict();
const beneficiaryPatchSchema = z.object({ fullName: z.string().trim().min(2).max(100).transform(clean).optional(), email: z.string().trim().email().max(255).transform((v) => v.toLowerCase()).optional(), relationship: z.string().trim().max(80).transform(clean).nullable().optional(), status: z.enum(['INVITED', 'DECLINED', 'REVOKED']).optional() }).strict();
const policySchema = z.object({ name: z.string().trim().min(1).max(150).transform(clean), description: z.string().max(1000).transform(clean).nullable().optional(), beneficiaryId: idSchema, accessLevel: z.literal('read_only').default('read_only'), scopeType: z.enum(['all_entries', 'categories', 'selected_entries']), scopeCategories: z.array(z.string().trim().min(1).max(80).transform(clean)).max(40).optional(), scopeDateFrom: z.coerce.date().nullable().optional(), scopeDateTo: z.coerce.date().nullable().optional(), excludedEntryIds: z.array(idSchema).max(500).default([]), entryIds: z.array(idSchema).max(500).optional(), releaseMethod: z.enum(['owner_manual', 'scheduled_date', 'trusted_verifier']), releaseAt: z.coerce.date().nullable().optional(), verifierBeneficiaryId: idSchema.nullable().optional(), coolingOffDays: z.number().int().min(3).max(365).default(7), expiresAt: z.coerce.date().nullable().optional() }).strict().superRefine((v, ctx) => {
  if (v.scopeType === 'categories' && !v.scopeCategories?.length) ctx.addIssue({ code: 'custom', message: 'Choose at least one category.' });
  if (v.scopeType === 'selected_entries' && !v.entryIds?.length) ctx.addIssue({ code: 'custom', message: 'Choose at least one entry.' });
  if (v.scopeDateFrom && v.scopeDateTo && v.scopeDateFrom > v.scopeDateTo) ctx.addIssue({ code: 'custom', message: 'The start date must be before the end date.' });
  if (v.releaseMethod === 'scheduled_date' && !v.releaseAt) ctx.addIssue({ code: 'custom', message: 'A scheduled release date is required.' });
  if (v.releaseMethod === 'trusted_verifier' && !v.verifierBeneficiaryId) ctx.addIssue({ code: 'custom', message: 'Choose a trusted verifier.' });
});
const listSchema = z.object({ status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'REVOKED', 'RELEASED', 'EXPIRED']).optional() }).strict();
const paginationSchema = z.object({ policy_id: idSchema.optional(), cursor: idSchema.optional(), limit: z.coerce.number().int().min(1).max(100).default(30) }).strict();
const rateInvite = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 10 });
const rateRelease = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 5 });

function parse<T>(schema: z.ZodType<T>, input: unknown): T { const result = schema.safeParse(input); if (!result.success) throw new InputValidationError(result.error.issues[0]?.message ?? 'Invalid request.'); return result.data; }
function noBody(input: unknown) { parse(z.object({}).strict(), input ?? {}); }
function hash(value: string) { return createHash('sha256').update(value).digest('hex'); }
function appUrl(path: string) { return new URL(path, environment.APP_BASE_URL ?? environment.FRONTEND_URL).toString(); }
function scopeKey(policy: { scopeType: string; scopeCategories: unknown; scopeDateFrom: Date | null; scopeDateTo: Date | null; excludedEntryIds: unknown; entryLinks?: { entryId: string }[] }) {
  return hash(JSON.stringify([policy.scopeType, policy.scopeCategories, policy.scopeDateFrom?.toISOString() ?? null, policy.scopeDateTo?.toISOString() ?? null, policy.excludedEntryIds, policy.entryLinks?.map((x) => x.entryId).sort() ?? []]));
}
async function audit(ownerId: string, policyId: string | null, actorType: string, actorId: string | undefined, action: string, request: { ip?: string }, metadata: object = {}) {
  await prisma.legacyAuditLog.create({ data: { ownerId, policyId, actorType, actorId, action, metadata, ipHash: request.ip ? hash(request.ip) : null } });
}
async function getPolicy(ownerId: string, id: string) {
  const policy = await prisma.legacyPolicy.findFirst({ where: { ownerId, id }, include: { beneficiary: { select: { id: true, fullName: true, email: true, status: true } }, entryLinks: { select: { entryId: true } } } });
  if (!policy) throw new ResourceNotFound('Policy not found.');
  return policy;
}
async function settleCoolingOff() {
  const now = new Date();
  const expired = await prisma.legacyPolicy.findMany({ where: { status: { in: ['ACTIVE', 'RELEASED', 'PAUSED'] }, expiresAt: { lte: now } }, include: { owner: { include: { user: true } } } });
  for (const policy of expired) {
    const updated = await prisma.legacyPolicy.updateMany({ where: { id: policy.id, status: { in: ['ACTIVE', 'RELEASED', 'PAUSED'] }, expiresAt: { lte: now } }, data: { status: 'EXPIRED', activeScopeKey: null, releaseReadyAt: null, releaseRequestedAt: null } });
    if (!updated.count) continue;
    await audit(policy.ownerId, policy.id, 'system', undefined, 'POLICY_EXPIRED', {});
    await createNotification({ userId: policy.owner.userId, type: 'SECURITY', title: 'Access policy expired', body: `“${policy.name}” has expired and no longer grants diary access.`, link: '/legacy-policy' });
  }
  const reminderDeadline = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const reminders = await prisma.legacyPolicy.findMany({ where: { status: 'ACTIVE', releaseMethod: { not: 'scheduled_date' }, releaseReadyAt: { gt: now, lte: reminderDeadline } }, include: { owner: { include: { user: true } } } });
  for (const policy of reminders) {
    const notification = await createNotification({ userId: policy.owner.userId, type: 'SECURITY', title: 'Cooling-off period ending soon', body: `The pending release of “${policy.name}” is scheduled to complete within 24 hours. You can still cancel it.`, link: '/legacy-policy', dedupeKey: `legacy-cooling-reminder:${policy.id}:${policy.releaseReadyAt?.toISOString()}` });
    if (notification) await audit(policy.ownerId, policy.id, 'system', undefined, 'COOLING_OFF_REMINDER_SENT', {});
  }
  const ready = await prisma.legacyPolicy.findMany({ where: { status: 'ACTIVE', releaseMethod: { not: 'scheduled_date' }, releaseReadyAt: { lte: now } }, include: { beneficiary: true, owner: { include: { user: true } } } });
  for (const policy of ready) {
    const updated = await prisma.legacyPolicy.updateMany({ where: { id: policy.id, status: 'ACTIVE', releaseReadyAt: { lte: now } }, data: { status: 'RELEASED', releasedAt: now, activeScopeKey: null } });
    if (!updated.count) continue;
    await audit(policy.ownerId, policy.id, 'system', undefined, 'RELEASE_COMPLETED', {});
    await createNotification({ userId: policy.owner.userId, type: 'SECURITY', title: 'Policy release completed', body: `Access for “${policy.name}” is now available to the verified beneficiary.`, link: '/legacy-policy' });
  }
}

export async function runLegacyReleaseJobs() { await settleCoolingOff(); }
function scopeWhere(policy: { scopeType: string; scopeCategories: unknown; scopeDateFrom: Date | null; scopeDateTo: Date | null; excludedEntryIds: unknown; entryLinks?: { entryId: string }[] }) {
  const excluded = Array.isArray(policy.excludedEntryIds) ? policy.excludedEntryIds.filter((id): id is string => typeof id === 'string') : [];
  return { status: 'PRESERVED' as const, neverShare: false, ...(excluded.length ? { id: { notIn: excluded } } : {}), ...(policy.scopeType === 'categories' ? { category: { in: Array.isArray(policy.scopeCategories) ? policy.scopeCategories.filter((v): v is string => typeof v === 'string') : [] } } : {}), ...(policy.scopeType === 'selected_entries' ? { id: { in: policy.entryLinks?.map((link) => link.entryId) ?? [], notIn: excluded } } : {}), ...(policy.scopeDateFrom || policy.scopeDateTo ? { entryDate: { ...(policy.scopeDateFrom ? { gte: policy.scopeDateFrom } : {}), ...(policy.scopeDateTo ? { lte: policy.scopeDateTo } : {}) } } : {}) };
}

export function createLegacyRouter(authService: AuthService) {
  const router = Router();
  const publicTokenLimiter = createRateLimiter({ windowMs: 60_000, max: 10, key: (request) => request.ip ?? 'unknown' });
  router.post('/beneficiaries/verify', publicTokenLimiter, async (req, res, next) => {
    try {
      const { token, action } = parse(z.object({ token: z.string().min(20).max(200), action: z.enum(['verify', 'decline']).default('verify') }).strict(), req.body);
      const beneficiary = await prisma.beneficiary.findFirst({
        where: { invitationTokenHash: hash(token), invitationExpiresAt: { gt: new Date() }, invitationUsedAt: null },
      });
      if (!beneficiary) throw new ResourceNotFound('Invitation link is invalid or expired.');
      const claimed = await prisma.beneficiary.updateMany({
        where: { id: beneficiary.id, invitationTokenHash: hash(token), invitationExpiresAt: { gt: new Date() }, invitationUsedAt: null },
        data: action === 'decline'
          ? { status: 'DECLINED', invitationUsedAt: new Date() }
          : { status: 'VERIFIED', verifiedAt: new Date(), invitationUsedAt: new Date() },
      });
      if (claimed.count !== 1) throw new ResourceNotFound('Invitation link is invalid or expired.');
      res.json({ success: true, data: { status: action === 'decline' ? 'DECLINED' : 'VERIFIED' } });
    } catch (e) { next(e); }
  });
  router.post('/release/verify', publicTokenLimiter, async (req, res, next) => {
    try {
      const { token } = parse(z.object({ token: z.string().min(20).max(200) }).strict(), req.body);
      const now = new Date();
      const record = await prisma.legacyReleaseToken.findFirst({
        where: { tokenHash: hash(token), kind: 'release', usedAt: null, expiresAt: { gt: now } },
        include: { policy: { include: { beneficiary: true } } },
      });
      if (!record || record.policy.status !== 'RELEASED') throw new ResourceNotFound('Release link is invalid or expired.');
      await prisma.legacyReleaseToken.update({ where: { id: record.id }, data: { usedAt: now } });
      res.json({ success: true, data: { verified: true, policyId: record.policyId } });
    } catch (e) { next(e); }
  });
  router.use(authenticateUser(authService), verifySameOrigin);

  router.get('/beneficiaries', async (req, res, next) => { try { const owner = await getOwnerForUser(req.authenticatedUserId!); const beneficiaries = await prisma.beneficiary.findMany({ where: { ownerId: owner.id, status: { notIn: ['REMOVED', 'REVOKED'] } }, orderBy: { createdAt: 'desc' }, select: { id: true, fullName: true, email: true, relationship: true, status: true, verifiedAt: true, createdAt: true } }); res.json({ success: true, data: { beneficiaries } }); } catch (e) { next(e); } });
  router.post('/beneficiaries', rateInvite, async (req, res, next) => {
    try {
      const body = parse(beneficiaryCreateSchema, req.body);
      const owner = await getOwnerForUser(req.authenticatedUserId!);
      const existing = await prisma.beneficiary.findFirst({ where: { ownerId: owner.id, email: body.email, status: { notIn: ['REMOVED', 'REVOKED'] } } });
      if (existing) throw new ConflictError('This beneficiary already exists.');
      const raw = randomBytes(32).toString('base64url');
      const expiresAt = new Date(Date.now() + 7 * 86_400_000);
      const beneficiary = await prisma.beneficiary.create({
        data: { ownerId: owner.id, ...body, status: 'INVITED', invitationTokenHash: hash(raw), invitationExpiresAt: expiresAt, invitationUsedAt: null },
        select: { id: true, fullName: true, email: true, relationship: true, status: true, createdAt: true },
      });
      await audit(owner.id, null, 'owner', req.authenticatedUserId, 'BENEFICIARY_INVITED', req, { beneficiaryId: beneficiary.id });
      const outbox = await prisma.emailOutbox.create({ data: { toEmail: beneficiary.email, template: 'invitation', payload: { beneficiaryId: beneficiary.id, beneficiaryName: beneficiary.fullName, ownerName: owner.displayName }, idempotencyKey: `invitation:${beneficiary.id}:created:${beneficiary.createdAt.toISOString()}` } });
      try {
        await legacyMailer.sendBeneficiaryInvite({
          email: beneficiary.email,
          beneficiaryName: beneficiary.fullName,
          ownerName: owner.displayName,
          verifyUrl: appUrl(`/verify-email?token=${encodeURIComponent(raw)}&purpose=invitation`),
          declineUrl: appUrl(`/verify-email?token=${encodeURIComponent(raw)}&purpose=decline`),
        });
        await prisma.emailOutbox.update({ where: { id: outbox.id }, data: { status: 'sent', sentAt: new Date(), attempts: 1, lastError: null } });
        res.status(201).json({ success: true, data: { beneficiary, delivery: 'Invitation email sent.' } });
      } catch (error) {
        const safeMessage = error instanceof Error ? error.message.slice(0, 500) : 'Invitation email delivery failed.';
        await prisma.emailOutbox.update({ where: { id: outbox.id }, data: { status: 'pending', attempts: 1, lastError: safeMessage, nextAttemptAt: new Date(Date.now() + 60_000) } });
        next(new ServiceUnavailableError('The beneficiary was saved, but the invitation email could not be sent. Please retry.'));
      }
    } catch (e) { next(e); }
  });
  router.post('/beneficiaries/:id/invite', rateInvite, async (req, res, next) => {
    try {
      noBody(req.body);
      const owner = await getOwnerForUser(req.authenticatedUserId!);
      const beneficiaryId = typeof req.params.id === 'string' ? req.params.id : '';
      const beneficiary = await prisma.beneficiary.findFirst({ where: { id: beneficiaryId, ownerId: owner.id, OR: [{ status: 'INVITED' }, { status: 'DECLINED' }] } });
      if (!beneficiary) throw new ResourceNotFound('Beneficiary not found.');
      const recent = await prisma.emailOutbox.findFirst({ where: { template: 'invitation', toEmail: beneficiary.email, createdAt: { gt: new Date(Date.now() - 10 * 60 * 1000) } }, orderBy: { createdAt: 'desc' } });
      if (recent) throw new InputValidationError('Please wait before resending this invitation.');
      const todayCount = await prisma.emailOutbox.count({ where: { template: 'invitation', toEmail: beneficiary.email, createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } });
      if (todayCount >= 3) throw new InputValidationError('This invitation has reached the daily resend limit.');
      const raw = randomBytes(32).toString('base64url');
      await prisma.beneficiary.update({ where: { id: beneficiary.id }, data: { invitationTokenHash: hash(raw), invitationExpiresAt: new Date(Date.now() + 7 * 86_400_000), invitationUsedAt: null, status: 'INVITED' } });
      const outbox = await prisma.emailOutbox.create({ data: { toEmail: beneficiary.email, template: 'invitation', payload: { beneficiaryId: beneficiary.id, beneficiaryName: beneficiary.fullName, ownerName: owner.displayName }, idempotencyKey: `invitation:${beneficiary.id}:resend:${Date.now()}` } });
      try {
        await legacyMailer.sendBeneficiaryInvite({
          email: beneficiary.email,
          beneficiaryName: beneficiary.fullName,
          ownerName: owner.displayName,
          verifyUrl: appUrl(`/verify-email?token=${encodeURIComponent(raw)}&purpose=invitation`),
          declineUrl: appUrl(`/verify-email?token=${encodeURIComponent(raw)}&purpose=decline`),
        });
        await prisma.emailOutbox.update({ where: { id: outbox.id }, data: { status: 'sent', sentAt: new Date(), attempts: 1, lastError: null } });
      } catch (error) {
        const safeMessage = error instanceof Error ? error.message.slice(0, 500) : 'Invitation email delivery failed.';
        await prisma.emailOutbox.update({ where: { id: outbox.id }, data: { status: 'pending', attempts: 1, lastError: safeMessage, nextAttemptAt: new Date(Date.now() + 60_000) } });
        throw new ServiceUnavailableError('The invitation could not be sent. Please retry.');
      }
      await audit(owner.id, null, 'owner', req.authenticatedUserId, 'BENEFICIARY_INVITE_RESENT', req, { beneficiaryId: beneficiary.id });
      res.status(202).json({ success: true, data: { delivery: 'Invitation email sent.' } });
    } catch (e) { next(e); }
  });
  router.patch('/beneficiaries/:id', async (req, res, next) => { try { const body = parse(beneficiaryPatchSchema, req.body); const owner = await getOwnerForUser(req.authenticatedUserId!); const existing = await prisma.beneficiary.findFirst({ where: { id: req.params.id, ownerId: owner.id } }); if (!existing) throw new ResourceNotFound('Beneficiary not found.'); const beneficiary = await prisma.beneficiary.update({ where: { id: existing.id }, data: { ...body, ...(body.status === 'REVOKED' ? { legacyPolicies: { updateMany: { where: { status: { in: ['DRAFT', 'ACTIVE', 'PAUSED'] } }, data: { status: 'REVOKED', activeScopeKey: null, releaseReadyAt: null, releaseRequestedAt: null } } } } : {}) }, select: { id: true, fullName: true, email: true, relationship: true, status: true, verifiedAt: true } }); await audit(owner.id, null, 'owner', req.authenticatedUserId, 'BENEFICIARY_UPDATED', req, { beneficiaryId: beneficiary.id }); res.json({ success: true, data: { beneficiary } }); } catch (e) { next(e); } });
  router.delete('/beneficiaries/:id', async (req, res, next) => { try { noBody(req.body); const owner = await getOwnerForUser(req.authenticatedUserId!); const beneficiary = await prisma.beneficiary.findFirst({ where: { id: req.params.id, ownerId: owner.id } }); if (!beneficiary) throw new ResourceNotFound('Beneficiary not found.'); await prisma.$transaction([prisma.legacyPolicy.updateMany({ where: { ownerId: owner.id, beneficiaryId: beneficiary.id }, data: { status: 'REVOKED', activeScopeKey: null, releaseReadyAt: null } }), prisma.beneficiary.update({ where: { id: beneficiary.id }, data: { status: 'REVOKED' } })]); await audit(owner.id, null, 'owner', req.authenticatedUserId, 'BENEFICIARY_REVOKED', req, { beneficiaryId: beneficiary.id }); res.status(204).send(); } catch (e) { next(e); } });

  router.get('/policies', async (req, res, next) => { try { await settleCoolingOff(); const owner = await getOwnerForUser(req.authenticatedUserId!); const { status } = parse(listSchema, req.query); const policies = await prisma.legacyPolicy.findMany({ where: { ownerId: owner.id, ...(status ? { status } : {}) }, include: { beneficiary: { select: { id: true, fullName: true, email: true, status: true } }, entryLinks: { select: { entryId: true } } }, orderBy: { updatedAt: 'desc' } }); res.json({ success: true, data: { policies } }); } catch (e) { next(e); } });
  router.post('/policies', async (req, res, next) => { try { const body = parse(policySchema, req.body); const owner = await getOwnerForUser(req.authenticatedUserId!); const beneficiary = await prisma.beneficiary.findFirst({ where: { id: body.beneficiaryId, ownerId: owner.id, status: { notIn: ['REMOVED', 'REVOKED'] } } }); if (!beneficiary) throw new ResourceNotFound('Beneficiary not found.'); if (body.verifierBeneficiaryId && !(await prisma.beneficiary.findFirst({ where: { id: body.verifierBeneficiaryId, ownerId: owner.id, status: 'VERIFIED' } }))) throw new InputValidationError('The trusted verifier must be a verified beneficiary.'); if (body.scopeType === 'selected_entries') { const count = await prisma.diaryEntry.count({ where: { ownerId: owner.id, id: { in: body.entryIds }, status: 'PRESERVED', neverShare: false } }); if (count !== body.entryIds?.length) throw new InputValidationError('Selected entries must belong to you and be shareable.'); }
    const { entryIds = [], ...data } = body; const policy = await prisma.legacyPolicy.create({ data: { ownerId: owner.id, ...data, scopeCategories: body.scopeCategories ?? undefined, excludedEntryIds: body.excludedEntryIds, ...(body.scopeType === 'selected_entries' ? { entryLinks: { create: entryIds.map((entryId) => ({ entryId })) } } : {}) }, include: { beneficiary: { select: { id: true, fullName: true, email: true, status: true } }, entryLinks: { select: { entryId: true } } } }); await audit(owner.id, policy.id, 'owner', req.authenticatedUserId, 'POLICY_CREATED', req, { status: policy.status }); res.status(201).json({ success: true, data: { policy } }); } catch (e) { next(e); } });
  router.get('/policies/:id', async (req, res, next) => { try { await settleCoolingOff(); const owner = await getOwnerForUser(req.authenticatedUserId!); res.json({ success: true, data: { policy: await getPolicy(owner.id, req.params.id) } }); } catch (e) { next(e); } });
  router.patch('/policies/:id', async (req, res, next) => { try { const body = parse(policySchema.partial().strict(), req.body); const owner = await getOwnerForUser(req.authenticatedUserId!); const current = await getPolicy(owner.id, req.params.id); if (!['DRAFT', 'PAUSED'].includes(current.status)) throw new ConflictError('Pause the policy before editing it.'); const beneficiaryId = body.beneficiaryId ?? current.beneficiaryId; if (!(await prisma.beneficiary.findFirst({ where: { id: beneficiaryId, ownerId: owner.id, status: { notIn: ['REMOVED', 'REVOKED'] } } }))) throw new ResourceNotFound('Beneficiary not found.'); const entryIds = body.entryIds; if (body.scopeType === 'selected_entries' || (!body.scopeType && current.scopeType === 'selected_entries')) { const ids = entryIds ?? current.entryLinks.map(({ entryId }) => entryId); const count = await prisma.diaryEntry.count({ where: { ownerId: owner.id, id: { in: ids }, status: 'PRESERVED', neverShare: false } }); if (count !== ids.length) throw new InputValidationError('Selected entries must belong to you and be shareable.'); }
    const changes = { ...body }; delete changes.entryIds; const policy = await prisma.$transaction(async (tx) => { if (body.scopeType === 'selected_entries' || (entryIds && !body.scopeType)) await tx.legacyPolicyEntryLink.deleteMany({ where: { policyId: current.id } }); return tx.legacyPolicy.update({ where: { id: current.id }, data: { ...changes, ...(entryIds ? { entryLinks: { create: entryIds.map((entryId) => ({ entryId })) } } : {}) }, include: { beneficiary: { select: { id: true, fullName: true, email: true, status: true } }, entryLinks: { select: { entryId: true } } } }); }); await audit(owner.id, policy.id, 'owner', req.authenticatedUserId, 'POLICY_UPDATED', req); res.json({ success: true, data: { policy } }); } catch (e) { next(e); } });
  router.post('/policies/:id/activate', async (req, res, next) => { try { const { password } = parse(z.object({ password: z.string().min(1).max(128) }).strict(), req.body); const owner = await getOwnerForUser(req.authenticatedUserId!); const policy = await getPolicy(owner.id, req.params.id); if (policy.status === 'ACTIVE') return res.json({ success: true, data: { policy } }); if (!['DRAFT', 'PAUSED'].includes(policy.status)) throw new ConflictError('This policy cannot be activated.'); if (policy.beneficiary.status !== 'VERIFIED') throw new ConflictError('The beneficiary must be verified before activation.'); const user = await prisma.user.findUnique({ where: { id: req.authenticatedUserId! }, select: { passwordHash: true } }); if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new InputValidationError('Re-authentication failed.'); const key = scopeKey(policy); try { const activated = await prisma.legacyPolicy.update({ where: { id: policy.id }, data: { status: 'ACTIVE', activeScopeKey: key }, include: { beneficiary: { select: { id: true, fullName: true, email: true, status: true } }, entryLinks: { select: { entryId: true } } } }); await audit(owner.id, policy.id, 'owner', req.authenticatedUserId, 'POLICY_ACTIVATED', req); await createNotification({ userId: req.authenticatedUserId!, type: 'SECURITY', title: 'Access policy activated', body: `“${policy.name}” is active. Diary access still requires a separate release.`, link: '/legacy-policy' }); res.json({ success: true, data: { policy: activated } }); } catch (error) { if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') throw new ConflictError('An active policy for this beneficiary and scope already exists.'); throw error; } } catch (e) { next(e); } });
  router.post('/policies/:id/pause', async (req, res, next) => { try { noBody(req.body); const owner = await getOwnerForUser(req.authenticatedUserId!); const policy = await getPolicy(owner.id, req.params.id); if (policy.status === 'PAUSED') return res.json({ success: true, data: { policy } }); if (policy.status !== 'ACTIVE') throw new ConflictError('Only an active policy can be paused.'); const updated = await prisma.legacyPolicy.update({ where: { id: policy.id }, data: { status: 'PAUSED', activeScopeKey: null, releaseReadyAt: null, releaseRequestedAt: null } }); await prisma.emailOutbox.updateMany({ where: { status: 'pending', OR: [{ idempotencyKey: { startsWith: `warning:${policy.id}:` } }, { idempotencyKey: { startsWith: `release:${policy.id}:` } }] }, data: { status: 'failed', lastError: 'Cancelled because the policy was paused.' } }); await audit(owner.id, policy.id, 'owner', req.authenticatedUserId, 'POLICY_PAUSED', req); await createNotification({ userId: req.authenticatedUserId!, type: 'SECURITY', title: 'Access policy paused', body: `“${policy.name}” has been paused.`, link: '/legacy-policy' }); res.json({ success: true, data: { policy: updated } }); } catch (e) { next(e); } });
  router.post('/policies/:id/postpone', async (req, res, next) => {
    try {
      const body = parse(z.object({ releaseAt: z.coerce.date() }).strict(), req.body);
      if (body.releaseAt <= new Date()) throw new InputValidationError('Choose a future release date.');
      const owner = await getOwnerForUser(req.authenticatedUserId!);
      const policy = await getPolicy(owner.id, req.params.id);
      if (!['ACTIVE', 'PAUSED', 'DRAFT'].includes(policy.status)) throw new ConflictError('This policy cannot be postponed.');
      await prisma.$transaction(async (tx) => {
        await tx.legacyPolicy.update({ where: { id: policy.id }, data: { releaseAt: body.releaseAt, releaseReadyAt: null, releaseRequestedAt: null } });
        await tx.emailOutbox.updateMany({ where: { status: 'pending', OR: [{ idempotencyKey: { startsWith: `warning:${policy.id}:` } }, { idempotencyKey: { startsWith: `release:${policy.id}:` } }] }, data: { status: 'failed', lastError: 'Cancelled because the release date changed.' } });
      });
      await audit(owner.id, policy.id, 'owner', req.authenticatedUserId, 'POLICY_RELEASE_POSTPONED', req, { releaseAt: body.releaseAt.toISOString() });
      res.json({ success: true, data: { policy: await getPolicy(owner.id, policy.id) } });
    } catch (e) { next(e); }
  });
  router.post('/policies/:id/revoke', async (req, res, next) => { try { const { password } = parse(z.object({ password: z.string().min(1).max(128) }).strict(), req.body); const owner = await getOwnerForUser(req.authenticatedUserId!); const policy = await getPolicy(owner.id, req.params.id); if (policy.status === 'REVOKED') return res.json({ success: true, data: { policy } }); const user = await prisma.user.findUnique({ where: { id: req.authenticatedUserId! }, select: { passwordHash: true } }); if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new InputValidationError('Re-authentication failed.'); const updated = await prisma.legacyPolicy.update({ where: { id: policy.id }, data: { status: 'REVOKED', activeScopeKey: null, releaseAt: null, releaseReadyAt: null, releaseRequestedAt: null } }); await prisma.emailOutbox.updateMany({ where: { status: 'pending', OR: [{ idempotencyKey: { startsWith: `warning:${policy.id}:` } }, { idempotencyKey: { startsWith: `release:${policy.id}:` } }] }, data: { status: 'failed', lastError: 'Cancelled because the policy was revoked.' } }); await audit(owner.id, policy.id, 'owner', req.authenticatedUserId, 'POLICY_REVOKED', req); await createNotification({ userId: req.authenticatedUserId!, type: 'SECURITY', title: 'Access policy revoked', body: `“${policy.name}” was revoked immediately.`, link: '/legacy-policy' }); res.json({ success: true, data: { policy: updated } }); } catch (e) { next(e); } });
  router.delete('/policies/:id', async (req, res, next) => { try { noBody(req.body); const owner = await getOwnerForUser(req.authenticatedUserId!); const policy = await getPolicy(owner.id, req.params.id); if (policy.status !== 'DRAFT') throw new ConflictError('Only draft policies can be deleted.'); await prisma.$transaction(async (tx) => { await tx.legacyAuditLog.create({ data: { ownerId: owner.id, policyId: policy.id, actorType: 'owner', actorId: req.authenticatedUserId, action: 'POLICY_DELETED', ipHash: req.ip ? hash(req.ip) : null } }); await tx.legacyPolicy.delete({ where: { id: policy.id } }); }); res.status(204).send(); } catch (e) { next(e); } });
  router.get('/audit', async (req, res, next) => { try { const owner = await getOwnerForUser(req.authenticatedUserId!); const { policy_id, cursor, limit } = parse(paginationSchema, req.query); if (policy_id && !(await prisma.legacyPolicy.findFirst({ where: { id: policy_id, ownerId: owner.id }, select: { id: true } }))) throw new ResourceNotFound('Policy not found.'); const logs = await prisma.legacyAuditLog.findMany({ where: { ownerId: owner.id, ...(policy_id ? { policyId: policy_id } : {}) }, orderBy: { createdAt: 'desc' }, take: limit + 1, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}), select: { id: true, policyId: true, actorType: true, action: true, metadata: true, createdAt: true } }); const hasMore = logs.length > limit; const items = logs.slice(0, limit); res.json({ success: true, data: { logs: items, nextCursor: hasMore ? items.at(-1)?.id ?? null : null } }); } catch (e) { next(e); } });

  router.post('/policies/:id/release-request', rateRelease, async (req, res, next) => { try { const { password } = parse(z.object({ password: z.string().min(1).max(128).optional() }).strict(), req.body); const owner = await getOwnerForUser(req.authenticatedUserId!); const policy = await getPolicy(owner.id, parse(idSchema, req.params.id)); if (policy.status !== 'ACTIVE') throw new ConflictError('Only active policies can request release.'); if (policy.releaseReadyAt) return res.json({ success: true, data: { policy, message: 'Release is already in its cooling-off period.' } }); if (policy.releaseMethod === 'scheduled_date') throw new ConflictError('Scheduled releases start automatically when their date arrives.'); if (policy.releaseMethod === 'trusted_verifier') { const verifier = policy.verifierBeneficiaryId ? await prisma.beneficiary.findFirst({ where: { id: policy.verifierBeneficiaryId, ownerId: owner.id, status: 'VERIFIED' }, select: { email: true } }) : null; if (!verifier) throw new ConflictError('The verified trusted verifier is unavailable.'); const raw = randomBytes(32).toString('base64url'); const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); const token = await prisma.legacyReleaseToken.create({ data: { policyId: policy.id, tokenHash: hash(raw), expiresAt } }); const delivery = await legacyMailer.sendVerifierLink({ email: verifier.email, policyName: policy.name, token: raw, expiresAt }); if (!delivery.sent) { await prisma.legacyReleaseToken.delete({ where: { id: token.id } }); throw new ServiceUnavailableError('Verifier email delivery is not configured. No release has been requested.'); } await audit(owner.id, policy.id, 'owner', req.authenticatedUserId, 'VERIFIER_LINK_SENT', req); await createNotification({ userId: req.authenticatedUserId!, type: 'SECURITY', title: 'Verifier release request sent', body: `A release confirmation for “${policy.name}” was sent to the trusted verifier.`, link: '/legacy-policy' }); return res.status(202).json({ success: true, data: { message: 'A one-time verifier link was sent.' } }); } if (!password) throw new InputValidationError('Password re-authentication is required.'); const user = await prisma.user.findUnique({ where: { id: req.authenticatedUserId! }, select: { passwordHash: true } }); if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new InputValidationError('Re-authentication failed.'); const now = new Date(); const updated = await prisma.legacyPolicy.update({ where: { id: policy.id }, data: { releaseRequestedAt: now, releaseReadyAt: new Date(now.getTime() + policy.coolingOffDays * 86400000) } }); await audit(owner.id, policy.id, 'owner', req.authenticatedUserId, 'RELEASE_REQUESTED', req); await createNotification({ userId: req.authenticatedUserId!, type: 'SECURITY', title: 'Release requested', body: `“${policy.name}” will remain on hold for ${policy.coolingOffDays} days. You can cancel during that period.`, link: '/legacy-policy' }); res.status(202).json({ success: true, data: { policy: updated } }); } catch (e) { next(e); } });
  router.post('/policies/:id/release-cancel', async (req, res, next) => { try { noBody(req.body); const owner = await getOwnerForUser(req.authenticatedUserId!); const policy = await getPolicy(owner.id, req.params.id); if (!policy.releaseReadyAt || policy.releaseReadyAt <= new Date()) throw new ConflictError('The release is no longer in its cooling-off period.'); const updated = await prisma.legacyPolicy.update({ where: { id: policy.id }, data: { releaseReadyAt: null, releaseRequestedAt: null } }); await audit(owner.id, policy.id, 'owner', req.authenticatedUserId, 'RELEASE_CANCELLED', req); await createNotification({ userId: req.authenticatedUserId!, type: 'SECURITY', title: 'Release cancelled', body: `The pending release of “${policy.name}” was cancelled.`, link: '/legacy-policy' }); res.json({ success: true, data: { policy: updated } }); } catch (e) { next(e); } });

  router.get('/shared/:policyId/entries', async (req, res, next) => { try { await settleCoolingOff(); const policyId = parse(idSchema, req.params.policyId); const user = req.authenticatedUser!; const verifiedIdentity = await prisma.$queryRaw<Array<{ id: string }>>`SELECT id FROM users WHERE id = ${user.id} AND emailVerifiedAt IS NOT NULL LIMIT 1`; if (!verifiedIdentity.length) throw new ResourceNotFound('Shared diary not found.'); const policy = await prisma.legacyPolicy.findFirst({ where: { id: policyId, status: 'RELEASED', releasedAt: { not: null }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }], beneficiary: { email: user.email, status: 'VERIFIED' } }, include: { entryLinks: { select: { entryId: true } }, owner: { select: { id: true, userId: true } } } }); if (!policy || policy.owner.userId === user.id) throw new ResourceNotFound('Shared diary not found.'); const entries = await prisma.diaryEntry.findMany({ where: { ownerId: policy.ownerId, ...scopeWhere(policy) }, orderBy: { entryDate: 'desc' }, select: { id: true, title: true, category: true, entryDate: true, originalContent: true, normalizedContent: true } }); await audit(policy.ownerId, policy.id, 'beneficiary', user.id, 'BENEFICIARY_CONTENT_ACCESSED', req); const sessionKey = hash(req.get('cookie') ?? user.id); await createNotification({ userId: policy.owner.userId, type: 'SECURITY', title: 'Beneficiary accessed shared entries', body: `A verified beneficiary accessed “${policy.name}”.`, link: '/legacy-policy', dedupeKey: `legacy-access:${policy.id}:${sessionKey}` }); res.json({ success: true, data: { entries: entries.map((entry) => ({ ...entry, content: entry.normalizedContent ?? entry.originalContent })) } }); } catch (e) { next(e); } });
  router.get('/shared/:policyId/entries/:entryId', async (req, res, next) => { try { await settleCoolingOff(); const user = req.authenticatedUser!; const policyId = parse(idSchema, req.params.policyId); const entryId = parse(idSchema, req.params.entryId); const verifiedIdentity = await prisma.$queryRaw<Array<{ id: string }>>`SELECT id FROM users WHERE id = ${user.id} AND emailVerifiedAt IS NOT NULL LIMIT 1`; if (!verifiedIdentity.length) throw new ResourceNotFound('Shared diary not found.'); const policy = await prisma.legacyPolicy.findFirst({ where: { id: policyId, status: 'RELEASED', releasedAt: { not: null }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }], beneficiary: { email: user.email, status: 'VERIFIED' } }, include: { entryLinks: { select: { entryId: true } }, owner: { select: { userId: true } } } }); if (!policy || policy.owner.userId === user.id) throw new ResourceNotFound('Shared diary not found.'); const entry = await prisma.diaryEntry.findFirst({ where: { id: entryId, ownerId: policy.ownerId, ...scopeWhere(policy) }, select: { id: true, title: true, category: true, entryDate: true, originalContent: true, normalizedContent: true } }); if (!entry) throw new ResourceNotFound('Entry not found.'); await audit(policy.ownerId, policy.id, 'beneficiary', user.id, 'BENEFICIARY_ENTRY_ACCESSED', req, { entryId }); const sessionKey = hash(req.get('cookie') ?? user.id); await createNotification({ userId: policy.owner.userId, type: 'SECURITY', title: 'Beneficiary accessed shared entries', body: `A verified beneficiary accessed “${policy.name}”.`, link: '/legacy-policy', dedupeKey: `legacy-access:${policy.id}:${sessionKey}` }); res.json({ success: true, data: { entry: { ...entry, content: entry.normalizedContent ?? entry.originalContent } } }); } catch (e) { next(e); } });
  router.post('/verifier/confirm', rateRelease, async (req, res, next) => {
    try {
      const { token } = parse(z.object({ token: z.string().min(20).max(200) }).strict(), req.body);
      const user = req.authenticatedUser!;
      const verified = await prisma.$queryRaw<Array<{ id: string }>>`SELECT id FROM users WHERE id = ${user.id} AND emailVerifiedAt IS NOT NULL LIMIT 1`;
      const record = await prisma.legacyReleaseToken.findUnique({ where: { tokenHash: hash(token) }, include: { policy: true } });
      if (!verified.length || !record || record.usedAt || record.expiresAt <= new Date() || record.policy.status !== 'ACTIVE' || !record.policy.verifierBeneficiaryId) throw new ResourceNotFound('Verifier link is invalid or expired.');
      const [verifier, owner] = await Promise.all([
        prisma.beneficiary.findFirst({ where: { id: record.policy.verifierBeneficiaryId, ownerId: record.policy.ownerId, email: user.email, status: 'VERIFIED' } }),
        prisma.owner.findUnique({ where: { id: record.policy.ownerId }, select: { userId: true } }),
      ]);
      if (!verifier || owner?.userId === user.id) throw new ResourceNotFound('Verifier link is invalid or expired.');
      const now = new Date();
      const readyAt = new Date(now.getTime() + record.policy.coolingOffDays * 86400000);
      await prisma.$transaction(async (tx) => {
        const consumed = await tx.legacyReleaseToken.updateMany({ where: { id: record.id, usedAt: null, expiresAt: { gt: now } }, data: { usedAt: now } });
        if (!consumed.count) throw new ResourceNotFound('Verifier link is invalid or expired.');
        const changed = await tx.legacyPolicy.updateMany({ where: { id: record.policyId, status: 'ACTIVE', releaseReadyAt: null }, data: { releaseRequestedAt: now, releaseReadyAt: readyAt } });
        if (!changed.count) throw new ConflictError('This policy already has a pending release.');
        await tx.legacyAuditLog.create({ data: { ownerId: record.policy.ownerId, policyId: record.policyId, actorType: 'beneficiary', actorId: user.id, action: 'RELEASE_REQUESTED_BY_VERIFIER' } });
      });
      if (owner) await createNotification({ userId: owner.userId, type: 'SECURITY', title: 'Verifier confirmed release', body: `A trusted verifier confirmed release for policy “${record.policy.name}”. The cooling-off period has started.`, link: '/legacy-policy' });
      res.status(202).json({ success: true, data: { releaseReadyAt: readyAt } });
    } catch (e) { next(e); }
  });
  return router;
}
