/**
 * 工程师仪表板模拟数据
 *
 * @module analytics/dashboard/data/mock/engineer.mock
 */

import type {
  EngineerDashboardData,
  AlertData,
  TodoTask,
  ProjectProgress,
} from '../../types';
import type { StatsCardMetric, PieChartDataItem } from '../../../shared/types';
import { generateTaskTrends } from './common.mock';

// ============ 预警数据 ============

export function generateEngineerAlerts(): AlertData[] {
  return [
    {
      type: 'overdue',
      count: 2,
      label: '逾期任务',
      trend: 0,
      color: 'danger',
      actionLabel: '查看详情',
      actionPath: '/tasks?status=overdue',
    },
    {
      type: 'today_due',
      count: 3,
      label: '今日到期',
      trend: 1,
      color: 'warning',
      actionLabel: '查看详情',
      actionPath: '/tasks?due=today',
    },
    {
      type: 'week_due',
      count: 8,
      label: '本周到期',
      trend: 2,
      color: 'info',
      actionLabel: '查看详情',
      actionPath: '/tasks?due=week',
    },
  ];
}

// ============ 核心指标 ============

export function generateEngineerMetrics(): StatsCardMetric[] {
  return [
    {
      label: '参与项目',
      value: 3,
      displayValue: '3',
      description: '当前参与的项目数量',
      trend: 0,
      trendText: '→ 0 vs 上周',
    },
    {
      label: '进行中',
      value: 5,
      displayValue: '5',
      description: '当前正在进行中的任务数量',
      trend: 2,
      trendText: '↑ 2 vs 上周',
    },
    {
      label: '已完成',
      value: 12,
      displayValue: '12',
      description: '已完成并关闭的任务数量',
      trend: 15,
      trendText: '↑ 15% vs 上周',
    },
    {
      label: '待开始',
      value: 3,
      displayValue: '3',
      description: '已分配但尚未开始的任务数量',
      trend: -1,
      trendText: '↓ 1 vs 上周',
    },
  ];
}

// ============ 待办任务 ============

export function generateTodoTasks(): TodoTask[] {
  const now = Date.now();
  return [
    {
      id: '1',
      name: '完成用户认证模块开发',
      projectName: '项目管理系统 3.0',
      dueDate: new Date(now + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      progress: 75,
      priority: 'high',
    },
    {
      id: '2',
      name: '修复登录页面样式问题',
      projectName: '项目管理系统 3.0',
      dueDate: new Date(now + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      progress: 30,
      priority: 'high',
    },
    {
      id: '3',
      name: '编写单元测试用例',
      projectName: '项目管理系统 3.0',
      dueDate: new Date(now + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      progress: 0,
      priority: 'medium',
    },
    {
      id: '4',
      name: '代码审查与优化',
      projectName: '移动端适配项目',
      dueDate: new Date(now + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      progress: 50,
      priority: 'medium',
    },
    {
      id: '5',
      name: '更新技术文档',
      projectName: '项目管理系统 3.0',
      dueDate: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      progress: 20,
      priority: 'low',
    },
  ];
}

// ============ 需要更新的任务 ============

export function generateNeedUpdateTasks(): TodoTask[] {
  const now = Date.now();
  return [
    {
      id: '6',
      name: '数据库性能优化',
      projectName: '项目管理系统 3.0',
      dueDate: new Date(now + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      progress: 45,
      priority: 'medium',
      lastUpdated: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
    {
      id: '7',
      name: '接口对接联调',
      projectName: '第三方集成项目',
      dueDate: new Date(now + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      progress: 60,
      priority: 'low',
      lastUpdated: new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
  ];
}

// ============ 任务状态分布 ============

export function generateTaskStatusDistribution(): PieChartDataItem[] {
  return [
    { name: '进行中', value: 5, color: '#0EA5E9' },
    { name: '已完成', value: 12, color: '#10B981' },
    { name: '待开始', value: 3, color: '#94A3B8' },
  ];
}

// ============ 参与项目进度 ============

export function generateProjectProgress(): ProjectProgress[] {
  return [
    {
      id: '1',
      name: '项目管理系统 3.0',
      progress: 68,
      status: 'on_track',
      totalTasks: 15,
      completedTasks: 10,
      delayedTasks: 1,
      dueDate: '2026-06-30',
    },
    {
      id: '2',
      name: '移动端适配项目',
      progress: 45,
      status: 'at_risk',
      totalTasks: 8,
      completedTasks: 3,
      delayedTasks: 2,
      dueDate: '2026-05-15',
    },
    {
      id: '3',
      name: '第三方集成项目',
      progress: 25,
      status: 'on_track',
      totalTasks: 4,
      completedTasks: 1,
      delayedTasks: 0,
      dueDate: '2026-07-15',
    },
  ];
}

// ============ 完整数据 ============

export function getEngineerDashboardData(): EngineerDashboardData {
  return {
    alerts: generateEngineerAlerts(),
    metrics: generateEngineerMetrics(),
    todoTasks: generateTodoTasks(),
    needUpdateTasks: generateNeedUpdateTasks(),
    trends: generateTaskTrends(),
    taskStatusDistribution: generateTaskStatusDistribution(),
    projectProgress: generateProjectProgress(),
  };
}
