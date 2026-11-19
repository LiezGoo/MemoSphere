import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import type { AuthService, SafeUser } from '../auth/auth.types.js';

const user: SafeUser = {
  id: 'writing-user',
  fullName: 'Writing User',
  email: 'writing@example.test',
  accountStatus: 'ACTIVE',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

const authService: AuthService = {
  async register() { return user; },
  async login() { return { user, sessionToken: 'writing-session', expiresAt: new Date('2026-12-01T00:00:00.000Z') }; },
  async logout() {},
  async getUserFromSession(sessionToken) { return sessionToken === 'writing-session' ? user : null; },
};

describe('writing mode previews for unsaved diary content', () => {
  it('does not require Gemini or consent for Verbatim', async () => {
    const response = await request(createApp(authService))
      .post('/api/diary/writing-modes/process')
      .set('Cookie', 'alaala_session=writing-session')
      .send({ mode: 'VERBATIM', content: '  Keep exact words.  ' });

    expect(response.status).toBe(200);
    expect(response.body.data.version.processedContent).toBe('  Keep exact words.  ');
  });

  it('requires consent before Gemini can receive text', async () => {
    const response = await request(createApp(authService))
      .post('/api/diary/writing-modes/process')
      .set('Cookie', 'alaala_session=writing-session')
      .send({ mode: 'LIGHT_FIX', content: 'My original diary text.' });

    expect(response.status).toBe(400);
  });

  it('previews a mode without persisting a diary entry', async () => {
    const response = await request(createApp(authService))
      .post('/api/diary/writing-modes/process')
      .set('Cookie', 'alaala_session=writing-session')
      .send({ mode: 'VERBATIM', content: 'A  spoken   sentence.\n' });

    expect(response.status).toBe(200);
    expect(response.body.data.version.processedContent).toBe('A  spoken   sentence.\n');
    expect(response.body.data.persisted).toBe(false);
  });

  it('does not send Review text to Gemini without consent', async () => {
    const response = await request(createApp(authService))
      .post('/api/diary/writing-modes/process')
      .set('Cookie', 'alaala_session=writing-session')
      .send({ mode: 'REVIEW', content: 'Keep my original words.' });

    expect(response.status).toBe(400);
  });
});
