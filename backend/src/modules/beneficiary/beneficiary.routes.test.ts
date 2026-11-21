import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  ownerFindUnique: vi.fn(),
  beneficiaryFindFirst: vi.fn(),
  beneficiaryFindMany: vi.fn(),
  beneficiaryCreate: vi.fn(),
  beneficiaryUpdate: vi.fn(),
  outboxCreate: vi.fn(),
  outboxUpdate: vi.fn(),
  auditCreate: vi.fn(),
}));

const mailer = vi.hoisted(() => ({ sendBeneficiaryInvite: vi.fn() }));

vi.mock('../../config/prisma.js', () => ({
  prisma: {
    owner: { findUnique: db.ownerFindUnique },
    beneficiary: { findFirst: db.beneficiaryFindFirst, findMany: db.beneficiaryFindMany, create: db.beneficiaryCreate, update: db.beneficiaryUpdate },
    emailOutbox: { create: db.outboxCreate, update: db.outboxUpdate },
    accessAuditLog: { create: db.auditCreate },
  },
}));

vi.mock('../legacy/legacy-mailer.js', () => ({
  legacyMailer: mailer,
  MailDeliveryError: class MailDeliveryError extends Error { constructor(message: string, readonly kind: string, readonly retryAfterMs?: number, readonly status?: number) { super(message); } },
}));

import { createBeneficiaryRouter } from './beneficiary.routes.js';
import { errorHandler } from '../../middleware/errorHandler.js';
import { assignRequestId } from '../../middleware/requestId.js';
import type { AuthService, SafeUser } from '../auth/auth.types.js';

const user: SafeUser = { id: 'user-a', fullName: 'Owner A', email: 'owner@example.test', accountStatus: 'ACTIVE', createdAt: new Date() };
const authService: AuthService = {
  async register() { return user; },
  async login() { return { user, sessionToken: 'session-a', expiresAt: new Date(Date.now() + 60_000) }; },
  async logout() {},
  async getUserFromSession(token) { return token === 'session-a' ? user : null; },
};

function app() {
  const server = express();
  server.use(express.json());
  server.use(assignRequestId);
  server.use('/api/beneficiaries', createBeneficiaryRouter(authService));
  server.use(errorHandler);
  return server;
}

beforeEach(() => {
  vi.clearAllMocks();
  db.ownerFindUnique.mockResolvedValue({ id: 'owner-a', userId: 'user-a', displayName: 'Owner A' });
  db.beneficiaryFindFirst.mockResolvedValue(null);
  db.beneficiaryCreate.mockResolvedValue({ id: 'beneficiary-a', ownerId: 'owner-a', fullName: 'Mara Santos', email: 'mara@example.test', relationship: 'Daughter', status: 'INVITED', createdAt: new Date() });
  db.outboxCreate.mockResolvedValue({ id: 'outbox-a' });
  db.outboxUpdate.mockResolvedValue({ id: 'outbox-a' });
  mailer.sendBeneficiaryInvite.mockResolvedValue({ sent: true });
});

describe('beneficiary invitation delivery', () => {
  it('creates and emails a valid beneficiary invitation', async () => {
    const diagnosticLog = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const response = await request(app())
      .post('/api/beneficiaries')
      .set('Cookie', 'alaala_session=session-a')
      .send({ fullName: 'Mara Santos', email: 'MARA@Example.Test', relationship: 'Daughter' });
    expect(response.status).toBe(201);
    expect(response.body.data.delivery).toBe('Invitation email sent.');
    expect(db.beneficiaryCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ email: 'mara@example.test', status: 'INVITED', invitationTokenHash: expect.any(String) }),
    }));
    expect(mailer.sendBeneficiaryInvite).toHaveBeenCalledWith(expect.objectContaining({
      email: 'mara@example.test',
      verifyUrl: expect.stringContaining('/verify-email?token='),
      requestId: response.headers['x-request-id'],
    }));
    const stages = diagnosticLog.mock.calls.map(([line]) => JSON.parse(String(line)).event);
    expect(stages).toEqual(expect.arrayContaining(['invitation_request_received', 'beneficiary_invitation_record_created', 'email_sending_function_invoked']));
    diagnosticLog.mockRestore();
  });

  it('rejects invalid emails', async () => {
    await request(app())
      .post('/api/beneficiaries')
      .set('Cookie', 'alaala_session=session-a')
      .send({ fullName: 'Mara Santos', email: 'not-an-email', relationship: 'Daughter' })
      .expect(400);
  });

  it('rejects an existing invitation', async () => {
    db.beneficiaryFindFirst.mockResolvedValue({ id: 'beneficiary-a', status: 'INVITED' });
    await request(app())
      .post('/api/beneficiaries')
      .set('Cookie', 'alaala_session=session-a')
      .send({ fullName: 'Mara Santos', email: 'mara@example.test', relationship: 'Daughter' })
      .expect(409);
  });

  it('preserves the beneficiary and outbox when delivery fails', async () => {
    mailer.sendBeneficiaryInvite.mockRejectedValue(new Error('Resend network request failed.'));
    const response = await request(app())
      .post('/api/beneficiaries')
      .set('Cookie', 'alaala_session=session-a')
      .send({ fullName: 'Mara Santos', email: 'mara@example.test', relationship: 'Daughter' });
    expect(response.status).toBe(503);
    expect(db.beneficiaryCreate).toHaveBeenCalled();
    expect(db.outboxUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'pending', attempts: 1 }),
    }));
  });

  it('does not report success when the mailer did not send an email', async () => {
    const diagnosticError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mailer.sendBeneficiaryInvite.mockResolvedValue({ sent: false });
    const response = await request(app())
      .post('/api/beneficiaries')
      .set('Cookie', 'alaala_session=session-a')
      .send({ fullName: 'Mara Santos', email: 'mara@example.test', relationship: 'Daughter' })
      .expect(503);
    expect(response.body.error.message).toContain('beneficiary was saved');
    expect(db.outboxUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'pending' }) }));
    expect(diagnosticError).toHaveBeenCalledWith(expect.stringContaining('"errorCategory":"mail_mode_log"'));
    diagnosticError.mockRestore();
  });
});
