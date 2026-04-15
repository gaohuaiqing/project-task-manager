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
export type ProjectMemberRole = 'pm' | 'tech_lead' | 'member' | 'owner' | 'manager' | 'viewer';

// 项目成员摘要（用于列表显示）
export interface ProjectMemberSummary {
  id: number;
  name: string;
  avatar?: string;
}

// 项目成员详情（从后端返回）
export interface ProjectMember {
  id: number;
  project_id: string;
  user_id: number;
  role: 'owner' | 'manager' | 'member' | 'viewer' | 'pm' | 'tech_lead';
  joined_at: string;
  // 关联信息（从 JOIN 查询获取）
  username?: string;
  real_name?: string;
  department_name?: string;
  // 兼容旧字段（前端可能使用）
  name?: string;
  userId?: number;
  joinedAt?: string;
}
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
  // 成员 ID 列表（用于编辑时加载）
  memberIds?: number[];
  // 成员摘要（列表页使用）
  members?: ProjectMemberSummary[];
  // 统计信息（列表页使用）
  timelineCount?: number;
  memberCount?: number;
  milestoneCount?: number;
}

// 里程碑后端状态（与数据库同步）
export type MilestoneBackendStatus = 'pending' | 'achieved' | 'overdue';

// 里程碑
export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  targetDate: string;           // 目标日期
  completionPercentage?: number; // 完成百分比 (0-100)
  isCompleted?: boolean;         // 是否已完成 (REQ_03 3.1节)
  status: MilestoneBackendStatus; // 后端状态
  createdAt?: string;
  // 前端计算出的显示状态（可选，由前端计算）
  displayStatus?: MilestoneDisplayStatus;
}

// 时间线 - 使用 app/src/types/timeline.ts 中的定义
export type { Timeline } from '@/types/timeline';

// 项目统计
export interface ProjectStats {
  totalTimelines: number;
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
  code?: string; // 项目编码（可选修改）
  name?: string;
  description?: string;
  status?: ProjectStatus;
  startDate?: string;
  deadline?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  memberIds?: number[]; // 成员 ID 列表
  version: number;
}

// 项目列表响应
export interface ProjectListResponse {
  items: Project[];
  total: number;
  page: number;
  pageSize: number;
}
