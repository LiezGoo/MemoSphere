import express from 'express';
import cors from 'cors';
import { environment } from './config/environment.js';
import { prisma } from './config/prisma.js';
import { createAuthRepository } from './modules/auth/auth.repository.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import { createAuthService } from './modules/auth/auth.service.js';
import { createDiaryRouter } from './modules/diary/diary.routes.js';
import { createDashboardRouter } from './modules/dashboard/dashboard.routes.js';
import { createActivityRouter } from './modules/activity/activity.routes.js';
import { createSettingsRouter } from './modules/settings/settings.routes.js';
import { createBeneficiaryRouter } from './modules/beneficiary/beneficiary.routes.js';
import { createPolicyRouter } from './modules/policy/policy.routes.js';
import { createWishesRouter } from './modules/wishes/wishes.routes.js';
import { createWritingRouter } from './modules/writing/writing.routes.js';
import { createAIRouter } from './modules/ai/ai.routes.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp(authService = createAuthService(createAuthRepository(prisma))) {
  const application = express();

  application.disable('x-powered-by');
  application.use(cors({ origin: environment.FRONTEND_URL, credentials: true }));
  application.use(express.json({ limit: '100kb' }));
  application.get('/health', (_request, response) => {
    response.json({ status: 'ok' });
  });
  application.use('/api/auth', createAuthRouter(authService));
  application.use('/api/diary', createDiaryRouter(authService));
  application.use('/api/dashboard', createDashboardRouter(authService));
  application.use('/api/activity-logs', createActivityRouter(authService));
  application.use('/api/settings', createSettingsRouter(authService));
  application.use('/api/beneficiaries', createBeneficiaryRouter(authService));
  application.use('/api/policies', createPolicyRouter(authService));
  application.use('/api/letter-of-wishes', createWishesRouter(authService));
  application.use('/api/diary/writing-modes', createWritingRouter(authService));
  application.use('/api/ai', createAIRouter(authService));
  application.use(errorHandler);
  return application;
}

export const app = createApp();