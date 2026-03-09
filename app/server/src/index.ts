import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcrypt';
import { SessionManager } from './services/SessionManager.js';
import { databaseService } from './services/DatabaseService.js';
import { globalDataManager } from './services/GlobalDataManager.js';
import { redisCacheService } from './services/RedisCacheService.js';
import { permissionManagerOptimized as permissionManager } from './services/PermissionManagerOptimized.js';
// 使用新的异步日志系统（已包含 systemLogger 别名和所有管理方法）
import { systemLogger, asyncSystemLogger } from './services/AsyncSystemLogger.js';
import { auditLogService } from './services/AuditLogService.js';
import { initSystemLogsTable } from './services/initSystemLogs.js';
import { initSessionCleanup } from './services/initSessionCleanup.js';
import { initSoftDelete } from './services/initSoftDelete.js';
import { initJsonValidation } from './services/initJsonValidation.js';
import { initLogPartitioning } from './services/initLogPartitioning.js';
import { initLogAutoCleanup } from './services/initLogAutoCleanup.js';
import dataRoutes, { setBroadcastFunction, setSessionManager } from './routes/dataRoutes.js';
import permissionRoutes from './routes/permissionRoutes.js';
// import organizationRoutes from './routes/organizationRoutes.js'; // 文件不存在，已注释
import projectExtendedRoutes, { setSessionManager as setProjectSessionManager } from './routes/projectExtendedRoutes.js';
import batchQueryRoutes from './routes/batchQueryRoutes.js'; // 批量查询优化
import { warmupCacheOnStartup } from './scripts/cache-warmup.js'; // 缓存预热
import type { ClientMessage, ServerMessage, Session, User } from './types/index.js';

// ================================================================
// LRU 缓存实现（简单实现，避免额外依赖）
// ================================================================
class LRUCache<K, V> extends Map<K, V> {
  private maxSize: number;

  constructor(maxSize: number, entries?: Iterable<readonly [K, V]> | null) {
    super(entries);
    this.maxSize = maxSize;
  }

  override set(key: K, value: V): this {
    // 删除旧值（如果存在）以便重新插入到末尾
    if (super.has(key)) {
      super.delete(key);
    }
    // 如果达到最大大小，删除最老的条目（第一个）
    else if (this.size >= this.maxSize) {
      const firstKey = this.keys().next().value;
      if (firstKey !== undefined) {
        super.delete(firstKey);
      }
    }
    return super.set(key, value);
  }
}

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// 支持内网IP访问的正则匹配
const isInternalNetwork = (origin: string | undefined) => {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    const hostname = url.hostname;

    // 允许localhost和127.0.0.1
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return true;
    }

    // 允许内网IP段 (10.x.x.x, 172.16-31.x.x, 192.168.x.x)
    const isPrivateIP =
      /^10\./.test(hostname) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
      /^192\.168\./.test(hostname);

    return isPrivateIP;
  } catch {
    return false;
  }
};

app.use(cors({
  origin: (origin, callback) => {
    // 允许无origin的请求（如服务器端请求、Postman等）
    if (!origin) return callback(null, true);

    // 检查是否为内网IP或localhost
    if (isInternalNetwork(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: 来源 ${origin} 不在允许列表中（仅允许内网访问）`));
    }
  },
  credentials: true
}));

// ================================================================
// API限流配置
// ================================================================

// 通用API限流（防止暴力攻击和资源耗尽）
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 1000, // 每个IP最多1000次请求（提高限制以支持正常使用）
  message: '请求过于频繁，请稍后再试',
  standardHeaders: true,
  legacyHeaders: false,
  // 跳过成功的请求（不计数）
  skipSuccessfulRequests: false,
});

// 认证API限流（更严格的限制）
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 1000 : 5, // 测试环境放宽限制
  message: '登录尝试过于频繁，请15分钟后再试',
  skipSuccessfulRequests: true,
});

app.use('/api/login', authLimiter);
app.use('/api', apiLimiter);

// ================================================================
// CSRF防护配置
// ================================================================

// Cookie解析器（用于CSRF token管理）
app.use(cookieParser());

// CSRF防护中间件 - 验证请求来源
const csrfProtection = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // 跳过GET请求（CSRF只影响状态改变操作）
  if (req.method === 'GET') {
    return next();
  }

  // 获取请求来源
  const origin = req.headers.origin;
  const referer = req.headers.referer;

  // 允许无origin的请求（如服务器端请求、Postman等）
  if (!origin && !referer) {
    console.warn('[CSRF] 警告: 请求缺少Origin和Referer头');
    return next();
  }

  // 验证来源是否为内网或可信源
  const isTrustedOrigin = origin ? isInternalNetwork(origin) : false;
  const isTrustedReferer = referer ? isInternalNetwork(referer) : false;

  if (isTrustedOrigin || isTrustedReferer) {
    next();
  } else {
    console.warn(`[CSRF] 拒绝请求: Origin=${origin}, Referer=${referer}`);
    res.status(403).json({
      success: false,
      message: 'CSRF验证失败：请求来源不被允许'
    });
  }
};

// 对API路由应用CSRF防护
app.use('/api', csrfProtection);

app.use(express.json());

// 注册项目扩展路由（必须在 dataRoutes 之前注册）
app.use('/api', projectExtendedRoutes);

// 注册数据路由（MySQL主存储架构）
app.use('/api', dataRoutes);

// 注册权限配置路由
app.use('/api/permissions', permissionRoutes);

// 注册批量查询优化路由
app.use('/api', batchQueryRoutes);

// 注册组织架构路由
// app.use('/api/organization', organizationRoutes); // 文件不存在，已注释

// 设置广播函数，供dataRoutes使用
setBroadcastFunction(broadcastToAll);

const sessionManager = new SessionManager();

// 设置 SessionManager 的广播回调，用于发送会话终止通知
sessionManager.setBroadcastCallback((username, message) => {
  broadcastToAll(message);
});

// 注入 sessionManager 到 dataRoutes
setSessionManager(sessionManager);

// 注入 sessionManager 到 projectExtendedRoutes
setProjectSessionManager(sessionManager);

// ================================================================
// WebSocket 连接管理（LRU 缓存 + 心跳机制）
// ================================================================

// 限制最大连接数为 1000，减少内存压力（从 5000 降到 1000）
const MAX_WS_CONNECTIONS = 1000;
const clients = new LRUCache<string, WebSocketClientData>(MAX_WS_CONNECTIONS);

// WebSocket 客户端数据接口
interface WebSocketClientData {
  ws: WebSocket;
  sessionId: string;
  username: string;
  ip: string;
  userId?: number;
  role?: string;
  lastSeen: number; // 最后活跃时间（心跳检测用）
  heartbeatInterval?: NodeJS.Timeout; // 心跳定时器引用
}

// 心跳配置 - 优化：减少心跳频率
const HEARTBEAT_INTERVAL = 60000; // 30秒 → 60秒，减少心跳频率
const CONNECTION_TIMEOUT = 120000; // 60秒 → 120秒，减少超时检测频率

// ================================================================
// 全局数据管理
// ================================================================

// 全局数据类型定义
const GLOBAL_DATA_TYPES = ['projects', 'wbs_tasks', 'holidays'];

// 设置GlobalDataManager的广播回调
globalDataManager.setBroadcastCallback((message) => {
  broadcastToAll(message);
});

// 全局广播函数 - 向所有在线用户广播（带权限过滤）
async function broadcastToAll(message: ServerMessage, excludeClientId?: string): Promise<void> {
  const startTime = Date.now();
  let successCount = 0;
  let failCount = 0;
  let filteredCount = 0;

  // 收集所有需要检查权限的用户ID
  const userIdsToCheck: number[] = [];
  const clientsByUserId = new Map<number, Array<{ clientId: string; client: any }>>();

  for (const [clientId, client] of clients.entries()) {
    if (client.ws.readyState !== WebSocket.OPEN) {
      continue;
    }

    if (excludeClientId && clientId === excludeClientId) {
      continue;
    }

    if (client.userId) {
      if (!clientsByUserId.has(client.userId)) {
        clientsByUserId.set(client.userId, []);
        userIdsToCheck.push(client.userId);
      }
      clientsByUserId.get(client.userId)!.push({ clientId, client });
    } else {
      // 没有userId的客户端直接发送
      try {
        client.ws.send(JSON.stringify(message));
        successCount++;
      } catch (error) {
        console.error(`[WebSocket] 发送消息失败:`, error);
        failCount++;
      }
    }
  }

  // 批量检查用户权限（一次查询检查所有用户）
  if (userIdsToCheck.length > 0) {
    const permissionResults = await permissionManagerOptimized.batchCanReceiveBroadcast(userIdsToCheck, message);

    // 根据权限结果发送消息
    for (const [userId, canReceive] of permissionResults) {
      const userClients = clientsByUserId.get(userId) || [];

      for (const { clientId, client } of userClients) {
        try {
          if (canReceive) {
            client.ws.send(JSON.stringify(message));
            successCount++;
          } else {
            filteredCount++;
          }
        } catch (error) {
          console.error(`[WebSocket] 发送消息失败 to ${client.username}:`, error);
          failCount++;
        }
      }
    }
  }

  const duration = Date.now() - startTime;
  console.log(`[WebSocket] 全局广播完成: ${message.type}, 成功: ${successCount}, 过滤: ${filteredCount}, 失败: ${failCount}, 总客户端: ${clients.size}, 耗时: ${duration}ms`);
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 数据库连接池状态监控
app.get('/api/db-pool-status', async (req, res) => {
  try {
    const pool = (databaseService as any).pool;
    if (!pool) {
      return res.status(503).json({ error: 'Database pool not initialized' });
    }

    // 获取连接池状态
    const poolInfo = {
      totalConnections: pool.pool.connectionLimit,
      activeConnections: pool.pool._allConnections?.length || pool.pool._freeConnections?.length || 0,
      freeConnections: pool.pool._freeConnections?.length || 0,
      queuedRequests: pool.pool._connectionQueue?.length || 0,
      config: {
        connectionLimit: pool.pool.connectionLimit,
        queueLimit: pool.pool.config.queueLimit,
        maxIdle: pool.pool.config.maxIdle,
        idleTimeout: pool.pool.config.idleTimeout
      }
    };

    const utilization = ((poolInfo.activeConnections / poolInfo.totalConnections) * 100).toFixed(1);

    res.json({
      status: utilization > 80 ? 'warning' : 'ok',
      utilization: `${utilization}%`,
      ...poolInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get pool status', details: String(error) });
  }
});

// Redis缓存状态监控
app.get('/health/redis', async (req, res) => {
  try {
    const isConnected = redisCacheService.isConnected();

    if (!isConnected) {
      return res.status(503).json({
        status: 'disconnected',
        message: 'Redis缓存服务不可用',
        timestamp: new Date().toISOString()
      });
    }

    // 获取Redis缓存统计信息
    const stats = await redisCacheService.getStats();

    res.json({
      status: 'ok',
      message: 'Redis缓存服务正常',
      stats: {
        hitRate: `${stats.hitRate}%`,
        totalHits: stats.totalHits,
        totalMisses: stats.totalMisses,
        keyCount: stats.keyCount,
        memoryUsage: `${(stats.memoryUsage / 1024 / 1024).toFixed(2)} MB`
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: '获取Redis状态失败',
      error: String(error),
      timestamp: new Date().toISOString()
    });
  }
});

// 性能监控端点
app.get('/api/performance/login-stats', async (req, res) => {
  try {
    const { hours = 24 } = req.query;

    // 从系统日志获取登录性能数据
    const { logs } = await asyncSystemLogger.queryLogs({
      type: 'PERFORMANCE',
      startTime: new Date(Date.now() - (parseInt(hours as string) * 60 * 60 * 1000))
    });

    const loginLogs = logs.filter(log =>
      log.details &&
      typeof log.details === 'object' &&
      'metric' in log.details &&
      log.details.metric === 'login_duration'
    );

    const durations = loginLogs
      .map(log => log.details?.value)
      .filter(v => typeof v === 'number') as number[];

    if (durations.length === 0) {
      return res.json({
        success: true,
        stats: {
          count: 0,
          avg: 0,
          min: 0,
          max: 0,
          p50: 0,
          p95: 0,
          p99: 0
        },
        message: '暂无登录性能数据'
      });
    }

    const sorted = durations.sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);

    const percentile = (p: number) => sorted[Math.floor(sorted.length * p)] || 0;

    res.json({
      success: true,
      stats: {
        count: sorted.length,
        avg: Math.round(sum / sorted.length),
        min: sorted[0],
        max: sorted[sorted.length - 1],
        p50: percentile(0.5),
        p95: percentile(0.95),
        p99: percentile(0.99)
      },
      timeRange: `最近 ${hours} 小时`
    });
  } catch (error) {
    console.error('[API] 获取登录性能统计失败:', error);
    res.status(500).json({ success: false, message: '获取统计失败' });
  }
});

// 综合健康检查端点（包含所有依赖服务）
app.get('/health/all', async (req, res) => {
  const health = {
    status: 'ok' as 'ok' | 'degraded' | 'down',
    timestamp: new Date().toISOString(),
    services: {
      database: { status: 'ok' as 'ok' | 'down', responseTime: 0 },
      redis: { status: 'ok' as 'ok' | 'down', responseTime: 0 },
      websocket: { status: 'ok' as 'ok' | 'down', activeConnections: 0 }
    }
  };

  // 检查数据库
  const dbStart = Date.now();
  try {
    await databaseService.query('SELECT 1');
    health.services.database.responseTime = Date.now() - dbStart;
  } catch (error) {
    health.services.database.status = 'down';
    health.status = 'down';
  }

  // 检查Redis
  const redisStart = Date.now();
  try {
    const redisOk = redisCacheService.isConnected();
    health.services.redis.responseTime = Date.now() - redisStart;
    if (!redisOk) {
      health.services.redis.status = 'down';
      health.status = 'down';
    }
  } catch (error) {
    health.services.redis.status = 'down';
    health.status = 'down';
  }

  // 检查WebSocket连接数
  health.services.websocket.activeConnections = clients.size;

  // 检查连接数是否接近上限
  const connectionUtilization = (clients.size / MAX_WS_CONNECTIONS) * 100;
  if (connectionUtilization > 80) {
    health.status = health.status === 'ok' ? 'degraded' : health.status;
    health.services.websocket.status = 'degraded';
    console.warn(`[健康检查] WebSocket 连接数接近上限: ${clients.size}/${MAX_WS_CONNECTIONS} (${connectionUtilization.toFixed(1)}%)`);
  }

  // 如果所有服务都正常，返回200；否则返回503
  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

app.post('/api/login', async (req, res) => {
  const { username, password, ip, deviceId, sourceDeviceInfo } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
    }

    const userIp = ip || req.ip || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    const loginDeviceId = deviceId || uuidv4();
    const loginSourceDeviceInfo = sourceDeviceInfo || userAgent;
    const loginStartTime = Date.now();

    try {
      // 【安全修复】验证用户名和密码
      const users = await databaseService.query(
        'SELECT id, username, password, role, name FROM users WHERE username = ?',
        [username]
      );

      if (!users || users.length === 0) {
        console.warn(`[API] 登录失败: 用户不存在 - ${username}`);
        return res.status(401).json({ success: false, message: '用户名或密码错误' });
      }

      const user = users[0];

      // 验证密码
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        console.warn(`[API] 登录失败: 密码错误 - ${username}`);
        return res.status(401).json({ success: false, message: '用户名或密码错误' });
      }

      console.log(`[API] 密码验证通过: ${username} (${user.role})`);

      // 创建新会话（会自动终止现有会话）
      const session = await sessionManager.createSession(username, userIp, loginDeviceId, loginSourceDeviceInfo);

      // 【性能优化】异步记录日志，不阻塞登录响应
      // 系统日志（队列化异步）
      void asyncSystemLogger.logAuth(
        'user_login',
        session.userId,
        session.username,
        userIp,
        loginSourceDeviceInfo
      );

      // 审计日志（队列化异步，不等待）
      void auditLogService.logLoginSuccess(
        session.userId!,
        session.username,
        session.role || 'unknown',
        userIp,
        userAgent,
        session.sessionId
      ).catch(auditError => {
        console.error('[API] 记录登录审计日志失败（异步）:', auditError);
      });

      // 记录登录耗时
      const loginDuration = Date.now() - loginStartTime;
      void asyncSystemLogger.logPerformance('login_duration', loginDuration, {
        username,
        ip: userIp,
        deviceType: session.deviceId || 'unknown'
      });

      res.json({
        success: true,
        session: {
          sessionId: session.sessionId,
          username: session.username,
          createdAt: session.createdAt,
          deviceId: session.deviceId,
          sourceDeviceInfo: session.sourceDeviceInfo,
          role: session.role
        }
      });
    } catch (error: any) {
      console.error('[API] 登录失败:', error);

      // 【性能优化】异步记录失败日志，不阻塞错误响应
      void auditLogService.logLoginFailure(
        username,
        error.message || '认证失败',
        userIp,
        userAgent
      ).catch(auditError => {
        console.error('[API] 记录登录失败审计日志失败（异步）:', auditError);
      });

      res.status(500).json({ success: false, message: '登录失败，请重试' });
    }
  });

app.post('/api/logout', async (req, res) => {
  const { sessionId } = req.body;

  if (sessionId) {
    // 获取会话信息用于记录日志
    try {
      const session = await sessionManager.getSession(sessionId);
      await sessionManager.terminateSession(sessionId, '用户主动登出');

      // 记录登出日志到系统日志
      await asyncSystemLogger.logAuth(
        'user_logout',
        session?.userId,
        session?.username,
        req.ip || 'unknown'
      );

      // 记录登出审计日志
      if (session) {
        try {
          await auditLogService.log({
            operationType: 'logout',
            result: 'success',
            actorUserId: session.userId,
            actorUsername: session.username,
            actorRole: session.role,
            targetType: 'session',
            targetId: sessionId,
            ipAddress: req.ip || 'unknown',
            userAgent: req.get('User-Agent') || 'unknown',
            sessionId: sessionId
          });
        } catch (auditError) {
          console.error('[API] 记录登出审计日志失败:', auditError);
        }
      }
    } catch (error) {
      console.error('[API] 登出时记录日志失败:', error);
    }
  }

  res.json({ success: true });
});

app.get('/api/sessions/:username', async (req, res) => {
  const { username } = req.params;
  
  try {
    const sessions = await sessionManager.getSessionsByUsername(username);
    const activeSessionCount = await sessionManager.getUserSessionCount(username);
    
    res.json({
      sessions,
      activeSessionCount,
      totalSessionCount: sessions.length
    });
  } catch (error) {
    console.error('[API] 获取会话列表失败:', error);
    res.status(500).json({ success: false, message: '获取会话列表失败' });
  }
});

app.get('/api/session/status/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  
  try {
    const session = await sessionManager.getSession(sessionId);
    
    if (session) {
      res.json({
        success: true,
        session: {
          sessionId: session.sessionId,
          username: session.username,
          ip: session.ip,
          deviceId: session.deviceId,
          createdAt: session.createdAt,
          lastAccessed: session.lastAccessed,
          status: session.status,
          sourceDeviceInfo: session.sourceDeviceInfo
        }
      });
    } else {
      res.json({
        success: false,
        message: '会话不存在或已过期'
      });
    }
  } catch (error) {
    console.error('[API] 获取会话状态失败:', error);
    res.status(500).json({ success: false, message: '获取会话状态失败' });
  }
});

// ================================================================
// 全局数据管理 API
// ================================================================

// 获取全局数据（带部门过滤）
app.get('/api/global-data/get', async (req, res) => {
  try {
    const { dataType, dataId, sessionId } = req.query;

    if (!dataType) {
      return res.status(400).json({ success: false, message: '缺少dataType参数' });
    }

    let data = await globalDataManager.getGlobalData(dataType as string, dataId as string);

    // 如果有sessionId，应用部门数据过滤
    if (sessionId) {
      try {
        const session = await sessionManager.getSession(sessionId as string);
        if (session && session.username) {
          // 获取用户ID
          const [users] = await databaseService.query(
            'SELECT id FROM users WHERE username = ?',
            [session.username]
          ) as any[];

          if (users.length > 0) {
            const userId = users[0].id;

            // 应用部门过滤（仅在data是数组且有department_id字段时）
            if (Array.isArray(data) && data.length > 0 && 'department_id' in (data[0] || {})) {
              data = await permissionManager.filterGlobalData(userId, data as any[]);
            }
          }
        }
      } catch (error) {
        console.warn('[API] 获取用户信息失败，返回未过滤数据:', error);
        // 继续使用未过滤的数据
      }
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('[API] 获取全局数据失败:', error);
    res.status(500).json({ success: false, message: '获取数据失败' });
  }
});

// 更新全局数据
app.post('/api/global-data/update', async (req, res) => {
  try {
    const { dataType, dataId, data, expectedVersion, changeReason } = req.body;
    const { sessionId } = req.body;

    if (!dataType || !data) {
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }

    // 从session获取userId，如果无法获取则使用admin用户(id=1)
    let userId = 1; // 默认使用admin用户

    if (sessionId) {
      try {
        const session = await sessionManager.getSession(sessionId);
        if (session) {
          // 从username获取userId（这里需要数据库连接，暂时使用默认值）
          // TODO: 实现从username到userId的映射
        }
      } catch (error) {
        console.warn('[API] 从session获取userId失败，使用默认值:', error);
      }
    }

    const result = await globalDataManager.updateGlobalData(
      dataType,
      dataId || 'default',
      data,
      userId,
      expectedVersion,
      changeReason
    );

    res.json(result);
  } catch (error) {
    console.error('[API] 更新全局数据失败:', error);
    // 返回详细的错误信息（仅在开发环境）
    const errorMessage = process.env.NODE_ENV === 'production'
      ? '更新数据失败'
      : `更新数据失败: ${error instanceof Error ? error.message : String(error)}`;
    res.status(500).json({
      success: false,
      message: errorMessage,
      error: error instanceof Error ? error.message : String(error),
      stack: process.env.NODE_ENV !== 'production' && error instanceof Error ? error.stack : undefined
    });
  }
});

// 删除全局数据
app.delete('/api/global-data/delete', async (req, res) => {
  try {
    // 支持从查询参数或请求体中获取参数
    const queryDataType = req.query.dataType as string;
    const queryDataId = req.query.dataId as string;
    const queryChangeReason = req.query.changeReason as string;

    const bodyDataType = req.body?.dataType;
    const bodyDataId = req.body?.dataId;
    const bodyChangeReason = req.body?.changeReason;

    const dataType = queryDataType || bodyDataType;
    const dataId = queryDataId || bodyDataId;
    const changeReason = queryChangeReason || bodyChangeReason;

    if (!dataType || !dataId) {
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }

    const userId = 1; // 使用admin用户(id=1)作为默认值

    const result = await globalDataManager.deleteGlobalData(
      dataType,
      dataId,
      userId,
      changeReason
    );

    res.json(result);
  } catch (error) {
    console.error('[API] 删除全局数据失败:', error);
    res.status(500).json({ success: false, message: '删除数据失败' });
  }
});

// 获取变更历史
app.get('/api/global-data/history', async (req, res) => {
  try {
    const { dataType, dataId, limit } = req.query;

    if (!dataType || !dataId) {
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }

    const history = await globalDataManager.getChangeHistory(
      dataType as string,
      dataId as string,
      limit ? parseInt(limit as string) : 50
    );

    res.json({ success: true, history });
  } catch (error) {
    console.error('[API] 获取变更历史失败:', error);
    res.status(500).json({ success: false, message: '获取历史失败' });
  }
});

// 获取数据锁信息
app.get('/api/global-data/locks', async (req, res) => {
  try {
    const { dataType, dataId } = req.query;

    if (!dataType || !dataId) {
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }

    // TODO: 实现获取数据锁信息
    res.json({ success: true, locked: false });
  } catch (error) {
    console.error('[API] 获取锁信息失败:', error);
    res.status(500).json({ success: false, message: '获取锁信息失败' });
  }
});

// 获取统计信息
app.get('/api/global-data/stats', async (req, res) => {
  try {
    const stats = await globalDataManager.getStats();
    res.json({ success: true, stats });
  } catch (error) {
    console.error('[API] 获取统计信息失败:', error);
    res.status(500).json({ success: false, message: '获取统计失败' });
  }
});

// ================================================================
// 系统日志 API
// ================================================================

// 记录日志（支持单个或批量）
app.post('/api/logs', async (req, res) => {
  try {
    // 支持批量日志
    const { logs } = req.body;

    if (Array.isArray(logs)) {
      // 批量记录日志
      const results = await Promise.allSettled(
        logs.map(log => systemLogger.log(log))
      );

      const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;

      res.json({
        success: true,
        received: logs.length,
        recorded: successCount,
        message: `成功记录 ${successCount}/${logs.length} 条日志`
      });
    } else {
      // 单个日志记录（向后兼容）
      const { level, type, message, details, userId, username, sessionId, ipAddress, userAgent } = req.body;

      if (!level || !type || !message) {
        return res.status(400).json({ success: false, message: '缺少必要参数: level, type, message' });
      }

      const success = await systemLogger.log({
        level,
        type,
        message,
        details,
        userId,
        username,
        sessionId,
        ipAddress,
        userAgent
      });

      res.json({ success });
    }
  } catch (error) {
    console.error('[API] 记录日志失败:', error);
    res.status(500).json({ success: false, message: '记录日志失败' });
  }
});

// 查询日志
app.get('/api/logs', async (req, res) => {
  try {
    const {
      level,
      type,
      userId,
      username,
      startTime,
      endTime,
      limit = 100,
      offset = 0
    } = req.query;

    const options: any = {};

    if (level) options.level = level;
    if (type) options.type = type;
    if (userId) options.userId = parseInt(userId as string);
    if (username) options.username = username;
    if (startTime) options.startTime = new Date(startTime as string);
    if (endTime) options.endTime = new Date(endTime as string);
    options.limit = parseInt(limit as string);
    options.offset = parseInt(offset as string);

    const { logs, total } = await systemLogger.queryLogs(options);

    res.json({
      success: true,
      logs,
      total,
      limit: options.limit,
      offset: options.offset
    });
  } catch (error) {
    console.error('[API] 查询日志失败:', error);
    res.status(500).json({ success: false, message: '查询日志失败' });
  }
});

// 获取日志统计
app.get('/api/logs/stats', async (req, res) => {
  let connection;
  try {
    connection = await databaseService.getConnection();

    // 按级别统计
    const [levelStats] = await connection.execute(`
      SELECT log_level, COUNT(*) as count
      FROM system_logs
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      GROUP BY log_level
    `) as any[];

    // 按类型统计
    const [typeStats] = await connection.execute(`
      SELECT log_type, COUNT(*) as count
      FROM system_logs
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      GROUP BY log_type
    `) as any[];

    // 总数和最新日志时间
    const [totalStats] = await connection.execute(`
      SELECT
        COUNT(*) as total,
        MAX(created_at) as latestLog
      FROM system_logs
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    `) as any[];

    res.json({
      success: true,
      stats: {
        byLevel: levelStats,
        byType: typeStats,
        total: totalStats[0]?.total || 0,
        latestLog: totalStats[0]?.latestLog || null
      }
    });
  } catch (error) {
    console.error('[API] 获取日志统计失败:', error);
    res.status(500).json({ success: false, message: '获取统计失败' });
  } finally {
    if (connection) connection.release();
  }
});

// 清理过期日志
app.post('/api/logs/clean', async (req, res) => {
  try {
    const { hours = 24 } = req.body;

    const deletedCount = await systemLogger.cleanOldLogs(hours);

    res.json({
      success: true,
      deletedCount,
      message: `已清理 ${deletedCount} 条${hours}小时前的日志`
    });
  } catch (error) {
    console.error('[API] 清理日志失败:', error);
    res.status(500).json({ success: false, message: '清理日志失败' });
  }
});

// 清空所有日志
app.delete('/api/logs', async (req, res) => {
  try {
    const deletedCount = await systemLogger.clearAllLogs();

    res.json({
      success: true,
      deletedCount,
      message: `已清空所有日志（共 ${deletedCount} 条）`
    });
  } catch (error) {
    console.error('[API] 清空日志失败:', error);
    res.status(500).json({ success: false, message: '清空日志失败' });
  }
});

wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress || 'unknown';
  const clientId = uuidv4();

  console.log(`[WebSocket] 新连接: ${clientId} from ${clientIp}, 当前连接数: ${clients.size}/${MAX_WS_CONNECTIONS}`);

  // 记录WebSocket连接日志
  void systemLogger.info(`WebSocket新连接`, { clientId, clientIp, connectionCount: clients.size });

  // 🔧 优化：立即初始化客户端数据，避免 heartbeatInterval 设置前发生错误时无法清理
  const clientData: WebSocketClientData = {
    ws,
    sessionId: '',
    username: '',
    ip: clientIp,
    lastSeen: Date.now(),
  };

  // 🔧 立即添加到 clients Map，确保后续清理逻辑能正常工作
  clients.set(clientId, clientData);

  // 🔧 启动心跳检测定时器并保存引用到客户端数据中
  const heartbeatInterval = setInterval(() => {
    const client = clients.get(clientId);
    if (!client) {
      // 客户端已被清理，停止定时器
      clearInterval(heartbeatInterval);
      return;
    }

    const now = Date.now();
    const inactiveTime = now - client.lastSeen;

    // 检查是否超时
    if (inactiveTime > CONNECTION_TIMEOUT) {
      console.warn(`[WebSocket] 连接超时: ${clientId}, 用户: ${client.username || '(未认证)'}, 不活跃时间: ${inactiveTime}ms`);
      ws.terminate();
      // 定时器会在 cleanup 函数中被清理
      return;
    }

    // 发送 ping
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  }, HEARTBEAT_INTERVAL);

  // 🔧 将定时器引用保存到客户端数据中，确保清理时能正确清除
  clientData.heartbeatInterval = heartbeatInterval;
  clients.set(clientId, clientData);

  // 🔧 统一的清理函数，避免重复代码
  const cleanup = async () => {
    const client = clients.get(clientId);
    if (!client) {
      // 客户端已被清理，直接返回
      return;
    }

    console.log(`[WebSocket] 连接关闭: ${clientId}, 用户: ${client.username || '(未认证)'}, 剩余连接: ${clients.size - 1}`);

    // 记录WebSocket断开日志（仅对已认证用户）
    if (client.username) {
      void systemLogger.info(
        `WebSocket连接关闭`,
        { clientId, username: client.username, connectionCount: clients.size - 1 },
        client.userId,
        client.username
      );

      try {
        await sessionManager.updateSessionActivity(client.sessionId);
      } catch (error) {
        console.error('[WebSocket] 更新会话活动失败:', error);
      }
    }

    // 🔧 清理心跳定时器（从客户端数据中获取引用）
    if (client.heartbeatInterval) {
      clearInterval(client.heartbeatInterval);
      client.heartbeatInterval = undefined;
    }

    // 清理客户端数据
    clients.delete(clientId);
  };

  ws.on('message', async (message: string) => {
    try {
      const msg: ClientMessage = JSON.parse(message.toString());
      await handleMessage(clientId, ws, msg, clientIp, heartbeatInterval);
    } catch (error) {
      console.error('[WebSocket] 解析消息失败:', error);
      sendError(ws, '消息格式错误');
    }
  });

  ws.on('pong', () => {
    // 收到 pong 响应，更新最后活跃时间
    const client = clients.get(clientId);
    if (client) {
      client.lastSeen = Date.now();
    }
  });

  ws.on('close', cleanup);
  ws.on('error', () => {
    console.error(`[WebSocket] 连接错误: ${clientId}`);
    // 清理会在 close 事件中自动处理
    void cleanup();
  });
});

async function handleMessage(clientId: string, ws: WebSocket, msg: ClientMessage, ip: string, heartbeatInterval: NodeJS.Timeout) {
  switch (msg.type) {
    case 'auth':
      await handleAuth(clientId, ws, msg.data, ip, heartbeatInterval);
      break;
    case 'data_update':
      handleDataUpdate(clientId, ws, msg.data);
      break;
    case 'global_data_update':
      await handleGlobalDataUpdate(clientId, ws, msg.data);
      break;
    case 'data_operation':
      await handleDataOperation(clientId, ws, msg.data);
      break;
    case 'heartbeat':
      await handleHeartbeat(clientId, ws);
      break;
    case 'request_sync':
      handleRequestSync(clientId, ws, msg.data);
      break;
    case 'task_assign':
      await handleTaskAssign(clientId, ws, msg.data);
      break;
    case 'fetch_changes':
      await handleFetchChanges(clientId, ws, msg.data);
      break;
    case 'wbs_move_node':
      await handleWbsNodeMove(clientId, ws, msg.data);
      break;
    default:
      sendError(ws, '未知的消息类型');
  }
}

async function handleAuth(clientId: string, ws: WebSocket, data: { sessionId?: string; username: string }, ip: string, heartbeatInterval: NodeJS.Timeout) {
  const { sessionId, username } = data;

  try {
    // 必须提供有效的 sessionId
    if (!sessionId) {
      sendError(ws, '认证失败: 未提供会话ID，请先通过 /api/login 登录');
      console.warn(`[WebSocket] 认证失败: 用户 ${username} 尝试绕过登录流程`);
      return;
    }

    // 验证会话是否存在
    const session = await sessionManager.getSession(sessionId);

    if (!session) {
      sendError(ws, '认证失败: 会话不存在或已过期，请重新登录');
      console.warn(`[WebSocket] 认证失败: 无效的会话ID ${sessionId}`);
      return;
    }

    // 验证用户名是否匹配
    if (session.username !== username) {
      sendError(ws, '认证失败: 用户名不匹配');
      console.warn(`[WebSocket] 认证失败: 用户名不匹配 ${session.username} !== ${username}`);
      return;
    }

    // 宽松的IP地址验证：如果会话的IP是'local'，则允许任何IP连接
    if (session.ip !== 'local' && session.ip !== ip) {
      await sessionManager.terminateSession(sessionId, 'IP地址变更');
      sendToClient(ws, {
        type: 'session_terminated',
        data: {
          message: '检测到IP地址变更，会话已终止',
          reason: 'ip_changed'
        }
      });
      console.warn(`[WebSocket] 会话终止: IP地址变更 ${session.ip} -> ${ip}`);
      return;
    }

    await sessionManager.updateSessionActivity(session.sessionId);

    // 获取用户ID和角色（从会话中获取，优化性能）
    const userId = session.userId;
    const role = session.role;

    // 🔧 更新现有客户端数据（保留 heartbeatInterval 引用）
    const existingClient = clients.get(clientId);
    if (existingClient) {
      // 更新认证信息，保留 heartbeatInterval 引用
      existingClient.sessionId = session.sessionId;
      existingClient.username = username;
      existingClient.userId = userId;
      existingClient.role = role;
      existingClient.lastSeen = Date.now();
      // heartbeatInterval 保持不变
      clients.set(clientId, existingClient);
    } else {
      // 理论上不应该到这里，因为连接时已经创建了客户端数据
      console.error(`[WebSocket] 客户端数据意外丢失: ${clientId}`);
    }

    sendToClient(ws, {
      type: 'auth_success',
      data: {
        sessionId: session.sessionId,
        username,
        message: '认证成功',
        deviceId: session.deviceId,
        sourceDeviceInfo: session.sourceDeviceInfo
      }
    });

    console.log(`[WebSocket] 用户认证成功: ${username}, 会话: ${session.sessionId}, IP: ${ip}`);
  } catch (error) {
    console.error('[WebSocket] 认证失败:', error);
    sendError(ws, '认证失败: 服务器错误');
  }
}

async function handleDataUpdate(clientId: string, ws: WebSocket, requestData: any) {
  const client = clients.get(clientId);
  if (!client) {
    sendError(ws, '未认证');
    return;
  }

  try {
    const { dataType, dataId, data: newData, action, expectedVersion, changeReason, operationId } = requestData;

    // 判断是否为全局数据类型
    if (GLOBAL_DATA_TYPES.includes(dataType)) {
      // === 全局数据：使用GlobalDataManager ===

      // 权限检查：验证用户是否有权限操作该数据
      if (client.userId) {
        const permission = await permissionManager.canPerformAction(
          client.userId,
          dataType as any,
          dataId || 'default',
          (action as any) || 'update'
        );

        if (!permission.granted) {
          console.warn(`[WebSocket] 权限拒绝: 用户${client.username}尝试${action || 'update'} ${dataType}/${dataId}, 原因: ${permission.reason}`);

          // 记录权限拒绝日志
          await systemLogger.warn(
            `权限拒绝: 用户尝试${action || 'update'} ${dataType}/${dataId}`,
            {
              reason: permission.reason,
              requestedAction: action || 'update',
              dataType,
              dataId
            },
            client.userId,
            client.username
          );

          sendError(ws, `权限不足: ${permission.reason || '无操作权限'}`);
          return;
        }

        console.log(`[WebSocket] 权限检查通过: 用户${client.username}对${dataType}/${dataId}执行${action || 'update'}`);
      } else {
        console.warn(`[WebSocket] 缺少userId，跳过权限检查: 用户${client.username}`);
      }

      const result = await globalDataManager.updateGlobalData(
        dataType,
        dataId || 'default',
        newData,
        client.userId || 0, // 如果没有userId则使用0（系统用户）
        expectedVersion,
        changeReason
      );

      if (result.success) {
        // 成功：通知客户端（包含 operationId 以便前端匹配请求）
        sendToClient(ws, {
          type: 'data_update_ack',
          data: {
            operationId, // 返回操作ID，用于匹配请求
            dataType,
            dataId,
            success: true,
            version: result.version,
            message: result.message
          }
        });

        console.log(`[WebSocket] 全局数据更新成功: ${dataType}/${dataId}, 版本: ${result.version}`);

        // 记录系统日志
        await systemLogger.logUserAction(
          'websocket_data_update',
          {
            dataType,
            dataId,
            action: action || 'update',
            version: result.version,
            changeReason
          },
          client.userId,
          client.username
        );
      } else if (result.conflict) {
        // 冲突：通知客户端（包含 operationId）
        sendToClient(ws, {
          type: 'data_conflict',
          data: {
            operationId, // 返回操作ID，用于匹配请求
            dataType,
            dataId,
            message: result.message,
            serverData: result.data,
            serverVersion: result.version
          }
        });

        console.warn(`[WebSocket] 全局数据版本冲突: ${dataType}/${dataId}`);

        // 记录版本冲突日志
        await systemLogger.warn(
          `数据版本冲突: ${dataType}/${dataId}`,
          {
            dataType,
            dataId,
            expectedVersion,
            serverVersion: result.version,
            message: result.message
          },
          client.userId,
          client.username
        );
      } else {
        sendError(ws, result.message);
      }
    } else {
      // 用户私有数据更新功能已移除（原 DataSyncService）
      // 用户私有数据现在通过数据库直接操作
      console.warn('[WebSocket] 用户私有数据同步功能已移除，请使用全局数据管理器');
      sendError(ws, '用户私有数据同步功能已移除');
    }
  } catch (error) {
    console.error('[WebSocket] 数据更新失败:', error);
    sendError(ws, '数据更新失败');
  }
}

async function handleHeartbeat(clientId: string, ws: WebSocket) {
  const client = clients.get(clientId);
  if (client) {
    try {
      await sessionManager.updateSessionActivity(client.sessionId);
    } catch (error) {
      console.error('[WebSocket] 更新会话活动失败:', error);
    }
    sendToClient(ws, { type: 'heartbeat_ack', data: { timestamp: Date.now() } });
  }
}

function handleRequestSync(clientId: string, ws: WebSocket, data: { dataType: string }) {
  const client = clients.get(clientId);
  if (!client) {
    sendError(ws, '未认证');
    return;
  }

  // 数据同步功能已移除（原 DataSyncService）
  console.warn('[WebSocket] 数据同步功能已移除');
  sendError(ws, '数据同步功能已移除，请使用全局数据管理器');
}

// 处理全局数据更新（组织架构等）
async function handleGlobalDataUpdate(clientId: string, ws: WebSocket, requestData: any) {
  const client = clients.get(clientId);
  if (!client) {
    sendError(ws, '未认证');
    return;
  }

  const { dataType, dataId, data, version, timestamp } = requestData;

  console.log(`[WebSocket] 收到全局数据更新: ${dataType}/${dataId}, 来自用户: ${client.username}`);

  // 广播给所有其他连接的客户端
  broadcastToAll({
    type: 'global_data_updated',
    data: {
      dataType,
      dataId,
      data,
      version,
      timestamp
    }
  }, clientId); // 排除发送者

  console.log(`[WebSocket] 全局数据更新已广播: ${dataType}/${dataId}`);
}

/**
 * 处理数据操作（操作队列模式）
 */
async function handleDataOperation(
  clientId: string,
  ws: WebSocket,
  requestData: {
    operationId: string;
    operationType: 'create' | 'update' | 'delete';
    dataType: string;
    dataId: string;
    data: any;
    expectedVersion?: number;
  }
): Promise<void> {
  const client = clients.get(clientId);
  if (!client) {
    sendError(ws, '未认证');
    return;
  }

  try {
    const { operationId, operationType, dataType, dataId, data, expectedVersion } = requestData;

    console.log(`[WebSocket] 数据操作: ${operationId}, 类型: ${operationType}, 数据: ${dataType}/${dataId}`);

    let result: any;

    if (GLOBAL_DATA_TYPES.includes(dataType)) {
      // 全局数据操作
      if (operationType === 'create' || operationType === 'update') {
        result = await globalDataManager.updateGlobalData(
          dataType,
          dataId,
          data,
          client.userId || 0,
          expectedVersion
        );
      } else if (operationType === 'delete') {
        result = await globalDataManager.deleteGlobalData(
          dataType,
          dataId,
          client.userId || 0
        );
      }
    } else {
      // 用户私有数据操作功能已移除（原 DataSyncService）
      console.warn('[WebSocket] 用户私有数据操作功能已移除');
      sendError(ws, '用户私有数据操作功能已移除，请使用全局数据管理器');
      return;
    }

    // 发送响应（包含操作ID）
    sendToClient(ws, {
      type: 'data_operation_response',
      data: {
        operationId,
        ...result
      }
    });

    console.log(`[WebSocket] 操作完成: ${operationId}, 结果: ${result.success ? '成功' : '失败'}`);
  } catch (error) {
    console.error('[WebSocket] 数据操作失败:', error);
    sendToClient(ws, {
      type: 'data_operation_response',
      data: {
        operationId: requestData.operationId,
        success: false,
        message: '数据操作失败',
        conflict: false
      }
    });
  }
}

/**
 * 处理任务分配（原子性操作）
 */
async function handleTaskAssign(clientId: string, ws: WebSocket, requestData: any) {
  const client = clients.get(clientId);
  if (!client) {
    sendError(ws, '未认证');
    return;
  }

  try {
    const {
      assignmentId,
      taskType,
      taskId,
      assignTo,
      assignToName,
      operatorId,
      operatorName,
      expectedVersion,
      notes
    } = requestData;

    console.log(`[WebSocket] 任务分配: ${taskType}/${taskId} → ${assignToName || assignTo}`);

    // 确定数据类型
    const dataType = taskType === 'wbs_task' ? 'wbs_tasks' : `${taskType}s`;

    // 检查是否为全局数据类型
    if (!GLOBAL_DATA_TYPES.includes(dataType)) {
      sendError(ws, `不支持分配 ${taskType} 类型的任务`);
      return;
    }

    // 权限检查
    if (client.userId) {
      const permission = await permissionManager.canPerformAction(
        client.userId,
        dataType as any,
        taskId,
        'update'
      );

      if (!permission.granted) {
        sendError(ws, `权限不足: ${permission.reason || '无分配权限'}`);
        return;
      }
    }

    // 获取任务当前状态（用于审计日志记录 beforeData）
    let beforeData: any = null;
    try {
      const currentData = await databaseService.query(
        `SELECT * FROM ${dataType} WHERE id = ?`,
        [taskId]
      );
      if (currentData && currentData.length > 0) {
        beforeData = {
          assignee: currentData[0].assignee,
          assigneeName: currentData[0].assignee_name,
          taskCode: currentData[0].task_code,
          taskName: currentData[0].task_name
        };
      }
    } catch (error) {
      console.warn('[WebSocket] 获取任务当前状态失败（不影响分配）:', error);
    }

    // 使用 GlobalDataManager 执行原子性分配
    const result = await globalDataManager.updateGlobalData(
      dataType,
      taskId,
      { assignee: assignTo, assigneeName: assignToName },
      client.userId || 0,
      expectedVersion,
      `任务分配：由 ${operatorName || operatorId} 分配给 ${assignToName || assignTo}`
    );

    if (result.success) {
      // 记录审计日志
      try {
        const taskInfo = result.data || beforeData || {};
        await auditLogService.logTaskAssign(
          parseInt(taskId),
          taskInfo.task_code || taskId,
          taskInfo.task_name || `任务 ${taskId}`,
          beforeData?.assigneeName || null,
          assignToName || assignTo,
          parseInt(assignTo),
          client.userId || 0,
          client.username || operatorName || '系统',
          client.role || 'unknown',
          notes
        );
      } catch (auditError) {
        console.error('[WebSocket] 记录审计日志失败:', auditError);
      }

      // 分配成功，广播更新
      const updateMessage = {
        type: 'global_data_updated',
        data: {
          dataType,
          dataId: taskId,
          data: result.data,
          version: result.version,
          timestamp: Date.now(),
          operator: operatorName || operatorId
        }
      };

      // 广播给所有在线用户
      clients.forEach((c, id) => {
        if (c.ws.readyState === WebSocket.OPEN) {
          sendToClient(c.ws, updateMessage);
        }
      });

      // 响应分配者
      sendToClient(ws, {
        type: 'data_update_ack',
        data: {
          operationId: assignmentId,
          success: true,
          version: result.version,
          message: '任务分配成功',
          data: result.data
        }
      });

      console.log(`[WebSocket] 任务分配成功: ${taskId} → ${assignToName}, 版本: ${result.version}`);
    } else if (result.conflict) {
      // 记录冲突审计日志
      try {
        await auditLogService.log({
          operationType: 'task_assign',
          result: 'conflict',
          actorUserId: client.userId || 0,
          actorUsername: client.username || operatorName || '系统',
          actorRole: client.role || 'unknown',
          targetType: dataType,
          targetId: taskId,
          targetName: beforeData?.task_name || `任务 ${taskId}`,
          details: {
            attemptedAssignee: assignToName || assignTo,
            reason: result.message || '版本冲突'
          },
          beforeData,
          afterData: {
            assignee: assignTo,
            assigneeName: assignToName
          }
        });
      } catch (auditError) {
        console.error('[WebSocket] 记录冲突审计日志失败:', auditError);
      }

      // 版本冲突
      sendToClient(ws, {
        type: 'data_conflict',
        data: {
          operationId: assignmentId,
          dataType,
          dataId: taskId,
          message: result.message || '任务分配冲突：任务已被其他人分配或修改',
          serverData: result.data,
          serverVersion: result.version
        }
      });

      console.warn(`[WebSocket] 任务分配冲突: ${taskId}`);
    } else {
      sendError(ws, result.message || '任务分配失败');
    }
  } catch (error) {
    console.error('[WebSocket] 任务分配失败:', error);
    sendError(ws, '任务分配失败: 服务器错误');
  }
}

/**
 * 处理获取变更请求（增量同步）
 */
async function handleFetchChanges(clientId: string, ws: WebSocket, requestData: any) {
  const client = clients.get(clientId);
  if (!client) {
    sendError(ws, '未认证');
    return;
  }

  try {
    const { startTime, endTime } = requestData;

    console.log(`[WebSocket] 获取变更: ${new Date(startTime).toISOString()} - ${new Date(endTime).toISOString()}`);

    // 从数据变更日志中获取变更
    const changes = await databaseService.query(
      `SELECT * FROM data_changes
       WHERE timestamp >= ? AND timestamp <= ?
       ORDER BY timestamp ASC`,
      [startTime, endTime]
    );

    const formattedChanges = changes.map((change: any) => ({
      dataType: change.data_type,
      dataId: change.data_id,
      operation: change.operation,
      version: change.version,
      timestamp: change.timestamp,
      data: change.new_data ? JSON.parse(change.new_data) : null,
      operator: change.operator
    }));

    sendToClient(ws, {
      type: 'sync_response',
      data: {
        success: true,
        changes: formattedChanges,
        count: formattedChanges.length
      }
    });

    console.log(`[WebSocket] 返回 ${formattedChanges.length} 条变更`);
  } catch (error) {
    console.error('[WebSocket] 获取变更失败:', error);

    // 如果 data_changes 表不存在，降级到全量同步提示
    if (error instanceof Error && error.message.includes("doesn't exist")) {
      sendToClient(ws, {
        type: 'sync_response',
        data: {
          success: false,
          changes: [],
          count: 0,
          message: '变更日志表不存在，请使用全量同步'
        }
      });
    } else {
      sendError(ws, '获取变更失败');
    }
  }
}

/**
 * 处理 WBS 节点移动（级联更新路径）
 */
async function handleWbsNodeMove(clientId: string, ws: WebSocket, requestData: any) {
  const client = clients.get(clientId);
  if (!client) {
    sendError(ws, '未认证');
    return;
  }

  try {
    const {
      nodeId,
      newParentId,
      oldParentId,
      affectedNodeIds,
      oldPath,
      newPath,
      operatorId,
      operatorName,
      expectedVersion
    } = requestData;

    console.log(`[WebSocket] WBS 节点移动: ${nodeId}, ${oldPath} → ${newPath}, 影响节点数: ${affectedNodeIds.length}`);

    // 检查是否为全局数据类型
    const dataType = 'wbs_tasks';
    if (!GLOBAL_DATA_TYPES.includes(dataType)) {
      sendError(ws, `不支持操作 ${dataType} 类型`);
      return;
    }

    // 权限检查
    if (client.userId) {
      const permission = await permissionManager.canPerformAction(
        client.userId,
        dataType as any,
        nodeId,
        'update'
      );

      if (!permission.granted) {
        sendError(ws, `权限不足: ${permission.reason || '无操作权限'}`);
        return;
      }
    }

    // 使用 GlobalDataManager 执行原子性移动
    const result = await globalDataManager.updateGlobalData(
      dataType,
      nodeId,
      {
        parentId: newParentId,
        path: newPath,
        // 标记这是层级变更操作
        _hierarchyChange: true,
        _affectedNodes: affectedNodeIds,
        _operator: operatorName || operatorId
      },
      client.userId || 0,
      expectedVersion,
      `WBS 节点移动：${operatorName || operatorId} 将节点从 ${oldPath} 移动到 ${newPath}`
    );

    if (result.success) {
      // 批量更新所有受影响节点的路径
      const updatePromises = affectedNodeIds.map((affectedId: string) => {
        // 计算新路径
        const relativePath = ''; // 相对路径，需要从完整路径计算
        const affectedOldPath = result.data?.paths?.[affectedId] || '';
        const affectedNewPath = result.data?.paths?.[affectedId] || '';

        return globalDataManager.updateGlobalData(
          dataType,
          affectedId,
          {
            path: affectedNewPath,
            _pathUpdated: true
          },
          client.userId || 0,
          undefined,
          `级联更新路径: ${affectedId}`
        );
      });

      await Promise.all(updatePromises);

      // 记录审计日志
      try {
        // 获取节点信息
        const nodeData = await databaseService.query(
          `SELECT task_code, task_name FROM wbs_tasks WHERE id = ?`,
          [nodeId]
        );
        const taskCode = nodeData?.[0]?.task_code || nodeId;
        const taskName = nodeData?.[0]?.task_name || `节点 ${nodeId}`;

        await auditLogService.logWbsNodeMove(
          parseInt(nodeId),
          `${taskCode} - ${taskName}`,
          oldPath,
          newPath,
          affectedNodeIds.length,
          client.userId || 0,
          client.username || operatorName || '系统',
          client.role || 'unknown'
        );
      } catch (auditError) {
        console.error('[WebSocket] 记录 WBS 节点移动审计日志失败:', auditError);
      }

      // 广播节点变更通知
      const changeMessage = {
        type: 'wbs_node_changed',
        data: {
          nodeId,
          change: {
            type: 'move',
            oldPath,
            newPath,
            affectedNodeIds,
            operator: operatorName || operatorId,
            timestamp: Date.now()
          }
        }
      };

      // 广播给所有在线用户
      clients.forEach((c, id) => {
        if (c.ws.readyState === WebSocket.OPEN) {
          sendToClient(c.ws, changeMessage);
        }
      });

      // 响应移动者
      sendToClient(ws, {
        type: 'data_update_ack',
        data: {
          operationId: `move_${nodeId}`,
          success: true,
          version: result.version,
          message: `成功移动节点及其 ${affectedNodeIds.length - 1} 个子节点`,
          data: {
            nodeId,
            newPath,
            affectedNodeIds,
            updatedPaths: result.data?.paths
          }
        }
      });

      console.log(`[WebSocket] WBS 节点移动成功: ${nodeId}, 影响节点: ${affectedNodeIds.length}`);
    } else if (result.conflict) {
      // 版本冲突
      sendToClient(ws, {
        type: 'data_conflict',
        data: {
          operationId: `move_${nodeId}`,
          dataType,
          dataId: nodeId,
          message: result.message || 'WBS 节点移动冲突：节点已被其他人修改',
          serverData: result.data,
          serverVersion: result.version
        }
      });

      console.warn(`[WebSocket] WBS 节点移动冲突: ${nodeId}`);
    } else {
      sendError(ws, result.message || 'WBS 节点移动失败');
    }
  } catch (error) {
    console.error('[WebSocket] WBS 节点移动失败:', error);
    sendError(ws, 'WBS 节点移动失败: 服务器错误');
  }
}

function sendToClient(ws: WebSocket, message: ServerMessage) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function sendError(ws: WebSocket, message: string) {
  sendToClient(ws, { type: 'error', data: { message } });
}

function broadcastToUser(username: string, message: ServerMessage, excludeSessionId?: string) {
  clients.forEach((client, clientId) => {
    if (client.username === username && client.sessionId !== excludeSessionId) {
      sendToClient(client.ws, message);
    }
  });
}

// ================================================================
// 会话-WSS 联动清理定时器
// ================================================================
// 保存定时器引用，以便在服务器关闭时清理
let sessionCleanupInterval: NodeJS.Timeout | null = null;

sessionCleanupInterval = setInterval(async () => {
  try {
    const expiredSessions = await sessionManager.cleanupExpiredSessions();

    // 清理过期会话对应的 WebSocket 连接
    for (const session of expiredSessions) {
      // 查找并关闭所有使用该会话的 WebSocket 连接
      for (const [clientId, client] of clients.entries()) {
        if (client.sessionId === session.sessionId) {
          console.log(`[会话清理] 关闭过期会话的 WebSocket 连接: ${clientId}, 用户: ${client.username}`);
          client.ws.terminate();
          // 清理心跳定时器
          if (client.heartbeatInterval) {
            clearInterval(client.heartbeatInterval);
          }
          clients.delete(clientId);
        }
      }

      // 广播会话终止消息（给用户的其他连接）
      broadcastToUser(session.username, {
        type: 'session_terminated',
        data: {
          message: '会话已超时',
          reason: 'timeout'
        }
      });
    }

    if (expiredSessions.length > 0) {
      console.log(`[会话清理] 已清理 ${expiredSessions.length} 个过期会话及其 WebSocket 连接`);
    }
  } catch (error) {
    console.error('[定时任务] 清理过期会话失败:', error);
  }
}, 60000);

// 心跳机制已统一：由客户端主动发送 heartbeat，服务端响应 heartbeat_ack
// 移除了服务端主动发送 ping 的定时器（与客户端心跳重复）
// 心跳超时检测由客户端负责，服务端通过会话超时机制清理无效连接

// 初始化数据库连接

async function startServer() {
  try {
    // 初始化数据库连接（连接失败将抛出错误并终止启动）
    await databaseService.init();
    console.log('[服务器] ✅ 数据库初始化成功');

    // 初始化系统日志表
    await initSystemLogsTable();
    console.log('[服务器] ✅ 系统日志表初始化成功');

    // 初始化测试日志（用于验证日志功能）
    try {
      const { initTestLogs } = await import('../init-test-logs.js');
      await initTestLogs();
    } catch (error) {
      console.warn('[服务器] 测试日志初始化失败（非致命）:', error);
    }

    // 初始化会话自动清理机制
    await initSessionCleanup();

    // 初始化软删除机制
    await initSoftDelete();

    // 初始化 JSON 字段验证
    await initJsonValidation();

    // 初始化日志表分区（P0-2: 启用以提升删除性能）- 非致命，失败不影响启动
    try {
      await initLogPartitioning();
    } catch (error: any) {
      console.warn('[服务器] 日志表分区初始化失败（非致命）:', error.message);
      console.warn('[服务器] 服务器将继续运行，但日志性能可能受影响');
    }

    // 🚨 紧急修复：初始化日志自动清理机制
    try {
      await initLogAutoCleanup();
    } catch (error: any) {
      console.error('[服务器] 🚨 日志自动清理初始化失败:', error.message);
      console.error('[服务器] ⚠️ audit_logs 和 data_versions 表可能无限增长！');
      console.error('[服务器] 请手动检查并创建清理事件');
    }

    // 执行数据库迁移（项目扩展表）
    const { runMigration002 } = await import('./migrations/run-migration.js');
    await runMigration002();

    // 执行数据库迁移 005（修复 audit_logs 表架构）
    try {
      const { runMigration005 } = await import('./migrations/005-fix-audit-logs-schema.js');
      await runMigration005();
    } catch (error: any) {
      console.error('[服务器] ⚠️ audit_logs 表架构迁移失败:', error.message);
      // 非致命错误，继续启动
    }

    // 初始化 Redis 缓存（必须，失败时终止启动）
    await redisCacheService.init();
    console.log('[服务器] ✅ Redis 缓存初始化成功');

    server.listen(Number(PORT), HOST, async () => {
      console.log(`[服务器] ✅ 运行在 http://${HOST}:${PORT}`);
      console.log(`[WebSocket] ✅ 运行在 ws://${HOST}:${PORT}`);

      // 启动缓存预热（延迟执行，不阻塞服务器启动）
      warmupCacheOnStartup().catch((error) => {
        console.error('[服务器] ⚠️ 缓存预热失败:', error);
      });

      // 🔧 内存监控：每 5 分钟输出内存使用情况
      const MEMORY_MONITOR_INTERVAL = 5 * 60 * 1000; // 5 分钟
      const MEMORY_WARNING_THRESHOLD = 0.8; // 80% 内存使用率警告阈值
      const MEMORY_CRITICAL_THRESHOLD = 0.9; // 90% 内存使用率严重警告阈值

      const memoryMonitorInterval = setInterval(() => {
        const memUsage = process.memoryUsage();
        const totalMem = memUsage.heapTotal;
        const usedMem = memUsage.heapUsed;
        const externalMem = memUsage.external;
        const arrayBuffersMem = memUsage.arrayBuffers;

        const memUsagePercent = usedMem / totalMem;
        const usedMemMB = (usedMem / 1024 / 1024).toFixed(2);
        const totalMemMB = (totalMem / 1024 / 1024).toFixed(2);
        const externalMemMB = (externalMem / 1024 / 1024).toFixed(2);
        const arrayBuffersMemMB = (arrayBuffersMem / 1024 / 1024).toFixed(2);

        // 根据内存使用率选择日志级别
        if (memUsagePercent >= MEMORY_CRITICAL_THRESHOLD) {
          console.error(`[内存监控] 🔴 严重警告: 堆内存使用率 ${(memUsagePercent * 100).toFixed(1)}%`);
          console.error(`[内存监控]   已用: ${usedMemMB}MB / 总计: ${totalMemMB}MB`);
          console.error(`[内存监控]   外部: ${externalMemMB}MB / ArrayBuffers: ${arrayBuffersMemMB}MB`);
          console.error(`[内存监控]   WebSocket 连接数: ${clients.size}`);
          console.error(`[内存监控]   ⚠️ 建议立即重启服务器以释放内存！`);
        } else if (memUsagePercent >= MEMORY_WARNING_THRESHOLD) {
          console.warn(`[内存监控] ⚠️ 警告: 堆内存使用率 ${(memUsagePercent * 100).toFixed(1)}%`);
          console.warn(`[内存监控]   已用: ${usedMemMB}MB / 总计: ${totalMemMB}MB`);
          console.warn(`[内存监控]   外部: ${externalMemMB}MB / ArrayBuffers: ${arrayBuffersMemMB}MB`);
          console.warn(`[内存监控]   WebSocket 连接数: ${clients.size}`);
        } else {
          console.log(`[内存监控] ✅ 正常: 堆内存使用率 ${(memUsagePercent * 100).toFixed(1)}% (${usedMemMB}MB / ${totalMemMB}MB)`);
        }

        // 如果内存使用率超过 95%，强制触发垃圾回收（如果可用）
        if (memUsagePercent >= 0.95 && global.gc) {
          console.warn('[内存监控] 触发手动垃圾回收...');
          global.gc();
        }
      }, MEMORY_MONITOR_INTERVAL);

      // 保存定时器引用，用于优雅关闭
      (global as any).memoryMonitorInterval = memoryMonitorInterval;
      console.log(`[内存监控] ✅ 内存监控已启动 (每 ${MEMORY_MONITOR_INTERVAL / 60000} 分钟检查一次)`);

      // 查询并显示数据库中的组织架构数据
      try {
        const orgData = await globalDataManager.getGlobalData('organization_units', 'default');
        console.log('[数据库] 组织架构数据查询结果:');
        console.log('  数据条数:', orgData.length);
        if (orgData.length > 0) {
          const firstItem = orgData[0];
          console.log('  版本:', firstItem?.version || '未知');
          console.log('  部门数量:', firstItem?.data?.departments?.length || 0);
          console.log('  数据完整性:', firstItem?.data ? '完整' : '数据为空');
        } else {
          console.log('  数据库中没有组织架构数据');
        }
      } catch (error) {
        console.error('[数据库] 查询组织架构失败:', error);
      }
    });
  } catch (error) {
    console.error('[服务器] ❌ 启动失败:', error);
    console.error('[服务器] 必需服务连接失败，服务器已终止启动');
    console.error('[服务器] 请检查:');
    console.error('  1. MySQL 数据库是否已启动');
    console.error('  2. Redis 服务是否已启动');
    process.exit(1);
  }
}

// ================================================================
// 优雅关闭处理
// ================================================================

async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`\n[服务器] 收到 ${signal} 信号，开始优雅关闭...`);

  // 0. 清理内存监控定时器（防止内存泄漏）
  const memoryMonitorInterval = (global as any).memoryMonitorInterval;
  if (memoryMonitorInterval) {
    clearInterval(memoryMonitorInterval);
    (global as any).memoryMonitorInterval = null;
    console.log('[服务器] 内存监控定时器已停止');
  }

  // 1. 清理会话清理定时器（防止内存泄漏）
  if (sessionCleanupInterval) {
    clearInterval(sessionCleanupInterval);
    sessionCleanupInterval = null;
    console.log('[服务器] 会话清理定时器已停止');
  }

  // 1. 停止接受新连接
  server.close(() => {
    console.log('[服务器] HTTP 服务器已关闭');
  });

  // 2. 关闭 WebSocket 连接
  wss.clients.forEach(client => {
    client.close(1000, '服务器正在关闭');
  });
  wss.close(() => {
    console.log('[服务器] WebSocket 服务器已关闭');
  });

  // 3. 刷新异步日志队列
  try {
    await asyncSystemLogger.shutdown();
    console.log('[服务器] 日志队列已刷新');
  } catch (error) {
    console.error('[服务器] 刷新日志失败:', error);
  }

  // 4. 关闭数据库连接池
  try {
    await databaseService.close();
    console.log('[服务器] 数据库连接池已关闭');
  } catch (error) {
    console.error('[服务器] 关闭数据库连接失败:', error);
  }

  // 5. 关闭 Redis 连接
  try {
    await redisCacheService.close();
    console.log('[服务器] Redis 连接已关闭');
  } catch (error) {
    console.error('[服务器] 关闭 Redis 失败:', error);
  }

  console.log('[服务器] ✅ 优雅关闭完成');
  process.exit(0);
}

// 注册信号处理器
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 处理未捕获的异常（致命错误）
process.on('uncaughtException', (error) => {
  console.error('[服务器] ❌ 未捕获的异常:', error);

  // 对于某些可恢复的错误，不退出进程
  const isRecoverable = (
    error.message.includes('EADDRINUSE') ||
    error.message.includes('ECONNREFUSED') ||
    error.message.includes('ETIMEDOUT')
  );

  if (isRecoverable) {
    console.warn('[服务器] ⚠️ 可恢复错误，服务继续运行');
    return;
  }

  // 致命错误，记录后退出
  asyncSystemLogger.error('未捕获的异常', { error: error.message, stack: error.stack })
    .then(() => {
      console.error('[服务器] 致命错误，准备退出...');
      // 给日志时间写入
      setTimeout(() => process.exit(1), 1000);
    })
    .catch(() => {
      // 日志写入失败，直接退出
      process.exit(1);
    });
});

// 处理未处理的 Promise 拒绝（不退出进程）
process.on('unhandledRejection', (reason, promise) => {
  console.error('[服务器] ⚠️ 未处理的 Promise 拒绝:', reason);

  // 记录到日志系统（异步，不阻塞）
  asyncSystemLogger.error('未处理的 Promise 拒绝', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined
  }).catch((err) => {
    console.error('[服务器] 日志写入失败:', err);
  });

  // 不退出进程，让服务继续运行
});

startServer();

export { app, wss, sessionManager };
