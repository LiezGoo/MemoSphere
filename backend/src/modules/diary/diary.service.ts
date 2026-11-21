import { createHash } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { EntryNotFound } from '../../exceptions/index.js';
import { recordAudit } from '../../utils/audit.js';
import { getOwnerForUser } from '../../utils/owner.js';
import { createEntry, createVersion, findEntry, findLatestEntry, listEntries, softDeleteEntry, updateEntry } from './diary.repository.js';
import type { z } from 'zod';
import { diaryCreateSchema, diaryListSchema, diaryUpdateSchema } from './diary.validation.js';
import { deleteCloudinaryAsset, signedCloudinaryUrl, verifyCloudinaryAsset } from './cloudinary.js';
import { classifyEmotion } from './emotion.js';
import { currentEntryText } from './diary-content.js';

function entryTitle(content: string, photoCount: number) {
  const firstLine = content.split(/\r?\n/).find((line) => line.trim())?.trim();
  return firstLine?.slice(0, 200) || (photoCount ? 'Photo entry' : 'Diary memory');
}

function contentHash(previousHash: string | undefined, title: string, content: string, entryDate: Date) {
  return createHash('sha256').update([previousHash ?? 'GENESIS', title, content, entryDate.toISOString()].join('|')).digest('hex');
}

function toEntry(entry: Awaited<ReturnType<typeof findEntry>>) {
  if (!entry) return null;
  const content = currentEntryText(entry);
  return { ...entry, title: entryTitle(content, entry.photos.length), content, media: entry.media.map((media) => ({ ...media, byteSize: media.byteSize.toString() })), photos: entry.photos.map((photo) => ({ ...photo, thumbnailUrl: signedCloudinaryUrl(photo.cloudinaryPublicId, 'c_fill,w_480,h_480,q_auto,f_auto'), fullUrl: signedCloudinaryUrl(photo.cloudinaryPublicId, 'c_limit,w_2000,h_2000,q_auto,f_auto') })), preview: content.replace(/^\s+/, '').slice(0, 180), access: 'Private', mediaCount: entry.media.length, photoCount: entry.photos.length, latestVersion: entry.versions.at(-1) ?? null };
}

export async function listDiaryEntries(userId: string, input: z.infer<typeof diaryListSchema>) {
  const owner = await getOwnerForUser(userId);
  const filter: Prisma.DiaryEntryWhereInput = { status: input.archived ? 'ARCHIVED' : 'PRESERVED', ...(input.favorites ? { isFavorite: true } : {}), ...(input.withPhotos ? { photos: { some: {} } } : {}), ...(input.withAudio ? { OR: [{ inputMethod: 'VOICE' }, { media: { some: { mediaType: { in: ['AUDIO', 'VOICE_MESSAGE'] } } } }] } : {}), ...(input.search ? { AND: [{ OR: [{ title: { contains: input.search } }, { originalContent: { contains: input.search } }, { normalizedContent: { contains: input.search } }] }] } : {}), ...(input.category ? { category: input.category } : {}), ...(input.from || input.to ? { entryDate: { ...(input.from ? { gte: input.from } : {}), ...(input.to ? { lte: input.to } : {}) } } : {}) };
  const [entries, total] = await listEntries(owner.id, filter, input.page, input.pageSize, input.sort);
  return { entries: entries.map((entry) => { const content = currentEntryText(entry); return { ...entry, title: entryTitle(content, entry.photos.length), content, media: entry.media.map((media) => ({ ...media, byteSize: media.byteSize.toString() })), photos: entry.photos.map((photo) => ({ ...photo, thumbnailUrl: signedCloudinaryUrl(photo.cloudinaryPublicId, 'c_fill,w_240,h_240,q_auto,f_auto') })), preview: content.replace(/^\s+/, '').slice(0, 180), access: 'Private', mediaCount: entry.media.length, photoCount: entry.photos.length }; }), pagination: { page: input.page, pageSize: input.pageSize, total, totalPages: Math.ceil(total / input.pageSize) } };
}

export async function setDiaryEntryFavorite(userId: string, id: string, isFavorite: boolean) {
  const owner = await getOwnerForUser(userId);
  const existing = await findEntry(owner.id, id);
  if (!existing) throw new EntryNotFound('Diary entry not found.');
  await prisma.diaryEntry.updateMany({ where: { id, ownerId: owner.id, status: { not: 'DELETED' } }, data: { isFavorite } });
  await recordAudit({ ownerId: owner.id, actorUserId: userId, action: isFavorite ? 'DIARY_ENTRY_FAVORITED' : 'DIARY_ENTRY_UNFAVORITED', resourceType: 'DIARY_ENTRY', resourceId: id, result: 'ALLOWED' });
  return getDiaryEntry(userId, id);
}

export async function setDiaryEntryArchived(userId: string, id: string, archived: boolean) {
  const owner = await getOwnerForUser(userId);
  const existing = await findEntry(owner.id, id);
  if (!existing) throw new EntryNotFound('Diary entry not found.');
  await prisma.diaryEntry.updateMany({ where: { id, ownerId: owner.id, status: { not: 'DELETED' } }, data: { status: archived ? 'ARCHIVED' : 'PRESERVED' } });
  await recordAudit({ ownerId: owner.id, actorUserId: userId, action: archived ? 'DIARY_ENTRY_ARCHIVED' : 'DIARY_ENTRY_RESTORED', resourceType: 'DIARY_ENTRY', resourceId: id, result: 'ALLOWED' });
  return getDiaryEntry(userId, id);
}

export async function getDiaryEntry(userId: string, id: string) {
  const owner = await getOwnerForUser(userId);
  const entry = toEntry(await findEntry(owner.id, id));
  if (!entry) throw new EntryNotFound('Diary entry not found.');
  return entry;
}

export async function createDiaryEntry(userId: string, input: z.infer<typeof diaryCreateSchema>) {
  const owner = await getOwnerForUser(userId);
  const originalContent = input.originalContent.trim();
  const assets = await Promise.all(input.photoPublicIds.map((id) => verifyCloudinaryAsset(userId, id)));
  const previous = await findLatestEntry(owner.id);
  const fallbackTitle = entryTitle(originalContent, assets.length);
  const fallbackDate = new Date();
  const emotionResult = originalContent ? await classifyEmotion(originalContent).catch(() => null) : null;
  const emotion = emotionResult?.emotion ?? null;
  const hash = contentHash(previous?.contentHash, fallbackTitle, originalContent, fallbackDate);
  const entry = await prisma.$transaction(async (transaction) => {
    const created = await createEntry({ owner: { connect: { id: owner.id } }, title: input.title.trim() || fallbackTitle, category: input.category, originalContent, transcript: input.transcript, inputMethod: input.inputMethod, emotion, emotionConfidence: emotionResult?.confidence ?? null, emotionReason: emotionResult?.reason ?? null, emotionSource: emotionResult?.emotion ? 'AI' : null, emotionUpdatedAt: emotionResult?.emotion ? fallbackDate : null, entryDate: fallbackDate, contentHash: hash, previousHash: previous?.contentHash, status: 'PRESERVED', versions: originalContent ? { create: { versionNumber: 1, writingMode: 'VERBATIM', sourceContent: originalContent, processedContent: originalContent } } : undefined, photos: assets.length ? { create: assets.map((asset, position) => ({ ownerId: owner.id, cloudinaryPublicId: asset.public_id, width: asset.width, height: asset.height, bytes: asset.bytes, position })) } : undefined }, transaction);
    const title = input.title.trim() || fallbackTitle;
    await updateEntry(created.id, { title, entryDate: created.createdAt, contentHash: contentHash(previous?.contentHash, title, originalContent, created.createdAt) }, transaction);
    await recordAudit({ ownerId: owner.id, actorUserId: userId, action: 'DIARY_ENTRY_CREATED', resourceType: 'DIARY_ENTRY', resourceId: created.id, result: 'ALLOWED' }, transaction);
    return created;
  });
  return toEntry(await findEntry(owner.id, entry.id));
}

export async function updateDiaryEntry(userId: string, id: string, input: z.infer<typeof diaryUpdateSchema>) {
  const owner = await getOwnerForUser(userId);
  const existing = await findEntry(owner.id, id);
  if (!existing) throw new EntryNotFound('Diary entry not found.');
  const { content, entryDate: _entryDate, ...entryFields } = input;
  const entry = await prisma.$transaction(async (transaction) => {
    const updated = await updateEntry(id, { ...entryFields, ...(content ? { normalizedContent: content } : {}) }, transaction);
    if (content) {
      await createVersion({ diaryEntry: { connect: { id } }, versionNumber: (existing.versions.at(-1)?.versionNumber ?? 0) + 1, writingMode: 'VERBATIM', sourceContent: content, processedContent: content }, transaction);
    }
    await recordAudit({ ownerId: owner.id, actorUserId: userId, action: 'DIARY_ENTRY_UPDATED', resourceType: 'DIARY_ENTRY', resourceId: id, result: 'ALLOWED' }, transaction);
    return updated;
  });
  return toEntry(entry);
}

export async function deleteDiaryEntry(userId: string, id: string) {
  const owner = await getOwnerForUser(userId);
  if (!await findEntry(owner.id, id)) throw new EntryNotFound('Diary entry not found.');
  const photos = await prisma.entryPhoto.findMany({ where: { entryId: id }, select: { cloudinaryPublicId: true } });
  await Promise.all(photos.map((photo) => deleteCloudinaryAsset(photo.cloudinaryPublicId)));
  await prisma.$transaction(async (transaction) => {
    await softDeleteEntry(id, transaction);
    await recordAudit({ ownerId: owner.id, actorUserId: userId, action: 'DIARY_ENTRY_DELETED', resourceType: 'DIARY_ENTRY', resourceId: id, result: 'ALLOWED' }, transaction);
  });
}
