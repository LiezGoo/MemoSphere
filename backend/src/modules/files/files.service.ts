import { prisma } from '../../config/prisma.js';
import { ConflictError, ResourceNotFound } from '../../exceptions/index.js';
import { getOwnerForUser } from '../../utils/owner.js';
import type { fileCreateSchema, playlistCreateSchema } from './files.validation.js';
import type { z } from 'zod';

const MAX_PLAYLISTS = 30;

export async function listUserFiles(userId: string, category?: string) {
  const owner = await getOwnerForUser(userId);
  return prisma.userFile.findMany({ where: { ownerId: owner.id, ...(category ? { category } : {}) }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
}

export async function createUserFile(userId: string, input: z.infer<typeof fileCreateSchema>) {
  const owner = await getOwnerForUser(userId);
  try {
    const file = await prisma.userFile.create({ data: { ...input, size: BigInt(input.size), ownerId: owner.id } });
    return { ...file, size: file.size.toString() };
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') throw new ConflictError('This Drive file is already in your file list.');
    throw error;
  }
}

export async function renameUserFile(userId: string, id: string, name: string) {
  const owner = await getOwnerForUser(userId);
  const result = await prisma.userFile.updateMany({ where: { id, ownerId: owner.id }, data: { name } });
  if (!result.count) throw new ResourceNotFound('File not found.');
  const file = await prisma.userFile.findFirst({ where: { id, ownerId: owner.id } });
  if (!file) throw new ResourceNotFound('File not found.');
  return { ...file, size: file.size.toString() };
}

export async function deleteUserFile(userId: string, id: string) {
  const owner = await getOwnerForUser(userId);
  const result = await prisma.userFile.deleteMany({ where: { id, ownerId: owner.id } });
  if (!result.count) throw new ResourceNotFound('File not found.');
}

async function youtubeTitle(input: { kind: 'playlist' | 'video'; youtubePlaylistId: string | null; youtubeVideoId: string | null }) {
  const fallback = input.kind === 'playlist' ? 'YouTube playlist' : 'YouTube video';
  try {
    const sourceUrl = input.kind === 'playlist' ? `https://www.youtube.com/playlist?list=${input.youtubePlaylistId}` : `https://www.youtube.com/watch?v=${input.youtubeVideoId}`;
    const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(sourceUrl)}&format=json`, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) return fallback;
    const result = await response.json() as { title?: unknown };
    return typeof result.title === 'string' && result.title.trim() ? result.title.trim().slice(0, 200) : fallback;
  } catch {
    return fallback;
  }
}

export async function listUserPlaylists(userId: string) {
  const owner = await getOwnerForUser(userId);
  return prisma.userPlaylist.findMany({ where: { ownerId: owner.id }, orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] });
}

export async function createUserPlaylist(userId: string, input: z.infer<typeof playlistCreateSchema>) {
  const owner = await getOwnerForUser(userId);
  const duplicateWhere = input.kind === 'playlist' ? { ownerId: owner.id, youtubePlaylistId: input.youtubePlaylistId } : { ownerId: owner.id, youtubeVideoId: input.youtubeVideoId };
  const existing = await prisma.userPlaylist.findFirst({ where: duplicateWhere });
  if (existing) throw new ConflictError('Already added.');
  const title = await youtubeTitle(input);
  return prisma.$transaction(async (transaction) => {
    await transaction.$queryRaw<Array<{ id: string }>>`SELECT id FROM owners WHERE id = ${owner.id} FOR UPDATE`;
    const duplicate = await transaction.userPlaylist.findFirst({ where: duplicateWhere });
    if (duplicate) throw new ConflictError('Already added.');
    const count = await transaction.userPlaylist.count({ where: { ownerId: owner.id } });
    if (count >= MAX_PLAYLISTS) throw new ConflictError(`You can save up to ${MAX_PLAYLISTS} YouTube items.`);
    return transaction.userPlaylist.create({ data: { ownerId: owner.id, kind: input.kind, youtubePlaylistId: input.youtubePlaylistId, youtubeVideoId: input.youtubeVideoId, startSeconds: input.startSeconds, title, position: count } });
  });
}

export async function renameUserPlaylist(userId: string, id: string, title: string) {
  const owner = await getOwnerForUser(userId);
  const result = await prisma.userPlaylist.updateMany({ where: { id, ownerId: owner.id }, data: { title } });
  if (!result.count) throw new ResourceNotFound('Playlist not found.');
  const playlist = await prisma.userPlaylist.findFirst({ where: { id, ownerId: owner.id } });
  if (!playlist) throw new ResourceNotFound('Playlist not found.');
  return playlist;
}

export async function deleteUserPlaylist(userId: string, id: string) {
  const owner = await getOwnerForUser(userId);
  const result = await prisma.userPlaylist.deleteMany({ where: { id, ownerId: owner.id } });
  if (!result.count) throw new ResourceNotFound('Playlist not found.');
}

