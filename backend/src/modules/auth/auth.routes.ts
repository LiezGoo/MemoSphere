import { Router } from 'express';
import { environment } from '../../config/environment.js';
import { authenticateUser } from '../../middleware/authenticateUser.js';
import { verifySameOrigin } from '../../middleware/csrfOrigin.js';
import { createRateLimiter } from '../../middleware/rateLimiter.js';
import type { AuthService } from './auth.types.js';
import { createAuthController } from './auth.controller.js';

export function createAuthRouter(authService: AuthService): Router {
  const router = Router();
  const controller = createAuthController(authService);
  const rateLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: environment.NODE_ENV === 'test' ? 1000 : 10 });
  router.post('/register', rateLimiter, verifySameOrigin, controller.register);
  router.post('/login', rateLimiter, verifySameOrigin, controller.login);
  router.post('/logout', verifySameOrigin, controller.logout);
  router.get('/me', authenticateUser(authService), controller.me);
  return router;
}