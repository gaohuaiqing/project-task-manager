/**
 * 请求ID中间件
 *
 * 为每个请求生成唯一ID，用于：
 * - 日志追踪
 * - 错误定位
 * - 请求链路分析
 */

import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/** 请求头名称 */
const REQUEST_ID_HEADER = 'x-request-id';

/**
 * 请求ID中间件
 *
 * 优先使用客户端传递的 X-Request-ID，否则生成新的 UUID
 */
export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const requestId = (req.headers[REQUEST_ID_HEADER] as string) || randomUUID();

  // 挂载到请求对象
  (req as Request & { requestId?: string }).requestId = requestId;

  // 设置响应头
  res.setHeader('X-Request-Id', requestId);

  next();
};

