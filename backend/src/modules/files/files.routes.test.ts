import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  ownerFindUnique: vi.fn(), fileFindMany: vi.fn(), fileCreate: vi.fn(), fileUpdateMany: vi.fn(), fileFindFirst: vi.fn(), fileDeleteMany: vi.fn(),
  playlistFindMany: vi.fn(), playlistCount: vi.fn(), playlistCreate: vi.fn(), playlistUpdateMany: vi.fn(), playlistFindFirst: vi.fn(), playlistDeleteMany: vi.fn(), queryRaw: vi.fn(),
}));
vi.mock('../../config/prisma.js', () => ({ prisma: {
  owner: { findUnique: db.ownerFindUnique },
  userFile: { findMany: db.fileFindMany, create: db.fileCreate, updateMany: db.fileUpdateMany, findFirst: db.fileFindFirst, deleteMany: db.fileDeleteMany },
  userPlaylist: { findMany: db.playlistFindMany, count: db.playlistCount, create: db.playlistCreate, updateMany: db.playlistUpdateMany, findFirst: db.playlistFindFirst, deleteMany: db.playlistDeleteMany },
  $transaction: (callback: (transaction: unknown) => unknown) => callback({ $queryRaw: db.queryRaw, userPlaylist: { findFirst: db.playlistFindFirst, count: db.playlistCount, create: db.playlistCreate } }),
} }));

import { createApp } from '../../app.js';
import type { AuthService, SafeUser } from '../auth/auth.types.js';

const makeUser = (id: string): SafeUser => ({ id, fullName: id, email: `${id}@example.test`, accountStatus: 'ACTIVE', createdAt: new Date('2026-01-01T00:00:00.000Z') });
const users = new Map([['session-a', makeUser('user-a')], ['session-b', makeUser('user-b')]]);
const authService: AuthService = {
  async register() { return makeUser('user-a'); },
  async login() { return { user: makeUser('user-a'), sessionToken: 'session-a', expiresAt: new Date('2026-12-01') }; },
  async logout() {},
  async getUserFromSession(token) { return token ? users.get(token) ?? null : null; },
};
const app = () => createApp(authService);

beforeEach(() => {
  vi.clearAllMocks();
  db.ownerFindUnique.mockImplementation(({ where }: { where: { userId: string } }) => Promise.resolve({ id: where.userId === 'user-a' ? 'owner-a' : 'owner-b' }));
  db.playlistFindFirst.mockResolvedValue(null);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
});
afterEach(() => vi.unstubAllGlobals());

describe('file and playlist ownership', () => {
  it('uses the signed-in owner when creating file metadata', async () => {
    db.fileCreate.mockImplementation(({ data }: { data: Record<string, unknown> }) => Promise.resolve({ id: 'file-a', ...data, size: BigInt(data.size as number), createdAt: new Date() }));
    const response = await request(app()).post('/api/files').set('Cookie', 'alaala_session=session-a').send({ driveFileId: 'drive_file-123456', name: 'notes.txt', mime: 'text/plain', size: 32, category: 'document' }).expect(201);
    expect(response.body.data.file.size).toBe('32');
    expect(db.fileCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ ownerId: 'owner-a', driveFileId: 'drive_file-123456' }) }));
  });

  it('scopes file reads, updates, and deletes to the authenticated owner', async () => {
    db.fileFindMany.mockResolvedValue([]);
    db.fileUpdateMany.mockResolvedValue({ count: 0 });
    db.fileDeleteMany.mockResolvedValue({ count: 0 });
    await request(app()).get('/api/files').set('Cookie', 'alaala_session=session-b').expect(200);
    await request(app()).patch('/api/files/private-file-a').set('Cookie', 'alaala_session=session-b').send({ name: 'changed.pdf' }).expect(404);
    await request(app()).delete('/api/files/private-file-a').set('Cookie', 'alaala_session=session-b').expect(404);
    expect(db.fileFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { ownerId: 'owner-b' } }));
    expect(db.fileUpdateMany).toHaveBeenCalledWith({ where: { id: 'private-file-a', ownerId: 'owner-b' }, data: { name: 'changed.pdf' } });
    expect(db.fileDeleteMany).toHaveBeenCalledWith({ where: { id: 'private-file-a', ownerId: 'owner-b' } });
  });

  it('scopes playlist rename and removal to the authenticated owner', async () => {
    db.playlistFindMany.mockResolvedValue([]);
    db.playlistUpdateMany.mockResolvedValue({ count: 0 });
    db.playlistDeleteMany.mockResolvedValue({ count: 0 });
    await request(app()).get('/api/files/playlists').set('Cookie', 'alaala_session=session-b').expect(200);
    await request(app()).patch('/api/files/playlists/private-playlist-a').set('Cookie', 'alaala_session=session-b').send({ title: 'Not mine' }).expect(404);
    await request(app()).delete('/api/files/playlists/private-playlist-a').set('Cookie', 'alaala_session=session-b').expect(404);
    expect(db.playlistFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { ownerId: 'owner-b' } }));
    expect(db.playlistUpdateMany).toHaveBeenCalledWith({ where: { id: 'private-playlist-a', ownerId: 'owner-b' }, data: { title: 'Not mine' } });
    expect(db.playlistDeleteMany).toHaveBeenCalledWith({ where: { id: 'private-playlist-a', ownerId: 'owner-b' } });
  });

  it('returns an empty playlist list for an authenticated owner with no saved playlists', async () => {
    db.playlistFindMany.mockResolvedValue([]);
    const response = await request(app()).get('/api/files/playlists').set('Cookie', 'alaala_session=session-a').expect(200);
    expect(response.body).toEqual({ success: true, data: { playlists: [] } });
    expect(db.playlistFindMany).toHaveBeenCalledWith({ where: { ownerId: 'owner-a' }, orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] });
  });

  it('returns only the authenticated owner’s saved playlists', async () => {
    const saved = { id: 'playlist-b', ownerId: 'owner-b', youtubePlaylistId: 'PL1234567890abc', title: 'Saved playlist', position: 0, createdAt: new Date('2026-01-01T00:00:00.000Z') };
    db.playlistFindMany.mockResolvedValue([saved]);
    const response = await request(app()).get('/api/files/playlists').set('Cookie', 'alaala_session=session-b').expect(200);
    expect(response.body.data.playlists).toHaveLength(1);
    expect(response.body.data.playlists[0]).toMatchObject({ id: 'playlist-b', youtubePlaylistId: 'PL1234567890abc', title: 'Saved playlist' });
    expect(db.playlistFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { ownerId: 'owner-b' } }));
  });

  it('requires authentication to retrieve playlists', async () => {
    await request(app()).get('/api/files/playlists').expect(401);
    expect(db.playlistFindMany).not.toHaveBeenCalled();
  });

  it('logs playlist database failures with a request ID without exposing internals', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    db.playlistFindMany.mockRejectedValue(new Error('private database diagnostic'));
    try {
      const response = await request(app()).get('/api/files/playlists').set('Cookie', 'alaala_session=session-a').expect(500);
      expect(response.body.error).toMatchObject({ code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' });
      expect(response.body.error.requestId).toBe(response.headers['x-request-id']);
      expect(JSON.stringify(response.body)).not.toContain('private database diagnostic');
      expect(log).toHaveBeenCalledWith(expect.stringContaining(response.body.error.requestId));
    } finally {
      log.mockRestore();
    }
  });

  it('rejects a thirty-first YouTube item for an owner', async () => {
    db.playlistCount.mockResolvedValue(30);
    const response = await request(app()).post('/api/files/playlists').set('Cookie', 'alaala_session=session-a').send({ url: 'https://youtube.com/playlist?list=PL1234567890abc' }).expect(409);
    expect(response.body.error.message).toContain('up to 30');
    expect(db.playlistCreate).not.toHaveBeenCalled();
  });

  it('rejects saving the same playlist twice for the same owner', async () => {
    db.playlistFindFirst.mockResolvedValue({ id: 'existing-playlist', ownerId: 'owner-a', youtubePlaylistId: 'PL1234567890abc' });
    const response = await request(app()).post('/api/files/playlists').set('Cookie', 'alaala_session=session-a').send({ url: 'https://www.youtube.com/playlist?list=PL1234567890abc' }).expect(409);
    expect(response.body.error.message).toBe('Already added.');
    expect(db.playlistFindFirst).toHaveBeenCalledWith({ where: { ownerId: 'owner-a', youtubePlaylistId: 'PL1234567890abc' } });
    expect(db.playlistCreate).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('stores only the parsed YouTube playlist ID and uses that ID for oEmbed lookup', async () => {
    db.playlistCount.mockResolvedValue(0);
    db.playlistCreate.mockImplementation(({ data }: { data: Record<string, unknown> }) => Promise.resolve({ id: 'playlist-a', ...data, createdAt: new Date('2026-01-01T00:00:00.000Z') }));
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ title: 'A playlist title' }) });
    vi.stubGlobal('fetch', fetchMock);
    const response = await request(app()).post('/api/files/playlists').set('Cookie', 'alaala_session=session-a').send({ url: 'https://youtube.com/watch?v=video123&list=PL1234567890abc' }).expect(201);
    expect(response.body.data.playlist.title).toBe('A playlist title');
    expect(db.playlistCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ ownerId: 'owner-a', youtubePlaylistId: 'PL1234567890abc', title: 'A playlist title' }) });
    expect(db.playlistCreate.mock.calls[0]?.[0].data.url).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining(encodeURIComponent('https://www.youtube.com/playlist?list=PL1234567890abc')), expect.any(Object));
  });

  it('accepts the legacy playlist-only URL payload and adds a video with its start time', async () => {
    db.playlistCount.mockResolvedValue(0);
    db.playlistCreate.mockImplementation(({ data }: { data: Record<string, unknown> }) => Promise.resolve({ id: 'video-a', ...data, createdAt: new Date() }));
    const response = await request(app()).post('/api/files/playlists').set('Cookie', 'alaala_session=session-a').send({ url: 'https://youtu.be/abcdefghijk?t=1m30s' }).expect(201);
    expect(response.body.data.playlist).toMatchObject({ kind: 'video', youtubePlaylistId: null, youtubeVideoId: 'abcdefghijk', startSeconds: 90 });
    expect(db.playlistCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ kind: 'video', youtubePlaylistId: null, youtubeVideoId: 'abcdefghijk', startSeconds: 90 }) });
  });

  it('saves the playlist with a fallback title when YouTube oEmbed is unavailable', async () => {
    db.playlistCount.mockResolvedValue(0);
    db.playlistCreate.mockImplementation(({ data }: { data: Record<string, unknown> }) => Promise.resolve({ id: 'playlist-a', ...data, createdAt: new Date('2026-01-01T00:00:00.000Z') }));
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('YouTube unavailable')));
    const response = await request(app()).post('/api/files/playlists').set('Cookie', 'alaala_session=session-a').send({ url: 'https://youtu.be/abcdefghijk?list=PL1234567890abc&feature=share' }).expect(201);
    expect(response.body.data.playlist).toMatchObject({ ownerId: 'owner-a', youtubePlaylistId: 'PL1234567890abc', title: 'YouTube playlist' });
    expect(db.playlistCreate).toHaveBeenCalledTimes(1);
  });

  it('rejects unsupported YouTube URL paths without writing', async () => {
    await request(app()).post('/api/files/playlists').set('Cookie', 'alaala_session=session-a').send({ url: 'https://youtube.com/channel/abcdefghijk' }).expect(422);
    expect(db.playlistCreate).not.toHaveBeenCalled();
  });

  it('requires authentication and validates metadata input', async () => {
    await request(app()).get('/api/files').expect(401);
    await request(app()).post('/api/files').set('Cookie', 'alaala_session=session-a').send({ driveFileId: 'id', name: 'virus.exe', mime: 'application/x-msdownload', size: 10, category: 'document' }).expect(422);
  });
});
