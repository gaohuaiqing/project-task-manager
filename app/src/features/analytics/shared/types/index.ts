/**
 * 分析模块共享类型定义 - 统一导出
 *
 * @module analytics/shared/types
 */

// 核心指标类型
export type {
  UserRole,
  DataScope,
  TaskStatus,
  TaskStatusGroup,
  DelayType,
  RiskLevel,
  StatsCardMetric,
  CompletionRateMetric,
  DelayRateMetric,
  ActivityMetric,
  WorkloadMetric,
  EstimationAccuracyMetric,
  ProductivityMetric,
  ReworkRateMetric,
  BaseMetrics,
  MemberEfficiencyMetric,
  GroupEfficiencyMetric,
  UpcomingDelayAlert,
  AllocationSuggestionType,
  AllocationSuggestion,
} from './metrics';

// 图表数据类型
export type {
  TrendDataPoint,
  PieChartDataItem,
  BarChartDataItem,
  ScatterDataPoint,
  QuadrantChartConfig,
  DelayWorkloadPoint,
  ActivityDelayPoint,
  StatusDistributionItem,
  TaskTypeDistributionItem,
  DelayReasonItem,
  DelayTrendData,
  MultiSeriesTrendData,
  GroupComparisonItem,
  MemberComparisonItem,
  ChartConfig,
  LineChartConfig,
  BarChartConfig,
  PieChartConfig,
} from './charts';

// 图表颜色常量
export {
  STATUS_COLORS,
  DELAY_TYPE_COLORS,
  RISK_COLORS,
  ACTIVITY_COLORS,
  DEFAULT_CHART_COLORS,
} from './charts';

// API 响应类型
export type {
  ApiResponse,
  PaginationParams,
  DashboardStatsResponse,
  DashboardCard,
  DashboardTrendResponse,
  UrgentTasksResponse,
  ReportFilters,
  ProjectProgressReportResponse,
  MilestoneItem,
  TaskStatisticsReportResponse,
  AssigneeTaskDistribution,
  TaskListItem,
  DelayAnalysisReportResponse,
  DelayedTaskItem,
  MemberDelayStatistic,
  MemberAnalysisReportResponse,
  MemberTaskItem,
  ResourceEfficiencyReportResponse,
  MemberEfficiencyDetail,
  ProjectTypeConfig,
  TaskTypeConfig,
  HolidayConfig,
  OrganizationNode,
  ExportParams,
  ImportResult,
  ImportTemplateType,
  // 仪表板 API 简化类型
  DashboardStats,
  ProjectProgressItem,
  TaskDistribution,
  DashboardQueryParams,
} from './api';
