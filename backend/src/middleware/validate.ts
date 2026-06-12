import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodSchema } from 'zod';
import { Errors } from '../utils/errors.js';

type Source = 'body' | 'query' | 'params';

/** Formats zod issues into a single readable message. */
function formatZodError(error: ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.join('.');
      return path ? `${path}: ${issue.message}` : issue.message;
    })
    .join('; ');
}

/**
 * Validates and coerces a request segment against a schema, replacing it with
 * the parsed result so handlers receive clean, typed data.
 */
export function validate(schema: ZodSchema, source: Source = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req[source]);
      // req.query/params are read-only getters in Express 5-style setups, so we
      // stash the parsed value rather than reassigning the original object.
      (req as Record<string, unknown>)[`valid_${source}`] = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(Errors.validation(formatZodError(err)));
      }
      next(err);
    }
  };
}

export function validated<T>(req: Request, source: Source = 'body'): T {
  return (req as Record<string, unknown>)[`valid_${source}`] as T;
}
