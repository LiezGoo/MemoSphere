import { Router, type RequestHandler } from 'express';
import { RequestValidationError } from '../../exceptions/index.js';
import { authenticateUser } from '../../middleware/authenticateUser.js';
import type { AuthService } from '../auth/auth.types.js';
import { createDiaryEntry, deleteDiaryEntry, getDiaryEntry, listDiaryEntries, setDiaryEntryArchived, setDiaryEntryFavorite, updateDiaryEntry } from './diary.service.js';
import { diaryCreateSchema, diaryEmotionSchema, diaryFavoriteSchema, diaryListSchema, diaryUpdateSchema } from './diary.validation.js';
import { prisma } from '../../config/prisma.js';
import { getOwnerForUser } from '../../utils/owner.js';

export function createDiaryRouter(authService: AuthService) {
  const diaryRouter = Router();
  diaryRouter.use(authenticateUser(authService));

diaryRouter.get('/entries', async (request, response, next) => {
  try { response.setHeader('Cache-Control', 'private, no-store'); const parsed = diaryListSchema.safeParse(request.query); if (!parsed.success) throw new RequestValidationError(parsed.error.issues[0]?.message ?? 'Invalid diary filters.'); response.json({ success: true, data: await listDiaryEntries(request.authenticatedUserId!, parsed.data) }); } catch (error) { next(error); }
});
diaryRouter.post('/entries', async (request, response, next) => {
  try { const parsed = diaryCreateSchema.safeParse(request.body); if (!parsed.success) throw new RequestValidationError(parsed.error.issues[0]?.message ?? 'Invalid diary entry.'); response.status(201).json({ success: true, data: { entry: await createDiaryEntry(request.authenticatedUserId!, parsed.data) } }); } catch (error) { next(error); }
});
diaryRouter.patch('/entries/:id/favorite', async (request, response, next) => {
  try {
    const id = request.params.id;
    const parsed = diaryFavoriteSchema.safeParse(request.body);
    if (typeof id !== 'string' || !parsed.success) throw new RequestValidationError('A valid favorite value and diary entry ID are required.');
    response.json({ success: true, data: { entry: await setDiaryEntryFavorite(request.authenticatedUserId!, id, parsed.data.isFavorite) } });
  } catch (error) { next(error); }
});
diaryRouter.post('/entries/:id/archive', async (request, response, next) => {
  try { response.json({ success: true, data: { entry: await setDiaryEntryArchived(request.authenticatedUserId!, request.params.id, true) } }); } catch (error) { next(error); }
});
diaryRouter.post('/entries/:id/restore', async (request, response, next) => {
  try { response.json({ success: true, data: { entry: await setDiaryEntryArchived(request.authenticatedUserId!, request.params.id, false) } }); } catch (error) { next(error); }
});
diaryRouter.post('/entries/:id/classify-emotion', async (request, response, next) => {
  try {
    const parsed = diaryEmotionSchema.partial().safeParse(request.body);
    const id = request.params.id;
    if (typeof id !== 'string' || id.length === 0) throw new RequestValidationError('A diary entry ID is required.');
    if (!parsed.success) throw new RequestValidationError('Choose a valid emotion.');
    const entry = await getDiaryEntry(request.authenticatedUserId!, id);
    if (!entry) throw new RequestValidationError('Diary entry not found.');
    const emotion = parsed.data.emotion ?? null;
    if (emotion) {
      await updateDiaryEntry(request.authenticatedUserId!, id, { emotion });
      await prisma.diaryEntry.update({ where: { id }, data: { emotionConfidence: 1, emotionReason: 'Manually confirmed by the entry owner.', emotionSource: 'MANUAL', emotionUpdatedAt: new Date() } });
    } else {
      const { classifyEmotion } = await import('./emotion.js');
      const classified = await classifyEmotion(entry.content);
      await prisma.diaryEntry.update({ where: { id }, data: { emotion: classified.emotion, emotionConfidence: classified.confidence, emotionReason: classified.reason, emotionSource: classified.emotion ? 'AI' : null, emotionUpdatedAt: classified.emotion ? new Date() : null } });
    }
    response.json({ success: true, data: { entry: await getDiaryEntry(request.authenticatedUserId!, id) } });
  } catch (error) { next(error); }
});
diaryRouter.patch('/entries/:id/emotion', async (request, response, next) => {
  try {
    const id = request.params.id;
    if (typeof id !== 'string' || id.length === 0) throw new RequestValidationError('A diary entry ID is required.');
    const parsed = diaryEmotionSchema.safeParse(request.body);
    if (!parsed.success) throw new RequestValidationError('Choose a valid emotion.');
    const entry = await updateDiaryEntry(request.authenticatedUserId!, id, { emotion: parsed.data.emotion });
    await prisma.diaryEntry.update({ where: { id }, data: { emotionConfidence: 1, emotionReason: 'Manually confirmed by the entry owner.', emotionSource: 'MANUAL', emotionUpdatedAt: new Date() } });
    response.json({ success: true, data: { entry: await getDiaryEntry(request.authenticatedUserId!, id) } });
  } catch (error) { next(error); }
});
diaryRouter.get('/entries/:id', async (request, response, next) => {
  try { response.setHeader('Cache-Control', 'private, no-store'); response.json({ success: true, data: { entry: await getDiaryEntry(request.authenticatedUserId!, request.params.id) } }); } catch (error) { next(error); }
});
diaryRouter.post('/classify-unclassified', async (request, response, next) => {
  try {
    const owner = await getOwnerForUser(request.authenticatedUserId!);
    const entries = await prisma.diaryEntry.findMany({
      where: { ownerId: owner.id, status: { not: 'DELETED' }, emotion: null },
      select: { id: true, originalContent: true, normalizedContent: true },
      take: 20,
    });
    const { classifyEmotion } = await import('./emotion.js');
    let classified = 0;
    let failed = 0;
    for (const entry of entries) {
      try {
        const result = await classifyEmotion(entry.normalizedContent ?? entry.originalContent);
        await prisma.diaryEntry.updateMany({
          where: { id: entry.id, ownerId: owner.id, emotion: null, emotionSource: null },
          data: { emotion: result.emotion, emotionConfidence: result.confidence, emotionReason: result.reason, emotionSource: result.emotion ? 'AI' : null, emotionUpdatedAt: result.emotion ? new Date() : null },
        });
        if (result.emotion) classified += 1;
      } catch {
        failed += 1;
      }
    }
    response.json({ success: true, data: { classified, failed, remaining: entries.length - classified } });
  } catch (error) { next(error); }
});
const updateEntry: RequestHandler = async (request, response, next) => {
  try {
    const id = request.params.id;
    if (typeof id !== 'string' || id.length === 0) throw new RequestValidationError('A diary entry ID is required.');
    const parsed = diaryUpdateSchema.safeParse(request.body);
    if (!parsed.success) throw new RequestValidationError(parsed.error.issues[0]?.message ?? 'Invalid diary update.');
    response.json({ success: true, data: { entry: await updateDiaryEntry(request.authenticatedUserId!, id, parsed.data) } });
  } catch (error) { next(error); }
};
diaryRouter.patch('/entries/:id', updateEntry);
diaryRouter.put('/entries/:id', updateEntry);
  diaryRouter.delete('/entries/:id', async (request, response, next) => {
  try { await deleteDiaryEntry(request.authenticatedUserId!, request.params.id); response.status(204).send(); } catch (error) { next(error); }
});

  return diaryRouter;
}
