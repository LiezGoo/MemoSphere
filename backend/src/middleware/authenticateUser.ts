import type { RequestHandler } from 'express';
import { UnauthorizedError } from '../exceptions/index.js';
import { readSessionCookie } from '../utils/cookies.js';
import type { AuthService } from '../modules/auth/auth.types.js';

export function authenticateUser(authService: AuthService): RequestHandler {
  return async (request, _response, next) => {
    try {
      const user = await authService.getUserFromSession(readSessionCookie(request.get('cookie')));
      if (!user) {
        next(new UnauthorizedError('Authentication is required.'));
        return;
      }
      request.authenticatedUser = user;
      request.authenticatedUserId = user.id;
      next();
    } catch (error) {
      next(error);
    }
  };
}