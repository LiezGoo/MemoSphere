import type { NextFunction, Request, Response } from 'express';
import { InputValidationError, RequestValidationError } from '../../exceptions/index.js';
import { clearSessionCookie, readSessionCookie, setSessionCookie } from '../../utils/cookies.js';
import { loginSchema, registerSchema } from './auth.validation.js';
import type { AuthService } from './auth.types.js';
import { createNotification } from '../../utils/notifications.js';

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
        if (!parsed.success) throw new InputValidationError(parsed.error.issues[0]?.message ?? 'Invalid login data.');
        const result = await authService.login(parsed.data);
        setSessionCookie(response, result.sessionToken, result.expiresAt);
        void createNotification({ userId: result.user.id, type: 'SECURITY', title: 'New sign-in to MemoSphere', body: 'Your account was just accessed with your password.' }).catch((error: unknown) => {
          const details = error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { name: typeof error, message: String(error) };
          console.error(JSON.stringify({ level: 'error', requestId: response.locals.requestId ?? 'unassigned', route: 'POST /api/auth/login', operation: 'security_notification', error: details }));
        });
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
