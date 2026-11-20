import { config } from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';

config({ path: resolve(process.cwd(), '../.env') });
config({ path: resolve(process.cwd(), '../.env.local'), override: false });
config();

if (process.env.NODE_ENV !== 'production' && process.env.LOCAL_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.LOCAL_DATABASE_URL;
}

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  BACKEND_PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  DATABASE_URL: z.string().url().optional(),
  LOCAL_DATABASE_URL: z.string().url().optional(),
  AUTH_COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  TRANSCRIPTION_MAX_FILE_SIZE_MB: z.coerce.number().int().min(1).max(25).default(25),
  TRANSCRIPTION_MAX_DURATION_SECONDS: z.coerce.number().int().min(1).max(1800).default(600),
  GROQ_API_KEY: z.preprocess(
  (value) =>
    typeof value === 'string' && value.trim() === ''
      ? undefined
      : value,
  z.string().trim().min(1).optional(),
  ),
  GROQ_STT_MODEL: z.string().trim().min(1).default('whisper-large-v3'),
  GEMINI_API_KEY: z.preprocess(
    (value) => typeof value === 'string' && value.trim() === '' ? undefined : value,
    z.string().trim().min(1).optional(),
  ),
  GEMINI_MODEL: z.string().trim().min(1).default('gemini-3.1-flash-lite'),
  FACE_TEMPLATE_KEY: z.string().trim().min(1).optional(),
  FACE_MATCH_THRESHOLD: z.coerce.number().min(0.1).max(1).default(0.52),
  CLOUDINARY_CLOUD_NAME: z.string().trim().min(1).optional(),
  CLOUDINARY_API_KEY: z.string().trim().min(1).optional(),
  CLOUDINARY_API_SECRET: z.string().trim().min(1).optional(),
  BREVO_API_KEY: z.string().trim().optional(),
  MAIL_FROM_EMAIL: z.string().email().optional(),
  MAIL_FROM_NAME: z.string().trim().default('MemoSphere'),
  APP_BASE_URL: z.string().url().optional(),
  MAIL_MODE: z.enum(['send', 'log']).default('log'),
  CRON_SECRET: z.string().trim().min(16).optional(),
  PORT: z.coerce.number().int().positive().optional(),
});

export const environment = environmentSchema.parse(process.env);
