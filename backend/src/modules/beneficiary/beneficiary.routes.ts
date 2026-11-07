import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { RequestValidationError } from '../../exceptions/index.js';
import { authenticateUser } from '../../middleware/authenticateUser.js';
import { recordAudit } from '../../utils/audit.js';
import { getOwnerForUser } from '../../utils/owner.js';
import type { AuthService } from '../auth/auth.types.js';

const beneficiarySchema = z.object({ fullName: z.string().trim().min(2).max(100), email: z.string().email().max(255), relationship: z.string().trim().min(1).max(80) });

export function createBeneficiaryRouter(authService: AuthService) {
  const router = Router();
  router.use(authenticateUser(authService));
  router.get('/', async (request, response, next) => {
    try { const owner = await getOwnerForUser(request.authenticatedUserId!); const records = await prisma.beneficiary.findMany({ where: { ownerId: owner.id, status: { not: 'REMOVED' } }, include: { policies: { select: { id: true, name: true, status: true } } }, orderBy: { createdAt: 'desc' } }); response.json({ success: true, data: { beneficiaries: records } }); } catch (error) { next(error); }
  });
  router.post('/', async (request, response, next) => {
    try { const parsed = beneficiarySchema.safeParse(request.body); if (!parsed.success) throw new RequestValidationError('Invalid beneficiary data.'); const owner = await getOwnerForUser(request.authenticatedUserId!); const record = await prisma.beneficiary.create({ data: { ownerId: owner.id, ...parsed.data, status: 'INVITED' } }); await recordAudit({ ownerId: owner.id, actorUserId: request.authenticatedUserId, action: 'BENEFICIARY_CREATED', resourceType: 'BENEFICIARY', resourceId: record.id, result: 'ALLOWED' }); response.status(201).json({ success: true, data: { beneficiary: record } }); } catch (error) { next(error); }
  });
  router.patch('/:id', async (request, response, next) => {
    try { const parsed = beneficiarySchema.partial().safeParse(request.body); if (!parsed.success) throw new RequestValidationError('Invalid beneficiary data.'); const owner = await getOwnerForUser(request.authenticatedUserId!); const record = await prisma.beneficiary.update({ where: { id: request.params.id, ownerId: owner.id }, data: parsed.data }); response.json({ success: true, data: { beneficiary: record } }); } catch (error) { next(error); }
  });
  router.delete('/:id', async (request, response, next) => {
    try { const owner = await getOwnerForUser(request.authenticatedUserId!); await prisma.beneficiary.update({ where: { id: request.params.id, ownerId: owner.id }, data: { status: 'REMOVED' } }); await recordAudit({ ownerId: owner.id, actorUserId: request.authenticatedUserId, action: 'BENEFICIARY_REMOVED', resourceType: 'BENEFICIARY', resourceId: request.params.id, result: 'ALLOWED' }); response.status(204).send(); } catch (error) { next(error); }
  });
  return router;
}