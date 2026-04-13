/**
 * 任务统计报表模拟数据
 */

import type { TaskStatisticsData, TaskStatisticItem, TaskStatus } from '../../types';

const TASK_TYPES = ['固件', '板卡', '驱动', '结构', '测试', '认证', '项目管理', '配置管理', '采购', '综合', '质量', '其他'];
const PRIORITIES: Array<'紧急' | '高' | '中' | '低'> = ['紧急', '高', '中', '低'];
const STATUSES: TaskStatus[] = ['not_started', 'in_progress', 'completed', 'delayed', 'pending_review', 'suspended'];
const PROJECTS = ['智能终端项目', '数据平台项目', '移动端优化项目', '安全审计项目'];
const MEMBERS = ['张三', '李四', '王五', '赵六', '钱七', '孙八'];

/** 生成任务级明细数据 */
const generateTaskDetails = (): TaskStatisticItem[] => {
  const tasks: TaskStatisticItem[] = [];
  let taskIndex = 1;

  for (let i = 0; i < 35; i++) {
    const projectIndex = Math.floor(i / 10);
    const projectName = PROJECTS[projectIndex % PROJECTS.length];
    const taskType = TASK_TYPES[Math.floor(Math.random() * TASK_TYPES.length)];
    const priority = PRIORITIES[Math.floor(Math.random() * PRIORITIES.length)];
    const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
    const assignee = MEMBERS[Math.floor(Math.random() * MEMBERS.length)];
    const progress = status === 'completed' ? 100 : Math.floor(Math.random() * 100);
    const activityRate = Math.floor(Math.random() * 40) + 60; // 60-100 之间
    const delayDays = status === 'delayed' ? Math.floor(Math.random() * 10) + 1 : 0;

    // 生成计划结束日期（过去7天到未来14天）
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + Math.floor(Math.random() * 21) - 7);
    const plannedEndDate = baseDate.toISOString().split('T')[0];

    tasks.push({
      id: `task-${taskIndex}`,
      taskName: `${taskType}-${projectIndex + 1}.${String(taskIndex).padStart(2, '0')}`,
      wbsCode: `1.${projectIndex + 1}.${taskIndex}`,
      projectName,
      taskType,
      priority,
      status,
      assigneeName: assignee,
      progress,
      activityRate,
      plannedEndDate,
      delayDays,
    });
    taskIndex++;
  }

  return tasks;
};

export const getMockTaskStatisticsData = (): TaskStatisticsData => ({
  stats: [
    { key: 'totalTasks', label: '任务总数', value: 156, trend: { value: 15, direction: 'up', isPositive: true } },
    { key: 'avgCompletionRate', label: '平均完成率', value: '72%', trend: { value: 5, direction: 'up', isPositive: true } },
    { key: 'delayRate', label: '延期率', value: '12%', trend: { value: 2, direction: 'up', isPositive: false } },
    { key: 'upcomingDelayCount', label: '一周即将延期', value: 8, trend: { value: 0, direction: 'stable', isPositive: true } },
  ],
  priorityChart: {
    labels: ['紧急', '高', '中', '低'],
    datasets: [{ label: '任务数量', values: [12, 35, 68, 41] }],
  },
  /** 任务状态分布（替代原负责人任务分布） */
  statusChart: {
    labels: ['未开始', '进行中', '已完成', '已延期', '待审核', '暂停'],
    values: [25, 42, 68, 15, 4, 2],
    percentages: [16.0, 26.9, 43.6, 9.6, 2.6, 1.3],
  },
  taskTypeChart: {
    labels: ['固件', '板卡', '驱动', '结构', '测试', '认证', '项目管理', '配置管理', '采购', '综合', '质量', '其他'],
    datasets: [{ label: '任务数量', values: [28, 22, 18, 15, 25, 8, 12, 10, 6, 5, 4, 3] }],
  },
  taskTrend: {
    labels: ['03-18', '03-25', '04-01', '04-08', '04-15'],
    datasets: [
      { label: '新增任务', values: [12, 8, 15, 10, 14], color: '#0EA5E9' },
      { label: '完成任务', values: [8, 10, 12, 15, 18], color: '#22C55E' },
      { label: '延期任务', values: [2, 1, 3, 2, 1], color: '#EF4444' },
    ],
  },
  /** 优先级完成率趋势（替代原负责人完成率变化） */
  priorityTrend: {
    labels: ['03-18', '03-25', '04-01', '04-08', '04-15'],
    datasets: [
      { label: '紧急', values: [45, 55, 62, 70, 78], color: '#EF4444' },
      { label: '高', values: [52, 60, 68, 75, 82], color: '#F97316' },
      { label: '中', values: [60, 65, 70, 72, 75], color: '#3B82F6' },
      { label: '低', values: [70, 72, 75, 78, 80], color: '#22C55E' },
    ],
  },
  taskTypeComparison: {
    labels: ['固件', '板卡', '驱动', '结构', '测试'],
    datasets: [
      { label: '完成率', values: [78, 82, 75, 68, 85], color: '#22C55E' },
      { label: '延期率', values: [8, 5, 12, 15, 6], color: '#EF4444' },
    ],
  },
  taskDetails: generateTaskDetails(),
});
