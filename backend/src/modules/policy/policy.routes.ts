import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { RequestValidationError, ServiceUnavailableError } from '../../exceptions/index.js';
import { authenticateUser } from '../../middleware/authenticateUser.js';
import { getOwnerForUser } from '../../utils/owner.js';
import type { AuthService } from '../auth/auth.types.js';

const policySchema = z.object({ beneficiaryId: z.string().min(1), name: z.string().trim().min(1).max(150), description: z.string().max(500).optional(), sourceCode: z.string().min(1).max(100000) });

export function createPolicyRouter(authService: AuthService) {
  const router = Router();
  router.use(authenticateUser(authService));
  router.get('/', async (request, response, next) => { try { const owner = await getOwnerForUser(request.authenticatedUserId!); const policies = await prisma.accessPolicy.findMany({ where: { ownerId: owner.id }, include: { beneficiary: { select: { id: true, fullName: true, email: true } }, versions: { orderBy: { versionNumber: 'desc' }, take: 1 } }, orderBy: { updatedAt: 'desc' } }); response.json({ success: true, data: { policies } }); } catch (error) { next(error); } });
  router.post('/validate', async (request, response, next) => { try { const sourceCode = z.object({ policy: z.string().min(1).max(100000) }).safeParse(request.body); if (!sourceCode.success) throw new RequestValidationError('Policy source is required.'); throw new ServiceUnavailableError('Policy validation is unavailable until the Legacy Policy Language parser and Prolog compiler are connected.'); } catch (error) { next(error); } });
  router.post('/', async (request, response, next) => { try { const parsed = policySchema.safeParse(request.body); if (!parsed.success) throw new RequestValidationError('Invalid policy data.'); const owner = await getOwnerForUser(request.authenticatedUserId!); const beneficiary = await prisma.beneficiary.findFirst({ where: { id: parsed.data.beneficiaryId, ownerId: owner.id } }); if (!beneficiary) throw new RequestValidationError('Beneficiary does not belong to this owner.'); const policy = await prisma.accessPolicy.create({ data: { ownerId: owner.id, ...parsed.data, status: 'DRAFT', versions: { create: { versionNumber: 1, sourceCode: parsed.data.sourceCode } } } }); response.status(201).json({ success: true, data: { policy } }); } catch (error) { next(error); } });
  return router;
}