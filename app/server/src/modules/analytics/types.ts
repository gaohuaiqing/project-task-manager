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
  active_projects: number;      // planning + in_progress（含历史 active 值兼容）
  delayed_projects: number;     // delayed
  completed_projects: number;

  // 任务统计（按状态细分）
  total_tasks: number;          // 全部任务数
  total_root_tasks: number;     // 根任务数（wbs_level=1）
  pending_approval_tasks: number;  // pending_approval
  pending_tasks: number;        // not_started
  in_progress_tasks: number;    // in_progress
  completed_tasks: number;      // early_completed + on_time_completed + overdue_completed
  delay_warning_tasks: number;  // delay_warning
  overdue_tasks: number;        // delayed
  unassigned_tasks: number;     // assignee_id IS NULL

  // 其他统计
  total_members: number;
  avg_progress: number;         // 项目平均进度百分比
  activity_rate: number;        // 活跃度：7日内有更新的任务占比（百分比）
  utilization_rate: number;     // 资源利用率：成员平均工作负荷比率
  week_due_tasks: number;       // 本周到期：未来7天到期的未完成任务数
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

/** 项目进度汇总报表（多项目对比视图） */
export interface ProjectProgressSummary {
  // 整体统计卡片
  total_projects: number;
  active_projects: number;
  completed_projects: number;
  avg_progress: number;
  delayed_projects: number;

  // 各项目进度列表
  projects: ProjectProgressItem[];

  // 整体任务状态分布
  status_distribution: StatusDistributionItem[];

  // 近期里程碑时间线
  upcoming_milestones: MilestoneProgress[];

  // 进度趋势（近30天）
  progress_trend?: TimeSeriesPoint[];
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
  total_tasks: number;                    // 全部任务数
  total_root_tasks: number;               // 根任务数（wbs_level=1）
  avg_completion_rate: number;
  delay_rate: number;
  urgent_count: number;
  priority_distribution: Record<string, number>;      // 优先级分布（基于根任务）
  assignee_distribution: AssigneeTaskCount[];
  status_distribution: StatusDistributionItem[];       // 任务状态分布（互斥状态分类）
  task_type_distribution: TaskTypeDistributionItem[]; // 任务类型分布（基于根任务）
  task_list: TaskStatisticsItem[];  // 任务明细列表（需求文档要求）
  task_trend?: TrendDataPoint[];    // v1.3 新增：任务趋势数据（最近30天）
}

export interface TaskStatisticsItem {
  id: string;
  description: string;
  wbs_code: string | null;           // WBS编码
  project_name: string;
  assignee_name: string;
  status: string;
  progress: number;
  priority: string;
  planned_end_date: string | null;
  task_type: string;                 // 任务类型
  delay_days: number;                // 延期天数
  activity_rate: number;             // 活跃度 (0-100)
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

/** 当前已延期的责任人统计（图表①：当前延期任务数 + 历史延期次数） */
export interface DelayedMemberStat {
  assignee_id: number;
  assignee_name: string;
  /** 当前延期任务数（基于日期实时判定，不依赖 status 字段） */
  delayed_task_count: number;
  /** 历史延期次数 = 该责任人所有任务 delay_count 之和 */
  total_delay_count: number;
}

/** 延期预警责任人统计（图表②） */
export interface WarningMemberStat {
  assignee_id: number;
  assignee_name: string;
  /** 预警任务数（基于日期实时判定，不依赖 status 字段） */
  warning_task_count: number;
}

/** T1：各部门（技术组）延期对比统计 */
export interface DepartmentDelayStat {
  dept_id: number;
  dept_name: string;
  total_tasks: number;
  delayed_count: number;
  delay_rate: number;            // 百分比 0-100
  avg_delay_days: number;
  total_delay_count: number;     // 累计延期次数（SUM delay_count）
  plan_change_count: number;
  /** 计划变更率 = plan_change_count / total_tasks（保留2位小数，"次/任务"语义） */
  plan_change_rate: number;
  /** 累计延期率 = total_delay_count / total_tasks（保留2位小数） */
  avg_delay_per_task: number;
  /** v2: 本期vs上期延期数变化（含已完成） */
  improvement_delta: number;
  /** v2: 改善方向 */
  improvement_direction: 'improving' | 'worsening' | 'flat';
}

/** P1：成员延期排名（增强列，区别于 DelayedMemberStat） */
export interface MemberDelayStat {
  assignee_id: number;
  assignee_name: string;
  delayed_task_count: number;    // 当前延期任务数
  total_delay_count: number;     // 累计延期次数
  plan_change_count: number;
  avg_delay_days: number;
  /** assignee 所属部门 id（未分配=0，便于前端按 dept_manager 选组下钻筛选） */
  dept_id: number;
  /** v2: 用于改善之星排行（本期vs上期延期数变化，含已完成） */
  improvement_delta: number;
}

/** T6：项目延期统计 */
export interface ProjectDelayStat {
  project_id: string;
  project_name: string;
  total_tasks: number;
  delayed_count: number;
  delay_rate: number;
  /** v2: 本期vs上期延期数变化（含已完成） */
  improvement_delta: number;
  /** v2: 改善方向 */
  improvement_direction: 'improving' | 'worsening' | 'flat';
}

/** T7：任务类型延期统计 */
export interface TaskTypeDelayStat {
  task_type: string;
  total_tasks: number;
  delayed_count: number;
  delay_rate: number;
}

/** T3：延期严重度分布 */
export interface SeverityDistribution {
  mild: number;       // <7天
  moderate: number;   // 7-30天
  severe: number;     // >30天
  avg_delay_days: number;
}

/** T8：预估偏差 */
export interface EstimationDeviation {
  avg_deviation_days: number;    // 实际-计划均值（完成延期任务）
  accurate: number;              // ±10%
  slight: number;                // 10-30%
  obvious: number;               // 30-50%
  serious: number;               // >50%
  sample_count: number;          // 样本量（完成延期任务数）
}

/** T5：改善环比 */
export interface ImprovementTrend {
  current_delayed: number;       // 本期新增延期
  previous_delayed: number;      // 上期新增延期
  delta: number;                 // current - previous
  direction: 'improving' | 'worsening' | 'flat';
}

/** P5：成员个人趋势（单成员时间序列） */
export interface MemberTrendPoint {
  assignee_id: number;
  assignee_name: string;
  points: { date: string; delayed: number }[];
}

/** P2：原因×责任人交叉单元 */
export interface ReasonMemberCell {
  reason: string;
  assignee_id: number;
  assignee_name: string;
  count: number;
}

/** v2: 报表顶部统计总览（本期 vs 上期，范围汇总 + 个人层） */
export interface StatsOverview {
  // 团队层（范围汇总）
  team: {
    /** 延期任务数（含已完成） */
    delayed_task_count: { current: number; period: number };
    /** 累计延期次数 */
    total_delay_count: { current: number; period: number };
    plan_change_count: { current: number; period: number };
  };
  // 个人层
  individual: {
    /** 人均延期次数 */
    avg_delay_count_per_member: { current: number; period: number };
    /** 重灾区人 */
    worst_member_name: { current: string | null; period: string | null };
    worst_member_count: { current: number; period: number };
  };
}

export interface DelayAnalysisReport {
  total_delayed: number;
  warning_count: number;
  delayed_count: number;
  overdue_completed_count: number;
  delay_reasons: DelayReasonCount[];
  delay_trend: TrendDataPoint[];
  delayed_tasks: DelayedTaskItem[];  // 延期任务列表（需求文档要求）
  /** 图表①：当前已延期的责任人排行 */
  delayed_member_stats: DelayedMemberStat[];
  /** 图表②：延期预警责任人排行 */
  warning_member_stats: WarningMemberStat[];
  // —— 团队视角（T1~T8）——
  team_comparison: DepartmentDelayStat[];
  /** 保留字段（v2 前端不再渲染，避免破坏现有契约） */
  severity_distribution: SeverityDistribution;
  project_delay_stats: ProjectDelayStat[];
  task_type_delay_stats: TaskTypeDelayStat[];
  estimation_deviation: EstimationDeviation;
  improvement_trend: ImprovementTrend;
  // —— 个人视角（P1~P5）——
  member_ranking: MemberDelayStat[];
  member_trends: MemberTrendPoint[];
  reason_member_matrix: ReasonMemberCell[];
  // —— 任务视角（K1~K2）——
  repeat_delay_tasks: DelayedTaskItem[];
  frequent_change_tasks: DelayedTaskItem[];
  // —— v2 新增 ——
  /** 顶部统计总览（本期vs上期） */
  stats_overview: StatsOverview;
  /** K3：超长延期天数榜 */
  longest_delay_tasks: DelayedTaskItem[];
}

export interface DelayedTaskItem {
  id: string;
  description: string;
  wbs_code: string | null;
  project_name: string;
  assignee_name: string;
  delay_type: string;
  planned_end_date: string | null;
  delay_days: number;
  reason: string;
  status: string;
  // v2 交互增强：明细下钻用（可选；主报表 K1/K2/K3/delayed_tasks 列表不填）
  task_type?: string;
  project_id?: string;
  assignee_id?: number;
  // v2 修复：引用 WBS 表真实字段（明细 Dialog 用；priority 替代无数据源的 riskLevel）
  priority?: string;
  progress?: number;
  actual_end_date?: string | null;
  // v2 修复：问题榜次数（K1 反复延期/K2 频繁变更 metric 用）
  delay_count?: number;
  plan_change_count?: number;
}

/** 延期明细下钻查询参数（点击柱子查看该维度明细任务） */
export interface DelayDetailQueryOptions {
  assignee_id?: number;
  project_id?: string;
  task_type?: string;       // '未分类' 走特殊反向映射（task_type='' OR IS NULL）
  delay_type?: 'delay_warning' | 'delayed' | 'overdue_completed';
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
}

/** 延期明细下钻返回 */
export interface DelayDetailResult {
  items: DelayedTaskItem[];
  total: number;
  page: number;
  page_size: number;
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
  assignee_name: string;  // 责任人姓名
  status: string;
  progress: number;
  full_time_ratio: number;
  activity_rate: number;  // 活跃度（v1.2 新增）
  planned_duration?: number;  // 计划工期（v1.2 新增）
  actual_duration?: number;   // 实际工期（v1.2 新增）
  estimation_accuracy?: number;  // 预估准确性（v1.2 新增）
  updated_at?: string | null;  // 最后更新时间
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
// 注意：审计日志的类型定义已迁移至 core/types/audit.types.ts（AuditLog 接口）
// 此处仅保留查询选项类型，供 analytics/routes 引用

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
  root_tasks: number;           // 负责的根任务数（wbs_level=1）
  sub_tasks: number;            // 参与的子任务数（wbs_level>1）
  current_tasks: number;
  completed_tasks: number;  // 已完成任务数
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
  total_tasks: number;
  root_tasks: number;
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

// ============ 活跃度趋势报表（团队/个人 维护活动时间曲线） ============

export type ActivityTrendDimension = 'team' | 'assignee';
export type ActivityTrendMetric = 'active_task_ratio' | 'progress_record_count';

/** 活跃度趋势查询参数 */
export interface ActivityTrendQueryOptions {
  dimension: ActivityTrendDimension;
  metric: ActivityTrendMetric;
  start_date?: string;
  end_date?: string;
  project_id?: string;
  department_id?: number;
  assignee_id?: number;
  top_n?: number;
}

/** 活跃度趋势数据点（长表，前端透视成多系列） */
export interface ActivityTrendPoint {
  period: string;       // 周一起始日 YYYY-MM-DD，如 "2026-07-20"
  entityName: string;   // 部门名 / 责任人名
  value: number;        // 占比% 或 记录数
}

export interface ActivityTrendEntity {
  id: number | null;
  name: string;
}

export interface ActivityTrendResponse {
  dimension: ActivityTrendDimension;
  metric: ActivityTrendMetric;
  series: ActivityTrendPoint[];
  entities: ActivityTrendEntity[];
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
