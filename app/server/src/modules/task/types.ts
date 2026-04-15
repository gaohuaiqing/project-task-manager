// app/server/src/modules/task/types.ts

// ============ WBS任务相关 ============

export type TaskStatus =
  | 'pending_approval' | 'rejected' | 'not_started' | 'in_progress'
  | 'early_completed' | 'on_time_completed' | 'delay_warning'
  | 'delayed' | 'overdue_completed';

export type TaskType =
  | 'firmware' | 'board' | 'driver' | 'interface' | 'hw_recovery'
  | 'material_import' | 'material_sub' | 'sys_design' | 'core_risk'
  | 'contact' | 'func_task' | 'other';

export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';

/** 待审批变更数据结构 */
export interface PendingChangeData {
  /** 变更字段 */
  changes: Array<{ field: string; oldValue: unknown; newValue: unknown }>;
  /** 变更原因 */
  reason: string;
  /** 提交时间 */
  submitted_at: string;
  /** 提交人ID */
  submitted_by: number;
}

export interface WBSTask {
  id: string;
  project_id: string;
  parent_id: string | null;
  wbs_code: string;
  wbs_level: number;
  description: string;
  status: TaskStatus;
  task_type: TaskType;
  priority: TaskPriority;
  assignee_id: number | null;
  start_date: Date | null;
  end_date: Date | null;
  duration: number | null;
  is_six_day_week: boolean;
  planned_duration: number | null;
  warning_days: number;
  actual_start_date: Date | null;
  actual_end_date: Date | null;
  actual_duration: number | null;
  full_time_ratio: number;
  actual_cycle: number | null;
  predecessor_id: string | null;
  /** 依赖类型：FS(完成-开始), SS(开始-开始), FF(完成-完成), SF(开始-完成) */
  dependency_type: DependencyType;
  lag_days: number | null;
  redmine_link: string | null;
  delay_count: number;
  plan_change_count: number;
  progress_record_count: number;
  tags: string | null;
  last_plan_refresh_at: Date | null;
  /** 待审批的变更数据（JSON格式） */
  pending_changes: PendingChangeData | null;
  /** 待审批变更类型 */
  pending_change_type: string | null;
  /** 实时计算的状态（用于显示，优先于数据库中的 status） */
  computed_status?: TaskStatus;
  version: number;
  created_at: Date;
  updated_at: Date;
}

export interface WBSTaskListItem extends WBSTask {
  assignee_name?: string;
  project_name?: string;
  children?: WBSTaskListItem[];
}

export interface CreateTaskRequest {
  project_id: string;
  parent_id?: string;
  wbs_level: number;
  description: string;
  task_type?: TaskType;
  priority?: TaskPriority;
  assignee_id?: number;
  start_date?: string;
  duration?: number;
  is_six_day_week?: boolean;
  warning_days?: number;
  predecessor_id?: string;
  /** 依赖类型 */
  dependency_type?: DependencyType;
  lag_days?: number;
  redmine_link?: string;
  full_time_ratio?: number;
  /** 计划周期（计算字段） */
  planned_duration?: number;
}

export interface UpdateTaskRequest {
  description?: string;
  task_type?: TaskType;
  priority?: TaskPriority;
  assignee_id?: number;
  start_date?: string;
  duration?: number;
  is_six_day_week?: boolean;
  warning_days?: number;
  predecessor_id?: string;
  /** 依赖类型 */
  dependency_type?: DependencyType;
  lag_days?: number;
  actual_start_date?: string;
  actual_end_date?: string;
  redmine_link?: string;
  full_time_ratio?: number;
  /** 计划周期（计算字段） */
  planned_duration?: number;
  /** 实际工期（计算字段） */
  actual_duration?: number;
  /** 实际周期（计算字段） */
  actual_cycle?: number;
  /** 变更原因（工程师修改计划字段时必填） */
  reason?: string;
  version: number;
}

export interface TaskQueryOptions {
  project_id?: string | string[];      // 支持多选
  status?: TaskStatus | TaskStatus[];  // 支持多选
  task_type?: TaskType | TaskType[];   // 支持多选
  priority?: TaskPriority | TaskPriority[];  // 支持多选
  assignee_id?: number | number[];     // 支持多选
  parent_id?: string | null;
  search?: string;
  page?: number;
  pageSize?: number;
  /** 数据范围过滤：仅返回这些项目中的任务 */
  accessible_project_ids?: string[];
}

// ============ 进度记录相关 ============

export interface ProgressRecord {
  id: string;
  task_id: string;
  content: string;
  recorded_by: number;
  created_at: Date;
  recorder_name?: string;
}

export interface CreateProgressRecordRequest {
  content: string;
}

// ============ 任务依赖相关 ============

export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF';

export interface TaskDependency {
  id: string;
  task_id: string;
  predecessor_id: string;
  dependency_type: DependencyType;
  lag_days: number;
  created_at: Date;
}
