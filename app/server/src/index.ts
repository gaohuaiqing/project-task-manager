// app/server/src/index-new.ts
// 新架构服务入口 - 模块化架构
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';

// Core 模块
import { createPool, closePool } from './core/db';
import { RedisCache } from './core/cache';
import { logger } from './core/logger';

// 业务模块路由
import { authRoutes } from './modules/auth';
import { orgRoutes } from './modules/org';
import { projectRoutes } from './modules/project';
import { taskRoutes } from './modules/task';
import { workflowRoutes } from './modules/workflow';
import { collabRoutes } from './modules/collab';
import { analyticsRoutes } from './modules/analytics';

const app = express();
const httpServer = createServer(app);

// ========== 中间件配置 ==========
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// 请求日志
app.use((req, res, next) => {
  logger.info('Incoming request: %s %s', req.method, req.path);
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
    });
    logger.info('Database pool initialized');

    // 初始化 Redis 缓存（可选）
    const cache = new RedisCache();
    try {
      await cache.connect();
      logger.info('Redis cache connected');
    } catch (e) {
      logger.warn('Redis connection failed, using memory cache fallback');
    }

    // 启动 HTTP 服务
    const PORT = parseInt(process.env.PORT || '3001');
    httpServer.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`API endpoints available at http://localhost:${PORT}/api`);
    });

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

export { app, httpServer };
