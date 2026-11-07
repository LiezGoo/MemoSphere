import { ConflictError, UnauthorizedError } from '../../exceptions/index.js';
import { createSessionToken, hashSessionToken, sessionDurationMs } from '../../utils/cookies.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import type { AuthRepository } from './auth.repository.js';
import type { AuthResult, AuthService, LoginInput, RegisterInput, SafeUser } from './auth.types.js';

function toSafeUser(user: { id: string; fullName: string; email: string; accountStatus: SafeUser['accountStatus']; createdAt: Date }): SafeUser {
  return { id: user.id, fullName: user.fullName, email: user.email, accountStatus: user.accountStatus, createdAt: user.createdAt };
}

export function createAuthService(repository: AuthRepository, now: () => Date = () => new Date()): AuthService {
  return {
    async register(input: RegisterInput): Promise<SafeUser> {
      const existingUser = await repository.findUserByEmail(input.email);
      if (existingUser) throw new ConflictError('An account with that email already exists.');

      let user;
      try {
        user = await repository.createUserWithOwner({ fullName: input.fullName, email: input.email, passwordHash: await hashPassword(input.password), accountStatus: 'ACTIVE' });
      } catch (error) {
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') throw new ConflictError('An account with that email already exists.');
        throw error;
      }
      return toSafeUser(user);
    },

    async login(input: LoginInput): Promise<AuthResult> {
      const user = await repository.findUserByEmail(input.email);
      if (!user || user.accountStatus !== 'ACTIVE' || !(await verifyPassword(input.password, user.passwordHash))) throw new UnauthorizedError();

      const sessionToken = createSessionToken();
      const expiresAt = new Date(now().getTime() + sessionDurationMs);
      await repository.deleteExpiredSessions();
      await repository.createSession({ userId: user.id, tokenHash: hashSessionToken(sessionToken), expiresAt });
      return { user: toSafeUser(user), sessionToken, expiresAt };
    },

    async logout(sessionToken: string | undefined): Promise<void> {
      if (sessionToken) await repository.deleteSession(hashSessionToken(sessionToken));
    },

    async getUserFromSession(sessionToken: string | undefined): Promise<SafeUser | null> {
      if (!sessionToken) return null;
      const session = await repository.findSession(hashSessionToken(sessionToken));
      if (!session || session.expiresAt <= now() || session.user.accountStatus !== 'ACTIVE') {
        if (session) await repository.deleteSession(session.tokenHash);
        return null;
      }
      return toSafeUser(session.user);
    },
  };
}
