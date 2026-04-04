// app/server/src/core/middleware/permission-middleware.ts
/**
 * 统一权限中间件
 *
 * 职责：
 * - 集中定义所有功能的权限要求
 * - 提供权限检查中间件
 * - 确保无权限请求返回 403 错误
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ForbiddenError } from '../errors';
import type { User, UserRole } from '../types';

/**
 * 权限定义
 * 键: 权限名称
 * 值: 允许访问的角色列表
 */
export const PERMISSIONS: Record<string, UserRole[]> = {
  // ========== 报表权限 ==========
  /** 查看报表分析模块 */
  REPORT_VIEW: ['admin', 'dept_manager', 'tech_manager'],

  /** 导出报表数据 */
  REPORT_EXPORT: ['admin', 'dept_manager', 'tech_manager'],

  // ========== 系统配置权限 ==========
  /** 配置项目类型 */
  CONFIG_PROJECT_TYPE: ['admin', 'dept_manager'],

  /** 配置任务类型 */
  CONFIG_TASK_TYPE: ['admin', 'dept_manager'],

  /** 配置节假日 */
  CONFIG_HOLIDAY: ['admin', 'dept_manager'],

  // ========== 审计日志权限 ==========
  /** 查看审计日志 */
  AUDIT_LOG_VIEW: ['admin', 'dept_manager'],

  // ========== 数据导入导出权限 ==========
  /** 导入数据 */
  DATA_IMPORT: ['admin', 'dept_manager'],

  /** 导出数据 */
  DATA_EXPORT: ['admin', 'dept_manager', 'tech_manager'],
};

/**
 * 检查用户是否拥有指定权限
 */
export function hasPermission(user: User, permissionName: string): boolean {
  const allowedRoles = PERMISSIONS[permissionName];
  if (!allowedRoles) {
    console.warn(`[Permission] 未定义的权限: ${permissionName}`);
    return false;
  }
  return allowedRoles.includes(user.role);
}

/**
 * 检查用户是否拥有任意一个指定权限
 */
export function hasAnyPermission(user: User, permissionNames: string[]): boolean {
  return permissionNames.some(name => hasPermission(user, name));
}

/**
 * 检查用户是否拥有所有指定权限
 */
export function hasAllPermissions(user: User, permissionNames: string[]): boolean {
  return permissionNames.every(name => hasPermission(user, name));
}

/**
 * 从请求中获取当前用户
 */
function getCurrentUser(req: Request): User | null {
  return (req as any).user || null;
}

/**
 * 权限检查中间件工厂函数
 *
 * @param permissionName - 需要的权限名称
 * @returns Express 中间件
 *
 * @example
 * router.get('/reports/task-statistics',
 *   requirePermission('REPORT_VIEW'),
 *   handler
 * );
 */
export function requirePermission(permissionName: string): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = getCurrentUser(req);

    if (!user) {
      next(new ForbiddenError('请先登录'));
      return;
    }

    if (!hasPermission(user, permissionName)) {
      next(new ForbiddenError(`无权限执行此操作 (${permissionName})`));
      return;
    }

    next();
  };
}

/**
 * 角色检查中间件工厂函数
 *
 * @param allowedRoles - 允许访问的角色列表
 * @returns Express 中间件
 *
 * @example
 * router.post('/admin/settings',
 *   requireRole(['admin']),
 *   handler
 * );
 */
export function requireRole(allowedRoles: UserRole[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = getCurrentUser(req);

    if (!user) {
      next(new ForbiddenError('请先登录'));
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      next(new ForbiddenError('无权限执行此操作'));
      return;
    }

    next();
  };
}

/**
 * 管理者角色检查中间件
 * 只允许 admin、dept_manager、tech_manager 访问
 */
export const requireManagerRole: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const user = getCurrentUser(req);

  if (!user) {
    next(new ForbiddenError('请先登录'));
    return;
  }

  const managerRoles: UserRole[] = ['admin', 'dept_manager', 'tech_manager'];
  if (!managerRoles.includes(user.role)) {
    next(new ForbiddenError('此功能仅对管理者开放'));
    return;
  }

  next();
};

/**
 * 管理员角色检查中间件
 * 只允许 admin 访问
 */
export const requireAdminRole: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const user = getCurrentUser(req);

  if (!user) {
    next(new ForbiddenError('请先登录'));
    return;
  }

  if (user.role !== 'admin') {
    next(new ForbiddenError('此功能仅对系统管理员开放'));
    return;
  }

  next();
};
