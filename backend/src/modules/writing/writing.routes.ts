import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { InputValidationError, RequestValidationError } from '../../exceptions/index.js';
import { authenticateUser } from '../../middleware/authenticateUser.js';
import { getOwnerForUser } from '../../utils/owner.js';
import type { AuthService } from '../auth/auth.types.js';
import { createNotification } from '../../utils/notifications.js';
import { createRateLimiter } from '../../middleware/rateLimiter.js';
import { generateWritingSuggestion } from './gemini.provider.js';

const processSchema = z.object({
  diaryEntryId: z.string().min(1).optional(),
  mode: z.enum(['VERBATIM', 'LIGHT_FIX', 'REVIEW']),
  content: z.string().min(1).max(10000).optional(),
  text: z.string().min(1).max(10000).optional(),
  instruction: z.string().max(200).optional(),
  consentToGemini: z.boolean().optional(),
  consent: z.boolean().optional(),
}).refine((value) => Boolean(value.text || value.content), 'Text is required.');

export function createWritingRouter(authService: AuthService) {
  const router = Router();
  router.use(authenticateUser(authService));
  router.post('/process', createRateLimiter({ windowMs: 60_000, max: 12, key: (request) => request.authenticatedUserId ?? request.ip ?? 'unknown' }), async (request, response, next) => {
    try {
      const parsed = processSchema.safeParse(request.body);
      if (!parsed.success) throw new InputValidationError('Invalid writing mode request.');
      const { diaryEntryId, mode, instruction } = parsed.data;
      const content = parsed.data.text ?? parsed.data.content!;
      let processedContent = content;
      let processingNotes: string | null = null;
      if (mode === 'LIGHT_FIX' || mode === 'REVIEW') {
        if (!parsed.data.consentToGemini && !parsed.data.consent) throw new RequestValidationError('Consent is required before sending diary text to Gemini.');
        processedContent = await generateWritingSuggestion(mode, content, instruction);
        processingNotes = mode === 'LIGHT_FIX'
          ? 'Gemini light-fix suggestion. The original text is unchanged.'
          : 'Gemini review suggestion. Accepting is optional and the original text remains unchanged.';
      }

      // Unsaved diary drafts can be previewed without creating a database record.
      if (!diaryEntryId) {
        void createNotification({ userId: request.authenticatedUserId!, type: 'REVISION_READY', title: 'Revision preview is ready', body: 'Your requested writing mode finished processing. Review the result before saving it.', link: '/writing-modes' }).catch(() => undefined);
        response.json({ success: true, data: { text: processedContent, version: { writingMode: mode, sourceContent: content, processedContent, processingNotes }, persisted: false } });
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
  router.post('/entries/:id/revisions', async (request, response, next) => {
    try {
      const parsed = z.object({
        writingMode: z.enum(['VERBATIM', 'LIGHT_FIX', 'REVIEW']),
        sourceContent: z.string().min(1).max(10000),
        processedContent: z.string().min(1).max(10000),
        processingNotes: z.string().max(1000).nullable().optional(),
      }).safeParse(request.body);
      if (!parsed.success) throw new RequestValidationError('Invalid revision data.');
      const owner = await getOwnerForUser(request.authenticatedUserId!);
      const entry = await prisma.diaryEntry.findFirst({
        where: { id: request.params.id, ownerId: owner.id, status: { not: 'DELETED' } },
        include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
      });
      if (!entry) throw new RequestValidationError('Diary entry not found.');
      const version = await prisma.entryVersion.create({
        data: {
          diaryEntryId: entry.id,
          versionNumber: (entry.versions[0]?.versionNumber ?? 0) + 1,
          writingMode: parsed.data.writingMode,
          sourceContent: parsed.data.sourceContent,
          processedContent: parsed.data.processedContent,
          processingNotes: parsed.data.processingNotes ?? null,
        },
      });
      void createNotification({ userId: request.authenticatedUserId!, type: 'REVISION_READY', title: 'Revision saved', body: 'A new revision was saved. The original entry is unchanged.', link: '/writing-modes' }).catch(() => undefined);
      response.status(201).json({ success: true, data: { version } });
    } catch (error) { next(error); }
  });
  return router;
}
