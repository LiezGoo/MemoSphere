import { environment } from '../../config/environment.js';

export type DiaryEmotion = 'JOY' | 'SADNESS' | 'ANGER' | 'FEAR' | 'DISGUST' | 'ANXIETY';

const lexicon: Record<DiaryEmotion, string[]> = {
  JOY: ['happy', 'joy', 'grateful', 'celebrate', 'achievement', 'proud', 'excited', 'thankful', 'success'],
  SADNESS: ['sad', 'lonely', 'heartbreak', 'grief', 'miss', 'loss', 'cry', 'hurt', 'alone'],
  ANGER: ['angry', 'frustrated', 'mad', 'rage', 'conflict', 'disappointed', 'annoyed'],
  FEAR: ['afraid', 'scared', 'fear', 'nervous', 'uncertain', 'worried', 'dread'],
  DISGUST: ['disgust', 'uncomfortable', 'dislike', 'reject', 'boundaries', 'revolted'],
  ANXIETY: ['anxious', 'anxiety', 'overthinking', 'pressure', 'anticipation', 'panic', 'stress'],
};

export function classifyEmotionLocally(content: string): DiaryEmotion | null {
  const normalized = content.toLowerCase().trim();
  if (normalized.length < 20) return null;
  const scores = (Object.keys(lexicon) as DiaryEmotion[]).map((emotion) => ({
    emotion,
    score: lexicon[emotion].reduce((total, word) => total + (normalized.includes(word) ? 1 : 0), 0),
  })).sort((a, b) => b.score - a.score);
  if (scores[0].score === 0 || scores[0].score === scores[1].score) return null;
  return scores[0].emotion;
}

export async function classifyEmotion(content: string): Promise<DiaryEmotion | null> {
  if (!environment.GROQ_API_KEY) return classifyEmotionLocally(content);
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${environment.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: environment.GROQ_STT_MODEL,
      messages: [
        { role: 'system', content: 'Classify the diary text as exactly one of JOY, SADNESS, ANGER, FEAR, DISGUST, or ANXIETY. Return only one uppercase category. If there is insufficient evidence, return NONE.' },
        { role: 'user', content: content.slice(0, 10000) },
      ],
      temperature: 0,
    }),
  });
  if (!response.ok) return classifyEmotionLocally(content);
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const value = payload.choices?.[0]?.message?.content?.trim().toUpperCase();
  return value && ['JOY', 'SADNESS', 'ANGER', 'FEAR', 'DISGUST', 'ANXIETY'].includes(value) ? value as DiaryEmotion : null;
}
