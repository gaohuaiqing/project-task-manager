/**
 * 技术经理仪表板模拟数据
 *
 * @module analytics/dashboard/data/mock/techManager.mock
 */

import type {
  TechManagerDashboardData,
  AlertData,
  MemberTaskStatus,
  AllocationSuggestion,
  MemberActivityTrend,
} from '../../types';
import type { StatsCardMetric } from '../../../shared/types';
import { generateTaskTrends, generateTaskTypeDistribution } from './common.mock';

// ============ 工具函数 ============

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPercent(min: number = 0, max: number = 100): number {
  return randomInt(min, max);
}

function generatePastDates(days: number): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
}

// ============ 预警数据 ============

export function generateTechManagerAlerts(): AlertData[] {
  return [
    {
      type: 'delay_warning',
      count: 3,
      label: '延期预警',
      trend: 1,
      color: 'warning',
      actionLabel: '查看详情',
      actionPath: '/tasks?status=delay_warning',
    },
    {
      type: 'overdue',
      count: 2,
      label: '已延期',
      trend: 0,
      color: 'danger',
      actionLabel: '查看详情',
      actionPath: '/tasks?status=overdue',
    },
    {
      type: 'pending_approval',
      count: 4,
      label: '待我审批',
      trend: 2,
      color: 'info',
      actionLabel: '查看详情',
      actionPath: '/tasks?status=pending_approval',
    },
    {
      type: 'high_risk',
      count: 5,
      label: '待分配',
      trend: -1,
      color: 'info',
      actionLabel: '查看详情',
      actionPath: '/tasks?status=unassigned',
    },
  ];
}

// ============ 核心指标 ============

export function generateTechManagerMetrics(): StatsCardMetric[] {
  return [
    {
      label: '组内项目',
      value: 8,
      displayValue: '8',
      description: '当前技术组参与的项目数量',
      trend: 1,
      trendText: '↑ 1 vs 上周',
    },
    {
      label: '组内任务',
      value: 127,
      displayValue: '127',
      description: '组内所有成员的任务总数',
      trend: 8,
      trendText: '↑ 8% vs 上周',
    },
    {
      label: '完成率',
      value: 78,
      displayValue: '78%',
      description: '组内已完成任务占比',
      trend: 2,
      trendText: '↑ 2% vs 上周',
    },
    {
      label: '延期率',
      value: 6,
      displayValue: '6%',
      description: '超过计划截止日期的任务占比',
      trend: -1,
      trendText: '↓ 1% vs 上周',
    },
    {
      label: '组内人数',
      value: 10,
      displayValue: '10',
      description: '当前技术组的成员总数',
      trend: 0,
      trendText: '→ 0 vs 上周',
    },
    {
      label: '平均负载',
      value: 85,
      displayValue: '85%',
      description: '组内成员的平均任务负载率',
      trend: 3,
      trendText: '↑ 3% vs 上周',
    },
    {
      label: '本周到期',
      value: 12,
      displayValue: '12',
      description: '本周内需要完成的任务数量',
      trend: 2,
      trendText: '↑ 2 vs 上周',
    },
    {
      label: '活跃度',
      value: 92,
      displayValue: '92%',
      description: '7日内有进展更新的任务占比',
      trend: 5,
      trendText: '↑ 5% vs 上周',
    },
  ];
}

// ============ 成员状态 ============

export function generateMemberStatus(): MemberTaskStatus[] {
  const members = [
    { id: 1, name: '张三' },
    { id: 2, name: '李四' },
    { id: 3, name: '王五' },
    { id: 4, name: '赵六' },
  ];

  return members.map((member) => {
    const inProgress = randomInt(2, 8);
    const completed = randomInt(8, 20);
    const delayed = randomInt(0, 3);
    const loadRate = randomInt(50, 120);
    const activity = randomInt(60, 100);
    const trend = randomInt(-5, 10);

    let status: 'healthy' | 'warning' | 'risk' | 'idle' = 'healthy';
    if (loadRate > 100) {
      status = 'warning';
    } else if (activity < 80) {
      status = 'warning';
    } else if (loadRate < 70) {
      status = 'idle';
    }

    return {
      id: member.id,
      name: member.name,
      inProgress,
      completed,
      delayed,
      loadRate,
      activity,
      trend,
      status,
    };
  });
}

// ============ 成员活跃度趋势 ============

export function generateMemberActivityTrends(): MemberActivityTrend[] {
  const dates = generatePastDates(7);
  return dates.map((date) => ({
    date,
    张三: randomInt(85, 100),
    李四: randomInt(70, 90),
    王五: randomInt(60, 85),
    赵六: randomInt(80, 95),
  }));
}

// ============ 调配建议 ============

export function generateTechManagerAllocationSuggestions(): AllocationSuggestion[] {
  return [
    {
      type: 'overload',
      memberId: 2,
      memberName: '李四',
      value: 115,
      valueLabel: '负载率',
      suggestion: '建议重新分配任务',
    },
    {
      type: 'idle',
      memberId: 4,
      memberName: '赵六',
      value: 60,
      valueLabel: '负载率',
      suggestion: '可承接更多任务',
    },
    {
      type: 'low_activity',
      memberId: 3,
      memberName: '王五',
      value: 70,
      valueLabel: '活跃度',
      suggestion: '7日未更新任务，需要提醒',
    },
  ];
}

// ============ 完整数据 ============

export function getTechManagerDashboardData(): TechManagerDashboardData {
  return {
    alerts: generateTechManagerAlerts(),
    metrics: generateTechManagerMetrics(),
    currentGroupId: 1,
    availableGroups: [
      { id: 1, name: '前端组' },
      { id: 2, name: '后端组' },
    ],
    memberStatus: generateMemberStatus(),
    trends: generateTaskTrends(),
    taskTypeDistribution: generateTaskTypeDistribution(),
    allocationSuggestions: generateTechManagerAllocationSuggestions(),
    memberActivityTrends: generateMemberActivityTrends(),
  };
}
