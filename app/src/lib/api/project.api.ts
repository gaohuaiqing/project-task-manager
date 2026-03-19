/**
 * 项目模块 API
 */
import apiClient from './client';
import type { ApiResponse, PaginatedResponse } from '@/types/api';
import type {
  Project,
  ProjectDetail,
  ProjectMember,
  Milestone,
  Timeline,
  TimelineTask,
  ProjectStats,
  ProjectQueryParams,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectListResponse,
} from '@/features/projects/types';

const BASE_PATH = '/api/project';

/**
 * 获取项目列表
 */
export async function getProjects(params: ProjectQueryParams = {}): Promise<ProjectListResponse> {
  const response = await apiClient.get<ApiResponse<ProjectListResponse>>(`${BASE_PATH}/projects`, {
    params,
  });
  return response.data.data;
}

/**
 * 获取项目详情
 */
export async function getProject(id: string): Promise<ProjectDetail> {
  const response = await apiClient.get<ApiResponse<ProjectDetail>>(`${BASE_PATH}/projects/${id}`);
  return response.data.data;
}

/**
 * 获取项目统计
 */
export async function getProjectStats(id: string): Promise<ProjectStats> {
  const response = await apiClient.get<ApiResponse<ProjectStats>>(`${BASE_PATH}/projects/${id}/stats`);
  return response.data.data;
}

/**
 * 创建项目
 */
export async function createProject(data: CreateProjectRequest): Promise<{ id: string }> {
  const response = await apiClient.post<ApiResponse<{ id: string }>>(`${BASE_PATH}/projects`, data);
  return response.data.data;
}

/**
 * 更新项目
 */
export async function updateProject(id: string, data: UpdateProjectRequest): Promise<Project> {
  const response = await apiClient.put<ApiResponse<Project>>(`${BASE_PATH}/projects/${id}`, data);
  return response.data.data;
}

/**
 * 删除项目
 */
export async function deleteProject(id: string): Promise<void> {
  await apiClient.delete(`${BASE_PATH}/projects/${id}`);
}

// ========== 里程碑 ==========

/**
 * 获取项目里程碑
 */
export async function getMilestones(projectId: string): Promise<Milestone[]> {
  const response = await apiClient.get<ApiResponse<Milestone[]>>(`${BASE_PATH}/projects/${projectId}/milestones`);
  return response.data.data;
}

/**
 * 创建里程碑
 */
export async function createMilestone(projectId: string, data: Omit<Milestone, 'id' | 'projectId' | 'createdAt'>): Promise<{ id: string }> {
  const response = await apiClient.post<ApiResponse<{ id: string }>>(`${BASE_PATH}/projects/${projectId}/milestones`, data);
  return response.data.data;
}

/**
 * 更新里程碑
 */
export async function updateMilestone(id: string, data: Partial<Milestone>): Promise<{ updated: boolean }> {
  const response = await apiClient.put<ApiResponse<{ updated: boolean }>>(`${BASE_PATH}/milestones/${id}`, data);
  return response.data.data;
}

/**
 * 删除里程碑
 */
export async function deleteMilestone(id: string): Promise<void> {
  await apiClient.delete(`${BASE_PATH}/milestones/${id}`);
}

// ========== 时间线 ==========

/**
 * 获取项目时间线
 */
export async function getTimelines(projectId: string): Promise<Timeline[]> {
  const response = await apiClient.get<ApiResponse<Timeline[]>>(`${BASE_PATH}/projects/${projectId}/timelines`);
  return response.data.data;
}

/**
 * 创建时间线
 */
export async function createTimeline(projectId: string, data: Omit<Timeline, 'id' | 'projectId' | 'createdAt'>): Promise<{ id: string }> {
  const response = await apiClient.post<ApiResponse<{ id: string }>>(`${BASE_PATH}/projects/${projectId}/timelines`, data);
  return response.data.data;
}

/**
 * 更新时间线
 */
export async function updateTimeline(id: string, data: Partial<Timeline>): Promise<{ updated: boolean }> {
  const response = await apiClient.put<ApiResponse<{ updated: boolean }>>(`${BASE_PATH}/timelines/${id}`, data);
  return response.data.data;
}

/**
 * 删除时间线
 */
export async function deleteTimeline(id: string): Promise<void> {
  await apiClient.delete(`${BASE_PATH}/timelines/${id}`);
}

// ========== 时间线任务 ==========

/**
 * 获取时间线任务
 */
export async function getTimelineTasks(timelineId: string): Promise<TimelineTask[]> {
  const response = await apiClient.get<ApiResponse<TimelineTask[]>>(`${BASE_PATH}/timelines/${timelineId}/tasks`);
  return response.data.data;
}

// ========== 项目成员 ==========

/**
 * 获取项目成员
 */
export async function getProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const response = await apiClient.get<ApiResponse<ProjectMember[]>>(`${BASE_PATH}/projects/${projectId}/members`);
  return response.data.data;
}

/**
 * 添加项目成员
 */
export async function addProjectMember(projectId: string, data: { userId: number; role: string }): Promise<{ added: boolean }> {
  const response = await apiClient.post<ApiResponse<{ added: boolean }>>(`${BASE_PATH}/projects/${projectId}/members`, data);
  return response.data.data;
}

/**
 * 移除项目成员
 */
export async function removeProjectMember(projectId: string, userId: number): Promise<void> {
  await apiClient.delete(`${BASE_PATH}/projects/${projectId}/members/${userId}`);
}

export const projectApi = {
  getProjects,
  getProject,
  getProjectStats,
  createProject,
  updateProject,
  deleteProject,
  getMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  getTimelines,
  createTimeline,
  updateTimeline,
  deleteTimeline,
  getTimelineTasks,
  getProjectMembers,
  addProjectMember,
  removeProjectMember,
};
