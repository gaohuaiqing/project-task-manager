/**
 * 项目管理模块类型定义
 */

// 项目状态
export type ProjectStatus = 'planning' | 'in_progress' | 'completed' | 'delayed';

// 项目类型
export type ProjectType = 'product_development' | 'functional_management';

// 项目成员角色
export type ProjectMemberRole = 'pm' | 'tech_lead' | 'member';

// 项目基本信息
export interface Project {
  id: string;
  code: string;
  name: string;
  description: string;
  status: ProjectStatus;
  projectType: ProjectType;
  progress: number;
  startDate: string | null;
  deadline: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

// 项目成员
export interface ProjectMember {
  id: number;
  userId: number;
  name: string;
  role: ProjectMemberRole;
  joinedAt: string;
}

// 里程碑
export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  description: string;
  plannedDate: string;
  actualDate: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'delayed';
  createdAt: string;
}

// 时间线
export interface Timeline {
  id: string;
  projectId: string;
  name: string;
  type: string;
  startDate: string;
  endDate: string;
  createdAt: string;
}

// 时间线任务
export interface TimelineTask {
  id: string;
  timelineId: string;
  name: string;
  assigneeId: number | null;
  startDate: string;
  endDate: string;
  progress: number;
  status: string;
}

// 项目统计
export interface ProjectStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  totalMembers: number;
  avgProgress: number;
}

// 项目详情（包含关联数据）
export interface ProjectDetail extends Project {
  members: ProjectMember[];
  milestones: Milestone[];
  timelines: Timeline[];
  stats?: ProjectStats;
}

// 项目查询参数
export interface ProjectQueryParams {
  status?: ProjectStatus;
  project_type?: ProjectType;
  search?: string;
  page?: number;
  pageSize?: number;
}

// 创建项目请求
export interface CreateProjectRequest {
  code: string;
  name: string;
  description: string;
  projectType: ProjectType;
  startDate?: string;
  deadline?: string;
  memberIds?: number[];
}

// 更新项目请求
export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  startDate?: string;
  deadline?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  version: number;
}

// 项目列表响应
export interface ProjectListResponse {
  items: Project[];
  total: number;
  page: number;
  pageSize: number;
}
