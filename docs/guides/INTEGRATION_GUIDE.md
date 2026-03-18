# 后端服务集成指南

本文档说明如何将新模块集成到现有应用中。

## 模块集成步骤

### 1. 更新主入口文件 (app/server/src/index.ts)

```typescript
import { logger } from './logging/index.js';
import { redisService } from './cache/index.js';
import { authService } from './auth/index.js';
import { webSocketService } from './realtime/index.js';
import { dataService } from './data/index.js';

// 初始化日志
logger.info(LOG_CATEGORIES.STARTUP, '正在启动服务...');

// 连接Redis
await redisService.connect();

// 初始化WebSocket服务
webSocketService.initialize(httpServer);

// 预热缓存
await dataService.warmupCache();

// 定时任务
setInterval(async () => {
  await authService.cleanupExpiredSessions();
}, 15 * 60 * 1000); // 每15分钟
```

### 2. 添加认证中间件

```typescript
import { authService } from './auth/index.js';

// 验证会话中间件
export async function validateSession(req: any, res: any, next: any) {
  const sessionId = req.cookies?.session_id;

  if (!sessionId) {
    return res.status(401).json({ success: false, message: '未登录' });
  }

  const result = await authService.validateSession(sessionId, req.ip);

  if (!result.valid) {
    return res.status(401).json({ success: false, message: result.reason });
  }

  req.user = result.user;
  req.session = result.session;
  next();
}
```

### 3. 添加数据路由

```typescript
import express from 'express';
import { projectService } from './data/index.js';
import { broadcastService } from './realtime/index.js';

const router = express.Router();

// 获取项目列表
router.get('/projects', validateSession, async (req, res) => {
  const projects = await projectService.getProjects();
  res.json({ success: true, data: projects });
});

// 创建项目
router.post('/projects', validateSession, async (req, res) => {
  const result = await projectService.createProject(req.body, req.user.id);
  res.json({ success: true, data: result });
});

// 更新项目（带版本控制）
router.put('/projects/:id', validateSession, async (req, res) => {
  try {
    const result = await projectService.updateProject(
      parseInt(req.params.id),
      req.body,
      req.body.version,
      req.user.id
    );
    res.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof VersionConflictError) {
      return res.status(409).json({
        success: false,
        conflict: true,
        current: error.current,
        history: error.history
      });
    }
    throw error;
  }
});
```

## 环境变量配置

```bash
# .env
NODE_ENV=production
DB_HOST=localhost
DB_PORT=3306
DB_NAME=task_manager
DB_USER=root
DB_PASSWORD=

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# 缓存配置
CACHE_DEFAULT_TTL=300
CACHE_ENABLE_OFFLINE=false
LRU_MAX_ITEMS=1000
LRU_MAX_SIZE=10485760

# 日志配置
LOG_LEVEL=info
LOG_DIR=./logs
LOG_PERFORMANCE_THRESHOLD=50
```

## 性能监控

```typescript
import { logger, performanceMonitor } from './logging/index.js';

// 查看缓存统计
await cacheManager.printReport();

// 查看WebSocket统计
const wsStats = webSocketService.getStats();
console.log('WebSocket统计:', wsStats);

// 查看Redis健康状态
const health = await redisService.healthCheck();
console.log('Redis健康:', health);
```

## 前端集成

前端已有完善的服务，只需确保：

1. **WebSocket连接** - 使用现有的`WebSocketService`
2. **缓存管理** - 使用现有的`CacheManager`
3. **API调用** - 使用现有的`ApiService`

前端会自动接收后端的实时更新，无需额外配置。
