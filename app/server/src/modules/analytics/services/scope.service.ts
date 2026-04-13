/**
 * 数据范围过滤服务
 * 根据用户角色过滤数据范围
 *
 * @module analytics/services/scope
 * @see REQ_07_INDEX.md §2 角色权限汇总
 */

import type { User } from '../../../core/types';
import type { DataScope, UserRole } from '../shared-types/shared';

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
   * 返回可直接用于 SQL WHERE 子句的条件
   */
  static buildProjectFilter(user: User): {
    whereClause: string;
    params: Record<string, unknown>;
  } {
    const scope = this.getDataScope(user);
    const params: Record<string, unknown> = {};
    let whereClause = '1=1';

    switch (scope.projects) {
      case 'all':
        // 无额外过滤
        break;

      case 'dept_projects':
        whereClause = 'p.department_id = :departmentId';
        params.departmentId = user.department_id;
        break;

      case 'group_projects':
        // 技术组参与的项目（通过任务分配关联）
        // 注意：User 类型中没有 tech_group_id，需要通过其他方式获取
        whereClause = `
          EXISTS (
            SELECT 1 FROM wbs_tasks wt
            JOIN users u ON wt.assignee_id = u.id
            WHERE wt.project_id = p.id
            AND u.id = :userId
          )
        `;
        params.userId = user.id;
        break;

      case 'my_projects':
        // 用户参与的项目（通过任务分配关联）
        whereClause = `
          EXISTS (
            SELECT 1 FROM wbs_tasks wt
            WHERE wt.project_id = p.id
            AND wt.assignee_id = :userId
          )
        `;
        params.userId = user.id;
        break;
    }

    return { whereClause, params };
  }

  /**
   * 构建任务过滤条件
   */
  static buildTaskFilter(user: User): {
    whereClause: string;
    params: Record<string, unknown>;
  } {
    const scope = this.getDataScope(user);
    const params: Record<string, unknown> = {};
    let whereClause = '1=1';

    switch (scope.users) {
      case 'all':
        // 无额外过滤
        break;

      case 'dept_members':
        whereClause = 'u.department_id = :departmentId';
        params.departmentId = user.department_id;
        break;

      case 'group_members':
        // 注意：User 类型中没有 tech_group_id
        whereClause = 't.assignee_id = :userId';
        params.userId = user.id;
        break;

      case 'self':
        whereClause = 't.assignee_id = :userId';
        params.userId = user.id;
        break;
    }

    return { whereClause, params };
  }

  /**
   * 构建用户过滤条件
   */
  static buildUserFilter(user: User): {
    whereClause: string;
    params: Record<string, unknown>;
  } {
    const scope = this.getDataScope(user);
    const params: Record<string, unknown> = {};
    let whereClause = '1=1';

    switch (scope.users) {
      case 'all':
        break;

      case 'dept_members':
        whereClause = 'u.department_id = :departmentId';
        params.departmentId = user.department_id;
        break;

      case 'group_members':
        whereClause = 'u.id = :userId';
        params.userId = user.id;
        break;

      case 'self':
        whereClause = 'u.id = :userId';
        params.userId = user.id;
        break;
    }

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

    switch (scope.projects) {
      case 'dept_projects':
        return project.department_id === user.department_id;

      case 'group_projects':
      case 'my_projects':
        // 检查用户是否参与该项目
        const myTask = await db('wbs_tasks')
          .where({ project_id: projectId, assignee_id: user.id })
          .first();
        return !!myTask;

      default:
        return false;
    }
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

    switch (scope.users) {
      case 'dept_members':
        return targetMember.department_id === user.department_id;

      case 'group_members':
      case 'self':
        return memberId === user.id;

      default:
        return false;
    }
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
