// app/server/src/core/types/task.types.ts

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
