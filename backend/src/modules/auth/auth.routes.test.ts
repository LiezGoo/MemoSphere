import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const notificationMock = vi.hoisted(() => ({ createNotification: vi.fn() }));
vi.mock('../../utils/notifications.js', () => ({ createNotification: notificationMock.createNotification, ensureDailyReminder: vi.fn() }));
import { createApp } from '../../app.js';
import { AccountLockedError, ConflictError, UnauthorizedError } from '../../exceptions/index.js';
import type { AuthResult, AuthService, LoginInput, RegisterInput, SafeUser } from './auth.types.js';

const user: SafeUser = {
  id: 'user-1',
  fullName: 'Sample User',
  email: 'sample@example.test',
  accountStatus: 'ACTIVE',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

beforeEach(() => { notificationMock.createNotification.mockResolvedValue(null); });

function createFakeAuthService(): AuthService {
  let registeredUser: SafeUser | undefined;
  let loggedOut = false;
  return {
    async register(input: RegisterInput) {
      if (registeredUser?.email === input.email) throw new ConflictError('An account with that email already exists.');
      registeredUser = { ...user, fullName: input.fullName, email: input.email };
      return registeredUser;
    },
    async login(input: LoginInput): Promise<AuthResult> {
      if (input.email !== user.email || input.password !== 'CorrectPassword1') throw new UnauthorizedError();
      loggedOut = false;
      return { user, sessionToken: 'session-token', expiresAt: new Date('2026-12-01T00:00:00.000Z') };
    },
    async logout(sessionToken) {
      if (sessionToken === 'session-token') loggedOut = true;
    },
    async getUserFromSession(sessionToken) {
      return sessionToken === 'session-token' && !loggedOut ? user : null;
    },
  };
}

describe('authentication API', () => {
  it('registers a valid account without returning a password', async () => {
    const response = await request(createApp(createFakeAuthService()))
      .post('/api/auth/register')
      .send({ fullName: 'Sample User', email: 'sample@example.test', password: 'CorrectPassword1', confirmPassword: 'CorrectPassword1' });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ success: true, data: { user: { ...user, createdAt: user.createdAt.toISOString() } } });
    expect(response.body.data.user.passwordHash).toBeUndefined();
  });

  it('rejects invalid registration input and password mismatches', async () => {
    const response = await request(createApp(createFakeAuthService()))
      .post('/api/auth/register')
      .send({ fullName: 'A', email: 'not-an-email', password: 'weak', confirmPassword: 'different' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns a generic error for incorrect login credentials', async () => {
    const response = await request(createApp(createFakeAuthService()))
      .post('/api/auth/login')
      .send({ email: 'unknown@example.test', password: 'wrong' });

    expect(response.status).toBe(401);
    expect(response.body.error.message).toBe('Incorrect email or password.');
    expect(response.headers['x-request-id']).toBeTruthy();
    expect(response.body.error.requestId).toBe(response.headers['x-request-id']);
  });

  it('returns 422 for invalid login fields', async () => {
    const response = await request(createApp(createFakeAuthService())).post('/api/auth/login').send({ email: 'not-an-email', password: '' });
    expect(response.status).toBe(422);
    expect(response.body.error.message).toBe('Enter a valid email address.');
  });

  it('returns 423 when the account is not active', async () => {
    const base = createFakeAuthService();
    const locked: AuthService = { ...base, async login() { throw new AccountLockedError(); } };
    const response = await request(createApp(locked))
      .post('/api/auth/login')
      .send({ email: user.email, password: 'CorrectPassword1' });
    expect(response.status).toBe(423);
    expect(response.body.error.code).toBe('ACCOUNT_LOCKED');
  });

  it('returns a safe client error for malformed login JSON', async () => {
    const response = await request(createApp(createFakeAuthService()))
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{');
    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Request body must contain valid JSON.');
  });

  it('completes login if writing the security notification fails', async () => {
    notificationMock.createNotification.mockRejectedValueOnce(new Error('Notification database unavailable'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = await request(createApp(createFakeAuthService()))
      .post('/api/auth/login')
      .send({ email: user.email, password: 'CorrectPassword1' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.headers['x-request-id']).toBeTruthy();
    expect(log).toHaveBeenCalledWith(expect.stringContaining('security_notification'));
    log.mockRestore();
  });

  it('logs unexpected login faults with a request ID and keeps details out of the response', async () => {
    const base = createFakeAuthService();
    const broken: AuthService = { ...base, async login() { throw new Error('private database diagnostic'); } };
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = await request(createApp(broken)).post('/api/auth/login').send({ email: user.email, password: 'CorrectPassword1' });
    expect(response.status).toBe(500);
    expect(response.body.error.message).toBe('An unexpected error occurred.');
    expect(JSON.stringify(response.body)).not.toContain('private database diagnostic');
    expect(response.body.error.requestId).toBe(response.headers['x-request-id']);
    expect(log).toHaveBeenCalledWith(expect.stringContaining(response.headers['x-request-id']));
    log.mockRestore();
  });

  it('sets an http-only cookie and protects the current-user endpoint', async () => {
    const application = createApp(createFakeAuthService());
    const loginResponse = await request(application)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'CorrectPassword1' });
    const cookie = loginResponse.headers['set-cookie']?.[0];

    expect(loginResponse.status).toBe(200);
    expect(cookie).toContain('HttpOnly');
    expect((await request(application).get('/api/auth/me')).status).toBe(401);
    const currentUser = await request(application).get('/api/auth/me').set('Cookie', cookie ?? '');
    expect(currentUser.status).toBe(200);
    expect(currentUser.body.data.user.fullName).toBe(user.fullName);
    expect(currentUser.body.data.user.email).toBe(user.email);
    expect(currentUser.body.data.user.passwordHash).toBeUndefined();
  });

  it('clears the cookie and rejects the session after logout', async () => {
    const application = createApp(createFakeAuthService());
    const loginResponse = await request(application).post('/api/auth/login').send({ email: user.email, password: 'CorrectPassword1' });
    const cookie = loginResponse.headers['set-cookie']?.[0] ?? '';
    const logoutResponse = await request(application).post('/api/auth/logout').set('Cookie', cookie);

    expect(logoutResponse.status).toBe(200);
    expect(logoutResponse.headers['set-cookie']?.[0]).toContain('alaala_session=;');
    expect((await request(application).get('/api/auth/me').set('Cookie', cookie)).status).toBe(401);
  });

  it('rejects state-changing requests from another origin', async () => {
    const response = await request(createApp(createFakeAuthService()))
      .post('/api/auth/logout')
      .set('Origin', 'https://not-alaala.example')
      .send();

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('ACCESS_DENIED');
  });
});
