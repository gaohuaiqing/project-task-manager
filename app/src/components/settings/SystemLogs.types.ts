/**
 * 系统日志类型定义
 *
 * @module components/settings/SystemLogs.types
 */

import type { LogEntry } from './SystemLogs';

/**
 * 日志级别配置
 */
export const LOG_LEVELS = [
  { value: 'ALL', label: '全部', color: 'text-slate-400' },
  { value: 'ERROR', label: '错误', color: 'text-red-400', bg: 'bg-red-400/10' },
  { value: 'WARN', label: '警告', color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  { value: 'INFO', label: '信息', color: 'text-blue-400', bg: 'bg-blue-400/10' },
  { value: 'DEBUG', label: '调试', color: 'text-slate-400', bg: 'text-slate-400/10' }
] as const;

/**
 * 日志类型配置
 */
export const LOG_TYPES = [
  { value: 'ALL', label: '全部类型' },
  { value: 'SYSTEM', label: '系统' },
  { value: 'USER_ACTION', label: '用户操作' },
  { value: 'AUTH', label: '认证' },
  { value: 'DATA_SYNC', label: '数据同步' },
  { value: 'PERFORMANCE', label: '性能' },
  { value: 'FRONTEND', label: '前端' }
] as const;

/**
 * 时间范围配置
 */
export const TIME_RANGES = [
  { value: '7d', label: '7天', hours: 168 },
  { value: '3d', label: '3天', hours: 72 },
  { value: '24h', label: '24小时', hours: 24 },
  { value: '12h', label: '12小时', hours: 12 },
  { value: '6h', label: '6小时', hours: 6 },
  { value: '1h', label: '1小时', hours: 1 }
] as const;

/**
 * 导出类型
 */
export type ExportFormat = 'json' | 'csv';

/**
 * 导出选项
 */
export interface ExportOptions {
  /** 导出格式 */
  format: ExportFormat;
  /** 过滤条件 */
  level: string;
  type: string;
  /** 最大导出数量 */
  limit?: number;
}

/**
 * 导出结果
 */
export interface ExportResult {
  success: boolean;
  filename?: string;
  error?: string;
}
