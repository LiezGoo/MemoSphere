import type { AccountStatus, PrismaClient } from '@prisma/client';

export function createAuthRepository(database: PrismaClient) {
  return {
    findUserByEmail: (email: string) => database.user.findUnique({ where: { email } }),
    createUserWithOwner: (data: { fullName: string; email: string; passwordHash: string; accountStatus: AccountStatus }) => database.$transaction(async (transaction) => {
      const user = await transaction.user.create({ data });
      await transaction.owner.create({ data: { userId: user.id, displayName: user.fullName } });
      return user;
    }),
    createSession: (data: { userId: string; tokenHash: string; expiresAt: Date }) => database.authSession.create({ data }),
    findSession: (tokenHash: string) => database.authSession.findUnique({ where: { tokenHash }, include: { user: true } }),
    deleteSession: (tokenHash: string) => database.authSession.deleteMany({ where: { tokenHash } }),
    deleteExpiredSessions: () => database.authSession.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
  };
}

export type AuthRepository = ReturnType<typeof createAuthRepository>;