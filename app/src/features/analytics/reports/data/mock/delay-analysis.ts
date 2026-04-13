/**
 * 延期分析报表模拟数据
 */

import type { DelayAnalysisData, DelayTaskItem, MemberDelayItem } from '../../types';

const generateDelayTasks = (): DelayTaskItem[] => [
  { id: '1', taskName: '固件版本适配', wbsCode: 'FW-001', assigneeName: '张三', teamName: '固件组', projectName: '智能终端项目', plannedEndDate: '2026-04-10', delayDays: 8, delayType: 'delayed', delayReason: '技术难度', riskLevel: 'medium' },
  { id: '2', taskName: '驱动兼容性测试', wbsCode: 'DRV-003', assigneeName: '李四', teamName: '驱动组', projectName: '智能终端项目', plannedEndDate: '2026-04-18', delayDays: 0, delayType: 'delay_warning', delayReason: '-', riskLevel: 'low' },
  { id: '3', taskName: '接口联调', wbsCode: 'API-002', assigneeName: '王五', teamName: '平台组', projectName: '数据平台项目', plannedEndDate: '2026-04-05', delayDays: 13, delayType: 'delayed', delayReason: '依赖阻塞', riskLevel: 'high' },
  { id: '4', taskName: '性能优化', wbsCode: 'OPT-001', assigneeName: '赵六', teamName: '测试组', projectName: '移动端优化项目', plannedEndDate: '2026-04-12', delayDays: 6, delayType: 'overdue_completed', delayReason: '需求变更', riskLevel: 'low' },
  { id: '5', taskName: '安全审计', wbsCode: 'SEC-002', assigneeName: '钱七', teamName: '安全组', projectName: '数据平台项目', plannedEndDate: '2026-04-20', delayDays: 0, delayType: 'delay_warning', delayReason: '-', riskLevel: 'medium' },
];

const generateMemberDelayStats = (): MemberDelayItem[] => [
  { memberName: '张三', teamName: '固件组', supervisorName: '周经理', totalTasks: 18, delayedTasks: 3, delayRate: 17, workload: 1.2, activityRate: 85, riskLevel: 'medium' },
  { memberName: '李四', teamName: '驱动组', supervisorName: '周经理', totalTasks: 15, delayedTasks: 2, delayRate: 13, workload: 0.9, activityRate: 72, riskLevel: 'low' },
  { memberName: '王五', teamName: '平台组', supervisorName: '吴经理', totalTasks: 22, delayedTasks: 5, delayRate: 23, workload: 1.4, activityRate: 55, riskLevel: 'high' },
  { memberName: '赵六', teamName: '测试组', supervisorName: '吴经理', totalTasks: 12, delayedTasks: 1, delayRate: 8, workload: 0.7, activityRate: 90, riskLevel: 'low' },
  { memberName: '钱七', teamName: '安全组', supervisorName: '周经理', totalTasks: 16, delayedTasks: 4, delayRate: 25, workload: 1.1, activityRate: 60, riskLevel: 'high' },
];

export const getMockDelayAnalysisData = (): DelayAnalysisData => ({
  stats: [
    { key: 'totalDelayed', label: '延期任务总数', value: 18, trend: { value: 3, direction: 'up', isPositive: false } },
    { key: 'delayWarningCount', label: '延期预警', value: 5, trend: { value: 2, direction: 'up', isPositive: false } },
    { key: 'delayedCount', label: '已延迟', value: 8, trend: { value: 1, direction: 'up', isPositive: false } },
    { key: 'overdueCompletedCount', label: '超期完成', value: 5, trend: { value: 0, direction: 'stable', isPositive: true } },
  ],
  delayTypeChart: {
    labels: ['延期预警', '已延迟', '超期完成'],
    values: [5, 8, 5],
    percentages: [27.8, 44.4, 27.8],
  },
  delayReasonChart: {
    labels: ['需求变更', '技术难度', '资源不足', '依赖阻塞', '其他'],
    datasets: [{ label: '任务数量', values: [6, 5, 3, 3, 1] }],
  },
  delayTrend: {
    labels: ['03-18', '03-25', '04-01', '04-08', '04-15'],
    datasets: [
      { label: '延期任务数', values: [12, 14, 15, 16, 18], color: '#EF4444' },
    ],
  },
  delayResolvedTrend: {
    labels: ['03-18', '03-25', '04-01', '04-08', '04-15'],
    datasets: [
      { label: '新增延期', values: [3, 4, 2, 3, 4], color: '#EF4444' },
      { label: '已解决', values: [2, 3, 3, 2, 5], color: '#22C55E' },
    ],
  },
  workloadVsDelay: {
    points: [
      { id: '1', label: '张三', x: 1.2, y: 3, size: 18, color: '#22C55E' },
      { id: '2', label: '李四', x: 0.9, y: 2, size: 15, color: '#F97316' },
      { id: '3', label: '王五', x: 1.4, y: 5, size: 22, color: '#EF4444' },
      { id: '4', label: '赵六', x: 0.7, y: 1, size: 12, color: '#22C55E' },
      { id: '5', label: '钱七', x: 1.1, y: 4, size: 16, color: '#F97316' },
    ],
    xAxis: { label: '任务负荷', min: 0, max: 2 },
    yAxis: { label: '延期任务数', min: 0, max: 8 },
    quadrantLines: { x: 1.0, y: 3 },
  },
  activityVsDelay: {
    points: [
      { id: '1', label: '张三', x: 85, y: 17, size: 18 },
      { id: '2', label: '李四', x: 72, y: 13, size: 15 },
      { id: '3', label: '王五', x: 55, y: 23, size: 22 },
      { id: '4', label: '赵六', x: 90, y: 8, size: 12 },
      { id: '5', label: '钱七', x: 60, y: 25, size: 16 },
    ],
    xAxis: { label: '活跃度(%)', min: 0, max: 100 },
    yAxis: { label: '延期率(%)', min: 0, max: 40 },
    quadrantLines: { x: 60, y: 15 },
  },
  delayTasks: generateDelayTasks(),
  memberDelayStats: generateMemberDelayStats(),
});
