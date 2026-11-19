import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function loadTranscriptionModule() {
  vi.resetModules();

  const [provider, exceptions] = await Promise.all([
    import('./transcription.provider.js'),
    import('../../exceptions/index.js'),
  ]);

  return {
    transcribeAudio: provider.transcribeAudio,
    ServiceUnavailableError: exceptions.ServiceUnavailableError,
  };
}

describe('speech transcription provider', () => {
  it('returns ServiceUnavailableError when no Groq API key is configured', async () => {
    vi.stubEnv('GROQ_API_KEY', '');

    const { transcribeAudio, ServiceUnavailableError } =
      await loadTranscriptionModule();

    await expect(
      transcribeAudio(Buffer.from('audio'), 'audio/webm'),
    ).rejects.toBeInstanceOf(ServiceUnavailableError);
  });

  it('returns provider transcription text', async () => {
    vi.stubEnv('GROQ_API_KEY', 'test-key');

    const { transcribeAudio } = await loadTranscriptionModule();

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ text: '  A clear transcription.  ' }),
          { status: 200 },
        ),
      ),
    );

    await expect(
      transcribeAudio(Buffer.from('audio'), 'audio/webm'),
    ).resolves.toBe('A clear transcription.');
  });

  it('hides provider error details from callers', async () => {
    vi.stubEnv('GROQ_API_KEY', 'test-key');

    const { transcribeAudio } = await loadTranscriptionModule();

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ error: 'private provider detail' }),
          { status: 401 },
        ),
      ),
    );

    await expect(
      transcribeAudio(Buffer.from('audio'), 'audio/webm'),
    ).rejects.toThrow('could not process this recording');
  });

  it('handles provider rate limits', async () => {
    vi.stubEnv('GROQ_API_KEY', 'test-key');

    const { transcribeAudio } = await loadTranscriptionModule();

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('{}', { status: 429 }),
      ),
    );

    await expect(
      transcribeAudio(Buffer.from('audio'), 'audio/webm'),
    ).rejects.toThrow('Too many requests');
  });

  it('does not reveal private provider response details', async () => {
    vi.stubEnv('GROQ_API_KEY', 'test-key');

    const { transcribeAudio } = await loadTranscriptionModule();

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ error: 'private provider detail' }),
          { status: 500 },
        ),
      ),
    );

    await expect(
      transcribeAudio(Buffer.from('audio'), 'audio/webm'),
    ).rejects.toThrow('could not process this recording');
  });
});
