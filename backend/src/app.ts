import express from 'express';
import cors from 'cors';
import { resolve } from 'node:path';
import { environment } from './config/environment.js';
import { prisma } from './config/prisma.js';
import { createAuthRepository } from './modules/auth/auth.repository.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import { createAuthService } from './modules/auth/auth.service.js';
import { createFaceRouter } from './modules/auth/face.routes.js';
import { createDiaryRouter } from './modules/diary/diary.routes.js';
import { createPhotoRouter } from './modules/diary/photo.routes.js';
import { createTranscriptionRouter } from './modules/transcription/transcription.routes.js';
import { createLifeCountdownRouter } from './modules/life-countdown/life-countdown.routes.js';
import { createNotificationsRouter } from './modules/notifications/notifications.routes.js';
import { createProfileRouter } from './modules/profile/profile.routes.js';
import { createDashboardRouter } from './modules/dashboard/dashboard.routes.js';
import { createActivityRouter } from './modules/activity/activity.routes.js';
import { createSettingsRouter } from './modules/settings/settings.routes.js';
import { createBeneficiaryRouter } from './modules/beneficiary/beneficiary.routes.js';
import { createPolicyRouter } from './modules/policy/policy.routes.js';
import { createLegacyRouter } from './modules/legacy/legacy.routes.js';
import { createBeneficiaryPortalRouter } from './modules/legacy/beneficiary-portal.routes.js';
import { createWishesRouter } from './modules/wishes/wishes.routes.js';
import { createWritingRouter } from './modules/writing/writing.routes.js';
import { createAIRouter } from './modules/ai/ai.routes.js';
import { createFilesRouter } from './modules/files/files.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { assignRequestId } from './middleware/requestId.js';
import { runLegacyJob, verifyCronSecret } from './modules/legacy/legacy-jobs.js';

export function createApp(authService = createAuthService(createAuthRepository(prisma))) {
  const application = express();

  application.disable('x-powered-by');
  application.use(assignRequestId);
  const allowedOrigins = new Set([
    environment.FRONTEND_URL,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    ...(environment.NODE_ENV !== 'production' ? ['http://localhost:3001', 'http://127.0.0.1:3001'] : []),
  ]);
  application.use(cors({ origin: (origin, callback) => {
    callback(null, !origin || allowedOrigins.has(origin));
  }, credentials: true }));
  application.use('/uploads', express.static(resolve(process.cwd(), 'public', 'uploads'), { index: false }));
  application.use(express.json({ limit: '100kb' }));
  application.get('/health', (_request, response) => {
    response.json({ status: 'ok' });
  });
  application.use('/api/auth', createAuthRouter(authService));
  application.use('/api/auth/face', createFaceRouter(authService));
  const transcriptionRouter = createTranscriptionRouter(authService);
  application.use('/api/transcribe', transcriptionRouter);
  application.use('/api/diary/transcribe', transcriptionRouter);
  application.use('/api/life-countdown', createLifeCountdownRouter(authService));
  application.use('/api/notifications', createNotificationsRouter(authService));
  application.use('/api/profile', createProfileRouter(authService));
  application.use('/api/diary', createDiaryRouter(authService));
  application.use('/api/diary', createPhotoRouter(authService));
  application.use('/api/dashboard', createDashboardRouter(authService));
  application.use('/api/activity-logs', createActivityRouter(authService));
  application.use('/api/settings', createSettingsRouter(authService));
  application.use('/api/beneficiaries', createBeneficiaryRouter(authService));
  application.use('/api/policies', createPolicyRouter(authService));
  application.use('/api/beneficiary-portal', createBeneficiaryPortalRouter(authService));
  application.use('/api/legacy', createLegacyRouter(authService));
  application.use('/api/letter-of-wishes', createWishesRouter(authService));
  application.use('/api/diary/writing-modes', createWritingRouter(authService));
  application.use('/api/ai', createAIRouter(authService));
  application.use('/api/files', createFilesRouter(authService));
  application.post('/api/internal/jobs/run', async (request, response) => {
    if (!verifyCronSecret(request.get('x-cron-secret'))) {
      response.status(401).json({ success: false, error: { message: 'Unauthorized.' } });
      return;
    }
    const result = await runLegacyJob();
    response.json({ success: true, data: result });
  });
  application.use(errorHandler);
  return application;
}

export const app = createApp();
