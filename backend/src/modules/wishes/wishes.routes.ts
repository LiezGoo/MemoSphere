import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { RequestValidationError } from '../../exceptions/index.js';
import { authenticateUser } from '../../middleware/authenticateUser.js';
import { getOwnerForUser } from '../../utils/owner.js';
import type { AuthService } from '../auth/auth.types.js';

const wishesSchema = z.object({ title: z.string().trim().min(1).max(200), content: z.string().max(100000) });

export function createWishesRouter(authService: AuthService) {
  const router = Router();
  router.use(authenticateUser(authService));
  router.get('/', async (request, response, next) => { try { const owner = await getOwnerForUser(request.authenticatedUserId!); const wishes = await prisma.letterOfWishes.findUnique({ where: { ownerId: owner.id } }); response.json({ success: true, data: { wishes } }); } catch (error) { next(error); } });
  router.put('/', async (request, response, next) => { try { const parsed = wishesSchema.safeParse(request.body); if (!parsed.success) throw new RequestValidationError('Invalid Letter of Wishes data.'); const owner = await getOwnerForUser(request.authenticatedUserId!); const wishes = await prisma.letterOfWishes.upsert({ where: { ownerId: owner.id }, update: parsed.data, create: { ownerId: owner.id, ...parsed.data } }); response.json({ success: true, data: { wishes } }); } catch (error) { next(error); } });
  return router;
}