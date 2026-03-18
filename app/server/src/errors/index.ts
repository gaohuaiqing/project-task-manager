/**
 * 错误处理模块 - 统一入口
 *
 * 使用示例：
 * ```typescript
 * import { NotFoundError, ErrorCodes } from './errors/index.js';
 *
 * throw new NotFoundError('任务', taskId);
 * ```
 */

// 导出错误类
export * from './classes.js';

/**
 * 标准化错误码常量
 */
export const ErrorCodes = {
  // ==================== 认证相关 ====================
  AUTH_LOGIN_FAILED: 'AUTH_LOGIN_FAILED',
  AUTH_SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
  AUTH_SESSION_INVALID: 'AUTH_SESSION_INVALID',
  AUTH_LOGIN_RATE_LIMITED: 'AUTH_LOGIN_RATE_LIMITED',
  AUTH_PASSWORD_EXPIRED: 'AUTH_PASSWORD_EXPIRED',
  AUTH_PASSWORD_WEAK: 'AUTH_PASSWORD_WEAK',

  // ==================== 用户相关 ====================
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_USERNAME_EXISTS: 'USER_USERNAME_EXISTS',
  USER_EMAIL_EXISTS: 'USER_EMAIL_EXISTS',
  USER_INACTIVE: 'USER_INACTIVE',
  USER_LOCKED: 'USER_LOCKED',

  // ==================== 项目相关 ====================
  PROJ_NOT_FOUND: 'PROJ_NOT_FOUND',
  PROJ_CODE_EXISTS: 'PROJ_CODE_EXISTS',
  PROJ_VERSION_CONFLICT: 'PROJ_VERSION_CONFLICT',
  PROJ_ALREADY_ARCHIVED: 'PROJ_ALREADY_ARCHIVED',
  PROJ_NOT_ARCHIVED: 'PROJ_NOT_ARCHIVED',

  // ==================== 任务相关 ====================
  TASK_NOT_FOUND: 'TASK_NOT_FOUND',
  TASK_VERSION_CONFLICT: 'TASK_VERSION_CONFLICT',
  TASK_CIRCULAR_DEPENDENCY: 'TASK_CIRCULAR_DEPENDENCY',
  TASK_ALREADY_COMPLETED: 'TASK_ALREADY_COMPLETED',
  TASK_INVALID_STATUS: 'TASK_INVALID_STATUS',
  TASK_DATE_CONFLICT: 'TASK_DATE_CONFLICT',

  // ==================== 成员相关 ====================
  MEMBER_NOT_FOUND: 'MEMBER_NOT_FOUND',
  MEMBER_ALREADY_EXISTS: 'MEMBER_ALREADY_EXISTS',
  MEMBER_INACTIVE: 'MEMBER_INACTIVE',

  // ==================== 审批相关 ====================
  APPROVAL_NOT_FOUND: 'APPROVAL_NOT_FOUND',
  APPROVAL_PROCESSED: 'APPROVAL_PROCESSED',
  APPROVAL_NOT_AUTHORIZED: 'APPROVAL_NOT_AUTHORIZED',
  APPROVAL_TIMEOUT: 'APPROVAL_TIMEOUT',

  // ==================== 文件相关 ====================
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  FILE_TYPE_NOT_ALLOWED: 'FILE_TYPE_NOT_ALLOWED',
  FILE_UPLOAD_FAILED: 'FILE_UPLOAD_FAILED',

  // ==================== 通用错误 ====================
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  FORBIDDEN: 'FORBIDDEN',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const;

/**
 * 错误码类型
 */
export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];
