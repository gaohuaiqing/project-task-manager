// app/server/src/core/utils/data-scope-filter.ts
/**
 * 数据范围过滤器
 *
 * 职责：
 * - 根据用户角色生成数据查询的过滤条件
 * - 确保用户只能访问权限范围内的数据
 */

import type { User } from '../types';

/**
 * 数据范围过滤类型
 */
export type DataScopeType = 'all' | 'department' | 'self';

/**
 * 数据范围过滤器
 */
export interface DataScopeFilter {
  /** 过滤类型 */
  type: DataScopeType;

  /** 部门 ID（type=department 时有效） */
  department_id?: number;

  /** 用户 ID（type=self 时有效） */
  user_id?: number;
}

/**
 * 根据用户角色构建数据范围过滤器
 *
 * @param user - 当前用户
 * @returns 数据范围过滤器
 */
export function buildDataScopeFilter(user: User): DataScopeFilter {
  switch (user.role) {
    case 'admin':
      // 系统管理员：无限制
      return { type: 'all' };

    case 'dept_manager':
      // 部门经理：本部门数据
      return {
        type: 'department',
        department_id: user.department_id ?? undefined,
      };

    case 'tech_manager':
      // 技术经理：本部门数据（暂按部门过滤，后续可扩展为技术组）
      // TODO: 当技术组表创建后，支持按技术组过滤
      return {
        type: 'department',
        department_id: user.department_id ?? undefined,
      };

    case 'engineer':
      // 工程师：自己参与的项目数据
      return {
        type: 'self',
        user_id: user.id,
      };

    default:
      // 未知角色：只看自己
      return {
        type: 'self',
        user_id: user.id,
      };
  }
}

/**
 * 将数据范围过滤器转换为 SQL WHERE 条件
 *
 * @param filter - 数据范围过滤器
 * @param options - 配置选项
 * @returns SQL 条件片段和参数
 */
export function scopeFilterToSQL(
  filter: DataScopeFilter,
  options: {
    /** 用户表的别名，默认 'u' */
    userTableAlias?: string;
    /** 任务表的别名，默认 't' */
    taskTableAlias?: string;
    /** 项目成员表的别名 */
    projectMemberTableAlias?: string;
  } = {}
): { condition: string; params: any[] } {
  const { userTableAlias = 'u', taskTableAlias = 't' } = options;

  switch (filter.type) {
    case 'all':
      // 无限制
      return { condition: '1=1', params: [] };

    case 'department':
      // 按部门过滤
      if (!filter.department_id) {
        // 如果部门 ID 为空，返回空结果条件
        return { condition: '1=0', params: [] };
      }
      return {
        condition: `${userTableAlias}.department_id = ?`,
        params: [filter.department_id],
      };

    case 'self':
      // 按用户过滤（只看自己负责的任务）
      if (!filter.user_id) {
        return { condition: '1=0', params: [] };
      }
      return {
        condition: `${taskTableAlias}.assignee_id = ?`,
        params: [filter.user_id],
      };

    default:
      return { condition: '1=0', params: [] };
  }
}

/**
 * 检查过滤器是否限制数据范围
 */
export function isScopeFiltered(filter: DataScopeFilter): boolean {
  return filter.type !== 'all';
}

/**
 * 获取过滤器描述（用于日志/调试）
 */
export function getScopeFilterDescription(filter: DataScopeFilter): string {
  switch (filter.type) {
    case 'all':
      return '全部数据';
    case 'department':
      return `部门 ID: ${filter.department_id}`;
    case 'self':
      return `用户 ID: ${filter.user_id}`;
    default:
      return '未知范围';
  }
}
