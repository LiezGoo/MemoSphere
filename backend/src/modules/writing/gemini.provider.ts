import { GoogleGenAI } from '@google/genai';
import { environment } from '../../config/environment.js';
import { ProviderFailureError, RateLimitError, ServiceUnavailableError } from '../../exceptions/index.js';

export type WritingMode = 'LIGHT_FIX' | 'REVIEW';

function prompts(mode: WritingMode) {
  if (mode === 'LIGHT_FIX') {
    return 'Return only the corrected text. Correct spelling, grammar, punctuation, and minor sentence structure while preserving the meaning, emotional tone, and personal style. Do not add information or invent experiences.';
  }
  return 'Return only a reviewed version of the text. Improve sentence flow and clarity, organize paragraphs, and suggest clearer construction while preserving the original meaning and emotional tone. Do not add information or invent experiences.';
}

export async function generateWritingSuggestion(mode: WritingMode, content: string): Promise<string> {
  if (!environment.GEMINI_API_KEY) {
    throw new ServiceUnavailableError('Gemini is not configured. You can save or continue with your original text.');
  }

  const ai = new GoogleGenAI({
    apiKey: environment.GEMINI_API_KEY,
    httpOptions: { timeout: 90_000 },
  });
  const models = [environment.GEMINI_MODEL, 'gemini-3.1-flash-lite', 'gemini-3.5-flash'].filter((model, index, all) => all.indexOf(model) === index);
  let response;
  let lastError: unknown;

  for (const model of models) {
    try {
      response = await ai.models.generateContent({
        model,
        contents: `${prompts(mode)}\n\nOriginal text:\n${content}`,
      });
      break;
    } catch (error) {
      lastError = error;
      const status = typeof error === 'object' && error !== null && 'status' in error ? Number(error.status) : 0;
      const safeName = error instanceof Error ? error.name : typeof error;
      console.error(JSON.stringify({
        level: 'error',
        operation: 'gemini_writing_mode',
        model,
        providerStatus: status || null,
        errorName: safeName,
      }));
      if (status === 429) throw new RateLimitError();
      if (status !== 404) throw new ProviderFailureError('Gemini could not process this text. Please try again later or continue with your original text.');
    }
  }

  if (!response) {
    const timedOut = lastError instanceof Error && /timed out/i.test(lastError.message);
    throw timedOut
      ? new ProviderFailureError('Gemini timed out while processing this text. Please try again or continue with your original text.')
      : new ProviderFailureError('The configured Gemini model is unavailable. Your original text is unchanged.');
  }

  const text = response.text?.trim();
  if (!text) throw new ProviderFailureError('Gemini returned no suggested text. Please continue with your original text.');
  return text;
}
