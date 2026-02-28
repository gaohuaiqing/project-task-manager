/**
 * 统一存储服务
 *
 * 职责：
 * 1. 统一管理所有数据存储（使用 cache: 前缀）
 * 2. 提供类型安全的存储 API
 * 3. 集成 CacheManager 进行 TTL 和版本管理
 * 4. 简化数据一致性保证
 */

import { CacheManager } from './CacheManager';

// ================================================================
// 数据类型定义
// ================================================================

export type StorageDataType =
  | 'projects'
  | 'wbs_tasks'
  | 'organization_units'
  | 'members'
  | 'holidays'
  | 'settings'
  | 'ui_state';

export interface StorageData<T = any> {
  data: T;
  version: number;
  timestamp: number;
}

// ================================================================
// UnifiedStorage 类
// ================================================================

class UnifiedStorage {
  /**
   * 保存数据（使用 cache: 前缀）
   */
  set<T>(dataType: StorageDataType, data: T, options?: { version?: number; ttl?: number }): boolean {
    const storageData: StorageData<T> = {
      data,
      version: options?.version || 1,
      timestamp: Date.now()
    };

    return CacheManager.set(dataType, storageData, {
      ttl: options?.ttl,
      version: options?.version
    });
  }

  /**
   * 获取数据
   */
  get<T>(dataType: StorageDataType): StorageData<T> | null {
    return CacheManager.get<StorageData<T>>(dataType);
  }

  /**
   * 删除数据
   */
  delete(dataType: StorageDataType): boolean {
    return CacheManager.delete(dataType);
  }

  /**
   * 检查数据是否存在
   */
  has(dataType: StorageDataType): boolean {
    return CacheManager.has(dataType);
  }

  /**
   * 清空所有缓存数据
   */
  clear(): boolean {
    return CacheManager.clear();
  }

  /**
   * 获取所有数据类型及其大小
   */
  getDataTypes(): Array<{ type: StorageDataType; size: number; version?: number }> {
    const stats = CacheManager.getStats();
    const result: Array<{ type: StorageDataType; size: number; version?: number }> = [];

    for (const [key, count] of Object.entries(stats.byType)) {
      // 过滤出我们的数据类型
      if (this.isValidDataType(key)) {
        const storageData = this.get(key as StorageDataType);
        result.push({
          type: key as StorageDataType,
          size: count,
          version: storageData?.version
        });
      }
    }

    return result;
  }

  /**
   * 获取存储统计
   */
  getStats() {
    return CacheManager.getStats();
  }

  /**
   * 清理过期缓存
   */
  cleanExpired(): number {
    return CacheManager.cleanExpired();
  }

  /**
   * 验证数据类型是否有效
   */
  private isValidDataType(key: string): key is StorageDataType {
    return [
      'projects',
      'wbs_tasks',
      'organization_units',
      'members',
      'holidays',
      'settings',
      'ui_state'
    ].includes(key);
  }
}

// ================================================================
// 导出单例
// ================================================================

export const unifiedStorage = new UnifiedStorage();

// 为了向后兼容，同时导出类
export { UnifiedStorage };
