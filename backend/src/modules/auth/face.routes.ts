import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { environment } from '../../config/environment.js';
import { prisma } from '../../config/prisma.js';
import { InputValidationError, UnauthorizedError } from '../../exceptions/index.js';
import { authenticateUser } from '../../middleware/authenticateUser.js';
import { verifySameOrigin } from '../../middleware/csrfOrigin.js';
import { createRateLimiter } from '../../middleware/rateLimiter.js';
import { createSessionToken, hashSessionToken, sessionDurationMs, setSessionCookie } from '../../utils/cookies.js';
import { createNotification } from '../../utils/notifications.js';
import { verifyPassword } from '../../utils/password.js';
import type { AuthService } from './auth.types.js';
import { decryptDescriptor, descriptorsMatch, encryptDescriptor, hashFaceNonce, hashIp, safeEqualNonceHash } from './face.crypto.js';

const descriptorSchema = z.array(z.number().finite()).length(128);
const challengeSchema = z.object({ email: z.string().email().max(255) });
const verifySchema = z.object({ challengeId: z.string().cuid(), nonce: z.string().min(20).max(200), descriptor: descriptorSchema });
const enrollmentSchema = z.object({ password: z.string().min(1).max(128), descriptor: descriptorSchema });
const challengeLifetimeMs = 2 * 60 * 1000;
const failureLimit = 5;
const failures = new Map<string, { count: number; resetAt: number }>();

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new InputValidationError(parsed.error.issues[0]?.message ?? 'Invalid face login data.');
  return parsed.data;
}

function failureKey(userId: string | null, ip: string): string {
  return `${userId ?? 'unknown'}:${hashIp(ip)}`;
}

function isLocked(key: string): boolean {
  const record = failures.get(key);
  if (!record || record.resetAt <= Date.now()) {
    failures.delete(key);
    return false;
  }
  return record.count >= failureLimit;
}

function recordFailure(key: string): void {
  const current = failures.get(key);
  const record = !current || current.resetAt <= Date.now() ? { count: 0, resetAt: Date.now() + 15 * 60 * 1000 } : current;
  record.count += 1;
  failures.set(key, record);
}

async function audit(userId: string | null, action: string, result: string, ip: string): Promise<void> {
  await prisma.faceAuditEvent.create({ data: { userId, action, result, ipHash: hashIp(ip) } });
}

export function createFaceRouter(authService: AuthService): Router {
  const router = Router();
  const publicLimit = createRateLimiter({ windowMs: 60 * 1000, max: environment.NODE_ENV === 'test' ? 1000 : 10 });
  const protectedLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10, key: (request) => request.authenticatedUserId ?? request.ip ?? 'unknown' });

  router.post('/challenge', verifySameOrigin, publicLimit, async (request, response, next) => {
    try {
      if (!environment.FACE_TEMPLATE_KEY) throw new Error('FACE_TEMPLATE_KEY is required for face login.');
      const { email } = parse(challengeSchema, request.body);
      const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() }, select: { id: true, faceEnabled: true } });
      const nonce = randomBytes(32).toString('base64url');
      const expiresAt = new Date(Date.now() + challengeLifetimeMs);
      const challenge = await prisma.faceChallenge.create({ data: { userId: user?.faceEnabled ? user.id : null, nonceHash: hashFaceNonce(nonce), expiresAt } });
      response.json({ success: true, data: { challengeId: challenge.id, nonce, expiresAt: expiresAt.toISOString() } });
    } catch (error) { next(error); }
  });

  router.post('/verify', verifySameOrigin, publicLimit, async (request, response, next) => {
    try {
      const { challengeId, nonce, descriptor } = parse(verifySchema, request.body);
      const challenge = await prisma.faceChallenge.findUnique({ where: { id: challengeId }, include: { user: { include: { faceTemplates: true } } } });
      const key = failureKey(challenge?.userId ?? null, request.ip ?? 'unknown');
      if (!challenge || challenge.usedAt || challenge.expiresAt <= new Date() || !safeEqualNonceHash(challenge.nonceHash, hashFaceNonce(nonce)) || isLocked(key) || !challenge.user?.faceEnabled) {
        if (challenge && !isLocked(key)) recordFailure(key);
        if (challenge) await audit(challenge.userId, 'LOGIN', 'FAILED', request.ip ?? 'unknown');
        throw new UnauthorizedError('Face sign-in could not be verified.');
      }
      const matched = challenge.user.faceTemplates.some((template) => descriptorsMatch(descriptor, decryptDescriptor(template.encryptedVector)));
      await prisma.faceChallenge.update({ where: { id: challenge.id }, data: { usedAt: new Date() } });
      if (!matched) {
        recordFailure(key);
        await audit(challenge.userId, 'LOGIN', 'FAILED', request.ip ?? 'unknown');
        throw new UnauthorizedError('Face sign-in could not be verified.');
      }
      failures.delete(key);
      const sessionToken = createSessionToken();
      const expiresAt = new Date(Date.now() + sessionDurationMs);
      await prisma.authSession.create({ data: { userId: challenge.user.id, tokenHash: hashSessionToken(sessionToken), expiresAt } });
      await audit(challenge.user.id, 'LOGIN', 'SUCCESS', request.ip ?? 'unknown');
      void createNotification({ userId: challenge.user.id, type: 'SECURITY', title: 'New face sign-in to MemoSphere', body: 'Your account was just accessed with face sign-in.' });
      setSessionCookie(response, sessionToken, expiresAt);
      response.json({ success: true, data: { user: { id: challenge.user.id, fullName: challenge.user.fullName, email: challenge.user.email, accountStatus: challenge.user.accountStatus, createdAt: challenge.user.createdAt } } });
    } catch (error) { next(error); }
  });

  router.use(authenticateUser(authService));

  router.get('/status', async (request, response, next) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: request.authenticatedUserId! }, select: { faceEnabled: true, faceConsentAt: true } });
      response.json({ success: true, data: { enabled: user?.faceEnabled ?? false, consentAt: user?.faceConsentAt?.toISOString() ?? null } });
    } catch (error) { next(error); }
  });

  router.post('/enroll', verifySameOrigin, protectedLimit, async (request, response, next) => {
    try {
      if (!environment.FACE_TEMPLATE_KEY) throw new Error('FACE_TEMPLATE_KEY is required for face login.');
      const { password, descriptor } = parse(enrollmentSchema, request.body);
      const user = await prisma.user.findUnique({ where: { id: request.authenticatedUserId! }, select: { passwordHash: true } });
      if (!user || !(await verifyPassword(password, user.passwordHash))) throw new UnauthorizedError('Current password is incorrect.');
      await prisma.$transaction([
        prisma.faceTemplate.deleteMany({ where: { userId: request.authenticatedUserId! } }),
        prisma.faceTemplate.create({ data: { userId: request.authenticatedUserId!, encryptedVector: encryptDescriptor(descriptor) } }),
        prisma.user.update({ where: { id: request.authenticatedUserId! }, data: { faceEnabled: true, faceConsentAt: new Date() } }),
        prisma.faceAuditEvent.create({ data: { userId: request.authenticatedUserId!, action: 'ENROLL', result: 'SUCCESS', ipHash: hashIp(request.ip ?? 'unknown') } }),
      ]);
      response.json({ success: true, data: { enabled: true } });
    } catch (error) { next(error); }
  });

  router.delete('/enroll', verifySameOrigin, protectedLimit, async (request, response, next) => {
    try {
      const { password } = parse(z.object({ password: z.string().min(1).max(128) }), request.body);
      const user = await prisma.user.findUnique({ where: { id: request.authenticatedUserId! }, select: { passwordHash: true } });
      if (!user || !(await verifyPassword(password, user.passwordHash))) throw new UnauthorizedError('Current password is incorrect.');
      await prisma.$transaction([
        prisma.faceTemplate.deleteMany({ where: { userId: request.authenticatedUserId! } }),
        prisma.user.update({ where: { id: request.authenticatedUserId! }, data: { faceEnabled: false, faceConsentAt: null } }),
        prisma.faceAuditEvent.create({ data: { userId: request.authenticatedUserId!, action: 'REMOVE', result: 'SUCCESS', ipHash: hashIp(request.ip ?? 'unknown') } }),
      ]);
      response.json({ success: true, data: { enabled: false } });
    } catch (error) { next(error); }
  });

  return router;
}
