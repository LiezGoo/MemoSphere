import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  userFindUnique: vi.fn(), userUpdate: vi.fn(), userDelete: vi.fn(),
  notificationCount: vi.fn(), notificationFindMany: vi.fn(), notificationUpdateMany: vi.fn(), notificationFindFirst: vi.fn(), notificationDeleteMany: vi.fn(), notificationCreate: vi.fn(),
}));
vi.mock('../../config/prisma.js', () => ({ prisma: {
  user: { findUnique: db.userFindUnique, update: db.userUpdate, delete: db.userDelete },
  notification: { count: db.notificationCount, findMany: db.notificationFindMany, updateMany: db.notificationUpdateMany, findFirst: db.notificationFindFirst, deleteMany: db.notificationDeleteMany, create: db.notificationCreate },
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

beforeEach(() => { vi.clearAllMocks(); db.userFindUnique.mockResolvedValue({ notificationPreferences: { reminder: false } }); });

describe('notification ownership and validation', () => {
  it('scopes the notification list to the authenticated user', async () => {
    db.notificationFindMany.mockResolvedValue([]);
    await request(app()).get('/api/notifications').set('Cookie', 'alaala_session=session-a').expect(200);
    expect(db.notificationFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'user-a' } }));
  });

  it('does not let user A read or delete user B notifications', async () => {
    db.notificationUpdateMany.mockResolvedValue({ count: 0 });
    db.notificationDeleteMany.mockResolvedValue({ count: 0 });
    await request(app()).patch('/api/notifications/private-b/read').set('Cookie', 'alaala_session=session-a').expect(404);
    await request(app()).delete('/api/notifications/private-b').set('Cookie', 'alaala_session=session-a').expect(404);
    expect(db.notificationUpdateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'private-b', userId: 'user-a' } }));
    expect(db.notificationDeleteMany).toHaveBeenCalledWith({ where: { id: 'private-b', userId: 'user-a' } });
  });

  it('returns the authenticated user unread count', async () => {
    db.notificationCount.mockResolvedValue(4);
    const response = await request(app()).get('/api/notifications/unread-count').set('Cookie', 'alaala_session=session-a').expect(200);
    expect(response.body.data.count).toBe(4);
    expect(db.notificationCount).toHaveBeenCalledWith({ where: { userId: 'user-a', isRead: false } });
  });

  it('rejects invalid limits and unknown profile fields', async () => {
    await request(app()).get('/api/notifications?limit=999').set('Cookie', 'alaala_session=session-a').expect(422);
    await request(app()).patch('/api/profile').set('Cookie', 'alaala_session=session-a').send({ email: 'other@example.test' }).expect(422);
  });

  it('rejects avatar uploads above 2 MB', async () => {
    const response = await request(app()).post('/api/profile/avatar').set('Cookie', 'alaala_session=session-a')
      .attach('avatar', Buffer.alloc(2 * 1024 * 1024 + 1), { filename: 'avatar.png', contentType: 'image/png' }).expect(413);
    expect(response.body.error.message).toContain('2 MB');
  });
});
