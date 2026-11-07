import type { ErrorRequestHandler } from 'express';
import { environment } from '../config/environment.js';
import { AppError } from '../exceptions/index.js';

export const errorHandler: ErrorRequestHandler = (error, _request, response, next) => {
  void next;
  if (environment.NODE_ENV !== 'production' && !(error instanceof AppError)) console.error(error);
  if (error instanceof AppError) {
    response.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
    return;
  }

  response.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } });
};