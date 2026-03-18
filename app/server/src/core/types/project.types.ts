// app/server/src/core/types/project.types.ts

export type ProjectStatus = 'planning' | 'active' | 'completed';
export type ProjectType = 'product_dev' | 'func_mgmt' | 'material_sub' | 'quality_handle';

export interface Project {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  project_type: ProjectType;
  planned_start_date: Date;
  planned_end_date: Date;
  actual_start_date: Date | null;
  actual_end_date: Date | null;
  progress: number;
  task_count: number;
  completed_task_count: number;
  member_ids: string | null;
  version: number;
  created_at: Date;
  updated_at: Date;
}

export type MilestoneStatus = 'pending' | 'achieved' | 'overdue';

export interface Milestone {
  id: string;
  project_id: string;
  name: string;
  target_date: Date;
  description: string | null;
  status: MilestoneStatus;
  completion_percentage: number;
  created_at: Date;
  updated_at: Date;
}
