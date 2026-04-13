/**
 * 项目进度报表模拟数据
 */

import type { ProjectProgressData, MilestoneItem } from '../../types';

// 生成里程碑数据
const generateMilestones = (): MilestoneItem[] => [
  { id: '1', name: '需求评审完成', projectName: '智能终端项目', targetDate: '2026-04-15', completionPercentage: 100, status: 'completed', daysToTarget: -3 },
  { id: '2', name: '原型设计完成', projectName: '智能终端项目', targetDate: '2026-04-20', completionPercentage: 85, status: 'in_progress', daysToTarget: 2 },
  { id: '3', name: '开发阶段一', projectName: '智能终端项目', targetDate: '2026-05-01', completionPercentage: 30, status: 'in_progress', daysToTarget: 13 },
  { id: '4', name: '测试阶段', projectName: '数据平台项目', targetDate: '2026-04-10', completionPercentage: 100, status: 'completed', daysToTarget: -8 },
  { id: '5', name: 'UAT验收', projectName: '数据平台项目', targetDate: '2026-04-25', completionPercentage: 0, status: 'pending', daysToTarget: 7 },
  { id: '6', name: '项目上线', projectName: '数据平台项目', targetDate: '2026-04-30', completionPercentage: 0, status: 'pending', daysToTarget: 12 },
  { id: '7', name: '需求确认', projectName: '移动端优化项目', targetDate: '2026-04-08', completionPercentage: 100, status: 'overdue', daysToTarget: -10 },
  { id: '8', name: '开发完成', projectName: '移动端优化项目', targetDate: '2026-04-18', completionPercentage: 60, status: 'in_progress', daysToTarget: 0 },
];

export const getMockProjectProgressData = (): ProjectProgressData => ({
  stats: [
    { key: 'totalProjects', label: '项目总数', value: 12, trend: { value: 2, direction: 'up', isPositive: true } },
    { key: 'totalTasks', label: '任务总数', value: 156, trend: { value: 15, direction: 'up', isPositive: true } },
    { key: 'completionRate', label: '完成率', value: '68%', trend: { value: 5, direction: 'up', isPositive: true } },
    { key: 'delayRate', label: '延期率', value: '12%', trend: { value: 3, direction: 'up', isPositive: false } },
  ],
  taskStatusChart: {
    labels: ['未开始', '进行中', '已完成', '已延期', '待审核', '暂停'],
    values: [25, 45, 78, 12, 8, 5],
    percentages: [14.7, 26.5, 45.9, 7.1, 4.7, 2.9],
  },
  milestoneChart: {
    labels: ['已完成', '进行中', '待处理', '已逾期'],
    datasets: [{ label: '里程碑', values: [4, 3, 2, 1] }],
  },
  progressTrend: {
    labels: ['03-18', '03-25', '04-01', '04-08', '04-15'],
    datasets: [
      { label: '完成率', values: [45, 52, 58, 63, 68], color: '#0EA5E9' },
      { label: '计划进度', values: [50, 55, 60, 65, 70], color: '#22C55E' },
    ],
  },
  progressSpeedChart: {
    labels: ['03-18', '03-25', '04-01', '04-08', '04-15'],
    datasets: [
      { label: '每周进度增量', values: [7, 6, 6, 5, 5], color: '#0EA5E9' },
    ],
  },
  milestones: generateMilestones(),
});
