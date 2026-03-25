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

const BASE_PATH = '/analytics';

/**
 * 获取仪表板统计数据
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const response = await apiClient.get<ApiResponse<DashboardStats>>(`${BASE_PATH}/dashboard/stats`);
  return response.data;
}

/**
 * 获取任务趋势数据
 */
export async function getTaskTrend(params: DashboardQueryParams = {}): Promise<TaskTrend> {
  const response = await apiClient.get<ApiResponse<TaskTrend>>(`${BASE_PATH}/dashboard/trends`, {
    params,
  });
  return response.data;
}

/**
 * 获取项目进度报表
 */
export async function getProjectProgress(projectId: string): Promise<ProjectProgressItem> {
  const response = await apiClient.get<ApiResponse<ProjectProgressItem>>(
    `${BASE_PATH}/reports/project-progress`,
    { params: { project_id: projectId } }
  );
  return response.data;
}

/**
 * 获取任务统计报表
 */
export async function getTaskStatistics(params: DashboardQueryParams = {}): Promise<TaskDistribution> {
  const response = await apiClient.get<ApiResponse<any>>(
    `${BASE_PATH}/reports/task-statistics`,
    { params }
  );
  const data = response.data;

  // 转换后端数据格式为前端格式
  return {
    byStatus: {
      pending: data.total_tasks || 0,
      in_progress: 0,
      completed: 0,
      delayed: 0,
    },
    byPriority: data.priority_distribution || {},
    byType: {},
    byAssignee: (data.assignee_distribution || []).map((item: any) => ({
      id: item.assignee_id || 0,
      name: item.assignee_name || '未分配',
      count: item.task_count || 0,
    })),
  };
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
  return response.data;
}

export const analyticsApi = {
  getDashboardStats,
  getTaskTrend,
  getProjectProgress,
  getTaskStatistics,
  getDelayAnalysis,
};

// ============ 审计日志 API ============

export interface AuditLog {
  audit_id: string;
  actor_user_id: number | null;
  actor_username: string | null;
  actor_role: string | null;
  category: 'security' | 'project' | 'task' | 'org' | 'config';
  action: string;
  table_name: string;
  record_id: string | null;
  details: string | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AuditLogQueryParams {
  category?: string;
  action?: string;
  userId?: number;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface AuditLogListResult {
  items: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuditLogOptions {
  categories: Array<{ value: string; label: string }>;
  actionTypes: Array<{ value: string; label: string; category: string }>;
}

/**
 * 获取审计日志列表
 */
export async function getAuditLogs(params: AuditLogQueryParams = {}): Promise<AuditLogListResult> {
  const response = await apiClient.get<ApiResponse<AuditLogListResult>>(`${BASE_PATH}/audit-logs`, {
    params,
  });
  return response.data;
}

/**
 * 获取审计日志筛选选项
 */
export async function getAuditLogOptions(): Promise<AuditLogOptions> {
  const response = await apiClient.get<ApiResponse<AuditLogOptions>>(`${BASE_PATH}/audit-logs/options`);
  return response.data;
}

/**
 * 导出审计日志
 */
export async function exportAuditLogs(params: AuditLogQueryParams = {}): Promise<void> {
  const response = await apiClient.get(`${BASE_PATH}/audit-logs/export`, {
    params,
    responseType: 'blob',
  });

  // 创建下载链接
  const blob = new Blob([response as unknown as BlobPart], { type: 'text/csv;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export const auditLogApi = {
  getAuditLogs,
  getAuditLogOptions,
  exportAuditLogs,
};
