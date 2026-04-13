/**
 * Admin 仪表板模拟数据
 *
 * @module analytics/dashboard/data/mock/admin.mock
 */

import type {
  AdminDashboardData,
  AlertData,
  DepartmentEfficiency,
  AllocationSuggestion,
  HighRiskProject,
  DepartmentDelayTrend,
  UtilizationTrend,
} from '../../types';
import type { StatsCardMetric, TrendDataPoint, PieChartDataItem } from '../../../shared/types';
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

// ============ Admin 预警数据 ============

export function generateAdminAlerts(): AlertData[] {
  return [
    {
      type: 'delay_warning',
      count: 12,
      label: '延期预警',
      trend: 3,
      color: 'warning',
      actionLabel: '查看详情',
      actionPath: '/tasks?status=delay_warning',
    },
    {
      type: 'overdue',
      count: 8,
      label: '已延期',
      trend: -2,
      color: 'danger',
      actionLabel: '查看详情',
      actionPath: '/tasks?status=overdue',
    },
    {
      type: 'pending_approval',
      count: 5,
      label: '待审批',
      trend: 1,
      color: 'info',
      actionLabel: '查看详情',
      actionPath: '/tasks?status=pending_approval',
    },
    {
      type: 'high_risk',
      count: 3,
      label: '高风险项目',
      trend: 0,
      color: 'danger',
      actionLabel: '查看详情',
      actionPath: '/projects?risk=high',
    },
  ];
}

// ============ 高风险项目 ============

export function generateHighRiskProjects(): HighRiskProject[] {
  return [
    {
      id: '1',
      name: '智能数据分析平台',
      riskFactors: ['延期率过高', '资源不足', '关键任务阻塞'],
      completionRate: 45,
      delayedTasks: 12,
      manager: '张经理',
    },
    {
      id: '2',
      name: '移动端适配项目',
      riskFactors: ['进度落后', '人员变动'],
      completionRate: 62,
      delayedTasks: 8,
      manager: '李经理',
    },
    {
      id: '3',
      name: '第三方集成项目',
      riskFactors: ['需求变更频繁', '技术风险'],
      completionRate: 38,
      delayedTasks: 6,
      manager: '王经理',
    },
  ];
}

// ============ 核心指标 ============

export function generateAdminMetrics(): StatsCardMetric[] {
  return [
    {
      label: '项目总数',
      value: 128,
      displayValue: '128',
      description: '当前系统中所有项目的总数量',
      trend: 5,
      trendText: '↑ 5% vs 上周',
    },
    {
      label: '任务总数',
      value: 1847,
      displayValue: '1,847',
      description: '所有项目中的任务总数量',
      trend: 12,
      trendText: '↑ 12% vs 上周',
    },
    {
      label: '完成率',
      value: 68,
      displayValue: '68%',
      description: '已完成任务占总任务的百分比',
      trend: 5,
      trendText: '↑ 5% vs 上周',
    },
    {
      label: '延期率',
      value: 12,
      displayValue: '12%',
      description: '延期任务占总任务的百分比',
      trend: -3,
      trendText: '↓ 3% vs 上周',
    },
    {
      label: '总人数',
      value: 156,
      displayValue: '156',
      description: '系统中注册的用户总数',
      trend: 2,
      trendText: '↑ 2 vs 上周',
    },
    {
      label: '资源利用率',
      value: 85,
      displayValue: '85%',
      description: '成员平均工作负荷比率',
      trend: 2,
      trendText: '↑ 2% vs 上周',
    },
    {
      label: '里程碑达成',
      value: 72,
      displayValue: '72%',
      description: '按计划完成的里程碑占比',
      trend: -5,
      trendText: '↓ 5% vs 上周',
    },
    {
      label: '本周到期',
      value: 45,
      displayValue: '45',
      description: '本周内需要完成的任务数量',
      trend: 8,
      trendText: '↑ 8 vs 上周',
    },
  ];
}

// ============ 部门效能 ============

export function generateDepartmentEfficiency(): DepartmentEfficiency[] {
  const departments = [
    { id: 1, name: '研发一部' },
    { id: 2, name: '研发二部' },
    { id: 3, name: '测试部' },
    { id: 4, name: '产品部' },
  ];

  return departments.map((dept) => {
    const completionRate = randomPercent(50, 95);
    const delayRate = randomPercent(5, 25);
    const utilizationRate = randomPercent(60, 110);
    const activity = randomPercent(60, 100);
    const trend = randomInt(-10, 15);

    let status: 'healthy' | 'warning' | 'risk' = 'healthy';
    if (completionRate < 60 || delayRate > 20 || utilizationRate > 110) {
      status = 'risk';
    } else if (completionRate < 80 || delayRate > 10 || activity < 80) {
      status = 'warning';
    }

    return {
      id: dept.id,
      name: dept.name,
      completionRate,
      delayRate,
      utilizationRate,
      activity,
      trend,
      status,
    };
  });
}

// ============ 趋势数据 ============

export function generateDepartmentDelayTrends(): DepartmentDelayTrend[] {
  const dates = generatePastDates(30);
  return dates.map((date) => ({
    date,
    研发一部: randomInt(5, 20),
    研发二部: randomInt(8, 25),
    测试部: randomInt(3, 15),
    产品部: randomInt(6, 18),
  }));
}

export function generateUtilizationTrends(): UtilizationTrend[] {
  const dates = generatePastDates(30);
  return dates.map((date) => ({
    date,
    utilization: randomInt(70, 95),
    target: 85,
  }));
}

// ============ 调配建议 ============

export function generateAdminAllocationSuggestions(): AllocationSuggestion[] {
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

export function getAdminDashboardData(): AdminDashboardData {
  return {
    alerts: generateAdminAlerts(),
    metrics: generateAdminMetrics(),
    departmentEfficiency: generateDepartmentEfficiency(),
    trends: generateTaskTrends(),
    taskTypeDistribution: generateTaskTypeDistribution(),
    allocationSuggestions: generateAdminAllocationSuggestions(),
    departmentDelayTrends: generateDepartmentDelayTrends(),
    utilizationTrends: generateUtilizationTrends(),
    highRiskProjects: generateHighRiskProjects(),
  };
}
