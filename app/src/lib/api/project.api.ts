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

const BASE_PATH = '/projects';

/**
 * 获取项目列表
 */
export async function getProjects(params: ProjectQueryParams = {}): Promise<ProjectListResponse> {
  const response = await apiClient.get<ApiResponse<ProjectListResponse>>(BASE_PATH, {
    params,
  });
  // 拦截器已返回 response.data，所以这里直接访问 data
  return (response as any).data;
}

/**
 * 获取项目详情
 */
export async function getProject(id: string): Promise<ProjectDetail> {
  const response = await apiClient.get<ApiResponse<ProjectDetail>>(`${BASE_PATH}/${id}`);
  return (response as any).data;
}

/**
 * 获取项目统计
 */
export async function getProjectStats(id: string): Promise<ProjectStats> {
  const response = await apiClient.get<ApiResponse<ProjectStats>>(`${BASE_PATH}/${id}/stats`);
  return (response as any).data;
}

/**
 * 创建项目
 * 注意：前端使用 camelCase，后端期望 snake_case
 */
export async function createProject(data: CreateProjectRequest): Promise<{ id: string }> {
  // 转换字段名：camelCase -> snake_case
  const payload = {
    code: data.code,
    name: data.name,
    description: data.description,
    project_type: data.projectType,
    planned_start_date: data.startDate,
    planned_end_date: data.deadline,
    member_ids: data.memberIds,
  };
  const response = await apiClient.post<ApiResponse<{ id: string }>>(`${BASE_PATH}`, payload);
  return (response as any).data;
}

/**
 * 更新项目
 */
export async function updateProject(id: string, data: UpdateProjectRequest): Promise<Project> {
  const response = await apiClient.put<ApiResponse<Project>>(`${BASE_PATH}/${id}`, data);
  return (response as any).data;
}

/**
 * 删除项目
 */
export async function deleteProject(id: string): Promise<void> {
  await apiClient.delete(`${BASE_PATH}/${id}`);
}

// ========== 里程碑 ==========

/**
 * 获取项目里程碑
 */
export async function getMilestones(projectId: string): Promise<Milestone[]> {
  const response = await apiClient.get<ApiResponse<Milestone[]>>(`${BASE_PATH}/${projectId}/milestones`);
  const data = (response as any).data;
  // 转换字段名：snake_case -> camelCase
  return data.map((m: any) => ({
    ...m,
    targetDate: m.target_date || m.targetDate,
    completionPercentage: m.completion_percentage ?? m.completionPercentage ?? 0,
  }));
}

/**
 * 创建里程碑
 */
export async function createMilestone(
  projectId: string,
  data: { name: string; targetDate: string; description?: string; completionPercentage?: number }
): Promise<{ id: string }> {
  // 转换字段名：camelCase -> snake_case
  const payload = {
    name: data.name,
    target_date: data.targetDate,
    description: data.description,
    completion_percentage: data.completionPercentage ?? 0,
  };
  const response = await apiClient.post<ApiResponse<{ id: string }>>(`${BASE_PATH}/${projectId}/milestones`, payload);
  return (response as any).data;
}

/**
 * 更新里程碑
 */
export async function updateMilestone(
  id: string,
  data: { name?: string; targetDate?: string; description?: string; completionPercentage?: number }
): Promise<{ updated: boolean }> {
  // 转换字段名：camelCase -> snake_case
  const payload: any = {};
  if (data.name !== undefined) payload.name = data.name;
  if (data.targetDate !== undefined) payload.target_date = data.targetDate;
  if (data.description !== undefined) payload.description = data.description;
  if (data.completionPercentage !== undefined) payload.completion_percentage = data.completionPercentage;

  const response = await apiClient.put<ApiResponse<{ updated: boolean }>>(`${BASE_PATH}/milestones/${id}`, payload);
  return (response as any).data;
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
  const response = await apiClient.get<ApiResponse<Timeline[]>>(`${BASE_PATH}/${projectId}/timelines`);
  return (response as any).data;
}

/**
 * 创建时间线
 */
export async function createTimeline(projectId: string, data: Omit<Timeline, 'id' | 'projectId' | 'createdAt'>): Promise<{ id: string }> {
  const response = await apiClient.post<ApiResponse<{ id: string }>>(`${BASE_PATH}/${projectId}/timelines`, data);
  return (response as any).data;
}

/**
 * 更新时间线
 */
export async function updateTimeline(id: string, data: Partial<Timeline>): Promise<{ updated: boolean }> {
  const response = await apiClient.put<ApiResponse<{ updated: boolean }>>(`${BASE_PATH}/timelines/${id}`, data);
  return (response as any).data;
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
  return (response as any).data;
}

// ========== 项目成员 ==========

/**
 * 获取项目成员
 */
export async function getProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const response = await apiClient.get<ApiResponse<ProjectMember[]>>(`${BASE_PATH}/${projectId}/members`);
  return (response as any).data;
}

/**
 * 添加项目成员
 */
export async function addProjectMember(projectId: string, data: { userId: number; role: string }): Promise<{ added: boolean }> {
  const response = await apiClient.post<ApiResponse<{ added: boolean }>>(`${BASE_PATH}/${projectId}/members`, data);
  return (response as any).data;
}

/**
 * 移除项目成员
 */
export async function removeProjectMember(projectId: string, userId: number): Promise<void> {
  await apiClient.delete(`${BASE_PATH}/${projectId}/members/${userId}`);
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
