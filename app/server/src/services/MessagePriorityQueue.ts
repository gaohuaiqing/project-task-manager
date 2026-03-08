/**
 * 消息优先级队列服务
 *
 * 职责：
 * 1. 为 WebSocket 广播添加优先级队列
 * 2. 确保重要消息优先发送
 * 3. 防止消息积压
 * 4. 提供消息统计和监控
 */

import { WebSocket } from 'ws';

// ================================================================
// 类型定义
// ================================================================

export type MessagePriority = 'critical' | 'high' | 'normal' | 'low';

export interface PriorityMessage {
  /** 消息ID */
  id: string;
  /** 消息类型 */
  type: string;
  /** 消息数据 */
  data: any;
  /** 优先级 */
  priority: MessagePriority;
  /** 创建时间 */
  timestamp: number;
  /** 目标客户端ID（可选，为空则广播给所有） */
  targetClientId?: string;
  /** 重试次数 */
  retryCount?: number;
}

export interface QueueStats {
  /** 队列大小 */
  queueSize: number;
  /** 各优先级消息数量 */
  byPriority: Record<MessagePriority, number>;
  /** 已发送消息数 */
  sentCount: number;
  /** 失败消息数 */
  failedCount: number;
  /** 平均处理时间（毫秒） */
  avgProcessTime: number;
}

// ================================================================
// 优先级配置
// ================================================================

const PRIORITY_CONFIG: Record<MessagePriority, { weight: number; description: string }> = {
  critical: { weight: 0, description: '紧急消息（权限变更、会话终止）' },
  high: { weight: 1, description: '重要消息（任务分配、状态变更）' },
  normal: { weight: 2, description: '普通消息（数据更新、同步）' },
  low: { weight: 3, description: '低优先级（日志、统计）' }
};

// 根据消息类型自动判断优先级
const TYPE_PRIORITY_MAP: Record<string, MessagePriority> = {
  // 紧急消息
  'session_terminated': 'critical',
  'permission_changed': 'critical',
  'force_logout': 'critical',

  // 重要消息
  'task_assigned': 'high',
  'task_status_changed': 'high',
  'wbs_task_updated': 'high',
  'data_conflict': 'high',

  // 普通消息
  'global_data_updated': 'normal',
  'data_update_ack': 'normal',
  'sync_response': 'normal',

  // 低优先级
  'system_log': 'low',
  'statistics': 'low'
};

// ================================================================
// MessagePriorityQueue 类
// ================================================================

export class MessagePriorityQueue {
  private queues: Map<MessagePriority, PriorityMessage[]> = new Map();
  private processing = false;
  private sendFunction: (message: PriorityMessage) => Promise<boolean>;
  private stats = {
    sentCount: 0,
    failedCount: 0,
    totalProcessTime: 0
  };

  // 配置
  private maxQueueSize = 1000;  // 每个优先级最多1000条
  private processInterval = 10;  // 处理间隔10ms
  private retryLimit = 3;        // 最多重试3次

  constructor(sendFn: (message: PriorityMessage) => Promise<boolean>) {
    this.sendFunction = sendFn;

    // 初始化队列
    for (const priority of ['critical', 'high', 'normal', 'low'] as MessagePriority[]) {
      this.queues.set(priority, []);
    }

    // 启动处理循环
    this.startProcessing();
  }

  /**
   * 添加消息到队列
   */
  enqueue(message: Omit<PriorityMessage, 'id' | 'timestamp' | 'priority'>): string {
    // 自动判断优先级
    const priority = message.priority || TYPE_PRIORITY_MAP[message.type] || 'normal';

    const priorityMessage: PriorityMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      priority,
      timestamp: Date.now(),
      retryCount: 0
    };

    const queue = this.queues.get(priority);
    if (!queue) {
      console.error(`[PriorityQueue] 无效的优先级: ${priority}`);
      return priorityMessage.id;
    }

    // 检查队列大小
    if (queue.length >= this.maxQueueSize) {
      console.warn(`[PriorityQueue] ${priority} 队列已满，丢弃最旧消息`);
      queue.shift();  // 移除最旧的
    }

    queue.push(priorityMessage);
    console.debug(`[PriorityQueue] 消息入队: ${priorityMessage.id}, 优先级: ${priority}`);

    return priorityMessage.id;
  }

  /**
   * 批量入队
   */
  enqueueBatch(messages: Array<Omit<PriorityMessage, 'id' | 'timestamp' | 'priority'>>): string[] {
    return messages.map(msg => this.enqueue(msg));
  }

  /**
   * 启动处理循环
   */
  private startProcessing(): void {
    const process = async () => {
      if (this.processing) {
        return;
      }

      this.processing = true;

      try {
        await this.processMessages();
      } catch (error) {
        console.error('[PriorityQueue] 处理消息失败:', error);
      } finally {
        this.processing = false;
      }

      // 继续下一轮
      setTimeout(process, this.processInterval);
    };

    // 启动
    process();
  }

  /**
   * 处理消息（按优先级顺序）
   */
  private async processMessages(): Promise<void> {
    const startTime = Date.now();
    let processedCount = 0;

    // 按优先级顺序处理：critical > high > normal > low
    for (const priority of ['critical', 'high', 'normal', 'low'] as MessagePriority[]) {
      const queue = this.queues.get(priority);
      if (!queue || queue.length === 0) {
        continue;
      }

      // 每次处理一批消息（避免阻塞）
      const batchSize = priority === 'critical' ? 10 :  // 紧急消息每批处理10条
                         priority === 'high' ? 5 :      // 重要消息每批处理5条
                         3;                             // 其他消息每批处理3条

      for (let i = 0; i < Math.min(batchSize, queue.length); i++) {
        const message = queue.shift()!;
        const success = await this.sendMessage(message);

        if (success) {
          this.stats.sentCount++;
          processedCount++;
        } else {
          // 处理失败，加入重试
          if ((message.retryCount || 0) < this.retryLimit) {
            message.retryCount = (message.retryCount || 0) + 1;
            // 重新加入队列末尾
            queue.push(message);
          } else {
            // 达到重试上限，丢弃
            console.error(`[PriorityQueue] 消息发送失败，已达重试上限: ${message.id}`);
            this.stats.failedCount++;
          }
        }
      }
    }

    // 更新统计
    const processTime = Date.now() - startTime;
    if (processedCount > 0) {
      this.stats.totalProcessTime += processTime;
    }
  }

  /**
   * 发送单个消息
   */
  private async sendMessage(message: PriorityMessage): Promise<boolean> {
    try {
      const success = await this.sendFunction(message);
      return success;
    } catch (error) {
      console.error(`[PriorityQueue] 发送消息失败: ${message.id}`, error);
      return false;
    }
  }

  /**
   * 获取队列统计
   */
  getStats(): QueueStats {
    const byPriority: Record<MessagePriority, number> = {
      critical: 0,
      high: 0,
      normal: 0,
      low: 0
    };

    let queueSize = 0;
    for (const [priority, queue] of this.queues.entries()) {
      byPriority[priority] = queue.length;
      queueSize += queue.length;
    }

    const avgProcessTime = this.stats.sentCount > 0
      ? this.stats.totalProcessTime / this.stats.sentCount
      : 0;

    return {
      queueSize,
      byPriority,
      sentCount: this.stats.sentCount,
      failedCount: this.stats.failedCount,
      avgProcessTime
    };
  }

  /**
   * 清空队列
   */
  clear(): void {
    for (const queue of this.queues.values()) {
      queue.length = 0;
    }
    console.log('[PriorityQueue] 队列已清空');
  }

  /**
   * 获取队列大小
   */
  size(): number {
    let total = 0;
    for (const queue of this.queues.values()) {
      total += queue.length;
    }
    return total;
  }

  /**
   * 检查是否为空
   */
  isEmpty(): boolean {
    return this.size() === 0;
  }
}

// ================================================================
// 导出工厂函数
// ================================================================

/**
 * 创建消息优先级队列
 */
export function createMessagePriorityQueue(
  sendFn: (message: PriorityMessage) => Promise<boolean>
): MessagePriorityQueue {
  return new MessagePriorityQueue(sendFn);
}
