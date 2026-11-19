import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { RequestValidationError } from '../../exceptions/index.js';
import { authenticateUser } from '../../middleware/authenticateUser.js';
import { getOwnerForUser } from '../../utils/owner.js';
import type { AuthService } from '../auth/auth.types.js';
import { createRateLimiter } from '../../middleware/rateLimiter.js';
import { generateChatResponse } from './gemini.service.js';

const questionSchema = z.object({ conversationId: z.string().optional(), question: z.string().trim().min(1).max(4000) });
const createConversationSchema = z.object({ mode: z.enum(['AI_BUDDY', 'DIARY_ASSISTANT']), title: z.string().trim().min(1).max(200).optional() });
const sendMessageSchema = z.object({ question: z.string().trim().min(1).max(4000) });
const idSchema = z.string().min(1).max(191);

export function createAIRouter(authService: AuthService) {
  const router = Router();
  router.use(authenticateUser(authService));

  router.post('/conversations', async (request, response, next) => {
    try {
      const parsed = createConversationSchema.safeParse(request.body);
      if (!parsed.success) throw new RequestValidationError('Choose a valid chatbot mode.');
      const owner = await getOwnerForUser(request.authenticatedUserId!);
      const conversation = await prisma.aIConversation.create({
        data: { ownerId: owner.id, mode: parsed.data.mode, title: parsed.data.title ?? (parsed.data.mode === 'AI_BUDDY' ? 'AI Buddy conversation' : 'Diary Assistant conversation') },
      });
      response.status(201).json({ success: true, data: { conversation } });
    } catch (error) { next(error); }
  });

  router.get('/conversations', async (request, response, next) => {
    try {
      const mode = typeof request.query.mode === 'string' && ['AI_BUDDY', 'DIARY_ASSISTANT'].includes(request.query.mode)
        ? request.query.mode as 'AI_BUDDY' | 'DIARY_ASSISTANT'
        : undefined;
      const owner = await getOwnerForUser(request.authenticatedUserId!);
      const conversations = await prisma.aIConversation.findMany({
        where: { ownerId: owner.id, ...(mode ? { mode } : {}) },
        orderBy: { updatedAt: 'desc' },
        take: 50,
        include: { messages: { orderBy: { createdAt: 'asc' }, take: 1 } },
      });
      response.json({ success: true, data: { conversations } });
    } catch (error) { next(error); }
  });

  router.get('/conversations/:id', async (request, response, next) => {
    try {
      const id = idSchema.safeParse(request.params.id);
      if (!id.success) throw new RequestValidationError('Conversation not found.');
      const owner = await getOwnerForUser(request.authenticatedUserId!);
      const conversation = await prisma.aIConversation.findFirst({
        where: { id: id.data, ownerId: owner.id },
        include: { messages: { orderBy: { createdAt: 'asc' }, include: { sources: true } } },
      });
      if (!conversation) throw new RequestValidationError('Conversation not found.');
      response.json({ success: true, data: { conversation } });
    } catch (error) { next(error); }
  });

  router.delete('/conversations/:id', async (request, response, next) => {
    try {
      const id = idSchema.safeParse(request.params.id);
      if (!id.success) throw new RequestValidationError('Conversation not found.');
      const owner = await getOwnerForUser(request.authenticatedUserId!);
      const conversation = await prisma.aIConversation.findFirst({ where: { id: id.data, ownerId: owner.id }, select: { id: true } });
      if (!conversation) throw new RequestValidationError('Conversation not found.');
      await prisma.aIConversation.delete({ where: { id: conversation.id } });
      response.status(204).send();
    } catch (error) { next(error); }
  });

  router.post('/conversations/:id/messages', createRateLimiter({ windowMs: 60_000, max: 20 }), async (request, response, next) => {
    try {
      const id = idSchema.safeParse(request.params.id);
      if (!id.success) throw new RequestValidationError('Conversation not found.');
      const parsed = sendMessageSchema.safeParse(request.body);
      if (!parsed.success) throw new RequestValidationError('A question is required.');
      const owner = await getOwnerForUser(request.authenticatedUserId!);
      const conversation = await prisma.aIConversation.findFirst({
        where: { id: id.data, ownerId: owner.id },
        include: { messages: { orderBy: { createdAt: 'asc' }, take: 20 } },
      });
      if (!conversation) throw new RequestValidationError('Conversation not found.');

      await prisma.aIMessage.create({ data: { conversationId: conversation.id, role: 'USER', content: parsed.data.question } });
      const recent = [
        ...conversation.messages.filter((message) => message.role === 'USER' || message.role === 'ASSISTANT'),
        { role: 'USER' as const, content: parsed.data.question },
      ];
      let diaryContext = '';
      let citations: Array<{ id: string; title: string; entryDate: string }> = [];

      if (conversation.mode === 'DIARY_ASSISTANT') {
        const terms = parsed.data.question.toLowerCase().split(/\W+/).filter((term) => term.length >= 4).slice(0, 6);
        const entries = await prisma.diaryEntry.findMany({
          where: {
            ownerId: owner.id,
            status: { not: 'DELETED' },
            ...(terms.length ? { OR: terms.flatMap((term) => [{ title: { contains: term } }, { originalContent: { contains: term } }, { normalizedContent: { contains: term } }]) } : {}),
          },
          orderBy: { entryDate: 'desc' },
          take: 8,
          select: { id: true, title: true, entryDate: true, originalContent: true, normalizedContent: true },
        });
        diaryContext = entries.map((entry) => `[ENTRY_ID:${entry.id}] ${entry.title}\nDate: ${entry.entryDate.toISOString()}\n${entry.normalizedContent ?? entry.originalContent}`).join('\n\n');
        citations = entries.slice(0, 3).map((entry) => ({ id: entry.id, title: entry.title, entryDate: entry.entryDate.toISOString() }));
      }

      const answer = await generateChatResponse(conversation.mode, recent.map((message) => ({ role: message.role as 'USER' | 'ASSISTANT', content: message.content })), diaryContext);
      const assistantMessage = await prisma.aIMessage.create({
        data: {
          conversationId: conversation.id,
          role: 'ASSISTANT',
          content: answer,
          ...(citations.length ? { sources: { create: citations.map((citation) => ({ diaryEntryId: citation.id })) } } : {}),
        },
      });
      await prisma.aIConversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });
      response.json({ success: true, data: { conversationId: conversation.id, message: { id: assistantMessage.id, role: 'ASSISTANT', content: answer, citations } } });
    } catch (error) { next(error); }
  });

  router.post('/conversations/messages', createRateLimiter({ windowMs: 60_000, max: 20 }), async (request, response, next) => {
    try {
      const parsed = questionSchema.safeParse(request.body);
      if (!parsed.success) throw new RequestValidationError('A question is required.');
      const owner = await getOwnerForUser(request.authenticatedUserId!);
      const conversation = parsed.data.conversationId
        ? await prisma.aIConversation.findFirst({ where: { id: parsed.data.conversationId, ownerId: owner.id }, include: { messages: { orderBy: { createdAt: 'asc' }, take: 20 } } })
        : await prisma.aIConversation.create({ data: { ownerId: owner.id, mode: 'AI_BUDDY', title: parsed.data.question.slice(0, 100) } });
      if (!conversation) throw new RequestValidationError('Conversation not found.');
      await prisma.aIMessage.create({ data: { conversationId: conversation.id, role: 'USER', content: parsed.data.question } });
      const existing: Array<{ role: 'USER' | 'ASSISTANT'; content: string }> =
        'messages' in conversation && Array.isArray(conversation.messages)
          ? conversation.messages
              .filter((message) => message.role === 'USER' || message.role === 'ASSISTANT')
              .map((message) => ({ role: message.role as 'USER' | 'ASSISTANT', content: message.content }))
          : [];
      const answer = await generateChatResponse(conversation.mode, [...existing, { role: 'USER' as const, content: parsed.data.question }]);
      const assistantMessage = await prisma.aIMessage.create({ data: { conversationId: conversation.id, role: 'ASSISTANT', content: answer } });
      await prisma.aIConversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });
      response.json({ success: true, data: { conversationId: conversation.id, message: { id: assistantMessage.id, role: assistantMessage.role, content: assistantMessage.content, citations: [] } } });
    } catch (error) { next(error); }
  });
  return router;
}