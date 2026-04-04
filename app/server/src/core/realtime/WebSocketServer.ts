/**
 * WebSocket 服务端 - 实时通知推送
 *
 * 职责：
 * - 管理 WebSocket 连接（按 userId 映射）
 * - 支持向指定用户推送消息
 * - 心跳检测、自动清理断开连接
 * - 认证集成（基于 cookie sessionId）
 */
import { WebSocketServer as WSServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { sessionCache } from '../cache/session-cache';
import { logger } from '../logger';

/** 用户连接映射：userId -> Set<WebSocket> */
const userConnections = new Map<number, Set<WebSocket>>();

/** 心跳间隔（30秒） */
const HEARTBEAT_INTERVAL = 30_000;

/** 心跳超时（10秒无响应断开） */
const HEARTBEAT_TIMEOUT = 10_000;

/**
 * 从 WebSocket 升级请求中提取并验证 userId
 */
async function authenticateWsConnection(req: any): Promise<number | null> {
  try {
    // 从 cookie header 解析 sessionId
    const cookieHeader = req.headers?.cookie || '';
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map((c: string) => {
        const [k, ...v] = c.trim().split('=');
        return [k, v.join('=')];
      })
    );

    const sessionId = cookies['sessionId'];
    if (!sessionId) return null;

    // 通过 session-cache 验证
    const context = await sessionCache.getSession(sessionId);
    return context?.user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * 初始化 WebSocket 服务器
 */
export function initWebSocketServer(httpServer: Server): void {
  const wss = new WSServer({
    server: httpServer,
    path: '/ws',
    // 验证升级请求
    verifyClient: async (info, callback) => {
      const userId = await authenticateWsConnection(info.req);
      if (userId) {
        // 将 userId 挂载到 req 上，供 connection 事件使用
        (info.req as any).__wsUserId = userId;
        callback(true);
      } else {
        logger.warn('[WebSocket] 拒绝未认证的连接');
        callback(false, 401, 'Unauthorized');
      }
    },
  });

  wss.on('connection', (ws, req) => {
    const userId = (req as any).__wsUserId as number;
    if (!userId) {
      ws.close(4001, 'Authentication failed');
      return;
    }

    // 注册连接
    registerConnection(userId, ws);
    logger.info(`[WebSocket] 用户 ${userId} 已连接 (当前在线: ${userConnections.size})`);

    // 心跳机制
    let heartbeatTimer: ReturnType<typeof setTimeout> | null = null;

    const startHeartbeat = () => {
      heartbeatTimer = setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
          // 超时检测
          const timeout = setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.terminate();
            }
          }, HEARTBEAT_TIMEOUT);
          (ws as any).__heartbeatTimeout = timeout;
        }
      }, HEARTBEAT_INTERVAL);
    };

    ws.on('pong', () => {
      // 收到 pong，清除超时定时器
      const timeout = (ws as any).__heartbeatTimeout;
      if (timeout) clearTimeout(timeout);
      // 重启下一轮心跳
      if (heartbeatTimer) clearTimeout(heartbeatTimer);
      startHeartbeat();
    });

    // 处理客户端消息（仅处理 ping/pong）
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } catch {
        // 忽略无效消息
      }
    });

    // 断开连接时清理
    ws.on('close', () => {
      if (heartbeatTimer) clearTimeout(heartbeatTimer);
      const timeout = (ws as any).__heartbeatTimeout;
      if (timeout) clearTimeout(timeout);
      removeConnection(userId, ws);
      logger.info(`[WebSocket] 用户 ${userId} 已断开 (当前在线: ${userConnections.size})`);
    });

    startHeartbeat();

    // 发送连接确认
    ws.send(JSON.stringify({ type: 'connected', data: { userId } }));
  });

  logger.info('[WebSocket] 服务已初始化 (/ws)');
}

/**
 * 注册用户连接
 */
function registerConnection(userId: number, ws: WebSocket): void {
  if (!userConnections.has(userId)) {
    userConnections.set(userId, new Set());
  }
  userConnections.get(userId)!.add(ws);
}

/**
 * 移除用户连接
 */
function removeConnection(userId: number, ws: WebSocket): void {
  const connections = userConnections.get(userId);
  if (connections) {
    connections.delete(ws);
    if (connections.size === 0) {
      userConnections.delete(userId);
    }
  }
}

/**
 * 向指定用户推送消息
 * @returns 是否成功推送（用户是否在线）
 */
export function sendToUser(userId: number, type: string, data: unknown): boolean {
  const connections = userConnections.get(userId);
  if (!connections || connections.size === 0) return false;

  const message = JSON.stringify({ type, data, timestamp: Date.now() });
  let sent = false;

  connections.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
      sent = true;
    }
  });

  return sent;
}

/**
 * 向所有在线用户广播消息
 */
export function broadcast(type: string, data: unknown): number {
  const message = JSON.stringify({ type, data, timestamp: Date.now() });
  let count = 0;

  userConnections.forEach((connections) => {
    connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
        count++;
      }
    });
  });

  return count;
}

/**
 * 获取当前在线用户数量
 */
export function getOnlineCount(): number {
  return userConnections.size;
}

/**
 * 检查用户是否在线
 */
export function isUserOnline(userId: number): boolean {
  const connections = userConnections.get(userId);
  return !!connections && connections.size > 0;
}
