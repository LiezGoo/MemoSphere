import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { RequestValidationError } from '../../exceptions/index.js';
import { authenticateUser } from '../../middleware/authenticateUser.js';
import { getOwnerForUser } from '../../utils/owner.js';
import type { AuthService } from '../auth/auth.types.js';
import { createNotification } from '../../utils/notifications.js';
import { createRateLimiter } from '../../middleware/rateLimiter.js';
import { generateWritingSuggestion } from './gemini.provider.js';

const processSchema = z.object({
  diaryEntryId: z.string().min(1).optional(),
  mode: z.enum(['VERBATIM', 'LIGHT_FIX', 'REVIEW']),
  content: z.string().min(1).max(100000),
  consentToGemini: z.boolean().optional(),
});

export function createWritingRouter(authService: AuthService) {
  const router = Router();
  router.use(authenticateUser(authService));
  router.post('/process', createRateLimiter({ windowMs: 60_000, max: 12 }), async (request, response, next) => {
    try {
      const parsed = processSchema.safeParse(request.body);
      if (!parsed.success) throw new RequestValidationError('Invalid writing mode request.');
      const { diaryEntryId, mode, content } = parsed.data;
      let processedContent = content;
      let processingNotes: string | null = null;
      if (mode === 'LIGHT_FIX' || mode === 'REVIEW') {
        if (!parsed.data.consentToGemini) throw new RequestValidationError('Consent is required before sending diary text to Gemini.');
        processedContent = await generateWritingSuggestion(mode, content);
        processingNotes = mode === 'LIGHT_FIX'
          ? 'Gemini light-fix suggestion. The original text is unchanged.'
          : 'Gemini review suggestion. Accepting is optional and the original text remains unchanged.';
      }

      // Unsaved diary drafts can be previewed without creating a database record.
      if (!diaryEntryId) {
        void createNotification({ userId: request.authenticatedUserId!, type: 'REVISION_READY', title: 'Revision preview is ready', body: 'Your requested writing mode finished processing. Review the result before saving it.', link: '/writing-modes' }).catch(() => undefined);
        response.json({ success: true, data: { version: { writingMode: mode, sourceContent: content, processedContent, processingNotes }, persisted: false } });
        return;
      }

      const owner = await getOwnerForUser(request.authenticatedUserId!);
      const entry = await prisma.diaryEntry.findFirst({ where: { id: diaryEntryId, ownerId: owner.id, status: { not: 'DELETED' } }, include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } } });
      if (!entry) throw new RequestValidationError('Diary entry not found.');
      const nextVersion = (entry.versions[0]?.versionNumber ?? 0) + 1;
      const version = await prisma.entryVersion.create({ data: { diaryEntryId: entry.id, versionNumber: nextVersion, writingMode: mode, sourceContent: content, processedContent, processingNotes } });
      void createNotification({ userId: request.authenticatedUserId!, type: 'REVISION_READY', title: 'Revision is ready', body: 'Your requested writing mode finished processing. Review the result before saving it.', link: '/writing-modes' }).catch(() => undefined);
      response.status(201).json({ success: true, data: { version, persisted: true } });
    } catch (error) { next(error); }
  });
  return router;
}
