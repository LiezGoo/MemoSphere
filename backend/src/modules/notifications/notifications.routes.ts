import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { InputValidationError, ResourceNotFound } from '../../exceptions/index.js';
import { authenticateUser } from '../../middleware/authenticateUser.js';
import { verifySameOrigin } from '../../middleware/csrfOrigin.js';
import { createRateLimiter } from '../../middleware/rateLimiter.js';
import { ensureDailyReminder } from '../../utils/notifications.js';
import type { AuthService } from '../auth/auth.types.js';

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().min(1).max(191).optional(),
  unread: z.enum(['true', 'false']).optional(),
}).strict();
const writeLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 60 });

export function createNotificationsRouter(authService: AuthService) {
  const router = Router();
  router.use(authenticateUser(authService));

  router.get('/unread-count', async (request, response, next) => {
    try {
      const userId = request.authenticatedUserId!;
      await ensureDailyReminder(userId);
      const count = await prisma.notification.count({ where: { userId, isRead: false } });
      response.json({ success: true, data: { count } });
    } catch (error) { next(error); }
  });

  router.get('/', async (request, response, next) => {
    try {
      const parsed = querySchema.safeParse(request.query);
      if (!parsed.success) throw new InputValidationError(parsed.error.issues[0]?.message ?? 'Invalid notification filters.');
      const userId = request.authenticatedUserId!;
      await ensureDailyReminder(userId);
      const { limit, cursor, unread } = parsed.data;
      const items = await prisma.notification.findMany({
        where: { userId, ...(unread === 'true' ? { isRead: false } : unread === 'false' ? { isRead: true } : {}) },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: { id: true, type: true, title: true, body: true, link: true, isRead: true, readAt: true, createdAt: true },
      });
      const hasMore = items.length > limit;
      const notifications = items.slice(0, limit);
      response.json({ success: true, data: { notifications, nextCursor: hasMore ? notifications[notifications.length - 1]?.id ?? null : null } });
    } catch (error) { next(error); }
  });

  const markRead: RequestHandler = async (request, response, next) => {
    try {
      const id = request.params.id;
      if (typeof id !== 'string' || !id || id.length > 191) throw new InputValidationError('Invalid notification ID.');
      const result = await prisma.notification.updateMany({ where: { id, userId: request.authenticatedUserId! }, data: { isRead: true, readAt: new Date() } });
      if (!result.count) throw new ResourceNotFound('Notification not found.');
      const notification = await prisma.notification.findFirst({ where: { id, userId: request.authenticatedUserId! }, select: { id: true, type: true, title: true, body: true, link: true, isRead: true, readAt: true, createdAt: true } });
      response.json({ success: true, data: { notification } });
    } catch (error) { next(error); }
  };
  router.patch('/:id/read', verifySameOrigin, writeLimit, markRead);

  router.post('/read-all', verifySameOrigin, writeLimit, async (request, response, next) => {
    try {
      const result = await prisma.notification.updateMany({ where: { userId: request.authenticatedUserId!, isRead: false }, data: { isRead: true, readAt: new Date() } });
      response.json({ success: true, data: { updated: result.count } });
    } catch (error) { next(error); }
  });

  router.delete('/:id', verifySameOrigin, writeLimit, async (request, response, next) => {
    try {
      const id = request.params.id;
      if (typeof id !== 'string' || !id || id.length > 191) throw new InputValidationError('Invalid notification ID.');
      const result = await prisma.notification.deleteMany({ where: { id, userId: request.authenticatedUserId! } });
      if (!result.count) throw new ResourceNotFound('Notification not found.');
      response.status(204).send();
    } catch (error) { next(error); }
  });
  return router;
}
