import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import type { AuthService, SafeUser } from '../auth/auth.types.js';

const user: SafeUser = {
  id: 'ai-user',
  fullName: 'AI User',
  email: 'ai@example.test',
  accountStatus: 'ACTIVE',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

const authService: AuthService = {
  async register() { return user; },
  async login() { return { user, sessionToken: 'ai-session', expiresAt: new Date('2026-12-01T00:00:00.000Z') }; },
  async logout() {},
  async getUserFromSession(sessionToken) { return sessionToken === 'ai-session' ? user : null; },
};

describe('AI chatbot API authentication', () => {
  it('requires authentication to create conversations', async () => {
    const response = await request(createApp(authService))
      .post('/api/ai/conversations')
      .send({ mode: 'AI_BUDDY' });
    expect(response.status).toBe(401);
  });

  it('rejects invalid chatbot modes', async () => {
    const response = await request(createApp(authService))
      .post('/api/ai/conversations')
      .set('Cookie', 'alaala_session=ai-session')
      .send({ mode: 'OTHER' });
    expect(response.status).toBe(400);
  });
});
