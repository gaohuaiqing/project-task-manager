# 日志规范

> **文档版本**: 1.0
> **最后更新**: 2026-03-17
> **状态**: ✅ 完成

---

## 1. 日志框架

### 1.1 技术选型

| 组件 | 技术 | 说明 |
|------|------|------|
| 后端日志 | Pino | 高性能 JSON 日志库 |
| 前端日志 | Console API | 开发环境，生产环境可接入服务 |
| 日志存储 | 文件 + 控制台 | 内网部署无需远程日志服务 |

### 1.2 Pino 配置

```typescript
// app/server/src/logging/logger.ts

import pino from 'pino';
import path from 'path';
import fs from 'fs';

// 确保日志目录存在
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 创建日志实例
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label })
  },
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  } : undefined
});

// 文件输出流
const fileStream = pino.destination({
  dest: path.join(logDir, 'app.log'),
  sync: false,
  mkdir: true
});

// 多输出日志
export const fileLogger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
    timestamp: pino.stdTimeFunctions.isoTime
  },
  fileStream
);
```

---

## 2. 日志级别

### 2.1 级别定义

| 级别 | 数值 | 使用场景 | 示例 |
|------|:----:|----------|------|
| TRACE | 10 | 详细调试 | 进入函数、变量值 |
| DEBUG | 20 | 调试信息 | SQL查询、API调用参数 |
| INFO | 30 | 正常业务 | 用户登录、操作成功 |
| WARN | 40 | 警告信息 | 性能警告、即将废弃 |
| ERROR | 50 | 错误信息 | 异常、失败操作 |
| FATAL | 60 | 致命错误 | 服务无法启动 |

### 2.2 生产环境配置

```typescript
// 生产环境日志级别
const PROD_LOG_LEVELS = {
  api: 'info',      // API请求日志
  db: 'warn',       // 数据库日志
  auth: 'info',     // 认证日志
  business: 'info', // 业务日志
  system: 'warn'    // 系统日志
};

// 开发环境日志级别
const DEV_LOG_LEVELS = {
  api: 'debug',
  db: 'debug',
  auth: 'debug',
  business: 'debug',
  system: 'info'
};
```

---

## 3. 日志格式

### 3.1 标准日志结构

```typescript
interface LogEntry {
  // 基础字段
  timestamp: string;        // ISO 8601 格式
  level: string;            // 日志级别
  message: string;          // 日志消息

  // 请求上下文
  requestId?: string;       // 请求追踪ID

  // 业务上下文
  module?: string;          // 模块名
  action?: string;          // 操作名
  userId?: number;          // 用户ID

  // 详细信息
  data?: Record<string, unknown>;  // 业务数据
  error?: {
    code: string;
    message: string;
    stack?: string;
  };

  // 环境信息
  env?: string;             // 环境
  version?: string;         // 应用版本
}
```

### 3.2 日志示例

**成功操作日志**:
```json
{
  "timestamp": "2026-03-17T10:30:00.000Z",
  "level": "info",
  "message": "用户登录成功",
  "requestId": "1703171030000-a1b2c3d4",
  "module": "auth",
  "action": "login",
  "userId": 1,
  "data": {
    "username": "user001",
    "ip": "192.168.1.100"
  }
}
```

**错误日志**:
```json
{
  "timestamp": "2026-03-17T10:30:00.000Z",
  "level": "error",
  "message": "任务更新失败",
  "requestId": "1703171030000-e5f6g7h8",
  "module": "task",
  "action": "update",
  "userId": 1,
  "error": {
    "code": "TASK_VERSION_CONFLICT",
    "message": "数据已被其他用户修改",
    "stack": "Error: VERSION_CONFLICT\n    at updateTask..."
  },
  "data": {
    "taskId": "task-001",
    "providedVersion": 4,
    "currentVersion": 5
  }
}
```

---

## 4. 日志分类

### 4.1 API请求日志

```typescript
// 中间件：记录所有API请求
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] as string || generateRequestId();

  // 设置请求ID到响应头
  res.setHeader('X-Request-Id', requestId);

  // 请求开始日志
  logger.info({
    requestId,
    message: 'API请求开始',
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userId: req.user?.id
  });

  // 响应结束时记录
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    logger.info({
      requestId,
      message: 'API请求完成',
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id
    });

    // 慢请求警告
    if (duration > 1000) {
      logger.warn({
        requestId,
        message: '慢请求警告',
        duration: `${duration}ms`,
        path: req.path
      });
    }
  });

  next();
};
```

### 4.2 业务操作日志

```typescript
// 业务日志服务
class BusinessLogger {
  // 用户操作
  logUserAction(action: string, userId: number, details: Record<string, unknown>) {
    logger.info({
      module: 'user',
      action,
      userId,
      data: details,
      message: `用户操作: ${action}`
    });
  }

  // 项目操作
  logProjectAction(action: string, projectId: string, userId: number, details?: Record<string, unknown>) {
    logger.info({
      module: 'project',
      action,
      userId,
      data: { projectId, ...details },
      message: `项目操作: ${action}`
    });
  }

  // 任务操作
  logTaskAction(action: string, taskId: string, userId: number, details?: Record<string, unknown>) {
    logger.info({
      module: 'task',
      action,
      userId,
      data: { taskId, ...details },
      message: `任务操作: ${action}`
    });
  }
}

export const businessLogger = new BusinessLogger();
```

### 4.3 审计日志

```typescript
// 审计日志（关键操作必须记录）
class AuditLogger {
  // 登录审计
  logLogin(userId: number, username: string, ip: string, success: boolean) {
    logger.info({
      module: 'audit',
      action: 'login',
      userId,
      data: { username, ip, success },
      message: success ? '登录成功' : '登录失败'
    });
  }

  // 权限变更审计
  logPermissionChange(
    operatorId: number,
    targetRole: string,
    permission: string,
    oldValue: boolean,
    newValue: boolean
  ) {
    logger.info({
      module: 'audit',
      action: 'permission_change',
      userId: operatorId,
      data: {
        targetRole,
        permission,
        oldValue,
        newValue
      },
      message: '权限配置变更'
    });
  }

  // 敏感数据访问审计
  logSensitiveDataAccess(userId: number, dataType: string, recordId: string) {
    logger.info({
      module: 'audit',
      action: 'sensitive_data_access',
      userId,
      data: { dataType, recordId },
      message: '敏感数据访问'
    });
  }
}

export const auditLogger = new AuditLogger();
```

---

## 5. 日志轮转

### 5.1 文件日志配置

```typescript
// 日志轮转配置
const logRotationConfig = {
  // 按日期轮转
  frequency: 'daily',

  // 保留天数
  maxFiles: 30,

  // 单文件最大大小
  maxSize: '100M',

  // 文件命名
  filename: path.join(logDir, 'app-%DATE%.log'),

  // 压缩旧日志
  compress: true
};
```

### 5.2 日志目录结构

```
logs/
├── app/                    # 应用日志
│   ├── app-2026-03-17.log  # 按日期
│   ├── app-2026-03-16.log
│   └── ...
├── audit/                  # 审计日志（独立存储）
│   ├── audit-2026-03-17.log
│   └── ...
├── error/                  # 错误日志（独立存储）
│   ├── error-2026-03-17.log
│   └── ...
└── archive/                # 压缩归档
    ├── app-2026-02.tar.gz
    └── ...
```

---

## 6. 前端日志

### 6.1 开发环境

```typescript
// 开发环境使用 console
const devLogger = {
  debug: (...args: unknown[]) => console.debug('[DEBUG]', ...args),
  info: (...args: unknown[]) => console.info('[INFO]', ...args),
  warn: (...args: unknown[]) => console.warn('[WARN]', ...args),
  error: (...args: unknown[]) => console.error('[ERROR]', ...args)
};
```

### 6.2 生产环境

```typescript
// 生产环境发送到后端
class ProdLogger {
  private queue: LogEntry[] = [];
  private flushInterval = 5000; // 5秒批量发送

  constructor() {
    setInterval(() => this.flush(), this.flushInterval);
  }

  log(level: string, message: string, data?: Record<string, unknown>) {
    this.queue.push({
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      url: window.location.href,
      userAgent: navigator.userAgent
    });

    // 错误立即发送
    if (level === 'error') {
      this.flush();
    }
  }

  private async flush() {
    if (this.queue.length === 0) return;

    const logs = [...this.queue];
    this.queue = [];

    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs })
      });
    } catch (error) {
      // 静默失败，避免循环日志
      console.error('Failed to send logs:', error);
    }
  }
}

export const logger = process.env.NODE_ENV === 'production'
  ? new ProdLogger()
  : devLogger;
```

---

## 7. 敏感信息处理

### 7.1 敏感字段脱敏

```typescript
// 敏感字段列表
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'creditCard',
  'ssn',
  'email',    // 部分脱敏
  'phone'     // 部分脱敏
];

// 脱敏处理函数
function sanitize(obj: Record<string, unknown>): Record<string, unknown> {
  const result = { ...obj };

  for (const key of Object.keys(result)) {
    if (SENSITIVE_FIELDS.includes(key.toLowerCase())) {
      if (key.toLowerCase() === 'password') {
        result[key] = '***REDACTED***';
      } else if (key.toLowerCase() === 'email') {
        // 邮箱部分脱敏: u***@example.com
        const email = String(result[key]);
        result[key] = email.replace(/(.{1}).*(@.*)/, '$1***$2');
      } else if (key.toLowerCase() === 'phone') {
        // 手机部分脱敏: 138****1234
        const phone = String(result[key]);
        result[key] = phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
      } else {
        result[key] = '***REDACTED***';
      }
    } else if (typeof result[key] === 'object' && result[key] !== null) {
      result[key] = sanitize(result[key] as Record<string, unknown>);
    }
  }

  return result;
}
```

### 7.2 日志输出示例

**原始数据**:
```json
{
  "username": "user001",
  "password": "secret123",
  "email": "user@example.com",
  "phone": "13812345678"
}
```

**脱敏后**:
```json
{
  "username": "user001",
  "password": "***REDACTED***",
  "email": "u***@example.com",
  "phone": "138****5678"
}
```

---

## 8. 日志查询

### 8.1 查询API

```typescript
// GET /api/logs
interface LogQuery {
  startDate?: string;    // 开始时间
  endDate?: string;      // 结束时间
  level?: string;        // 日志级别
  module?: string;       // 模块
  userId?: number;       // 用户ID
  requestId?: string;    // 请求ID
  keyword?: string;      // 关键词
  page?: number;
  pageSize?: number;
}

// 响应
interface LogQueryResponse {
  data: LogEntry[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
```

---

## 相关文档

- [错误处理规范](./ERROR_HANDLING.md)
- [API规范设计](../API_SPECIFICATION.md)

---

## 变更历史

| 日期 | 版本 | 变更内容 |
|------|------|----------|
| 2026-03-17 | 1.0 | 初始版本 |
