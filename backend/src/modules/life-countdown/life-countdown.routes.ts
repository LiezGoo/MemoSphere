import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { RequestValidationError } from '../../exceptions/index.js';
import { authenticateUser } from '../../middleware/authenticateUser.js';
import { getOwnerForUser } from '../../utils/owner.js';
import type { AuthService } from '../auth/auth.types.js';
import { createNotification } from '../../utils/notifications.js';

const configurationSchema = z.object({
  durationDays: z.number().int().min(1).max(36500),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a valid start date.'),
}).superRefine(({ startDate }, context) => {
  const date = new Date(`${startDate}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== startDate) {
    context.addIssue({ code: 'custom', message: 'Choose a valid start date.' });
  }
});

function parseConfiguration(body: unknown) {
  const parsed = configurationSchema.safeParse(body);
  if (!parsed.success) throw new RequestValidationError(parsed.error.issues[0]?.message ?? 'Invalid countdown configuration.');
  const startDate = new Date(`${parsed.data.startDate}T00:00:00.000Z`);
  const expirationDate = new Date(startDate.getTime() + parsed.data.durationDays * 86400000);
  if (!Number.isFinite(expirationDate.getTime())) throw new RequestValidationError('The countdown date range is invalid.');
  return { ...parsed.data, startDate, expirationDate };
}

async function getCurrentCountdown(ownerId: string) {
  const countdown = await prisma.lifeCountdown.findFirst({ where: { ownerId }, orderBy: { createdAt: 'desc' } });
  if (countdown?.status === 'ACTIVE' && countdown.expirationDate.getTime() <= Date.now()) {
    return prisma.lifeCountdown.update({ where: { id: countdown.id }, data: { status: 'COMPLETED' } });
  }
  return countdown;
}

export function createLifeCountdownRouter(authService: AuthService) {
  const router = Router();
  router.use(authenticateUser(authService));

  router.get('/', async (request, response, next) => {
    try {
      const owner = await getOwnerForUser(request.authenticatedUserId!);
      const countdown = await getCurrentCountdown(owner.id);
      if (countdown?.status === 'ACTIVE') {
        const daysRemaining = Math.ceil((countdown.expirationDate.getTime() - Date.now()) / 86400000);
        if ([30, 7, 1].includes(daysRemaining)) {
          const day = daysRemaining;
          void createNotification({ userId: request.authenticatedUserId!, type: 'COUNTDOWN', title: 'A moment to reflect', body: `Your personal countdown reaches its configured date in ${day} ${day === 1 ? 'day' : 'days'}. This is only the date you chose for reflection.`, link: '/dashboard', dedupeKey: `countdown:${countdown.id}:milestone:${day}` }).catch(() => undefined);
        }
      }
      response.json({ success: true, data: { countdown, serverNow: new Date().toISOString() } });
    } catch (error) { next(error); }
  });

  const configure = (createNew: boolean): RequestHandler => async (request, response, next) => {
    try {
      const configuration = parseConfiguration(request.body);
      const owner = await getOwnerForUser(request.authenticatedUserId!);
      let countdown;
      if (!createNew) {
        const current = await getCurrentCountdown(owner.id);
        countdown = current
          ? await prisma.lifeCountdown.update({ where: { id: current.id }, data: configuration })
          : await prisma.lifeCountdown.create({ data: { ownerId: owner.id, ...configuration } });
      } else {
        countdown = await prisma.lifeCountdown.create({ data: { ownerId: owner.id, ...configuration } });
      }
      void createNotification({ userId: request.authenticatedUserId!, type: 'COUNTDOWN', title: 'Countdown configured', body: 'Your personal reflection countdown has been configured with the dates you selected.', link: '/dashboard' }).catch(() => undefined);
      response.status(createNew ? 201 : 200).json({ success: true, data: { countdown, serverNow: new Date().toISOString() } });
    } catch (error) { next(error); }
  };

  router.post('/', configure(true));
  router.patch('/', configure(false));
  router.post('/reset', configure(true));
  return router;
}
