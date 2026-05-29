import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { sendError } from '../utils/api-response.js';

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode = 400,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return sendError(res, err.errors.map((e) => e.message).join(', '), 422);
  }

  if (err instanceof AppError) {
    return sendError(res, err.message, err.statusCode);
  }

  console.error('[Error]', err);
  return sendError(res, 'Internal server error', 500);
}
