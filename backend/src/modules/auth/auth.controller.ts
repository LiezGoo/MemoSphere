import type { NextFunction, Request, Response } from 'express';
import { RequestValidationError } from '../../exceptions/index.js';
import { clearSessionCookie, readSessionCookie, setSessionCookie } from '../../utils/cookies.js';
import { loginSchema, registerSchema } from './auth.validation.js';
import type { AuthService } from './auth.types.js';

export function createAuthController(authService: AuthService) {
  return {
    register: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const parsed = registerSchema.safeParse(request.body);
        if (!parsed.success) throw new RequestValidationError(parsed.error.issues[0]?.message ?? 'Invalid registration data.');
        const user = await authService.register(parsed.data);
        response.status(201).json({ success: true, data: { user } });
      } catch (error) { next(error); }
    },

    login: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const parsed = loginSchema.safeParse(request.body);
        if (!parsed.success) throw new RequestValidationError(parsed.error.issues[0]?.message ?? 'Invalid login data.');
        const result = await authService.login(parsed.data);
        setSessionCookie(response, result.sessionToken, result.expiresAt);
        response.json({ success: true, data: { user: result.user } });
      } catch (error) { next(error); }
    },

    logout: async (request: Request, response: Response, next: NextFunction) => {
      try {
        await authService.logout(readSessionCookie(request.get('cookie')));
        clearSessionCookie(response);
        response.json({ success: true, data: { message: 'Signed out successfully.' } });
      } catch (error) { next(error); }
    },

    me: (request: Request, response: Response) => {
      response.json({ success: true, data: { user: request.authenticatedUser } });
    },
  };
}