import { describe, expect, it } from 'vitest';
import { classifyEmotionLocally } from './emotion.js';

describe('local diary emotion classification', () => {
  it('detects clear emotional language', () => {
    expect(classifyEmotionLocally('I feel happy and grateful for this wonderful celebration today')).toBe('JOY');
  });

  it('does not fabricate an emotion from insufficient text', () => {
    expect(classifyEmotionLocally('A short note')).toBeNull();
  });

  it('does not choose a tie', () => {
    expect(classifyEmotionLocally('I felt happy and sad but was able to continue')).toBeNull();
  });
});
