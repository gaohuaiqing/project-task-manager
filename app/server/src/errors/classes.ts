/**
 * 错误处理类定义
 *
 * 统一的错误处理架构，支持：
 * - 标准化错误码
 * - HTTP 状态码映射
 * - 详细错误信息
 * - 错误链追踪
 */

/** 详情类型 */
type ErrorDetails = Record<string, unknown>;

/**
 * 基础应用错误 - 所有自定义错误的基类
 */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: ErrorDetails
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  /** 转换为 JSON 格式（用于 API 响应） */
  toJSON(): { code: string; message: string; details?: ErrorDetails; stack?: string } {
    const isDev = process.env.NODE_ENV === 'development';
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      ...(isDev && { stack: this.stack })
    };
  }
}

/** 验证错误 (400) - 请求参数验证失败 */
export class ValidationError extends AppError {
  constructor(message: string, details?: ErrorDetails) {
    super('VALIDATION_ERROR', message, 400, details);
  }
}

/** 认证错误 (401) - 身份验证失败 */
export class AuthenticationError extends AppError {
  constructor(code: string, message: string, details?: ErrorDetails) {
    super(code, message, 401, details);
  }
}

/** 授权错误 (403) - 权限不足 */
export class AuthorizationError extends AppError {
  constructor(message = '无权限执行此操作') {
    super('FORBIDDEN', message, 403);
  }
}

/** 资源不存在错误 (404) - 请求的资源不存在 */
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string | number) {
    const code = `${resource.toUpperCase().replace(/\s+/g, '_')}_NOT_FOUND`;
    super(code, `${resource}不存在`, 404, id ? { id } : undefined);
  }
}

/** 版本冲突错误 (409) - 乐观锁冲突 */
export class ConflictError extends AppError {
  constructor(message: string, details?: ErrorDetails) {
    super('VERSION_CONFLICT', message, 409, details);
  }
}

/** 业务逻辑错误 (422) - 业务规则验证失败 */
export class BusinessError extends AppError {
  constructor(code: string, message: string, details?: ErrorDetails) {
    super(code, message, 422, details);
  }
}

/** 速率限制错误 (429) - 请求过于频繁 */
export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    const details = retryAfter ? { retryAfter } : undefined;
    super('RATE_LIMIT_EXCEEDED', '请求过于频繁，请稍后重试', 429, details);
  }
}
