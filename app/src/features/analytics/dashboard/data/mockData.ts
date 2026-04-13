/**
 * 仪表板模拟数据服务
 * 用于开发阶段验证UI展示
 *
 * @module analytics/dashboard/data/mockData
 * @see REQ_07a_dashboard.md
 */

import type {
  AdminDashboardData,
  DeptManagerDashboardData,
  TechManagerDashboardData,
  EngineerDashboardData,
  AlertData,
  DepartmentEfficiency,
  GroupEfficiency,
  MemberTaskStatus,
  AllocationSuggestion,
  HighRiskProject,
  TodoTask,
  ProjectProgress,
  DepartmentDelayTrend,
  UtilizationTrend,
  MemberActivityTrend,
} from '../types';
import type { StatsCardMetric, TrendDataPoint, PieChartDataItem } from '../../shared/types';

// ============ 工具函数 ============

/**
 * 生成随机整数
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 生成随机百分比
 */
function randomPercent(min: number = 0, max: number = 100): number {
  return randomInt(min, max);
}

/**
 * 生成过去N天的日期数组
 */
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

// ============ Admin 模拟数据 ============

/**
 * 生成Admin预警数据
 */
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
  ];
}

/**
 * 生成高风险项目数据
 */
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

/**
 * 生成Admin核心指标
 */
export function generateAdminMetrics(): StatsCardMetric[] {
  return [
    {
      label: '项目总数',
      value: 128,
      displayValue: '128',
      description: '当前系统中所有项目的总数量，包括进行中、已完成和已归档的项目。',
      trend: 5,
      trendText: '↑ 5% vs 上周',
    },
    {
      label: '任务总数',
      value: 1847,
      displayValue: '1,847',
      description: '当前所有项目中的任务总数量，包括未开始、进行中、已完成和延期的任务。',
      trend: 12,
      trendText: '↑ 12% vs 上周',
    },
    {
      label: '完成率',
      value: 68,
      displayValue: '68%',
      description: '已完成任务数占总任务数的百分比，反映整体任务完成进度。',
      trend: 5,
      trendText: '↑ 5% vs 上周',
    },
    {
      label: '延期率',
      value: 12,
      displayValue: '12%',
      description: '超过计划截止日期的任务数占总任务数的百分比，延期率越低越好。',
      trend: -3,
      trendText: '↓ 3% vs 上周',
    },
    {
      label: '总人数',
      value: 156,
      displayValue: '156',
      description: '系统中注册的用户总数，包括所有部门和技术组的成员。',
      trend: 2,
      trendText: '↑ 2 vs 上周',
    },
    {
      label: '资源利用率',
      value: 85,
      displayValue: '85%',
      description: '成员实际工作负荷与标准工作量的比率，80%-100%为理想范围。',
      trend: 2,
      trendText: '↑ 2% vs 上周',
    },
    {
      label: '里程碑达成',
      value: 72,
      displayValue: '72%',
      description: '按计划完成的里程碑数占总里程碑数的百分比，反映项目整体进度健康度。',
      trend: -5,
      trendText: '↓ 5% vs 上周',
    },
    {
      label: '本周到期',
      value: 45,
      displayValue: '45',
      description: '本周内需要完成的任务数量，包括即将到期和已经逾期的任务。',
      trend: 8,
      trendText: '↑ 8 vs 上周',
    },
  ];
}

/**
 * 生成部门效能数据
 */
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

/**
 * 生成部门延期率趋势
 */
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

/**
 * 生成资源利用率趋势
 */
export function generateUtilizationTrends(): UtilizationTrend[] {
  const dates = generatePastDates(30);
  return dates.map((date) => ({
    date,
    utilization: randomInt(70, 95),
    target: 85,
  }));
}

/**
 * 生成资源调配建议
 */
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

/**
 * 生成Admin仪表板完整数据
 */
export function generateAdminDashboardData(): AdminDashboardData {
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

// ============ DeptManager 模拟数据 ============

/**
 * 生成部门经理预警数据
 */
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

/**
 * 生成部门经理核心指标
 */
export function generateDeptManagerMetrics(): StatsCardMetric[] {
  return [
    {
      label: '部门项目',
      value: 32,
      displayValue: '32',
      description: '本部门负责的项目总数，包括进行中和已完成的项目。',
      trend: 2,
      trendText: '↑ 2 vs 上周',
    },
    {
      label: '部门任务',
      value: 487,
      displayValue: '487',
      description: '本部门所有项目中的任务总数，包括各状态的全部任务。',
      trend: 15,
      trendText: '↑ 15% vs 上周',
    },
    {
      label: '完成率',
      value: 72,
      displayValue: '72%',
      description: '本部门已完成任务数占部门总任务数的百分比。',
      trend: 3,
      trendText: '↑ 3% vs 上周',
    },
    {
      label: '延期率',
      value: 8,
      displayValue: '8%',
      description: '本部门延期任务数占部门总任务数的百分比，延期率越低越好。',
      trend: -2,
      trendText: '↓ 2% vs 上周',
    },
    {
      label: '部门人数',
      value: 28,
      displayValue: '28',
      description: '本部门当前的成员总数，包括所有技术组的人员。',
      trend: 0,
      trendText: '→ 0 vs 上周',
    },
    {
      label: '资源利用率',
      value: 88,
      displayValue: '88%',
      description: '本部门成员的平均工作负荷比率，80%-100%为理想范围。',
      trend: 2,
      trendText: '↑ 2% vs 上周',
    },
    {
      label: '本周到期',
      value: 15,
      displayValue: '15',
      description: '本部门本周内需要完成的任务数量。',
      trend: 3,
      trendText: '↑ 3 vs 上周',
    },
    {
      label: '活跃度',
      value: 85,
      displayValue: '85%',
      description: '本部门7日内有进展更新的任务数占总任务数的百分比，反映团队工作活跃程度。',
      trend: 5,
      trendText: '↑ 5% vs 上周',
    },
  ];
}

/**
 * 生成组效能数据
 */
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

/**
 * 生成组活跃度趋势
 */
export function generateGroupActivityTrends(): Record<string, number>[] {
  const dates = generatePastDates(7);
  return dates.map((date) => ({
    date,
    前端组: randomInt(75, 95),
    后端组: randomInt(70, 90),
    测试组: randomInt(80, 98),
  }));
}

/**
 * 生成人员调配建议
 */
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

/**
 * 生成部门经理仪表板完整数据
 */
export function generateDeptManagerDashboardData(): DeptManagerDashboardData {
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

// ============ TechManager 模拟数据 ============

/**
 * 生成技术经理预警数据
 */
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

/**
 * 生成技术经理核心指标
 */
export function generateTechManagerMetrics(): StatsCardMetric[] {
  return [
    {
      label: '组内项目',
      value: 8,
      displayValue: '8',
      description: '当前技术组负责参与的所有项目数量，包括主导和协作的项目。',
      trend: 1,
      trendText: '↑ 1 vs 上周',
    },
    {
      label: '组内任务',
      value: 127,
      displayValue: '127',
      description: '组内所有成员的任务总数，涵盖各项目下分配给本组的任务。',
      trend: 8,
      trendText: '↑ 8% vs 上周',
    },
    {
      label: '完成率',
      value: 78,
      displayValue: '78%',
      description: '组内已完成任务占总任务数的比例，反映整体交付进度。',
      trend: 2,
      trendText: '↑ 2% vs 上周',
    },
    {
      label: '延期率',
      value: 6,
      displayValue: '6%',
      description: '超过计划截止日期的任务占比，越低表示进度控制越好。',
      trend: -1,
      trendText: '↓ 1% vs 上周',
    },
    {
      label: '组内人数',
      value: 10,
      displayValue: '10',
      description: '当前技术组的成员总数，可用于评估资源规模。',
      trend: 0,
      trendText: '→ 0 vs 上周',
    },
    {
      label: '平均负载',
      value: 85,
      displayValue: '85%',
      description: '组内成员的平均任务负载率，按全职比(FTE)计算，超过100%表示过载。',
      trend: 3,
      trendText: '↑ 3% vs 上周',
    },
    {
      label: '本周到期',
      value: 12,
      displayValue: '12',
      description: '本周内需要完成的任务数量，需重点关注确保按时交付。',
      trend: 2,
      trendText: '↑ 2 vs 上周',
    },
    {
      label: '活跃度',
      value: 92,
      displayValue: '92%',
      description: '7日内有进展更新的任务占比，反映团队工作积极性。',
      trend: 5,
      trendText: '↑ 5% vs 上周',
    },
  ];
}

/**
 * 生成成员任务状态
 */
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
      status = 'warning'; // 过载
    } else if (activity < 80) {
      status = 'warning'; // 低活跃
    } else if (loadRate < 70) {
      status = 'idle'; // 空闲
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

/**
 * 生成成员活跃度趋势
 */
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

/**
 * 生成任务分配建议
 */
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

/**
 * 生成技术经理仪表板完整数据
 */
export function generateTechManagerDashboardData(): TechManagerDashboardData {
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

// ============ Engineer 模拟数据 ============

/**
 * 生成工程师预警数据
 */
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

/**
 * 生成工程师核心指标
 */
export function generateEngineerMetrics(): StatsCardMetric[] {
  return [
    {
      label: '参与项目',
      value: 3,
      displayValue: '3',
      description: '当前参与的项目数量，包含所有分配到任务的项目。',
      trend: 0,
      trendText: '→ 0 vs 上周',
    },
    {
      label: '进行中',
      value: 5,
      displayValue: '5',
      description: '当前正在进行中的任务数量，需要持续跟进和更新进度。',
      trend: 2,
      trendText: '↑ 2 vs 上周',
    },
    {
      label: '已完成',
      value: 12,
      displayValue: '12',
      description: '已完成并关闭的任务数量，代表个人产出成果。',
      trend: 15,
      trendText: '↑ 15% vs 上周',
    },
    {
      label: '待开始',
      value: 3,
      displayValue: '3',
      description: '已分配但尚未开始的任务数量，建议提前了解任务内容。',
      trend: -1,
      trendText: '↓ 1 vs 上周',
    },
  ];
}

/**
 * 生成待办任务
 */
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

/**
 * 生成需要更新的任务
 */
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

/**
 * 生成任务状态分布
 */
export function generateTaskStatusDistribution(): PieChartDataItem[] {
  return [
    { name: '进行中', value: 5, color: '#0EA5E9' },
    { name: '已完成', value: 12, color: '#10B981' },
    { name: '待开始', value: 3, color: '#94A3B8' },
  ];
}

/**
 * 生成参与项目进度
 */
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

/**
 * 生成工程师仪表板完整数据
 */
export function generateEngineerDashboardData(): EngineerDashboardData {
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

// ============ 通用数据 ============

/**
 * 生成任务趋势数据
 */
export function generateTaskTrends(): TrendDataPoint[] {
  const dates = generatePastDates(30);
  return dates.map((date) => ({
    date,
    created: randomInt(0, 5),
    completed: randomInt(0, 4),
    delayed: randomInt(0, 2),
  }));
}

/**
 * 生成任务类型分布
 * 基于 FINAL_REQUIREMENTS §2.2.5 定义的12种任务类型
 * 使用分组色系：硬件开发(蓝) / 物料管理(绿) / 设计管理(橙) / 综合职能(紫)
 */
export function generateTaskTypeDistribution(): PieChartDataItem[] {
  return [
    // 硬件开发组 - 蓝色系
    { name: '固件', value: 35, color: '#2563EB' },
    { name: '板卡', value: 28, color: '#3B82F6' },
    { name: '驱动', value: 22, color: '#60A5FA' },
    { name: '接口类', value: 18, color: '#93C5FD' },
    { name: '硬件恢复包', value: 12, color: '#BFDBFE' },
    // 物料管理组 - 绿色系
    { name: '物料导入', value: 8, color: '#059669' },
    { name: '物料改代', value: 10, color: '#34D399' },
    // 设计管理组 - 橙色系
    { name: '系统设计', value: 15, color: '#EA580C' },
    { name: '核心风险', value: 6, color: '#FB923C' },
    // 综合职能组 - 紫色系
    { name: '接口人', value: 4, color: '#7C3AED' },
    { name: '职能任务', value: 9, color: '#A78BFA' },
    { name: '其它', value: 5, color: '#C4B5FD' },
  ];
}

// ============ 导出 ============

export const mockDashboardData = {
  // Admin
  generateAdminDashboardData,
  generateAdminAlerts,
  generateAdminMetrics,
  generateDepartmentEfficiency,
  generateHighRiskProjects,
  generateDepartmentDelayTrends,
  generateUtilizationTrends,
  generateAdminAllocationSuggestions,

  // DeptManager
  generateDeptManagerDashboardData,
  generateDeptManagerAlerts,
  generateDeptManagerMetrics,
  generateGroupEfficiency,
  generateGroupActivityTrends,
  generateDeptManagerAllocationSuggestions,

  // TechManager
  generateTechManagerDashboardData,
  generateTechManagerAlerts,
  generateTechManagerMetrics,
  generateMemberStatus,
  generateMemberActivityTrends,
  generateTechManagerAllocationSuggestions,

  // Engineer
  generateEngineerDashboardData,
  generateEngineerAlerts,
  generateEngineerMetrics,
  generateTodoTasks,
  generateNeedUpdateTasks,
  generateTaskStatusDistribution,
  generateProjectProgress,

  // 通用
  generateTaskTrends,
  generateTaskTypeDistribution,
};
