import { Router } from 'express';
import { InputValidationError, RequestEntityTooLarge, ResourceNotFound } from '../../exceptions/index.js';
import { authenticateUser } from '../../middleware/authenticateUser.js';
import { createRateLimiter } from '../../middleware/rateLimiter.js';
import type { AuthService } from '../auth/auth.types.js';
import { prisma } from '../../config/prisma.js';
import { createPhotoUploadSignature, deleteCloudinaryAsset, signedCloudinaryUrl, verifyCloudinaryAsset } from './cloudinary.js';

export function createPhotoRouter(authService: AuthService) {
  const router = Router();
  router.use(authenticateUser(authService));
  router.post('/upload-signature', createRateLimiter({ windowMs: 60_000, max: 12 }), async (request, response, next) => {
    try {
      const count = request.body?.count;
      if (!Number.isInteger(count) || count < 1 || count > 5) throw new InputValidationError('Select between 1 and 5 photos.');
      response.json({ success: true, data: createPhotoUploadSignature(request.authenticatedUserId!, count) });
    } catch (error) { next(error); }
  });
  router.post('/entries/:id/photos', async (request, response, next) => {
    try {
      const entry = await prisma.diaryEntry.findFirst({ where: { id: request.params.id, owner: { userId: request.authenticatedUserId! }, status: { not: 'DELETED' } }, select: { id: true, ownerId: true } });
      if (!entry) throw new ResourceNotFound('Diary entry not found.');
      const ids = request.body?.publicIds;
      if (!Array.isArray(ids) || ids.length < 1 || ids.length > 5) throw new InputValidationError('Provide between 1 and 5 photos.');
      const existing = await prisma.entryPhoto.count({ where: { entryId: entry.id } });
      if (existing + ids.length > 5) throw new RequestEntityTooLarge('An entry can contain at most 5 photos.');
      const assets = await Promise.all(ids.map((id: unknown) => typeof id === 'string' ? verifyCloudinaryAsset(request.authenticatedUserId!, id) : Promise.reject(new InputValidationError('Invalid photo ID.'))));
      const photos = await prisma.$transaction(assets.map((asset, index) => prisma.entryPhoto.create({ data: { entryId: entry.id, ownerId: entry.ownerId, cloudinaryPublicId: asset.public_id, width: asset.width, height: asset.height, bytes: asset.bytes, position: existing + index } })));
      response.status(201).json({ success: true, data: { photos: photos.map((photo) => ({ ...photo, thumbnailUrl: signedCloudinaryUrl(photo.cloudinaryPublicId, 'c_fill,w_480,h_480,q_auto,f_auto'), fullUrl: signedCloudinaryUrl(photo.cloudinaryPublicId, 'c_limit,w_2000,h_2000,q_auto,f_auto') })) } });
    } catch (error) { next(error); }
  });
  router.delete('/photos/:id', async (request, response, next) => {
    try {
      const photo = await prisma.entryPhoto.findFirst({
        where: { id: request.params.id, entry: { owner: { userId: request.authenticatedUserId! }, status: { not: 'DELETED' } } },
      });
      if (!photo) throw new ResourceNotFound('Photo not found.');
      await deleteCloudinaryAsset(photo.cloudinaryPublicId);
      await prisma.entryPhoto.delete({ where: { id: photo.id } });
      response.status(204).send();
    } catch (error) { next(error); }
  });
  router.delete('/photos/unattached', async (request, response, next) => {
    try {
      const publicId = request.body?.publicId;
      if (typeof publicId !== 'string' || !publicId.trim()) throw new InputValidationError('A photo ID is required.');
      const asset = await verifyCloudinaryAsset(request.authenticatedUserId!, publicId);
      await deleteCloudinaryAsset(asset.public_id);
      response.status(204).send();
    } catch (error) { next(error); }
  });
  return router;
}
