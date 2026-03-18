/**
 * 权限验证服务
 *
 * 基于RBAC（基于角色的访问控制）实现：
 * - 角色权限映射
 * - 权限验证
 * - 缓存优化
 */

import { cacheManager } from '../cache/index.js';
import { logger, LOG_CATEGORIES } from '../logging/index.js';
import type { UserRole, Permission } from './types.js';
import { ROLE_PERMISSIONS } from './types.js';

/**
 * 权限验证结果
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * 权限验证服务类
 */
export class PermissionService {
  /**
   * 检查用户是否有指定权限
   */
  async hasPermission(userId: number, role: UserRole, permission: Permission): Promise<PermissionCheckResult> {
    try {
      // 1. 获取角色权限列表
      const permissions = ROLE_PERMISSIONS[role];

      if (!permissions) {
        logger.warn(LOG_CATEGORIES.AUTH, '未知角色', { userId, role });
        return { allowed: false, reason: '未知用户角色' };
      }

      // 2. 检查权限
      const hasPermission = permissions.includes(permission);

      if (!hasPermission) {
        logger.debug(LOG_CATEGORIES.AUTH, '权限不足', {
          userId,
          role,
          permission
        });

        return {
          allowed: false,
          reason: `角色 ${role} 没有权限 ${permission}`
        };
      }

      return { allowed: true };
    } catch (error: any) {
      logger.error(LOG_CATEGORIES.AUTH, '权限验证失败', {
        userId,
        permission,
        error: error.message
      });

      return {
        allowed: false,
        reason: '权限验证失败'
      };
    }
  }

  /**
   * 批量检查权限
   */
  async hasPermissions(userId: number, role: UserRole, permissions: Permission[]): Promise<{
    allowed: boolean;
    results: Map<Permission, boolean>;
  }> {
    const results = new Map<Permission, boolean>();
    let allAllowed = true;

    for (const permission of permissions) {
      const check = await this.hasPermission(userId, role, permission);
      results.set(permission, check.allowed);

      if (!check.allowed) {
        allAllowed = false;
      }
    }

    return {
      allowed: allAllowed,
      results
    };
  }

  /**
   * 获取用户所有权限
   */
  async getUserPermissions(userId: number, role: UserRole): Promise<Permission[]> {
    try {
      // 尝试从缓存获取
      const cached = await cacheManager.getUserPermissions(userId);

      if (cached.success && cached.data) {
        return cached.data;
      }

      // 从角色获取权限
      const permissions = ROLE_PERMISSIONS[role] || [];

      // 写入缓存
      await cacheManager.setUserPermissions(userId, permissions);

      return permissions;
    } catch (error: any) {
      logger.error(LOG_CATEGORIES.AUTH, '获取用户权限失败', {
        userId,
        error: error.message
      });

      return [];
    }
  }

  /**
   * 检查项目权限
   */
  async canAccessProject(userId: number, role: UserRole, projectId: number, action: 'view' | 'edit' | 'delete'): Promise<PermissionCheckResult> {
    const permissionMap = {
      view: 'project:view' as Permission,
      edit: 'project:edit' as Permission,
      delete: 'project:delete' as Permission
    };

    return this.hasPermission(userId, role, permissionMap[action]);
  }

  /**
   * 检查任务权限
   */
  async canAccessTask(userId: number, role: UserRole, taskId: number, action: 'view' | 'edit' | 'delete' | 'assign'): Promise<PermissionCheckResult> {
    const permissionMap = {
      view: 'task:view' as Permission,
      edit: 'task:edit' as Permission,
      delete: 'task:delete' as Permission,
      assign: 'task:assign' as Permission
    };

    return this.hasPermission(userId, role, permissionMap[action]);
  }

  /**
   * 检查成员权限
   */
  async canAccessMember(userId: number, role: UserRole, memberId: number, action: 'view' | 'edit' | 'delete'): Promise<PermissionCheckResult> {
    const permissionMap = {
      view: 'member:view' as Permission,
      edit: 'member:edit' as Permission,
      delete: 'member:delete' as Permission
    };

    return this.hasPermission(userId, role, permissionMap[action]);
  }

  /**
   * 清除用户权限缓存
   */
  async clearUserPermissionCache(userId: number): Promise<void> {
    await cacheManager.invalidateUserPermissions(userId);
    logger.debug(LOG_CATEGORIES.AUTH, '用户权限缓存已清除', { userId });
  }
}

/**
 * 全局权限服务实例
 */
export const permissionService = new PermissionService();

/**
 * 默认导出
 */
export default permissionService;

/**
 * Express中间件：权限验证
 */
export function requirePermission(permission: Permission) {
  return async (req: any, res: any, next: any) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          success: false,
          message: '未登录'
        });
      }

      const check = await permissionService.hasPermission(user.id, user.role, permission);

      if (!check.allowed) {
        return res.status(403).json({
          success: false,
          message: check.reason || '权限不足'
        });
      }

      next();
    } catch (error) {
      logger.error(LOG_CATEGORIES.AUTH, '权限中间件错误', {
        permission,
        error
      });

      return res.status(500).json({
        success: false,
        message: '权限验证失败'
      });
    }
  };
}

/**
 * Express中间件：角色验证
 */
export function requireRole(...roles: UserRole[]) {
  return (req: any, res: any, next: any) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '未登录'
      });
    }

    if (!roles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: `需要以下角色之一: ${roles.join(', ')}`
      });
    }

    next();
  };
}
