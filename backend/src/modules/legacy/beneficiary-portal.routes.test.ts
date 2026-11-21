import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  beneficiaryFindFirst: vi.fn(),
  policyFindFirst: vi.fn(),
  entryFindMany: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('../../config/prisma.js', () => ({
  prisma: {
    beneficiary: { findFirst: db.beneficiaryFindFirst },
    legacyPolicy: { findFirst: db.policyFindFirst },
    diaryEntry: { findMany: db.entryFindMany },
    $transaction: db.transaction,
  },
}));
vi.mock('../diary/cloudinary.js', () => ({ signedCloudinaryUrl: vi.fn() }));
vi.mock('../ai/gemini.service.js', () => ({ generateChatResponse: vi.fn() }));

import { createBeneficiaryPortalRouter } from './beneficiary-portal.routes.js';
import { errorHandler } from '../../middleware/errorHandler.js';
import type { AuthService, SafeUser } from '../auth/auth.types.js';

const user: SafeUser = { id: 'beneficiary-user', fullName: 'Invitee', email: 'invitee@example.test', accountStatus: 'ACTIVE', createdAt: new Date() };
const auth: AuthService = {
  async register() { return user; },
  async login() { return { user, sessionToken: 'session', expiresAt: new Date(Date.now() + 60_000) }; },
  async logout() {},
  async getUserFromSession(token) { return token === 'session' ? user : null; },
};
function app() {
  const server = express();
  server.use(express.json());
  server.use('/api/beneficiary-portal', createBeneficiaryPortalRouter(auth));
  server.use(errorHandler);
  return server;
}

beforeEach(() => {
  vi.clearAllMocks();
  db.beneficiaryFindFirst.mockResolvedValue(null);
  db.policyFindFirst.mockResolvedValue(null);
  db.entryFindMany.mockResolvedValue([]);
});

describe('beneficiary portal authorization', () => {
  it('requires a signed-in beneficiary for the portal overview', async () => {
    await request(app()).get('/api/beneficiary-portal/portal').expect(401);
  });

  it('does not accept an invitation for a different account email', async () => {
    db.beneficiaryFindFirst.mockResolvedValue({
      id: 'beneficiary-link', ownerId: 'owner-a', email: 'someone-else@example.test', status: 'INVITED',
      owner: { userId: 'owner-user', displayName: 'Owner' },
    });
    await request(app()).post('/api/beneficiary-portal/invitations/accept')
      .set('Cookie', 'alaala_session=session')
      .set('Origin', 'http://localhost:3000')
      .send({ token: 'a-valid-invitation-token-with-enough-length' })
      .expect(404);
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('hides a policy that is not linked to the authenticated beneficiary', async () => {
    await request(app()).get('/api/beneficiary-portal/portal/policies/another-users-policy')
      .set('Cookie', 'alaala_session=session')
      .expect(404);
    expect(db.policyFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'another-users-policy', beneficiary: { userId: user.id, status: { in: ['ACCEPTED', 'VERIFIED'] } } },
    }));
    expect(db.entryFindMany).not.toHaveBeenCalled();
  });
});
