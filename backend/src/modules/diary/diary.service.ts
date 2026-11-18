import { createHash } from 'node:crypto';
import { prisma } from '../../config/prisma.js';
import { EntryNotFound } from '../../exceptions/index.js';
import { recordAudit } from '../../utils/audit.js';
import { getOwnerForUser } from '../../utils/owner.js';
import { createEntry, createVersion, findEntry, findLatestEntry, listEntries, softDeleteEntry, updateEntry } from './diary.repository.js';
import type { z } from 'zod';
import { diaryCreateSchema, diaryListSchema, diaryUpdateSchema } from './diary.validation.js';

function contentHash(previousHash: string | undefined, title: string, content: string, entryDate: Date) {
  return createHash('sha256').update([previousHash ?? 'GENESIS', title, content, entryDate.toISOString()].join('|')).digest('hex');
}

function toEntry(entry: Awaited<ReturnType<typeof findEntry>>) {
  if (!entry) return null;
  const content = entry.normalizedContent ?? entry.originalContent;
  return { ...entry, content, media: entry.media.map((media) => ({ ...media, byteSize: media.byteSize.toString() })), preview: content.slice(0, 180), access: 'Private', mediaCount: entry.media.length, latestVersion: entry.versions.at(-1) ?? null };
}

export async function listDiaryEntries(userId: string, input: z.infer<typeof diaryListSchema>) {
  const owner = await getOwnerForUser(userId);
  const filter = { status: { not: 'DELETED' as const }, ...(input.search ? { OR: [{ title: { contains: input.search } }, { originalContent: { contains: input.search } }, { normalizedContent: { contains: input.search } }] } : {}), ...(input.category ? { category: input.category } : {}), ...(input.from || input.to ? { entryDate: { ...(input.from ? { gte: input.from } : {}), ...(input.to ? { lte: input.to } : {}) } } : {}) };
  const [entries, total] = await listEntries(owner.id, filter, input.page, input.pageSize, input.sort);
  return { entries: entries.map((entry) => { const content = entry.normalizedContent ?? entry.originalContent; return { ...entry, content, media: entry.media.map((media) => ({ ...media, byteSize: media.byteSize.toString() })), preview: content.slice(0, 180), access: 'Private', mediaCount: entry.media.length }; }), pagination: { page: input.page, pageSize: input.pageSize, total, totalPages: Math.ceil(total / input.pageSize) } };
}

export async function getDiaryEntry(userId: string, id: string) {
  const owner = await getOwnerForUser(userId);
  const entry = toEntry(await findEntry(owner.id, id));
  if (!entry) throw new EntryNotFound('Diary entry not found.');
  return entry;
}

export async function createDiaryEntry(userId: string, input: z.infer<typeof diaryCreateSchema>) {
  const owner = await getOwnerForUser(userId);
  const previous = await findLatestEntry(owner.id);
  const hash = contentHash(previous?.contentHash, input.title, input.originalContent, input.entryDate);
  const entry = await prisma.$transaction(async (transaction) => {
    const created = await createEntry({ owner: { connect: { id: owner.id } }, title: input.title, category: input.category, originalContent: input.originalContent, transcript: input.transcript, inputMethod: input.inputMethod, entryDate: input.entryDate, contentHash: hash, previousHash: previous?.contentHash, status: 'PRESERVED', versions: { create: { versionNumber: 1, writingMode: 'VERBATIM', sourceContent: input.originalContent, processedContent: input.originalContent } } }, transaction);
    await recordAudit({ ownerId: owner.id, actorUserId: userId, action: 'DIARY_ENTRY_CREATED', resourceType: 'DIARY_ENTRY', resourceId: created.id, result: 'ALLOWED' }, transaction);
    return created;
  });
  return toEntry(await findEntry(owner.id, entry.id));
}

export async function updateDiaryEntry(userId: string, id: string, input: z.infer<typeof diaryUpdateSchema>) {
  const owner = await getOwnerForUser(userId);
  const existing = await findEntry(owner.id, id);
  if (!existing) throw new EntryNotFound('Diary entry not found.');
  const { content, ...entryFields } = input;
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
  await prisma.$transaction(async (transaction) => {
    await softDeleteEntry(id, transaction);
    await recordAudit({ ownerId: owner.id, actorUserId: userId, action: 'DIARY_ENTRY_DELETED', resourceType: 'DIARY_ENTRY', resourceId: id, result: 'ALLOWED' }, transaction);
  });
}
