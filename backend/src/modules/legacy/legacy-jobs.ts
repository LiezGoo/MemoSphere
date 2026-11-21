import { timingSafeEqual, createHash } from 'node:crypto';
import { environment } from '../../config/environment.js';
import { prisma } from '../../config/prisma.js';
import { createNotification } from '../../utils/notifications.js';
import { legacyMailer } from './legacy-mailer.js';
import { MailDeliveryError } from './legacy-mailer.js';
import { createOutboxEmailToken } from './email-token.js';

function hash(value: string) { return createHash('sha256').update(value).digest('hex'); }
function appUrl(path: string) {
  return new URL(path, environment.APP_BASE_URL ?? environment.FRONTEND_URL).toString();
}

const DAILY_RESEND_LIMIT = 100;
const SEND_SPACING_MS = 125;
const delay = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const nextUtcDay = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1));

async function emailOwnerUserId(payload: Record<string, unknown>) {
  if (typeof payload.policyId === 'string') {
    const policy = await prisma.legacyPolicy.findUnique({ where: { id: payload.policyId }, select: { owner: { select: { userId: true } } } });
    return policy?.owner.userId ?? null;
  }
  if (typeof payload.beneficiaryId === 'string') {
    const beneficiary = await prisma.beneficiary.findUnique({ where: { id: payload.beneficiaryId }, select: { owner: { select: { userId: true } } } });
    return beneficiary?.owner.userId ?? null;
  }
  return null;
}

async function notifyEmailOwner(payload: Record<string, unknown>, title: string, body: string, dedupeKey: string) {
  const userId = await emailOwnerUserId(payload);
  if (userId) await createNotification({ userId, type: 'SECURITY', title, body, link: '/legacy-policy', dedupeKey: `${dedupeKey}:${userId}` });
}

export function verifyCronSecret(provided: string | undefined) {
  const expected = environment.CRON_SECRET;
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function enqueue(policyId: string, toEmail: string, template: string, payload: object, idempotencyKey: string) {
  await prisma.emailOutbox.upsert({
    where: { idempotencyKey },
    update: {},
    create: { toEmail, template, payload: payload as object, idempotencyKey },
  });
}

export async function runLegacyJob(now = new Date()) {
  const scheduled = await prisma.legacyPolicy.findMany({
    where: { status: 'ACTIVE', releaseMethod: 'scheduled_date', releaseAt: { not: null }, beneficiary: { status: { in: ['ACCEPTED', 'VERIFIED'] }, userId: { not: null } } },
    include: { owner: { include: { user: true } }, beneficiary: true },
  });

  for (const policy of scheduled) {
    if (!policy.releaseAt || !policy.owner?.user) continue;
    const releaseMs = policy.releaseAt.getTime();
    const warningOffsets = [
      { days: policy.coolingOffDays, key: 'cooling' },
      { days: 1, key: 'one-day' },
      { days: 0, key: 'day-of' },
    ];
    for (const warning of warningOffsets) {
      const warningAt = releaseMs - warning.days * 86_400_000;
      if (now.getTime() >= warningAt && now.getTime() < releaseMs) {
        const key = `warning:${policy.id}:${warning.key}:${policy.releaseAt.toISOString()}`;
        await enqueue(policy.id, policy.owner.user.email, 'owner_warning', {
          policyId: policy.id,
          ownerName: policy.owner.displayName,
          beneficiaryName: policy.beneficiary.fullName,
          releaseAt: policy.releaseAt.toISOString(),
        }, key);
        await createNotification({
          userId: policy.owner.userId,
          type: 'SECURITY',
          title: 'Scheduled release warning',
          body: `${policy.beneficiary.fullName} will be emailed on ${policy.releaseAt.toLocaleString()} unless you pause, postpone, or cancel.`,
          link: '/legacy-policy',
          dedupeKey: key,
        });
      }
    }

    if (releaseMs <= now.getTime()) {
      const claimed = await prisma.legacyPolicy.updateMany({
        where: { id: policy.id, status: 'ACTIVE', releaseMethod: 'scheduled_date', releaseAt: { lte: now } },
        data: { status: 'RELEASED', releasedAt: now, activeScopeKey: null, releaseReadyAt: null, releaseRequestedAt: null },
      });
      if (claimed.count === 1) {
        await enqueue(policy.id, policy.beneficiary.email, 'release', {
          policyId: policy.id,
          ownerName: policy.owner.displayName,
        }, `release:${policy.id}:${policy.releaseAt.toISOString()}`);
        await createNotification({
          userId: policy.owner.userId,
          type: 'SECURITY',
          title: 'Scheduled release email queued',
          body: `${policy.beneficiary.fullName} will receive the scheduled release notification.`,
          link: '/legacy-policy',
          dedupeKey: `release-notice:${policy.id}:${policy.releaseAt.toISOString()}`,
        });
        if (policy.beneficiary.userId) await createNotification({ userId: policy.beneficiary.userId, type: 'SECURITY', title: 'Legacy memories are available', body: `${policy.owner.displayName} released “${policy.name}” to your beneficiary library.`, link: '/beneficiary-portal', dedupeKey: `legacy-available:${policy.id}` });
      }
    }
  }

  const ready = { status: 'pending' as const, nextAttemptAt: { lte: now }, attempts: { lt: 5 } };
  const ordered = [] as Awaited<ReturnType<typeof prisma.emailOutbox.findMany>>;
  for (const template of ['release', 'invitation', 'owner_warning']) {
    const remaining = 25 - ordered.length;
    if (remaining <= 0) break;
    ordered.push(...await prisma.emailOutbox.findMany({ where: { ...ready, template }, orderBy: { createdAt: 'asc' }, take: remaining }));
  }
  if (ordered.length < 25) {
    ordered.push(...await prisma.emailOutbox.findMany({ where: { ...ready, template: { notIn: ['release', 'invitation', 'owner_warning'] } }, orderBy: { createdAt: 'asc' }, take: 25 - ordered.length }));
  }
  const pending = ordered;
  let dailySent = 0;
  if (environment.MAIL_PROVIDER === 'resend' && environment.MAIL_MODE === 'send') {
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    dailySent = await prisma.emailOutbox.count({ where: { status: 'sent', sentAt: { gte: startOfDay } } });
  }
  for (let pendingIndex = 0; pendingIndex < ordered.length; pendingIndex += 1) {
    const email = ordered[pendingIndex]!;
    const payload = email.payload as Record<string, unknown>;
    if (environment.MAIL_PROVIDER === 'resend' && environment.MAIL_MODE === 'send' && dailySent >= DAILY_RESEND_LIMIT) {
      for (const deferred of ordered.slice(pendingIndex)) {
        const deferredPayload = deferred.payload as Record<string, unknown>;
        await prisma.emailOutbox.update({ where: { id: deferred.id }, data: { nextAttemptAt: nextUtcDay(now) } });
        await notifyEmailOwner(deferredPayload, 'Email sending paused for today', 'MemoSphere reached today’s email sending limit. Pending notices will resume tomorrow.', `resend-daily-limit:${now.toISOString().slice(0, 10)}`);
      }
      break;
    }
    try {
      if (email.template === 'invitation') {
        const beneficiaryId = typeof payload.beneficiaryId === 'string' ? payload.beneficiaryId : null;
        const ownerName = typeof payload.ownerName === 'string' ? payload.ownerName : 'A MemoSphere owner';
        if (!beneficiaryId) throw new Error('Invitation payload is missing beneficiary.');
        const raw = createOutboxEmailToken(email.idempotencyKey);
        await prisma.beneficiary.update({ where: { id: beneficiaryId }, data: { invitationTokenHash: hash(raw), invitationExpiresAt: new Date(now.getTime() + 7 * 86_400_000), invitationUsedAt: null } });
        const delivery = await legacyMailer.sendBeneficiaryInvite({
          email: email.toEmail,
          beneficiaryName: typeof payload.beneficiaryName === 'string' ? payload.beneficiaryName : 'Beneficiary',
          ownerName,
          verifyUrl: appUrl(`/verify-email?token=${encodeURIComponent(raw)}&purpose=invitation`),
          declineUrl: appUrl(`/verify-email?token=${encodeURIComponent(raw)}&purpose=decline`),
          idempotencyKey: email.idempotencyKey,
        });
        if (!delivery.sent) throw new Error('MAIL_MODE_LOG');
      } else if (email.template === 'release') {
        const policyId = typeof payload.policyId === 'string' ? payload.policyId : '';
        const policy = await prisma.legacyPolicy.findUnique({ where: { id: policyId }, include: { beneficiary: true, owner: { include: { user: true } } } });
        if (!policy || policy.status !== 'RELEASED' || policy.beneficiary.status === 'DECLINED' || policy.beneficiary.status === 'REVOKED') {
          await prisma.emailOutbox.update({ where: { id: email.id }, data: { status: 'failed', lastError: 'Policy no longer permits release.', attempts: email.attempts + 1 } });
          continue;
        }
        const raw = createOutboxEmailToken(email.idempotencyKey);
        await prisma.legacyReleaseToken.create({ data: { policyId, kind: 'release', beneficiaryId: policy.beneficiaryId, tokenHash: hash(raw), expiresAt: new Date(now.getTime() + 7 * 86_400_000) } });
        await legacyMailer.sendRelease({ email: email.toEmail, ownerName: policy.owner.displayName, accessUrl: appUrl(`/verify-email?token=${encodeURIComponent(raw)}&purpose=release`), idempotencyKey: email.idempotencyKey });
      } else if (email.template === 'owner_warning') {
        await legacyMailer.sendOwnerWarning({
          email: email.toEmail,
          ownerName: typeof payload.ownerName === 'string' ? payload.ownerName : 'MemoSphere owner',
          beneficiaryName: typeof payload.beneficiaryName === 'string' ? payload.beneficiaryName : 'Your beneficiary',
          releaseDate: typeof payload.releaseAt === 'string' ? new Date(payload.releaseAt) : now,
          idempotencyKey: email.idempotencyKey,
        });
      } else if (email.template === 'owner_confirmation') {
        await legacyMailer.sendOwnerConfirmation({
          email: email.toEmail,
          ownerName: typeof payload.ownerName === 'string' ? payload.ownerName : 'MemoSphere owner',
          beneficiaryName: typeof payload.beneficiaryName === 'string' ? payload.beneficiaryName : 'Your beneficiary',
          idempotencyKey: email.idempotencyKey,
        });
      }
      await prisma.emailOutbox.update({ where: { id: email.id }, data: { status: 'sent', sentAt: now, attempts: email.attempts + 1, lastError: null } });
      if (environment.MAIL_PROVIDER === 'resend' && environment.MAIL_MODE === 'send') dailySent += 1;
      if (email.template === 'release') {
        const policyId = typeof payload.policyId === 'string' ? payload.policyId : null;
        if (policyId) {
          const policy = await prisma.legacyPolicy.findUnique({ where: { id: policyId }, include: { owner: { include: { user: true } }, beneficiary: true } });
          if (policy) {
            const confirmationKey = `owner-confirm:${policy.id}:${policy.releasedAt?.toISOString() ?? now.toISOString()}`;
            await enqueue(policy.id, policy.owner.user.email, 'owner_confirmation', { policyId: policy.id, ownerName: policy.owner.displayName, beneficiaryName: policy.beneficiary.fullName }, confirmationKey);
          }
        }
      }
    } catch (error) {
      const attempts = email.attempts + 1;
      const safeError = error instanceof Error ? error.message.slice(0, 500) : 'Email delivery failed.';
      if (error instanceof MailDeliveryError && error.kind === 'quota') {
        const resumeAt = error.retryAfterMs ? new Date(now.getTime() + error.retryAfterMs) : nextUtcDay(now);
        await prisma.emailOutbox.update({ where: { id: email.id }, data: { lastError: safeError, nextAttemptAt: resumeAt } });
        dailySent = DAILY_RESEND_LIMIT;
        for (const deferred of ordered.slice(pendingIndex)) {
          const deferredPayload = deferred.payload as Record<string, unknown>;
          if (deferred.id !== email.id) await prisma.emailOutbox.update({ where: { id: deferred.id }, data: { nextAttemptAt: nextUtcDay(now) } });
          await notifyEmailOwner(deferredPayload, 'Email sending paused for today', 'MemoSphere reached today’s email sending limit. Pending notices will resume tomorrow.', `resend-daily-limit:${now.toISOString().slice(0, 10)}`);
        }
        break;
      }
      if (error instanceof MailDeliveryError && error.kind === 'permanent') {
        await prisma.emailOutbox.update({ where: { id: email.id }, data: { status: 'failed', attempts, lastError: safeError } });
        console.error(JSON.stringify({ level: 'error', event: 'mail_permanent_failure', provider: environment.MAIL_PROVIDER, status: error.status, category: error.message }));
        if (error.status === 422) await notifyEmailOwner(payload, 'Email address could not receive a notice', 'A MemoSphere email could not be delivered because the recipient address is invalid. Update the address to try again.', `mail-invalid-address:${email.id}`);
        continue;
      }
      if (attempts >= 5) {
        await prisma.emailOutbox.update({ where: { id: email.id }, data: { status: 'failed', attempts, lastError: safeError } });
        const policyId = typeof payload.policyId === 'string' ? payload.policyId : null;
        if (policyId) {
          const policy = await prisma.legacyPolicy.findUnique({ where: { id: policyId }, include: { owner: true } });
          if (policy) await createNotification({ userId: policy.owner.userId, type: 'SECURITY', title: 'Scheduled release email failed', body: 'The release notification could not be delivered. The policy remains server-controlled.', link: '/legacy-policy', dedupeKey: `email-failure:${policy.id}:${email.template}` });
        }
      } else {
        const backoff = error instanceof MailDeliveryError && error.retryAfterMs !== undefined ? error.retryAfterMs : Math.min(24 * 86_400_000, 60_000 * (2 ** (attempts - 1)));
        await prisma.emailOutbox.update({ where: { id: email.id }, data: { attempts, lastError: safeError, nextAttemptAt: new Date(now.getTime() + backoff) } });
      }
    }
    if (environment.MAIL_PROVIDER !== 'log' && environment.MAIL_MODE === 'send') await delay(SEND_SPACING_MS);
  }
  return { processed: pending.length };
}
