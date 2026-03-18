# 错误处理规范

> **文档版本**: 1.0
> **最后更新**: 2026-03-17
> **状态**: ✅ 完成

---

## 1. 错误分类

### 1.1 错误类型层级

```
AppError (基类)
├── ValidationError      # 验证错误 (400)
├── AuthenticationError  # 认证错误 (401)
├── AuthorizationError   # 授权错误 (403)
├── NotFoundError        # 资源不存在 (404)
├── ConflictError        # 资源冲突 (409)
├── BusinessError        # 业务逻辑错误 (422)
└── SystemError          # 系统错误 (500)
```

### 1.2 错误码规范

**格式**: `{模块}_{类型}_{具体错误}`

| 模块 | 前缀 | 示例 |
|------|------|------|
| 认证 | AUTH | AUTH_LOGIN_RATE_LIMITED |
| 用户 | USER | USER_NOT_FOUND |
| 项目 | PROJ | PROJ_CODE_DUPLICATE |
| 任务 | TASK | TASK_VERSION_CONFLICT |
| 成员 | MEMBER | MEMBER_ALREADY_EXISTS |
| 系统 | SYS | SYS_DATABASE_ERROR |

---

## 2. 统一响应格式

### 2.1 错误响应结构

```typescript
interface ErrorResponse {
  error: {
    code: string;           // 错误码（机器可读）
    message: string;        // 错误消息（用户可读）
    details?: Record<string, unknown>;  // 详细信息
    stack?: string;         // 堆栈（仅开发环境）
  };
  requestId: string;        // 请求追踪ID
  timestamp: number;        // 时间戳
}
```

### 2.2 HTTP状态码映射

| 状态码 | 含义 | 使用场景 |
|--------|------|---------|
| 200 | OK | 成功响应 |
| 201 | Created | 资源创建成功 |
| 204 | No Content | 删除成功（无返回体） |
| 400 | Bad Request | 请求参数错误、验证失败 |
| 401 | Unauthorized | 未登录、会话过期 |
| 403 | Forbidden | 无权限执行操作 |
| 404 | Not Found | 资源不存在 |
| 409 | Conflict | 版本冲突、唯一约束冲突 |
| 422 | Unprocessable Entity | 业务规则校验失败 |
| 429 | Too Many Requests | 请求频率超限 |
| 500 | Internal Server Error | 服务器内部错误 |
| 503 | Service Unavailable | 服务暂时不可用 |

---

## 3. 错误码定义

### 3.1 认证模块 (AUTH)

| 错误码 | HTTP | 说明 | 用户提示 |
|--------|------|------|----------|
| AUTH_LOGIN_FAILED | 401 | 登录失败 | 用户名或密码错误 |
| AUTH_LOGIN_RATE_LIMITED | 429 | 登录尝试过多 | 登录尝试次数过多，请{lock_until}后再试 |
| AUTH_ACCOUNT_LOCKED | 403 | 账户锁定 | 账户已被锁定，请联系管理员 |
| AUTH_ACCOUNT_DISABLED | 403 | 账户禁用 | 账户已被禁用 |
| AUTH_SESSION_EXPIRED | 401 | 会话过期 | 会话已过期，请重新登录 |
| AUTH_IP_CHANGED | 401 | IP变更 | 检测到IP变更，请重新登录 |
| AUTH_PASSWORD_MISMATCH | 400 | 密码不匹配 | 原密码错误 |
| AUTH_PASSWORD_WEAK | 400 | 密码强度不足 | 密码不符合安全要求 |

### 3.2 用户模块 (USER)

| 错误码 | HTTP | 说明 | 用户提示 |
|--------|------|------|----------|
| USER_NOT_FOUND | 404 | 用户不存在 | 用户不存在 |
| USER_USERNAME_EXISTS | 409 | 用户名已存在 | 工号已被使用 |
| USER_EMAIL_EXISTS | 409 | 邮箱已存在 | 邮箱已被使用 |

### 3.3 项目模块 (PROJ)

| 错误码 | HTTP | 说明 | 用户提示 |
|--------|------|------|----------|
| PROJ_NOT_FOUND | 404 | 项目不存在 | 项目不存在 |
| PROJ_CODE_EXISTS | 409 | 项目代号已存在 | 项目代号已被使用 |
| PROJ_VERSION_CONFLICT | 409 | 版本冲突 | 数据已被其他用户修改，请刷新后重试 |
| PROJ_HAS_TASKS | 422 | 项目下有任务 | 项目下存在任务，无法删除 |
| PROJ_DATE_INVALID | 400 | 日期无效 | 结束日期必须晚于开始日期 |

### 3.4 任务模块 (TASK)

| 错误码 | HTTP | 说明 | 用户提示 |
|--------|------|------|----------|
| TASK_NOT_FOUND | 404 | 任务不存在 | 任务不存在 |
| TASK_VERSION_CONFLICT | 409 | 版本冲突 | 数据已被其他用户修改，请刷新后重试 |
| TASK_CIRCULAR_DEPENDENCY | 422 | 循环依赖 | 不能创建循环依赖 |
| TASK_SELF_DEPENDENCY | 422 | 自依赖 | 不能将任务自身作为前置任务 |
| TASK_PREDECESSOR_NOT_FOUND | 400 | 前置任务不存在 | 指定的WBS编号不存在 |
| TASK_WBS_LEVEL_EXCEEDED | 400 | 等级超限 | WBS等级不能超过10级 |
| TASK_DATE_INVALID | 400 | 日期无效 | 结束日期必须晚于开始日期 |
| TASK_DURATION_INVALID | 400 | 工期无效 | 工期必须大于0 |
| TASK_HAS_CHILDREN | 422 | 有子任务 | 任务下存在子任务，无法删除 |

### 3.5 成员模块 (MEMBER)

| 错误码 | HTTP | 说明 | 用户提示 |
|--------|------|------|----------|
| MEMBER_NOT_FOUND | 404 | 成员不存在 | 成员不存在 |
| MEMBER_ALREADY_EXISTS | 409 | 成员已存在 | 该成员已在项目中 |
| MEMBER_HAS_TASKS | 422 | 成员有任务 | 成员有未完成的任务，无法移除 |

### 3.6 系统模块 (SYS)

| 错误码 | HTTP | 说明 | 用户提示 |
|--------|------|------|----------|
| SYS_DATABASE_ERROR | 500 | 数据库错误 | 系统繁忙，请稍后重试 |
| SYS_CACHE_ERROR | 500 | 缓存错误 | 系统繁忙，请稍后重试 |
| SYS_EXTERNAL_ERROR | 502 | 外部服务错误 | 外部服务暂时不可用 |
| SYS_TIMEOUT | 504 | 请求超时 | 请求超时，请稍后重试 |

---

## 4. 后端实现

### 4.1 错误类定义

```typescript
// app/server/src/errors/index.ts

/** 基础应用错误 */
export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/** 验证错误 */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, 400, details);
  }
}

/** 认证错误 */
export class AuthenticationError extends AppError {
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(code, message, 401, details);
  }
}

/** 授权错误 */
export class AuthorizationError extends AppError {
  constructor(message: string = '无权限执行此操作') {
    super('FORBIDDEN', message, 403);
  }
}

/** 资源不存在错误 */
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string | number) {
    super(
      `${resource.toUpperCase()}_NOT_FOUND`,
      `${resource}不存在`,
      404,
      id ? { id } : undefined
    );
  }
}

/** 版本冲突错误 */
export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VERSION_CONFLICT', message, 409, details);
  }
}

/** 业务逻辑错误 */
export class BusinessError extends AppError {
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(code, message, 422, details);
  }
}
```

### 4.2 错误处理中间件

```typescript
// app/server/src/middleware/errorHandler.ts

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors';
import { logger } from '../logging';
import { v4 as uuidv4 } from 'uuid';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // 生成请求ID
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();

  // 判断是否为已知错误
  if (err instanceof AppError) {
    logger.warn({
      requestId,
      code: err.code,
      message: err.message,
      details: err.details,
      path: req.path,
      method: req.method
    });

    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
      },
      requestId,
      timestamp: Date.now()
    });
  }

  // 未知错误
  logger.error({
    requestId,
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query
  });

  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? '服务器内部错误'
        : err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    },
    requestId,
    timestamp: Date.now()
  });
};
```

### 4.3 请求ID中间件

```typescript
// app/server/src/middleware/requestId.ts

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
};

// 扩展 Request 类型
declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}
```

---

## 5. 前端错误处理

### 5.1 API 错误处理

```typescript
// app/src/services/api.ts

import { useToast } from '@/components/ui/use-toast';

interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

class ApiClient {
  private async request<T>(
    method: string,
    url: string,
    data?: unknown
  ): Promise<T> {
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Id': this.generateRequestId()
        },
        body: data ? JSON.stringify(data) : undefined,
        credentials: 'include'
      });

      if (!response.ok) {
        const error: ApiError = await response.json();
        throw new ApiClientError(error, response.status);
      }

      return response.json();
    } catch (error) {
      if (error instanceof ApiClientError) {
        throw error;
      }
      throw new ApiClientError(
        { code: 'NETWORK_ERROR', message: '网络错误，请检查网络连接' },
        0
      );
    }
  }

  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export class ApiClientError extends Error {
  constructor(
    public readonly error: ApiError,
    public readonly statusCode: number
  ) {
    super(error.message);
    this.name = 'ApiClientError';
  }
}
```

### 5.2 全局错误处理 Hook

```typescript
// app/src/hooks/useApiError.ts

import { useToast } from '@/components/ui/use-toast';
import { ApiClientError } from '@/services/api';
import { useNavigate } from 'react-router-dom';

export const useApiError = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleError = (error: unknown) => {
    if (error instanceof ApiClientError) {
      switch (error.statusCode) {
        case 401:
          // 未登录，跳转登录页
          toast({
            variant: 'destructive',
            title: '登录已过期',
            description: '请重新登录'
          });
          navigate('/login');
          break;

        case 403:
          toast({
            variant: 'destructive',
            title: '无权限',
            description: error.error.message
          });
          break;

        case 409:
          // 版本冲突，提示刷新
          toast({
            variant: 'warning',
            title: '数据冲突',
            description: error.error.message
          });
          break;

        default:
          toast({
            variant: 'destructive',
            title: '操作失败',
            description: error.error.message
          });
      }
    } else {
      toast({
        variant: 'destructive',
        title: '系统错误',
        description: '请稍后重试'
      });
    }
  };

  return { handleError };
};
```

### 5.3 表单验证错误处理

```typescript
// app/src/components/shared/FormErrorHandler.tsx

interface FieldError {
  field: string;
  message: string;
}

interface ValidationErrorsProps {
  errors: FieldError[];
}

export const ValidationErrors: React.FC<ValidationErrorsProps> = ({ errors }) => {
  if (!errors.length) return null;

  return (
    <div className="rounded-md bg-red-50 p-4 mb-4">
      <div className="flex">
        <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">
            请修正以下错误：
          </h3>
          <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
            {errors.map((error, index) => (
              <li key={index}>{error.message}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
```

---

## 6. 错误日志记录

### 6.1 日志格式

```typescript
interface ErrorLog {
  timestamp: string;        // ISO 8601
  level: 'error' | 'warn';
  requestId: string;
  code: string;
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
  context: {
    userId?: number;
    ip: string;
    method: string;
    path: string;
    userAgent: string;
  };
}
```

### 6.2 日志示例

```json
{
  "timestamp": "2026-03-17T10:30:00.000Z",
  "level": "error",
  "requestId": "1703171030000-a1b2c3d4",
  "code": "TASK_VERSION_CONFLICT",
  "message": "数据已被其他用户修改，请刷新后重试",
  "details": {
    "currentVersion": 5,
    "providedVersion": 4
  },
  "context": {
    "userId": 1,
    "ip": "192.168.1.100",
    "method": "PUT",
    "path": "/api/wbs-tasks/v2/task-001",
    "userAgent": "Mozilla/5.0..."
  }
}
```

---

## 相关文档

- [日志规范](./LOGGING.md)
- [API规范设计](../API_SPECIFICATION.md)

---

## 变更历史

| 日期 | 版本 | 变更内容 |
|------|------|----------|
| 2026-03-17 | 1.0 | 初始版本 |
