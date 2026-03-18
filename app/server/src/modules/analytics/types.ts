// app/server/src/modules/analytics/types.ts

// ============ 仪表板统计相关 ============

export interface DashboardStats {
  total_projects: number;
  active_tasks: number;
  completed_tasks: number;
  delay_warning_count: number;
}

export interface TrendData {
  date: string;
  count: number;
}

export interface UrgentTask {
  id: string;
  description: string;
  project_name: string;
  assignee_name: string;
  end_date: Date;
  priority: string;
}

// ============ 报表相关 ============

export interface ProjectProgressReport {
  project_id: string;
  project_name: string;
  progress: number;
  total_tasks: number;
  completed_tasks: number;
  milestones: MilestoneProgress[];
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
}

export interface AssigneeTaskCount {
  assignee_id: number;
  assignee_name: string;
  task_count: number;
  completed_count: number;
  delayed_count: number;
}

export interface DelayAnalysisReport {
  total_delayed: number;
  warning_count: number;
  delayed_count: number;
  overdue_completed_count: number;
  delay_reasons: DelayReasonCount[];
  delay_trend: TrendData[];
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
}

export interface MemberTask {
  id: string;
  description: string;
  project_name: string;
  status: string;
  progress: number;
  full_time_ratio: number;
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
