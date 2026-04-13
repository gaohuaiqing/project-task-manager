// app/server/src/modules/analytics/types.ts

// ============ 趋势指标相关 ============

export interface TrendIndicator {
  value: number;           // 当前值
  previousValue: number;   // 上期值
  change: number;          // 变化量
  changePercent: number;   // 变化百分比（保留1位小数）
  direction: 'up' | 'down' | 'flat';  // 趋势方向
  isPositive: boolean;     // 是否为正向变化
}

export interface StatsWithTrend {
  current: number;
  trend: TrendIndicator;
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

// ============ 仪表板统计相关 ============

export interface DashboardStats {
  // 项目统计
  total_projects: number;
  active_projects: number;
  completed_projects: number;

  // 任务统计（按状态细分）
  total_tasks: number;
  pending_tasks: number;        // not_started
  in_progress_tasks: number;    // in_progress
  completed_tasks: number;      // early_completed + on_time_completed + overdue_completed
  delay_warning_tasks: number;  // delay_warning
  overdue_tasks: number;        // delayed

  // 其他统计
  total_members: number;
  avg_progress: number;
}

export interface TrendDataPoint {
  date: string;
  created: number;
  completed: number;
  delayed: number;
}

export interface ProjectProgressItem {
  project_id: string;
  project_name: string;
  status: string;
  progress: number;
  total_tasks: number;
  completed_tasks: number;
  deadline: string | null;
  members: MemberInfo[];
}

export interface MemberInfo {
  id: number;
  name: string;
  avatar: string | null;
}

export interface UrgentTask {
  id: string;
  description: string;
  project_name: string;
  assignee_name: string;
  end_date: string | null;
  priority: string;
}

// ============ 报表相关 ============

export interface ProjectProgressReport {
  project_id: string;
  project_name: string;
  progress: number;
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;  // 进行中任务数（需求文档要求）
  status_distribution: StatusDistributionItem[];  // 任务状态分布（需求文档要求）
  milestones: MilestoneProgress[];
}

export interface StatusDistributionItem {
  status: string;
  count: number;
}

export interface MilestoneProgress {
  id: string;
  name: string;
  target_date: Date;
  completion_percentage: number;
  status: string;
}

export interface TaskStatisticsReport {
  total_tasks: number;
  avg_completion_rate: number;
  delay_rate: number;
  urgent_count: number;
  priority_distribution: Record<string, number>;
  assignee_distribution: AssigneeTaskCount[];
  task_type_distribution: TaskTypeDistributionItem[];  // v1.2 新增：任务类型分布
  task_list: TaskStatisticsItem[];  // 任务明细列表（需求文档要求）
}

export interface TaskStatisticsItem {
  id: string;
  description: string;
  project_name: string;
  assignee_name: string;
  status: string;
  progress: number;
  priority: string;
  planned_end_date: string | null;
}

export interface AssigneeTaskCount {
  assignee_id: number;
  assignee_name: string;
  task_count: number;
  completed_count: number;
  delayed_count: number;
}

// ============ 任务类型分布（v1.2 新增） ============

export interface TaskTypeDistributionItem {
  task_type: string;
  task_type_name: string;  // 中文名称
  count: number;
  completed_count: number;
  delayed_count: number;
  completion_rate: number;  // 完成率(%)
  delay_rate: number;      // 延期率(%)
  avg_duration: number;    // 平均工期
}

export interface TaskTypeStats {
  task_type: string;
  count: number;
  completed: number;
  delayed: number;
  avg_duration: number;
}

export interface DelayAnalysisReport {
  total_delayed: number;
  warning_count: number;
  delayed_count: number;
  overdue_completed_count: number;
  delay_reasons: DelayReasonCount[];
  delay_trend: TrendDataPoint[];
  delayed_tasks: DelayedTaskItem[];  // 延期任务列表（需求文档要求）
}

export interface DelayedTaskItem {
  id: string;
  description: string;
  project_name: string;
  assignee_name: string;
  delay_type: string;
  delay_days: number;
  reason: string;
  status: string;
}

export interface DelayReasonCount {
  reason: string;
  count: number;
}

export interface MemberAnalysisReport {
  member_id: number;
  member_name: string;
  current_tasks: number;
  total_full_time_ratio: number;
  avg_completion_rate: number;
  capability_match?: number;
  task_list: MemberTask[];
  capabilities?: CapabilityDisplay[];
  estimation_accuracy?: EstimationAccuracyStats;  // v1.2 新增：预估准确性统计
}

export interface MemberTask {
  id: string;
  description: string;
  project_name: string;
  status: string;
  progress: number;
  full_time_ratio: number;
  planned_duration?: number;  // 计划工期（v1.2 新增）
  actual_duration?: number;   // 实际工期（v1.2 新增）
  estimation_accuracy?: number;  // 预估准确性（v1.2 新增）
}

// ============ 预估准确性相关（v1.2 新增） ============

export interface EstimationAccuracyStats {
  accurate_count: number;      // 精准数量（±10%）
  slight_deviation_count: number;  // 轻微偏差数量（±10-30%）
  obvious_deviation_count: number;  // 明显偏差数量（±30-50%）
  serious_deviation_count: number;  // 严重偏差数量（>±50%）
  avg_accuracy: number;  // 平均预估准确性
}

export interface CapabilityDisplay {
  model_name: string;
  dimension_scores: string; // "维度1:分数 | 维度2:分数"
  overall_score: number;
}

// ============ 报表筛选条件 ============

export interface ReportQueryOptions {
  project_id?: string;
  start_date?: string;
  end_date?: string;
  assignee_id?: number;
  member_id?: number;
  delay_type?: 'delay_warning' | 'delayed' | 'overdue_completed';
  task_type?: string;  // v1.2 新增：任务类型筛选
}

// ============ 系统配置相关 ============

export interface ProjectTypeConfig {
  code: string;
  name: string;
  description?: string;
}

export interface TaskTypeConfig {
  code: string;
  name: string;
  description?: string;
}

export interface HolidayConfig {
  date: string;
  name: string;
  type: 'legal' | 'company' | 'workday';
}

// ============ 审计日志相关 ============

export interface AuditLog {
  id: string;
  user_id: number;
  action: string;
  table_name: string;
  record_id: string;
  old_value: string | null;
  new_value: string | null;
  ip_address: string | null;
  created_at: Date;
  // 关联信息
  user_name?: string;
}

export interface AuditLogQueryOptions {
  user_id?: number;
  action?: string;
  table_name?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  pageSize?: number;
}

// ============ 导入导出相关 ============

export type ExportFormat = 'xlsx' | 'csv' | 'json';

export interface ExportOptions {
  format: ExportFormat;
  fields?: string[];
  filters?: ReportQueryOptions;
}

export interface ImportResult {
  success: boolean;
  total: number;
  succeeded: number;
  failed: number;
  errors?: ImportError[];
}

export interface ImportError {
  row: number;
  field: string;
  message: string;
}

// ============ 成员分析扩展（支持多成员对比） ============

export interface MemberAnalysisExtendedResponse {
  // 统计卡片数据
  total_members: number;
  avg_load: number;
  avg_estimation_accuracy: number;
  overloaded_members: number;
  department_activity_rate: number;

  // 各成员汇总（对比视图核心数据）
  members_summary: MemberSummaryItem[];

  // 分布图表数据
  workload_distribution: WorkloadDistributionItem[];
  status_distribution: StatusDistributionItem[];
  estimation_distribution: EstimationDistributionItem[];

  // 趋势数据
  workload_trend: WorkloadTrendPoint[];

  // 任务明细（单成员模式下完整列表）
  member_tasks: MemberTask[];

  // 分配建议
  suggestions: AllocationSuggestionItem[];
}

export interface MemberSummaryItem {
  member_id: number;
  member_name: string;
  department: string | null;
  current_tasks: number;
  total_full_time_ratio: number;
  avg_completion_rate: number;
  estimation_accuracy: number;
  activity_rate: number;  // 7日内活跃任务占比
}

export interface WorkloadDistributionItem {
  member_name: string;
  task_count: number;
  full_time_ratio: number;
}

export interface EstimationDistributionItem {
  category: string;  // '精准' | '轻微偏差' | '明显偏差' | '严重偏差'
  count: number;
}

export interface WorkloadTrendPoint {
  period: string;        // "2026-W14"
  avg_full_time_ratio: number;
  task_count: number;
}

export interface AllocationSuggestionItem {
  type: 'overloaded' | 'idle' | 'rebalance';
  member_name: string;
  current_load: number;
  suggestion: string;
}

// 成员分析查询选项
export interface MemberAnalysisQueryOptions {
  member_id?: number;
  start_date?: string;
  end_date?: string;
}

// ============ 资源效能分析报表（v1.2 新增） ============

export interface ResourceEfficiencyReport {
  // 汇总统计
  avg_productivity: number;        // 平均产能
  avg_estimation_accuracy: number; // 平均预估准确性
  avg_rework_rate: number;         // 平均返工率
  avg_fulltime_utilization: number; // 全职比利用率

  // 成员效能明细
  member_efficiency_list: MemberEfficiencyItem[];

  // 产能趋势（按周/月）
  productivity_trend: ProductivityTrendItem[];

  // 团队效能对比（按部门/技术组）
  team_efficiency_comparison: TeamEfficiencyItem[];
}

export interface MemberEfficiencyItem {
  member_id: number;
  member_name: string;
  department?: string;
  tech_group?: string;
  completed_tasks: number;          // 完成任务数
  productivity: number;             // 产能
  estimation_accuracy: number;      // 预估准确性
  rework_rate: number;              // 返工率
  fulltime_utilization: number;     // 全职比利用率
  avg_task_complexity: number;      // 平均任务复杂度
}

export interface ProductivityTrendItem {
  period: string;        // 周期标识（如 "2026-W14"）
  productivity: number;  // 产能
  task_count: number;    // 完成任务数
}

export interface TeamEfficiencyItem {
  team_name: string;     // 部门/技术组名称
  team_type: 'department' | 'tech_group';
  member_count: number;  // 成员数
  avg_productivity: number;
  avg_estimation_accuracy: number;
  avg_rework_rate: number;
}

// 资源效能筛选条件
export interface ResourceEfficiencyQueryOptions extends ReportQueryOptions {
  department_id?: number;
  tech_group_id?: number;
  productivity_threshold?: number;
}

// ============ 仪表板 Detail API（按角色聚合） ============

// --- Admin Detail 子类型 ---

export interface DepartmentEfficiencyItem {
  id: number;
  name: string;
  completion_rate: number;
  delay_rate: number;
  utilization_rate: number;
  activity: number;
  trend: number;
  status: 'healthy' | 'warning' | 'risk';
}

export interface DepartmentDelayTrendPoint {
  date: string;
  [dept_name: string]: string | number;
}

export interface UtilizationTrendPoint {
  date: string;
  utilization: number;
  target?: number;
}

export interface HighRiskProjectItem {
  id: string;
  name: string;
  risk_factors: string[];
  completion_rate: number;
  delayed_tasks: number;
  manager: string;
}

export interface AdminDashboardDetailResponse {
  department_efficiency: DepartmentEfficiencyItem[];
  task_type_distribution: TaskTypeDistributionItem[];
  allocation_suggestions: AllocationSuggestionItem[];
  department_delay_trends: DepartmentDelayTrendPoint[];
  utilization_trends: UtilizationTrendPoint[];
  high_risk_projects: HighRiskProjectItem[];
}

// --- DeptManager Detail 子类型 ---

export interface GroupEfficiencyItem {
  id: number;
  name: string;
  completion_rate: number;
  delay_rate: number;
  load_rate: number;
  activity: number;
  member_count: number;
  trend: number;
  status: 'healthy' | 'warning' | 'risk';
}

export interface MemberStatusItem {
  id: number;
  name: string;
  avatar: string | null;
  in_progress: number;
  completed: number;
  delayed: number;
  load_rate: number;
  activity: number;
  trend: number;
  status: 'healthy' | 'warning' | 'risk' | 'idle';
}

export interface GroupActivityTrendPoint {
  date: string;
  [group_name: string]: string | number;
}

export interface DeptManagerDashboardDetailResponse {
  group_efficiency: GroupEfficiencyItem[];
  member_status: MemberStatusItem[];
  task_type_distribution: TaskTypeDistributionItem[];
  allocation_suggestions: AllocationSuggestionItem[];
  group_activity_trends: GroupActivityTrendPoint[];
}

// --- TechManager Detail 子类型 ---

export interface MemberActivityTrendPoint {
  date: string;
  [member_name: string]: string | number;
}

export interface TechManagerDashboardDetailResponse {
  member_status: MemberStatusItem[];
  task_type_distribution: TaskTypeDistributionItem[];
  allocation_suggestions: AllocationSuggestionItem[];
  available_groups: Array<{ id: number; name: string }>;
  member_activity_trends: MemberActivityTrendPoint[];
}

// --- Engineer Detail 子类型 ---

export interface TodoTaskItem {
  id: string;
  name: string;
  project_name: string;
  due_date: string | null;
  progress: number;
  priority: string;
  days_overdue?: number;
  last_updated?: string;
}

export interface EngineerDashboardDetailResponse {
  todo_tasks: TodoTaskItem[];
  need_update_tasks: TodoTaskItem[];
  task_status_distribution: StatusDistributionItem[];
}
