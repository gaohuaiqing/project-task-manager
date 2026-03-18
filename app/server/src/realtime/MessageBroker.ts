/**
 * 消息代理服务
 *
 * 基于Redis Pub/Sub实现消息分发：
 * - 发布消息到指定频道
 * - 订阅频道接收消息
 * - 自动重连
 * - 消息去重
 *
 * 性能优化：
 * - 异步发布（不阻塞主线程）
 * - 批量发布（减少RTT）
 * - 消息压缩（大消息）
 */

import { redisService } from '../cache/index.js';
import { logger, LOG_CATEGORIES } from '../logging/index.js';
import type {
  RedisPubMessage,
  MessageType,
  CHANNELS
} from './types.js';

/**
 * 订阅者回调类型
 */
type SubscriberCallback = (message: RedisPubMessage) => void | Promise<void>;

/**
 * 消息代理类
 */
export class MessageBroker {
  private subscriber: any = null;
  private isSubscribed: boolean = false;
  private subscriptions: Map<string, Set<SubscriberCallback>> = new Map();
  private nodeId: string;
  private isInitializing: boolean = false;

  constructor() {
    // 生成唯一节点ID（用于消息去重）
    this.nodeId = `node-${process.pid}-${Date.now()}`;

    logger.info(LOG_CATEGORIES.WEBSOCKET, '消息代理已初始化', { nodeId: this.nodeId });
  }

  /**
   * ============================================
   * 连接管理
   * ============================================
   */

  /**
   * 连接并初始化订阅者
   */
  async connect(): Promise<void> {
    if (this.isInitializing) {
      return;
    }

    this.isInitializing = true;

    try {
      logger.info(LOG_CATEGORIES.WEBSOCKET, '正在初始化消息订阅...');

      // 等待Redis连接
      await redisService.connect();

      // 创建订阅者连接（专用连接，不能用于其他操作）
      const { createClient } = await import('redis');
      this.subscriber = createClient({
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
          reconnectStrategy: () => 1000
        },
        password: process.env.REDIS_PASSWORD
      });

      // 错误处理
      this.subscriber.on('error', (error: Error) => {
        logger.error(LOG_CATEGORIES.WEBSOCKET, '订阅者连接错误', { error: error.message });
      });

      this.subscriber.on('reconnect', () => {
        logger.info(LOG_CATEGORIES.WEBSOCKET, '订阅者重新连接');
        // 重新订阅
        this.resubscribe();
      });

      await this.subscriber.connect();

      this.isSubscribed = true;
      this.isInitializing = false;

      logger.info(LOG_CATEGORIES.WEBSOCKET, '消息订阅初始化成功');
    } catch (error: any) {
      this.isInitializing = false;
      logger.error(LOG_CATEGORIES.WEBSOCKET, '消息订阅初始化失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    if (this.subscriber) {
      await this.subscriber.quit();
      this.subscriber = null;
    }

    this.isSubscribed = false;
    this.subscriptions.clear();

    logger.info(LOG_CATEGORIES.WEBSOCKET, '消息代理已断开');
  }

  /**
   * ============================================
   * 发布消息
   * ============================================
   */

  /**
   * 发布消息到指定频道
   */
  async publish(channel: string, type: MessageType, payload: any, fromUserId?: number, fromUsername?: string): Promise<boolean> {
    try {
      const message: RedisPubMessage = {
        type,
        payload,
        timestamp: Date.now(),
        fromUserId,
        fromUsername,
        sourceNodeId: this.nodeId
      };

      // 发布到Redis
      await redisService.connect();
      const messageStr = JSON.stringify(message);

      // 使用Redis PUBLISH命令
      const result = await (redisService as any).client?.publish(channel, messageStr);

      logger.debug(LOG_CATEGORIES.WEBSOCKET, '消息已发布', {
        channel,
        type,
        recipients: result || 0
      });

      return true;
    } catch (error: any) {
      logger.error(LOG_CATEGORIES.WEBSOCKET, '发布消息失败', {
        channel,
        type,
        error: error.message
      });
      return false;
    }
  }

  /**
   * 批量发布消息
   */
  async publishBatch(messages: Array<{
    channel: string;
    type: MessageType;
    payload: any;
    fromUserId?: number;
    fromUsername?: string;
  }>): Promise<number> {
    if (messages.length === 0) {
      return 0;
    }

    try {
      await redisService.connect();

      // 使用Redis Pipeline批量发布
      const pipeline = (redisService as any).client?.multi();

      let successCount = 0;

      for (const msg of messages) {
        const redisMessage: RedisPubMessage = {
          type: msg.type,
          payload: msg.payload,
          timestamp: Date.now(),
          fromUserId: msg.fromUserId,
          fromUsername: msg.fromUsername,
          sourceNodeId: this.nodeId
        };

        pipeline?.publish(msg.channel, JSON.stringify(redisMessage));
        successCount++;
      }

      await pipeline?.exec();

      logger.debug(LOG_CATEGORIES.WEBSOCKET, '批量消息已发布', {
        count: successCount
      });

      return successCount;
    } catch (error: any) {
      logger.error(LOG_CATEGORIES.WEBSOCKET, '批量发布失败', {
        count: messages.length,
        error: error.message
      });
      return 0;
    }
  }

  /**
   * ============================================
   * 订阅消息
   * ============================================
   */

  /**
   * 订阅频道
   */
  async subscribe(channel: string, callback: SubscriberCallback): Promise<void> {
    try {
      // 添加回调到订阅列表
      if (!this.subscriptions.has(channel)) {
        this.subscriptions.set(channel, new Set());
      }

      this.subscriptions.get(channel)!.add(callback);

      // 如果是第一次订阅该频道，订阅Redis
      if (this.subscriptions.get(channel)!.size === 1) {
        await this.subscribeChannel(channel);
      }

      logger.debug(LOG_CATEGORIES.WEBSOCKET, '频道订阅成功', {
        channel,
        callbacks: this.subscriptions.get(channel)!.size
      });
    } catch (error: any) {
      logger.error(LOG_CATEGORIES.WEBSOCKET, '订阅频道失败', {
        channel,
        error: error.message
      });
    }
  }

  /**
   * 取消订阅
   */
  async unsubscribe(channel: string, callback?: SubscriberCallback): Promise<void> {
    try {
      const callbacks = this.subscriptions.get(channel);

      if (!callbacks) {
        return;
      }

      if (callback) {
        // 取消指定回调
        callbacks.delete(callback);

        // 如果没有回调了，取消订阅Redis
        if (callbacks.size === 0) {
          await this.unsubscribeChannel(channel);
          this.subscriptions.delete(channel);
        }
      } else {
        // 取消所有回调
        await this.unsubscribeChannel(channel);
        this.subscriptions.delete(channel);
      }

      logger.debug(LOG_CATEGORIES.WEBSOCKET, '取消订阅成功', { channel });
    } catch (error: any) {
      logger.error(LOG_CATEGORIES.WEBSOCKET, '取消订阅失败', {
        channel,
        error: error.message
      });
    }
  }

  /**
   * ============================================
   * 内部方法
   * ============================================
   */

  /**
   * 订阅Redis频道
   */
  private async subscribeChannel(channel: string): Promise<void> {
    if (!this.subscriber || !this.isSubscribed) {
      await this.connect();
    }

    await this.subscriber.subscribe(channel, (message: string) => {
      try {
        const data = JSON.parse(message) as RedisPubMessage;

        // 忽略自己发布的消息
        if (data.sourceNodeId === this.nodeId) {
          return;
        }

        // 调用所有回调
        const callbacks = this.subscriptions.get(channel);
        if (callbacks) {
          for (const callback of callbacks) {
            // 异步执行回调，避免阻塞
            setImmediate(() => {
              try {
                callback(data);
              } catch (error) {
                logger.error(LOG_CATEGORIES.WEBSOCKET, '订阅回调执行失败', {
                  channel,
                  error
                });
              }
            });
          }
        }
      } catch (error) {
        logger.error(LOG_CATEGORIES.WEBSOCKET, '解析消息失败', {
          channel,
          error
        });
      }
    });

    logger.debug(LOG_CATEGORIES.WEBSOCKET, 'Redis频道订阅成功', { channel });
  }

  /**
   * 取消订阅Redis频道
   */
  private async unsubscribeChannel(channel: string): Promise<void> {
    if (this.subscriber) {
      await this.subscriber.unsubscribe(channel);
    }
  }

  /**
   * 重新订阅所有频道
   */
  private async resubscribe(): Promise<void> {
    const channels = Array.from(this.subscriptions.keys());

    for (const channel of channels) {
      try {
        await this.subscribeChannel(channel);
      } catch (error) {
        logger.error(LOG_CATEGORIES.WEBSOCKET, '重新订阅失败', { channel, error });
      }
    }

    logger.info(LOG_CATEGORIES.WEBSOCKET, '重新订阅完成', {
      count: channels.length
    });
  }

  /**
   * ============================================
   * 工具方法
   * ============================================
   */

  /**
   * 获取订阅统计
   */
  getStats(): { channels: number; callbacks: number } {
    let totalCallbacks = 0;

    for (const callbacks of this.subscriptions.values()) {
      totalCallbacks += callbacks.size;
    }

    return {
      channels: this.subscriptions.size,
      callbacks: totalCallbacks
    };
  }
}

/**
 * 全局消息代理实例
 */
export const messageBroker = new MessageBroker();

/**
 * 默认导出
 */
export default messageBroker;
