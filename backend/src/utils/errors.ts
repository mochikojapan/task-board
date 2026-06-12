/**
 * A typed application error. Anything thrown as an AppError is turned into a
 * consistent JSON envelope: { error: { code, message } }.
 */
export class AppError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const Errors = {
  validation: (message: string) =>
    new AppError(400, 'VALIDATION_ERROR', message),
  unauthorized: (message = 'Authentication required') =>
    new AppError(401, 'UNAUTHORIZED', message),
  invalidCredentials: () =>
    new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect'),
  notFound: (resource = 'Resource') =>
    new AppError(404, 'NOT_FOUND', `${resource} not found`),
  internal: (message = 'Something went wrong') =>
    new AppError(500, 'INTERNAL_ERROR', message),
};
