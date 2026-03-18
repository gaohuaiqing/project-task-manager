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
  lag_days: number | null;
  redmine_link: string | null;
  delay_count: number;
  plan_change_count: number;
  progress_record_count: number;
  tags: string | null;
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
  lag_days?: number;
  redmine_link?: string;
  full_time_ratio?: number;
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
  lag_days?: number;
  actual_start_date?: string;
  actual_end_date?: string;
  redmine_link?: string;
  full_time_ratio?: number;
  version: number;
}

export interface TaskQueryOptions {
  project_id?: string;
  status?: TaskStatus;
  task_type?: TaskType;
  priority?: TaskPriority;
  assignee_id?: number;
  parent_id?: string | null;
  search?: string;
  page?: number;
  pageSize?: number;
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
