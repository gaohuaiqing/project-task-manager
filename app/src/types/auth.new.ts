/**
 * 认证和权限类型定义（改进版 - 类型安全）
 *
 * 从原 auth.ts 中提取，使用泛型替代 any 类型
 */

// 重新导出原有的非 any 类型
export type { UserRole } from './auth.js';
export type { DataAccessScope } from './auth.js';
export type { OperationPermission } from './auth.js';
export type { PermissionLevel } from './auth.js';
export type { PermissionConfigItem } from './auth.js';
export type { PermissionConfig } from './auth.js';
export type { UserRoleInfo } from './auth.js';
export type { User } from './auth.js';
export type { ROLE_CONFIG } from './auth.js';

/**
 * 权限变更历史记录（泛型版本）
 * 替代原 auth.ts 中的 any 类型
 */
export interface PermissionHistoryRecord<T = unknown> {
  id: string;
  timestamp: number;
  user: string;
  action: string;
  details: string;
  oldValue?: T;
  newValue?: T;
}

/**
 * 类型守卫：检查是否为有效的权限变更历史记录
 */
export function isValidPermissionHistoryRecord(value: unknown): value is PermissionHistoryRecord {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.id === 'string' &&
    typeof record.timestamp === 'number' &&
    typeof record.user === 'string' &&
    typeof record.action === 'string' &&
    typeof record.details === 'string'
  );
}

/**
 * 创建权限变更历史记录
 */
export function createPermissionHistoryRecord<T>(
  id: string,
  user: string,
  action: string,
  details: string,
  oldValue?: T,
  newValue?: T
): PermissionHistoryRecord<T> {
  return {
    id,
    timestamp: Date.now(),
    user,
    action,
    details,
    oldValue,
    newValue,
  };
}
