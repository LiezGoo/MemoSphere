import { Router } from 'express';
import { z } from 'zod';
import { InputValidationError } from '../../exceptions/index.js';
import { authenticateUser } from '../../middleware/authenticateUser.js';
import { verifySameOrigin } from '../../middleware/csrfOrigin.js';
import { createRateLimiter } from '../../middleware/rateLimiter.js';
import type { AuthService } from '../auth/auth.types.js';
import { createUserFile, createUserPlaylist, deleteUserFile, deleteUserPlaylist, listUserFiles, listUserPlaylists, renameUserFile, renameUserPlaylist } from './files.service.js';
import { fileCreateSchema, fileUpdateSchema, playlistCreateSchema, playlistUpdateSchema } from './files.validation.js';

const fileCategorySchema = z.enum(['photo', 'document', 'credential']);
const idSchema = z.string().trim().min(1).max(191);
const readLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 120, key: (request) => request.authenticatedUserId ?? request.ip ?? 'unknown' });
const writeLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 60, key: (request) => request.authenticatedUserId ?? request.ip ?? 'unknown' });

export function createFilesRouter(authService: AuthService) {
  const router = Router();
  router.use(authenticateUser(authService));

  router.get('/', readLimit, async (request, response, next) => {
    try {
      const query = z.object({ category: fileCategorySchema.optional() }).strict().safeParse(request.query);
      if (!query.success) throw new InputValidationError('Choose a valid file category.');
      const files = await listUserFiles(request.authenticatedUserId!, query.data.category);
      response.json({ success: true, data: { files: files.map((file) => ({ ...file, size: file.size.toString() })) } });
    } catch (error) { next(error); }
  });

  router.post('/', verifySameOrigin, writeLimit, async (request, response, next) => {
    try {
      const parsed = fileCreateSchema.safeParse(request.body);
      if (!parsed.success) throw new InputValidationError('Check the file name, type, category, and size.');
      response.status(201).json({ success: true, data: { file: await createUserFile(request.authenticatedUserId!, parsed.data) } });
    } catch (error) { next(error); }
  });

  router.patch('/:id', verifySameOrigin, writeLimit, async (request, response, next) => {
    try {
      const id = idSchema.safeParse(request.params.id);
      const body = fileUpdateSchema.safeParse(request.body);
      if (!id.success || !body.success) throw new InputValidationError('Enter a valid file name.');
      response.json({ success: true, data: { file: await renameUserFile(request.authenticatedUserId!, id.data, body.data.name) } });
    } catch (error) { next(error); }
  });

  router.delete('/:id', verifySameOrigin, writeLimit, async (request, response, next) => {
    try {
      const id = idSchema.safeParse(request.params.id);
      if (!id.success) throw new InputValidationError('A valid file ID is required.');
      await deleteUserFile(request.authenticatedUserId!, id.data);
      response.status(204).end();
    } catch (error) { next(error); }
  });

  router.get('/playlists', readLimit, async (request, response, next) => {
    try { response.json({ success: true, data: { playlists: await listUserPlaylists(request.authenticatedUserId!) } }); }
    catch (error) { next(error); }
  });

  router.post('/playlists', verifySameOrigin, writeLimit, async (request, response, next) => {
    try {
      const parsed = playlistCreateSchema.safeParse(request.body);
      if (!parsed.success) throw new InputValidationError('Enter a valid YouTube playlist link.');
      response.status(201).json({ success: true, data: { playlist: await createUserPlaylist(request.authenticatedUserId!, parsed.data) } });
    } catch (error) { next(error); }
  });

  router.patch('/playlists/:id', verifySameOrigin, writeLimit, async (request, response, next) => {
    try {
      const id = idSchema.safeParse(request.params.id);
      const body = playlistUpdateSchema.safeParse(request.body);
      if (!id.success || !body.success) throw new InputValidationError('Enter a valid playlist title.');
      response.json({ success: true, data: { playlist: await renameUserPlaylist(request.authenticatedUserId!, id.data, body.data.title) } });
    } catch (error) { next(error); }
  });

  router.delete('/playlists/:id', verifySameOrigin, writeLimit, async (request, response, next) => {
    try {
      const id = idSchema.safeParse(request.params.id);
      if (!id.success) throw new InputValidationError('A valid playlist ID is required.');
      await deleteUserPlaylist(request.authenticatedUserId!, id.data);
      response.status(204).end();
    } catch (error) { next(error); }
  });

  return router;
}
