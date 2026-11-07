import { Router, type RequestHandler } from 'express';
import { RequestValidationError } from '../../exceptions/index.js';
import { authenticateUser } from '../../middleware/authenticateUser.js';
import type { AuthService } from '../auth/auth.types.js';
import { createDiaryEntry, deleteDiaryEntry, getDiaryEntry, listDiaryEntries, updateDiaryEntry } from './diary.service.js';
import { diaryCreateSchema, diaryListSchema, diaryUpdateSchema } from './diary.validation.js';

export function createDiaryRouter(authService: AuthService) {
  const diaryRouter = Router();
  diaryRouter.use(authenticateUser(authService));

diaryRouter.get('/entries', async (request, response, next) => {
  try { const parsed = diaryListSchema.safeParse(request.query); if (!parsed.success) throw new RequestValidationError(parsed.error.issues[0]?.message ?? 'Invalid diary filters.'); response.json({ success: true, data: await listDiaryEntries(request.authenticatedUserId!, parsed.data) }); } catch (error) { next(error); }
});
diaryRouter.post('/entries', async (request, response, next) => {
  try { const parsed = diaryCreateSchema.safeParse(request.body); if (!parsed.success) throw new RequestValidationError(parsed.error.issues[0]?.message ?? 'Invalid diary entry.'); response.status(201).json({ success: true, data: { entry: await createDiaryEntry(request.authenticatedUserId!, parsed.data) } }); } catch (error) { next(error); }
});
diaryRouter.get('/entries/:id', async (request, response, next) => {
  try { response.json({ success: true, data: { entry: await getDiaryEntry(request.authenticatedUserId!, request.params.id) } }); } catch (error) { next(error); }
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