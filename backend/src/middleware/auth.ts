import type { NextFunction, Request, Response } from 'express';
import { authService, type AuthTokenPayload } from '../services/authService.js';
import { Errors } from '../utils/errors.js';

// Attach the authenticated user to the request for downstream handlers.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(Errors.unauthorized('Missing bearer token'));
  }

  const token = header.slice('Bearer '.length).trim();
  req.user = authService.verify(token);
  next();
}
