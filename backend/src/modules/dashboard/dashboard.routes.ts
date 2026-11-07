import { Router } from 'express';
import { prisma } from '../../config/prisma.js';
import { authenticateUser } from '../../middleware/authenticateUser.js';
import { getOwnerForUser } from '../../utils/owner.js';
import type { AuthService } from '../auth/auth.types.js';
import type { DashboardApiResponse, DashboardResponse } from './dashboard.types.js';

export function createDashboardRouter(authService: AuthService) {
  const router = Router();
  router.use(authenticateUser(authService));
  router.get('/', async (request, response, next) => {
    try {
      const owner = await getOwnerForUser(request.authenticatedUserId!);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const [entryCount, beneficiaryCount, activePolicyCount, recentActivityCount, recentEntries, recentActivities] = await Promise.all([
        prisma.diaryEntry.count({ where: { ownerId: owner.id, status: { not: 'DELETED' } } }),
        prisma.beneficiary.count({ where: { ownerId: owner.id, status: { not: 'REMOVED' } } }),
        prisma.accessPolicy.count({ where: { ownerId: owner.id, status: 'ACTIVE' } }),
        prisma.accessAuditLog.count({ where: { ownerId: owner.id, createdAt: { gte: thirtyDaysAgo } } }),
        prisma.diaryEntry.findMany({ where: { ownerId: owner.id, status: { not: 'DELETED' } }, orderBy: { entryDate: 'desc' }, take: 3, select: { id: true, title: true, category: true, entryDate: true, status: true, originalContent: true, normalizedContent: true, _count: { select: { media: true } } } }),
        prisma.accessAuditLog.findMany({ where: { ownerId: owner.id }, orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, action: true, resourceType: true, resourceId: true, result: true, createdAt: true } }),
      ]);
      const data: DashboardResponse = {
        stats: { entryCount, beneficiaryCount, activePolicyCount, recentActivityCount },
        recentEntries: recentEntries.map((entry) => {
          const content = entry.normalizedContent ?? entry.originalContent;
          return {
            id: entry.id,
            title: entry.title,
            category: entry.category,
            originalContent: entry.originalContent,
            content,
            preview: content.slice(0, 180),
            entryDate: entry.entryDate,
            status: entry.status,
            access: 'Private',
            mediaCount: entry._count.media,
          };
        }),
        recentActivities,
      };
      const responseBody: DashboardApiResponse = { success: true, data };
      response.json(responseBody);
    } catch (error) { next(error); }
  });
  return router;
}