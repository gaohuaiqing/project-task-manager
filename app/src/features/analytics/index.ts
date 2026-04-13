/**
 * 数据分析模块统一入口
 * 包含仪表板和报表分析两个子模块
 *
 * @module analytics
 * @see REQ_07_INDEX.md §2 模块定位
 */

// 报表分析模块
export { ReportsPage } from './reports';
export type { ReportsPageProps } from './reports';

// 仪表板模块
export { DashboardPage } from './dashboard';
export type { DashboardPageProps } from './dashboard';

// 共享组件
export {
  StatsCard,
  StatsCardGroup,
  ChartContainer,
  ChartGroup,
  DataTable,
  FilterBar,
} from './reports/components/shared';

// 图表组件
export {
  PieChart,
  DonutChart,
  BarChart,
  LineChart,
  ScatterChart,
  StackedBarChart,
} from './reports/components/charts';

// 类型导出
export type {
  ReportType,
  UserRole,
  TimeRange,
  DelayType,
  RiskLevel,
  TaskStatus,
  ReportFilters,
  StatCard,
  PieChartData,
  BarChartData,
  LineChartData,
  ScatterChartData,
  StackedBarChartData,
  TableColumn,
  Pagination,
  ReportTab,
} from './reports/types';

// 配置导出
export {
  PROJECT_PROGRESS_STATS,
  TASK_STATISTICS_STATS,
  DELAY_ANALYSIS_STATS,
  MEMBER_ANALYSIS_STATS,
  RESOURCE_EFFICIENCY_STATS,
  MILESTONE_COLUMNS,
  TASK_STATISTIC_COLUMNS,
  DELAY_TASK_COLUMNS,
  MEMBER_DELAY_COLUMNS,
  MEMBER_TASK_COLUMNS,
  MEMBER_EFFICIENCY_COLUMNS,
  CHART_COLORS,
  TIME_RANGE_OPTIONS,
  DELAY_TYPE_OPTIONS,
  TASK_TYPE_OPTIONS,
} from './reports/config';

export {
  ROLE_CONFIGS,
  getRoleConfig,
  canAccessReports,
  getDefaultFilters,
} from './reports/config';

// 数据Hooks导出
export {
  useProjectProgressData,
  useTaskStatisticsData,
  useDelayAnalysisData,
  useMemberAnalysisData,
  useResourceEfficiencyData,
  useProjectsForReport,
  useMembersForReport,
} from './reports/data';
