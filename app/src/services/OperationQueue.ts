/**
 * 操作队列服务
 * 用于管理客户端操作的排队、发送和确认
 */

import type {
  Operation,
  OperationRequest,
  OperationResult,
  OperationQueueStats,
  OperationQueueConfig
} from '@/types/operation';
import { DEFAULT_OPERATION_QUEUE_CONFIG } from '@/types/operation';

// 重新导出类型
export type {
  Operation,
  OperationRequest,
  OperationResult,
  OperationQueueStats,
  OperationQueueConfig
};

/**
 * 操作队列管理类
 */
export class OperationQueue {
  private queue: Map<string, Operation> = new Map();
  private config: OperationQueueConfig;

  constructor(config?: Partial<OperationQueueConfig>) {
    this.config = { ...DEFAULT_OPERATION_QUEUE_CONFIG, ...config };
  }

  /**
   * 入队操作
   * 队列满时拒绝新操作，防止内存溢出
   */
  enqueue(operation: Omit<Operation, 'id' | 'timestamp' | 'status' | 'retryCount'>): string {
    // 检查队列大小，防止内存溢出
    if (this.queue.size >= this.config.maxQueueSize) {
      const errorMsg = `操作队列已满 (${this.queue.size}/${this.config.maxQueueSize})，无法添加新操作`;
      console.error(`[OperationQueue] ${errorMsg}`);
      throw new Error(errorMsg);
    }

    const id = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const op: Operation = {
      ...operation,
      id,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0
    };
    this.queue.set(id, op);
    console.log(`[OperationQueue] 操作入队: ${id}, 类型: ${operation.type}, 数据: ${operation.dataType}/${operation.dataId}, 队列大小: ${this.queue.size}/${this.config.maxQueueSize}`);
    return id;
  }

  /**
   * 获取待发送操作（按时间排序）
   */
  getPendingOperations(): Operation[] {
    return Array.from(this.queue.values())
      .filter(op => op.status === 'pending')
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * 获取指定操作
   */
  getOperation(operationId: string): Operation | undefined {
    return this.queue.get(operationId);
  }

  /**
   * 标记为已发送
   */
  markAsSent(operationId: string): void {
    const op = this.queue.get(operationId);
    if (op) {
      op.status = 'sent';
      console.log(`[OperationQueue] 操作已发送: ${operationId}`);
    }
  }

  /**
   * 处理服务器响应
   */
  handleResponse(operationId: string, response: OperationResult): void {
    const op = this.queue.get(operationId);
    if (!op) {
      console.warn(`[OperationQueue] 操作不存在: ${operationId}`);
      return;
    }

    if (response.success) {
      op.status = 'acknowledged';
      console.log(`[OperationQueue] 操作已确认: ${operationId}, 版本: ${response.version}`);
      // 延迟删除已确认的操作
      setTimeout(() => {
        this.queue.delete(operationId);
        console.log(`[OperationQueue] 操作已删除: ${operationId}`);
      }, this.config.acknowledgedDeleteDelay);
    } else if (response.conflict) {
      op.status = 'conflict';
      console.warn(`[OperationQueue] 操作冲突: ${operationId}, 服务器数据:`, response.data);
      // 保留冲突操作，等待用户处理
    } else {
      op.status = 'failed';
      op.retryCount++;
      console.error(`[OperationQueue] 操作失败: ${operationId}, 消息: ${response.message}, 重试次数: ${op.retryCount}`);
      // 如果重试次数未超限，自动重试
      if (op.retryCount < this.config.maxRetryCount) {
        setTimeout(() => {
          this.retryOperation(operationId);
        }, this.config.retryDelay);
      }
    }
  }

  /**
   * 重试单个操作
   */
  retryOperation(operationId: string): void {
    const op = this.queue.get(operationId);
    if (op && (op.status === 'failed' || op.status === 'conflict')) {
      op.status = 'pending';
      console.log(`[OperationQueue] 重试操作: ${operationId}`);
    }
  }

  /**
   * 重试所有失败操作
   */
  retryFailedOperations(): void {
    this.queue.forEach(op => {
      if (op.status === 'failed' && op.retryCount < this.config.maxRetryCount) {
        op.status = 'pending';
        console.log(`[OperationQueue] 重试失败操作: ${op.id}`);
      }
    });
  }

  /**
   * 删除操作
   */
  deleteOperation(operationId: string): void {
    this.queue.delete(operationId);
    console.log(`[OperationQueue] 手动删除操作: ${operationId}`);
  }

  /**
   * 获取队列状态
   */
  getQueueStats(): {
    total: number;
    pending: number;
    sent: number;
    acknowledged: number;
    conflict: number;
    failed: number;
  } {
    const stats = {
      total: this.queue.size,
      pending: 0,
      sent: 0,
      acknowledged: 0,
      conflict: 0,
      failed: 0
    };

    this.queue.forEach(op => {
      stats[op.status]++;
    });

    return stats;
  }

  /**
   * 清空队列
   */
  clear(): void {
    const count = this.queue.size;
    this.queue.clear();
    console.log(`[OperationQueue] 队列已清空，删除 ${count} 个操作`);
  }

  /**
   * 获取所有操作
   */
  getAllOperations(): Operation[] {
    return Array.from(this.queue.values());
  }
}

// 导出单例
export const operationQueue = new OperationQueue();
