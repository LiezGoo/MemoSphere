import { describe, expect, it } from 'vitest';
import { diaryCreateSchema } from './diary.validation.js';

const manualEntry = {
  originalContent: 'A memory written by hand.',
};

describe('diary create input method', () => {
  it('creates an entry without title, category, or entry date fields', () => {
    const result = diaryCreateSchema.safeParse(manualEntry);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.inputMethod).toBe('TEXT');
      expect(result.data.title).toBe('');
      expect(result.data.category).toBe('Reflections');
      expect(result.data.entryDate).toBeUndefined();
    }
  });

  it('keeps legacy title, category, and entry-date payload fields valid', () => {
    expect(diaryCreateSchema.safeParse({
      ...manualEntry,
      title: 'A typed memory',
      category: 'Reflections',
      entryDate: '2026-11-14T00:00:00.000Z',
    }).success).toBe(true);
  });

  it('requires the original transcript for voice entries', () => {
    expect(diaryCreateSchema.safeParse({ ...manualEntry, inputMethod: 'VOICE' }).success).toBe(false);
    const result = diaryCreateSchema.safeParse({ ...manualEntry, inputMethod: 'VOICE', transcript: 'The original transcription.' });
    expect(result.success).toBe(true);
  });
});
