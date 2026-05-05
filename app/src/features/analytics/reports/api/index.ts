/**
 * 报表分析 API 服务
 * @module analytics/reports/api
 */

import { apiService } from '@/services/ApiService';
import type {
  TaskStatisticsReport,
  DelayAnalysisReport,
  MemberAnalysisExtendedResponse,
  ResourceEfficiencyReport,
  ProjectProgressReport,
  ReportQueryOptions,
  MemberAnalysisQueryOptions,
  ResourceEfficiencyQueryOptions,
} from '@/types/api/analytics';

// ==================== 类型定义 ====================

/** API 响应包装 */
interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

// ==================== 报表 API ====================

/**
 * 获取任务统计报表
 */
export async function getTaskStatisticsReport(
  options: ReportQueryOptions
): Promise<TaskStatisticsReport> {
  const params = new URLSearchParams();
  if (options.project_id) params.set('project_id', options.project_id);
  if (options.assignee_id) params.set('assignee_id', String(options.assignee_id));
  if (options.start_date) params.set('start_date', options.start_date);
  if (options.end_date) params.set('end_date', options.end_date);
  if (options.task_type) params.set('task_type', options.task_type);

  const response = await apiService.get<ApiResponse<TaskStatisticsReport>>(
    `/analytics/reports/task-statistics?${params.toString()}`
  );
  return response.data;
}

/**
 * 获取延期分析报表
 */
export async function getDelayAnalysisReport(
  options: ReportQueryOptions
): Promise<DelayAnalysisReport> {
  const params = new URLSearchParams();
  if (options.project_id) params.set('project_id', options.project_id);
  if (options.delay_type) params.set('delay_type', options.delay_type);
  if (options.start_date) params.set('start_date', options.start_date);
  if (options.end_date) params.set('end_date', options.end_date);

  const response = await apiService.get<ApiResponse<DelayAnalysisReport>>(
    `/analytics/reports/delay-analysis?${params.toString()}`
  );
  return response.data;
}

/**
 * 获取成员分析报表（扩展版，支持多成员对比）
 */
export async function getMemberAnalysisReport(
  options: MemberAnalysisQueryOptions
): Promise<MemberAnalysisExtendedResponse> {
  const params = new URLSearchParams();
  if (options.member_id) params.set('member_id', String(options.member_id));
  if (options.start_date) params.set('start_date', options.start_date);
  if (options.end_date) params.set('end_date', options.end_date);

  const response = await apiService.get<ApiResponse<MemberAnalysisExtendedResponse>>(
    `/analytics/reports/member-analysis?${params.toString()}`
  );
  return response.data;
}

/**
 * 获取资源效能分析报表
 */
export async function getResourceEfficiencyReport(
  options: ResourceEfficiencyQueryOptions
): Promise<ResourceEfficiencyReport> {
  const params = new URLSearchParams();
  if (options.project_id) params.set('project_id', options.project_id);
  if (options.start_date) params.set('start_date', options.start_date);
  if (options.end_date) params.set('end_date', options.end_date);
  if (options.department_id) params.set('department_id', String(options.department_id));
  if (options.tech_group_id) params.set('tech_group_id', String(options.tech_group_id));
  if (options.productivity_threshold) {
    params.set('productivity_threshold', String(options.productivity_threshold));
  }

  const response = await apiService.get<ApiResponse<ResourceEfficiencyReport>>(
    `/analytics/reports/resource-efficiency?${params.toString()}`
  );
  return response.data;
}

/**
 * 获取项目进度报表
 * @param projectId 项目ID，可选。不传则返回所有项目汇总数据
 */
export async function getProjectProgressReport(
  projectId?: string
): Promise<ProjectProgressReport | ProjectProgressSummary | null> {
  const params = projectId ? `?project_id=${projectId}` : '';
  const response = await apiService.get<ApiResponse<ProjectProgressReport | ProjectProgressSummary | null>>(
    `/analytics/reports/project-progress${params}`
  );
  return response.data;
}

// ==================== 辅助数据 API ====================

/** 项目简单信息 */
export interface ProjectSimple {
  id: string;
  name: string;
}

/** 成员简单信息 */
export interface MemberSimple {
  id: number;
  real_name: string;
  name?: string;
}

/**
 * 获取项目列表（用于筛选器）
 */
export async function getProjectsSimple(): Promise<ProjectSimple[]> {
  const response = await apiService.get<ApiResponse<{ items: ProjectSimple[] }>>('/projects?simple=true');
  return response.data?.items || [];
}

/**
 * 获取成员列表（用于筛选器）
 * 使用 /org/members 端点
 */
export async function getMembersSimple(): Promise<MemberSimple[]> {
  const response = await apiService.get<ApiResponse<{ items: MemberSimple[] }>>('/org/members?pageSize=100'); // TODO: 提取 pageSize 为常量（参见 DISPLAY_LIMITS.taskStatistics）
  return response.data?.items || [];
}

// ==================== 导出 ====================

export const reportsApi = {
  getTaskStatisticsReport,
  getDelayAnalysisReport,
  getMemberAnalysisReport,
  getResourceEfficiencyReport,
  getProjectProgressReport,
  getProjectsSimple,
  getMembersSimple,
};
