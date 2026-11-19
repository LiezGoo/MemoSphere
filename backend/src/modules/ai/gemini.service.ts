import { GoogleGenAI } from '@google/genai';
import { environment } from '../../config/environment.js';
import { ProviderFailureError, RateLimitError, ServiceUnavailableError } from '../../exceptions/index.js';

export type ChatMode = 'AI_BUDDY' | 'DIARY_ASSISTANT';

const buddyInstruction = 'You are Memo, a warm, empathetic AI companion for everyday conversation. Listen without judgment, ask relevant follow-up questions, offer advice when requested, and never claim to be a therapist or a human friend. Keep responses natural and concise. For serious distress, encourage trusted people or appropriate real-world professional support.';
const diaryInstruction = 'You are Memo, a private diary assistant. Answer only from the supplied authorized diary entries. Never invent memories or facts. Cite entry IDs naturally, and clearly state when the supplied entries do not contain enough information.';

export async function generateChatResponse(
  mode: ChatMode,
  messages: Array<{ role: 'USER' | 'ASSISTANT'; content: string }>,
  diaryContext: string = '',
): Promise<string> {
  if (!environment.GEMINI_API_KEY) {
    throw new ServiceUnavailableError('Memo AI is not configured. Please try again later.');
  }

  const ai = new GoogleGenAI({ apiKey: environment.GEMINI_API_KEY, httpOptions: { timeout: 90_000 } });
  const models = [environment.GEMINI_MODEL, 'gemini-3.1-flash-lite', 'gemini-3.5-flash'].filter((model, index, all) => all.indexOf(model) === index);
  const contents = messages.map((message) => `${message.role === 'USER' ? 'User' : 'Memo'}: ${message.content}`).join('\n');
  const prompt = mode === 'DIARY_ASSISTANT'
    ? `${diaryInstruction}\n\nAuthorized diary entries:\n${diaryContext || 'No authorized diary entries were found.'}\n\nConversation:\n${contents}`
    : `${buddyInstruction}\n\nConversation:\n${contents}`;

  let lastError: unknown;
  for (const model of models) {
    try {
      const response = await ai.models.generateContent({ model, contents: prompt });
      const text = response.text?.trim();
      if (!text) throw new ProviderFailureError('Memo returned no response. Please try again.');
      return text;
    } catch (error) {
      lastError = error;
      const status = typeof error === 'object' && error !== null && 'status' in error ? Number(error.status) : 0;
      if (status === 429) throw new RateLimitError();
      if (status !== 404) throw new ProviderFailureError('Memo could not process this message. Please try again later.');
    }
  }
  console.error(JSON.stringify({ level: 'error', operation: 'gemini_chat', model: environment.GEMINI_MODEL, errorName: lastError instanceof Error ? lastError.name : typeof lastError }));
  throw new ProviderFailureError('The configured Gemini model is unavailable. Please try again later.');
}
