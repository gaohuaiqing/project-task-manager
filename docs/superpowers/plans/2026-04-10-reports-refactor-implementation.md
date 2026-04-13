# 报表分析模块重构实施计划

> **设计文档**: `docs/superpowers/specs/2026-04-09-reports-refactor-design.md`
> **创建日期**: 2026-04-10
> **预计工作量**: 9天

---

## 概述

根据设计文档，完全重写报表分析模块，实现：
1. **角色差异化**：admin / dept_manager / tech_manager 三种角色视图
2. **动态维度**：时间范围筛选 + 趋势图表
3. **完整数据表格**：排序、分页、状态颜色
4. **UI规范**：符合需求文档的配色、布局、交互规范

---

## 阶段1: 类型定义 + 配置结构 + UI常量 (1天)

### Step 1.1: 创建类型导出文件

**文件**: `app/src/features/analytics/reports/types/index.ts`

```typescript
/**
 * 报表分析模块类型导出
 */
export * from './report-types';
export * from './role-config';
export * from './chart-types';
```

---

### Step 1.2: 创建报表数据类型

**文件**: `app/src/features/analytics/reports/types/report-types.ts`

```typescript
/**
 * 报表数据类型定义
 * @see docs/requirements/modules/REQ_07b_reports.md
 */

/** 用户角色 */
export type UserRole = 'admin' | 'dept_manager' | 'tech_manager';

/** 统计卡片数据 */
export interface StatsCardData {
  value: number;
  displayValue: string;
  trend?: number;
  trendText?: string;
  trendDirection?: 'up' | 'down' | 'stable';
}

/** 饼图数据项 */
export interface PieChartDataItem {
  name: string;
  value: number;
  color: string;
  percentage?: number;
}

/** 柱状图数据项 */
export interface BarChartDataItem {
  name: string;
  values: Record<string, number>;
}

/** 折线图数据项 */
export interface LineChartDataItem {
  date: string;
  values: Record<string, number>;
}

/** 散点图数据项 */
export interface ScatterChartDataItem {
  id: string;
  label: string;
  x: number;
  y: number;
  size?: number;
  color?: string;
}

/** 趋势数据 */
export interface TrendData {
  labels: string[];
  datasets: {
    label: string;
    values: number[];
    color: string;
  }[];
}

/** 时间范围选项 */
export type TimeRangeOption = 'past_7_days' | 'past_30_days' | 'this_quarter' | 'custom';

/** 报表筛选参数 */
export interface ReportFilters {
  projectId?: string;
  memberId?: number;
  assigneeId?: number;
  timeRangeType: TimeRangeOption;
  startDate?: string;
  endDate?: string;
  delayType?: 'delay_warning' | 'delayed' | 'overdue_completed';
  taskType?: string;
  departmentId?: number;
  techGroupId?: number;
}

/** 报表Tab类型 */
export type ReportTabType =
  | 'project-progress'
  | 'task-statistics'
  | 'delay-analysis'
  | 'member-analysis'
  | 'resource-efficiency';

/** 报表Tab配置 */
export interface ReportTabConfig {
  value: ReportTabType;
  label: string;
  path: string;
}

/** 风险等级 */
export type RiskLevel = 'high' | 'medium' | 'low';

/** 组状态 */
export type GroupStatus = 'healthy' | 'warning' | 'risk';

/** 效能等级 */
export type EfficiencyLevel = 'high' | 'medium' | 'low';

/** 报表基础响应 */
export interface ReportBaseResponse {
  stats: Record<string, StatsCardData>;
  dataScope: {
    role: UserRole;
    departmentId?: number;
    techGroupId?: number;
  };
}

/** 里程碑项 */
export interface MilestoneItem {
  id: string;
  name: string;
  projectName: string;
  targetDate: string;
  completionPercentage: number;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  totalTasks: number;
  completedTasks: number;
  daysToTarget?: number;
}

/** 项目进度报表响应 */
export interface ProjectProgressReportData extends ReportBaseResponse {
  statusDistribution: PieChartDataItem[];
  milestoneStatus: {
    completed: number;
    inProgress: number;
    pending: number;
    delayed: number;
  };
  milestones: MilestoneItem[];
  progressTrend: TrendData;
  projectTypeComparison?: BarChartDataItem[];
  departmentComparison?: BarChartDataItem[];
  groupComparison?: BarChartDataItem[];
}

/** 任务统计项 */
export interface TaskStatisticsItem {
  id: string;
  wbsCode: string;
  description: string;
  projectName: string;
  assigneeName: string;
  teamName?: string;
  status: string;
  progress: number;
  taskType: string;
  priority: string;
  plannedEndDate: string | null;
  completedDate: string | null;
  riskLevel?: string;
}

/** 任务统计报表响应 */
export interface TaskStatisticsReportData extends ReportBaseResponse {
  taskTypeDistribution: PieChartDataItem[];
  priorityDistribution: BarChartDataItem[];
  assigneeDistribution: BarChartDataItem[];
  taskTrend: TrendData;
  taskList: TaskStatisticsItem[];
  departmentComparison?: BarChartDataItem[];
  groupComparison?: BarChartDataItem[];
}

/** 延期任务项 */
export interface DelayedTaskItem {
  id: string;
  wbsCode: string;
  description: string;
  assigneeName: string;
  teamName?: string;
  projectName: string;
  taskType: string;
  plannedEndDate: string;
  delayDays: number;
  delayType: 'delay_warning' | 'delayed' | 'overdue_completed';
  delayReason?: string;
  riskLevel: 'high' | 'medium' | 'low';
}

/** 成员延期统计 */
export interface MemberDelayStatistic {
  memberId: number;
  memberName: string;
  teamName?: string;
  supervisorName?: string;
  totalTasks: number;
  delayedTasks: number;
  delayRate: number;
  workload: number;
  activityRate: number;
  mainDelayType?: string;
  riskLevel: 'high' | 'medium' | 'low';
}

/** 分配建议 */
export interface AllocationSuggestion {
  type: 'overload' | 'idle' | 'low_activity' | 'high_efficiency';
  targetId: number;
  targetName: string;
  targetTeam?: string;
  currentValue: number;
  thresholdValue: number;
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
}

/** 延期分析报表响应 */
export interface DelayAnalysisReportData extends ReportBaseResponse {
  delayTypeDistribution: PieChartDataItem[];
  delayReasonDistribution: BarChartDataItem[];
  delayDistribution: BarChartDataItem[];
  memberWorkloadScatter: ScatterChartDataItem[];
  memberActivityScatter: ScatterChartDataItem[];
  delayTrend: TrendData;
  convergenceTrend: TrendData;
  delayedTasks: DelayedTaskItem[];
  memberDelayStats: MemberDelayStatistic[];
  suggestions: AllocationSuggestion[];
}

/** 成员任务项 */
export interface MemberTaskItem {
  id: string;
  wbsCode: string;
  description: string;
  projectName: string;
  status: string;
  progress: number;
  fullTimeRatio: number;
  taskType: string;
  plannedEndDate: string;
  plannedDuration?: number;
  actualDuration?: number;
  estimationAccuracy?: number;
  lastUpdated?: string;
}

/** 成员任务分析响应 */
export interface MemberAnalysisReportData extends ReportBaseResponse {
  workloadDistribution: BarChartDataItem[];
  statusDistribution: PieChartDataItem[];
  estimationAccuracyDistribution: BarChartDataItem[];
  workloadTrend: TrendData;
  memberTasks: MemberTaskItem[];
  groupEfficiencyComparison?: BarChartDataItem[];
  suggestions: AllocationSuggestion[];
}

/** 成员效能项 */
export interface MemberEfficiencyItem {
  memberId: number;
  memberName: string;
  department?: string;
  techGroup?: string;
  completedTasks: number;
  productivity: number;
  estimationAccuracy: number;
  reworkRate: number;
  fulltimeUtilization: number;
  activityRate: number;
  efficiencyLevel: 'high' | 'medium' | 'low';
}

/** 资源效能分析响应 */
export interface ResourceEfficiencyReportData extends ReportBaseResponse {
  productivityRanking: BarChartDataItem[];
  estimationAccuracyDistribution: BarChartDataItem[];
  efficiencyScatter: ScatterChartDataItem[];
  efficiencyTrend: TrendData;
  memberEfficiency: MemberEfficiencyItem[];
  groupEfficiencyComparison?: BarChartDataItem[];
}
```

---

### Step 1.3: 创建角色配置类型

**文件**: `app/src/features/analytics/reports/types/role-config.ts`

```typescript
/**
 * 角色配置类型定义
 */

import type { UserRole } from './report-types';

/** 统计卡片配置 */
export interface StatsCardConfig {
  key: string;
  title: string;
  dataPath: string;
  format: 'number' | 'percent' | 'ratio';
  trendPath?: string;
  color?: 'default' | 'warning' | 'danger' | 'success';
}

/** 图表配置 */
export interface ChartConfig {
  key: string;
  title: string;
  type: 'pie' | 'bar' | 'line' | 'scatter' | 'stacked-bar';
  dataPath: string;
  supportTimeRange?: boolean;
  position: 'left' | 'right';
}

/** 表格列配置 */
export interface TableColumnConfig {
  key: string;
  title: string;
  dataField: string;
  width?: number;
  sortable?: boolean;
  format?: 'text' | 'date' | 'number' | 'percent' | 'status' | 'risk';
  colorMap?: Record<string, string>;
}

/** 表格配置 */
export interface TableConfig {
  key: string;
  dataPath: string;
  columns: TableColumnConfig[];
  defaultSortField?: string;
  defaultSortDirection?: 'asc' | 'desc';
}

/** 报表视图配置 */
export interface ReportViewConfig {
  role: UserRole;
  stats: StatsCardConfig[];
  staticCharts: ChartConfig[];
  dynamicCharts: ChartConfig[];
  table: TableConfig;
  comparisonDimension: 'department' | 'group' | 'member';
  features?: string[];
}
```

---

### Step 1.4: 创建图表数据类型

**文件**: `app/src/features/analytics/reports/types/chart-types.ts`

```typescript
/**
 * 图表数据类型定义
 */

import type { PieChartDataItem, BarChartDataItem, LineChartDataItem, ScatterChartDataItem, TrendData } from './report-types';

/** 图表数据联合类型 */
export type ChartData = 
  | PieChartDataItem[] 
  | BarChartDataItem[] 
  | LineChartDataItem[] 
  | ScatterChartDataItem[]
  | TrendData;

/** 图表类型 */
export type ChartType = 'pie' | 'bar' | 'line' | 'scatter' | 'stacked-bar';

/** 图表独立时间范围 */
export interface ChartTimeRange {
  chartKey: string;
  useCustom: boolean;
  customRange?: {
    startDate: string;
    endDate: string;
  };
}
```

---

### Step 1.5: 创建UI常量定义

**文件**: `app/src/features/analytics/reports/config/ui-constants.ts`

```typescript
/**
 * UI常量定义
 * @see docs/requirements/modules/REQ_07a_dashboard.md §1
 */

/** 统计卡片规范 */
export const STATS_CARD_SPEC = {
  valueFontSize: 'text-2xl',
  valueFontClass: 'font-mono font-bold tabular-nums',
  labelFontSize: 'text-xs',
  labelColor: 'text-muted-foreground',
  borderRadius: 'rounded-lg',
  padding: 'p-4',
  shadow: 'shadow-sm hover:shadow-md transition-shadow',
} as const;

/** 状态颜色常量 */
export const STATUS_COLORS = {
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  neutral: '#9ca3af',
} as const;

/** 延期类型颜色 */
export const DELAY_TYPE_COLORS = {
  delay_warning: '#f59e0b',
  delayed: '#ef4444',
  overdue_completed: '#f97316',
} as const;

/** 风险等级颜色 */
export const RISK_LEVEL_COLORS = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#22c55e',
} as const;

/** 任务状态颜色 */
export const TASK_STATUS_COLORS = {
  not_started: '#9ca3af',
  in_progress: '#3b82f6',
  delay_warning: '#f59e0b',
  delayed: '#ef4444',
  early_completed: '#22c55e',
  on_time_completed: '#22c55e',
  overdue_completed: '#f97316',
} as const;

/** 里程碑状态颜色 */
export const MILESTONE_STATUS_COLORS = {
  pending: '#9ca3af',
  in_progress: '#3b82f6',
  completed: '#22c55e',
  overdue: '#ef4444',
} as const;

/** 图表规范 */
export const CHART_SPEC = {
  height: 300,
  colors: {
    primary: '#0EA5E9',
    success: '#22C55E',
    warning: '#F59E0B',
    danger: '#EF4444',
    purple: '#8B5CF6',
    pink: '#EC4899',
  },
  gridColor: 'rgba(148, 163, 184, 0.2)',
  animationDuration: 300,
} as const;

/** 布局规范 */
export const LAYOUT_SPEC = {
  sectionGap: 'space-y-6',
  cardGap: 'gap-4',
  statsGrid: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  chartsGrid: 'grid grid-cols-1 lg:grid-cols-2',
  filterBar: 'bg-muted p-4 rounded-lg',
} as const;

/** 任务类型列表 */
export const TASK_TYPES = [
  '固件开发',
  '板卡开发',
  '驱动开发',
  '接口开发',
  '功能开发',
  'Bug修复',
  '性能优化',
  '文档编写',
  '测试验证',
  '需求分析',
  '设计评审',
  '其他',
] as const;

/** 报表Tab配置 */
export const REPORT_TABS = [
  { value: 'project-progress', label: '项目进度报表', path: '/reports/project-progress' },
  { value: 'task-statistics', label: '任务统计报表', path: '/reports/task-statistics' },
  { value: 'delay-analysis', label: '延期分析报表', path: '/reports/delay-analysis' },
  { value: 'member-analysis', label: '成员任务分析', path: '/reports/member-analysis' },
  { value: 'resource-efficiency', label: '资源效能分析', path: '/reports/resource-efficiency' },
] as const;
```

---

### Step 1.6: 创建配置导出文件

**文件**: `app/src/features/analytics/reports/config/index.ts`

```typescript
/**
 * 配置导出
 */
export * from './ui-constants';
export * from './role-configs';
export * from './table-configs';
```

---

### Step 1.7: 创建角色视图配置

**文件**: `app/src/features/analytics/reports/config/role-configs.ts`

```typescript
/**
 * 角色视图配置
 * @see docs/requirements/modules/REQ_07b_reports.md
 */

import type { ReportViewConfig, UserRole } from '../types';

/** 项目进度报表 - 角色配置 */
export const PROJECT_PROGRESS_CONFIG: Record<UserRole, ReportViewConfig> = {
  admin: {
    role: 'admin',
    stats: [
      { key: 'totalProjects', title: '项目总数', dataPath: 'stats.totalProjects', format: 'number' },
      { key: 'totalTasks', title: '任务总数', dataPath: 'stats.totalTasks', format: 'number' },
      { key: 'completionRate', title: '完成率', dataPath: 'stats.completionRate', format: 'percent', trendPath: 'stats.completionRateTrend' },
      { key: 'delayRate', title: '延期率', dataPath: 'stats.delayRate', format: 'percent', trendPath: 'stats.delayRateTrend' },
    ],
    staticCharts: [
      { key: 'statusDistribution', title: '任务状态分布', type: 'pie', dataPath: 'statusDistribution', position: 'left' },
      { key: 'projectTypeComparison', title: '项目类型进度对比', type: 'bar', dataPath: 'projectTypeComparison', position: 'right' },
    ],
    dynamicCharts: [
      { key: 'progressTrend', title: '全局进度趋势', type: 'line', dataPath: 'progressTrend', supportTimeRange: true, position: 'left' },
      { key: 'departmentTrend', title: '各部门进度变化速度', type: 'line', dataPath: 'departmentTrend', supportTimeRange: true, position: 'right' },
    ],
    table: {
      key: 'milestones',
      dataPath: 'milestones',
      columns: [
        { key: 'name', title: '里程碑名称', dataField: 'name', width: 200, sortable: true },
        { key: 'projectName', title: '所属项目', dataField: 'projectName', width: 150, sortable: true },
        { key: 'targetDate', title: '目标日期', dataField: 'targetDate', width: 120, sortable: true, format: 'date' },
        { key: 'completionPercentage', title: '完成进度', dataField: 'completionPercentage', width: 100, sortable: true, format: 'percent' },
        { key: 'status', title: '状态', dataField: 'status', width: 100, sortable: true, format: 'status' },
      ],
      defaultSortField: 'targetDate',
      defaultSortDirection: 'asc',
    },
    comparisonDimension: 'department',
    features: ['cross_department_resource_allocation'],
  },

  dept_manager: {
    role: 'dept_manager',
    stats: [
      { key: 'deptProjects', title: '部门项目数', dataPath: 'stats.totalProjects', format: 'number' },
      { key: 'deptTasks', title: '部门任务数', dataPath: 'stats.totalTasks', format: 'number' },
      { key: 'deptCompletionRate', title: '部门完成率', dataPath: 'stats.completionRate', format: 'percent', trendPath: 'stats.completionRateTrend' },
      { key: 'deptDelayRate', title: '部门延期率', dataPath: 'stats.delayRate', format: 'percent', trendPath: 'stats.delayRateTrend' },
    ],
    staticCharts: [
      { key: 'statusDistribution', title: '任务状态分布', type: 'pie', dataPath: 'statusDistribution', position: 'left' },
      { key: 'milestoneStatus', title: '里程碑完成情况', type: 'bar', dataPath: 'milestoneStatus', position: 'right' },
    ],
    dynamicCharts: [
      { key: 'progressTrend', title: '部门进度趋势', type: 'line', dataPath: 'progressTrend', supportTimeRange: true, position: 'left' },
      { key: 'groupTrend', title: '各组进度变化对比', type: 'line', dataPath: 'groupTrend', supportTimeRange: true, position: 'right' },
    ],
    table: {
      key: 'milestones',
      dataPath: 'milestones',
      columns: [
        { key: 'name', title: '里程碑名称', dataField: 'name', width: 200, sortable: true },
        { key: 'projectName', title: '所属项目', dataField: 'projectName', width: 150, sortable: true },
        { key: 'targetDate', title: '目标日期', dataField: 'targetDate', width: 120, sortable: true, format: 'date' },
        { key: 'completionPercentage', title: '完成进度', dataField: 'completionPercentage', width: 100, sortable: true, format: 'percent' },
        { key: 'status', title: '状态', dataField: 'status', width: 100, sortable: true, format: 'status' },
      ],
      defaultSortField: 'targetDate',
      defaultSortDirection: 'asc',
    },
    comparisonDimension: 'group',
    features: ['group_resource_allocation'],
  },

  tech_manager: {
    role: 'tech_manager',
    stats: [
      { key: 'groupProjects', title: '组参与项目数', dataPath: 'stats.totalProjects', format: 'number' },
      { key: 'groupTasks', title: '组任务数', dataPath: 'stats.totalTasks', format: 'number' },
      { key: 'groupCompletionRate', title: '组完成率', dataPath: 'stats.completionRate', format: 'percent', trendPath: 'stats.completionRateTrend' },
      { key: 'groupDelayRate', title: '组延期率', dataPath: 'stats.delayRate', format: 'percent', trendPath: 'stats.delayRateTrend' },
    ],
    staticCharts: [
      { key: 'statusDistribution', title: '任务状态分布', type: 'pie', dataPath: 'statusDistribution', position: 'left' },
      { key: 'milestoneStatus', title: '里程碑完成情况', type: 'bar', dataPath: 'milestoneStatus', position: 'right' },
    ],
    dynamicCharts: [
      { key: 'progressTrend', title: '组进度趋势', type: 'line', dataPath: 'progressTrend', supportTimeRange: true, position: 'left' },
    ],
    table: {
      key: 'milestones',
      dataPath: 'milestones',
      columns: [
        { key: 'name', title: '里程碑名称', dataField: 'name', width: 200, sortable: true },
        { key: 'projectName', title: '所属项目', dataField: 'projectName', width: 150, sortable: true },
        { key: 'targetDate', title: '目标日期', dataField: 'targetDate', width: 120, sortable: true, format: 'date' },
        { key: 'completionPercentage', title: '完成进度', dataField: 'completionPercentage', width: 100, sortable: true, format: 'percent' },
        { key: 'status', title: '状态', dataField: 'status', width: 100, sortable: true, format: 'status' },
      ],
      defaultSortField: 'targetDate',
      defaultSortDirection: 'asc',
    },
    comparisonDimension: 'member',
    features: ['task_assignment_suggestion'],
  },
};

// 其他报表配置将在后续步骤中添加
```

---

### Step 1.8: 创建表格配置

**文件**: `app/src/features/analytics/reports/config/table-configs.ts`

```typescript
/**
 * 表格列配置
 */

import type { TableConfig } from '../types';
import { MILESTONE_STATUS_COLORS, DELAY_TYPE_COLORS, RISK_LEVEL_COLORS, TASK_STATUS_COLORS } from './ui-constants';

/** 项目进度报表 - 里程碑列表配置 */
export const PROJECT_PROGRESS_TABLE_CONFIG: TableConfig = {
  key: 'milestones',
  dataPath: 'milestones',
  columns: [
    { key: 'name', title: '里程碑名称', dataField: 'name', width: 200, sortable: true, format: 'text' },
    { key: 'projectName', title: '所属项目', dataField: 'projectName', width: 150, sortable: true, format: 'text' },
    { key: 'targetDate', title: '目标日期', dataField: 'targetDate', width: 120, sortable: true, format: 'date' },
    { key: 'completionPercentage', title: '完成进度', dataField: 'completionPercentage', width: 100, sortable: true, format: 'percent' },
    { key: 'status', title: '状态', dataField: 'status', width: 100, sortable: true, format: 'status', colorMap: MILESTONE_STATUS_COLORS },
    { key: 'daysToTarget', title: '距今天数', dataField: 'daysToTarget', width: 80, sortable: true, format: 'number' },
  ],
  defaultSortField: 'targetDate',
  defaultSortDirection: 'asc',
};

/** 延期分析报表 - 延期任务列表配置 */
export const DELAY_ANALYSIS_TABLE_CONFIG: TableConfig = {
  key: 'delayedTasks',
  dataPath: 'delayedTasks',
  columns: [
    { key: 'taskName', title: '任务名称', dataField: 'description', width: 200, sortable: true, format: 'text' },
    { key: 'wbsCode', title: 'WBS编码', dataField: 'wbsCode', width: 80, sortable: true, format: 'text' },
    { key: 'assigneeName', title: '负责人', dataField: 'assigneeName', width: 100, sortable: true, format: 'text' },
    { key: 'teamName', title: '所属组', dataField: 'teamName', width: 100, sortable: true, format: 'text' },
    { key: 'projectName', title: '所属项目', dataField: 'projectName', width: 120, sortable: true, format: 'text' },
    { key: 'taskType', title: '任务类型', dataField: 'taskType', width: 100, sortable: true, format: 'text' },
    { key: 'plannedEndDate', title: '计划结束日期', dataField: 'plannedEndDate', width: 110, sortable: true, format: 'date' },
    { key: 'delayDays', title: '延期天数', dataField: 'delayDays', width: 80, sortable: true, format: 'number' },
    { key: 'delayType', title: '延期类型', dataField: 'delayType', width: 100, sortable: true, format: 'status', colorMap: DELAY_TYPE_COLORS },
    { key: 'delayReason', title: '延期原因', dataField: 'delayReason', width: 150, sortable: false, format: 'text' },
    { key: 'riskLevel', title: '风险等级', dataField: 'riskLevel', width: 80, sortable: true, format: 'risk', colorMap: RISK_LEVEL_COLORS },
  ],
  defaultSortField: 'delayDays',
  defaultSortDirection: 'desc',
};

/** 成员任务分析 - 成员任务列表配置 */
export const MEMBER_ANALYSIS_TABLE_CONFIG: TableConfig = {
  key: 'memberTasks',
  dataPath: 'memberTasks',
  columns: [
    { key: 'taskName', title: '任务名称', dataField: 'description', width: 200, sortable: true, format: 'text' },
    { key: 'wbsCode', title: 'WBS编码', dataField: 'wbsCode', width: 80, sortable: true, format: 'text' },
    { key: 'projectName', title: '所属项目', dataField: 'projectName', width: 120, sortable: true, format: 'text' },
    { key: 'status', title: '任务状态', dataField: 'status', width: 100, sortable: true, format: 'status', colorMap: TASK_STATUS_COLORS },
    { key: 'progress', title: '进度', dataField: 'progress', width: 80, sortable: true, format: 'percent' },
    { key: 'fullTimeRatio', title: '全职比', dataField: 'fullTimeRatio', width: 80, sortable: true, format: 'percent' },
    { key: 'taskType', title: '任务类型', dataField: 'taskType', width: 100, sortable: true, format: 'text' },
    { key: 'plannedEndDate', title: '计划结束日期', dataField: 'plannedEndDate', width: 110, sortable: true, format: 'date' },
    { key: 'plannedDuration', title: '计划工期', dataField: 'plannedDuration', width: 80, sortable: true, format: 'number' },
    { key: 'actualDuration', title: '实际工期', dataField: 'actualDuration', width: 80, sortable: true, format: 'number' },
    { key: 'estimationAccuracy', title: '预估准确性', dataField: 'estimationAccuracy', width: 100, sortable: true, format: 'percent' },
    { key: 'lastUpdated', title: '最后更新', dataField: 'lastUpdated', width: 120, sortable: true, format: 'date' },
  ],
  defaultSortField: 'plannedEndDate',
  defaultSortDirection: 'asc',
};
```

---

## 阶段2: 判断标准工具函数 (0.5天)

### Step 2.1: 创建判断标准工具函数

**文件**: `app/src/features/analytics/reports/utils/judgment-utils.ts`

```typescript
/**
 * 判断标准工具函数
 * @see docs/requirements/modules/REQ_07b_reports.md §4
 */

import type { RiskLevel, GroupStatus, EfficiencyLevel, AllocationSuggestion } from '../types';

/**
 * 判断延期风险等级
 * @see REQ_07b_reports.md §4.4
 */
export function getDelayRiskLevel(delayDays: number, delayCount: number): RiskLevel {
  // 高风险：延期天数 > 14天 或 历史延期次数 > 2
  if (delayDays > 14 || delayCount > 2) return 'high';
  // 中风险：延期天数 7-14天 或 历史延期次数 = 2
  if (delayDays >= 7 || delayCount === 2) return 'medium';
  // 低风险：延期天数 < 7天 且 历史延期次数 ≤ 1
  return 'low';
}

/**
 * 判断成员风险等级
 * @see REQ_07b_reports.md §4.0.7
 */
export function getMemberRiskLevel(delayRate: number, activityRate: number): RiskLevel {
  // 高风险：延期率 > 30% 或 (延期率 > 20% 且 活跃度 < 60%)
  if (delayRate > 30 || (delayRate > 20 && activityRate < 60)) return 'high';
  // 中风险：延期率 10%-30% 或 (延期率 > 10% 且 活跃度 < 60%)
  if (delayRate >= 10 || (delayRate > 10 && activityRate < 60)) return 'medium';
  // 低风险：延期率 < 10% 且 活跃度 ≥ 60%
  return 'low';
}

/**
 * 判断组状态
 * @see REQ_07_INDEX.md §4.0.3
 */
export function getGroupStatus(
  completionRate: number,
  delayRate: number,
  activityRate: number,
  loadRate: number
): GroupStatus {
  // 健康：完成率 ≥ 80% 且 延期率 ≤ 10% 且 活跃度 ≥ 80%
  if (completionRate >= 80 && delayRate <= 10 && activityRate >= 80) {
    return 'healthy';
  }
  // 风险：完成率 < 60% 或 延期率 > 20% 或 负载率 > 110%
  if (completionRate < 60 || delayRate > 20 || loadRate > 110) {
    return 'risk';
  }
  // 警告：其他情况
  return 'warning';
}

/**
 * 获取组状态图标
 */
export function getGroupStatusIcon(status: GroupStatus): string {
  switch (status) {
    case 'healthy': return '🟢';
    case 'warning': return '🟡';
    case 'risk': return '🔴';
  }
}

/**
 * 判断效能等级
 * @see REQ_07b_reports.md §5.5
 */
export function getEfficiencyLevel(
  productivity: number,
  accuracy: number,
  avgProductivity: number
): EfficiencyLevel {
  // 高：产能 > 平均值120% 且 准确性 ≥ 80%
  if (productivity > avgProductivity * 1.2 && accuracy >= 80) return 'high';
  // 低：产能 < 平均值80% 或 准确性 < 50%
  if (productivity < avgProductivity * 0.8 || accuracy < 50) return 'low';
  // 中：其他情况
  return 'medium';
}

/**
 * 判断预估准确性等级
 * @see REQ_07b_reports.md §5.4
 */
export function getEstimationAccuracyLevel(accuracy: number): {
  level: 'precise' | 'slight' | 'obvious' | 'severe';
  color: string;
} {
  if (accuracy >= 90) return { level: 'precise', color: '#22c55e' };
  if (accuracy >= 70) return { level: 'slight', color: '#f59e0b' };
  if (accuracy >= 50) return { level: 'obvious', color: '#f97316' };
  return { level: 'severe', color: '#ef4444' };
}

/**
 * 生成人员调配建议
 * @see REQ_07b_reports.md §4.0.4
 */
export function generateAllocationSuggestions(
  members: Array<{
    id: number;
    name: string;
    team?: string;
    workload: number;
    delayRate: number;
    activityRate: number;
  }>,
  avgWorkload: number,
  avgDelayRate: number
): AllocationSuggestion[] {
  const suggestions: AllocationSuggestion[] = [];

  members.forEach(member => {
    // 过载延期：负荷 > 平均 × 1.2 且 延期率 > 平均
    if (member.workload > avgWorkload * 1.2 && member.delayRate > avgDelayRate) {
      suggestions.push({
        type: 'overload',
        targetId: member.id,
        targetName: member.name,
        targetTeam: member.team,
        currentValue: member.workload,
        thresholdValue: avgWorkload * 1.2,
        suggestion: '减轻负担，分配任务给其他成员',
        priority: member.delayRate > avgDelayRate * 1.5 ? 'high' : 'medium',
      });
    }

    // 低活跃延期：活跃度 < 60% 且 延期率 > 平均
    if (member.activityRate < 60 && member.delayRate > avgDelayRate) {
      suggestions.push({
        type: 'low_activity',
        targetId: member.id,
        targetName: member.name,
        targetTeam: member.team,
        currentValue: member.activityRate,
        thresholdValue: 60,
        suggestion: '需要督促，了解工作状态',
        priority: 'medium',
      });
    }

    // 高效可承担：延期率 < 平均 × 0.5 且 负荷 < 平均
    if (member.delayRate < avgDelayRate * 0.5 && member.workload < avgWorkload) {
      suggestions.push({
        type: 'high_efficiency',
        targetId: member.id,
        targetName: member.name,
        targetTeam: member.team,
        currentValue: member.delayRate,
        thresholdValue: avgDelayRate * 0.5,
        suggestion: '可以承担更多任务',
        priority: 'low',
      });
    }
  });

  return suggestions.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}
```

---

## 阶段3: 模拟数据服务 (1天)

### Step 3.1: 创建模拟数据生成器

**文件**: `app/src/features/analytics/reports/data/mock-generator.ts`

```typescript
/**
 * 模拟数据生成器
 */

import { addDays, format } from 'date-fns';
import type {
  StatsCardData,
  PieChartDataItem,
  BarChartDataItem,
  ScatterChartDataItem,
  TrendData,
  MilestoneItem,
  TaskStatisticsItem,
  DelayedTaskItem,
  MemberDelayStatistic,
  AllocationSuggestion,
  MemberTaskItem,
  MemberEfficiencyItem,
  UserRole,
  StatsCardConfig,
} from '../types';
import { TASK_TYPES } from '../config/ui-constants';

/** 随机整数 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** 随机浮点数 */
function randomFloat(min: number, max: number, decimals: number = 1): number {
  return Number((Math.random() * (max - min) + min).toFixed(decimals));
}

/** 随机选择 */
function randomChoice<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}

/** 随机颜色 */
function randomColor(): string {
  const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
  return randomChoice(colors);
}

/** 延迟函数 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** 格式化值 */
function formatValue(value: number, format: 'number' | 'percent' | 'ratio'): string {
  if (format === 'percent') return `${value}%`;
  if (format === 'ratio') return `${value}:1`;
  return value.toLocaleString();
}

/** 生成统计数据 */
export function generateStatsData(config: StatsCardConfig[]): Record<string, StatsCardData> {
  const result: Record<string, StatsCardData> = {};

  config.forEach(card => {
    const value = randomInt(10, 100);
    const trend = randomFloat(-15, 15);

    result[card.key] = {
      value,
      displayValue: formatValue(value, card.format),
      trend,
      trendText: `${trend > 0 ? '+' : ''}${trend.toFixed(1)}% vs 上期`,
      trendDirection: trend > 0 ? 'up' : trend < 0 ? 'down' : 'stable',
    };
  });

  return result;
}

/** 生成饼图数据 */
export function generatePieChartData(items: string[]): PieChartDataItem[] {
  const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  let total = 0;
  const values = items.map(() => {
    const value = randomInt(10, 50);
    total += value;
    return value;
  });

  return items.map((name, index) => ({
    name,
    value: values[index],
    color: colors[index % colors.length],
    percentage: Math.round((values[index] / total) * 100),
  }));
}

/** 生成柱状图数据 */
export function generateBarChartData(items: string[]): BarChartDataItem[] {
  return items.map(name => ({
    name,
    values: { value: randomInt(10, 100) },
  }));
}

/** 生成趋势数据 */
export function generateTrendData(series: string[], days: number, startDate: Date): TrendData {
  const labels: string[] = [];
  const datasets = series.map(s => ({
    label: s,
    values: [] as number[],
    color: randomColor(),
  }));

  for (let i = 0; i < days; i++) {
    const date = addDays(startDate, i);
    labels.push(format(date, 'MM-dd'));

    datasets.forEach(dataset => {
      dataset.values.push(randomInt(5, 25));
    });
  }

  return { labels, datasets };
}

/** 生成散点图数据 */
export function generateScatterData(count: number): ScatterChartDataItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `item-${i}`,
    label: `成员${i + 1}`,
    x: randomInt(0, 20),
    y: randomInt(0, 100),
    size: randomInt(10, 30),
    color: randomColor(),
  }));
}

/** 生成里程碑数据 */
export function generateMilestones(count: number): MilestoneItem[] {
  const statuses: Array<'pending' | 'in_progress' | 'completed' | 'overdue'> = ['pending', 'in_progress', 'completed', 'overdue'];
  
  return Array.from({ length: count }, (_, i) => ({
    id: `milestone-${i}`,
    name: `里程碑 ${i + 1}`,
    projectName: `项目 ${randomInt(1, 10)}`,
    targetDate: format(addDays(new Date(), randomInt(-30, 60)), 'yyyy-MM-dd'),
    completionPercentage: randomInt(0, 100),
    status: randomChoice(statuses),
    totalTasks: randomInt(5, 20),
    completedTasks: randomInt(0, 15),
    daysToTarget: randomInt(-10, 30),
  }));
}

/** 生成任务统计数据 */
export function generateTaskStatisticsItems(count: number): TaskStatisticsItem[] {
  const statuses = ['not_started', 'in_progress', 'completed', 'delayed'];
  const priorities = ['urgent', 'high', 'medium', 'low'];
  
  return Array.from({ length: count }, (_, i) => ({
    id: `task-${i}`,
    wbsCode: `1.${randomInt(1, 5)}.${randomInt(1, 10)}`,
    description: `任务描述 ${i + 1}`,
    projectName: `项目 ${randomInt(1, 5)}`,
    assigneeName: `成员 ${randomInt(1, 10)}`,
    teamName: `组 ${randomInt(1, 3)}`,
    status: randomChoice(statuses),
    progress: randomInt(0, 100),
    taskType: randomChoice([...TASK_TYPES]),
    priority: randomChoice(priorities),
    plannedEndDate: format(addDays(new Date(), randomInt(-30, 30)), 'yyyy-MM-dd'),
    completedDate: Math.random() > 0.5 ? format(addDays(new Date(), randomInt(-30, 0)), 'yyyy-MM-dd') : null,
    riskLevel: randomChoice(['high', 'medium', 'low']),
  }));
}

/** 生成延期任务数据 */
export function generateDelayedTasks(count: number): DelayedTaskItem[] {
  const delayTypes: Array<'delay_warning' | 'delayed' | 'overdue_completed'> = ['delay_warning', 'delayed', 'overdue_completed'];
  const delayReasons = ['需求变更', '技术难度', '资源不足', '依赖阻塞', '其他'];
  
  return Array.from({ length: count }, (_, i) => ({
    id: `delayed-task-${i}`,
    wbsCode: `1.${randomInt(1, 5)}.${randomInt(1, 10)}`,
    description: `延期任务 ${i + 1}`,
    assigneeName: `成员 ${randomInt(1, 10)}`,
    teamName: `组 ${randomInt(1, 3)}`,
    projectName: `项目 ${randomInt(1, 5)}`,
    taskType: randomChoice([...TASK_TYPES]),
    plannedEndDate: format(addDays(new Date(), randomInt(-30, 0)), 'yyyy-MM-dd'),
    delayDays: randomInt(1, 30),
    delayType: randomChoice(delayTypes),
    delayReason: randomChoice(delayReasons),
    riskLevel: randomChoice(['high', 'medium', 'low']),
  }));
}

/** 生成成员延期统计 */
export function generateMemberDelayStats(count: number): MemberDelayStatistic[] {
  return Array.from({ length: count }, (_, i) => ({
    memberId: i + 1,
    memberName: `成员 ${i + 1}`,
    teamName: `组 ${randomInt(1, 3)}`,
    supervisorName: `主管 ${randomInt(1, 3)}`,
    totalTasks: randomInt(10, 30),
    delayedTasks: randomInt(0, 10),
    delayRate: randomFloat(0, 40),
    workload: randomFloat(50, 120),
    activityRate: randomFloat(40, 100),
    mainDelayType: randomChoice(['需求变更', '技术难度', '资源不足']),
    riskLevel: randomChoice(['high', 'medium', 'low']),
  }));
}

/** 生成分配建议 */
export function generateSuggestions(count: number): AllocationSuggestion[] {
  const types: Array<'overload' | 'idle' | 'low_activity' | 'high_efficiency'> = ['overload', 'idle', 'low_activity', 'high_efficiency'];
  
  return Array.from({ length: count }, (_, i) => ({
    type: randomChoice(types),
    targetId: i + 1,
    targetName: `成员 ${i + 1}`,
    targetTeam: `组 ${randomInt(1, 3)}`,
    currentValue: randomFloat(50, 150),
    thresholdValue: randomFloat(80, 100),
    suggestion: randomChoice(['减轻负担', '可以承担更多', '需要督促', '需要辅导']),
    priority: randomChoice(['high', 'medium', 'low']),
  }));
}

/** 生成成员任务数据 */
export function generateMemberTasks(count: number): MemberTaskItem[] {
  const statuses = ['not_started', 'in_progress', 'completed', 'delayed'];
  
  return Array.from({ length: count }, (_, i) => ({
    id: `member-task-${i}`,
    wbsCode: `1.${randomInt(1, 5)}.${randomInt(1, 10)}`,
    description: `成员任务 ${i + 1}`,
    projectName: `项目 ${randomInt(1, 5)}`,
    status: randomChoice(statuses),
    progress: randomInt(0, 100),
    fullTimeRatio: randomFloat(0.2, 1.5),
    taskType: randomChoice([...TASK_TYPES]),
    plannedEndDate: format(addDays(new Date(), randomInt(-30, 30)), 'yyyy-MM-dd'),
    plannedDuration: randomInt(3, 20),
    actualDuration: randomInt(2, 25),
    estimationAccuracy: randomFloat(50, 100),
    lastUpdated: format(addDays(new Date(), randomInt(-10, 0)), 'yyyy-MM-dd'),
  }));
}

/** 生成成员效能数据 */
export function generateMemberEfficiency(count: number): MemberEfficiencyItem[] {
  return Array.from({ length: count }, (_, i) => ({
    memberId: i + 1,
    memberName: `成员 ${i + 1}`,
    department: `部门 ${randomInt(1, 3)}`,
    techGroup: `组 ${randomInt(1, 5)}`,
    completedTasks: randomInt(10, 50),
    productivity: randomFloat(0.5, 2.5),
    estimationAccuracy: randomFloat(50, 100),
    reworkRate: randomFloat(0, 30),
    fulltimeUtilization: randomFloat(60, 120),
    activityRate: randomFloat(50, 100),
    efficiencyLevel: randomChoice(['high', 'medium', 'low']),
  }));
}

/** 获取时间范围天数 */
export function getTimeRangeDays(
  timeRangeType: string,
  startDate?: string,
  endDate?: string
): number {
  switch (timeRangeType) {
    case 'past_7_days': return 7;
    case 'past_30_days': return 30;
    case 'this_quarter': return 90;
    case 'custom':
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      }
      return 30;
    default:
      return 30;
  }
}

/** 获取开始日期 */
export function getStartDate(days: number): Date {
  return addDays(new Date(), -days);
}
```

---

### Step 3.2: 创建模拟数据服务

**文件**: `app/src/features/analytics/reports/data/mock-data.ts`

```typescript
/**
 * 模拟数据服务
 */

import type {
  UserRole,
  ReportFilters,
  ProjectProgressReportData,
  TaskStatisticsReportData,
  DelayAnalysisReportData,
  MemberAnalysisReportData,
  ResourceEfficiencyReportData,
} from '../types';
import { PROJECT_PROGRESS_CONFIG } from '../config/role-configs';
import {
  delay,
  generateStatsData,
  generatePieChartData,
  generateBarChartData,
  generateTrendData,
  generateScatterData,
  generateMilestones,
  generateTaskStatisticsItems,
  generateDelayedTasks,
  generateMemberDelayStats,
  generateSuggestions,
  generateMemberTasks,
  generateMemberEfficiency,
  getTimeRangeDays,
  getStartDate,
} from './mock-generator';

const MOCK_DELAY = 500;

export const mockReportService = {
  /** 获取项目进度报表 */
  async getProjectProgressReport(
    filters: ReportFilters,
    role: UserRole
  ): Promise<ProjectProgressReportData> {
    await delay(MOCK_DELAY);

    const days = getTimeRangeDays(filters.timeRangeType, filters.startDate, filters.endDate);

    return {
      stats: generateStatsData(PROJECT_PROGRESS_CONFIG[role].stats),
      dataScope: { role },
      statusDistribution: generatePieChartData(['未开始', '进行中', '已完成', '延期预警', '已延迟']),
      milestoneStatus: {
        completed: randomInt(5, 15),
        inProgress: randomInt(2, 8),
        pending: randomInt(3, 10),
        delayed: randomInt(0, 5),
      },
      milestones: generateMilestones(15),
      progressTrend: generateTrendData(['进度'], days, getStartDate(days)),
      projectTypeComparison: role === 'admin' ? generateBarChartData(['产品开发', '职能管理', '物料改代', '质量处理']) : undefined,
      departmentComparison: role === 'admin' ? generateBarChartData(['研发部', '测试部', '产品部']) : undefined,
      groupComparison: role !== 'admin' ? generateBarChartData(['组A', '组B', '组C']) : undefined,
    };
  },

  /** 获取任务统计报表 */
  async getTaskStatisticsReport(
    filters: ReportFilters,
    role: UserRole
  ): Promise<TaskStatisticsReportData> {
    await delay(MOCK_DELAY);

    const days = getTimeRangeDays(filters.timeRangeType, filters.startDate, filters.endDate);

    return {
      stats: generateStatsData(PROJECT_PROGRESS_CONFIG[role].stats),
      dataScope: { role },
      taskTypeDistribution: generatePieChartData(['固件开发', '板卡开发', '驱动开发', '接口开发', '其他']),
      priorityDistribution: generateBarChartData(['紧急', '高', '中', '低']),
      assigneeDistribution: generateBarChartData(
        role === 'tech_manager' ? ['张三', '李四', '王五'] : ['成员A', '成员B', '成员C', '成员D']
      ),
      taskTrend: generateTrendData(['新增', '完成', '延期'], days, getStartDate(days)),
      taskList: generateTaskStatisticsItems(30),
      departmentComparison: role === 'admin' ? generateBarChartData(['研发部', '测试部']) : undefined,
      groupComparison: role === 'dept_manager' ? generateBarChartData(['组A', '组B']) : undefined,
    };
  },

  /** 获取延期分析报表 */
  async getDelayAnalysisReport(
    filters: ReportFilters,
    role: UserRole
  ): Promise<DelayAnalysisReportData> {
    await delay(MOCK_DELAY);

    const days = getTimeRangeDays(filters.timeRangeType, filters.startDate, filters.endDate);

    return {
      stats: generateStatsData(PROJECT_PROGRESS_CONFIG[role].stats),
      dataScope: { role },
      delayTypeDistribution: generatePieChartData(['延期预警', '已延迟', '超期完成']),
      delayReasonDistribution: generateBarChartData(['需求变更', '技术难度', '资源不足', '依赖阻塞', '其他']),
      delayDistribution: generateBarChartData(
        role === 'admin' ? ['研发一组', '研发二组', '测试组', '产品组'] :
        role === 'dept_manager' ? ['组A', '组B', '组C'] :
        ['张三', '李四', '王五']
      ),
      memberWorkloadScatter: generateScatterData(10),
      memberActivityScatter: generateScatterData(10),
      delayTrend: generateTrendData(['延期任务'], days, getStartDate(days)),
      convergenceTrend: generateTrendData(['新增延期', '已解决'], days, getStartDate(days)),
      delayedTasks: generateDelayedTasks(20),
      memberDelayStats: generateMemberDelayStats(10),
      suggestions: generateSuggestions(5),
    };
  },

  /** 获取成员任务分析 */
  async getMemberAnalysisReport(
    filters: ReportFilters,
    role: UserRole
  ): Promise<MemberAnalysisReportData> {
    await delay(MOCK_DELAY);

    const days = getTimeRangeDays(filters.timeRangeType, filters.startDate, filters.endDate);

    return {
      stats: generateStatsData(PROJECT_PROGRESS_CONFIG[role].stats),
      dataScope: { role },
      workloadDistribution: generateBarChartData(['张三', '李四', '王五', '赵六']),
      statusDistribution: generatePieChartData(['未开始', '进行中', '已完成', '延期']),
      estimationAccuracyDistribution: generateBarChartData(['精准', '轻微偏差', '明显偏差', '严重偏差']),
      workloadTrend: generateTrendData(['负载'], days, getStartDate(days)),
      memberTasks: generateMemberTasks(25),
      groupEfficiencyComparison: role !== 'admin' ? generateBarChartData(['组A', '组B', '组C']) : undefined,
      suggestions: generateSuggestions(3),
    };
  },

  /** 获取资源效能分析 */
  async getResourceEfficiencyReport(
    filters: ReportFilters,
    role: UserRole
  ): Promise<ResourceEfficiencyReportData> {
    await delay(MOCK_DELAY);

    const days = getTimeRangeDays(filters.timeRangeType, filters.startDate, filters.endDate);

    return {
      stats: generateStatsData(PROJECT_PROGRESS_CONFIG[role].stats),
      dataScope: { role },
      productivityRanking: generateBarChartData(['张三', '李四', '王五', '赵六', '钱七']),
      estimationAccuracyDistribution: generateBarChartData(['≥90%', '70-90%', '50-70%', '<50%']),
      efficiencyScatter: generateScatterData(15),
      efficiencyTrend: generateTrendData(['效能'], days, getStartDate(days)),
      memberEfficiency: generateMemberEfficiency(20),
      groupEfficiencyComparison: role !== 'admin' ? generateBarChartData(['组A', '组B', '组C']) : undefined,
    };
  },
};

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
```

---

## 后续阶段

由于篇幅限制，后续阶段的详细代码将在实施时逐步创建：

- **阶段4**: 共享组件（StatsCards/Charts/Table）
- **阶段5**: 特有功能组件（分配建议/成员统计表）
- **阶段6**: 5个Tab组件
- **阶段7**: 主页面 + 筛选栏 + 导出功能
- **阶段8**: UI优化 + 测试

---

## 验证方式

1. 运行前端开发服务器
2. 访问报表分析页面
3. 验证各Tab数据加载正常
4. 验证角色差异化显示正确
5. 验证筛选功能正常
6. 验证导出功能正常

---

## 删除清单

重构完成后需要删除的旧文件：

```
app/src/features/analytics/reports/
├── components/
│   ├── index.ts
│   └── ReportTrendSection.tsx
├── tabs/
│   ├── index.ts
│   ├── ProjectProgressTab.tsx
│   ├── TaskStatisticsTab.tsx
│   ├── DelayAnalysisTab.tsx
│   ├── MemberAnalysisTab.tsx
│   └── ResourceEfficiencyTab.tsx
├── hooks/
│   └── useReportData.ts
├── constants/
│   ├── chartColors.ts
│   └── termDefinitions.ts
├── utils/
│   └── chartUtils.ts
├── types.ts
├── index.ts
└── ReportsPage.tsx
```
