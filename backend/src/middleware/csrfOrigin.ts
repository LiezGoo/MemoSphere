import type { RequestHandler } from 'express';
import { environment } from '../config/environment.js';
import { AccessDenied } from '../exceptions/index.js';

export const verifySameOrigin: RequestHandler = (request, _response, next) => {
  const origin = request.get('origin');
  const allowedOrigins = new Set([
    environment.FRONTEND_URL,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    ...(environment.NODE_ENV !== 'production' ? ['http://localhost:3001', 'http://127.0.0.1:3001'] : []),
  ]);
  if (origin && !allowedOrigins.has(origin)) {
    next(new AccessDenied('The request origin is not allowed.'));
    return;
  }
  next();
};