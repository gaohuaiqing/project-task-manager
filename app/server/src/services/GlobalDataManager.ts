import { databaseService } from './DatabaseService.js';
import { redisCacheService } from './RedisCacheService.js';
import { LRUCacheWithTTL, cacheCleanupManager } from '../utils/LRUCache.js';
import { isValidQueryResult, hasQueryData, parseJsonField, stringifyJsonField } from '../utils/DatabaseTypeGuards.js';
import { QUERY_TIMEOUT, transactionWithTimeout, withQueryTimeout } from '../utils/DatabaseQueryTimeout.js';
import { systemLogger } from './AsyncSystemLogger.js';
import { withDeadlockRetry, deadlockMonitor } from '../utils/DeadlockRetry.js';

// ================================================================
// 事务配置常量
// ================================================================
const LOCK_WAIT_TIMEOUT = 30; // 锁等待超时（秒）
const MAX_TRANSACTION_DURATION = 60000; // 最大事务执行时间（毫秒）

// ================================================================
// 全局数据管理服务 - 支持多用户实时协作（P1-1: 已启用死锁重试）
// ================================================================
// ================================================================

interface GlobalDataItem {
  id: number;
  dataType: string;
  dataId: string;
  data: any;
  version: number;
  createdBy: number;
  updatedBy: number;
  createdAt: Date;
  updatedAt: Date;
}

interface DataUpdateResult {
  success: boolean;
  message: string;
  data?: any;
  version?: number;
  conflict?: boolean;
}

interface DataLock {
  id: number;
  dataType: string;
  dataId: string;
  lockedBy: number;
  lockedAt: Date;
  expiresAt: Date;
  lockReason?: string;
}

interface ChangeLog {
  id: number;
  dataType: string;
  dataId: string;
  action: 'create' | 'update' | 'delete';
  oldValue?: any;
  newValue?: any;
  changedBy: number;
  changeReason?: string;
  createdAt: Date;
}

export class GlobalDataManager {
  private broadcastCallback: ((message: any) => void | Promise<void>) | null = null;
  private fallbackCache: LRUCacheWithTTL<string, any>;
  private readonly CACHE_TTL = 3600000; // 1小时缓存
  private readonly LOCK_DEFAULT_DURATION = 30000; // 默认锁30秒

  constructor() {
    // 创建LRU缓存作为Redis降级方案（最多10000条目）
    this.fallbackCache = new LRUCacheWithTTL(10000, this.CACHE_TTL);

    // 注册定期清理任务
    cacheCleanupManager.registerCleanup('globaldata-fallback-cache', this.fallbackCache, 120000);

    console.log('[GlobalDataManager] 服务已初始化');
  }

  // ================================================================
  // 数据查询操作
  // ================================================================

  /**
   * 获取全局数据（支持缓存）
   * @param dataType 数据类型
   * @param dataId 数据ID（可选，不传则返回该类型的所有数据）
   */
  async getGlobalData(dataType: string, dataId?: string): Promise<GlobalDataItem[]> {
    const startTime = Date.now();

    try {
      // 1. 检查 Redis 缓存（如果可用）
      if (redisCacheService.isConnected()) {
        const cached = await redisCacheService.getGlobalData(dataType, dataId || 'default');

        if (cached) {
          console.log(`[GlobalDataManager] Redis 缓存命中: ${dataType}${dataId ? '/' + dataId : ''}, 耗时: ${Date.now() - startTime}ms`);
          return Array.isArray(cached.data) ? cached.data : [cached.data];
        }
      }

      // 2. 从数据库查询（带超时保护）
      let query = 'SELECT * FROM global_data WHERE data_type = ?';
      const params: any[] = [dataType];

      if (dataId) {
        query += ' AND data_id = ?';
        params.push(dataId);
      }

      query += ' ORDER BY updated_at DESC';

      const results = await withQueryTimeout(
        databaseService.query(query, params),
        QUERY_TIMEOUT.DEFAULT,
        `getGlobalData(${dataType}${dataId ? '/' + dataId : ''})`
      ) as any[];

      // 3. 转换数据格式（使用类型守卫）
      const items: GlobalDataItem[] = results.map((row: any) => ({
        id: row.id,
        dataType: row.data_type,
        dataId: row.data_id,
        data: parseJsonField(row.data_json, null),
        version: row.version,
        createdBy: row.created_by,
        updatedBy: row.updated_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      // 4. 写入 Redis 缓存（异步，不阻塞响应）
      setImmediate(() => {
        if (dataId) {
          redisCacheService.setGlobalData(dataType, dataId, items[0], items[0]?.version).catch(err =>
            console.error('[GlobalDataManager] 缓存写入失败:', err)
          );
        } else {
          redisCacheService.setGlobalDataList(dataType, items).catch(err =>
            console.error('[GlobalDataManager] 缓存写入失败:', err)
          );
        }
      });

      console.log(`[GlobalDataManager] 数据库查询: ${dataType}${dataId ? '/' + dataId : ''}, 数量: ${items.length}, 耗时: ${Date.now() - startTime}ms`);

      return items;
    } catch (error) {
      console.error(`[GlobalDataManager] 获取数据失败: ${dataType}`, error);
      throw error;
    }
  }

  /**
   * 根据ID获取单条数据（带超时保护）
   */
  async getGlobalDataById(id: number): Promise<GlobalDataItem | null> {
    try {
      const results = await withQueryTimeout(
        databaseService.query('SELECT * FROM global_data WHERE id = ?', [id]),
        QUERY_TIMEOUT.SHORT,
        `getGlobalDataById(${id})`
      ) as any[];

      if (!hasQueryData(results)) {
        return null;
      }

      const row = results[0];
      return {
        id: row.id,
        dataType: row.data_type,
        dataId: row.data_id,
        data: parseJsonField(row.data_json, null),
        version: row.version,
        createdBy: row.created_by,
        updatedBy: row.updated_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } catch (error) {
      console.error(`[GlobalDataManager] 根据ID获取数据失败: ${id}`, error);
      throw error;
    }
  }

  // ================================================================
  // 数据更新操作（带乐观锁）
  // ================================================================

  /**
   * 更新全局数据
   * @param dataType 数据类型
   * @param dataId 数据ID
   * @param newData 新数据
   * @param userId 操作用户ID
   * @param expectedVersion 期望版本号（乐观锁）
   * @param changeReason 变更原因
   */
  async updateGlobalData(
    dataType: string,
    dataId: string,
    newData: any,
    userId: number,
    expectedVersion?: number,
    changeReason?: string
  ): Promise<DataUpdateResult> {
    const startTime = Date.now();

    try {
      // P1-1: 使用死锁重试包装事务，提高并发成功率
      const result = await withDeadlockRetry(async () => {
        return await transactionWithTimeout(async (connection: any) => {
        // 设置锁超时时间（30秒），给复杂事务足够的时间
        await connection.query('SET innodb_lock_wait_timeout = ?', [LOCK_WAIT_TIMEOUT]);

        // 1. 查询当前数据（加锁）
        const [current] = await connection.execute(
          'SELECT * FROM global_data WHERE data_type = ? AND data_id = ? FOR UPDATE',
          [dataType, dataId]
        ) as any[];

        if (!current || current.length === 0) {
          // === 创建新数据 ===
          const [insertResult] = await connection.execute(
            `INSERT INTO global_data (data_type, data_id, data_json, version, created_by, updated_by)
             VALUES (?, ?, ?, 1, ?, ?)`,
            [dataType, dataId, stringifyJsonField(newData), userId, userId]
          ) as any[];

          // 记录变更日志
          await connection.execute(
            `INSERT INTO data_change_log (data_type, data_id, action, new_value, changed_by, change_reason)
             VALUES (?, ?, 'create', ?, ?, ?)`,
            [dataType, dataId, stringifyJsonField(newData), userId, changeReason || null]
          );

          console.log(`[GlobalDataManager] 数据创建成功: ${dataType}/${dataId}, 耗时: ${Date.now() - startTime}ms`);

          return { success: true, message: '数据创建成功', data: newData, version: 1, isNew: true };
        }

        // === 更新现有数据 ===
        const currentData = current[0];
        const currentVersion = currentData.version;
        const currentDataJson = parseJsonField(currentData.data_json, null);

        // 2. 乐观锁版本冲突检测（仅当 expectedVersion 不为 null/undefined 时才检查）
        if (expectedVersion != null && currentVersion !== expectedVersion) {
          console.warn(`[GlobalDataManager] 版本冲突: ${dataType}/${dataId}, 期望: ${expectedVersion}, 实际: ${currentVersion}`);

          // 尝试字段级智能合并
          // baseData: 期望版本时的数据（需要从变更日志获取）
          // localChange: 客户端尝试的新数据
          // remoteChange: 服务器当前数据
          const { merged, conflicts } = this.mergeDataFields(
            currentDataJson,  // 使用服务器当前数据作为base
            newData,          // 客户端新数据
            currentDataJson   // 服务器当前数据（remote）
          );

          if (conflicts.length === 0) {
            // 无字段冲突，自动合并成功
            console.log(`[GlobalDataManager] 自动字段级合并成功: ${dataType}/${dataId}`);

            // 异步记录自动合并
            setImmediate(() => {
              systemLogger.info(`全局数据自动合并: ${dataType}/${dataId}`, {
                expectedVersion,
                actualVersion: currentVersion,
                mergedFields: Object.keys(merged).length,
                dataType,
                dataId
              }, userId);
            });

            // 继续使用合并后的数据更新
            // 不需要手动设置 newData，直接继续流程
            // 但需要跳过后续的版本检查，直接更新
          } else {
            // 有字段冲突，返回详细冲突信息
            console.warn(`[GlobalDataManager] 字段冲突无法自动合并: ${dataType}/${dataId}, 冲突字段: ${conflicts.map(c => c.field).join(', ')}`);

            // 异步记录版本冲突
            setImmediate(() => {
              systemLogger.warn(`全局数据版本冲突: ${dataType}/${dataId}`, {
                expectedVersion,
                actualVersion: currentVersion,
                conflicts: conflicts.map(c => ({ field: c.field, local: c.local, remote: c.remote })),
                dataType,
                dataId
              }, userId);
            });

            return {
              success: false,
              message: `版本冲突，${conflicts.length}个字段冲突`,
              conflict: true,
              data: currentDataJson,
              merged,  // 返回自动合并的结果
              conflicts  // 返回冲突字段详情
            };
          }
        }

        const newVersion = currentVersion + 1;

        // 3. 更新数据
        const [updateResult] = await connection.execute(
          `UPDATE global_data
           SET data_json = ?, version = ?, updated_by = ?, updated_at = NOW()
           WHERE data_type = ? AND data_id = ? AND version = ?`,
          [stringifyJsonField(newData), newVersion, userId, dataType, dataId, currentVersion]
        ) as any[];

        if (updateResult.affectedRows === 0) {
          console.warn(`[GlobalDataManager] 更新失败: ${dataType}/${dataId}, 可能是版本冲突`);

          return {
            success: false,
            message: '更新失败：数据已被其他用户修改',
            conflict: true,
            data: currentDataJson
          };
        }

        // 4. 记录变更日志
        await connection.execute(
          `INSERT INTO data_change_log (data_type, data_id, action, old_value, new_value, changed_by, change_reason)
             VALUES (?, ?, 'update', ?, ?, ?, ?)`,
          [dataType, dataId, stringifyJsonField(currentDataJson), stringifyJsonField(newData), userId, changeReason || null]
        );

        console.log(`[GlobalDataManager] 数据更新成功: ${dataType}/${dataId}, 版本: ${currentVersion} → ${newVersion}, 耗时: ${Date.now() - startTime}ms`);

        return { success: true, message: '更新成功', data: newData, version: newVersion, isNew: false };
      }, QUERY_TIMEOUT.LONG);
      }, {
        maxRetries: 3,
        baseDelay: 100,
        maxDelay: 5000,
        onRetry: (attempt, error) => {
          console.warn(`[GlobalDataManager] 死锁重试 (${attempt}/3): ${dataType}/${dataId}`);
          // 记录死锁事件到系统日志
          systemLogger.warn(`数据更新死锁重试`, {
            dataType,
            dataId,
            attempt,
            error: error?.message || String(error)
          }, userId).catch(err => console.error('[GlobalDataManager] 记录死锁日志失败:', err));
        }
      });

      // P1-2: 同步执行缓存失效（消除一致性窗口）
      try {
        await this.invalidateCache(dataType, dataId);
      } catch (err) {
        console.error('[GlobalDataManager] 缓存失效失败:', err);
      }

      // 异步执行广播和日志记录（不阻塞响应）
      setImmediate(() => {
        this.broadcastGlobalUpdate({
          type: result.isNew ? 'global_data_created' : 'global_data_updated',
          dataType,
          dataId,
          data: newData,
          version: result.version ?? 1,
          updatedBy: userId,
          timestamp: Date.now()
        }).catch(err =>
          console.error('[GlobalDataManager] 广播失败:', err)
        );
        // 记录用户操作到 system_logs
        systemLogger.logUserAction(
          result.isNew ? `create_global_data_${dataType}` : `update_global_data_${dataType}`,
          { dataType, dataId, version: result.version },
          userId,
          undefined,
          undefined,
          undefined
        ).catch(err => console.error('[GlobalDataManager] 记录日志失败:', err));
      });

      return result;
    } catch (error: any) {
      console.error(`[GlobalDataManager] 更新数据失败: ${dataType}/${dataId}`, error);
      // 记录错误到 system_logs
      systemLogger.error(`全局数据操作失败: ${dataType}/${dataId}`, {
        error: error?.message || String(error),
        dataType,
        dataId,
        operation: 'update'
      }, userId).catch(err => console.error('[GlobalDataManager] 记录错误日志失败:', err));
      throw error;
    }
  }

  /**
   * 字段级别的智能数据合并
   * @param baseData 基础数据
   * @param localChange 本地变更
   * @param remoteChange 远程变更
   */
  private mergeDataFields(
    baseData: any,
    localChange: any,
    remoteChange: any
  ): { merged: any; conflicts: Array<{ field: string; local: any; remote: any }> } {
    const merged = { ...baseData };
    const conflicts: Array<{ field: string; local: any; remote: any }> = [];

    const localFields = new Set(Object.keys(localChange));
    const remoteFields = new Set(Object.keys(remoteChange));

    // 无冲突的字段直接合并
    for (const field of localFields) {
      if (!remoteFields.has(field)) {
        merged[field] = localChange[field];
      }
    }

    for (const field of remoteFields) {
      if (!localFields.has(field)) {
        merged[field] = remoteChange[field];
      }
    }

    // 检测冲突的字段
    const conflictFields = [...localFields].filter(f => remoteFields.has(f));
    for (const field of conflictFields) {
      conflicts.push({
        field,
        local: localChange[field],
        remote: remoteChange[field]
      });
    }

    return { merged, conflicts };
  }

  /**
   * 删除全局数据（原子事务）
   */
  async deleteGlobalData(
    dataType: string,
    dataId: string,
    userId: number,
    changeReason?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // P1-1: 使用死锁重试包装事务
      const result = await withDeadlockRetry(async () => {
        return await transactionWithTimeout(async (connection: any) => {
        // 1. 查询当前数据（加锁）
        const [current] = await connection.execute(
          'SELECT * FROM global_data WHERE data_type = ? AND data_id = ? FOR UPDATE',
          [dataType, dataId]
        ) as any[];

        if (!current || current.length === 0) {
          return { success: false, message: '数据不存在' };
        }

        const currentData = current[0];

        // 2. 删除数据
        await connection.execute(
          'DELETE FROM global_data WHERE data_type = ? AND data_id = ?',
          [dataType, dataId]
        );

        // 3. 记录变更日志
        await connection.execute(
          `INSERT INTO data_change_log (data_type, data_id, action, old_value, changed_by, change_reason)
           VALUES (?, ?, 'delete', ?, ?, ?)`,
          [dataType, dataId, stringifyJsonField(currentData.data_json), userId, changeReason || null]
        );

        console.log(`[GlobalDataManager] 数据删除成功: ${dataType}/${dataId}`);

        return { success: true, message: '删除成功' };
      }, QUERY_TIMEOUT.MEDIUM);
      }, {
        maxRetries: 3,
        baseDelay: 100,
        maxDelay: 5000,
        onRetry: (attempt, error) => {
          console.warn(`[GlobalDataManager] 删除死锁重试 (${attempt}/3): ${dataType}/${dataId}`);
        }
      });

      if (result.success) {
        // P1-2: 同步执行缓存失效（消除一致性窗口）
        try {
          await this.invalidateCache(dataType, dataId);
        } catch (err) {
          console.error('[GlobalDataManager] 缓存失效失败:', err);
        }

        // 异步执行广播和日志记录
        setImmediate(() => {
          this.broadcastGlobalUpdate({
            type: 'global_data_deleted',
            dataType,
            dataId,
            updatedBy: userId,
            timestamp: Date.now()
          }).catch(err =>
            console.error('[GlobalDataManager] 广播失败:', err)
          );
          // 记录用户操作到 system_logs
          systemLogger.logUserAction(
            `delete_global_data_${dataType}`,
            { dataType, dataId },
            userId,
            undefined,
            undefined,
            undefined
          ).catch(err => console.error('[GlobalDataManager] 记录日志失败:', err));
        });
      }

      return result;
    } catch (error) {
      console.error(`[GlobalDataManager] 删除数据失败: ${dataType}/${dataId}`, error);
      throw error;
    }
  }

  // ================================================================
  // 数据锁操作（悲观锁）
  // ================================================================

  /**
   * 获取数据锁
   * @param dataType 数据类型
   * @param dataId 数据ID
   * @param userId 用户ID
   * @param duration 锁定时长（毫秒）
   * @param reason 锁定原因
   */
  async acquireLock(
    dataType: string,
    dataId: string,
    userId: number,
    duration: number = this.LOCK_DEFAULT_DURATION,
    reason?: string
  ): Promise<{ success: boolean; message: string; lock?: DataLock }> {
    try {
      const expiresAt = new Date(Date.now() + duration);

      // 尝试创建锁
      await databaseService.query(
        `INSERT INTO data_locks (data_type, data_id, locked_by, locked_at, expires_at, lock_reason)
         VALUES (?, ?, ?, NOW(), ?, ?)`,
        [dataType, dataId, userId, expiresAt, reason || null]
      );

      // 清理过期锁
      await this.cleanupExpiredLocks();

      const lock: DataLock = {
        id: 0, // 新创建的锁，ID不重要
        dataType,
        dataId,
        lockedBy: userId,
        lockedAt: new Date(),
        expiresAt,
        lockReason: reason
      };

      console.log(`[GlobalDataManager] 加锁成功: ${dataType}/${dataId}, 用户: ${userId}`);

      return { success: true, message: '加锁成功', lock };
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        // 锁已存在，检查是否过期
        const [locks] = await databaseService.query(
          'SELECT * FROM data_locks WHERE data_type = ? AND data_id = ?',
          [dataType, dataId]
        ) as any[];

        if (locks.length > 0) {
          const lock = locks[0];

          if (new Date(lock.expires_at) < new Date()) {
            // 锁已过期，删除并重新加锁
            await this.releaseLock(dataType, dataId, lock.locked_by);
            return await this.acquireLock(dataType, dataId, userId, duration, reason);
          }

          // 获取锁持有者信息
          const [users] = await databaseService.query(
            'SELECT username FROM users WHERE id = ?',
            [lock.locked_by]
          ) as any[];

          const lockedByUser = users[0]?.username || '未知用户';

          console.warn(`[GlobalDataManager] 加锁失败: ${dataType}/${dataId}, 已被用户 ${lockedByUser} 锁定`);

          return {
            success: false,
            message: `数据已被用户 ${lockedByUser} 锁定`,
            lock
          };
        }
      }

      console.error(`[GlobalDataManager] 加锁失败: ${dataType}/${dataId}`, error);

      return { success: false, message: '加锁失败' };
    }
  }

  /**
   * 释放数据锁
   */
  async releaseLock(dataType: string, dataId: string, userId: number): Promise<void> {
    try {
      await databaseService.query(
        'DELETE FROM data_locks WHERE data_type = ? AND data_id = ? AND locked_by = ?',
        [dataType, dataId, userId]
      );

      console.log(`[GlobalDataManager] 释放锁: ${dataType}/${dataId}, 用户: ${userId}`);
    } catch (error) {
      console.error(`[GlobalDataManager] 释放锁失败: ${dataType}/${dataId}`, error);
    }
  }

  /**
   * 清理过期锁
   */
  private async cleanupExpiredLocks(): Promise<void> {
    try {
      await databaseService.query(
        'DELETE FROM data_locks WHERE expires_at < NOW()'
      );
    } catch (error) {
      console.error('[GlobalDataManager] 清理过期锁失败:', error);
    }
  }

  // ================================================================
  // 变更历史查询
  // ================================================================

  /**
   * 获取数据变更历史（带超时保护）
   */
  async getChangeHistory(
    dataType: string,
    dataId: string,
    limit: number = 50
  ): Promise<ChangeLog[]> {
    try {
      const results = await withQueryTimeout(
        databaseService.query(
          `SELECT * FROM data_change_log
           WHERE data_type = ? AND data_id = ?
           ORDER BY created_at DESC
           LIMIT ?`,
          [dataType, dataId, limit]
        ),
        QUERY_TIMEOUT.MEDIUM,
        `getChangeHistory(${dataType}/${dataId})`
      ) as any[];

      return results.map((row: any) => ({
        id: row.id,
        dataType: row.data_type,
        dataId: row.data_id,
        action: row.action,
        oldValue: parseJsonField(row.old_value, undefined),
        newValue: parseJsonField(row.new_value, undefined),
        changedBy: row.changed_by,
        changeReason: row.change_reason,
        createdAt: row.created_at
      }));
    } catch (error) {
      console.error(`[GlobalDataManager] 获取变更历史失败: ${dataType}/${dataId}`, error);
      throw error;
    }
  }

  /**
   * 获取特定版本的数据快照（带超时保护）
   */
  async getDataSnapshot(
    dataType: string,
    dataId: string,
    version: number
  ): Promise<{ data: any; version: number; createdAt: Date } | null> {
    try {
      const results = await withQueryTimeout(
        databaseService.query(
          `SELECT data_json, version, created_at
           FROM data_change_log
           WHERE data_type = ? AND data_id = ? AND version = ?
           ORDER BY created_at DESC
           LIMIT 1`,
          [dataType, dataId, version]
        ),
        QUERY_TIMEOUT.MEDIUM,
        `getDataSnapshot(${dataType}/${dataId}/${version})`
      ) as any[];

      if (!hasQueryData(results)) {
        return null;
      }

      const row = results[0];
      return {
        data: parseJsonField(row.data_json, null),
        version: row.version,
        createdAt: row.created_at
      };
    } catch (error) {
      console.error(`[GlobalDataManager] 获取数据快照失败: ${dataType}/${dataId}/${version}`, error);
      throw error;
    }
  }

  /**
   * 比较两个版本的数据差异
   */
  async compareVersions(
    dataType: string,
    dataId: string,
    version1: number,
    version2: number
  ): Promise<{
    version1: { data: any; version: number; createdAt: Date };
    version2: { data: any; version: number; createdAt: Date };
    differences: Array<{
      field: string;
      value1: any;
      value2: any;
    }>;
  } | null> {
    try {
      const [snap1, snap2] = await Promise.all([
        this.getDataSnapshot(dataType, dataId, version1),
        this.getDataSnapshot(dataType, dataId, version2)
      ]);

      if (!snap1 || !snap2) {
        return null;
      }

      const differences: Array<{ field: string; value1: any; value2: any }> = [];
      const keys1 = new Set(Object.keys(snap1.data));
      const keys2 = new Set(Object.keys(snap2.data));

      // 检查新增和删除的字段
      for (const key of keys1) {
        if (!keys2.has(key)) {
          differences.push({ field: key, value1: snap1.data[key], value2: undefined });
        }
      }

      for (const key of keys2) {
        if (!keys1.has(key)) {
          differences.push({ field: key, value1: undefined, value2: snap2.data[key] });
        }
      }

      // 检查修改的字段
      for (const key of keys1) {
        if (keys2.has(key) && JSON.stringify(snap1.data[key]) !== JSON.stringify(snap2.data[key])) {
          differences.push({
            field: key,
            value1: snap1.data[key],
            value2: snap2.data[key]
          });
        }
      }

      return {
        version1: snap1,
        version2: snap2,
        differences
      };
    } catch (error) {
      console.error(`[GlobalDataManager] 比较版本失败: ${dataType}/${dataId}`, error);
      throw error;
    }
  }

  /**
   * 回滚到指定版本（创建新版本）
   */
  async rollbackToVersion(
    dataType: string,
    dataId: string,
    targetVersion: number,
    userId: number,
    reason?: string
  ): Promise<DataUpdateResult> {
    try {
      // 获取目标版本的数据
      const snapshot = await this.getDataSnapshot(dataType, dataId, targetVersion);

      if (!snapshot) {
        return {
          success: false,
          message: `版本 ${targetVersion} 不存在`
        };
      }

      // 获取当前数据
      const currentData = await this.getGlobalData(dataType, dataId);
      if (currentData.length === 0) {
        return {
          success: false,
          message: '当前数据不存在'
        };
      }

      // 使用目标版本的数据更新当前数据
      const result = await this.updateGlobalData(
        dataType,
        dataId,
        snapshot.data,
        userId,
        currentData[0].version,
        `回滚到版本 ${targetVersion}${reason ? ': ' + reason : ''}`
      );

      return result;
    } catch (error) {
      console.error(`[GlobalDataManager] 回滚失败: ${dataType}/${dataId}`, error);
      throw error;
    }
  }

  /**
   * 获取完整的版本历史时间线
   */
  async getVersionTimeline(
    dataType: string,
    dataId: string
  ): Promise<Array<{
    version: number;
    action: 'create' | 'update' | 'delete';
    changedBy: number;
    changedByName?: string;
    createdAt: Date;
    changeReason?: string;
    summary?: string;
  }>> {
    try {
      const results = await databaseService.query(
        `SELECT
          l.version,
          l.action,
          l.changed_by,
          l.created_at,
          l.change_reason,
          u.username as changed_by_name
         FROM data_change_log l
         LEFT JOIN users u ON l.changed_by = u.id
         WHERE l.data_type = ? AND l.data_id = ?
         ORDER BY l.created_at ASC`,
        [dataType, dataId]
      ) as any[];

      return results.map((row: any) => ({
        version: row.version,
        action: row.action,
        changedBy: row.changed_by,
        changedByName: row.changed_by_name,
        createdAt: row.created_at,
        changeReason: row.change_reason,
        summary: this.generateChangeSummary(row.action, row.old_value, row.new_value)
      }));
    } catch (error) {
      console.error(`[GlobalDataManager] 获取版本时间线失败: ${dataType}/${dataId}`, error);
      throw error;
    }
  }

  /**
   * 生成变更摘要
   */
  private generateChangeSummary(action: string, oldValue: string, newValue: string): string {
    try {
      const old = oldValue ? JSON.parse(oldValue) : {};
      const newVal = newValue ? JSON.parse(newValue) : {};

      switch (action) {
        case 'create':
          return '创建数据';
        case 'delete':
          return '删除数据';
        case 'update':
          const keys = new Set([...Object.keys(old), ...Object.keys(newVal)]);
          const changes = [];

          for (const key of keys) {
            if (JSON.stringify(old[key]) !== JSON.stringify(newVal[key])) {
              changes.push(key);
            }
          }

          return `更新字段: ${changes.slice(0, 3).join(', ')}${changes.length > 3 ? '...' : ''}`;
        default:
          return action;
      }
    } catch (error) {
      return action;
    }
  }

  // ================================================================
  // 在线用户管理
  // ================================================================

  /**
   * 添加在线用户（支持用户多设备同时在线）
   */
  async addOnlineUser(userId: number, username: string, sessionId: string, deviceInfo?: string, ipAddress?: string): Promise<void> {
    try {
      // 新表结构：session_id 是主键，同一用户可以在多个设备上同时在线
      await databaseService.query(
        `INSERT INTO online_users (session_id, user_id, username, device_info, ip_address)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         username = VALUES(username),
         device_info = VALUES(device_info),
         ip_address = VALUES(ip_address),
         last_seen = NOW()`,
        [sessionId, userId, username, deviceInfo || null, ipAddress || null]
      );

      console.log(`[GlobalDataManager] 用户上线: ${username} (${userId}), 会话: ${sessionId}`);
    } catch (error) {
      console.error(`[GlobalDataManager] 添加在线用户失败: ${username}`, error);
    }
  }

  /**
   * 移除在线用户（按会话ID）
   */
  async removeOnlineUser(sessionId: string): Promise<void> {
    try {
      await databaseService.query(
        'DELETE FROM online_users WHERE session_id = ?',
        [sessionId]
      );

      console.log(`[GlobalDataManager] 用户离线: 会话 ${sessionId}`);
    } catch (error) {
      console.error(`[GlobalDataManager] 移除在线用户失败: ${sessionId}`, error);
    }
  }

  /**
   * 移除用户的所有在线会话
   */
  async removeUserAllOnlineSessions(userId: number): Promise<void> {
    try {
      await databaseService.query(
        'DELETE FROM online_users WHERE user_id = ?',
        [userId]
      );

      console.log(`[GlobalDataManager] 用户 ${userId} 的所有在线会话已移除`);
    } catch (error) {
      console.error(`[GlobalDataManager] 移除用户所有会话失败: ${userId}`, error);
    }
  }

  /**
   * 获取在线用户列表
   */
  async getOnlineUsers(): Promise<Array<{ userId: number; username: string; sessionId: string; lastSeen: Date }>> {
    try {
      const results = await databaseService.query(
        `SELECT user_id, username, session_id, last_seen
         FROM online_users
         WHERE last_seen > DATE_SUB(NOW(), INTERVAL 5 MINUTE)
         ORDER BY last_seen DESC`
      ) as any[];

      return results.map((row: any) => ({
        userId: row.user_id,
        username: row.username,
        sessionId: row.session_id,
        lastSeen: row.last_seen
      }));
    } catch (error) {
      console.error('[GlobalDataManager] 获取在线用户列表失败:', error);
      return [];
    }
  }

  // ================================================================
  // 缓存管理
  // ================================================================

  private async invalidateCache(dataType: string, dataId?: string): Promise<void> {
    // 清除 Redis 缓存
    await redisCacheService.invalidateGlobalData(dataType, dataId);

    // 清除降级内存缓存
    const specificKey = dataId ? `${dataType}:${dataId}` : `${dataType}:*`;
    this.fallbackCache.delete(specificKey);
    this.fallbackCache.delete(`${dataType}:*`);

    console.log(`[GlobalDataManager] 缓存已清除: ${dataType}${dataId ? '/' + dataId : ''}`);
  }

  // ================================================================
  // 全局广播
  // ================================================================

  /**
   * 设置全局广播回调
   */
  setBroadcastCallback(callback: (message: any) => void | Promise<void>): void {
    this.broadcastCallback = callback;
    console.log('[GlobalDataManager] 广播回调已设置');
  }

  /**
   * 广播全局数据更新给所有在线用户
   */
  private async broadcastGlobalUpdate(message: any): Promise<void> {
    if (this.broadcastCallback) {
      // 异步广播，不阻塞主流程
      setImmediate(async () => {
        try {
          await this.broadcastCallback!(message);
        } catch (error) {
          console.error('[GlobalDataManager] 广播回调执行失败:', error);
        }
      });
    }
  }

  // ================================================================
  // 统计信息
  // ================================================================

  /**
   * 获取统计信息
   */
  async getStats(): Promise<{
    totalDataCount: number;
    dataCountsByType: Record<string, number>;
    totalChangeLogs: number;
    onlineUserCount: number;
    activeLocks: number;
  }> {
    try {
      // 数据统计
      const [dataStats] = await databaseService.query(
        'SELECT data_type, COUNT(*) as count FROM global_data GROUP BY data_type'
      ) as any[];

      const dataCountsByType: Record<string, number> = {};
      let totalDataCount = 0;

      dataStats.forEach((row: any) => {
        dataCountsByType[row.data_type] = row.count;
        totalDataCount += row.count;
      });

      // 变更日志统计
      const [logStats] = await databaseService.query(
        'SELECT COUNT(*) as total FROM data_change_log'
      ) as any[];
      const totalChangeLogs = logStats[0].total;

      // 在线用户统计
      const [userStats] = await databaseService.query(
        'SELECT COUNT(*) as total FROM online_users WHERE last_seen > DATE_SUB(NOW(), INTERVAL 5 MINUTE)'
      ) as any[];
      const onlineUserCount = userStats[0].total;

      // 活跃锁统计
      const [lockStats] = await databaseService.query(
        'SELECT COUNT(*) as total FROM data_locks WHERE expires_at > NOW()'
      ) as any[];
      const activeLocks = lockStats[0].total;

      return {
        totalDataCount,
        dataCountsByType,
        totalChangeLogs,
        onlineUserCount,
        activeLocks
      };
    } catch (error) {
      console.error('[GlobalDataManager] 获取统计信息失败:', error);
      throw error;
    }
  }
}

// 导出单例
export const globalDataManager = new GlobalDataManager();
