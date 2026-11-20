import { timingSafeEqual, randomBytes, createHash } from 'node:crypto';
import { environment } from '../../config/environment.js';
import { prisma } from '../../config/prisma.js';
import { createNotification } from '../../utils/notifications.js';
import { legacyMailer } from './legacy-mailer.js';

function hash(value: string) { return createHash('sha256').update(value).digest('hex'); }
function appUrl(path: string) {
  return new URL(path, environment.APP_BASE_URL ?? environment.FRONTEND_URL).toString();
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
    where: { status: 'ACTIVE', releaseMethod: 'scheduled_date', releaseAt: { not: null } },
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
      }
    }
  }

  const pending = await prisma.emailOutbox.findMany({
    where: { status: 'pending', nextAttemptAt: { lte: now }, attempts: { lt: 5 } },
    orderBy: { createdAt: 'asc' },
    take: 25,
  });
  for (const email of pending) {
    const payload = email.payload as Record<string, unknown>;
    try {
      if (email.template === 'invitation') {
        const beneficiaryId = typeof payload.beneficiaryId === 'string' ? payload.beneficiaryId : null;
        const ownerName = typeof payload.ownerName === 'string' ? payload.ownerName : 'A MemoSphere owner';
        if (!beneficiaryId) throw new Error('Invitation payload is missing beneficiary.');
        const raw = randomBytes(32).toString('base64url');
        await prisma.beneficiary.update({ where: { id: beneficiaryId }, data: { invitationTokenHash: hash(raw), invitationExpiresAt: new Date(now.getTime() + 7 * 86_400_000), invitationUsedAt: null } });
        await legacyMailer.sendBeneficiaryInvite({
          email: email.toEmail,
          beneficiaryName: typeof payload.beneficiaryName === 'string' ? payload.beneficiaryName : 'Beneficiary',
          ownerName,
          verifyUrl: appUrl(`/verify-email?token=${encodeURIComponent(raw)}&purpose=invitation`),
          declineUrl: appUrl(`/verify-email?token=${encodeURIComponent(raw)}&purpose=decline`),
        });
      } else if (email.template === 'release') {
        const policyId = typeof payload.policyId === 'string' ? payload.policyId : '';
        const policy = await prisma.legacyPolicy.findUnique({ where: { id: policyId }, include: { beneficiary: true, owner: { include: { user: true } } } });
        if (!policy || policy.status !== 'RELEASED' || policy.beneficiary.status === 'DECLINED' || policy.beneficiary.status === 'REVOKED') {
          await prisma.emailOutbox.update({ where: { id: email.id }, data: { status: 'failed', lastError: 'Policy no longer permits release.', attempts: email.attempts + 1 } });
          continue;
        }
        const raw = randomBytes(32).toString('base64url');
        await prisma.legacyReleaseToken.create({ data: { policyId, kind: 'release', beneficiaryId: policy.beneficiaryId, tokenHash: hash(raw), expiresAt: new Date(now.getTime() + 7 * 86_400_000) } });
        await legacyMailer.sendRelease({ email: email.toEmail, ownerName: policy.owner.displayName, accessUrl: appUrl(`/verify-email?token=${encodeURIComponent(raw)}&purpose=release`) });
      } else if (email.template === 'owner_warning') {
        await legacyMailer.sendOwnerWarning({
          email: email.toEmail,
          ownerName: typeof payload.ownerName === 'string' ? payload.ownerName : 'MemoSphere owner',
          beneficiaryName: typeof payload.beneficiaryName === 'string' ? payload.beneficiaryName : 'Your beneficiary',
          releaseDate: typeof payload.releaseAt === 'string' ? new Date(payload.releaseAt) : now,
        });
      } else if (email.template === 'owner_confirmation') {
        await legacyMailer.sendOwnerConfirmation({
          email: email.toEmail,
          ownerName: typeof payload.ownerName === 'string' ? payload.ownerName : 'MemoSphere owner',
          beneficiaryName: typeof payload.beneficiaryName === 'string' ? payload.beneficiaryName : 'Your beneficiary',
        });
      }
      await prisma.emailOutbox.update({ where: { id: email.id }, data: { status: 'sent', sentAt: now, attempts: email.attempts + 1, lastError: null } });
      if (email.template === 'release') {
        const policyId = typeof payload.policyId === 'string' ? payload.policyId : null;
        if (policyId) {
          const policy = await prisma.legacyPolicy.findUnique({ where: { id: policyId }, include: { owner: { include: { user: true } }, beneficiary: true } });
          if (policy) {
            await enqueue(policy.id, policy.owner.user.email, 'owner_confirmation', { policyId: policy.id, ownerName: policy.owner.displayName, beneficiaryName: policy.beneficiary.fullName }, `owner-confirm:${policy.id}:${policy.releasedAt?.toISOString() ?? now.toISOString()}`);
          }
        }
      }
    } catch (error) {
      const attempts = email.attempts + 1;
      const safeError = error instanceof Error ? error.message.slice(0, 500) : 'Email delivery failed.';
      if (attempts >= 5) {
        await prisma.emailOutbox.update({ where: { id: email.id }, data: { status: 'failed', attempts, lastError: safeError } });
        const policyId = typeof payload.policyId === 'string' ? payload.policyId : null;
        if (policyId) {
          const policy = await prisma.legacyPolicy.findUnique({ where: { id: policyId }, include: { owner: true } });
          if (policy) await createNotification({ userId: policy.owner.userId, type: 'SECURITY', title: 'Scheduled release email failed', body: 'The release notification could not be delivered. The policy remains server-controlled.', link: '/legacy-policy', dedupeKey: `email-failure:${policy.id}:${email.template}` });
        }
      } else {
        const delay = Math.min(24 * 86_400_000, 60_000 * (2 ** (attempts - 1)));
        await prisma.emailOutbox.update({ where: { id: email.id }, data: { attempts, lastError: safeError, nextAttemptAt: new Date(now.getTime() + delay) } });
      }
    }
  }
  return { processed: pending.length };
}
