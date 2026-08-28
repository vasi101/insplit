import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/response';
import { env } from '../config/env';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorMiddleware(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode ?? 500;
  const message = statusCode >= 500 && env.nodeEnv === 'production'
    ? 'Internal server error'
    : (err.message ?? 'Internal server error');
  const code = err.code ?? 'INTERNAL_ERROR';

  if (env.nodeEnv === 'development') {
    console.error('❌ Error:', err);
  }

  res.status(statusCode).json(errorResponse(code, message));
}

export function notFoundMiddleware(req: Request, res: Response): void {
  res.status(404).json(errorResponse('NOT_FOUND', `Route ${req.method} ${req.path} not found`));
}

// Helper to create typed app errors
export function createError(message: string, statusCode = 500, code?: string): AppError {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}
