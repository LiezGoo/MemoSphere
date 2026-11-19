import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';

type DiaryDatabase = typeof prisma | Prisma.TransactionClient;
const entryInclude = { media: true, photos: { orderBy: { position: 'asc' as const } }, tags: { include: { tag: true } }, versions: { orderBy: { versionNumber: 'desc' as const }, take: 1 } } satisfies Prisma.DiaryEntryInclude;

export function listEntries(ownerId: string, filter: Prisma.DiaryEntryWhereInput, page: number, pageSize: number, sort: 'newest' | 'oldest' | 'created-newest' | 'created-oldest') {
  const orderBy = sort === 'newest' ? { entryDate: 'desc' as const } : sort === 'oldest' ? { entryDate: 'asc' as const } : { createdAt: sort === 'created-newest' ? 'desc' as const : 'asc' as const };
  return Promise.all([
    prisma.diaryEntry.findMany({ where: { ownerId, ...filter }, include: entryInclude, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.diaryEntry.count({ where: { ownerId, ...filter } }),
  ]);
}

export const findEntry = (ownerId: string, id: string, database: DiaryDatabase = prisma) => database.diaryEntry.findFirst({ where: { id, ownerId, status: { not: 'DELETED' } }, include: { ...entryInclude, versions: { orderBy: { versionNumber: 'asc' } } } });
export const findLatestEntry = (ownerId: string, database: DiaryDatabase = prisma) => database.diaryEntry.findFirst({ where: { ownerId, status: { not: 'DELETED' } }, orderBy: { createdAt: 'desc' }, select: { contentHash: true } });
export const createEntry = (data: Prisma.DiaryEntryCreateInput, database: DiaryDatabase = prisma) => database.diaryEntry.create({ data, include: entryInclude });
export const updateEntry = (id: string, data: Prisma.DiaryEntryUpdateInput, database: DiaryDatabase = prisma) => database.diaryEntry.update({ where: { id }, data, include: entryInclude });
export const softDeleteEntry = (id: string, database: DiaryDatabase = prisma) => database.diaryEntry.update({ where: { id }, data: { status: 'DELETED', deletedAt: new Date() } });
export const createVersion = (data: Prisma.EntryVersionCreateInput, database: DiaryDatabase = prisma) => database.entryVersion.create({ data });