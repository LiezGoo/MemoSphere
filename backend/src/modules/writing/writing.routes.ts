import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { RequestValidationError } from '../../exceptions/index.js';
import { authenticateUser } from '../../middleware/authenticateUser.js';
import { getOwnerForUser } from '../../utils/owner.js';
import type { AuthService } from '../auth/auth.types.js';

const processSchema = z.object({ diaryEntryId: z.string(), mode: z.enum(['VERBATIM', 'LIGHT_FIX', 'REVIEW']), content: z.string().min(1).max(100000) });

export function createWritingRouter(authService: AuthService) {
  const router = Router();
  router.use(authenticateUser(authService));
  router.post('/process', async (request, response, next) => {
    try { const parsed = processSchema.safeParse(request.body); if (!parsed.success) throw new RequestValidationError('Invalid writing mode request.'); const owner = await getOwnerForUser(request.authenticatedUserId!); const entry = await prisma.diaryEntry.findFirst({ where: { id: parsed.data.diaryEntryId, ownerId: owner.id, status: { not: 'DELETED' } }, include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } } }); if (!entry) throw new RequestValidationError('Diary entry not found.'); const nextVersion = (entry.versions[0]?.versionNumber ?? 0) + 1; const processedContent = parsed.data.mode === 'VERBATIM' ? parsed.data.content : parsed.data.mode === 'LIGHT_FIX' ? parsed.data.content.replace(/\s+/g, ' ').trim() : parsed.data.content; const version = await prisma.entryVersion.create({ data: { diaryEntryId: entry.id, versionNumber: nextVersion, writingMode: parsed.data.mode, sourceContent: parsed.data.content, processedContent, processingNotes: parsed.data.mode === 'REVIEW' ? 'Review suggestions require explicit human approval.' : null } }); response.status(201).json({ success: true, data: { version } }); } catch (error) { next(error); }
  });
  return router;
}