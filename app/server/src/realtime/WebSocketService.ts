/**
 * WebSocket服务
 *
 * 核心功能：
 * - WebSocket连接管理
 * - 消息收发
 * - 心跳检测
 * - 自动重连
 * - 消息广播
 *
 * 与消息代理集成：
 * - 订阅Redis频道接收消息
 * - 广播消息到所有客户端
 */

import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { messageBroker } from './MessageBroker.js';
import { logger, LOG_CATEGORIES } from '../logging/index.js';
import type {
  WebSocketClient,
  WebSocketMessage,
  MessageType,
  BroadcastOptions
} from './types.js';
import { CHANNELS } from './types.js';

/**
 * WebSocket服务类
 */
export class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WebSocketClient> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30秒
  private readonly HEARTBEAT_TIMEOUT = 60000; // 60秒无响应则断开

  constructor() {
    logger.info(LOG_CATEGORIES.WEBSOCKET, 'WebSocket服务已初始化');
  }

  /**
   * ============================================
   * 服务器管理
   * ============================================
   */

  /**
   * 初始化WebSocket服务器
   */
  initialize(server: any): void {
    this.wss = new WebSocketServer({
      server,
      path: '/ws',
      clientTracking: true
    });

    // 连接处理
    this.wss.on('connection', (ws: WebSocket, req: any) => {
      this.handleConnection(ws, req);
    });

    // 错误处理
    this.wss.on('error', (error) => {
      logger.error(LOG_CATEGORIES.WEBSOCKET, 'WebSocket服务器错误', { error });
    });

    // 启动心跳检测
    this.startHeartbeat();

    logger.info(LOG_CATEGORIES.WEBSOCKET, 'WebSocket服务器已启动');
  }

  /**
   * 关闭WebSocket服务器
   */
  async close(): Promise<void> {
    // 停止心跳
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // 关闭所有客户端连接
    for (const client of this.clients.values()) {
      try {
        client.ws.close();
      } catch (error) {
        // 忽略关闭错误
      }
    }

    this.clients.clear();

    // 关闭服务器
    if (this.wss) {
      await new Promise<void>((resolve) => {
        this.wss!.close((err) => {
          if (err) {
            logger.error(LOG_CATEGORIES.WEBSOCKET, '关闭WebSocket服务器失败', { error: err });
          }
          resolve();
        });
      });
    }

    logger.info(LOG_CATEGORIES.WEBSOCKET, 'WebSocket服务器已关闭');
  }

  /**
   * ============================================
   * 连接处理
   * ============================================
   */

  /**
   * 处理新连接
   */
  private handleConnection(ws: WebSocket, req: any): void {
    const clientId = uuidv4();
    const clientIp = req.socket.remoteAddress || 'unknown';

    // 创建客户端对象
    const client: WebSocketClient = {
      id: clientId,
      ws,
      connectedAt: Date.now(),
      lastPing: Date.now(),
      subscriptions: new Set()
    };

    // 添加到客户端列表
    this.clients.set(clientId, client);

    logger.info(LOG_CATEGORIES.WEBSOCKET_CONNECT, '客户端已连接', {
      clientId,
      ip: clientIp,
      totalClients: this.clients.size
    });

    // 发送连接确认消息
    this.sendToClient(client, {
      type: 'connected' as MessageType,
      payload: { clientId },
      timestamp: Date.now()
    });

    // 消息处理
    ws.on('message', (data: Buffer) => {
      this.handleMessage(client, data);
    });

    // 关闭处理
    ws.on('close', (code: number, reason: Buffer) => {
      this.handleDisconnection(client, code, reason.toString());
    });

    // 错误处理
    ws.on('error', (error) => {
      logger.error(LOG_CATEGORIES.WEBSOCKET, '客户端连接错误', {
        clientId,
        error: error.message
      });
    });

    // Ping处理（响应客户端的ping）
    ws.on('ping', () => {
      client.lastPing = Date.now();
      ws.pong();
    });
  }

  /**
   * 处理断开连接
   */
  private handleDisconnection(client: WebSocketClient, code: number, reason: string): void {
    // 清理订阅
    for (const channel of client.subscriptions) {
      messageBroker.unsubscribe(channel);
    }

    // 从客户端列表移除
    this.clients.delete(client.id);

    logger.info(LOG_CATEGORIES.WEBSOCKET_DISCONNECT, '客户端已断开', {
      clientId: client.id,
      username: client.username,
      code,
      reason,
      remainingClients: this.clients.size
    });
  }

  /**
   * ============================================
   * 消息处理
   * ============================================
   */

  /**
   * 处理客户端消息
   */
  private async handleMessage(client: WebSocketClient, data: Buffer): Promise<void> {
    try {
      const message: WebSocketMessage = JSON.parse(data.toString());

      // 更新最后活动时间
      client.lastPing = Date.now();

      // 处理不同类型的消息
      switch (message.type) {
        case 'ping' as MessageType:
          // 响应ping
          this.sendToClient(client, {
            type: 'pong' as MessageType,
            payload: {},
            timestamp: Date.now()
          });
          break;

        case 'pong' as MessageType:
          // 客户端响应pong，更新活动时间
          client.lastPing = Date.now();
          break;

        case 'session_bind' as MessageType:
          // 绑定会话
          client.sessionId = message.payload.sessionId;
          client.userId = message.payload.userId;
          client.username = message.payload.username;

          logger.debug(LOG_CATEGORIES.WEBSOCKET, '客户端会话已绑定', {
            clientId: client.id,
            username: client.username,
            userId: client.userId
          });

          // 订阅个人频道
          await messageBroker.subscribe(`user:${client.userId}`, (msg) => {
            this.sendToClient(client, msg);
          });

          break;

        case 'subscribe' as MessageType:
          // 订阅频道
          const channel = message.payload.channel;
          if (channel) {
            client.subscriptions.add(channel);

            await messageBroker.subscribe(channel, (msg) => {
              this.sendToClient(client, msg);
            });

            logger.debug(LOG_CATEGORIES.WEBSOCKET, '客户端订阅频道', {
              clientId: client.id,
              channel
            });
          }
          break;

        case 'unsubscribe' as MessageType:
          // 取消订阅
          const unsubscribeChannel = message.payload.channel;
          if (unsubscribeChannel) {
            client.subscriptions.delete(unsubscribeChannel);
            await messageBroker.unsubscribe(unsubscribeChannel);

            logger.debug(LOG_CATEGORIES.WEBSOCKET, '客户端取消订阅', {
              clientId: client.id,
              channel: unsubscribeChannel
            });
          }
          break;

        default:
          logger.warn(LOG_CATEGORIES.WEBSOCKET, '未知消息类型', {
            type: message.type,
            clientId: client.id
          });
      }
    } catch (error: any) {
      logger.error(LOG_CATEGORIES.WEBSOCKET, '处理消息失败', {
        clientId: client.id,
        error: error.message
      });
    }
  }

  /**
   * ============================================
   * 消息发送
   * ============================================
   */

  /**
   * 发送消息到指定客户端
   */
  sendToClient(client: WebSocketClient, message: WebSocketMessage): boolean {
    try {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
        return true;
      }
      return false;
    } catch (error) {
      logger.error(LOG_CATEGORIES.WEBSOCKET, '发送消息失败', {
        clientId: client.id,
        error
      });
      return false;
    }
  }

  /**
   * 广播消息到所有客户端
   */
  broadcast(message: WebSocketMessage, options: BroadcastOptions = {}): number {
    let sentCount = 0;

    for (const client of this.clients.values()) {
      // 过滤条件
      if (options.filter && !options.filter(client)) {
        continue;
      }

      // 排除自己
      if (options.excludeSelf && message.fromUserId && client.userId === message.fromUserId) {
        continue;
      }

      // 频道过滤
      if (options.channels && options.channels.length > 0) {
        const hasChannel = options.channels.some(channel => client.subscriptions.has(channel));
        if (!hasChannel) {
          continue;
        }
      }

      // 发送消息
      if (this.sendToClient(client, message)) {
        sentCount++;
      }
    }

    logger.debug(LOG_CATEGORIES.WEBSOCKET_MESSAGE, '广播消息', {
      type: message.type,
      sentCount,
      totalClients: this.clients.size
    });

    return sentCount;
  }

  /**
   * 发送消息到指定用户
   */
  sendToUser(userId: number, message: WebSocketMessage): number {
    let sentCount = 0;

    for (const client of this.clients.values()) {
      if (client.userId === userId) {
        if (this.sendToClient(client, message)) {
          sentCount++;
        }
      }
    }

    return sentCount;
  }

  /**
   * ============================================
   * 心跳检测
   * ============================================
   */

  /**
   * 启动心跳检测
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const timeout = this.HEARTBEAT_TIMEOUT;

      for (const [clientId, client] of this.clients.entries()) {
        // 检查超时
        if (now - client.lastPing > timeout) {
          logger.warn(LOG_CATEGORIES.WEBSOCKET, '客户端心跳超时，关闭连接', {
            clientId,
            username: client.username,
            lastActivity: new Date(client.lastPing).toISOString()
          });

          try {
            client.ws.close(1000, '心跳超时');
          } catch (error) {
            // 忽略关闭错误
          }
        } else {
          // 发送ping
          try {
            client.ws.ping();
          } catch (error) {
            // ping失败，标记为不活跃
          }
        }
      }
    }, this.HEARTBEAT_INTERVAL);

    // 不阻止进程退出
    this.heartbeatInterval.unref();

    logger.debug(LOG_CATEGORIES.WEBSOCKET, '心跳检测已启动', {
      interval: this.HEARTBEAT_INTERVAL,
      timeout: this.HEARTBEAT_TIMEOUT
    });
  }

  /**
   * ============================================
   * 工具方法
   * ============================================
   */

  /**
   * 获取在线客户端数量
   */
  getOnlineCount(): number {
    return this.clients.size;
  }

  /**
   * 获取指定用户的客户端
   */
  getUserClients(userId: number): WebSocketClient[] {
    return Array.from(this.clients.values()).filter(client => client.userId === userId);
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalClients: number;
    authenticatedClients: number;
    anonymousClients: number;
  } {
    let authenticatedClients = 0;
    let anonymousClients = 0;

    for (const client of this.clients.values()) {
      if (client.userId) {
        authenticatedClients++;
      } else {
        anonymousClients++;
      }
    }

    return {
      totalClients: this.clients.size,
      authenticatedClients,
      anonymousClients
    };
  }
}

/**
 * 全局WebSocket服务实例
 */
export const webSocketService = new WebSocketService();

/**
 * 默认导出
 */
export default webSocketService;
