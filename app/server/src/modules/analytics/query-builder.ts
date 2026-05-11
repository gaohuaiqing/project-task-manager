// app/server/src/modules/analytics/query-builder.ts
// 角色感知的数据范围SQL构建器

import { getPool } from '../../core/db';
import type { RowDataPacket } from 'mysql2/promise';
import type { User } from '../../core/types';
import CacheService from '../../services/CacheService';

// 缓存键前缀
const CACHE_KEY_PREFIX = 'scope:dept_ids:';

// 缓存时间配置（单位：秒）
const SCOPE_CACHE_TTL = 900; // 权限范围缓存：15分钟（优化性能）
const TABLE_EXISTS_CACHE_TTL = 3600; // 表存在检查缓存：1小时（表结构不频繁变化）

/**
 * 数据范围SQL过滤结果
 */
export interface ScopeFilter {
  /** SQL WHERE子句片段（包含占位符） */
  clause: string;
  /** 占位符参数 */
  params: (string | number)[];
}

/**
 * 根据角色构建任务数据范围的SQL过滤条件
 *
 * 角色层级：
 * - admin: 无过滤，查看全部
 * - dept_manager: 本部门所有人员涉及的项目/任务
 * - tech_manager: 本技术组 + 被授权技术组人员涉及的项目/任务
 * - engineer: 自己参与的项目
 *
 * @param user 当前用户
 * @param tableAlias 任务表别名，默认 't'
 * @param joinProjects 是否需要 JOIN projects 表
 */
export async function buildTaskScopeFilter(
  user: User,
  tableAlias: string = 't',
  joinProjects: boolean = true,
  projectId?: string,
): Promise<ScopeFilter> {
  // 先获取基础 scope
  let baseScope: ScopeFilter;

  // admin: 无过滤
  if (user.role === 'admin') {
    baseScope = { clause: '1=1', params: [] };
  } else if (user.role === 'dept_manager') {
    if (!user.department_id) {
      baseScope = { clause: '1=0', params: [] };
    } else {
      const deptIds = await getManagedDepartmentIds(user.id, user.department_id);
      if (deptIds.length === 0) {
        baseScope = { clause: '1=0', params: [] };
      } else {
        const placeholders = deptIds.map(() => '?').join(',');
        baseScope = {
          clause: `(${tableAlias}.assignee_id IS NULL OR EXISTS (SELECT 1 FROM users sub_u WHERE sub_u.id = ${tableAlias}.assignee_id AND sub_u.department_id IN (${placeholders}) AND sub_u.is_active = 1))`,
          params: deptIds,
        };
      }
    }
  } else if (user.role === 'tech_manager') {
    if (!user.department_id) {
      baseScope = { clause: '1=0', params: [] };
    } else {
      const groupIds = await getTechManagerGroupIds(user.id, user.department_id);
      if (groupIds.length === 0) {
        baseScope = { clause: '1=0', params: [] };
      } else {
        const placeholders = groupIds.map(() => '?').join(',');
        baseScope = {
          clause: `(${tableAlias}.assignee_id IS NULL OR EXISTS (SELECT 1 FROM users sub_u WHERE sub_u.id = ${tableAlias}.assignee_id AND sub_u.department_id IN (${placeholders}) AND sub_u.is_active = 1))`,
          params: groupIds,
        };
      }
    }
  } else {
    // engineer: 自己参与的项目中的任务（含未分配任务）
    // 使用 ${tableAlias}.project_id 替代 p.id，使子查询自包含，不依赖外部别名
    baseScope = {
      clause: `(${tableAlias}.assignee_id IS NULL OR EXISTS (
        SELECT 1 FROM project_members pm
        WHERE pm.project_id = ${tableAlias}.project_id
        AND pm.user_id = ?
      ))`,
      params: [user.id],
    };
  }

  // 如果指定了 projectId，添加项目过滤条件
  if (projectId) {
    const projectAlias = joinProjects ? 'p' : tableAlias.replace('t', 'p');
    return {
      clause: `${baseScope.clause} AND ${projectAlias}.id = ?`,
      params: [...baseScope.params, projectId],
    };
  }

  return baseScope;
}

/**
 * 根据角色构建项目数据范围的SQL过滤条件
 * projectId 用于进一步过滤特定项目
 */
export async function buildProjectScopeFilter(
  user: User,
  tableAlias: string = 'p',
  projectId?: string,
): Promise<ScopeFilter> {
  let baseScope: ScopeFilter;

  // admin: 无过滤
  if (user.role === 'admin') {
    baseScope = { clause: '1=1', params: [] };
  } else if (user.role === 'dept_manager') {
    if (!user.department_id) {
      baseScope = { clause: '1=0', params: [] };
    } else {
      const deptIds = await getManagedDepartmentIds(user.id, user.department_id);
      if (deptIds.length === 0) {
        baseScope = { clause: '1=0', params: [] };
      } else {
        const userPlaceholders = deptIds.map(() => '?').join(',');
        baseScope = {
          clause: `EXISTS (
            SELECT 1 FROM project_members pm
            JOIN users sub_u ON pm.user_id = sub_u.id
            WHERE pm.project_id = ${tableAlias}.id
            AND sub_u.department_id IN (${userPlaceholders})
            AND sub_u.is_active = 1
          )`,
          params: deptIds,
        };
      }
    }
  } else if (user.role === 'tech_manager') {
    if (!user.department_id) {
      baseScope = { clause: '1=0', params: [] };
    } else {
      const groupIds = await getTechManagerGroupIds(user.id, user.department_id);
      if (groupIds.length === 0) {
        baseScope = { clause: '1=0', params: [] };
      } else {
        const userPlaceholders = groupIds.map(() => '?').join(',');
        baseScope = {
          clause: `EXISTS (
            SELECT 1 FROM project_members pm
            JOIN users sub_u ON pm.user_id = sub_u.id
            WHERE pm.project_id = ${tableAlias}.id
            AND sub_u.department_id IN (${userPlaceholders})
            AND sub_u.is_active = 1
          )`,
          params: groupIds,
        };
      }
    }
  } else {
    // engineer: 自己参与的项目
    baseScope = {
      clause: `EXISTS (
        SELECT 1 FROM project_members pm
        WHERE pm.project_id = ${tableAlias}.id
        AND pm.user_id = ?
      )`,
      params: [user.id],
    };
  }

  // 如果指定了 projectId，添加项目过滤条件
  if (projectId) {
    return {
      clause: `${baseScope.clause} AND ${tableAlias}.id = ?`,
      params: [...baseScope.params, projectId],
    };
  }

  return baseScope;
}

/**
 * 根据角色构建用户部门范围的SQL过滤条件
 * 用于 member_status 等需要按部门过滤用户的场景
 *
 * 角色层级：
 * - admin: 无过滤，查看全部用户
 * - dept_manager: 本部门及所有子部门的用户
 * - tech_manager: 本技术组 + 被授权技术组的用户
 * - engineer: 仅自己
 */
export async function buildUserDepartmentScopeFilter(user: User): Promise<ScopeFilter> {
  // admin: 无过滤
  if (user.role === 'admin') {
    return { clause: '1=1', params: [] };
  }

  // dept_manager: 本部门所有子部门的用户
  if (user.role === 'dept_manager') {
    if (!user.department_id) {
      return { clause: '1=0', params: [] };
    }
    const deptIds = await getManagedDepartmentIds(user.id, user.department_id);
    if (deptIds.length === 0) {
      return { clause: '1=0', params: [] };
    }
    const placeholders = deptIds.map(() => '?').join(',');
    return {
      clause: `u.department_id IN (${placeholders})`,
      params: deptIds,
    };
  }

  // tech_manager: 本技术组 + 被授权技术组的用户
  if (user.role === 'tech_manager') {
    if (!user.department_id) {
      return { clause: '1=0', params: [] };
    }
    const groupIds = await getTechManagerGroupIds(user.id, user.department_id);
    if (groupIds.length === 0) {
      return { clause: '1=0', params: [] };
    }
    const placeholders = groupIds.map(() => '?').join(',');
    return {
      clause: `u.department_id IN (${placeholders})`,
      params: groupIds,
    };
  }

  // engineer: 仅自己
  return {
    clause: `u.id = ?`,
    params: [user.id],
  };
}

// ========== 内部辅助方法（部分导出供 repository 复用） ==========

/**
 * 获取 dept_manager 管理的所有部门ID（包括子部门）
 *
 * 部门层级: 根部门(dept_manager管理) → 技术组(tech_manager管理) → 用户部门
 * dept_manager 管理的是根部门及其所有子部门下的用户
 *
 * 支持两种授权方式：
 * 1. departments.manager_id（始终可用）
 * 2. department_managers 表（可选增强，支持多经理场景）
 *
 * 使用递归 CTE 查询部门树，获取用户管理的部门及其所有后代部门。
 * 遵循"无授权则无权限"的安全原则，无 fallback 逻辑。
 */
export async function getManagedDepartmentIds(
  managerId: number,
  // _managerDeptId: 保留参数用于向后兼容，函数内部通过 managerId 查询数据库获取管理的部门
  // 原设计中此参数用于 fallback 逻辑，现已移除 fallback，保留参数签名以避免破坏现有调用方
  _managerDeptId: number,
): Promise<number[]> {
  // 尝试从缓存获取
  const cacheKey = `${CACHE_KEY_PREFIX}managed:${managerId}`;
  const cached = CacheService.get<number[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const pool = getPool();

  // 检查 department_managers 表是否存在
  const tableExists = await checkTableExists('department_managers');

  // 使用递归 CTE 查询管理的部门及其所有后代
  // 支持两种授权方式：departments.manager_id 和 department_managers 表
  const query = tableExists
    ? `WITH RECURSIVE dept_tree AS (
        SELECT d.id FROM departments d
        LEFT JOIN department_managers dm ON d.id = dm.department_id
        WHERE d.manager_id = ? OR dm.user_id = ?
        UNION ALL
        SELECT d.id FROM departments d
        JOIN dept_tree dt ON d.parent_id = dt.id
      )
      SELECT id FROM dept_tree`
    : `WITH RECURSIVE dept_tree AS (
        SELECT d.id FROM departments d
        WHERE d.manager_id = ?
        UNION ALL
        SELECT d.id FROM departments d
        JOIN dept_tree dt ON d.parent_id = dt.id
      )
      SELECT id FROM dept_tree`;

  const params = tableExists ? [managerId, managerId] : [managerId];
  const [rows] = await pool.execute<RowDataPacket[]>(query, params);

  const deptIds = rows.map((r: RowDataPacket) => r.id);

  // 移除 fallback 逻辑：无授权则返回空数组
  // 遵循"无授权则无权限"的安全原则

  // 缓存结果（15分钟 - 优化性能）
  CacheService.set(cacheKey, deptIds, SCOPE_CACHE_TTL);

  return deptIds;
}

/**
 * 获取 tech_manager 管理的技术组部门ID（包括被授权的）
 *
 * tech_manager 管理的是技术组及其子部门下的用户
 * 被授权技术组需要通过授权机制获取
 *
 * 支持两种授权方式：
 * 1. departments.manager_id（始终可用）
 * 2. department_managers 表（可选增强，支持多经理场景）
 *
 * 使用递归 CTE 查询技术组树，获取用户管理的技术组及其所有后代部门。
 * 遵循"无授权则无权限"的安全原则，无 fallback 逻辑。
 */
export async function getTechManagerGroupIds(
  managerId: number,
  // _managerDeptId: 保留参数用于向后兼容，函数内部通过 managerId 查询数据库获取管理的技术组
  // 原设计中此参数用于 fallback 逻辑，现已移除 fallback，保留参数签名以避免破坏现有调用方
  _managerDeptId: number,
): Promise<number[]> {
  // 尝试从缓存获取
  const cacheKey = `${CACHE_KEY_PREFIX}tech_groups:${managerId}`;
  const cached = CacheService.get<number[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const pool = getPool();

  // 检查 department_managers 表是否存在
  const tableExists = await checkTableExists('department_managers');

  // 使用递归 CTE 查询管理的技术组及其所有后代
  // 与 dept_manager 逻辑一致，统一处理
  const query = tableExists
    ? `WITH RECURSIVE dept_tree AS (
        SELECT d.id FROM departments d
        LEFT JOIN department_managers dm ON d.id = dm.department_id
        WHERE d.manager_id = ? OR dm.user_id = ?
        UNION ALL
        SELECT d.id FROM departments d
        JOIN dept_tree dt ON d.parent_id = dt.id
      )
      SELECT id FROM dept_tree`
    : `WITH RECURSIVE dept_tree AS (
        SELECT d.id FROM departments d
        WHERE d.manager_id = ?
        UNION ALL
        SELECT d.id FROM departments d
        JOIN dept_tree dt ON d.parent_id = dt.id
      )
      SELECT id FROM dept_tree`;

  const params = tableExists ? [managerId, managerId] : [managerId];
  const [rows] = await pool.execute<RowDataPacket[]>(query, params);

  const groupIds = rows.map((r: RowDataPacket) => r.id);

  // 移除 fallback 逻辑：无授权则返回空数组
  // 遵循"无授权则无权限"的安全原则

  // 缓存结果（15分钟 - 优化性能）
  CacheService.set(cacheKey, groupIds, SCOPE_CACHE_TTL);

  return groupIds;
}

/**
 * 检查数据库表是否存在
 * 缓存结果避免重复查询
 */
export async function checkTableExists(tableName: string): Promise<boolean> {
  const cacheKey = `${CACHE_KEY_PREFIX}table_exists:${tableName}`;
  const cached = CacheService.get<boolean>(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const pool = getPool();
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1',
      [tableName]
    );
    const exists = rows.length > 0;
    // 缓存1小时（表结构不频繁变化）
    CacheService.set(cacheKey, exists, TABLE_EXISTS_CACHE_TTL);
    return exists;
  } catch {
    CacheService.set(cacheKey, false, TABLE_EXISTS_CACHE_TTL);
    return false;
  }
}

/**
 * 清除用户权限范围缓存
 * 当用户部门变更或部门经理变更时调用
 *
 * @param userId 用户ID
 */
export function clearUserScopeCache(userId: number): void {
  const managedCacheKey = `${CACHE_KEY_PREFIX}managed:${userId}`;
  const techGroupsCacheKey = `${CACHE_KEY_PREFIX}tech_groups:${userId}`;
  CacheService.del(managedCacheKey);
  CacheService.del(techGroupsCacheKey);
}

/**
 * 清除所有权限范围缓存
 * 当部门结构变更时调用
 */
export function clearAllScopeCache(): void {
  CacheService.flush();
}
