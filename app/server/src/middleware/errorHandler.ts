/**
 * 全局错误处理中间件
 *
 * 统一处理所有错误，返回标准化响应格式
 */

import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/classes.js';
import { logger, LOG_CATEGORIES } from '../logging/index.js';

/** 获取请求 ID */
function getRequestId(req: Request): string {
  return (req as Request & { requestId?: string }).requestId || 'unknown';
}

 /** 构建错误响应 */
function buildErrorResponse(requestId: string, error: object): object {
  return { error, requestId, timestamp: Date.now() };
}

/**
 * 错误处理中间件
 *
 * 处理流程：
 * 1. 识别错误类型
 * 2. 记录错误日志
 * 3. 返回标准化响应
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const requestId = getRequestId(req);
  const isProd = process.env.NODE_ENV === 'production';

  // 处理已知的应用错误
  if (err instanceof AppError) {
    logger.warn(LOG_CATEGORIES.HTTP_ERROR, err.message, {
      requestId,
      code: err.code,
      statusCode: err.statusCode,
      details: err.details,
      path: req.path,
      method: req.method
    });

    res.status(err.statusCode).json(buildErrorResponse(requestId, err.toJSON()));
    return;
  }

  // 处理未知的系统错误
  logger.error(LOG_CATEGORIES.ERROR, '未处理的系统错误', {
    requestId,
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  const errorBody = {
    code: 'INTERNAL_error',
    message: isProd ? '服务器内部错误' : err.message,
    ...(!isProd && { stack: err.stack })
  };

  res.status(500).json(buildErrorResponse(requestId, errorBody));
};

/** 404 处理中间件 - 用于捕获未匹配的路由 */
export const notFoundHandler = (
  req: Request,
    res: Response,
    _next: NextFunction
): void => {
  const requestId = getRequestId(req);

  logger.debug(LOG_CATEGORIES.HTTP_REQUEST, '路由未找到', {
    requestId,
    path: req.path,
    method: req.method
  });

  res.status(404).json(buildErrorResponse(requestId, {
    code: 'NOT_FOUND',
    message: `路由 ${req.method} ${req.path} 不存在`
  }));
};

/** 异步路由包装器 - 自动捕获异步错误并传递给错误处理中间件 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
