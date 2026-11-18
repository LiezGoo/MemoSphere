import { describe, expect, it } from 'vitest';
import { diaryCreateSchema } from './diary.validation.js';

const manualEntry = {
  title: 'A typed memory',
  category: 'Reflections',
  originalContent: 'A memory written by hand.',
  entryDate: '2026-11-14T00:00:00.000Z',
};

describe('diary create input method', () => {
  it('keeps existing manual-entry payloads valid and defaults them to TEXT', () => {
    const result = diaryCreateSchema.safeParse(manualEntry);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.inputMethod).toBe('TEXT');
  });

  it('requires the original transcript for voice entries', () => {
    expect(diaryCreateSchema.safeParse({ ...manualEntry, inputMethod: 'VOICE' }).success).toBe(false);
    const result = diaryCreateSchema.safeParse({ ...manualEntry, inputMethod: 'VOICE', transcript: 'The original transcription.' });
    expect(result.success).toBe(true);
  });
});
