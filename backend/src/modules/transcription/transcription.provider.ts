import {
  ProviderFailureError,
  RateLimitError,
  ServiceUnavailableError,
} from '../../exceptions/index.js';
import { environment } from '../../config/environment.js';

const GROQ_TRANSCRIPTION_URL =
  'https://api.groq.com/openai/v1/audio/transcriptions';

function fileExtension(mimeType: string): string {
  const extensions: Record<string, string> = {
    'audio/mp4': 'm4a',
    'audio/mpeg': 'mp3',
    'audio/ogg': 'ogg',
    'audio/wav': 'wav',
    'audio/webm': 'webm',
  };

  return extensions[mimeType] ?? 'audio';
}

export async function transcribeAudio(
  audio: Buffer,
  mimeType: string,
): Promise<string> {
  // Ensure the transcription provider is configured.
if (!environment.GROQ_API_KEY) {
  throw new ServiceUnavailableError(
    'Speech transcription is not configured. Please contact the administrator.',
  );
}

  const form = new FormData();
  const extension = fileExtension(mimeType);

  form.append(
    'file',
    new Blob([Uint8Array.from(audio)], { type: mimeType }),
    `recording.${extension}`,
  );

  form.append('model', environment.GROQ_STT_MODEL);
  form.append('response_format', 'json');

  let response: Response;

  try {
    response = await fetch(GROQ_TRANSCRIPTION_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${environment.GROQ_API_KEY}`,
      },
      body: form,
      signal: AbortSignal.timeout(90_000),
    });
  } catch {
    throw new ProviderFailureError(
      'The speech transcription service could not be reached. Please try again.',
    );
  }

  // Handle provider rate limits.
  if (response.status === 429) {
    throw new RateLimitError();
  }

  // Handle unsuccessful provider responses without exposing private details.
  if (!response.ok) {
    if (
      response.status === 400 ||
      response.status === 413 ||
      response.status === 415
    ) {
      throw new ProviderFailureError(
        'The transcription provider could not process this recording. Try a shorter recording in a supported format.',
      );
    }

    throw new ProviderFailureError(
      'The speech transcription service could not process this recording. Please try again later.',
    );
  }

  // Safely parse the transcription response.
  const result = (await response.json().catch(() => undefined)) as
    | { text?: unknown }
    | undefined;

  if (
    typeof result?.text !== 'string' ||
    result.text.trim().length === 0
  ) {
    throw new ProviderFailureError(
      'No speech was detected in this recording. Please try another recording.',
    );
  }

  return result.text.trim();
}