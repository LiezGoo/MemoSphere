import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { RequestValidationError } from '../../exceptions/index.js';
import { authenticateUser } from '../../middleware/authenticateUser.js';
import { getOwnerForUser } from '../../utils/owner.js';
import type { AuthService } from '../auth/auth.types.js';

const questionSchema = z.object({ conversationId: z.string().optional(), question: z.string().trim().min(1).max(4000) });

export function createAIRouter(authService: AuthService) {
  const router = Router();
  router.use(authenticateUser(authService));
  router.post('/conversations/messages', async (request, response, next) => {
    try {
      const parsed = questionSchema.safeParse(request.body);
      if (!parsed.success) throw new RequestValidationError('A question is required.');
      const owner = await getOwnerForUser(request.authenticatedUserId!);
      const conversation = parsed.data.conversationId ? await prisma.aIConversation.findFirst({ where: { id: parsed.data.conversationId, ownerId: owner.id } }) : await prisma.aIConversation.create({ data: { ownerId: owner.id, title: parsed.data.question.slice(0, 100) } });
      if (!conversation) throw new RequestValidationError('Conversation not found.');
      await prisma.aIMessage.create({ data: { conversationId: conversation.id, role: 'USER', content: parsed.data.question } });
      const answer = 'I could not find enough authorized information in the available diary entries to answer that question.';
      const assistantMessage = await prisma.aIMessage.create({ data: { conversationId: conversation.id, role: 'ASSISTANT', content: answer } });
      response.json({ success: true, data: { conversationId: conversation.id, message: { id: assistantMessage.id, role: assistantMessage.role, content: assistantMessage.content, citations: [] } } });
    } catch (error) { next(error); }
  });
  return router;
}