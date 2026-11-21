import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  policyFindMany: vi.fn(), policyFindUnique: vi.fn(), policyUpdateMany: vi.fn(),
  beneficiaryUpdate: vi.fn(), beneficiaryFindUnique: vi.fn(),
  outboxFindMany: vi.fn(), outboxCount: vi.fn(), outboxUpdate: vi.fn(), outboxUpsert: vi.fn(),
  releaseTokenCreate: vi.fn(), notification: vi.fn(),
  sendInvite: vi.fn(), sendRelease: vi.fn(), sendWarning: vi.fn(), sendConfirmation: vi.fn(),
}));

vi.mock('../../config/prisma.js', () => ({ prisma: {
  legacyPolicy: { findMany: mocks.policyFindMany, findUnique: mocks.policyFindUnique, updateMany: mocks.policyUpdateMany },
  beneficiary: { update: mocks.beneficiaryUpdate, findUnique: mocks.beneficiaryFindUnique },
  emailOutbox: { findMany: mocks.outboxFindMany, count: mocks.outboxCount, update: mocks.outboxUpdate, upsert: mocks.outboxUpsert },
  legacyReleaseToken: { create: mocks.releaseTokenCreate },
} }));
vi.mock('../../utils/notifications.js', () => ({ createNotification: mocks.notification }));
vi.mock('./legacy-mailer.js', () => ({
  legacyMailer: { sendBeneficiaryInvite: mocks.sendInvite, sendRelease: mocks.sendRelease, sendOwnerWarning: mocks.sendWarning, sendOwnerConfirmation: mocks.sendConfirmation },
  MailDeliveryError: class MailDeliveryError extends Error { constructor(message: string, readonly kind: string, readonly retryAfterMs?: number, readonly status?: number) { super(message); } },
}));

import { environment } from '../../config/environment.js';
import { runLegacyJob } from './legacy-jobs.js';
import { MailDeliveryError } from './legacy-mailer.js';

const original = { provider: environment.MAIL_PROVIDER, mode: environment.MAIL_MODE };
const now = new Date('2026-11-21T12:00:00.000Z');

function pending(id: string, template: string, payload: Record<string, unknown> = {}) {
  return { id, template, payload, toEmail: 'delivered@resend.dev', idempotencyKey: `key-${id}`, attempts: 0, createdAt: new Date('2026-11-21T10:00:00.000Z') };
}
function setPendingRows(rows: ReturnType<typeof pending>[]) {
  mocks.outboxFindMany.mockImplementation((query: { where: { template: string | { notIn: string[] } } }) => Promise.resolve(rows.filter((row) => typeof query.where.template === 'string' ? row.template === query.where.template : !query.where.template.notIn.includes(row.template))));
}

beforeEach(() => {
  vi.clearAllMocks();
  environment.MAIL_PROVIDER = 'resend';
  environment.MAIL_MODE = 'send';
  mocks.policyFindMany.mockResolvedValue([]);
  mocks.policyFindUnique.mockResolvedValue(null);
  mocks.outboxFindMany.mockResolvedValue([]);
  mocks.outboxCount.mockResolvedValue(0);
  mocks.outboxUpdate.mockResolvedValue({});
  mocks.outboxUpsert.mockResolvedValue({});
  mocks.beneficiaryUpdate.mockResolvedValue({});
  mocks.beneficiaryFindUnique.mockResolvedValue({ owner: { userId: 'owner-user' } });
  mocks.releaseTokenCreate.mockResolvedValue({});
  mocks.notification.mockResolvedValue({});
  mocks.sendInvite.mockResolvedValue({ sent: true });
  mocks.sendRelease.mockResolvedValue({ sent: true });
  mocks.sendWarning.mockResolvedValue({ sent: true });
  mocks.sendConfirmation.mockResolvedValue({ sent: true });
});

afterEach(() => {
  environment.MAIL_PROVIDER = original.provider;
  environment.MAIL_MODE = original.mode;
});

describe('legacy email outbox Resend behavior', () => {
  it('leaves pending notices queued and notifies owners when the daily quota is already reached', async () => {
    setPendingRows([pending('outbox-a', 'release', { policyId: 'policy-a' }), pending('outbox-b', 'invitation', { beneficiaryId: 'beneficiary-b' })]);
    mocks.outboxCount.mockResolvedValue(100);
    mocks.policyFindUnique.mockResolvedValue({ owner: { userId: 'owner-user' } });
    await runLegacyJob(now);
    expect(mocks.sendRelease).not.toHaveBeenCalled();
    expect(mocks.sendInvite).not.toHaveBeenCalled();
    expect(mocks.outboxUpdate).toHaveBeenCalledTimes(2);
    expect(mocks.outboxUpdate).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'outbox-a' }, data: { nextAttemptAt: new Date('2026-11-22T00:00:00.000Z') } }));
    expect(mocks.notification).toHaveBeenCalled();
  });

  it('stops at a quota response, leaves the remaining items pending, and notifies the owner', async () => {
    mocks.outboxCount.mockResolvedValue(99);
    setPendingRows([pending('outbox-a', 'release', { policyId: 'policy-a' }), pending('outbox-b', 'owner_warning', { policyId: 'policy-a' })]);
    mocks.policyFindUnique.mockResolvedValue({ id: 'policy-a', status: 'RELEASED', releasedAt: now, beneficiary: { status: 'VERIFIED' }, owner: { userId: 'owner-user', displayName: 'Owner', user: { email: 'owner@example.test' } } });
    mocks.sendRelease.mockRejectedValue(new MailDeliveryError('Resend daily sending quota reached.', 'quota', undefined, 429));
    await runLegacyJob(now);
    expect(mocks.sendRelease).toHaveBeenCalledTimes(1);
    expect(mocks.sendWarning).not.toHaveBeenCalled();
    expect(mocks.outboxUpdate).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'outbox-a' }, data: expect.objectContaining({ nextAttemptAt: new Date('2026-11-22T00:00:00.000Z') }) }));
    expect(mocks.outboxUpdate).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'outbox-b' }, data: { nextAttemptAt: new Date('2026-11-22T00:00:00.000Z') } }));
    expect(mocks.notification).toHaveBeenCalled();
  });

  it('passes the outbox idempotency key to each provider send', async () => {
    environment.MAIL_MODE = 'log';
    const invite = pending('outbox-invite', 'invitation', { beneficiaryId: 'beneficiary-a', beneficiaryName: 'Beneficiary', ownerName: 'Owner' });
    setPendingRows([invite]);
    await runLegacyJob(now);
    expect(mocks.sendInvite).toHaveBeenCalledWith(expect.objectContaining({ idempotencyKey: invite.idempotencyKey }));
  });

  it('selects releases before invitations and warnings even when warnings are older', async () => {
    environment.MAIL_MODE = 'log';
    const warning = pending('warning', 'owner_warning', { policyId: 'policy-a', ownerName: 'Owner', beneficiaryName: 'Beneficiary' });
    const invite = pending('invite', 'invitation', { beneficiaryId: 'beneficiary-a', beneficiaryName: 'Beneficiary', ownerName: 'Owner' });
    const release = pending('release', 'release', { policyId: 'policy-a' });
    warning.createdAt = new Date('2026-11-20T10:00:00.000Z');
    invite.createdAt = new Date('2026-11-20T11:00:00.000Z');
    setPendingRows([warning, invite, release]);
    const policy = { id: 'policy-a', status: 'RELEASED', releasedAt: now, beneficiary: { id: 'ben-a', status: 'VERIFIED', fullName: 'Beneficiary' }, owner: { userId: 'owner-user', displayName: 'Owner', user: { email: 'delivered@resend.dev' } } };
    mocks.policyFindUnique.mockResolvedValue(policy);
    const sent: string[] = [];
    mocks.sendRelease.mockImplementation(async () => { sent.push('release'); return { sent: true }; });
    mocks.sendInvite.mockImplementation(async () => { sent.push('invitation'); return { sent: true }; });
    mocks.sendWarning.mockImplementation(async () => { sent.push('owner_warning'); return { sent: true }; });
    await runLegacyJob(now);
    expect(sent).toEqual(['release', 'invitation', 'owner_warning']);
  });
});
