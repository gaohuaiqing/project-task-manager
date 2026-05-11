/**
 * 数据范围过滤服务
 * 根据用户角色过滤数据范围
 *
 * @module analytics/services/scope
 * @see REQ_07_INDEX.md §2 角色权限汇总
 */

import type { User } from '../../../core/types';
import type { DataScope, UserRole } from '../shared-types/shared';
import { buildTaskScopeFilter, buildProjectScopeFilter, buildUserDepartmentScopeFilter } from '../query-builder';

/**
 * 数据范围过滤服务
 * 根据用户角色确定可访问的数据范围
 */
export class ScopeService {
  /**
   * 获取用户的数据范围
   */
  static getDataScope(user: User): DataScope {
    switch (user.role as UserRole) {
      case 'admin':
        return {
          projects: 'all',
          users: 'all',
          departments: 'all',
        };

      case 'dept_manager':
        return {
          projects: 'dept_projects',
          users: 'dept_members',
          departments: 'own_dept',
        };

      case 'tech_manager':
        return {
          projects: 'group_projects',
          users: 'group_members',
          departments: 'own_group',
        };

      case 'engineer':
        return {
          projects: 'my_projects',
          users: 'self',
          departments: 'none',
        };

      default:
        // 默认为最严格权限
        return {
          projects: 'my_projects',
          users: 'self',
          departments: 'none',
        };
    }
  }

  /**
   * 构建项目过滤条件
   * 委托给 query-builder 的 buildProjectScopeFilter
   */
  static async buildProjectFilter(user: User): Promise<{
    whereClause: string;
    params: Record<string, unknown>;
  }> {
    const scope = await buildProjectScopeFilter(user, 'p');
    // 将数组参数转换为命名参数格式
    const params: Record<string, unknown> = {};
    scope.params.forEach((p, i) => {
      params[`param${i}`] = p;
    });
    // 替换占位符为命名参数
    let whereClause = scope.clause;
    scope.params.forEach((_, i) => {
      whereClause = whereClause.replace('?', `:param${i}`);
    });
    return { whereClause, params };
  }

  /**
   * 构建任务过滤条件
   * 委托给 query-builder 的 buildTaskScopeFilter
   */
  static async buildTaskFilter(user: User): Promise<{
    whereClause: string;
    params: Record<string, unknown>;
  }> {
    const scope = await buildTaskScopeFilter(user, 't', true);
    // 将数组参数转换为命名参数格式
    const params: Record<string, unknown> = {};
    scope.params.forEach((p, i) => {
      params[`param${i}`] = p;
    });
    // 替换占位符为命名参数
    let whereClause = scope.clause;
    scope.params.forEach((_, i) => {
      whereClause = whereClause.replace('?', `:param${i}`);
    });
    return { whereClause, params };
  }

  /**
   * 构建用户过滤条件
   * 委托给 query-builder 的 buildUserDepartmentScopeFilter
   */
  static async buildUserFilter(user: User): Promise<{
    whereClause: string;
    params: Record<string, unknown>;
  }> {
    const scope = await buildUserDepartmentScopeFilter(user);
    // 将数组参数转换为命名参数格式
    const params: Record<string, unknown> = {};
    scope.params.forEach((p, i) => {
      params[`param${i}`] = p;
    });
    // 替换占位符为命名参数
    let whereClause = scope.clause;
    scope.params.forEach((_, i) => {
      whereClause = whereClause.replace('?', `:param${i}`);
    });
    return { whereClause, params };
  }

  /**
   * 检查用户是否有权访问指定项目
   */
  static async canAccessProject(user: User, projectId: string, db: any): Promise<boolean> {
    const scope = this.getDataScope(user);

    // admin 有权访问所有项目
    if (scope.projects === 'all') {
      return true;
    }

    // 检查项目是否存在
    const project = await db('projects').where({ id: projectId }).first();
    if (!project) {
      return false;
    }

    // 使用统一的权限过滤逻辑
    const projectScope = await buildProjectScopeFilter(user, 'p');
    const [result] = await db.raw(
      `SELECT 1 FROM projects p WHERE p.id = ? AND ${projectScope.clause}`,
      [projectId, ...projectScope.params]
    );
    return result.length > 0;
  }

  /**
   * 检查用户是否有权访问指定成员数据
   */
  static async canAccessMember(user: User, memberId: number, db: any): Promise<boolean> {
    const scope = this.getDataScope(user);

    // admin 有权访问所有成员
    if (scope.users === 'all') {
      return true;
    }

    // 成员自己
    if (memberId === user.id) {
      return true;
    }

    // 获取目标成员信息
    const targetMember = await db('users').where({ id: memberId }).first();
    if (!targetMember) {
      return false;
    }

    // 使用统一的权限过滤逻辑
    const userScope = await buildUserDepartmentScopeFilter(user);
    const [result] = await db.raw(
      `SELECT 1 FROM users u WHERE u.id = ? AND ${userScope.clause}`,
      [memberId, ...userScope.params]
    );
    return result.length > 0;
  }

  /**
   * 获取用户可访问的部门ID列表
   */
  static getAccessibleDepartmentIds(user: User): number[] {
    const scope = this.getDataScope(user);

    switch (scope.departments) {
      case 'all':
        return []; // 空数组表示全部

      case 'own_dept':
      case 'own_group':
        return user.department_id ? [user.department_id] : [];

      case 'none':
        return [];

      default:
        return [];
    }
  }

  /**
   * 获取用户可访问的用户ID列表
   * 返回空数组表示可访问全部
   */
  static async getAccessibleUserIds(user: User, db: any): Promise<number[]> {
    const scope = this.getDataScope(user);

    switch (scope.users) {
      case 'all':
        return []; // 空数组表示全部

      case 'dept_members':
        const deptMembers = await db('users')
          .where({ department_id: user.department_id })
          .select('id');
        return deptMembers.map((u: any) => u.id);

      case 'group_members':
      case 'self':
        return [user.id];

      default:
        return [user.id];
    }
  }
}

export default ScopeService;
