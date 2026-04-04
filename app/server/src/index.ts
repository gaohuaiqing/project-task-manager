// app/server/src/index-new.ts
// 新架构服务入口 - 模块化架构
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import cron from 'node-cron';
import compression from 'compression';

// Core 模块
import { createPool, closePool } from './core/db';
import { RedisCache } from './core/cache';
import { sessionCache } from './core/cache/session-cache';
import { logger } from './core/logger';
import { initWebSocketServer } from './core/realtime';

// 业务模块路由
import { authRoutes } from './modules/auth';
import { orgRoutes } from './modules/org';
import { projectRoutes } from './modules/project';
import { taskRoutes } from './modules/task';
import { workflowRoutes } from './modules/workflow';
import { collabRoutes } from './modules/collab';
import { analyticsRoutes } from './modules/analytics';

// 业务服务
import { WorkflowService } from './modules/workflow/service';

const app = express();
const httpServer = createServer(app);

// ========== 中间件配置 ==========
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// 响应压缩 - 减少传输体积 60-80%
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  threshold: 1024, // 超过1KB才压缩
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// 请求日志
app.use((req, res, next) => {
  logger.info('Incoming request: %s %s', req.method, req.path);
  next();
});

// ========== 认证中间件（带缓存优化）==========
app.use(async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // 从 cookie 获取 sessionId
  const sessionId = req.cookies?.sessionId;
  if (sessionId) {
    try {
      // 1. 先尝试从缓存获取会话
      let context = await sessionCache.getSession(sessionId);

      if (context) {
        // 缓存命中，直接使用
        (req as any).user = context.user;
        (req as any).sessionId = sessionId;
        (req as any).permissions = context.permissions;
      } else {
        // 缓存未命中，从数据库获取并缓存
        const { AuthService } = await import('./modules/auth');
        const authService = new AuthService();
        context = await authService.getAuthContext(sessionId);

        if (context) {
          (req as any).user = context.user;
          (req as any).sessionId = sessionId;

          // 缓存会话信息（15分钟TTL）
          await sessionCache.setSession(sessionId, {
            user: context.user,
            permissions: context.permissions || [],
          });
        }
      }
    } catch (error) {
      logger.warn('Auth middleware error:', error);
    }
  }
  next();
});

// ========== API 路由挂载 ==========
const apiRouter = express.Router();

// 认证模块
apiRouter.use('/auth', authRoutes);

// 组织架构模块
apiRouter.use('/org', orgRoutes);

// 项目管理模块
apiRouter.use('/projects', projectRoutes);

// 任务管理模块
apiRouter.use('/tasks', taskRoutes);

// 工作流模块
apiRouter.use('/workflow', workflowRoutes);

// 协作模块
apiRouter.use('/collab', collabRoutes);

// 分析报表模块
apiRouter.use('/analytics', analyticsRoutes);

// P1修复：批量任务API - 符合需求文档 L786 规范
apiRouter.post('/batch/wbs-tasks', async (req, res, next) => {
  try {
    const { TaskService } = await import('./modules/task/service');
    const taskService = new TaskService();
    const { ids } = req.body;
    const tasks = await taskService.getTasksByIds(ids || []);
    res.json({ success: true, data: tasks });
  } catch (error) {
    next(error);
  }
});

// 挂载到 /api 前缀
app.use('/api', apiRouter);

// ========== 错误处理 ==========
// 404 处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: '接口不存在' }
  });
});

// 全局错误处理
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error at %s: %s', req.path, err.message);

  // 根据 error 类型返回不同状态码
  const statusCode = (err as any).statusCode || 500;
  const code = (err as any).code || 'INTERNAL_ERROR';

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message: err.message,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    }
  });
});

// ========== 启动服务 ==========
async function startServer() {
  try {
    // 初始化数据库连接池
    createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'task_manager',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: 'utf8mb4',
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      idleTimeout: 60000,
    });
    logger.info('Database pool initialized');

    // 运行数据库迁移
    try {
      const { runPendingMigrations } = await import('./migrations/run-migration.js');
      await runPendingMigrations();
      logger.info('Database migrations completed');
    } catch (error) {
      logger.warn('Migration check completed (some migrations may have been skipped)');
    }

    // 初始化 Redis 缓存（可选）
    const cache = new RedisCache();
    try {
      await cache.connect();
      logger.info('Redis cache connected');
    } catch (e) {
      logger.warn('Redis connection failed, using memory cache fallback');
    }

    // 初始化会话缓存
    await sessionCache.connect();

    // 初始化 WebSocket 服务
    initWebSocketServer(httpServer);

    // 启动 HTTP 服务
    const PORT = parseInt(process.env.PORT || '3001');
    httpServer.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`API endpoints available at http://localhost:${PORT}/api`);
    });

    // 启动定时任务
    setupCronJobs();

    // 优雅关闭
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully');
      await closePool();
      httpServer.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Failed to start server: %s', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

startServer();

/**
 * 设置定时任务
 */
function setupCronJobs() {
  const workflowService = new WorkflowService();

  // 每小时检查审批超时（整点执行）
  cron.schedule('0 * * * *', async () => {
    try {
      logger.info('[Cron] Checking timeout approvals...');
      const count = await workflowService.checkTimeoutApprovals();
      if (count > 0) {
        logger.info(`[Cron] Marked ${count} approvals as timeout`);
      }
    } catch (error) {
      logger.error('[Cron] Error checking timeout approvals:', error);
    }
  });

  // 每日凌晨1点检查延期任务
  cron.schedule('0 1 * * *', async () => {
    try {
      logger.info('[Cron] Checking delayed tasks...');
      const result = await workflowService.checkDelayedTasks();
      logger.info(`[Cron] Delayed: ${result.delayedCount}, Warning: ${result.warningCount}, Recovered: ${result.recoveredCount}`);
    } catch (error) {
      logger.error('[Cron] Error checking delayed tasks:', error);
    }
  });

  // 每日早上9点发送任务摘要（可选）
  if (process.env.ENABLE_DAILY_SUMMARY === 'true') {
    cron.schedule('0 9 * * 1-5', async () => {
      try {
        logger.info('[Cron] Sending daily task summary...');
        await workflowService.sendDailyTaskSummary();
        logger.info('[Cron] Daily task summary sent');
      } catch (error) {
        logger.error('[Cron] Error sending daily summary:', error);
      }
    });
  }

  logger.info('[Cron] Scheduled jobs initialized');
}

export { app, httpServer };
