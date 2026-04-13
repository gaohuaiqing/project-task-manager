/**
 * 仪表板组件统一导出
 *
 * @module analytics/dashboard
 */

// 主入口页面
export { DashboardPage } from './DashboardPage';
export type { DashboardPageProps } from './DashboardPage';

// 角色仪表板（新版本，支持 Mock 数据）
export {
  AdminDashboard,
  DeptManagerDashboard,
  TechManagerDashboard,
  EngineerDashboard,
} from './roles';
export type {
  AdminDashboardProps,
  DeptManagerDashboardProps,
  TechManagerDashboardProps,
  EngineerDashboardProps,
} from './roles';

// 角色仪表板（旧版本，保留向后兼容）
export { AdminDashboard as AdminDashboardLegacy } from './AdminDashboard';
export type { AdminDashboardProps as AdminDashboardLegacyProps } from './AdminDashboard';

export { DeptManagerDashboard as DeptManagerDashboardLegacy } from './DeptManagerDashboard';
export type { DeptManagerDashboardProps as DeptManagerDashboardLegacyProps } from './DeptManagerDashboard';

export { TechManagerDashboard as TechManagerDashboardLegacy } from './TechManagerDashboard';
export type { TechManagerDashboardProps as TechManagerDashboardLegacyProps } from './TechManagerDashboard';

export { EngineerDashboard as EngineerDashboardLegacy } from './EngineerDashboard';
export type { EngineerDashboardProps as EngineerDashboardLegacyProps } from './EngineerDashboard';

// 共享组件
export {
  DashboardSection,
  StatsCardGrid,
  AlertCardsRow,
  HighRiskProjectCard,
  EfficiencyTable,
  ChartGrid,
  AllocationSuggestionGrid,
  GroupSelector,
} from './components';
export type {
  DashboardSectionProps,
  StatsCardGridProps,
  AlertCardsRowProps,
  HighRiskProjectCardProps,
  EfficiencyTableProps,
  EfficiencyItem,
  ChartGridProps,
  ChartGridItem,
  AllocationSuggestionGridProps,
  GroupSelectorProps,
  GroupOption,
} from './components';

// 子组件
export { AlertCard, AlertCards } from './components/AlertCard';
export type { AlertCardProps, AlertCardsProps } from './components/AlertCard';

export { TodoTaskList } from './components/TodoTaskList';
export type { TodoTaskListProps } from './components/TodoTaskList';

export { ProjectProgressList } from './components/ProjectProgressList';
export type { ProjectProgressListProps } from './components/ProjectProgressList';

export { MemberStatusTable } from './components/MemberStatusTable';
export type { MemberStatusTableProps } from './components/MemberStatusTable';

export { GroupEfficiencyTable } from './components/GroupEfficiencyTable';
export type { GroupEfficiencyTableProps } from './components/GroupEfficiencyTable';

export { AllocationSuggestionCards } from './components/AllocationSuggestion';
export type { AllocationSuggestionProps } from './components/AllocationSuggestion';

// 数据层
export {
  createDataProvider,
  DASHBOARD_CONFIG,
  shouldUseMockData,
} from './data';
export type { DashboardDataProvider } from './data';

// Hooks
export {
  useAdminDashboard,
  useDeptManagerDashboard,
  useTechManagerDashboard,
  useEngineerDashboard,
  useAdminDashboardData,
  useDeptManagerDashboardData,
  useTechManagerDashboardData,
  useEngineerDashboardData,
  useDashboardData,
} from './hooks';

// 类型导出
export type {
  AlertType,
  AlertData,
  DashboardStats,
  MemberTaskStatus,
  GroupEfficiency,
  DepartmentEfficiency,
  AllocationSuggestion,
  ProjectProgress,
  TodoTask,
  AdminDashboardData,
  DeptManagerDashboardData,
  TechManagerDashboardData,
  EngineerDashboardData,
  HighRiskProject,
  DepartmentDelayTrend,
  UtilizationTrend,
  MemberActivityTrend,
} from './types';

// 默认导出页面组件
export { DashboardPage as default } from './DashboardPage';
