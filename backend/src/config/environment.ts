import { config } from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';

config({ path: resolve(process.cwd(), '../.env') });
config({ path: resolve(process.cwd(), '../.env.local'), override: false });
config();

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  BACKEND_PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  DATABASE_URL: z.string().url().optional(),
  AUTH_COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  TRANSCRIPTION_MAX_FILE_SIZE_MB: z.coerce.number().int().min(1).max(25).default(25),
  TRANSCRIPTION_MAX_DURATION_SECONDS: z.coerce.number().int().min(1).max(1800).default(600),
  GROQ_API_KEY: z.string().trim().min(1).optional(),
  GROQ_STT_MODEL: z.string().trim().min(1).default('whisper-large-v3'),
  FACE_TEMPLATE_KEY: z.string().trim().min(1).optional(),
  FACE_MATCH_THRESHOLD: z.coerce.number().min(0.1).max(1).default(0.52),
});

export const environment = environmentSchema.parse(process.env);
