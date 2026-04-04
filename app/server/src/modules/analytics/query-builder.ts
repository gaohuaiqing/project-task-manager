// app/server/src/modules/analytics/query-builder.ts
// 角色感知的数据范围SQL构建器

import { getPool } from '../../core/db';
import type { RowDataPacket } from 'mysql2/promise';
import type { User } from '../../core/types';

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
): Promise<ScopeFilter> {
  // admin: 无过滤
  if (user.role === 'admin') {
    return { clause: '1=1', params: [] };
  }

  // dept_manager: 本部门所有人员的任务
  if (user.role === 'dept_manager' && user.department_id) {
    const deptIds = await getManagedDepartmentIds(user.id, user.department_id);
    if (deptIds.length === 0) {
      return { clause: '1=0', params: [] }; // 无管辖范围，返回空
    }
    const placeholders = deptIds.map(() => '?').join(',');
    return {
      clause: `EXISTS (SELECT 1 FROM users u WHERE u.id = ${tableAlias}.assignee_id AND u.department_id IN (${placeholders}) AND u.is_active = 1)`,
      params: deptIds,
    };
  }

  // tech_manager: 本技术组 + 被授权技术组
  if (user.role === 'tech_manager' && user.department_id) {
    const groupIds = await getTechManagerGroupIds(user.id, user.department_id);
    if (groupIds.length === 0) {
      return { clause: '1=0', params: [] };
    }
    const placeholders = groupIds.map(() => '?').join(',');
    return {
      clause: `EXISTS (SELECT 1 FROM users u WHERE u.id = ${tableAlias}.assignee_id AND u.department_id IN (${placeholders}) AND u.is_active = 1)`,
      params: groupIds,
    };
  }

  // engineer: 自己参与的项目中的任务
  return {
    clause: `FIND_IN_SET(?, p.member_ids) > 0`,
    params: [user.id.toString()],
  };
}

/**
 * 根据角色构建项目数据范围的SQL过滤条件
 */
export async function buildProjectScopeFilter(
  user: User,
  tableAlias: string = 'p',
): Promise<ScopeFilter> {
  // admin: 无过滤
  if (user.role === 'admin') {
    return { clause: '1=1', params: [] };
  }

  // dept_manager: 本部门人员参与的项目
  if (user.role === 'dept_manager' && user.department_id) {
    const deptIds = await getManagedDepartmentIds(user.id, user.department_id);
    if (deptIds.length === 0) {
      return { clause: '1=0', params: [] };
    }
    // 项目成员中有本部门人员
    const userPlaceholders = deptIds.map(() => '?').join(',');
    return {
      clause: `EXISTS (
        SELECT 1 FROM users u
        WHERE FIND_IN_SET(u.id, ${tableAlias}.member_ids) > 0
        AND u.department_id IN (${userPlaceholders})
        AND u.is_active = 1
      )`,
      params: deptIds,
    };
  }

  // tech_manager: 本技术组+授权组人员参与的项目
  if (user.role === 'tech_manager' && user.department_id) {
    const groupIds = await getTechManagerGroupIds(user.id, user.department_id);
    if (groupIds.length === 0) {
      return { clause: '1=0', params: [] };
    }
    const userPlaceholders = groupIds.map(() => '?').join(',');
    return {
      clause: `EXISTS (
        SELECT 1 FROM users u
        WHERE FIND_IN_SET(u.id, ${tableAlias}.member_ids) > 0
        AND u.department_id IN (${userPlaceholders})
        AND u.is_active = 1
      )`,
      params: groupIds,
    };
  }

  // engineer: 自己参与的项目
  return {
    clause: `FIND_IN_SET(?, ${tableAlias}.member_ids) > 0`,
    params: [user.id.toString()],
  };
}

// ========== 内部辅助方法 ==========

/**
 * 获取 dept_manager 管理的所有部门ID（包括子部门）
 *
 * 部门层级: 根部门(dept_manager管理) → 技术组(tech_manager管理) → 用户部门
 * dept_manager 管理的是根部门及其所有子部门下的用户
 */
async function getManagedDepartmentIds(
  managerId: number,
  managerDeptId: number,
): Promise<number[]> {
  const pool = getPool();

  // 方式1: 直接是部门manager
  // 方式2: 递归查找所有子部门
  const [rows] = await pool.execute<RowDataPacket[]>(
    `WITH RECURSIVE dept_tree AS (
      SELECT id FROM departments WHERE manager_id = ? AND is_active = 1
      UNION ALL
      SELECT d.id FROM departments d
      JOIN dept_tree dt ON d.parent_id = dt.id
      WHERE d.is_active = 1
    )
    SELECT id FROM dept_tree`,
    [managerId]
  );

  const deptIds = rows.map((r: RowDataPacket) => r.id);

  // 如果没找到（可能不是直接的manager），fallback到自己的部门
  if (deptIds.length === 0 && managerDeptId) {
    deptIds.push(managerDeptId);
  }

  return deptIds;
}

/**
 * 获取 tech_manager 管理的技术组部门ID（包括被授权的）
 *
 * tech_manager 管理的是技术组及其子部门下的用户
 * 被授权技术组需要通过授权机制获取
 */
async function getTechManagerGroupIds(
  managerId: number,
  managerDeptId: number,
): Promise<number[]> {
  const pool = getPool();

  // 1. 获取直接管理的技术组
  const [managedGroups] = await pool.execute<RowDataPacket[]>(
    `WITH RECURSIVE group_tree AS (
      SELECT id FROM departments WHERE manager_id = ? AND is_active = 1
      UNION ALL
      SELECT d.id FROM departments d
      JOIN group_tree gt ON d.parent_id = gt.id
      WHERE d.is_active = 1
    )
    SELECT id FROM group_tree`,
    [managerId]
  );

  const groupIds = managedGroups.map((r: RowDataPacket) => r.id);

  // 2. 获取被授权管理的技术组（如果有授权表的话）
  // TODO: 当授权表创建后，从 team_authorizations 表查询
  // const [authorizedGroups] = await pool.execute<RowDataPacket[]>(
  //   `SELECT tech_group_id FROM team_authorizations WHERE tech_manager_id = ? AND is_active = 1`,
  //   [managerId]
  // );
  // groupIds.push(...authorizedGroups.map((r: RowDataPacket) => r.tech_group_id));

  // fallback
  if (groupIds.length === 0 && managerDeptId) {
    groupIds.push(managerDeptId);
  }

  return [...new Set(groupIds)]; // 去重
}
