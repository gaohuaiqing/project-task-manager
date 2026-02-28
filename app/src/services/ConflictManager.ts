/**
 * 冲突管理服务
 *
 * 职责：
 * 1. 管理数据冲突的检测和解决
 * 2. 提供冲突通知机制
 * 3. 支持冲突解决策略（保留本地/保留服务器/合并）
 * 4. UI 层集成支持
 */

import { unifiedStorage, type StorageDataType } from './UnifiedStorage';

// ================================================================
// 类型定义
// ================================================================

export interface DataConflict {
  /** 冲突ID */
  id: string;
  /** 数据类型 */
  dataType: string;
  /** 数据ID */
  dataId: string;
  /** 冲突消息 */
  message: string;
  /** 本地数据 */
  localData: any;
  /** 服务器数据 */
  serverData: any;
  /** 服务器版本 */
  serverVersion: number;
  /** 时间戳 */
  timestamp: number;
  /** 冲突状态 */
  status: 'pending' | 'resolved' | 'ignored';
}

export type ConflictResolution = 'keep_local' | 'keep_server' | 'merge';

export interface ConflictResolutionResult {
  conflictId: string;
  resolution: ConflictResolution;
  resolvedData?: any;
}

export type ConflictListener = (conflict: DataConflict) => void;
export type ResolutionListener = (result: ConflictResolutionResult) => void;

// ================================================================
// ConflictManager 类
// ================================================================

class ConflictManager {
  private conflicts: Map<string, DataConflict> = new Map();
  private conflictListeners: Set<ConflictListener> = new Set();
  private resolutionListeners: Set<ResolutionListener> = new Set();

  /**
   * 添加冲突
   */
  addConflict(conflict: Omit<DataConflict, 'id' | 'timestamp' | 'status'>): string {
    const id = `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newConflict: DataConflict = {
      ...conflict,
      id,
      timestamp: Date.now(),
      status: 'pending'
    };

    this.conflicts.set(id, newConflict);

    // 通知监听器
    this.notifyConflictListeners(newConflict);

    console.warn(`[ConflictManager] 新冲突: ${id}, 类型: ${conflict.dataType}/${conflict.dataId}`);
    return id;
  }

  /**
   * 获取冲突
   */
  getConflict(conflictId: string): DataConflict | undefined {
    return this.conflicts.get(conflictId);
  }

  /**
   * 获取所有待处理冲突
   */
  getPendingConflicts(): DataConflict[] {
    return Array.from(this.conflicts.values())
      .filter(c => c.status === 'pending')
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * 解决冲突
   */
  async resolveConflict(
    conflictId: string,
    resolution: ConflictResolution,
    customData?: any
  ): Promise<ConflictResolutionResult> {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) {
      throw new Error(`冲突不存在: ${conflictId}`);
    }

    let resolvedData: any;

    switch (resolution) {
      case 'keep_local':
        // 保留本地数据
        resolvedData = conflict.localData;
        console.log(`[ConflictManager] 保留本地数据: ${conflictId}`);
        break;

      case 'keep_server':
        // 保留服务器数据
        resolvedData = conflict.serverData;
        console.log(`[ConflictManager] 保留服务器数据: ${conflictId}`);
        break;

      case 'merge':
        // 合并数据（使用自定义数据或默认合并策略）
        resolvedData = customData || this.defaultMerge(conflict.localData, conflict.serverData);
        console.log(`[ConflictManager] 合并数据: ${conflictId}`);
        break;
    }

    // 更新冲突状态
    conflict.status = 'resolved';
    this.conflicts.set(conflictId, conflict);

    // 更新本地存储
    try {
      unifiedStorage.set(conflict.dataType as StorageDataType, resolvedData, {
        version: conflict.serverVersion
      });
    } catch (error) {
      console.error(`[ConflictManager] 更新本地存储失败:`, error);
    }

    const result: ConflictResolutionResult = {
      conflictId,
      resolution,
      resolvedData
    };

    // 通知监听器
    this.notifyResolutionListeners(result);

    // 5秒后删除已解决的冲突
    setTimeout(() => {
      this.conflicts.delete(conflictId);
    }, 5000);

    return result;
  }

  /**
   * 忽略冲突
   */
  ignoreConflict(conflictId: string): void {
    const conflict = this.conflicts.get(conflictId);
    if (conflict) {
      conflict.status = 'ignored';
      this.conflicts.set(conflictId, conflict);
      console.log(`[ConflictManager] 忽略冲突: ${conflictId}`);
    }
  }

  /**
   * 批量解决冲突（全部使用服务器数据）
   */
  async resolveAllWithServerData(): Promise<number> {
    const pendingConflicts = this.getPendingConflicts();
    let count = 0;

    for (const conflict of pendingConflicts) {
      await this.resolveConflict(conflict.id, 'keep_server');
      count++;
    }

    console.log(`[ConflictManager] 批量解决了 ${count} 个冲突（使用服务器数据）`);
    return count;
  }

  /**
   * 清除已解决的冲突
   */
  clearResolvedConflicts(): number {
    let count = 0;

    for (const [id, conflict] of this.conflicts.entries()) {
      if (conflict.status === 'resolved' || conflict.status === 'ignored') {
        this.conflicts.delete(id);
        count++;
      }
    }

    console.log(`[ConflictManager] 清除了 ${count} 个已解决的冲突`);
    return count;
  }

  /**
   * 注册冲突监听器
   */
  onConflict(listener: ConflictListener): () => void {
    this.conflictListeners.add(listener);
    return () => this.conflictListeners.delete(listener);
  }

  /**
   * 注册解决监听器
   */
  onResolution(listener: ResolutionListener): () => void {
    this.resolutionListeners.add(listener);
    return () => this.resolutionListeners.delete(listener);
  }

  /**
   * 通知冲突监听器
   */
  private notifyConflictListeners(conflict: DataConflict): void {
    for (const listener of this.conflictListeners) {
      try {
        listener(conflict);
      } catch (error) {
        console.error('[ConflictManager] 冲突监听器执行失败:', error);
      }
    }
  }

  /**
   * 通知解决监听器
   */
  private notifyResolutionListeners(result: ConflictResolutionResult): void {
    for (const listener of this.resolutionListeners) {
      try {
        listener(result);
      } catch (error) {
        console.error('[ConflictManager] 解决监听器执行失败:', error);
      }
    }
  }

  /**
   * 默认合并策略
   * 对于数组数据，使用服务器版本
   * 对于对象数据，深度合并
   */
  private defaultMerge(local: any, server: any): any {
    if (Array.isArray(server)) {
      // 数组使用服务器版本
      return server;
    }

    if (typeof server === 'object' && server !== null) {
      // 对象深度合并
      const merged = { ...server };

      if (typeof local === 'object' && local !== null) {
        for (const key in local) {
          if (!(key in server)) {
            merged[key] = local[key];
          }
        }
      }

      return merged;
    }

    // 基本类型使用服务器版本
    return server;
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    total: number;
    pending: number;
    resolved: number;
    ignored: number;
  } {
    const stats = {
      total: this.conflicts.size,
      pending: 0,
      resolved: 0,
      ignored: 0
    };

    for (const conflict of this.conflicts.values()) {
      stats[conflict.status]++;
    }

    return stats;
  }
}

// ================================================================
// 导出单例
// ================================================================

export const conflictManager = new ConflictManager();

// 为了向后兼容，同时导出类
export { ConflictManager };
