// app/server/src/modules/project/types.ts

// ============ 项目相关 ============

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
  timeline_count: number;
  member_ids: string | null;
  version: number;
  created_at: Date;
  updated_at: Date;
}

export interface ProjectListItem extends Omit<Project, 'member_ids'> {
  member_count: number;
  milestone_count: number;
  // 成员摘要（用于前端显示头像组）
  members: Array<{
    id: number;
    name: string;
    avatar?: string;
  }>;
}

export interface CreateProjectRequest {
  code: string;
  name: string;
  description?: string;
  project_type: ProjectType;
  planned_start_date: string;
  planned_end_date: string;
  member_ids?: number[];
}

export interface UpdateProjectRequest {
  code?: string; // 项目编码（可选修改）
  name?: string;
  description?: string;
  status?: ProjectStatus;
  project_type?: ProjectType;
  planned_start_date?: string;
  planned_end_date?: string;
  actual_start_date?: string | null;
  actual_end_date?: string | null;
  member_ids?: number[]; // 成员 ID 列表
  version: number; // 乐观锁
}

export interface ProjectQueryOptions {
  status?: ProjectStatus;
  project_type?: ProjectType;
  search?: string;
  member_id?: number;
  page?: number;
  pageSize?: number;
}

// ============ 里程碑相关 ============

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

export interface CreateMilestoneRequest {
  name: string;
  target_date: string;
  description?: string;
  completion_percentage?: number;
}

export interface UpdateMilestoneRequest {
  name?: string;
  target_date?: string;
  description?: string;
  completion_percentage?: number;
}

// ============ 时间线相关 ============

export type TimelineType = 'tech_stack' | 'team' | 'phase' | 'custom';
export type TimelineStatus = 'not_started' | 'in_progress' | 'completed' | 'delayed';

export interface Timeline {
  id: string;
  project_id: string;
  name: string;
  start_date: Date;
  end_date: Date;
  type: TimelineType | null;
  visible: boolean;
  sort_order: number;
  progress: number;
  status: TimelineStatus;
  created_at: Date;
  updated_at: Date;
}

export interface CreateTimelineRequest {
  name: string;
  start_date: string;
  end_date: string;
  type?: TimelineType;
  progress?: number;
  status?: TimelineStatus;
}

export interface UpdateTimelineRequest {
  name?: string;
  start_date?: string;
  end_date?: string;
  type?: TimelineType;
  visible?: boolean;
  sort_order?: number;
  progress?: number;
  status?: TimelineStatus;
}

// ============ 项目成员相关 ============

export interface ProjectMember {
  user_id: number;
  project_id: string;
  role: 'manager' | 'member';
  joined_at: Date;
  // 关联信息
  username?: string;
  real_name?: string;
  department_name?: string;
}

export interface AddProjectMemberRequest {
  user_id: number;
  role?: 'manager' | 'member';
}

// ============ 节假日相关 ============

export type HolidayType = 'legal' | 'company' | 'workday';

export interface Holiday {
  date: string;
  name: string;
  type: HolidayType;
}

export interface CreateHolidayRequest {
  date: string;
  name: string;
  type: HolidayType;
}

// ============ 统计相关 ============

export interface ProjectStats {
  timeline_count: number;
  milestone_count: number;
  achieved_milestone_count: number;
  member_count: number;
  progress: number;
}
