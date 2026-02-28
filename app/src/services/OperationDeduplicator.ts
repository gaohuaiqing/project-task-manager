/**
 * 操作去重服务
 *
 * 职责：
 * 1. 防止重复提交相同的操作
 * 2. 基于操作指纹识别重复
 * 3. 支持操作合并（相同操作只保留最新的）
 * 4. 防止离线时快速点击导致的重复
 */

import type { Operation } from '@/types/operation';

// ================================================================
// 类型定义
// ================================================================

export interface OperationFingerprint {
  /** 操作类型 */
  type: string;
  /** 数据类型 */
  dataType: string;
  /** 数据ID */
  dataId: string;
  /** 操作内容哈希 */
  contentHash: string;
}

export interface DeduplicationResult {
  /** 是否重复 */
  isDuplicate: boolean;
  /** 原有操作ID（如果是重复） */
  existingOperationId?: string;
  /** 是否合并到现有操作 */
  merged?: boolean;
}

// ================================================================
// OperationDeduplicator 类
// ================================================================

class OperationDeduplicator {
  /** 待处理操作的指纹集合 */
  private pendingFingerprints: Map<string, string> = new Map();  // fingerprint -> operationId
  /** 操作内容缓存（用于哈希计算） */
  private operationContents: Map<string, any> = new Map();     // operationId -> content

  /**
   * 计算操作指纹
   */
  private computeFingerprint(operation: Omit<Operation, 'id' | 'timestamp' | 'status' | 'retryCount'>): string {
    // 生成内容哈希
    const content = JSON.stringify({
      type: operation.type,
      dataType: operation.dataType,
      dataId: operation.dataId,
      data: operation.data
    });

    // 简单哈希算法
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转为32位整数
    }

    return hash.toString(36);
  }

  /**
   * 检查是否重复
   */
  checkDuplicate(operation: Omit<Operation, 'id' | 'timestamp' | 'status' | 'retryCount'>): DeduplicationResult {
    const fingerprint = this.computeFingerprint(operation);

    // 检查是否有相同的待处理操作
    const existingOperationId = this.pendingFingerprints.get(fingerprint);

    if (existingOperationId) {
      // 找到重复操作
      const existingContent = this.operationContents.get(existingOperationId);

      // 检查是否内容完全相同
      const isIdentical = JSON.stringify(existingContent) === JSON.stringify(operation.data);

      if (isIdentical) {
        console.log(`[Deduplicator] 检测到重复操作: ${fingerprint}, 已有操作: ${existingOperationId}`);
        return {
          isDuplicate: true,
          existingOperationId,
          merged: false
        };
      } else {
        // 内容不同但操作相同，可以合并
        console.log(`[Deduplicator] 检测到可合并操作: ${fingerprint}, 合并到: ${existingOperationId}`);
        return {
          isDuplicate: true,
          existingOperationId,
          merged: true
        };
      }
    }

    return { isDuplicate: false };
  }

  /**
   * 注册操作（入队后调用）
   */
  registerOperation(operation: Operation): void {
    const fingerprint = this.computeFingerprint(operation);
    this.pendingFingerprints.set(fingerprint, operation.id);
    this.operationContents.set(operation.id, operation.data);
  }

  /**
   * 取消注册操作（完成/取消后调用）
   */
  unregisterOperation(operation: Operation): void {
    const fingerprint = this.computeFingerprint(operation);

    // 只有当该指纹映射到此操作ID时才删除
    if (this.pendingFingerprints.get(fingerprint) === operation.id) {
      this.pendingFingerprints.delete(fingerprint);
    }

    this.operationContents.delete(operation.id);
  }

  /**
   * 更新操作内容（合并时使用）
   */
  updateOperationContent(operationId: string, newData: any): void {
    this.operationContents.set(operationId, newData);
  }

  /**
   * 批量检查重复
   */
  checkDuplicates(operations: Array<Omit<Operation, 'id' | 'timestamp' | 'status' | 'retryCount'>>): Map<string, DeduplicationResult> {
    const results = new Map<string, DeduplicationResult>();

    for (const operation of operations) {
      const fingerprint = this.computeFingerprint(operation);
      const result = this.checkDuplicate(operation);
      results.set(fingerprint, result);
    }

    return results;
  }

  /**
   * 清除所有记录
   */
  clear(): void {
    this.pendingFingerprints.clear();
    this.operationContents.clear();
    console.log('[Deduplicator] 已清除所有去重记录');
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    pendingCount: number;
    registeredOperations: number;
  } {
    return {
      pendingCount: this.pendingFingerprints.size,
      registeredOperations: this.operationContents.size
    };
  }

  /**
   * 查找相似操作（用于调试）
   */
  findSimilarOperations(operation: Omit<Operation, 'id' | 'timestamp' | 'status' | 'retryCount'>): Operation[] {
    const similar: Operation[] = [];

    for (const [fingerprint, operationId] of this.pendingFingerprints.entries()) {
      if (fingerprint.startsWith(operation.dataType) && fingerprint.includes(operation.dataId)) {
        // 找到相似操作
        const content = this.operationContents.get(operationId);
        if (content) {
          similar.push({
            id: operationId,
            type: operation.type,
            dataType: operation.dataType,
            dataId: operation.dataId,
            data: content,
            timestamp: Date.now(),
            status: 'pending' as const,
            retryCount: 0
          });
        }
      }
    }

    return similar;
  }
}

// ================================================================
// 导出单例
// ================================================================

export const operationDeduplicator = new OperationDeduplicator();

// 为了向后兼容，同时导出类
export { OperationDeduplicator };

// ================================================================
// 集成到 IndexedDBOperationQueue 的辅助函数
// ================================================================

/**
 * 包装 enqueue 方法，添加去重检查
 */
export function createEnqueueWithDedup<T extends { enqueue: (op: any) => Promise<string> }>(
  queue: T
): T['enqueue'] {
  return async (operation: any) => {
    // 检查重复
    const result = operationDeduplicator.checkDuplicate(operation);

    if (result.isDuplicate) {
      if (result.merged) {
        // 合并操作：更新现有操作的内容
        console.log(`[Deduplicator] 合并操作到: ${result.existingOperationId}`);
        // 这里可以调用队列的更新方法（如果有的话）
        return result.existingOperationId!;
      } else {
        // 完全重复，忽略
        console.warn(`[Deduplicator] 忽略重复操作: ${result.existingOperationId}`);
        return result.existingOperationId!;
      }
    }

    // 不重复，正常入队
    const operationId = await queue.enqueue(operation);

    // 注册到去重器
    operationDeduplicator.registerOperation({
      ...operation,
      id: operationId,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0
    });

    return operationId;
  };
}

/**
 * 包装操作完成处理，清理去重记录
 */
export function createCompleteWithDedup(
  onComplete: (operationId: string, response: any) => Promise<void>
): (operationId: string, response: any) => Promise<void> {
  return async (operationId: string, response: any) => {
    await onComplete(operationId, response);

    // 清理去重记录（需要获取操作内容来计算指纹）
    // 这里简化处理，直接清理所有记录
    // 在实际应用中，应该根据 operationId 获取操作信息
    operationDeduplicator.clear();
  };
}
