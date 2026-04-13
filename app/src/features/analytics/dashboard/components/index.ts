/**
 * 仪表板共享组件统一导出
 *
 * @module analytics/dashboard/components/index
 */

// 布局组件
export { DashboardSection } from './DashboardSection';
export type { DashboardSectionProps } from './DashboardSection';

// 统计卡片
export { StatsCardGrid } from './StatsCardGrid';
export type { StatsCardGridProps } from './StatsCardGrid';

// 预警卡片
export { AlertCardsRow } from './AlertCardsRow';
export type { AlertCardsRowProps } from './AlertCardsRow';

// 高风险项目
export { HighRiskProjectCard } from './HighRiskProjectCard';
export type { HighRiskProjectCardProps } from './HighRiskProjectCard';

// 效能表格
export { EfficiencyTable } from './EfficiencyTable';
export type { EfficiencyTableProps, EfficiencyItem } from './EfficiencyTable';

// 图表网格
export { ChartGrid } from './ChartGrid';
export type { ChartGridProps, ChartGridItem } from './ChartGrid';

// 调配建议
export { AllocationSuggestionGrid } from './AllocationSuggestionGrid';
export type { AllocationSuggestionGridProps } from './AllocationSuggestionGrid';

// 组选择器
export { GroupSelector } from './GroupSelector';
export type { GroupSelectorProps, GroupOption } from './GroupSelector';
