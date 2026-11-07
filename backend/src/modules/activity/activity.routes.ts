import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { RequestValidationError } from '../../exceptions/index.js';
import { authenticateUser } from '../../middleware/authenticateUser.js';
import { getOwnerForUser } from '../../utils/owner.js';
import type { AuthService } from '../auth/auth.types.js';

const querySchema = z.object({ page: z.coerce.number().int().positive().default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20), action: z.string().trim().max(100).optional() });

export function createActivityRouter(authService: AuthService) {
  const router = Router();
  router.use(authenticateUser(authService));
  router.get('/', async (request, response, next) => {
    try {
      const parsed = querySchema.safeParse(request.query);
      if (!parsed.success) throw new RequestValidationError('Invalid activity filters.');
      const owner = await getOwnerForUser(request.authenticatedUserId!);
      const where = { ownerId: owner.id, ...(parsed.data.action ? { action: parsed.data.action } : {}) };
      const [logs, total] = await Promise.all([prisma.accessAuditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (parsed.data.page - 1) * parsed.data.pageSize, take: parsed.data.pageSize }), prisma.accessAuditLog.count({ where })]);
      response.json({ success: true, data: { activities: logs, pagination: { page: parsed.data.page, pageSize: parsed.data.pageSize, total, totalPages: Math.ceil(total / parsed.data.pageSize) } } });
    } catch (error) { next(error); }
  });
  return router;
}