import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { RequestValidationError } from '../../exceptions/index.js';
import { authenticateUser } from '../../middleware/authenticateUser.js';
import { getOwnerForUser } from '../../utils/owner.js';
import type { AuthService } from '../auth/auth.types.js';

const profileSchema = z.object({ fullName: z.string().trim().min(2).max(100) });

export function createSettingsRouter(authService: AuthService) {
  const router = Router();
  router.use(authenticateUser(authService));
  router.get('/profile', async (request, response, next) => {
    try { response.json({ success: true, data: { user: request.authenticatedUser, owner: await getOwnerForUser(request.authenticatedUserId!) } }); } catch (error) { next(error); }
  });
  router.patch('/profile', async (request, response, next) => {
    try {
      const parsed = profileSchema.safeParse(request.body);
      if (!parsed.success) throw new RequestValidationError('A valid full name is required.');
      const updated = await prisma.$transaction(async (transaction) => {
        const user = await transaction.user.update({ where: { id: request.authenticatedUserId! }, data: { fullName: parsed.data.fullName } });
        await transaction.owner.update({ where: { userId: user.id }, data: { displayName: parsed.data.fullName } });
        return user;
      });
      response.json({ success: true, data: { user: { id: updated.id, fullName: updated.fullName, email: updated.email, accountStatus: updated.accountStatus, createdAt: updated.createdAt } } });
    } catch (error) { next(error); }
  });
  return router;
}