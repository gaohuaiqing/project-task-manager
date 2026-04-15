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
  ProjectStats,
  ProjectQueryParams,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectListResponse,
} from '@/features/projects/types';

const BASE_PATH = '/projects';

/**
 * 获取项目列表
 * 注：响应拦截器会自动转换 snake_case -> camelCase
 * 但这里需要处理语义映射：plannedStartDate/EndDate -> startDate/deadline
 */
export async function getProjects(params: ProjectQueryParams = {}): Promise<ProjectListResponse> {
  const response = await apiClient.get<ApiResponse<any>>(BASE_PATH, { params });
  const data = (response as any).data;

  // 处理语义映射（自动转换后的字段名调整）
  const items = (data.items || []).map((item: any) => ({
    ...item,
    id: String(item.id),
    startDate: item.plannedStartDate || null,
    deadline: item.plannedEndDate || null,
  }));

  return {
    items,
    total: data.total || 0,
    page: data.page || 1,
    pageSize: data.pageSize || 20,
  };
}

/**
 * 获取项目详情
 */
/**
 * 获取项目详情
 * 注：响应拦截器会自动转换 snake_case -> camelCase
 * 但需要处理语义映射：plannedStartDate/EndDate -> startDate/deadline
 */
export async function getProject(id: string): Promise<ProjectDetail> {
  const response = await apiClient.get<ApiResponse<any>>(`${BASE_PATH}/${id}`);
  const item = (response as any).data;

  // 处理语义映射
  return {
    ...item,
    id: String(item.id),
    startDate: item.plannedStartDate || null,
    deadline: item.plannedEndDate || null,
    members: (item.members || []).map((m: any) => ({
      ...m,
      id: String(m.id),
    })),
    milestones: (item.milestones || []).map((m: any) => ({
      ...m,
      id: String(m.id),
      projectId: String(item.id),
    })),
    timelines: (item.timelines || []).map((t: any) => ({
      ...t,
      id: String(t.id),
      projectId: String(item.id),
    })),
  };
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
 * 注：请求拦截器会自动转换 camelCase -> snake_case
 * 但需要处理语义映射：startDate/deadline -> planned_start_date/planned_end_date
 */
export async function createProject(data: CreateProjectRequest): Promise<{ id: string }> {
  const payload = {
    ...data,
    plannedStartDate: data.startDate,
    plannedEndDate: data.deadline,
  };
  delete (payload as any).startDate;
  delete (payload as any).deadline;

  const response = await apiClient.post<ApiResponse<{ id: string }>>(`${BASE_PATH}`, payload);
  return (response as any).data;
}

/**
 * 更新项目
 * 注：请求拦截器会自动转换 camelCase -> snake_case
 * 但需要处理语义映射
 */
export async function updateProject(id: string, data: UpdateProjectRequest): Promise<Project> {
  const payload: any = { ...data };

  // 处理语义映射
  if (data.startDate !== undefined) {
    payload.plannedStartDate = data.startDate;
    delete payload.startDate;
  }
  if (data.deadline !== undefined) {
    payload.plannedEndDate = data.deadline;
    delete payload.deadline;
  }

  const response = await apiClient.put<ApiResponse<Project>>(`${BASE_PATH}/${id}`, payload);
  return (response as any).data;
}

/**
 * 删除项目
 */
export async function deleteProject(id: string): Promise<void> {
  await apiClient.delete(`${BASE_PATH}/${id}`);
}

// ========== 里程碑 ==========
// 注：请求/响应拦截器会自动转换 snake_case <-> camelCase

/**
 * 获取项目里程碑
 */
export async function getMilestones(projectId: string): Promise<Milestone[]> {
  const response = await apiClient.get<ApiResponse<Milestone[]>>(`${BASE_PATH}/${projectId}/milestones`);
  const data = (response as any).data ?? [];
  return data;
}

/**
 * 创建里程碑
 */
export async function createMilestone(
  projectId: string,
  data: { name: string; targetDate: string; description?: string; completionPercentage?: number }
): Promise<{ id: string }> {
  const response = await apiClient.post<ApiResponse<{ id: string }>>(`${BASE_PATH}/${projectId}/milestones`, data);
  return (response as any).data;
}

/**
 * 更新里程碑
 */
export async function updateMilestone(
  id: string,
  data: { name?: string; targetDate?: string; description?: string; completionPercentage?: number }
): Promise<{ updated: boolean }> {
  const response = await apiClient.put<ApiResponse<{ updated: boolean }>>(`${BASE_PATH}/milestones/${id}`, data);
  return (response as any).data;
}

/**
 * 删除里程碑
 */
export async function deleteMilestone(id: string): Promise<void> {
  await apiClient.delete(`${BASE_PATH}/milestones/${id}`);
}

// ========== 时间线 ==========
// 注：请求/响应拦截器会自动转换 snake_case <-> camelCase

/**
 * 获取项目时间线
 */
export async function getTimelines(projectId: string): Promise<Timeline[]> {
  const response = await apiClient.get<ApiResponse<Timeline[]>>(`${BASE_PATH}/${projectId}/timelines`);
  return (response as any).data ?? [];
}

/**
 * 创建时间线
 */
export async function createTimeline(
  projectId: string,
  data: Omit<Timeline, 'id' | 'projectId' | 'createdAt'>
): Promise<{ id: string }> {
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

// ========== 节假日 ==========

/**
 * 节假日类型
 */
export type HolidayType = 'legal' | 'company' | 'workday';

/**
 * 节假日数据
 */
export interface Holiday {
  id?: number;
  date: string;
  name: string;
  type: HolidayType;
}

/**
 * 获取节假日列表
 */
export async function getHolidays(year?: number): Promise<Holiday[]> {
  const params = year ? { year } : {};
  const response = await apiClient.get<ApiResponse<Holiday[]>>(`${BASE_PATH}/holidays`, { params });
  return (response as any).data || [];
}

/**
 * 创建节假日
 */
export async function createHoliday(data: Omit<Holiday, 'id'>): Promise<void> {
  await apiClient.post(`${BASE_PATH}/holidays`, data);
}

/**
 * 删除节假日
 */
export async function deleteHoliday(date: string): Promise<void> {
  await apiClient.delete(`${BASE_PATH}/holidays/${date}`);
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
  getProjectMembers,
  addProjectMember,
  removeProjectMember,
  // 节假日
  getHolidays,
  createHoliday,
  deleteHoliday,
};
