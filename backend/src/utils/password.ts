import bcrypt from 'bcrypt';

const passwordWorkFactor = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, passwordWorkFactor);
}

export function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}