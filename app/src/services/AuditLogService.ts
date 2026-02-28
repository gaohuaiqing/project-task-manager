/**
 * 审计日志服务
 *
 * 职责：
 * 1. 统一管理所有审计日志的记录和查询
 * 2. 支持后端 API 和本地缓存的双层架构
 * 3. 提供日志分类和筛选功能
 * 4. 支持日志导出和清理
 *
 * 架构说明：
 * - 主数据源：后端数据库（通过 API）
 * - 本地缓存：localStorage（仅作临时缓存）
 * - 日志类型：操作日志、变更历史、同步日志
 */

import { CacheManager } from './CacheManager';

// ================================================================
// 类型定义
// ================================================================

export enum AuditLogType {
  /** 用户操作日志 */
  USER_ACTION = 'user_action',
  /** 组织变更日志 */
  ORG_CHANGE = 'org_change',
  /** 数据同步日志 */
  DATA_SYNC = 'data_sync',
  /** 系统日志 */
  SYSTEM = 'system',
  /** 错误日志 */
  ERROR = 'error'
}

export interface AuditLogEntry {
  /** 日志ID */
  id: string;
  /** 日志类型 */
  type: AuditLogType;
  /** 操作类型 */
  action: string;
  /** 用户ID */
  userId: string;
  /** 用户名 */
  userName?: string;
  /** 时间戳 */
  timestamp: number;
  /** 详情 */
  details?: string;
  /** 关联实体 */
  entityType?: string;
  /** 实体ID */
  entityId?: string;
  /** IP地址 */
  ipAddress?: string;
  /** 用户代理 */
  userAgent?: string;
  /** 额外数据 */
  metadata?: Record<string, unknown>;
}

export interface LogQueryParams {
  /** 日志类型 */
  type?: AuditLogType;
  /** 用户ID */
  userId?: string;
  /** 开始时间 */
  startTime?: number;
  /** 结束时间 */
  endTime?: number;
  /** 关键词搜索 */
  keyword?: string;
  /** 分页 */
  page?: number;
  /** 每页数量 */
  pageSize?: number;
}

// ================================================================
// 常量定义
// ================================================================

const API_BASE = 'http://localhost:3001/api';
const LOGS_CACHE_KEY = 'audit_logs';
const SYNC_LOGS_KEY = 'sync_log';
const ORG_HISTORY_KEY = 'org_change_history';

/** 缓存 TTL: 5分钟（日志数据变化频繁） */
const LOGS_CACHE_TTL = 5 * 60 * 1000;

// ================================================================
// AuditLogService 类
// ================================================================

class AuditLogServiceClass {
  /**
   * 记录审计日志
   */
  async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    const logEntry: AuditLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: Date.now(),
      ...entry
    };

    // 先尝试保存到后端
    try {
      const response = await fetch(`${API_BASE}/audit-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logEntry)
      });

      if (response.ok) {
        // 清除缓存
        CacheManager.delete(LOGS_CACHE_KEY);
        return;
      }
    } catch (error) {
      console.warn('[AuditLogService] 后端保存日志失败，仅保存到本地:', error);
    }

    // 降级：保存到本地
    const logs = this.getLocalLogs();
    logs.push(logEntry);

    // 限制本地日志数量（最多保留1000条）
    if (logs.length > 1000) {
      logs.splice(0, logs.length - 1000);
    }

    CacheManager.set(LOGS_CACHE_KEY, logs, { ttl: LOGS_CACHE_TTL });
  }

  /**
   * 查询审计日志
   */
  async query(params: LogQueryParams = {}): Promise<AuditLogEntry[]> {
    // 先尝试从后端获取
    try {
      const queryParams = new URLSearchParams();
      if (params.type) queryParams.append('type', params.type);
      if (params.userId) queryParams.append('userId', params.userId);
      if (params.startTime) queryParams.append('startTime', params.startTime.toString());
      if (params.endTime) queryParams.append('endTime', params.endTime.toString());
      if (params.keyword) queryParams.append('keyword', params.keyword);
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());

      const response = await fetch(`${API_BASE}/audit-logs?${queryParams}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          return result.data;
        }
      }
    } catch (error) {
      console.warn('[AuditLogService] 从后端获取日志失败，使用本地数据:', error);
    }

    // 降级：从本地获取
    let logs = this.getLocalLogs();

    // 应用过滤条件
    if (params.type) {
      logs = logs.filter(log => log.type === params.type);
    }
    if (params.userId) {
      logs = logs.filter(log => log.userId === params.userId);
    }
    if (params.startTime) {
      logs = logs.filter(log => log.timestamp >= params.startTime!);
    }
    if (params.endTime) {
      logs = logs.filter(log => log.timestamp <= params.endTime!);
    }
    if (params.keyword) {
      const keyword = params.keyword.toLowerCase();
      logs = logs.filter(log =>
        log.action.toLowerCase().includes(keyword) ||
        log.details?.toLowerCase().includes(keyword)
      );
    }

    // 排序（最新的在前）
    logs.sort((a, b) => b.timestamp - a.timestamp);

    // 分页
    if (params.page && params.pageSize) {
      const start = (params.page - 1) * params.pageSize;
      return logs.slice(start, start + params.pageSize);
    }

    return logs;
  }

  /**
   * 获取本地日志（用于降级）
   */
  private getLocalLogs(): AuditLogEntry[] {
    return CacheManager.get<AuditLogEntry[]>(LOGS_CACHE_KEY) || [];
  }

  /**
   * 清理旧日志
   */
  async cleanOldLogs(daysToKeep: number = 30): Promise<number> {
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);

    // 清理本地日志
    const logs = this.getLocalLogs();
    const filteredLogs = logs.filter(log => log.timestamp > cutoffTime);

    if (filteredLogs.length !== logs.length) {
      CacheManager.set(LOGS_CACHE_KEY, filteredLogs, { ttl: LOGS_CACHE_TTL });
    }

    // 清理后端日志
    try {
      const response = await fetch(`${API_BASE}/audit-logs/clean`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daysToKeep })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          return result.deletedCount || 0;
        }
      }
    } catch (error) {
      console.warn('[AuditLogService] 清理后端日志失败:', error);
    }

    return logs.length - filteredLogs.length;
  }

  /**
   * 导出日志
   */
  async exportLogs(params: LogQueryParams = {}): Promise<string> {
    const logs = await this.query({ ...params, pageSize: 10000 });
    return JSON.stringify(logs, null, 2);
  }

  /**
   * 迁移旧的同步日志
   */
  async migrateSyncLogs(): Promise<void> {
    const syncLogs = CacheManager.get<any[]>(SYNC_LOGS_KEY);
    if (!syncLogs || syncLogs.length === 0) {
      return;
    }

    console.log(`[AuditLogService] 迁移 ${syncLogs.length} 条同步日志...`);

    for (const log of syncLogs) {
      await this.log({
        type: AuditLogType.DATA_SYNC,
        action: log.action || 'sync',
        userId: log.userId || 'system',
        details: log.details || log.message,
        metadata: log
      });
    }

    // 删除旧的同步日志
    CacheManager.delete(SYNC_LOGS_KEY);
    console.log('[AuditLogService] 同步日志迁移完成');
  }

  /**
   * 迁移旧的组织变更历史
   */
  async migrateOrgHistory(): Promise<void> {
    const history = CacheManager.get<any[]>(ORG_HISTORY_KEY);
    if (!history || history.length === 0) {
      return;
    }

    console.log(`[AuditLogService] 迁移 ${history.length} 条组织变更历史...`);

    for (const entry of history) {
      await this.log({
        type: AuditLogType.ORG_CHANGE,
        action: entry.type || 'change',
        userId: entry.userId || 'system',
        details: entry.details,
        entityType: entry.nodeType,
        entityId: entry.nodeId,
        metadata: entry
      });
    }

    // 删除旧的历史记录
    CacheManager.delete(ORG_HISTORY_KEY);
    console.log('[AuditLogService] 组织变更历史迁移完成');
  }

  /**
   * 执行所有迁移
   */
  async migrateAll(): Promise<void> {
    console.log('[AuditLogService] 开始迁移所有旧日志...');
    await this.migrateSyncLogs();
    await this.migrateOrgHistory();
    console.log('[AuditLogService] 所有日志迁移完成');
  }
}

// ================================================================
// 导出单例
// ================================================================

export const AuditLogService = new AuditLogServiceClass();

// ================================================================
// 便捷函数
// ================================================================

/**
 * 记录用户操作
 */
export async function logUserAction(
  action: string,
  userId: string,
  details?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  return AuditLogService.log({
    type: AuditLogType.USER_ACTION,
    action,
    userId,
    details,
    metadata
  });
}

/**
 * 记录组织变更
 */
export async function logOrgChange(
  action: string,
  userId: string,
  nodeType: string,
  nodeId: string,
  nodeName: string,
  details?: string
): Promise<void> {
  return AuditLogService.log({
    type: AuditLogType.ORG_CHANGE,
    action,
    userId,
    entityType: nodeType,
    entityId: nodeId,
    details: details || `${action}: ${nodeName}`
  });
}

/**
 * 记录数据同步
 */
export async function logDataSync(
  action: string,
  userId: string,
  details?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  return AuditLogService.log({
    type: AuditLogType.DATA_SYNC,
    action,
    userId,
    details,
    metadata
  });
}

/**
 * 记录系统日志
 */
export async function logSystem(
  action: string,
  details?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  return AuditLogService.log({
    type: AuditLogType.SYSTEM,
    action,
    userId: 'system',
    details,
    metadata
  });
}

/**
 * 记录错误日志
 */
export async function logError(
  action: string,
  error: Error | string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const errorStack = typeof error === 'object' ? error.stack : undefined;

  return AuditLogService.log({
    type: AuditLogType.ERROR,
    action,
    userId: 'system',
    details: errorMessage,
    metadata: {
      ...metadata,
      stack: errorStack
    }
  });
}

// ================================================================
// 自动迁移（仅在首次加载时执行）
// ================================================================

if (typeof window !== 'undefined') {
  // 延迟执行，确保其他模块已加载
  setTimeout(() => {
    const migrationKey = 'audit_log_migration_complete';
    if (!localStorage.getItem(migrationKey)) {
      console.log('[AuditLogService] 首次加载，开始迁移旧日志...');
      AuditLogService.migrateAll().then(() => {
        localStorage.setItem(migrationKey, Date.now().toString());
      }).catch(err => {
        console.error('[AuditLogService] 日志迁移失败:', err);
      });
    }
  }, 3000);
}
