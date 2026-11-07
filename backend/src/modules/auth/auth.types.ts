import type { AccountStatus } from '@prisma/client';

export type RegisterInput = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type SafeUser = {
  id: string;
  fullName: string;
  email: string;
  accountStatus: AccountStatus;
  createdAt: Date;
};

export type AuthResult = {
  user: SafeUser;
  sessionToken: string;
  expiresAt: Date;
};

export type AuthService = {
  register(input: RegisterInput): Promise<SafeUser>;
  login(input: LoginInput): Promise<AuthResult>;
  logout(sessionToken: string | undefined): Promise<void>;
  getUserFromSession(sessionToken: string | undefined): Promise<SafeUser | null>;
};