# 报表分析模块重构设计文档

> **版本**: 1.0
> **日期**: 2026-04-09
> **状态**: 待审批

---

## 1. 概述

### 1.1 重构目标

根据 `REQ_07_INDEX.md` 和 `REQ_07b_reports.md` 系列文档，完全重写报表分析模块，实现：

1. **角色差异化**：admin / dept_manager / tech_manager 三种角色视图
2. **动态维度**：时间范围筛选 + 趋势图表
3. **完整数据表格**：排序、分页、状态颜色
4. **UI规范**：符合需求文档的配色、布局、交互规范

### 1.2 设计决策

| 决策项 | 选择 | 理由 |
|--------|------|------|
| 重构范围 | 完全重写 | 代码干净、完全符合需求 |
| 数据来源 | 先模拟数据 | 验证UI、降低风险 |
| 角色视图 | 组合模式 | 配置驱动、易扩展 |
| 动态维度 | 混合模式 | 兼顾简洁和灵活 |

---

## 2. 架构设计

### 2.1 目录结构

```
app/src/features/analytics/reports/
├── index.ts                    # 模块导出
├── ReportsPage.tsx             # 主页面
├── types/
│   ├── index.ts                # 类型导出
│   ├── report-types.ts         # 报表数据类型
│   ├── role-config.ts          # 角色配置类型
│   └── chart-types.ts          # 图表数据类型
├── config/
│   ├── index.ts                # 配置导出
│   ├── role-configs.ts         # 角色视图配置
│   ├── stats-config.ts         # 统计卡片配置
│   ├── charts-config.ts        # 图表配置
│   └── table-config.ts         # 表格配置
├── data/
│   ├── index.ts                # 数据导出
│   ├── mock-data.ts            # 模拟数据服务
│   └── mock-generator.ts       # 模拟数据生成器
├── hooks/
│   ├── index.ts                # Hooks导出
│   ├── useReportData.ts        # 数据获取Hook
│   └── useTimeRange.ts         # 时间范围Hook
├── components/
│   ├── index.ts                # 组件导出
│   ├── ReportFilterBar.tsx     # 筛选栏
│   ├── ReportStatsCards.tsx    # 统计卡片组
│   ├── ReportCharts.tsx        # 图表组
│   ├── ReportTable.tsx         # 数据表格
│   └── TimeRangeSelector.tsx   # 时间范围选择器
├── tabs/
│   ├── index.ts                # Tab导出
│   ├── ProjectProgressTab.tsx  # 项目进度报表
│   ├── TaskStatisticsTab.tsx   # 任务统计报表
│   ├── DelayAnalysisTab.tsx    # 延期分析报表
│   ├── MemberAnalysisTab.tsx   # 成员任务分析
│   └── ResourceEfficiencyTab.tsx # 资源效能分析
└── utils/
    ├── index.ts                # 工具导出
    ├── chart-utils.ts          # 图表工具函数
    ├── table-utils.ts          # 表格工具函数
    └── export-utils.ts         # 导出工具函数
```

### 2.2 数据流

```
┌─────────────────────────────────────────────────────────────────┐
│                         ReportsPage                              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    ReportFilterBar                       │    │
│  │  [项目] [时间范围] [负责人] [任务类型]  [刷新] [导出]     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              useReportData(filters, role)                │    │
│  │  ┌─────────────────┐    ┌─────────────────┐             │    │
│  │  │   mock-data.ts  │ or │   API (未来)    │             │    │
│  │  └─────────────────┘    └─────────────────┘             │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              ReportTab (根据Tab类型选择)                  │    │
│  │  ┌─────────────────────────────────────────────────┐    │    │
│  │  │  role-config.ts (配置驱动差异化)                  │    │    │
│  │  └─────────────────────────────────────────────────┘    │    │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │    │
│  │  │ StatsCards   │ │   Charts     │ │   Table      │    │    │
│  │  └──────────────┘ └──────────────┘ └──────────────┘    │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. 核心类型设计

### 3.1 角色配置类型

```typescript
// types/role-config.ts

/** 用户角色 */
export type UserRole = 'admin' | 'dept_manager' | 'tech_manager';

/** 统计卡片配置 */
export interface StatsCardConfig {
  /** 卡片标识 */
  key: string;
  /** 标题 */
  title: string;
  /** 数据字段路径 */
  dataPath: string;
  /** 格式化类型 */
  format: 'number' | 'percent' | 'ratio';
  /** 趋势字段路径（可选） */
  trendPath?: string;
  /** 颜色主题 */
  color?: 'default' | 'warning' | 'danger' | 'success';
}

/** 图表配置 */
export interface ChartConfig {
  /** 图表标识 */
  key: string;
  /** 图表标题 */
  title: string;
  /** 图表类型 */
  type: 'pie' | 'bar' | 'line' | 'scatter' | 'stacked-bar';
  /** 数据字段路径 */
  dataPath: string;
  /** 是否支持独立时间范围 */
  supportTimeRange?: boolean;
  /** 图表位置 */
  position: 'left' | 'right';
}

/** 表格列配置 */
export interface TableColumnConfig {
  /** 列标识 */
  key: string;
  /** 列标题 */
  title: string;
  /** 数据字段 */
  dataField: string;
  /** 列宽 */
  width?: number;
  /** 是否可排序 */
  sortable?: boolean;
  /** 格式化类型 */
  format?: 'text' | 'date' | 'number' | 'percent' | 'status' | 'risk';
  /** 颜色映射（状态类） */
  colorMap?: Record<string, string>;
}

/** 表格配置 */
export interface TableConfig {
  /** 表格标识 */
  key: string;
  /** 数据字段路径 */
  dataPath: string;
  /** 列配置 */
  columns: TableColumnConfig[];
  /** 默认排序字段 */
  defaultSortField?: string;
  /** 默认排序方向 */
  defaultSortDirection?: 'asc' | 'desc';
}

/** 报表视图配置 */
export interface ReportViewConfig {
  /** 角色标识 */
  role: UserRole;
  /** 统计卡片配置 */
  stats: StatsCardConfig[];
  /** 静态图表配置 */
  staticCharts: ChartConfig[];
  /** 动态图表配置（趋势） */
  dynamicCharts: ChartConfig[];
  /** 表格配置 */
  table: TableConfig;
  /** 对比维度（部门/组/成员） */
  comparisonDimension: 'department' | 'group' | 'member';
  /** 特有功能 */
  features?: string[];
}
```

### 3.2 报表数据类型

```typescript
// types/report-types.ts

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
  /** 时间标签 */
  labels: string[];
  /** 数据系列 */
  datasets: {
    label: string;
    values: number[];
    color: string;
  }[];
}

/** 报表基础响应 */
export interface ReportBaseResponse {
  /** 统计卡片数据 */
  stats: Record<string, StatsCardData>;
  /** 数据范围信息 */
  dataScope: {
    role: UserRole;
    departmentId?: number;
    techGroupId?: number;
  };
}

/** 项目进度报表响应 */
export interface ProjectProgressReportData extends ReportBaseResponse {
  /** 任务状态分布 */
  statusDistribution: PieChartDataItem[];
  /** 里程碑状态统计 */
  milestoneStatus: {
    completed: number;
    inProgress: number;
    pending: number;
    delayed: number;
  };
  /** 里程碑列表 */
  milestones: MilestoneItem[];
  /** 进度趋势 */
  progressTrend: TrendData;
  /** 项目类型对比（admin特有） */
  projectTypeComparison?: BarChartDataItem[];
  /** 部门进度对比（admin/dept_manager特有） */
  departmentComparison?: BarChartDataItem[];
  /** 组进度对比（dept_manager/tech_manager特有） */
  groupComparison?: BarChartDataItem[];
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

/** 任务统计报表响应 */
export interface TaskStatisticsReportData extends ReportBaseResponse {
  /** 任务类型分布 */
  taskTypeDistribution: PieChartDataItem[];
  /** 优先级分布 */
  priorityDistribution: BarChartDataItem[];
  /** 负责人分布 */
  assigneeDistribution: BarChartDataItem[];
  /** 任务趋势 */
  taskTrend: TrendData;
  /** 任务列表 */
  taskList: TaskStatisticsItem[];
  /** 部门对比（admin特有） */
  departmentComparison?: BarChartDataItem[];
  /** 组对比（dept_manager特有） */
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

/** 延期分析报表响应 */
export interface DelayAnalysisReportData extends ReportBaseResponse {
  /** 延期类型分布 */
  delayTypeDistribution: PieChartDataItem[];
  /** 延期原因分布 */
  delayReasonDistribution: BarChartDataItem[];
  /** 组/成员延期分布 */
  delayDistribution: BarChartDataItem[];
  /** 成员延期×负荷分布 */
  memberWorkloadScatter: ScatterChartDataItem[];
  /** 成员活跃度×延期率分布 */
  memberActivityScatter: ScatterChartDataItem[];
  /** 延期趋势 */
  delayTrend: TrendData;
  /** 收敛/扩散趋势 */
  convergenceTrend: TrendData;
  /** 延期任务列表 */
  delayedTasks: DelayedTaskItem[];
  /** 成员延期统计 */
  memberDelayStats: MemberDelayStatistic[];
  /** 分配建议 */
  suggestions: AllocationSuggestion[];
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

/** 成员任务分析响应 */
export interface MemberAnalysisReportData extends ReportBaseResponse {
  /** 成员负载分布 */
  workloadDistribution: BarChartDataItem[];
  /** 任务状态分布 */
  statusDistribution: PieChartDataItem[];
  /** 预估准确性分布 */
  estimationAccuracyDistribution: BarChartDataItem[];
  /** 成员负载趋势 */
  workloadTrend: TrendData;
  /** 成员任务列表 */
  memberTasks: MemberTaskItem[];
  /** 组效能对比（含活跃度） */
  groupEfficiencyComparison?: BarChartDataItem[];
  /** 分配建议 */
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

/** 资源效能分析响应 */
export interface ResourceEfficiencyReportData extends ReportBaseResponse {
  /** 产能排名 */
  productivityRanking: BarChartDataItem[];
  /** 预估准确性分布 */
  estimationAccuracyDistribution: BarChartDataItem[];
  /** 效能四象限 */
  efficiencyScatter: ScatterChartDataItem[];
  /** 效能趋势 */
  efficiencyTrend: TrendData;
  /** 成员效能列表 */
  memberEfficiency: MemberEfficiencyItem[];
  /** 组效能对比 */
  groupEfficiencyComparison?: BarChartDataItem[];
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
```

### 3.3 筛选参数类型

```typescript
// types/report-types.ts (续)

/** 时间范围选项 */
export type TimeRangeOption = 'past_7_days' | 'past_30_days' | 'this_quarter' | 'custom';

/** 报表筛选参数 */
export interface ReportFilters {
  /** 项目ID */
  projectId?: string;
  /** 成员ID */
  memberId?: number;
  /** 负责人ID */
  assigneeId?: number;
  /** 时间范围类型 */
  timeRangeType: TimeRangeOption;
  /** 自定义开始日期 */
  startDate?: string;
  /** 自定义结束日期 */
  endDate?: string;
  /** 延期类型 */
  delayType?: 'delay_warning' | 'delayed' | 'overdue_completed';
  /** 任务类型 */
  taskType?: string;
  /** 部门ID */
  departmentId?: number;
  /** 技术组ID */
  techGroupId?: number;
}

/** 图表独立时间范围 */
export interface ChartTimeRange {
  /** 图表标识 */
  chartKey: string;
  /** 是否使用自定义时间 */
  useCustom: boolean;
  /** 自定义时间范围 */
  customRange?: {
    startDate: string;
    endDate: string;
  };
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
```

---

## 4. 角色配置设计

### 4.1 配置结构

```typescript
// config/role-configs.ts

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

// 其他报表配置类似结构...
```

### 4.2 配置使用方式

```typescript
// tabs/ProjectProgressTab.tsx

function ProjectProgressTab({ filters }: ProjectProgressTabProps) {
  const { role } = useAuth();
  const config = PROJECT_PROGRESS_CONFIG[role];
  const { data, isLoading } = useProjectProgressReport(filters, role);

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <ReportStatsCards config={config.stats} data={data.stats} />

      <div className="grid grid-cols-2 gap-6">
        <ReportCharts config={config.staticCharts} data={data} />
        <ReportCharts config={config.dynamicCharts} data={data} supportTimeRange />
      </div>

      <ReportTable config={config.table} data={data.milestones} />
    </div>
  );
}
```

---

## 5. 组件设计

### 5.1 ReportFilterBar

```tsx
// components/ReportFilterBar.tsx

interface ReportFilterBarProps {
  /** 当前Tab */
  activeTab: ReportTabType;
  /** 筛选条件 */
  filters: ReportFilters;
  /** 筛选条件变更 */
  onFiltersChange: (filters: ReportFilters) => void;
  /** 刷新回调 */
  onRefresh: () => void;
  /** 导出回调 */
  onExport: () => void;
  /** 加载状态 */
  isLoading?: boolean;
  /** 项目列表 */
  projects: Array<{ id: string; name: string }>;
  /** 成员列表 */
  members: Array<{ id: number; name: string }>;
}

function ReportFilterBar({
  activeTab,
  filters,
  onFiltersChange,
  onRefresh,
  onExport,
  isLoading,
  projects,
  members,
}: ReportFilterBarProps) {
  // 根据Tab类型显示不同的筛选项
  const filterConfig = FILTER_CONFIG_BY_TAB[activeTab];

  return (
    <div className="bg-muted p-4 rounded-lg">
      <div className="flex flex-wrap items-center gap-4">
        {/* 项目筛选 */}
        {filterConfig.showProject && (
          <Select
            value={filters.projectId}
            onValueChange={(value) => onFiltersChange({ ...filters, projectId: value })}
            placeholder="选择项目"
          />
        )}

        {/* 时间范围 */}
        <TimeRangeSelector
          value={filters.timeRangeType}
          startDate={filters.startDate}
          endDate={filters.endDate}
          onChange={(timeRange) => onFiltersChange({ ...filters, ...timeRange })}
        />

        {/* 负责人筛选 */}
        {filterConfig.showAssignee && (
          <Select
            value={filters.assigneeId?.toString()}
            onValueChange={(value) => onFiltersChange({ ...filters, assigneeId: Number(value) })}
            placeholder="选择负责人"
          />
        )}

        {/* 任务类型筛选 */}
        {filterConfig.showTaskType && (
          <Select
            value={filters.taskType}
            onValueChange={(value) => onFiltersChange({ ...filters, taskType: value })}
            placeholder="选择任务类型"
          />
        )}

        {/* 延期类型筛选 */}
        {filterConfig.showDelayType && (
          <Select
            value={filters.delayType}
            onValueChange={(value) => onFiltersChange({ ...filters, delayType: value as any })}
            placeholder="选择延期类型"
          />
        )}

        <div className="flex-1" />

        {/* 操作按钮 */}
        <Button variant="outline" onClick={onRefresh} disabled={isLoading}>
          <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
          刷新
        </Button>

        <Button onClick={onExport} disabled={isLoading}>
          <Download className="w-4 h-4 mr-2" />
          导出Excel
        </Button>
      </div>
    </div>
  );
}
```

### 5.2 ReportStatsCards

```tsx
// components/ReportStatsCards.tsx

interface ReportStatsCardsProps {
  /** 卡片配置 */
  config: StatsCardConfig[];
  /** 数据 */
  data: Record<string, StatsCardData>;
}

function ReportStatsCards({ config, data }: ReportStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {config.map((card) => {
        const cardData = data[card.key];
        if (!cardData) return null;

        return (
          <Card key={card.key} className="p-4">
            <div className="text-sm text-muted-foreground mb-1">{card.title}</div>
            <div className="text-2xl font-bold font-mono tabular-nums">
              {cardData.displayValue}
              {card.format === 'percent' && '%'}
            </div>
            {cardData.trend !== undefined && (
              <div className={cn(
                'text-xs mt-1 flex items-center gap-1',
                cardData.trendDirection === 'up' && 'text-green-600',
                cardData.trendDirection === 'down' && 'text-red-600',
                cardData.trendDirection === 'stable' && 'text-gray-500'
              )}>
                {cardData.trendDirection === 'up' && <TrendingUp className="w-3 h-3" />}
                {cardData.trendDirection === 'down' && <TrendingDown className="w-3 h-3" />}
                {cardData.trendText}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
```

### 5.3 ReportCharts

```tsx
// components/ReportCharts.tsx

interface ReportChartsProps {
  /** 图表配置 */
  config: ChartConfig[];
  /** 数据 */
  data: any;
  /** 是否支持独立时间范围 */
  supportTimeRange?: boolean;
  /** 全局时间范围 */
  globalTimeRange?: TimeRangeOption;
  /** 图表独立时间范围 */
  chartTimeRanges?: ChartTimeRange[];
  /** 时间范围变更 */
  onChartTimeRangeChange?: (chartKey: string, range: ChartTimeRange) => void;
}

function ReportCharts({
  config,
  data,
  supportTimeRange,
  globalTimeRange,
  chartTimeRanges,
  onChartTimeRangeChange,
}: ReportChartsProps) {
  return (
    <div className="space-y-6">
      {config.map((chart) => {
        const chartData = getNestedValue(data, chart.dataPath);
        const timeRange = chartTimeRanges?.find(r => r.chartKey === chart.key);

        return (
          <Card key={chart.key}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">{chart.title}</CardTitle>
              {supportTimeRange && chart.supportTimeRange && (
                <ChartTimeRangeControl
                  chartKey={chart.key}
                  globalTimeRange={globalTimeRange}
                  customRange={timeRange}
                  onChange={onChartTimeRangeChange}
                />
              )}
            </CardHeader>
            <CardContent>
              {chart.type === 'pie' && <PieChart data={chartData} height={300} />}
              {chart.type === 'bar' && <BarChart data={chartData} height={300} />}
              {chart.type === 'line' && <TrendChart data={chartData} height={300} />}
              {chart.type === 'scatter' && <ScatterChart data={chartData} height={300} />}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
```

### 5.4 ChartTimeRangeControl

```tsx
// components/ChartTimeRangeControl.tsx

interface ChartTimeRangeControlProps {
  chartKey: string;
  globalTimeRange?: TimeRangeOption;
  customRange?: ChartTimeRange;
  onChange?: (chartKey: string, range: ChartTimeRange) => void;
}

function ChartTimeRangeControl({
  chartKey,
  globalTimeRange,
  customRange,
  onChange,
}: ChartTimeRangeControlProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = () => {
    if (customRange?.useCustom) {
      // 重置为全局时间
      onChange?.(chartKey, { chartKey, useCustom: false });
    } else {
      setIsExpanded(true);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {customRange?.useCustom ? (
        <Badge variant="secondary" className="text-xs">
          自定义时间
          <Button
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0 ml-1"
            onClick={() => onChange?.(chartKey, { chartKey, useCustom: false })}
          >
            <X className="w-3 h-3" />
          </Button>
        </Badge>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <Clock className="w-3 h-3 mr-1" />
          自定义时间
        </Button>
      )}

      {isExpanded && (
        <Popover open={isExpanded} onOpenChange={setIsExpanded}>
          <PopoverContent>
            <TimeRangePicker
              onChange={(range) => {
                onChange?.(chartKey, {
                  chartKey,
                  useCustom: true,
                  customRange: range,
                });
                setIsExpanded(false);
              }}
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
```

### 5.5 ReportTable

```tsx
// components/ReportTable.tsx

interface ReportTableProps<T> {
  /** 表格配置 */
  config: TableConfig;
  /** 数据 */
  data: T[];
  /** 行点击回调 */
  onRowClick?: (item: T) => void;
}

function ReportTable<T extends Record<string, any>>({
  config,
  data,
  onRowClick,
}: ReportTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const table = useReactTable({
    data,
    columns: config.columns.map(col => ({
      accessorKey: col.dataField,
      header: col.title,
      size: col.width,
      enableSorting: col.sortable,
      cell: ({ getValue }) => formatCellValue(getValue(), col.format, col.colorMap),
    })),
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <Card>
      <CardContent>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead
                    key={header.id}
                    style={{ width: header.getSize() }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {header.isPlaceholder ? null : flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                    {header.column.getIsSorted() && (
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map(row => (
              <TableRow
                key={row.id}
                onClick={() => onRowClick?.(row.original)}
                className="cursor-pointer hover:bg-muted/50"
              >
                {row.getVisibleCells().map(cell => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* 分页 */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            共 {table.getFilteredRowModel().rows.length} 条
          </div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious onClick={() => table.previousPage()} />
              </PaginationItem>
              {/* 页码 */}
              <PaginationItem>
                <PaginationNext onClick={() => table.nextPage()} />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## 6. UI 常量定义

### 6.1 统计卡片规范

```typescript
// config/ui-constants.ts

/** 统计卡片规范 */
export const STATS_CARD_SPEC = {
  /** 主数值字号 - 28px */
  valueFontSize: 'text-2xl',
  /** 主数值字体类 */
  valueFontClass: 'font-mono font-bold tabular-nums',
  /** 标签字号 - 12px */
  labelFontSize: 'text-xs',
  /** 标签颜色 */
  labelColor: 'text-muted-foreground',
  /** 卡片圆角 - 12px */
  borderRadius: 'rounded-lg',
  /** 卡片内边距 */
  padding: 'p-4',
  /** 卡片阴影 */
  shadow: 'shadow-sm hover:shadow-md transition-shadow',
} as const;
```

### 6.2 状态颜色

```typescript
// config/ui-constants.ts (续)

/** 状态颜色常量 */
export const STATUS_COLORS = {
  /** 成功/完成/正常 - 绿色 */
  success: '#22c55e',
  /** 警告/进行中 - 黄色 */
  warning: '#f59e0b',
  /** 危险/延期 - 红色 */
  danger: '#ef4444',
  /** 信息 - 蓝色 */
  info: '#3b82f6',
  /** 中性/待处理 - 灰色 */
  neutral: '#9ca3af',
} as const;

/** 延期类型颜色 */
export const DELAY_TYPE_COLORS = {
  /** 延期预警 - 黄色 */
  delay_warning: '#f59e0b',
  /** 已延迟 - 红色 */
  delayed: '#ef4444',
  /** 超期完成 - 橙色 */
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
```

### 6.3 图表规范

```typescript
// config/ui-constants.ts (续)

/** 图表规范 */
export const CHART_SPEC = {
  /** 图表高度 - 300px */
  height: 300,
  /** 图表配色 */
  colors: {
    primary: '#0EA5E9',
    success: '#22C55E',
    warning: '#F59E0B',
    danger: '#EF4444',
    purple: '#8B5CF6',
    pink: '#EC4899',
  },
  /** 网格线颜色 */
  gridColor: 'rgba(148, 163, 184, 0.2)',
  /** 动画时长 */
  animationDuration: 300,
} as const;

/** 里程碑状态颜色 */
export const MILESTONE_STATUS_COLORS = {
  pending: '#9ca3af',
  in_progress: '#3b82f6',
  completed: '#22c55e',
  overdue: '#ef4444',
} as const;
```

### 6.4 布局规范

```typescript
// config/ui-constants.ts (续)

/** 布局规范 */
export const LAYOUT_SPEC = {
  /** 区块间距 */
  sectionGap: 'space-y-6',
  /** 卡片间距 */
  cardGap: 'gap-4',
  /** 统计卡片网格 */
  statsGrid: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  /** 图表网格 */
  chartsGrid: 'grid grid-cols-1 lg:grid-cols-2',
  /** 筛选区域样式 */
  filterBar: 'bg-muted p-4 rounded-lg',
} as const;
```

---

## 7. 判断标准工具函数

### 7.1 风险等级判断

```typescript
// utils/judgment-utils.ts

import type { RiskLevel } from '../types';

/**
 * 判断延期风险等级
 * @see REQ_07b_reports.md §4.4
 */
export function getDelayRiskLevel(
  delayDays: number,
  delayCount: number
): RiskLevel {
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
export function getMemberRiskLevel(
  delayRate: number,
  activityRate: number
): RiskLevel {
  // 高风险：延期率 > 30% 或 (延期率 > 20% 且 活跃度 < 60%)
  if (delayRate > 30 || (delayRate > 20 && activityRate < 60)) return 'high';
  // 中风险：延期率 10%-30% 或 (延期率 > 10% 且 活跃度 < 60%)
  if (delayRate >= 10 || (delayRate > 10 && activityRate < 60)) return 'medium';
  // 低风险：延期率 < 10% 且 活跃度 ≥ 60%
  return 'low';
}
```

### 7.2 组状态判断

```typescript
// utils/judgment-utils.ts (续)

import type { GroupStatus } from '../types';

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
```

### 7.3 效能等级判断

```typescript
// utils/judgment-utils.ts (续)

import type { EfficiencyLevel } from '../types';

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
```

### 7.4 分配建议判断

```typescript
// utils/judgment-utils.ts (续)

import type { AllocationSuggestion } from '../types';

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

    // 低效延期：负荷 < 平均 × 0.8 且 延期率 > 平均
    if (member.workload < avgWorkload * 0.8 && member.delayRate > avgDelayRate) {
      suggestions.push({
        type: 'low_efficiency',
        targetId: member.id,
        targetName: member.name,
        targetTeam: member.team,
        currentValue: member.delayRate,
        thresholdValue: avgDelayRate,
        suggestion: '需要辅导，分析延期原因',
        priority: 'medium',
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

## 8. 特有功能组件

### 8.1 分配建议组件

```tsx
// components/AllocationSuggestions.tsx

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { AllocationSuggestion } from '../types';
import { cn } from '@/lib/utils';

interface AllocationSuggestionsProps {
  /** 建议列表 */
  suggestions: AllocationSuggestion[];
  /** 标题 */
  title?: string;
}

/** 建议类型标签 */
const SUGGESTION_TYPE_LABELS: Record<string, string> = {
  overload: '过载延期',
  low_efficiency: '低效延期',
  low_activity: '低活跃延期',
  high_efficiency: '高效可承担',
};

/** 建议类型图标 */
const SUGGESTION_TYPE_ICONS: Record<string, string> = {
  overload: '⚠️',
  low_efficiency: '⚡',
  low_activity: '📉',
  high_efficiency: '✅',
};

export function AllocationSuggestions({
  suggestions,
  title = '分配建议',
}: AllocationSuggestionsProps) {
  if (suggestions.length === 0) return null;

  // 按类型分组
  const groupedByType = suggestions.reduce((acc, item) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push(item);
    return acc;
  }, {} as Record<string, AllocationSuggestion[]>);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          💡 {title}
          <Badge variant="secondary" className="text-xs">
            {suggestions.length} 条建议
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {Object.entries(groupedByType).map(([type, items]) => (
          <div key={type} className="mb-4 last:mb-0">
            <div className="text-sm font-medium mb-2 flex items-center gap-2">
              <span>{SUGGESTION_TYPE_ICONS[type]}</span>
              <span>{SUGGESTION_TYPE_LABELS[type]}</span>
              <span className="text-muted-foreground">({items.length})</span>
            </div>
            <ul className="space-y-2">
              {items.map((item, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm p-2 rounded-lg bg-muted/50"
                >
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded text-xs font-medium shrink-0',
                      item.priority === 'high' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                      item.priority === 'medium' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
                      item.priority === 'low' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    )}
                  >
                    {item.targetName}
                    {item.targetTeam && ` (${item.targetTeam})`}
                  </span>
                  <span className="text-muted-foreground">{item.suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
```

### 8.2 成员延期统计表

```tsx
// components/MemberDelayStatsTable.tsx

import { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { MemberDelayStatistic } from '../types';
import { RISK_LEVEL_COLORS } from '../config/ui-constants';
import { cn } from '@/lib/utils';

interface MemberDelayStatsTableProps {
  /** 成员延期统计数据 */
  data: MemberDelayStatistic[];
  /** 行点击回调 */
  onRowClick?: (member: MemberDelayStatistic) => void;
}

export function MemberDelayStatsTable({
  data,
  onRowClick,
}: MemberDelayStatsTableProps) {
  const sortedData = useMemo(
    () => [...data].sort((a, b) => b.delayRate - a.delayRate),
    [data]
  );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>成员姓名</TableHead>
          <TableHead>所属组</TableHead>
          <TableHead>上级主管</TableHead>
          <TableHead className="text-right">总任务数</TableHead>
          <TableHead className="text-right">延期任务</TableHead>
          <TableHead className="text-right">延期率</TableHead>
          <TableHead className="text-right">任务负荷</TableHead>
          <TableHead className="text-right">活跃度</TableHead>
          <TableHead>风险等级</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedData.map((member) => (
          <TableRow
            key={member.memberId}
            onClick={() => onRowClick?.(member)}
            className="cursor-pointer hover:bg-muted/50"
          >
            <TableCell className="font-medium">{member.memberName}</TableCell>
            <TableCell>{member.teamName || '-'}</TableCell>
            <TableCell>{member.supervisorName || '-'}</TableCell>
            <TableCell className="text-right">{member.totalTasks}</TableCell>
            <TableCell className="text-right">{member.delayedTasks}</TableCell>
            <TableCell className="text-right">
              <span
                className={cn(
                  'font-medium',
                  member.delayRate > 20 && 'text-red-600',
                  member.delayRate > 10 && member.delayRate <= 20 && 'text-yellow-600'
                )}
              >
                {member.delayRate.toFixed(1)}%
              </span>
            </TableCell>
            <TableCell className="text-right">{member.workload.toFixed(1)}</TableCell>
            <TableCell className="text-right">
              <div className="flex items-center gap-2">
                <Progress value={member.activityRate} className="w-12 h-2" />
                <span className="text-xs text-muted-foreground">
                  {member.activityRate.toFixed(0)}%
                </span>
              </div>
            </TableCell>
            <TableCell>
              <Badge
                variant="outline"
                style={{ borderColor: RISK_LEVEL_COLORS[member.riskLevel], color: RISK_LEVEL_COLORS[member.riskLevel] }}
              >
                {member.riskLevel === 'high' && '高风险'}
                {member.riskLevel === 'medium' && '中风险'}
                {member.riskLevel === 'low' && '低风险'}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

---

## 9. 导出功能设计

### 9.1 导出工具函数

```typescript
// utils/export-utils.ts

import * as XLSX from 'xlsx';
import type { ReportTabType, ReportFilters } from '../types';

/** 导出文件命名 */
export function getExportFileName(reportType: ReportTabType): string {
  const typeNames: Record<ReportTabType, string> = {
    'project-progress': '项目进度报表',
    'task-statistics': '任务统计报表',
    'delay-analysis': '延期分析报表',
    'member-analysis': '成员任务分析',
    'resource-efficiency': '资源效能分析',
  };
  const date = new Date().toISOString().split('T')[0];
  return `${typeNames[reportType]}_${date}.xlsx`;
}

/** 导出报表数据 */
export async function exportReportData(
  reportType: ReportTabType,
  data: {
    stats: Record<string, any>;
    charts?: any[];
    table: any[];
  },
  filters?: ReportFilters
): Promise<void> {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: 统计卡片
  const statsData = Object.entries(data.stats).map(([key, value]) => ({
    指标: key,
    数值: value.displayValue || value.value,
    趋势: value.trendText || '-',
  }));
  const statsSheet = XLSX.utils.json_to_sheet(statsData);
  XLSX.utils.book_append_sheet(workbook, statsSheet, '统计摘要');

  // Sheet 2: 数据表格
  if (data.table && data.table.length > 0) {
    const tableSheet = XLSX.utils.json_to_sheet(data.table);
    XLSX.utils.book_append_sheet(workbook, tableSheet, '明细数据');
  }

  // Sheet 3: 筛选条件
  if (filters) {
    const filterData = [
      { 筛选项: '导出时间', 值: new Date().toLocaleString('zh-CN') },
      { 筛选项: '时间范围', 值: filters.timeRangeType || '全部' },
      { 筛选项: '项目', 值: filters.projectId || '全部' },
      { 筛选项: '负责人', 值: filters.assigneeId || '全部' },
    ];
    const filterSheet = XLSX.utils.json_to_sheet(filterData);
    XLSX.utils.book_append_sheet(workbook, filterSheet, '筛选条件');
  }

  // 导出文件
  const fileName = getExportFileName(reportType);
  XLSX.writeFile(workbook, fileName);
}
```

### 9.2 导出按钮组件

```tsx
// components/ExportButton.tsx

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { exportReportData, getExportFileName } from '../utils/export-utils';
import type { ReportTabType, ReportFilters } from '../types';

interface ExportButtonProps {
  /** 报表类型 */
  reportType: ReportTabType;
  /** 报表数据 */
  data: {
    stats: Record<string, any>;
    charts?: any[];
    table: any[];
  };
  /** 筛选条件 */
  filters?: ReportFilters;
  /** 禁用状态 */
  disabled?: boolean;
}

export function ExportButton({
  reportType,
  data,
  filters,
  disabled,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportReportData(reportType, data, filters);
    } catch (error) {
      console.error('导出失败:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="default"
      size="sm"
      onClick={handleExport}
      disabled={disabled || isExporting}
    >
      {isExporting ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <Download className="w-4 h-4 mr-2" />
      )}
      导出Excel
    </Button>
  );
}
```

---

## 10. 完整表格列定义

### 10.1 项目进度报表 - 里程碑列表

```typescript
// config/table-configs.ts

import type { TableConfig } from '../types';

/** 项目进度报表 - 里程碑列表配置 */
export const PROJECT_PROGRESS_TABLE_CONFIG: TableConfig = {
  key: 'milestones',
  dataPath: 'milestones',
  columns: [
    { key: 'name', title: '里程碑名称', dataField: 'name', width: 200, sortable: true, format: 'text' },
    { key: 'projectName', title: '所属项目', dataField: 'projectName', width: 150, sortable: true, format: 'text' },
    { key: 'targetDate', title: '目标日期', dataField: 'targetDate', width: 120, sortable: true, format: 'date' },
    { key: 'completionPercentage', title: '完成进度', dataField: 'completionPercentage', width: 100, sortable: true, format: 'percent' },
    { key: 'status', title: '状态', dataField: 'status', width: 100, sortable: true, format: 'status', colorMap: {
      pending: '#9ca3af',
      in_progress: '#3b82f6',
      completed: '#22c55e',
      overdue: '#ef4444',
    }},
    { key: 'daysToTarget', title: '距今天数', dataField: 'daysToTarget', width: 80, sortable: true, format: 'number' },
  ],
  defaultSortField: 'targetDate',
  defaultSortDirection: 'asc',
};
```

### 10.2 延期分析报表 - 延期任务列表

```typescript
// config/table-configs.ts (续)

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
    { key: 'delayType', title: '延期类型', dataField: 'delayType', width: 100, sortable: true, format: 'status', colorMap: {
      delay_warning: '#f59e0b',
      delayed: '#ef4444',
      overdue_completed: '#f97316',
    }},
    { key: 'delayReason', title: '延期原因', dataField: 'delayReason', width: 150, sortable: false, format: 'text' },
    { key: 'riskLevel', title: '风险等级', dataField: 'riskLevel', width: 80, sortable: true, format: 'risk', colorMap: {
      high: '#ef4444',
      medium: '#f59e0b',
      low: '#22c55e',
    }},
  ],
  defaultSortField: 'delayDays',
  defaultSortDirection: 'desc',
};
```

### 10.3 成员任务分析 - 成员任务列表

```typescript
// config/table-configs.ts (续)

/** 成员任务分析 - 成员任务列表配置 */
export const MEMBER_ANALYSIS_TABLE_CONFIG: TableConfig = {
  key: 'memberTasks',
  dataPath: 'memberTasks',
  columns: [
    { key: 'taskName', title: '任务名称', dataField: 'description', width: 200, sortable: true, format: 'text' },
    { key: 'wbsCode', title: 'WBS编码', dataField: 'wbsCode', width: 80, sortable: true, format: 'text' },
    { key: 'projectName', title: '所属项目', dataField: 'projectName', width: 120, sortable: true, format: 'text' },
    { key: 'status', title: '任务状态', dataField: 'status', width: 100, sortable: true, format: 'status', colorMap: {
      not_started: '#9ca3af',
      in_progress: '#3b82f6',
      completed: '#22c55e',
      delayed: '#ef4444',
    }},
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

## 11. 模拟数据设计

### 6.1 数据生成器

```typescript
// data/mock-generator.ts

/** 生成随机统计数据 */
export function generateStatsData(config: StatsCardConfig[]): Record<string, StatsCardData> {
  const result: Record<string, StatsCardData> = {};

  config.forEach(card => {
    const value = Math.floor(Math.random() * 100);
    const trend = Math.random() * 20 - 10;

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
    const value = Math.floor(Math.random() * 50) + 10;
    total += value;
    return value;
  });

  return items.map((name, index) => ({
    name,
    value: values[index],
    color: colors[index % colors.length],
    percentage: (values[index] / total) * 100,
  }));
}

/** 生成趋势数据 */
export function generateTrendData(
  series: string[],
  days: number,
  startDate: Date
): TrendData {
  const labels: string[] = [];
  const datasets = series.map(s => ({
    label: s,
    values: [] as number[],
    color: getRandomColor(),
  }));

  for (let i = 0; i < days; i++) {
    const date = addDays(startDate, i);
    labels.push(format(date, 'MM-dd'));

    datasets.forEach(dataset => {
      dataset.values.push(Math.floor(Math.random() * 20) + 5);
    });
  }

  return { labels, datasets };
}

/** 生成延期分析数据 */
export function generateDelayAnalysisData(role: UserRole): DelayAnalysisReportData {
  return {
    stats: generateStatsData(DELAY_ANALYSIS_CONFIG[role].stats),
    statusDistribution: [],
    dataScope: { role },
    delayTypeDistribution: generatePieChartData(['延期预警', '已延迟', '超期完成']),
    delayReasonDistribution: generateBarChartData([
      '需求变更', '技术难度', '资源不足', '依赖阻塞', '其他'
    ]),
    delayDistribution: generateBarChartData(
      role === 'admin' ? ['研发一组', '研发二组', '测试组', '产品组'] :
      role === 'dept_manager' ? ['组A', '组B', '组C'] :
      ['张三', '李四', '王五']
    ),
    memberWorkloadScatter: generateScatterData(10),
    memberActivityScatter: generateScatterData(10),
    delayTrend: generateTrendData(['延期任务'], 30, new Date()),
    convergenceTrend: generateTrendData(['新增延期', '已解决'], 30, new Date()),
    delayedTasks: generateDelayedTasks(20),
    memberDelayStats: generateMemberDelayStats(10),
    suggestions: generateSuggestions(5),
  };
}
```

### 6.2 模拟数据服务

```typescript
// data/mock-data.ts

const MOCK_DELAY = 500; // 模拟网络延迟

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
      statusDistribution: [],
      dataScope: { role },
      statusDistribution: generatePieChartData(['未开始', '进行中', '已完成', '延期预警', '已延迟']),
      milestoneStatus: {
        completed: Math.floor(Math.random() * 10) + 5,
        inProgress: Math.floor(Math.random() * 5) + 2,
        pending: Math.floor(Math.random() * 8) + 3,
        delayed: Math.floor(Math.random() * 3),
      },
      milestones: generateMilestones(15),
      progressTrend: generateTrendData(['进度'], days, getStartDate(days)),
      projectTypeComparison: role === 'admin' ? generateBarChartData([
        '产品开发', '职能管理', '物料改代', '质量处理'
      ]) : undefined,
      departmentComparison: role === 'admin' ? generateBarChartData([
        '研发部', '测试部', '产品部'
      ]) : undefined,
      groupComparison: role !== 'admin' ? generateBarChartData([
        '组A', '组B', '组C'
      ]) : undefined,
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
      stats: generateStatsData(TASK_STATISTICS_CONFIG[role].stats),
      statusDistribution: [],
      dataScope: { role },
      taskTypeDistribution: generatePieChartData(TASK_TYPES),
      priorityDistribution: generateBarChartData(['紧急', '高', '中', '低']),
      assigneeDistribution: generateBarChartData(
        role === 'tech_manager' ? ['张三', '李四', '王五'] :
        ['成员A', '成员B', '成员C', '成员D']
      ),
      taskTrend: generateTrendData(['新增', '完成', '延期'], days, getStartDate(days)),
      taskList: generateTaskStatisticsItems(30),
      departmentComparison: role === 'admin' ? generateBarChartData(['研发部', '测试部']) : undefined,
      groupComparison: role === 'dept_manager' ? generateBarChartData(['组A', '组B']) : undefined,
    };
  },

  // 其他报表方法...
};
```

---

## 12. 实施计划

### 12.1 阶段划分

| 阶段 | 内容 | 预计工作量 | 依赖 |
|------|------|-----------|------|
| **阶段1** | 类型定义 + 配置结构 + UI常量 | 1天 | - |
| **阶段2** | 判断标准工具函数 | 0.5天 | 阶段1 |
| **阶段3** | 模拟数据服务 | 1天 | 阶段1, 2 |
| **阶段4** | 共享组件（StatsCards/Charts/Table） | 1.5天 | 阶段1, 3 |
| **阶段5** | 特有功能组件（分配建议/成员统计表） | 1天 | 阶段4 |
| **阶段6** | 5个Tab组件 | 2天 | 阶段4, 5 |
| **阶段7** | 主页面 + 筛选栏 + 导出功能 | 1天 | 阶段6 |
| **阶段8** | UI优化 + 测试 | 1天 | 阶段7 |

**总计**: 约 9 天

### 12.2 详细任务清单

#### 阶段1: 类型定义 + 配置结构 + UI常量

- [ ] 创建 `types/index.ts` - 类型导出
- [ ] 创建 `types/report-types.ts` - 报表数据类型
- [ ] 创建 `types/role-config.ts` - 角色配置类型
- [ ] 创建 `types/chart-types.ts` - 图表数据类型
- [ ] 创建 `config/ui-constants.ts` - UI常量定义
- [ ] 创建 `config/role-configs.ts` - 角色视图配置
- [ ] 创建 `config/table-configs.ts` - 表格列配置

#### 阶段2: 判断标准工具函数

- [ ] 创建 `utils/judgment-utils.ts`
- [ ] 实现 `getDelayRiskLevel` - 延期风险等级判断
- [ ] 实现 `getMemberRiskLevel` - 成员风险等级判断
- [ ] 实现 `getGroupStatus` - 组状态判断
- [ ] 实现 `getEfficiencyLevel` - 效能等级判断
- [ ] 实现 `generateAllocationSuggestions` - 分配建议生成

#### 阶段3: 模拟数据服务

- [ ] 创建 `data/mock-generator.ts` - 数据生成器
- [ ] 创建 `data/mock-data.ts` - 模拟数据服务
- [ ] 实现 5 种报表的模拟数据生成

#### 阶段4: 共享组件

- [ ] 创建 `components/ReportStatsCards.tsx`
- [ ] 创建 `components/ReportCharts.tsx`
- [ ] 创建 `components/ReportTable.tsx`
- [ ] 创建 `components/TimeRangeSelector.tsx`
- [ ] 创建 `components/ChartTimeRangeControl.tsx`

#### 阶段5: 特有功能组件

- [ ] 创建 `components/AllocationSuggestions.tsx`
- [ ] 创建 `components/MemberDelayStatsTable.tsx`
- [ ] 创建 `components/ExportButton.tsx`

#### 阶段6: 5个Tab组件

- [ ] 创建 `tabs/ProjectProgressTab.tsx`
- [ ] 创建 `tabs/TaskStatisticsTab.tsx`
- [ ] 创建 `tabs/DelayAnalysisTab.tsx`
- [ ] 创建 `tabs/MemberAnalysisTab.tsx`
- [ ] 创建 `tabs/ResourceEfficiencyTab.tsx`

#### 阶段7: 主页面 + 筛选栏 + 导出功能

- [ ] 创建 `components/ReportFilterBar.tsx`
- [ ] 创建 `hooks/useReportData.ts`
- [ ] 创建 `hooks/useTimeRange.ts`
- [ ] 创建 `utils/export-utils.ts`
- [ ] 创建 `ReportsPage.tsx`

#### 阶段8: UI优化 + 测试

- [ ] UI细节优化（颜色、间距、动画）
- [ ] 响应式适配
- [ ] 功能测试
- [ ] 删除旧文件

### 12.3 删除清单

重构时需要删除的旧文件：

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
├── types.ts
├── index.ts
└── ReportsPage.tsx
```

---

## 13. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 模拟数据与真实API差异大 | 对接困难 | 按需求文档定义类型，确保一致性 |
| 角色配置过于复杂 | 维护困难 | 提取公共配置，使用继承/组合 |
| 图表性能问题 | 用户体验差 | 虚拟滚动、数据聚合、懒加载 |
| 时间范围状态混乱 | 数据不一致 | 明确状态管理规则，全局优先 |
| 导出功能兼容性 | 部分浏览器不支持 | 使用 SheetJS 库，兼容性好 |

---

## 版本历史

| 版本 | 日期 | 变更内容 |
|------|------|---------|
| v1.0 | 2026-04-09 | 初始设计文档 |
| v1.1 | 2026-04-09 | 补充：UI常量定义、判断标准工具函数、特有功能组件、导出功能设计、完整表格列定义、详细任务清单 |
