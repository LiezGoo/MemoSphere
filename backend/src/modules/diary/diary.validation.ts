import { z } from 'zod';

const dateValue = z.coerce.date();

export const diaryListSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  category: z.string().trim().max(80).optional(),
  from: dateValue.optional(),
  to: dateValue.optional(),
  sort: z.enum(['newest', 'oldest', 'created-newest', 'created-oldest']).default('newest'),
});

export const diaryCreateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(80),
  originalContent: z.string().min(1).max(100000),
  entryDate: dateValue,
  inputMethod: z.enum(['TEXT', 'VOICE']).default('TEXT'),
  transcript: z.string().max(100000).optional(),
}).refine((value) => value.inputMethod !== 'VOICE' || Boolean(value.transcript?.trim()), {
  message: 'Voice entries must include the original transcription.',
  path: ['transcript'],
});

export const diaryUpdateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  category: z.string().trim().min(1).max(80).optional(),
  content: z.string().min(1).max(100000).optional(),
  entryDate: dateValue.optional(),
}).refine((value) => Object.keys(value).length > 0, 'At least one field is required.');
