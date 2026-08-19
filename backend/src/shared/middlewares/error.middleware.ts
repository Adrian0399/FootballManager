import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../errors/api-error.js';
import { env } from '../../config/env.js';
import { fail } from '../utils/response.util.js';

export function notFoundHandler(req: Request, res: Response): void {
  fail(res, 404, 'NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found`);
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ApiError) {
    fail(res, err.statusCode, err.code ?? 'API_ERROR', err.message);
    return;
  }

  if (err instanceof ZodError) {
    fail(
      res,
      400,
      'VALIDATION_ERROR',
      'Invalid request payload',
      err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    );
    return;
  }

  console.error('Unhandled error:', err);
  fail(
    res,
    500,
    'INTERNAL_ERROR',
    env.NODE_ENV === 'production'
      ? 'Internal server error'
      : (err as Error)?.message ?? 'Unknown error',
  );
}