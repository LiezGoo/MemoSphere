import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ diaryFindMany: vi.fn(), wishesFindUnique: vi.fn(), filesFindMany: vi.fn(), playlistsFindMany: vi.fn() }));
vi.mock('../../config/prisma.js', () => ({ prisma: {
  diaryEntry: { findMany: db.diaryFindMany },
  letterOfWishes: { findUnique: db.wishesFindUnique },
  userFile: { findMany: db.filesFindMany },
  userPlaylist: { findMany: db.playlistsFindMany },
} }));

import { retrievePersonalSources } from './retrieval.service.js';

describe('personal source retrieval', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.diaryFindMany.mockResolvedValue([{ id: 'entry-a', title: 'Graduation plans', entryDate: new Date('2026-01-01T00:00:00Z'), originalContent: 'I planned to celebrate graduation with my family.', normalizedContent: null, transcript: 'Voice note: call my family.' }]);
    db.wishesFindUnique.mockResolvedValue({ id: 'wishes-a', title: 'Letter of Wishes', content: 'Please share my graduation photos with my family.', updatedAt: new Date('2026-02-01T00:00:00Z') });
    db.filesFindMany.mockResolvedValue([{ id: 'file-a', name: 'Graduation research.pdf', mime: 'application/pdf', createdAt: new Date('2026-03-01T00:00:00Z') }]);
    db.playlistsFindMany.mockResolvedValue([
      { id: 'playlist-a', kind: 'playlist', youtubePlaylistId: 'PLgraduation', youtubeVideoId: null, startSeconds: null, title: 'Graduation memories', position: 0, createdAt: new Date('2026-04-01T00:00:00Z') },
      { id: 'video-a', kind: 'video', youtubePlaylistId: null, youtubeVideoId: 'abc12345678', startSeconds: 12, title: 'Graduation song', position: 1, createdAt: new Date('2026-04-02T00:00:00Z') },
    ]);
  });

  it('retrieves diary text, voice transcripts, wishes, and file metadata only for the owner', async () => {
    const sources = await retrievePersonalSources('owner-a', 'What did I save about graduation?');
    expect(sources.map((source) => source.type)).toEqual(expect.arrayContaining(['DIARY_ENTRY', 'LETTER_OF_WISHES', 'FILE_METADATA']));
    expect(sources.find((source) => source.type === 'DIARY_ENTRY')?.content).toContain('Voice note: call my family.');
    expect(sources.find((source) => source.type === 'FILE_METADATA')?.content).toContain('contents are held');
    expect(db.diaryFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ ownerId: 'owner-a', status: { not: 'DELETED' } }) }));
    expect(db.wishesFindUnique).toHaveBeenCalledWith({ where: { ownerId: 'owner-a' }, select: expect.any(Object) });
    expect(db.filesFindMany).toHaveBeenCalledWith({ where: { ownerId: 'owner-a' }, select: expect.any(Object) });
    expect(db.playlistsFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { ownerId: 'owner-a' }, select: expect.any(Object) }));
    const playlist = sources.find((source) => source.id === 'playlist-a');
    expect(playlist?.type).toBe('PLAYLIST');
    expect(playlist?.href).toBe('/files?playlist=playlist-a');
    expect(playlist?.content).toContain('individual songs and metadata are not stored');
    expect(sources.find((source) => source.id === 'video-a')?.content).toContain('video ID: abc12345678');
  });

  it('returns saved playlist and video records for playlist questions, scoped to the owner', async () => {
    const sources = await retrievePersonalSources('owner-a', 'What playlists and songs have I saved?');
    expect(sources.map((source) => source.id)).toEqual(expect.arrayContaining(['playlist-a', 'video-a']));
    expect(db.playlistsFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { ownerId: 'owner-a' } }));
  });

  it('does not return unmatched letters or file metadata for unrelated questions', async () => {
    db.wishesFindUnique.mockResolvedValue({ id: 'wishes-a', title: 'Letter of Wishes', content: 'Please call my brother.', updatedAt: new Date() });
    db.filesFindMany.mockResolvedValue([{ id: 'file-a', name: 'Research.pdf', mime: 'application/pdf', createdAt: new Date() }]);
    db.playlistsFindMany.mockResolvedValue([{ id: 'playlist-a', kind: 'playlist', youtubePlaylistId: 'PL123', youtubeVideoId: null, startSeconds: null, title: 'My playlist', position: 0, createdAt: new Date() }]);
    expect(await retrievePersonalSources('owner-b', 'What was the weather in Madrid?')).toEqual([]);
    expect(db.diaryFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ ownerId: 'owner-b' }) }));
    expect(db.playlistsFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { ownerId: 'owner-b' } }));
  });
});
