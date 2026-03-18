/**
 * 广播服务
 *
 * 核心功能：
 * - 数据变更广播
 * - WebSocket + Redis Pub/Sub 双通道
 * - 消息去重
 * - 批量发送优化
 *
 * 工作流程：
 * 1. 用户A更新数据
 * 2. 数据服务调用 broadcastDataChange()
 * 3. 消息发布到Redis Pub/Sub
 * 4. 所有服务器节点收到消息
 * 5. 每个节点广播到自己的WebSocket客户端
 * 6. 客户端收到更新，自动刷新UI
 */

import { webSocketService } from './WebSocketService.js';
import { messageBroker } from './MessageBroker.js';
import { logger, LOG_CATEGORIES } from '../logging/index.js';
import type {
  WebSocketMessage,
  MessageType,
  DataChangePayload,
  BroadcastOptions
} from './types.js';
import { CHANNELS, DataChangeType } from './types.js';

/**
 * 广播服务类
 */
export class BroadcastService {
  /**
   * ============================================
   * 数据变更广播
   * ============================================
   */

  /**
   * 广播项目变更
   */
  async broadcastProjectChange(
    projectId: number,
    changeType: DataChangeType,
    data?: any,
    userId?: number,
    username?: string
  ): Promise<void> {
    const payload: DataChangePayload = {
      entityType: 'project',
      entityId: projectId,
      changeType,
      data
    };

    await this.broadcastDataChange(
      'project_change' as MessageType,
      payload,
      CHANNELS.PROJECTS,
      userId,
      username
    );

    // 级联失效缓存
    const { cacheManager } = await import('../cache/index.js');
    if (changeType === DataChangeType.UPDATE || changeType === DataChangeType.DELETE) {
      await cacheManager.invalidateProject(projectId);
    }
  }

  /**
   * 广播成员变更
   */
  async broadcastMemberChange(
    memberId: number,
    changeType: DataChangeType,
    data?: any,
    userId?: number,
    username?: string
  ): Promise<void> {
    const payload: DataChangePayload = {
      entityType: 'member',
      entityId: memberId,
      changeType,
      data
    };

    await this.broadcastDataChange(
      'member_change' as MessageType,
      payload,
      CHANNELS.MEMBERS,
      userId,
      username
    );

    // 级联失效缓存
    const { cacheManager } = await import('../cache/index.js');
    if (changeType === DataChangeType.UPDATE || changeType === DataChangeType.DELETE) {
      await cacheManager.invalidateMember(memberId);
    }
  }

  /**
   * 广播任务变更
   */
  async broadcastTaskChange(
    taskId: number,
    changeType: DataChangeType,
    data?: any,
    userId?: number,
    username?: string
  ): Promise<void> {
    const payload: DataChangePayload = {
      entityType: 'task',
      entityId: taskId,
      changeType,
      data
    };

    await this.broadcastDataChange(
      'task_change' as MessageType,
      payload,
      CHANNELS.TASKS,
      userId,
      username
    );

    // 级联失效缓存
    const { cacheManager } = await import('../cache/index.js');
    if (changeType === DataChangeType.UPDATE || changeType === DataChangeType.DELETE) {
      await cacheManager.invalidateTask(taskId);
    }
  }

  /**
   * 广播数据变更（通用方法）
   */
  async broadcastDataChange(
    type: MessageType,
    payload: DataChangePayload,
    channel: string,
    userId?: number,
    username?: string
  ): Promise<void> {
    try {
      // 1. 发布到Redis Pub/Sub（跨服务器广播）
      await messageBroker.publish(channel, type, payload, userId, username);

      // 2. 同时广播到本地WebSocket客户端
      const message: WebSocketMessage = {
        type,
        payload,
        timestamp: Date.now(),
        fromUserId: userId,
        fromUsername: username
      };

      webSocketService.broadcast(message, {
        excludeSelf: true // 不发送给修改者自己
      });

      logger.debug(LOG_CATEGORIES.DATA_SYNC, '数据变更已广播', {
        type,
        entityType: payload.entityType,
        entityId: payload.entityId,
        changeType: payload.changeType,
        channel,
        fromUser: username
      });
    } catch (error: any) {
      logger.error(LOG_CATEGORIES.DATA_SYNC, '广播数据变更失败', {
        type,
        payload,
        error: error.message
      });
    }
  }

  /**
   * ============================================
   * 系统通知广播
   * ============================================
   */

  /**
   * 广播系统通知
   */
  async broadcastSystemNotification(
    notification: {
      title: string;
      message: string;
      type?: 'info' | 'warning' | 'error' | 'success';
    },
    userId?: number
  ): Promise<void> {
    const message: WebSocketMessage = {
      type: 'system_notification' as MessageType,
      payload: notification,
      timestamp: Date.now()
    };

    if (userId) {
      // 发送给指定用户
      webSocketService.sendToUser(userId, message);

      // 同时通过Redis发送（用户可能在其他服务器节点）
      await messageBroker.publish(
        `user:${userId}`,
        'system_notification' as MessageType,
        notification
      );
    } else {
      // 广播给所有用户
      await messageBroker.publish(
        CHANNELS.NOTIFICATIONS,
        'system_notification' as MessageType,
        notification
      );

      webSocketService.broadcast(message);
    }

    logger.info(LOG_CATEGORIES.WEBSOCKET_MESSAGE, '系统通知已发送', {
      title: notification.title,
      type: notification.type || 'info',
      targetUser: userId || 'all'
    });
  }

  /**
   * ============================================
   * 会话相关广播
   * ============================================
   */

  /**
   * 广播会话终止通知
   */
  async broadcastSessionTerminated(
    username: string,
    reason: string
  ): Promise<void> {
    const message: WebSocketMessage = {
      type: 'session_terminated' as MessageType,
      payload: {
        message: `您的账号已在其他设备登录，当前会话已被终止`,
        reason
      },
      timestamp: Date.now()
    };

    // 通过Redis发布（用户可能在其他服务器节点）
    await messageBroker.publish(
      CHANNELS.SESSIONS,
      'session_terminated' as MessageType,
      message.payload
    );

    logger.info(LOG_CATEGORIES.WEBSOCKET_MESSAGE, '会话终止通知已发送', {
      username,
      reason
    });
  }

  /**
   * 广播用户登录
   */
  async broadcastUserLogin(
    userId: number,
    username: string,
    deviceInfo?: string
  ): Promise<void> {
    const message: WebSocketMessage = {
      type: 'user_login' as MessageType,
      payload: {
        userId,
        username,
        deviceInfo,
        timestamp: Date.now()
      },
      timestamp: Date.now()
    };

    // 通知其他设备
    await messageBroker.publish(
      `user:${userId}`,
      'user_login' as MessageType,
      message.payload
    );

    logger.info(LOG_CATEGORIES.WEBSOCKET_MESSAGE, '用户登录通知已发送', {
      userId,
      username
    });
  }

  /**
   * ============================================
   * 批量广播优化
   * ============================================
   */

  /**
   * 批量广播数据变更
   */
  async broadcastBatch(changes: Array<{
    type: MessageType;
    payload: DataChangePayload;
    channel: string;
  }>, userId?: number, username?: string): Promise<void> {
    if (changes.length === 0) {
      return;
    }

    try {
      // 批量发布到Redis
      await messageBroker.publishBatch(
        changes.map(change => ({
          channel: change.channel,
          type: change.type,
          payload: change.payload,
          fromUserId: userId,
          fromUsername: username
        }))
      );

      // 本地WebSocket广播
      for (const change of changes) {
        const message: WebSocketMessage = {
          type: change.type,
          payload: change.payload,
          timestamp: Date.now(),
          fromUserId: userId,
          fromUsername: username
        };

        webSocketService.broadcast(message, {
          excludeSelf: true
        });
      }

      logger.debug(LOG_CATEGORIES.DATA_SYNC, '批量数据变更已广播', {
        count: changes.length,
        fromUser: username
      });
    } catch (error: any) {
      logger.error(LOG_CATEGORIES.DATA_SYNC, '批量广播失败', {
        count: changes.length,
        error: error.message
      });
    }
  }

  /**
   * ============================================
   * 自定义广播
   * ============================================
   */

  /**
   * 自定义广播
   */
  async broadcast(
    type: MessageType,
    payload: any,
    options: {
      channel?: string;
      userId?: number;
      username?: string;
      excludeSelf?: boolean;
    } = {}
  ): Promise<void> {
    const { channel, userId, username, excludeSelf = false } = options;

    const message: WebSocketMessage = {
      type,
      payload,
      timestamp: Date.now(),
      fromUserId: userId,
      fromUsername: username
    };

    // 发布到Redis
    if (channel) {
      await messageBroker.publish(channel, type, payload, userId, username);
    }

    // 本地WebSocket广播
    webSocketService.broadcast(message, {
      excludeSelf
    });
  }

  /**
   * ============================================
   * 统计信息
   * ============================================
   */

  /**
   * 获取广播统计
   */
  getStats(): {
    onlineClients: number;
    subscriptions: any;
  } {
    return {
      onlineClients: webSocketService.getOnlineCount(),
      subscriptions: messageBroker.getStats()
    };
  }
}

/**
 * 全局广播服务实例
 */
export const broadcastService = new BroadcastService();

/**
 * 默认导出
 */
export default broadcastService;
