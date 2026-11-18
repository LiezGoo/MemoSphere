import type { RequestHandler } from 'express';
import { RateLimitError } from '../exceptions/index.js';

type RateLimitOptions = { windowMs: number; max: number; key?: (request: Parameters<RequestHandler>[0]) => string };

export function createRateLimiter({ windowMs, max, key = (request) => request.ip ?? 'unknown' }: RateLimitOptions): RequestHandler {
  const attempts = new Map<string, { count: number; resetAt: number }>();
  return (request, response, next) => {
    const bucket = key(request);
    const now = Date.now();
    const current = attempts.get(bucket);
    const record = !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
    record.count += 1;
    attempts.set(bucket, record);
    if (record.count > max) {
      response.setHeader('Retry-After', Math.ceil((record.resetAt - now) / 1000));
      next(new RateLimitError());
      return;
    }
    next();
  };
}