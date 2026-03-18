// app/server/src/core/errors/AuthError.ts
import { AppError } from './AppError';

export class AuthError extends AppError {
  constructor(message: string, code: string = 'AUTH_ERROR') {
    super(message, code, 401);
    this.name = 'AuthError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = '权限不足') {
    super(message, 'FORBIDDEN', 403);
    this.name = 'ForbiddenError';
  }
}
