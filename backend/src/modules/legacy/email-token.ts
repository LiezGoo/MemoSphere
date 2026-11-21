import { createHmac, randomBytes } from 'node:crypto';
import { environment } from '../../config/environment.js';

/** Stable across outbox retries so a provider idempotency key always has the same email body. */
export function createOutboxEmailToken(idempotencyKey: string) {
  const secret = environment.CRON_SECRET || environment.RESEND_API_KEY;
  if (!secret) return randomBytes(32).toString('base64url');
  return createHmac('sha256', secret).update(`memosphere-outbox-email:${idempotencyKey}`).digest('base64url');
}
