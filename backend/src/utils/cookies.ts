import type { CookieOptions, Response } from 'express';
import { createHash, randomBytes } from 'node:crypto';
import { environment } from '../config/environment.js';

export const sessionCookieName = 'alaala_session';
export const sessionDurationMs = 7 * 24 * 60 * 60 * 1000;

function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: environment.NODE_ENV === 'production',
    sameSite: environment.AUTH_COOKIE_SAMESITE,
    path: '/',
  };
}

export function createSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function setSessionCookie(response: Response, token: string, expiresAt: Date): void {
  response.cookie(sessionCookieName, token, { ...cookieOptions(), expires: expiresAt });
}

export function clearSessionCookie(response: Response): void {
  response.clearCookie(sessionCookieName, cookieOptions());
}

export function readSessionCookie(cookieHeader: string | undefined): string | undefined {
  const value = cookieHeader?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${sessionCookieName}=`));
  return value ? decodeURIComponent(value.slice(sessionCookieName.length + 1)) : undefined;
}