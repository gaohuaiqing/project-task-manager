/**
 * 成员任务分析模拟数据
 * 以成员维度为核心视角
 */

import type { MemberAnalysisData, MemberTaskItem, AllocationSuggestion, MemberCapabilitySummary } from '../../types';

/** 能力模型配置 */
const CAPABILITY_MODEL = {
  name: '技术能力评估模型',
  dimensions: [
    { name: '技术深度', maxScore: 100 },
    { name: '交付质量', maxScore: 100 },
    { name: '协作能力', maxScore: 100 },
    { name: '学习能力', maxScore: 100 },
  ],
};

/** 生成成员能力数据 */
const generateMemberCapabilities = (): Record<string, MemberCapabilitySummary> => ({
  '1': {
    memberId: '1',
    memberName: '张三',
    totalTasks: 18,
    completedTasks: 15,
    avgProgress: 83,
    avgEstimationAccuracy: 85,
    activityRate: 88,
    capability: {
      modelName: CAPABILITY_MODEL.name,
      dimensions: [
        { name: '技术深度', score: 85, maxScore: 100 },
        { name: '交付质量', score: 90, maxScore: 100 },
        { name: '协作能力', score: 78, maxScore: 100 },
        { name: '学习能力', score: 82, maxScore: 100 },
      ],
    },
  },
  '2': {
    memberId: '2',
    memberName: '李四',
    totalTasks: 15,
    completedTasks: 12,
    avgProgress: 80,
    avgEstimationAccuracy: 80,
    activityRate: 65,
    capability: {
      modelName: CAPABILITY_MODEL.name,
      dimensions: [
        { name: '技术深度', score: 78, maxScore: 100 },
        { name: '交付质量', score: 82, maxScore: 100 },
        { name: '协作能力', score: 85, maxScore: 100 },
        { name: '学习能力', score: 75, maxScore: 100 },
      ],
    },
  },
  '3': {
    memberId: '3',
    memberName: '王五',
    totalTasks: 22,
    completedTasks: 18,
    avgProgress: 82,
    avgEstimationAccuracy: 75,
    activityRate: 82,
    capability: {
      modelName: CAPABILITY_MODEL.name,
      dimensions: [
        { name: '技术深度', score: 92, maxScore: 100 },
        { name: '交付质量', score: 85, maxScore: 100 },
        { name: '协作能力', score: 88, maxScore: 100 },
        { name: '学习能力', score: 90, maxScore: 100 },
      ],
    },
  },
  '4': {
    memberId: '4',
    memberName: '赵六',
    totalTasks: 12,
    completedTasks: 8,
    avgProgress: 67,
    avgEstimationAccuracy: 72,
    activityRate: 67,
    capability: {
      modelName: CAPABILITY_MODEL.name,
      dimensions: [
        { name: '技术深度', score: 70, maxScore: 100 },
        { name: '交付质量', score: 68, maxScore: 100 },
        { name: '协作能力', score: 75, maxScore: 100 },
        { name: '学习能力', score: 72, maxScore: 100 },
      ],
    },
  },
  '5': {
    memberId: '5',
    memberName: '钱七',
    totalTasks: 16,
    completedTasks: 14,
    avgProgress: 88,
    avgEstimationAccuracy: 78,
    activityRate: 60,
    capability: {
      modelName: CAPABILITY_MODEL.name,
      dimensions: [
        { name: '技术深度', score: 80, maxScore: 100 },
        { name: '交付质量', score: 88, maxScore: 100 },
        { name: '协作能力', score: 65, maxScore: 100 },
        { name: '学习能力', score: 78, maxScore: 100 },
      ],
    },
  },
  '6': {
    memberId: '6',
    memberName: '孙八',
    totalTasks: 10,
    completedTasks: 6,
    avgProgress: 60,
    avgEstimationAccuracy: 65,
    activityRate: 50,
    capability: {
      modelName: CAPABILITY_MODEL.name,
      dimensions: [
        { name: '技术深度', score: 65, maxScore: 100 },
        { name: '交付质量', score: 70, maxScore: 100 },
        { name: '协作能力', score: 72, maxScore: 100 },
        { name: '学习能力', score: 68, maxScore: 100 },
      ],
    },
  },
});

/** 生成成员任务明细 */
const generateMemberTasks = (): MemberTaskItem[] => {
  const capabilities = generateMemberCapabilities();
  return [
    {
      memberId: '1',
      memberName: '张三',
      taskName: '固件版本适配',
      projectName: '智能终端项目',
      taskStatus: 'in_progress',
      progress: 75,
      fullTimeRatio: 80,
      activityRate: 88,
      plannedDuration: 10,
      actualDuration: 8,
      estimationAccuracy: 85,
      lastUpdated: '2026-04-17T10:30:00',
      capability: capabilities['1'].capability,
    },
    {
      memberId: '1',
      memberName: '张三',
      taskName: '驱动开发',
      projectName: '智能终端项目',
      taskStatus: 'in_progress',
      progress: 60,
      fullTimeRatio: 100,
      activityRate: 90,
      plannedDuration: 15,
      actualDuration: 12,
      estimationAccuracy: 80,
      lastUpdated: '2026-04-17T09:15:00',
    },
    {
      memberId: '2',
      memberName: '李四',
      taskName: '接口文档编写',
      projectName: '数据平台项目',
      taskStatus: 'completed',
      progress: 100,
      fullTimeRatio: 30,
      activityRate: 65,
      plannedDuration: 5,
      actualDuration: 4,
      estimationAccuracy: 90,
      lastUpdated: '2026-04-16T16:00:00',
      capability: capabilities['2'].capability,
    },
    {
      memberId: '2',
      memberName: '李四',
      taskName: '单元测试',
      projectName: '数据平台项目',
      taskStatus: 'in_progress',
      progress: 45,
      fullTimeRatio: 50,
      activityRate: 70,
      plannedDuration: 8,
      actualDuration: 6,
      estimationAccuracy: 75,
      lastUpdated: '2026-04-17T11:00:00',
    },
    {
      memberId: '3',
      memberName: '王五',
      taskName: '性能优化',
      projectName: '移动端优化项目',
      taskStatus: 'delayed',
      progress: 30,
      fullTimeRatio: 60,
      activityRate: 82,
      plannedDuration: 7,
      actualDuration: 10,
      estimationAccuracy: 43,
      lastUpdated: '2026-04-15T14:20:00',
      capability: capabilities['3'].capability,
    },
    {
      memberId: '3',
      memberName: '王五',
      taskName: '代码审查',
      projectName: '移动端优化项目',
      taskStatus: 'pending_review',
      progress: 100,
      fullTimeRatio: 20,
      activityRate: 95,
      plannedDuration: 3,
      actualDuration: 3,
      estimationAccuracy: 100,
      lastUpdated: '2026-04-17T08:00:00',
    },
    {
      memberId: '4',
      memberName: '赵六',
      taskName: '安全审计',
      projectName: '数据平台项目',
      taskStatus: 'in_progress',
      progress: 55,
      fullTimeRatio: 70,
      activityRate: 67,
      plannedDuration: 12,
      actualDuration: 8,
      estimationAccuracy: 67,
      lastUpdated: '2026-04-17T09:00:00',
      capability: capabilities['4'].capability,
    },
    {
      memberId: '5',
      memberName: '钱七',
      taskName: '数据库优化',
      projectName: '智能终端项目',
      taskStatus: 'in_progress',
      progress: 70,
      fullTimeRatio: 40,
      activityRate: 60,
      plannedDuration: 6,
      actualDuration: 5,
      estimationAccuracy: 83,
      lastUpdated: '2026-04-16T15:00:00',
      capability: capabilities['5'].capability,
    },
    {
      memberId: '6',
      memberName: '孙八',
      taskName: 'UI适配',
      projectName: '移动端优化项目',
      taskStatus: 'in_progress',
      progress: 40,
      fullTimeRatio: 50,
      activityRate: 50,
      plannedDuration: 10,
      actualDuration: 8,
      estimationAccuracy: 80,
      lastUpdated: '2026-04-14T11:00:00',
      capability: capabilities['6'].capability,
    },
  ];
};

export const getMockMemberAnalysisData = (): MemberAnalysisData => {
  const capabilities = generateMemberCapabilities();

  return {
    stats: [
      { key: 'avgWorkload', label: '平均任务负载', value: 3.2, trend: { value: 0.3, direction: 'up', isPositive: false } },
      { key: 'avgFullTimeRatio', label: '平均全职比', value: '85%', trend: { value: 5, direction: 'up', isPositive: false } },
      { key: 'avgCompletionRate', label: '平均完成率', value: '72%', trend: { value: 8, direction: 'up', isPositive: true } },
      { key: 'activityRate', label: '成员活跃度', value: '78%', trend: { value: 3, direction: 'up', isPositive: true } },
    ],
    workloadChart: {
      labels: ['张三', '李四', '王五', '赵六', '钱七', '孙八'],
      datasets: [
        { label: '未开始', values: [2, 3, 1, 0, 2, 1], color: '#94A3B8' },
        { label: '进行中', values: [5, 4, 6, 3, 4, 2], color: '#3B82F6' },
        { label: '已完成', values: [12, 8, 15, 9, 10, 7], color: '#22C55E' },
        { label: '延期', values: [1, 2, 1, 0, 2, 0], color: '#EF4444' },
      ],
    },
    taskStatusChart: {
      labels: ['未开始', '进行中', '已完成', '延期', '待审核'],
      values: [25, 45, 78, 12, 8],
      percentages: [14.7, 26.5, 45.9, 7.1, 4.7],
    },
    estimationChart: {
      labels: ['精准(≥90%)', '轻微偏差', '明显偏差', '严重偏差(<50%)'],
      datasets: [{ label: '任务数量', values: [45, 32, 18, 12] }],
    },
    workloadTrend: {
      labels: ['03-18', '03-25', '04-01', '04-08', '04-15'],
      datasets: [
        { label: '张三', values: [2.5, 2.8, 3.0, 3.2, 3.5], color: '#0EA5E9' },
        { label: '李四', values: [2.0, 2.2, 2.5, 2.8, 3.0], color: '#22C55E' },
        { label: '王五', values: [3.0, 3.2, 3.5, 3.8, 4.0], color: '#F97316' },
      ],
    },
    // 新增：任务完成趋势
    completionTrend: {
      labels: ['03-18', '03-25', '04-01', '04-08', '04-15'],
      datasets: [
        { label: '张三', values: [3, 4, 5, 4, 6], color: '#0EA5E9' },
        { label: '李四', values: [2, 3, 3, 4, 3], color: '#22C55E' },
        { label: '王五', values: [4, 5, 6, 5, 7], color: '#F97316' },
        { label: '赵六', values: [1, 2, 2, 3, 2], color: '#8B5CF6' },
      ],
    },
    // 新增：预估准确性变化趋势
    estimationTrend: {
      labels: ['03-18', '03-25', '04-01', '04-08', '04-15'],
      datasets: [
        { label: '张三', values: [82, 84, 85, 83, 85], color: '#0EA5E9' },
        { label: '李四', values: [78, 80, 82, 80, 80], color: '#22C55E' },
        { label: '王五', values: [70, 72, 75, 73, 75], color: '#F97316' },
        { label: '赵六', values: [68, 70, 72, 71, 72], color: '#8B5CF6' },
      ],
    },
    memberTasks: generateMemberTasks(),
    // 新增：成员能力概览
    memberCapabilities: Object.values(capabilities),
    /** 任务分配建议 — 聚焦负载调整和任务分摊 */
    allocationSuggestions: [
      { type: 'overload', memberName: '王五', currentValue: 4.0, threshold: 3.2, suggestion: '任务负载过重，建议将部分任务分给其他成员' },
      { type: 'idle', memberName: '孙八', currentValue: 1.5, threshold: 1.92, suggestion: '任务量较少，可承接更多任务' },
      { type: 'low_activity', memberName: '钱七', currentValue: 55, threshold: 60, suggestion: '活跃度偏低，需了解工作状态，考虑调整任务类型' },
    ],
  };
};
