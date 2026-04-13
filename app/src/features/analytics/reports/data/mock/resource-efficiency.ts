/**
 * 资源效能分析模拟数据
 * 聚焦效能改进建议
 */

import type { ResourceEfficiencyData, MemberEfficiencyItem, EfficiencySuggestion } from '../../types';

const generateMemberEfficiency = (): MemberEfficiencyItem[] => [
  { memberName: '张三', department: '研发部', team: '固件组', completedTasks: 15, productivity: 1.5, estimationAccuracy: 85, reworkRate: 5, activityRate: 85, efficiencyLevel: 'high' },
  { memberName: '李四', department: '研发部', team: '驱动组', completedTasks: 12, productivity: 1.2, estimationAccuracy: 80, reworkRate: 8, activityRate: 72, efficiencyLevel: 'medium' },
  { memberName: '王五', department: '研发部', team: '平台组', completedTasks: 18, productivity: 1.8, estimationAccuracy: 75, reworkRate: 12, activityRate: 55, efficiencyLevel: 'medium' },
  { memberName: '赵六', department: '测试部', team: '测试组', completedTasks: 8, productivity: 0.9, estimationAccuracy: 90, reworkRate: 3, activityRate: 90, efficiencyLevel: 'high' },
  { memberName: '钱七', department: '研发部', team: '安全组', completedTasks: 10, productivity: 1.0, estimationAccuracy: 70, reworkRate: 15, activityRate: 60, efficiencyLevel: 'low' },
  { memberName: '孙八', department: '测试部', team: '测试组', completedTasks: 6, productivity: 0.7, estimationAccuracy: 65, reworkRate: 20, activityRate: 50, efficiencyLevel: 'low' },
];

export const getMockResourceEfficiencyData = (): ResourceEfficiencyData => ({
  stats: [
    { key: 'avgProductivity', label: '平均产能', value: 1.2, trend: { value: 0.1, direction: 'up', isPositive: true } },
    { key: 'avgEstimationAccuracy', label: '预估准确性', value: '78%', trend: { value: 3, direction: 'up', isPositive: true } },
    { key: 'avgReworkRate', label: '平均返工率', value: '10%', trend: { value: 2, direction: 'down', isPositive: true } },
    { key: 'activityRate', label: '成员活跃度', value: '72%', trend: { value: 5, direction: 'up', isPositive: true } },
  ],
  productivityChart: {
    labels: ['张三', '王五', '李四', '钱七', '赵六', '孙八'],
    datasets: [{ label: '产能', values: [1.5, 1.8, 1.2, 1.0, 0.9, 0.7] }],
  },
  efficiencyChart: {
    points: [
      { id: '1', label: '张三', x: 1.5, y: 85, size: 15 },
      { id: '2', label: '李四', x: 1.2, y: 80, size: 12 },
      { id: '3', label: '王五', x: 1.8, y: 75, size: 18 },
      { id: '4', label: '赵六', x: 0.9, y: 90, size: 8 },
      { id: '5', label: '钱七', x: 1.0, y: 70, size: 10 },
      { id: '6', label: '孙八', x: 0.7, y: 65, size: 6 },
    ],
    xAxis: { label: '产能', min: 0, max: 2.5 },
    yAxis: { label: '预估准确性(%)', min: 0, max: 100 },
    quadrantLines: { x: 1.2, y: 78 },
  },
  productivityTrend: {
    labels: ['03-18', '03-25', '04-01', '04-08', '04-15'],
    datasets: [
      { label: '平均产能', values: [1.0, 1.1, 1.15, 1.18, 1.2], color: '#0EA5E9' },
      { label: '目标产能', values: [1.2, 1.2, 1.2, 1.2, 1.2], color: '#22C55E' },
    ],
  },
  teamComparison: {
    labels: ['03-18', '03-25', '04-01', '04-08', '04-15'],
    datasets: [
      { label: '固件组', values: [1.4, 1.45, 1.5, 1.48, 1.5], color: '#0EA5E9' },
      { label: '驱动组', values: [1.1, 1.15, 1.2, 1.18, 1.2], color: '#22C55E' },
      { label: '平台组', values: [1.6, 1.7, 1.75, 1.78, 1.8], color: '#F97316' },
    ],
  },
  memberEfficiency: generateMemberEfficiency(),
  /** 效能改进建议 — 聚焦产能/质量改进 */
  efficiencySuggestions: [
    { type: 'low_productivity', memberName: '孙八', currentValue: 0.7, threshold: 1.0, suggestion: '产能偏低，建议分析工作瓶颈，优化工作方式' },
    { type: 'low_accuracy', memberName: '钱七', currentValue: 70, threshold: 80, suggestion: '预估偏差较大，建议进行工时评估培训' },
    { type: 'high_rework', memberName: '王五', currentValue: 12, threshold: 10, suggestion: '返工率偏高，建议加强代码审查和测试覆盖' },
    { type: 'high_potential', memberName: '张三', currentValue: 85, threshold: 80, suggestion: '高效能成员，可担任新人导师或技术骨干' },
    { type: 'high_potential', memberName: '赵六', currentValue: 90, threshold: 80, suggestion: '准确性优秀，可参与复杂任务评估' },
  ],
});
