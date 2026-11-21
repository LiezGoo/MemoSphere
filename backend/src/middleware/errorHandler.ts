import type { ErrorRequestHandler } from 'express';
import { AppError } from '../exceptions/index.js';

export const errorHandler: ErrorRequestHandler = (error, request, response, next) => {
  void next;
  const requestId = String(response.locals.requestId ?? 'unassigned');
  if (error instanceof AppError) {
    response.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message, requestId } });
    return;
  }

  if (typeof error === 'object' && error !== null && 'type' in error && error.type === 'entity.parse.failed') {
    response.status(400).json({ success: false, error: { code: 'INVALID_JSON', message: 'Request body must contain valid JSON.', requestId } });
    return;
  }

  const diagnostic = typeof error === 'object' && error !== null
    ? Object.fromEntries(['code', 'clientVersion'].filter((key) => key in error).map((key) => [key, (error as Record<string, unknown>)[key]]))
    : {};
  const details = error instanceof Error
    ? { name: error.name, message: error.message, stack: error.stack, ...diagnostic }
    : { name: typeof error, message: String(error), ...diagnostic };
  console.error(JSON.stringify({ level: 'error', requestId, route: `${request.method} ${request.originalUrl.split('?')[0]}`, error: details }));
  response.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred.',
      requestId,
    },
  });
};
