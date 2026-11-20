import express from 'express';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  ownerFindUnique: vi.fn(), policyFindMany: vi.fn(), policyFindFirst: vi.fn(), policyCreate: vi.fn(), policyUpdate: vi.fn(), policyUpdateMany: vi.fn(), policyDelete: vi.fn(),
  beneficiaryFindMany: vi.fn(), beneficiaryFindFirst: vi.fn(), beneficiaryCreate: vi.fn(), beneficiaryUpdate: vi.fn(), entryCount: vi.fn(), entryFindMany: vi.fn(), entryFindFirst: vi.fn(),
  userFindUnique: vi.fn(), userFindFirst: vi.fn(), emailIdentityQuery: vi.fn(), auditCreate: vi.fn(), tokenFindUnique: vi.fn(), tokenCreate: vi.fn(), tokenUpdateMany: vi.fn(), notificationCreate: vi.fn(),
  emailOutboxCreate: vi.fn(), emailOutboxUpdate: vi.fn(),
}));
vi.mock('../../config/prisma.js', () => ({ prisma: {
  owner: { findUnique: db.ownerFindUnique },
  legacyPolicy: { findMany: db.policyFindMany, findFirst: db.policyFindFirst, create: db.policyCreate, update: db.policyUpdate, updateMany: db.policyUpdateMany, delete: db.policyDelete },
  beneficiary: { findMany: db.beneficiaryFindMany, findFirst: db.beneficiaryFindFirst, create: db.beneficiaryCreate, update: db.beneficiaryUpdate },
  diaryEntry: { count: db.entryCount, findMany: db.entryFindMany, findFirst: db.entryFindFirst },
  user: { findUnique: db.userFindUnique, findFirst: db.userFindFirst },
  $queryRaw: db.emailIdentityQuery,
  legacyAuditLog: { create: db.auditCreate }, legacyReleaseToken: { findUnique: db.tokenFindUnique, create: db.tokenCreate, updateMany: db.tokenUpdateMany },
  emailOutbox: { create: db.emailOutboxCreate, update: db.emailOutboxUpdate },
  notification: { create: db.notificationCreate },
  $transaction: vi.fn(async (input: unknown) => typeof input === 'function' ? (input as (tx: object) => Promise<unknown>)({ legacyPolicy: { updateMany: db.policyUpdateMany }, legacyAuditLog: { create: db.auditCreate }, legacyReleaseToken: { updateMany: db.tokenUpdateMany } }) : Promise.all(input as Promise<unknown>[])),
} }));

import { createLegacyRouter } from './legacy.routes.js';
import { errorHandler } from '../../middleware/errorHandler.js';
import type { AuthService, SafeUser } from '../auth/auth.types.js';

const users: Record<string, SafeUser> = {
  'session-a': { id: 'user-a', fullName: 'User A', email: 'a@example.test', accountStatus: 'ACTIVE', createdAt: new Date() },
  'session-b': { id: 'user-b', fullName: 'User B', email: 'b@example.test', accountStatus: 'ACTIVE', createdAt: new Date() },
};
const authService: AuthService = {
  async register() { return users['session-a']; }, async login() { return { user: users['session-a'], sessionToken: 'session-a', expiresAt: new Date(Date.now() + 10000) }; }, async logout() {},
  async getUserFromSession(token) { return token ? users[token] ?? null : null; },
};
function app() { const server = express(); server.use(express.json()); server.use('/api/legacy', createLegacyRouter(authService)); server.use(errorHandler); return server; }

beforeEach(() => {
  vi.clearAllMocks();
  db.emailOutboxCreate.mockResolvedValue({ id: 'outbox-a' });
  db.emailOutboxUpdate.mockResolvedValue({ id: 'outbox-a' });
  db.ownerFindUnique.mockImplementation(({ where }: { where: { userId: string } }) => Promise.resolve({ id: `owner-${where.userId.slice(-1)}`, userId: where.userId, displayName: where.userId }));
  db.policyFindMany.mockResolvedValue([]); db.policyFindFirst.mockResolvedValue(null); db.beneficiaryFindMany.mockResolvedValue([]); db.beneficiaryFindFirst.mockResolvedValue(null);
  db.policyUpdateMany.mockResolvedValue({ count: 0 }); db.userFindUnique.mockResolvedValue({ notificationPreferences: {} }); db.userFindFirst.mockResolvedValue(null);
  db.emailIdentityQuery.mockResolvedValue([]);
  db.notificationCreate.mockResolvedValue({}); db.auditCreate.mockResolvedValue({});
});

describe('legacy policy security boundary', () => {
  it('requires an authenticated owner session', async () => {
    await request(app()).get('/api/legacy/policies').expect(401);
  });

  it('scopes policy lists to the current owner', async () => {
    await request(app()).get('/api/legacy/policies').set('Cookie', 'alaala_session=session-a').expect(200);
    expect(db.policyFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { ownerId: 'owner-a' } }));
  });

  it('hides another owner’s policy as not found', async () => {
    db.policyFindFirst.mockResolvedValue(null);
    await request(app()).get('/api/legacy/policies/private-b').set('Cookie', 'alaala_session=session-a').expect(404);
    expect(db.policyFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { ownerId: 'owner-a', id: 'private-b' } }));
  });

  it('scopes beneficiary changes to the authenticated owner', async () => {
    db.beneficiaryFindFirst.mockResolvedValue(null);
    await request(app()).patch('/api/legacy/beneficiaries/beneficiary-b').set('Cookie', 'alaala_session=session-a').send({ fullName: 'Changed Name' }).expect(404);
    expect(db.beneficiaryFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'beneficiary-b', ownerId: 'owner-a' } }));
  });

  it('rejects unknown policy fields and invalid release limits', async () => {
    await request(app()).post('/api/legacy/policies').set('Cookie', 'alaala_session=session-a').send({ name: 'Policy', beneficiaryId: 'b', scopeType: 'all_entries', releaseMethod: 'owner_manual', ownerId: 'owner-b' }).expect(422);
    await request(app()).post('/api/legacy/policies').set('Cookie', 'alaala_session=session-a').send({ name: 'Policy', beneficiaryId: 'b', scopeType: 'all_entries', releaseMethod: 'owner_manual', coolingOffDays: 1 }).expect(422);
  });

  it('does not show shared diary content before email identity is verified', async () => {
    await request(app()).get('/api/legacy/shared/policy-a/entries').set('Cookie', 'alaala_session=session-b').expect(404);
    expect(db.policyFindMany).toHaveBeenCalled();
    expect(db.entryFindMany).not.toHaveBeenCalled();
  });

  it('rejects illegal state transitions such as pausing a revoked policy', async () => {
    db.policyFindFirst.mockResolvedValue({ id: 'policy-a', ownerId: 'owner-a', status: 'REVOKED', beneficiaryId: 'beneficiary-a', entryLinks: [] });
    await request(app()).post('/api/legacy/policies/policy-a/pause').set('Cookie', 'alaala_session=session-a').expect(409);
    expect(db.policyUpdate).not.toHaveBeenCalled();
  });

  it('starts release cooling-off only after owner re-authentication and permits cancellation', async () => {
    const passwordHash = await bcrypt.hash('CorrectHorseBattery7', 4);
    db.userFindUnique.mockResolvedValue({ passwordHash });
    const policy = { id: 'policy-a', ownerId: 'owner-a', status: 'ACTIVE', name: 'My policy', releaseMethod: 'owner_manual', coolingOffDays: 7, releaseReadyAt: null, beneficiaryId: 'beneficiary-a', beneficiary: { id: 'beneficiary-a', status: 'VERIFIED' }, entryLinks: [] };
    let currentPolicy = policy;
    db.policyFindFirst.mockImplementation(() => Promise.resolve(currentPolicy));
    db.policyUpdate.mockImplementation(({ data }: { data: object }) => { currentPolicy = { ...currentPolicy, ...data }; return Promise.resolve(currentPolicy); });
    await request(app()).post('/api/legacy/policies/policy-a/release-request').set('Cookie', 'alaala_session=session-a').send({ password: 'CorrectHorseBattery7' }).expect(202);
    const requestData = db.policyUpdate.mock.calls[0]?.[0].data as { releaseRequestedAt: Date; releaseReadyAt: Date };
    expect(requestData.releaseReadyAt.getTime() - requestData.releaseRequestedAt.getTime()).toBe(7 * 86400000);
    await request(app()).post('/api/legacy/policies/policy-a/release-cancel').set('Cookie', 'alaala_session=session-a').expect(200);
    expect(db.policyUpdate.mock.calls[1]?.[0].data).toEqual({ releaseReadyAt: null, releaseRequestedAt: null });
  });

  it('rechecks scope and private-entry exclusions on each shared read', async () => {
    db.emailIdentityQuery.mockResolvedValue([{ id: 'user-b' }]);
    db.policyFindFirst.mockResolvedValue({ id: 'policy-a', ownerId: 'owner-a', status: 'RELEASED', releasedAt: new Date(), releaseReadyAt: null, scopeType: 'categories', scopeCategories: ['Family'], excludedEntryIds: ['private-entry'], scopeDateFrom: null, scopeDateTo: null, entryLinks: [], owner: { id: 'owner-a', userId: 'user-a' } });
    db.entryFindMany.mockResolvedValue([]);
    await request(app()).get('/api/legacy/shared/policy-a/entries').set('Cookie', 'alaala_session=session-b').expect(200);
    expect(db.entryFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ ownerId: 'owner-a', status: 'PRESERVED', neverShare: false, id: { notIn: ['private-entry'] }, category: { in: ['Family'] } }) }));
  });

  it('blocks access as soon as the policy is no longer released', async () => {
    db.emailIdentityQuery.mockResolvedValue([{ id: 'user-b' }]);
    db.policyFindFirst.mockResolvedValue(null);
    await request(app()).get('/api/legacy/shared/policy-a/entries').set('Cookie', 'alaala_session=session-b').expect(404);
    expect(db.policyFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: 'policy-a', status: 'RELEASED' }) }));
    expect(db.entryFindMany).not.toHaveBeenCalled();
  });

  it('rejects a used verifier token', async () => {
    db.tokenFindUnique.mockResolvedValue({ id: 'token-a', usedAt: new Date(), expiresAt: new Date(Date.now() + 1000), policyId: 'policy-a', policy: { id: 'policy-a', ownerId: 'owner-a', status: 'ACTIVE', verifierBeneficiaryId: 'beneficiary-a' } });
    await request(app()).post('/api/legacy/verifier/confirm').set('Cookie', 'alaala_session=session-b').send({ token: 'a-valid-long-single-use-token-value' }).expect(404);
    expect(db.tokenUpdateMany).not.toHaveBeenCalled();
  });

  it('rejects an expired verifier token', async () => {
    db.tokenFindUnique.mockResolvedValue({ id: 'token-a', usedAt: null, expiresAt: new Date(Date.now() - 1000), policyId: 'policy-a', policy: { id: 'policy-a', ownerId: 'owner-a', status: 'ACTIVE', verifierBeneficiaryId: 'beneficiary-a' } });
    await request(app()).post('/api/legacy/verifier/confirm').set('Cookie', 'alaala_session=session-b').send({ token: 'a-valid-long-single-use-token-value' }).expect(404);
    expect(db.tokenUpdateMany).not.toHaveBeenCalled();
  });

  it('rate limits beneficiary invites', async () => {
    const server = app();
    db.beneficiaryCreate.mockResolvedValue({ id: 'beneficiary-new', fullName: 'Mara Santos', email: 'mara@example.test', relationship: null, status: 'INVITED', createdAt: new Date() });
    for (let i = 0; i < 10; i += 1) await request(server).post('/api/legacy/beneficiaries').set('Cookie', 'alaala_session=session-a').send({ fullName: 'Mara Santos', email: `mara${i}@example.test` }).expect(201);
    await request(server).post('/api/legacy/beneficiaries').set('Cookie', 'alaala_session=session-a').send({ fullName: 'Mara Santos', email: 'mara-last@example.test' }).expect(429);
  });
});
