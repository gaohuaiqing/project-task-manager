/**
 * 角色差异化配置
 * 定义不同角色的数据范围、默认筛选、报表可见性
 * @module analytics/reports/config/role-configs
 */

import type { UserRole, ReportType, ReportFilters } from '../types';

/** 角色配置 */
export interface RoleConfig {
  /** 核心视角描述 */
  perspective: string;
  /** 数据范围描述 */
  dataScope: string;
  /** 默认筛选条件 */
  defaultFilters: Partial<ReportFilters>;
  /** 可见报表 */
  visibleReports: ReportType[];
}

/** 角色配置映射 */
export const ROLE_CONFIGS: Record<UserRole, RoleConfig> = {
  admin: {
    perspective: '全局汇总 + 部门对比 + 资源调配',
    dataScope: '全部项目/成员/部门',
    defaultFilters: {
      timeRange: '30d',
    },
    visibleReports: [
      'project-progress',
      'task-statistics',
      'delay-analysis',
      'member-analysis',
      'resource-efficiency',
    ],
  },
  dept_manager: {
    perspective: '部门汇总 + 组对比 + 人员调配',
    dataScope: '本部门项目/成员',
    defaultFilters: {
      timeRange: '30d',
    },
    visibleReports: [
      'project-progress',
      'task-statistics',
      'delay-analysis',
      'member-analysis',
      'resource-efficiency',
    ],
  },
  tech_manager: {
    perspective: '组汇总 + 成员对比 + 任务分配',
    dataScope: '本技术组 + 被授权技术组',
    defaultFilters: {
      timeRange: '30d',
    },
    visibleReports: [
      'project-progress',
      'task-statistics',
      'delay-analysis',
      'member-analysis',
      'resource-efficiency',
    ],
  },
  engineer: {
    perspective: '个人任务',
    dataScope: '我的任务',
    defaultFilters: {},
    visibleReports: [],
  },
};

/**
 * 获取角色配置
 */
export function getRoleConfig(role: UserRole): RoleConfig {
  return ROLE_CONFIGS[role] || ROLE_CONFIGS.engineer;
}

/**
 * 检查角色是否有报表访问权限
 */
export function canAccessReports(role: UserRole): boolean {
  return ROLE_CONFIGS[role]?.visibleReports.length > 0;
}

/**
 * 获取角色的默认筛选条件
 */
export function getDefaultFilters(role: UserRole): Partial<ReportFilters> {
  return ROLE_CONFIGS[role]?.defaultFilters || {};
}
