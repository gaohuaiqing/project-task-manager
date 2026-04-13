/**
 * 部门经理仪表板模拟数据
 *
 * @module analytics/dashboard/data/mock/deptManager.mock
 */

import type {
  DeptManagerDashboardData,
  AlertData,
  GroupEfficiency,
  MemberTaskStatus,
  AllocationSuggestion,
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

// ============ 预警数据 ============

export function generateDeptManagerAlerts(): AlertData[] {
  return [
    {
      type: 'delay_warning',
      count: 5,
      label: '延期预警',
      trend: 1,
      color: 'warning',
      actionLabel: '查看详情',
      actionPath: '/tasks?status=delay_warning',
    },
    {
      type: 'overdue',
      count: 3,
      label: '已延期',
      trend: -1,
      color: 'danger',
      actionLabel: '查看详情',
      actionPath: '/tasks?status=overdue',
    },
    {
      type: 'pending_approval',
      count: 2,
      label: '待我审批',
      trend: 0,
      color: 'info',
      actionLabel: '查看详情',
      actionPath: '/tasks?status=pending_approval',
    },
  ];
}

// ============ 核心指标 ============

export function generateDeptManagerMetrics(): StatsCardMetric[] {
  return [
    {
      label: '部门项目',
      value: 32,
      displayValue: '32',
      description: '本部门负责的项目总数',
      trend: 2,
      trendText: '↑ 2 vs 上周',
    },
    {
      label: '部门任务',
      value: 487,
      displayValue: '487',
      description: '本部门所有项目中的任务总数',
      trend: 15,
      trendText: '↑ 15% vs 上周',
    },
    {
      label: '完成率',
      value: 72,
      displayValue: '72%',
      description: '本部门已完成任务占比',
      trend: 3,
      trendText: '↑ 3% vs 上周',
    },
    {
      label: '延期率',
      value: 8,
      displayValue: '8%',
      description: '本部门延期任务占比',
      trend: -2,
      trendText: '↓ 2% vs 上周',
    },
    {
      label: '部门人数',
      value: 28,
      displayValue: '28',
      description: '本部门当前的成员总数',
      trend: 0,
      trendText: '→ 0 vs 上周',
    },
    {
      label: '资源利用率',
      value: 88,
      displayValue: '88%',
      description: '本部门成员平均工作负荷',
      trend: 2,
      trendText: '↑ 2% vs 上周',
    },
    {
      label: '本周到期',
      value: 15,
      displayValue: '15',
      description: '本周内需要完成的任务数量',
      trend: 3,
      trendText: '↑ 3 vs 上周',
    },
    {
      label: '活跃度',
      value: 85,
      displayValue: '85%',
      description: '7日内有进展更新的任务占比',
      trend: 5,
      trendText: '↑ 5% vs 上周',
    },
  ];
}

// ============ 组效能 ============

export function generateGroupEfficiency(): GroupEfficiency[] {
  const groups = [
    { id: 1, name: '前端组' },
    { id: 2, name: '后端组' },
    { id: 3, name: '测试组' },
  ];

  return groups.map((group) => {
    const completionRate = randomPercent(60, 95);
    const delayRate = randomPercent(3, 20);
    const loadRate = randomPercent(70, 115);
    const activity = randomPercent(65, 100);
    const memberCount = randomInt(5, 12);
    const trend = randomInt(-8, 12);

    let status: 'healthy' | 'warning' | 'risk' = 'healthy';
    if (completionRate < 60 || delayRate > 20 || loadRate > 110) {
      status = 'risk';
    } else if (completionRate < 80 || delayRate > 10 || activity < 80) {
      status = 'warning';
    }

    return {
      id: group.id,
      name: group.name,
      completionRate,
      delayRate,
      loadRate,
      activity,
      memberCount,
      trend,
      status,
    };
  });
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

// ============ 调配建议 ============

export function generateDeptManagerAllocationSuggestions(): AllocationSuggestion[] {
  return [
    {
      type: 'overload',
      memberId: 1,
      memberName: '张三',
      value: 120,
      valueLabel: '负载率',
      suggestion: '建议重新分配任务',
    },
    {
      type: 'idle',
      memberId: 2,
      memberName: '李四',
      value: 45,
      valueLabel: '负载率',
      suggestion: '可承接更多任务',
    },
    {
      type: 'low_activity',
      memberId: 3,
      memberName: '王五',
      value: 60,
      valueLabel: '活跃度',
      suggestion: '需要关注进展更新',
    },
  ];
}

// ============ 完整数据 ============

export function getDeptManagerDashboardData(): DeptManagerDashboardData {
  return {
    alerts: generateDeptManagerAlerts(),
    metrics: generateDeptManagerMetrics(),
    groupEfficiency: generateGroupEfficiency(),
    memberStatus: generateMemberStatus(),
    trends: generateTaskTrends(),
    taskTypeDistribution: generateTaskTypeDistribution(),
    allocationSuggestions: generateDeptManagerAllocationSuggestions(),
  };
}
