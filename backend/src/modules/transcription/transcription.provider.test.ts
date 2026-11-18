import { afterEach, describe, expect, it, vi } from 'vitest';
import { ServiceUnavailableError } from '../../exceptions/index.js';
import { transcribeAudio } from './transcription.provider.js';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('speech transcription provider', () => {
  it('does not pretend to transcribe when no provider key is configured', async () => {
    vi.stubEnv('AI_TRANSCRIPTION_API_KEY', '');
    vi.stubEnv('AI_PROVIDER_API_KEY', '');
    await expect(transcribeAudio(Buffer.from('audio'), 'audio/webm'))
      .rejects.toBeInstanceOf(ServiceUnavailableError);
  });

  it('returns provider transcription text', async () => {
    vi.stubEnv('AI_TRANSCRIPTION_API_KEY', 'test-key');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ text: '  A clear transcription.  ' }), { status: 200 })));
    await expect(transcribeAudio(Buffer.from('audio'), 'audio/webm')).resolves.toBe('A clear transcription.');
  });

  it('hides provider error details from callers', async () => {
    vi.stubEnv('AI_TRANSCRIPTION_API_KEY', 'test-key');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'private provider detail' }), { status: 401 })));
    await expect(transcribeAudio(Buffer.from('audio'), 'audio/webm')).rejects.toThrow('rejected its backend credentials');
  });

  it('explains when the provider usage limit is reached', async () => {
    vi.stubEnv('AI_TRANSCRIPTION_API_KEY', 'test-key');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 429 })));
    await expect(transcribeAudio(Buffer.from('audio'), 'audio/webm')).rejects.toThrow('usage limit was reached');
  });

  it('does not reveal private provider response details', async () => {
    vi.stubEnv('AI_TRANSCRIPTION_API_KEY', 'test-key');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'private provider detail' }), { status: 500 })));
    await expect(transcribeAudio(Buffer.from('audio'), 'audio/webm')).rejects.toThrow('could not process this recording');
  });
});
