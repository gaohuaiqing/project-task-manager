/**
 * 项目管理模块类型定义
 */

import type { MilestoneDisplayStatus } from '@/shared/constants';

// 项目状态
export type ProjectStatus = 'planning' | 'in_progress' | 'completed' | 'delayed';

// 项目类型 - 与数据库实际存储值同步 (4种)
export type ProjectType =
  | 'product_dev'    // 产品开发
  | 'func_mgmt'      // 职能管理
  | 'material_sub'   // 物料改代
  | 'quality_handle'; // 质量处理

// 项目成员角色
export type ProjectMemberRole = 'pm' | 'tech_lead' | 'member';

// 项目成员摘要（用于列表显示）
export interface ProjectMemberSummary {
  id: number;
  name: string;
  avatar?: string;
}

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
  // 成员摘要（列表页使用）
  members?: ProjectMemberSummary[];
}

// 项目成员
export interface ProjectMember {
  id: number;
  userId: number;
  name: string;
  role: ProjectMemberRole;
  joinedAt: string;
}

// 里程碑后端状态（与数据库同步）
export type MilestoneBackendStatus = 'pending' | 'achieved' | 'overdue';

// 里程碑
export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  description: string;
  targetDate: string;           // 目标日期
  completionPercentage: number; // 完成百分比 (0-100)
  status: MilestoneBackendStatus; // 后端状态
  createdAt: string;
  // 前端计算出的显示状态（可选，由前端计算）
  displayStatus?: MilestoneDisplayStatus;
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
  startDate: string;   // 必填
  deadline: string;    // 必填
  memberIds?: number[];
  milestones?: MilestoneCreateRequest[];
}

// 创建里程碑请求
export interface MilestoneCreateRequest {
  name: string;
  targetDate: string;
  description?: string;
  completionPercentage?: number; // 完成百分比 (0-100)
}

// 更新里程碑请求
export interface MilestoneUpdateRequest {
  name?: string;
  targetDate?: string;
  description?: string;
  completionPercentage?: number;
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
