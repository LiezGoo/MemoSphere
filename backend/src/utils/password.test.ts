import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password.js';

describe('password utilities', () => {
  it('hashes passwords and verifies only the original password', async () => {
    const hash = await hashPassword('CorrectPassword1');
    expect(hash).not.toBe('CorrectPassword1');
    expect(await verifyPassword('CorrectPassword1', hash)).toBe(true);
    expect(await verifyPassword('WrongPassword1', hash)).toBe(false);
  });
});