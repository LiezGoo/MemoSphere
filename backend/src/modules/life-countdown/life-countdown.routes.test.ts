import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import type { AuthService, SafeUser } from '../auth/auth.types.js';

const user: SafeUser = { id: 'countdown-user', fullName: 'Owner', email: 'owner@example.test', accountStatus: 'ACTIVE', createdAt: new Date('2026-01-01T00:00:00.000Z') };
const authService: AuthService = {
  async register() { return user; },
  async login() { return { user, sessionToken: 'countdown-session', expiresAt: new Date('2026-12-01T00:00:00.000Z') }; },
  async logout() {},
  async getUserFromSession(token) { return token === 'countdown-session' ? user : null; },
};

describe('life countdown API validation', () => {
  it('requires an authenticated owner', async () => {
    const response = await request(createApp(authService)).get('/api/life-countdown');
    expect(response.status).toBe(401);
  });

  it('rejects durations outside the allowed range', async () => {
    const response = await request(createApp(authService)).post('/api/life-countdown')
      .set('Cookie', 'alaala_session=countdown-session').send({ durationDays: 0, startDate: '2026-11-14' });
    expect(response.status).toBe(400);
  });

  it('rejects invalid calendar dates', async () => {
    const response = await request(createApp(authService)).post('/api/life-countdown')
      .set('Cookie', 'alaala_session=countdown-session').send({ durationDays: 365, startDate: '2026-02-30' });
    expect(response.status).toBe(400);
  });
});
