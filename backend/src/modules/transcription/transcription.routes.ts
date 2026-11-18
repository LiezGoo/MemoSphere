import { Router, type RequestHandler } from 'express';
import multer from 'multer';
import { environment } from '../../config/environment.js';
import { InputValidationError, RequestEntityTooLarge, UnsupportedMediaTypeError } from '../../exceptions/index.js';
import { authenticateUser } from '../../middleware/authenticateUser.js';
import { createRateLimiter } from '../../middleware/rateLimiter.js';
import type { AuthService } from '../auth/auth.types.js';
import { transcribeAudio } from './transcription.provider.js';

const acceptedMimeTypes = new Set(['audio/mp4', 'audio/m4a', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm']);
const acceptedExtensions: Record<string, Set<string>> = {
  'audio/mp4': new Set(['.mp4', '.m4a']),
  'audio/m4a': new Set(['.m4a']),
  'audio/mpeg': new Set(['.mp3']),
  'audio/ogg': new Set(['.oga', '.ogg']),
  'audio/wav': new Set(['.wav']),
  'audio/webm': new Set(['.webm']),
};
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: environment.TRANSCRIPTION_MAX_FILE_SIZE_MB * 1024 * 1024, files: 1, fields: 1 },
  fileFilter: (_request, file, callback) => {
    const mimeType = file.mimetype.split(';', 1)[0].toLowerCase();
    if (!acceptedMimeTypes.has(mimeType)) {
      callback(new UnsupportedMediaTypeError('Unsupported audio format. Use WebM, MP4, WAV, OGG, or MP3.'));
      return;
    }
    const extension = file.originalname.slice(file.originalname.lastIndexOf('.')).toLowerCase();
    if (!acceptedExtensions[mimeType]?.has(extension)) {
      callback(new InputValidationError('The audio file extension does not match its media type.'));
      return;
    }
    callback(null, true);
  },
});

const handleUpload: RequestHandler = (request, response, next) => {
  upload.single('audio')(request, response, (error: unknown) => {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      next(new RequestEntityTooLarge(`Recording must be ${environment.TRANSCRIPTION_MAX_FILE_SIZE_MB} MB or smaller.`));
      return;
    }
    if (error instanceof multer.MulterError) {
      next(new InputValidationError('Upload one supported audio recording.'));
      return;
    }
    next(error);
  });
};

function hasValidSignature(buffer: Buffer, mimeType: string) {
  switch (mimeType) {
    case 'audio/webm': return buffer.length >= 4 && buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
    case 'audio/ogg': return buffer.length >= 4 && buffer.toString('ascii', 0, 4) === 'OggS';
    case 'audio/wav': return buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WAVE';
    case 'audio/mp4':
    case 'audio/m4a': return buffer.length >= 12 && buffer.toString('ascii', 4, 8) === 'ftyp';
    case 'audio/mpeg': return buffer.length >= 3 && (buffer.toString('ascii', 0, 3) === 'ID3' || (buffer[0] === 0xff && (buffer[1]! & 0xe0) === 0xe0));
    default: return false;
  }
}

function canonicalMimeType(mimeType: string) {
  if (mimeType === 'audio/m4a') return 'audio/mp4';
  return mimeType;
}

export function createTranscriptionRouter(authService: AuthService) {
  const router = Router();
  router.use(authenticateUser(authService));
  router.post(
    '/',
    createRateLimiter({ windowMs: 60 * 1000, max: 10, key: (request) => request.authenticatedUserId ?? request.ip ?? 'unknown' }),
    handleUpload,
    async (request, response, next) => {
      try {
        const file = request.file;
        if (!file) throw new InputValidationError('Choose an audio recording to transcribe.');
        if (file.size === 0) throw new InputValidationError('The audio recording is empty. Please record audio and try again.');

        const mimeType = file.mimetype.split(';', 1)[0].toLowerCase();
        if (!hasValidSignature(file.buffer, mimeType)) {
          throw new InputValidationError('This file does not appear to be a supported audio recording.');
        }

        const durationMs = Number(request.body.durationMs);
        if (!Number.isFinite(durationMs) || durationMs < 1000) {
          throw new InputValidationError('Recording is too short.');
        }
        if (durationMs > environment.TRANSCRIPTION_MAX_DURATION_SECONDS * 1000) {
          throw new InputValidationError(`Recording is too long (max ${Math.floor(environment.TRANSCRIPTION_MAX_DURATION_SECONDS / 60)} minutes).`);
        }

        const transcription = await transcribeAudio(file.buffer, canonicalMimeType(mimeType));
        response.json({ success: true, data: { transcription, durationSeconds: Math.ceil(durationMs / 1000) } });
      } catch (error) {
        next(error);
      }
    },
  );
  return router;
}
