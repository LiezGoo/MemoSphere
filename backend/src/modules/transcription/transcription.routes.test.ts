import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../app.js';
import type { AuthService, SafeUser } from '../auth/auth.types.js';

const user: SafeUser = {
  id: 'voice-user',
  fullName: 'Voice User',
  email: 'voice@example.test',
  accountStatus: 'ACTIVE',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

const authService: AuthService = {
  async register() { return user; },
  async login() { return { user, sessionToken: 'voice-session', expiresAt: new Date('2026-12-01T00:00:00.000Z') }; },
  async logout() {},
  async getUserFromSession(sessionToken) { return sessionToken === 'voice-session' ? user : null; },
};

describe('voice transcription endpoint', () => {
  afterEach(() => vi.restoreAllMocks());

  it('requires an authenticated session', async () => {
    const response = await request(createApp(authService)).post('/api/diary/transcribe');
    expect(response.status).toBe(401);
  });

  it('rejects an authenticated request without an audio recording', async () => {
    const response = await request(createApp(authService))
      .post('/api/diary/transcribe')
      .set('Cookie', 'alaala_session=voice-session');
    expect(response.status).toBe(422);
    expect(response.body.error.message).toContain('audio recording');
  });

  it('rejects audio whose bytes do not match its declared media type', async () => {
    const response = await request(createApp(authService))
      .post('/api/diary/transcribe')
      .set('Cookie', 'alaala_session=voice-session')
      .attach('audio', Buffer.from('not audio'), { filename: 'recording.webm', contentType: 'audio/webm' });
    expect(response.status).toBe(422);
    expect(response.body.error.message).toContain('supported audio recording');
  });

  it('rejects a filename extension that does not match its media type', async () => {
    const response = await request(createApp(authService))
      .post('/api/diary/transcribe')
      .set('Cookie', 'alaala_session=voice-session')
      .attach('audio', Buffer.from('audio'), { filename: 'recording.mp3', contentType: 'audio/webm' });
    expect(response.status).toBe(422);
    expect(response.body.error.message).toContain('extension does not match');
  });

  it('rejects an empty recording with a clear message', async () => {
    const response = await request(createApp(authService))
      .post('/api/diary/transcribe')
      .set('Cookie', 'alaala_session=voice-session')
      .attach('audio', Buffer.alloc(0), { filename: 'recording.webm', contentType: 'audio/webm' });
    expect(response.status).toBe(422);
    expect(response.body.error.message).toContain('recording is empty');
  });

  it('rejects unsupported media types', async () => {
    const response = await request(createApp(authService))
      .post('/api/transcribe')
      .set('Cookie', 'alaala_session=voice-session')
      .attach('audio', Buffer.from('not audio'), { filename: 'recording.txt', contentType: 'text/plain' });
    expect(response.status).toBe(415);
  });

  it('rejects a duration outside the accepted range', async () => {
    const response = await request(createApp(authService))
      .post('/api/transcribe')
      .set('Cookie', 'alaala_session=voice-session')
      .field('durationMs', '500')
      .attach('audio', Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), { filename: 'recording.webm', contentType: 'audio/webm' });
    expect(response.status).toBe(422);
    expect(response.body.error.message).toContain('too short');
  });

  it('transcribes valid audio through the provider', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ text: 'Hello from Groq.' }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const response = await request(createApp(authService))
      .post('/api/transcribe')
      .set('Cookie', 'alaala_session=voice-session')
      .field('durationMs', '3000')
      .attach('audio', Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), { filename: 'recording.webm', contentType: 'audio/webm' });
    expect(response.status).toBe(200);
    expect(response.body.data.transcription).toBe('Hello from Groq.');
  });

  it('maps provider rate limits to 429', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 429 }));
    const response = await request(createApp(authService))
      .post('/api/transcribe')
      .set('Cookie', 'alaala_session=voice-session')
      .field('durationMs', '3000')
      .attach('audio', Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), { filename: 'recording.webm', contentType: 'audio/webm' });
    expect(response.status).toBe(429);
  });
});
