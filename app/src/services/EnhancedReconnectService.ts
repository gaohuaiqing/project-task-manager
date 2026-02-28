/**
 * 增强重连服务
 *
 * 职责：
 * 1. 记录断开连接时的时间戳
 * 2. 重连后获取断开期间的所有变更
 * 3. 使用时间戳增量同步
 * 4. 确保数据完整性
 */

import { wsService } from './WebSocketService';

// ================================================================
// 类型定义
// ================================================================

export interface DisconnectInfo {
  /** 断开时间戳 */
  timestamp: number;
  /** 断开原因 */
  reason: 'user_initiated' | 'network_error' | 'server_close' | 'timeout';
  /** 会话ID */
  sessionId: string | null;
  /** 用户名 */
  username: string | null;
}

export interface SyncRange {
  /** 开始时间 */
  startTime: number;
  /** 结束时间 */
  endTime: number;
}

export interface DataChange {
  /** 数据类型 */
  dataType: string;
  /** 数据ID */
  dataId: string;
  /** 操作类型 */
  operation: 'create' | 'update' | 'delete';
  /** 版本号 */
  version: number;
  /** 时间戳 */
  timestamp: number;
  /** 数据 */
  data?: any;
  /** 操作者 */
  operator?: string;
}

export interface SyncResult {
  /** 是否成功 */
  success: boolean;
  /** 获取的变更数量 */
  changeCount: number;
  /** 变更列表 */
  changes: DataChange[];
  /** 错误信息 */
  error?: string;
}

// ================================================================
// EnhancedReconnectService 类
// ================================================================

class EnhancedReconnectService {
  private disconnectInfo: DisconnectInfo | null = null;
  private syncInProgress = false;
  private lastSyncTime: number = Date.now();

  /**
   * 记录断开连接
   */
  recordDisconnect(reason: DisconnectInfo['reason']): void {
    this.disconnectInfo = {
      timestamp: Date.now(),
      reason,
      sessionId: wsService instanceof any ? (wsService as any).sessionId : null,
      username: wsService instanceof any ? (wsService as any).username : null
    };

    console.log(`[EnhancedReconnect] 记录断开连接: ${reason}, 时间: ${new Date(this.disconnectInfo.timestamp).toISOString()}`);
  }

  /**
   * 记录连接成功
   */
  recordConnect(): void {
    if (this.disconnectInfo) {
      console.log(`[EnhancedReconnect] 连接恢复，断开时长: ${Date.now() - this.disconnectInfo.timestamp}ms`);
    }
    this.disconnectInfo = null;
  }

  /**
   * 重连后同步所有变更
   */
  async syncAfterReconnect(): Promise<SyncResult> {
    if (this.syncInProgress) {
      console.warn('[EnhancedReconnect] 同步正在进行中，跳过');
      return {
        success: false,
        changeCount: 0,
        changes: [],
        error: '同步正在进行中'
      };
    }

    if (!this.disconnectInfo) {
      console.log('[EnhancedReconnect] 无断开记录，执行常规同步');
      return this.performFullSync();
    }

    this.syncInProgress = true;

    try {
      // 计算需要同步的时间范围
      const syncRange: SyncRange = {
        startTime: this.lastSyncTime,
        endTime: Date.now()
      };

      console.log(`[EnhancedReconnect] 同步变更范围:`, {
        start: new Date(syncRange.startTime).toISOString(),
        end: new Date(syncRange.endTime).toISOString()
      });

      // 请求增量变更
      const result = await this.fetchIncrementalChanges(syncRange);

      if (result.success) {
        // 应用变更
        await this.applyChanges(result.changes);

        // 更新最后同步时间
        this.lastSyncTime = syncRange.endTime;

        // 清除断开记录
        this.disconnectInfo = null;

        console.log(`[EnhancedReconnect] 增量同步完成，获取 ${result.changeCount} 条变更`);
      }

      return result;
    } catch (error) {
      console.error('[EnhancedReconnect] 增量同步失败，尝试全量同步:', error);

      // 降级到全量同步
      const fullSyncResult = await this.performFullSync();
      return fullSyncResult;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * 获取增量变更
   */
  private async fetchIncrementalChanges(range: SyncRange): Promise<SyncResult> {
    try {
      const response = await wsService.request({
        type: 'fetch_changes',  // 新的消息类型
        data: {
          startTime: range.startTime,
          endTime: range.endTime
        }
      });

      if (response.success) {
        return {
          success: true,
          changeCount: response.changes?.length || 0,
          changes: response.changes || []
        };
      } else {
        return {
          success: false,
          changeCount: 0,
          changes: [],
          error: response.message || '获取变更失败'
        };
      }
    } catch (error) {
      return {
        success: false,
        changeCount: 0,
        changes: [],
        error: error instanceof Error ? error.message : '获取变更失败'
      };
    }
  }

  /**
   * 执行全量同步（降级方案）
   */
  private async performFullSync(): Promise<SyncResult> {
    console.log('[EnhancedReconnect] 执行全量同步');

    try {
      // 同步所有关键数据类型
      const dataTypes = ['projects', 'wbs_tasks', 'organization_units', 'members', 'tasks'];
      const allChanges: DataChange[] = [];

      for (const dataType of dataTypes) {
        const response = await wsService.request({
          type: 'request_sync',
          data: { dataType }
        });

        if (response.success && response.data) {
          // 记录为变更
          allChanges.push({
            dataType,
            dataId: 'all',
            operation: 'update',
            version: response.version || 0,
            timestamp: Date.now(),
            data: response.data
          });

          // 存储到 localStorage
          try {
            localStorage.setItem(`sync_${dataType}`, JSON.stringify(response.data));
          } catch (error) {
            console.error(`[EnhancedReconnect] 存储 ${dataType} 失败:`, error);
          }
        }
      }

      // 触发自定义事件，通知所有组件刷新
      window.dispatchEvent(new CustomEvent('data-changed', {
        detail: {
          type: 'full_sync',
          timestamp: Date.now()
        }
      }));

      this.lastSyncTime = Date.now();

      return {
        success: true,
        changeCount: allChanges.length,
        changes: allChanges
      };
    } catch (error) {
      console.error('[EnhancedReconnect] 全量同步失败:', error);
      return {
        success: false,
        changeCount: 0,
        changes: [],
        error: error instanceof Error ? error.message : '全量同步失败'
      };
    }
  }

  /**
   * 应用变更到本地
   */
  private async applyChanges(changes: DataChange[]): Promise<void> {
    for (const change of changes) {
      try {
        // 触发变更事件
        window.dispatchEvent(new CustomEvent('data-changed', {
          detail: {
            type: change.dataType,
            operation: change.operation,
            version: change.version,
            timestamp: change.timestamp,
            data: change.data
          }
        }));

        // 如果有数据，更新 localStorage
        if (change.data) {
          localStorage.setItem(`sync_${change.dataType}`, JSON.stringify(change.data));
        }
      } catch (error) {
        console.error(`[EnhancedReconnect] 应用变更失败: ${change.dataType}`, error);
      }
    }
  }

  /**
   * 获取断开信息
   */
  getDisconnectInfo(): DisconnectInfo | null {
    return this.disconnectInfo;
  }

  /**
   * 获取最后同步时间
   */
  getLastSyncTime(): number {
    return this.lastSyncTime;
  }

  /**
   * 检查是否需要同步
   */
  needsSync(): boolean {
    if (!this.disconnectInfo) return false;

    // 断开超过5秒才需要同步
    return Date.now() - this.disconnectInfo.timestamp > 5000;
  }

  /**
   * 手动触发同步
   */
  async triggerSync(): Promise<SyncResult> {
    return this.syncAfterReconnect();
  }
}

// ================================================================
// 导出单例
// ================================================================

export const enhancedReconnectService = new EnhancedReconnectService();

// 为了向后兼容，同时导出类
export { EnhancedReconnectService };
