import type { RequestHandler } from 'express';
import { RateLimitError } from '../exceptions/index.js';

type RateLimitOptions = { windowMs: number; max: number };

export function createRateLimiter({ windowMs, max }: RateLimitOptions): RequestHandler {
  const attempts = new Map<string, { count: number; resetAt: number }>();
  return (request, response, next) => {
    const key = request.ip ?? 'unknown';
    const now = Date.now();
    const current = attempts.get(key);
    const record = !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
    record.count += 1;
    attempts.set(key, record);
    if (record.count > max) {
      response.setHeader('Retry-After', Math.ceil((record.resetAt - now) / 1000));
      next(new RateLimitError());
      return;
    }
    next();
  };
}