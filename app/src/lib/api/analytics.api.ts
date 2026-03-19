/**
 * 分析模块 API
 */
import apiClient from './client';
import type { ApiResponse } from '@/types/api';
import type {
  DashboardStats,
  TaskTrend,
  ProjectProgressItem,
  TaskDistribution,
  DashboardQueryParams,
} from '@/features/dashboard/types';

const BASE_PATH = '/api/analytics';

/**
 * 获取仪表板统计数据
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const response = await apiClient.get<ApiResponse<DashboardStats>>(`${BASE_PATH}/dashboard/stats`);
  return response.data.data;
}

/**
 * 获取任务趋势数据
 */
export async function getTaskTrend(params: DashboardQueryParams = {}): Promise<TaskTrend> {
  const response = await apiClient.get<ApiResponse<TaskTrend>>(`${BASE_PATH}/dashboard/trends`, {
    params,
  });
  return response.data.data;
}

/**
 * 获取项目进度报表
 */
export async function getProjectProgress(projectId: string): Promise<ProjectProgressItem> {
  const response = await apiClient.get<ApiResponse<ProjectProgressItem>>(
    `${BASE_PATH}/reports/project-progress`,
    { params: { project_id: projectId } }
  );
  return response.data.data;
}

/**
 * 获取任务统计报表
 */
export async function getTaskStatistics(params: DashboardQueryParams = {}): Promise<TaskDistribution> {
  const response = await apiClient.get<ApiResponse<TaskDistribution>>(
    `${BASE_PATH}/reports/task-statistics`,
    { params }
  );
  return response.data.data;
}

/**
 * 获取延期分析报表
 */
export async function getDelayAnalysis(params: DashboardQueryParams = {}): Promise<{
  totalDelayed: number;
  avgDelayDays: number;
  byReason: Record<string, number>;
  tasks: Array<{ id: string; name: string; delayDays: number }>;
}> {
  const response = await apiClient.get<ApiResponse<any>>(
    `${BASE_PATH}/reports/delay-analysis`,
    { params }
  );
  return response.data.data;
}

export const analyticsApi = {
  getDashboardStats,
  getTaskTrend,
  getProjectProgress,
  getTaskStatistics,
  getDelayAnalysis,
};
