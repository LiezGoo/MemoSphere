import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Router, type RequestHandler } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { InputValidationError, RequestEntityTooLarge, ResourceNotFound, UnauthorizedError } from '../../exceptions/index.js';
import { authenticateUser } from '../../middleware/authenticateUser.js';
import { verifySameOrigin } from '../../middleware/csrfOrigin.js';
import { createRateLimiter } from '../../middleware/rateLimiter.js';
import { verifyPassword, hashPassword } from '../../utils/password.js';
import { createNotification } from '../../utils/notifications.js';
import { clearSessionCookie } from '../../utils/cookies.js';
import type { AuthService } from '../auth/auth.types.js';

const preferenceSchema = z.object({ countdown: z.boolean().optional(), reminder: z.boolean().optional(), revision_ready: z.boolean().optional(), system: z.boolean().optional() }).strict();
const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(2).max(100).optional(),
  bio: z.string().max(3000).transform((value) => value.replace(/<[^>]*>/g, '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim()).pipe(z.string().max(2000)).optional(),
  timezone: z.string().trim().min(1).max(100).optional(),
  notificationPreferences: preferenceSchema.optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'Provide at least one profile field to update.');
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128).regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/),
}).strict();
const deleteAccountSchema = z.object({ confirmation: z.literal('DELETE MY ACCOUNT'), currentPassword: z.string().min(1).max(128) }).strict();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024, files: 1, fields: 0 }, fileFilter: (_request, file, callback) => {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.mimetype)) { callback(new InputValidationError('Upload a PNG, JPG, or WebP image.')); return; }
  callback(null, true);
} });
const writeLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 30 });
const preferencesDefault = { countdown: true, reminder: false, revision_ready: true, system: true };

function validTimezone(timezone: string) {
  try { new Intl.DateTimeFormat('en', { timeZone: timezone }); return true; } catch { return false; }
}
function detectedImageType(buffer: Buffer) {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}
function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new InputValidationError(parsed.error.issues[0]?.message ?? 'Invalid profile data.');
  return parsed.data;
}

const handleAvatarUpload: RequestHandler = (request, response, next) => {
  upload.single('avatar')(request, response, (error: unknown) => {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') { next(new RequestEntityTooLarge('Avatar image must be 2 MB or smaller.')); return; }
    if (error instanceof multer.MulterError) { next(new InputValidationError('Upload one PNG, JPG, or WebP image.')); return; }
    next(error);
  });
};

export function createProfileRouter(authService: AuthService) {
  const router = Router();
  router.use(authenticateUser(authService));

  router.get('/', async (request, response, next) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: request.authenticatedUserId! }, select: { id: true, fullName: true, email: true, bio: true, avatarUrl: true, timezone: true, notificationPreferences: true, createdAt: true, updatedAt: true } });
      if (!user) throw new ResourceNotFound('Profile not found.');
      response.json({ success: true, data: { profile: { ...user, notificationPreferences: { ...preferencesDefault, ...(user.notificationPreferences as object ?? {}) } } } });
    } catch (error) { next(error); }
  });

  router.patch('/', verifySameOrigin, writeLimit, async (request, response, next) => {
    try {
      const input = parseBody(profileUpdateSchema, request.body);
      if (input.timezone && !validTimezone(input.timezone)) throw new InputValidationError('Choose a valid IANA timezone.');
      const current = await prisma.user.findUnique({ where: { id: request.authenticatedUserId! }, select: { notificationPreferences: true } });
      if (!current) throw new ResourceNotFound('Profile not found.');
      const preferences = input.notificationPreferences ? { ...preferencesDefault, ...(current.notificationPreferences as object ?? {}), ...input.notificationPreferences } : undefined;
      const user = await prisma.$transaction(async (transaction) => {
        const updated = await transaction.user.update({ where: { id: request.authenticatedUserId! }, data: {
          ...(input.displayName ? { fullName: input.displayName } : {}),
          ...(input.bio !== undefined ? { bio: input.bio } : {}),
          ...(input.timezone ? { timezone: input.timezone } : {}),
          ...(preferences ? { notificationPreferences: preferences } : {}),
        }, select: { id: true, fullName: true, email: true, bio: true, avatarUrl: true, timezone: true, notificationPreferences: true, createdAt: true, updatedAt: true } });
        if (input.displayName) await transaction.owner.update({ where: { userId: request.authenticatedUserId! }, data: { displayName: input.displayName } });
        return updated;
      });
      response.json({ success: true, data: { profile: { ...user, notificationPreferences: { ...preferencesDefault, ...(user.notificationPreferences as object ?? {}) } } } });
    } catch (error) { next(error); }
  });

  router.post('/avatar', verifySameOrigin, writeLimit, handleAvatarUpload, async (request, response, next) => {
    try {
      const file = request.file;
      if (!file) throw new InputValidationError('Choose a PNG, JPG, or WebP avatar image.');
      if (detectedImageType(file.buffer) !== file.mimetype) throw new InputValidationError('The image content does not match its file type.');
      const extension = file.mimetype === 'image/jpeg' ? 'jpg' : file.mimetype.slice('image/'.length);
      const fileName = `${randomUUID()}.${extension}`;
      const directory = resolve(process.cwd(), 'public', 'uploads');
      await mkdir(directory, { recursive: true });
      await writeFile(resolve(directory, fileName), file.buffer, { flag: 'wx' });
      const avatarUrl = `/uploads/${fileName}`;
      const user = await prisma.user.update({ where: { id: request.authenticatedUserId! }, data: { avatarUrl }, select: { id: true, fullName: true, email: true, avatarUrl: true } });
      response.status(201).json({ success: true, data: { profile: user } });
    } catch (error) { next(error); }
  });

  router.post('/change-password', verifySameOrigin, writeLimit, async (request, response, next) => {
    try {
      const input = parseBody(changePasswordSchema, request.body);
      const user = await prisma.user.findUnique({ where: { id: request.authenticatedUserId! }, select: { passwordHash: true } });
      if (!user) throw new ResourceNotFound('Profile not found.');
      if (!(await verifyPassword(input.currentPassword, user.passwordHash))) throw new UnauthorizedError('Current password is incorrect.');
      await prisma.user.update({ where: { id: request.authenticatedUserId! }, data: { passwordHash: await hashPassword(input.newPassword) } });
      await createNotification({ userId: request.authenticatedUserId!, type: 'SECURITY', title: 'Password changed', body: 'Your MemoSphere password was changed.' });
      response.json({ success: true, data: { message: 'Password changed successfully.' } });
    } catch (error) { next(error); }
  });

  router.delete('/', verifySameOrigin, writeLimit, async (request, response, next) => {
    try {
      const input = parseBody(deleteAccountSchema, request.body);
      const user = await prisma.user.findUnique({ where: { id: request.authenticatedUserId! }, select: { passwordHash: true } });
      if (!user) throw new ResourceNotFound('Profile not found.');
      if (!(await verifyPassword(input.currentPassword, user.passwordHash))) throw new UnauthorizedError('Current password is incorrect.');
      await prisma.user.delete({ where: { id: request.authenticatedUserId! } });
      clearSessionCookie(response);
      response.json({ success: true, data: { message: 'Account deleted.' } });
    } catch (error) { next(error); }
  });

  return router;
}
