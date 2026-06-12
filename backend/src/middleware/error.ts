import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/errors.js';

/** Catch-all for unknown routes -> consistent 404 envelope. */
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` },
  });
}

/** Central error handler. Converts AppErrors and unknowns into the JSON envelope. */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // next is required for Express to treat this as an error handler.
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }

  // Unexpected errors: log server-side, return a generic envelope.
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
  });
}
