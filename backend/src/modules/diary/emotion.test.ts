import { describe, expect, it } from 'vitest';
import { classifyEmotionLocally, parseEmotionClassification } from './emotion.js';

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

  it.each([
    ['Today was the happiest day of my life. I finally achieved my dream.', 'JOY'],
    ['I miss the people who used to be part of my life.', 'SADNESS'],
    ['I am so frustrated because nobody listens to me.', 'ANGER'],
    ['I am afraid of what might happen tomorrow.', 'FEAR'],
    ['I really disliked how they treated me.', 'DISGUST'],
    ['I keep overthinking everything, and I cannot relax.', 'ANXIETY'],
  ])('detects clear emotion examples', (text, emotion) => {
    expect(classifyEmotionLocally(text)).toBe(emotion);
  });

  it('validates structured Gemini output', () => {
    expect(parseEmotionClassification('{"emotion":"JOY","confidence":0.94,"reason":"Positive achievement"}')).toEqual({
      emotion: 'JOY',
      confidence: 0.94,
      reason: 'Positive achievement',
    });
  });
});
