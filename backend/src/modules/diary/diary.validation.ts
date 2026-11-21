import { z } from 'zod';

const dateValue = z.coerce.date();
const emotionValue = z.enum(['JOY', 'SADNESS', 'ANGER', 'FEAR', 'DISGUST', 'ANXIETY']);

export const diaryListSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  category: z.string().trim().max(80).optional(),
  from: dateValue.optional(),
  to: dateValue.optional(),
  favorites: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
  withPhotos: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
  withAudio: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
  archived: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
  sort: z.enum(['newest', 'oldest', 'created-newest', 'created-oldest', 'updated-newest', 'updated-oldest']).default('newest'),
});

export const diaryFavoriteSchema = z.object({ isFavorite: z.boolean() });

export const diaryCreateSchema = z.object({
  title: z.string().trim().max(200).optional().default(''),
  category: z.string().trim().min(1).max(80).optional().default('Reflections'),
  originalContent: z.string().max(100000).default(''),
  entryDate: dateValue.optional(),
  inputMethod: z.enum(['TEXT', 'VOICE']).default('TEXT'),
  transcript: z.string().max(100000).optional(),
  photoPublicIds: z.array(z.string().trim().min(1).max(512)).max(5).default([]),
}).refine((value) => value.inputMethod !== 'VOICE' || Boolean(value.transcript?.trim()), {
  message: 'Voice entries must include the original transcription.',
  path: ['transcript'],
}).refine((value) => Boolean(value.title.trim() || value.originalContent.trim() || value.photoPublicIds.length), {
  message: 'An entry must include a title, text, or photo.',
  path: ['originalContent'],
});

export const diaryUpdateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  category: z.string().trim().min(1).max(80).optional(),
  content: z.string().min(1).max(100000).optional(),
  entryDate: dateValue.optional(),
  emotion: emotionValue.nullable().optional(),
}).refine((value) => Object.keys(value).length > 0, 'At least one field is required.');

export const diaryEmotionSchema = z.object({
  emotion: emotionValue,
});
