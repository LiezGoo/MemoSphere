import { createHash } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { ConflictError, InputValidationError, ResourceNotFound } from '../../exceptions/index.js';
import { authenticateUser } from '../../middleware/authenticateUser.js';
import { verifySameOrigin } from '../../middleware/csrfOrigin.js';
import { createRateLimiter } from '../../middleware/rateLimiter.js';
import { setSessionCookie } from '../../utils/cookies.js';
import type { AuthService, SafeUser } from '../auth/auth.types.js';
import { generateChatResponse } from '../ai/gemini.service.js';
import { legacyEntryScopeWhere, policyIsReleased } from './legacy-access.js';
import { signedCloudinaryUrl } from '../diary/cloudinary.js';

const tokenSchema = z.string().trim().min(20).max(200);
const registerSchema = z.object({ token: tokenSchema, password: z.string().min(8).max(128).regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/), confirmPassword: z.string() }).strict().refine((value) => value.password === value.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match.' });
const acceptSchema = z.object({ token: tokenSchema }).strict();
const querySchema = z.object({ from: z.coerce.date().optional(), to: z.coerce.date().optional(), category: z.string().trim().min(1).max(80).optional() }).strict().refine((value) => !value.from || !value.to || value.from <= value.to, { message: 'The start date must be before the end date.' });
const portalWriteLimit = createRateLimiter({ windowMs: 60_000, max: 10, key: (request) => request.authenticatedUserId ?? request.ip ?? 'unknown' });
const inviteReadLimit = createRateLimiter({ windowMs: 60_000, max: 20, key: (request) => request.ip ?? 'unknown' });
const assistantLimit = createRateLimiter({ windowMs: 60_000, max: 10, key: (request) => request.authenticatedUserId ?? request.ip ?? 'unknown' });
const hash = (value: string) => createHash('sha256').update(value).digest('hex');

async function findInvitation(rawToken: string, now = new Date()) {
  return prisma.beneficiary.findFirst({
    where: { invitationTokenHash: hash(rawToken), invitationUsedAt: null, invitationExpiresAt: { gt: now }, status: 'INVITED' },
    include: { owner: { select: { userId: true, displayName: true } } },
  });
}

async function acceptInvitation(user: SafeUser, rawToken: string) {
  const now = new Date();
  const invitation = await findInvitation(rawToken, now);
  if (!invitation || invitation.owner.userId === user.id || invitation.email.toLowerCase() !== user.email.toLowerCase()) {
    throw new ResourceNotFound('Invitation link is invalid, expired, or belongs to another account.');
  }

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.beneficiary.updateMany({
      where: { id: invitation.id, status: 'INVITED', invitationTokenHash: hash(rawToken), invitationUsedAt: null, invitationExpiresAt: { gt: now } },
      data: { userId: user.id, status: 'ACCEPTED', verifiedAt: now, invitationUsedAt: now, invitationTokenHash: null },
    });
    if (claimed.count !== 1) throw new ResourceNotFound('Invitation link is invalid or expired.');
    await tx.user.update({ where: { id: user.id }, data: { emailVerifiedAt: now } });
    await tx.legacyAuditLog.create({ data: { ownerId: invitation.ownerId, actorType: 'beneficiary', actorId: user.id, action: 'BENEFICIARY_INVITATION_ACCEPTED', metadata: { beneficiaryId: invitation.id } } });
  });
  return { id: invitation.id, fullName: invitation.fullName, relationship: invitation.relationship, ownerName: invitation.owner.displayName };
}

async function requireReleasedPolicy(policyId: string, userId: string) {
  const policy = await prisma.legacyPolicy.findFirst({
    where: { id: policyId, beneficiary: { userId, status: { in: ['ACCEPTED', 'VERIFIED'] } } },
    include: {
      beneficiary: { select: { id: true, fullName: true, relationship: true, status: true } },
      owner: { select: { id: true, userId: true, displayName: true } },
      entryLinks: { select: { entryId: true } },
      resources: { select: { resourceType: true, resourceId: true } },
    },
  });
  if (!policy || !policyIsReleased(policy)) throw new ResourceNotFound('Released legacy content not found.');
  return policy;
}

async function recordPortalAccess(ownerId: string, policyId: string, userId: string, action: string, metadata?: object) {
  await prisma.legacyAuditLog.create({ data: { ownerId, policyId, actorType: 'beneficiary', actorId: userId, action, metadata } });
}

export function createBeneficiaryPortalRouter(authService: AuthService) {
  const router = Router();

  router.get('/invitations/:token', inviteReadLimit, async (request, response, next) => {
    try {
      const token = tokenSchema.safeParse(request.params.token);
      if (!token.success) throw new ResourceNotFound('Invitation link is invalid or expired.');
      const invitation = await findInvitation(token.data);
      if (!invitation) throw new ResourceNotFound('Invitation link is invalid or expired.');
      response.json({ success: true, data: { invitation: { fullName: invitation.fullName, email: invitation.email, relationship: invitation.relationship, ownerName: invitation.owner.displayName, expiresAt: invitation.invitationExpiresAt } } });
    } catch (error) { next(error); }
  });

  router.get('/verifiers/:token', inviteReadLimit, async (request, response, next) => {
    try {
      const token = tokenSchema.safeParse(request.params.token);
      if (!token.success) throw new ResourceNotFound('Verifier link is invalid or expired.');
      const record = await prisma.legacyReleaseToken.findUnique({ where: { tokenHash: hash(token.data) }, include: { policy: { include: { owner: { select: { displayName: true } }, beneficiary: { select: { id: true, fullName: true, email: true, status: true } } } } } });
      if (!record || record.kind !== 'verifier' || record.usedAt || record.expiresAt <= new Date() || record.policy.status !== 'ACTIVE' || record.beneficiaryId !== record.policy.verifierBeneficiaryId || record.policy.beneficiary.status !== 'ACCEPTED') throw new ResourceNotFound('Verifier link is invalid or expired.');
      response.json({ success: true, data: { verifier: { email: record.policy.beneficiary.email, verifierName: record.policy.beneficiary.fullName, ownerName: record.policy.owner.displayName, policyName: record.policy.name, expiresAt: record.expiresAt } } });
    } catch (error) { next(error); }
  });

  router.post('/invitations/register', verifySameOrigin, inviteReadLimit, async (request, response, next) => {
    try {
      const parsed = registerSchema.safeParse(request.body);
      if (!parsed.success) throw new InputValidationError(parsed.error.issues[0]?.message ?? 'Check the invitation and registration details.');
      const invitation = await findInvitation(parsed.data.token);
      if (!invitation) throw new ResourceNotFound('Invitation link is invalid or expired.');
      const result = await authService.register({ fullName: invitation.fullName, email: invitation.email, password: parsed.data.password, confirmPassword: parsed.data.confirmPassword });
      const authenticated = await authService.login({ email: invitation.email, password: parsed.data.password });
      const beneficiary = await acceptInvitation(authenticated.user, parsed.data.token);
      setSessionCookie(response, authenticated.sessionToken, authenticated.expiresAt);
      response.status(201).json({ success: true, data: { user: result, beneficiary } });
    } catch (error) { next(error); }
  });

  router.use(authenticateUser(authService));

  router.post('/invitations/accept', verifySameOrigin, portalWriteLimit, async (request, response, next) => {
    try {
      const parsed = acceptSchema.safeParse(request.body);
      if (!parsed.success) throw new InputValidationError('A valid invitation token is required.');
      const beneficiary = await acceptInvitation(request.authenticatedUser!, parsed.data.token);
      response.json({ success: true, data: { beneficiary } });
    } catch (error) { next(error); }
  });

  router.get('/portal', createRateLimiter({ windowMs: 60_000, max: 60 }), async (request, response, next) => {
    try {
      const userId = request.authenticatedUserId!;
      const relationships = await prisma.beneficiary.findMany({
        where: { userId, status: { in: ['ACCEPTED', 'VERIFIED'] } },
        include: { owner: { select: { displayName: true } }, legacyPolicies: { orderBy: { updatedAt: 'desc' }, include: { resources: { select: { resourceType: true } } } } },
        orderBy: { updatedAt: 'desc' },
      });
      const beneficiaries = await Promise.all(relationships.map(async (beneficiary) => ({
        id: beneficiary.id,
        ownerName: beneficiary.owner.displayName,
        relationship: beneficiary.relationship,
        acceptedAt: beneficiary.verifiedAt,
        policies: await Promise.all(beneficiary.legacyPolicies.filter((policy) => !['REVOKED', 'EXPIRED'].includes(policy.status)).map(async (policy) => {
          const released = policyIsReleased(policy);
          const resourceCounts = { FILE: policy.resources.filter((resource) => resource.resourceType === 'FILE').length, PLAYLIST: policy.resources.filter((resource) => resource.resourceType === 'PLAYLIST').length, WISHES: policy.resources.filter((resource) => resource.resourceType === 'WISHES').length };
          if (!released) return { id: policy.id, name: policy.name, status: 'PENDING' as const, releaseMethod: policy.releaseMethod, releaseAt: policy.releaseAt, releaseReadyAt: policy.releaseReadyAt, releasedAt: null, entryCount: 0, categories: [], resourceCounts: { FILE: 0, PLAYLIST: 0, WISHES: 0 } };
          const [entryCount, categories] = await Promise.all([
            prisma.diaryEntry.count({ where: { ownerId: beneficiary.ownerId, ...legacyEntryScopeWhere(policy) } }),
            prisma.diaryEntry.findMany({ where: { ownerId: beneficiary.ownerId, ...legacyEntryScopeWhere(policy) }, distinct: ['category'], select: { category: true } }),
          ]);
          return { id: policy.id, name: policy.name, status: 'RELEASED' as const, releaseMethod: policy.releaseMethod, releaseAt: policy.releaseAt, releaseReadyAt: null, releasedAt: policy.releasedAt, entryCount, categories: categories.map(({ category }) => category), resourceCounts };
        })),
      })));
      response.json({ success: true, data: { beneficiaries } });
    } catch (error) { next(error); }
  });

  router.get('/portal/policies/:id', createRateLimiter({ windowMs: 60_000, max: 60 }), async (request, response, next) => {
    try {
      const id = z.string().trim().min(1).max(191).safeParse(request.params.id);
      const filters = querySchema.safeParse(request.query);
      if (!id.success || !filters.success) throw new InputValidationError('Choose a valid policy and filter.');
      const policy = await requireReleasedPolicy(id.data, request.authenticatedUserId!);
      const resourceIds = (type: 'FILE' | 'PLAYLIST' | 'WISHES') => policy.resources.filter((resource) => resource.resourceType === type).map((resource) => resource.resourceId);
      const [files, playlists, wishes] = await Promise.all([
        resourceIds('FILE').length ? prisma.userFile.findMany({ where: { ownerId: policy.ownerId, id: { in: resourceIds('FILE') } }, select: { id: true, name: true, mime: true, category: true, size: true } }) : [],
        resourceIds('PLAYLIST').length ? prisma.userPlaylist.findMany({ where: { ownerId: policy.ownerId, id: { in: resourceIds('PLAYLIST') } }, select: { id: true, kind: true, title: true, youtubePlaylistId: true, youtubeVideoId: true } }) : [],
        resourceIds('WISHES').length ? prisma.letterOfWishes.findMany({ where: { ownerId: policy.ownerId, id: { in: resourceIds('WISHES') } }, select: { id: true, title: true, content: true } }) : [],
      ]);
      const where = {
        ownerId: policy.ownerId,
        AND: [legacyEntryScopeWhere(policy), {
          ...(filters.data.from || filters.data.to ? { entryDate: { ...(filters.data.from ? { gte: filters.data.from } : {}), ...(filters.data.to ? { lte: filters.data.to } : {}) } } : {}),
          ...(filters.data.category ? { category: filters.data.category } : {}),
        }],
      };
      const entries = await prisma.diaryEntry.findMany({
        where,
        orderBy: { entryDate: 'desc' },
        take: 100,
        select: {
          id: true, title: true, category: true, entryDate: true, originalContent: true, normalizedContent: true,
          photos: { orderBy: { position: 'asc' }, select: { id: true, cloudinaryPublicId: true, altText: true, position: true } },
          media: { select: { id: true, mediaType: true, fileName: true, mimeType: true, byteSize: true } },
        },
      });
      await recordPortalAccess(policy.ownerId, policy.id, request.authenticatedUserId!, 'BENEFICIARY_CONTENT_ACCESSED', { entryCount: entries.length });
      response.json({ success: true, data: {
        policy: { id: policy.id, name: policy.name, ownerName: policy.owner.displayName, relationship: policy.beneficiary.relationship, releasedAt: policy.releasedAt },
        entries: entries.map((entry) => ({ ...entry, content: entry.originalContent, photos: entry.photos.map((photo) => ({ id: photo.id, altText: photo.altText, thumbnailUrl: signedCloudinaryUrl(photo.cloudinaryPublicId, 'c_fill,w_480,h_480,q_auto,f_auto'), fullUrl: signedCloudinaryUrl(photo.cloudinaryPublicId, 'c_limit,w_2000,h_2000,q_auto,f_auto') })), media: entry.media.map((media) => ({ id: media.id, mediaType: media.mediaType, fileName: media.fileName, mimeType: media.mimeType, byteSize: media.byteSize.toString() })) })),
        resources: { playlists: playlists.map((playlist) => ({ id: playlist.id, title: playlist.title, url: playlist.kind === 'video' ? `https://www.youtube.com/watch?v=${encodeURIComponent(playlist.youtubeVideoId ?? '')}` : `https://www.youtube.com/playlist?list=${encodeURIComponent(playlist.youtubePlaylistId ?? '')}` })), letters: wishes, files: files.map((file) => ({ id: file.id, name: file.name, mime: file.mime, category: file.category, size: file.size.toString() })) },
      } });
    } catch (error) { next(error); }
  });

  router.post('/portal/assistant', assistantLimit, async (request, response, next) => {
    try {
      const question = z.string().trim().min(1).max(3000).safeParse(request.body?.question);
      if (!question.success) throw new InputValidationError('Enter a question about released memories.');
      const policies = await prisma.legacyPolicy.findMany({
        where: { status: 'RELEASED', releasedAt: { not: null }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }], beneficiary: { userId: request.authenticatedUserId!, status: { in: ['ACCEPTED', 'VERIFIED'] } } },
        include: { entryLinks: { select: { entryId: true } } },
        take: 30,
      });
      const terms = question.data.toLowerCase().split(/\W+/).filter((term) => term.length >= 3).slice(0, 8);
      const authorized = await Promise.all(policies.map((policy) => prisma.diaryEntry.findMany({
        where: { ownerId: policy.ownerId, AND: [legacyEntryScopeWhere(policy), ...(terms.length ? [{ OR: terms.flatMap((term) => [{ title: { contains: term } }, { originalContent: { contains: term } }, { normalizedContent: { contains: term } }]) }] : [])] },
        orderBy: { entryDate: 'desc' }, take: 8,
        select: { id: true, title: true, category: true, entryDate: true, originalContent: true, normalizedContent: true },
      }).then((entries) => entries.map((entry) => ({ ...entry, policyId: policy.id })))));
      const entries = [...new Map(authorized.flat().map((entry) => [entry.id, entry])).values()].slice(0, 24);
      if (!entries.length) {
        response.json({ success: true, data: { answer: 'The released memories available to you do not contain enough detail to answer that question.', citations: [] } });
        return;
      }
      const usedPolicies = [...new Set(entries.map((entry) => entry.policyId))];
      await Promise.all(usedPolicies.map((policyId) => {
        const policy = policies.find((item) => item.id === policyId)!;
        return recordPortalAccess(policy.ownerId, policy.id, request.authenticatedUserId!, 'BENEFICIARY_AI_MEMORY_ACCESSED', { entryCount: entries.filter((entry) => entry.policyId === policyId).length });
      }));
      const diaryContext = entries.map((entry) => `[ENTRY_ID:${entry.id}] ${entry.title}\nDate: ${entry.entryDate.toISOString()}\n${entry.normalizedContent ?? entry.originalContent}`).join('\n\n').slice(0, 24_000);
      const answer = await generateChatResponse('DIARY_ASSISTANT', [{ role: 'USER', content: question.data }], diaryContext);
      response.json({ success: true, data: { answer, citations: entries.slice(0, 8).map(({ id, title, entryDate }) => ({ id, title, entryDate })) } });
    } catch (error) { next(error); }
  });

  return router;
}
