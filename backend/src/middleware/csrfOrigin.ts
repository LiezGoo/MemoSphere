import type { RequestHandler } from 'express';
import { environment } from '../config/environment.js';
import { AccessDenied } from '../exceptions/index.js';

export const verifySameOrigin: RequestHandler = (request, _response, next) => {
  const origin = request.get('origin');
  if (origin && origin !== environment.FRONTEND_URL) {
    next(new AccessDenied('The request origin is not allowed.'));
    return;
  }
  next();
};