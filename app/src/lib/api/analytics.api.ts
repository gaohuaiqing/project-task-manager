/**
 * 分析模块 API
 */
import apiClient from './client';
import type { ApiResponse } from '@/types/api';
import type {
  DashboardStats,
  TrendDataPoint,
  ProjectProgressItem,
  TaskDistribution,
  DashboardQueryParams,
} from '@/features/analytics/shared/types';

const BASE_PATH = '/analytics';

/**
 * 获取仪表板统计数据
 * 注：响应拦截器会自动转换 snake_case -> camelCase
 */
export async function getDashboardStats(signal?: AbortSignal): Promise<DashboardStats> {
  const response = await apiClient.get<ApiResponse<DashboardStats>>(`${BASE_PATH}/dashboard/stats`, { signal });
  return response.data;
}

/**
 * 获取任务趋势数据
 * 注：请求拦截器会自动转换 camelCase -> snake_case
 */
export async function getTaskTrend(params: DashboardQueryParams = {}, signal?: AbortSignal): Promise<TrendDataPoint[]> {
  const response = await apiClient.get<ApiResponse<TrendDataPoint[]>>(
    `${BASE_PATH}/dashboard/trends`,
    { params, signal }
  );
  return response.data ?? [];
}

/**
 * 获取所有项目进度（仪表板专用）
 * 注：响应拦截器会自动转换 snake_case -> camelCase
 */
export async function getAllProjectsProgress(signal?: AbortSignal): Promise<ProjectProgressItem[]> {
  const response = await apiClient.get<ApiResponse<ProjectProgressItem[]>>(
    `${BASE_PATH}/dashboard/projects`,
    { signal }
  );
  return response.data ?? [];
}

/**
 * 获取任务统计报表
 * 注：响应拦截器会自动转换 snake_case -> camelCase
 */
export async function getTaskStatistics(params: DashboardQueryParams = {}, signal?: AbortSignal): Promise<TaskDistribution> {
  const response = await apiClient.get<ApiResponse<TaskDistribution>>(
    `${BASE_PATH}/reports/task-statistics`,
    { params, signal }
  );
  return response.data;
}

/**
 * 获取延期分析报表
 * 注：请求拦截器会自动转换 camelCase -> snake_case
 */
export async function getDelayAnalysis(params: DashboardQueryParams = {}, signal?: AbortSignal): Promise<{
  totalDelayed: number;
  avgDelayDays: number;
  byReason: Record<string, number>;
  tasks: Array<{ id: string; name: string; delayDays: number }>;
}> {
  const response = await apiClient.get<ApiResponse<any>>(
    `${BASE_PATH}/reports/delay-analysis`,
    { params, signal }
  );
  return response.data;
}

/**
 * 获取仪表板统计卡片趋势（对比当前周期 vs 上期）
 */
export async function getDashboardTrends(days: number = 7, signal?: AbortSignal): Promise<Record<string, {
  current: number;
  trend: {
    value: number;
    previousValue: number;
    change: number;
    changePercent: number;
    direction: 'up' | 'down' | 'flat';
    isPositive: boolean;
  };
}>> {
  const response = await apiClient.get<ApiResponse<any>>(
    `${BASE_PATH}/dashboard/trends-summary`,
    { params: { days }, signal }
  );
  return response.data ?? {};
}

/**
 * 获取报表时间序列趋势数据
 */
export async function getReportTrend(params: {
  metric: string;
  startDate?: string;
  endDate?: string;
  granularity?: 'day' | 'week' | 'month';
  projectId?: string;
}): Promise<Array<{ date: string; value: number }>> {
  const response = await apiClient.get<ApiResponse<any>>(
    `${BASE_PATH}/reports/trend`,
    { params }
  );
  return response.data ?? [];
}

// ============ 仪表板 Detail API（按角色聚合） ============

export interface AdminDashboardDetail {
  departmentEfficiency: Array<{
    id: number; name: string; completionRate: number; delayRate: number;
    utilizationRate: number; activity: number; trend: number;
    status: 'healthy' | 'warning' | 'risk';
  }>;
  taskTypeDistribution: Array<{
    taskType: string; taskTypeName: string; count: number;
    completedCount: number; delayedCount: number;
    completionRate: number; delayRate: number; avgDuration: number;
  }>;
  allocationSuggestions: Array<{
    type: 'overloaded' | 'idle' | 'rebalance';
    memberName: string; currentLoad: number; suggestion: string;
  }>;
  departmentDelayTrends: Array<Record<string, string | number>>;
  utilizationTrends: Array<{ date: string; utilization: number; target?: number }>;
  highRiskProjects: Array<{
    id: string; name: string; riskFactors: string[];
    completionRate: number; delayedTasks: number; manager: string;
  }>;
}

export interface DeptManagerDashboardDetail {
  groupEfficiency: Array<{
    id: number; name: string; completionRate: number; delayRate: number;
    loadRate: number; activity: number; memberCount: number;
    trend: number; status: 'healthy' | 'warning' | 'risk';
  }>;
  memberStatus: Array<{
    id: number; name: string; avatar: string | null;
    inProgress: number; completed: number; delayed: number;
    loadRate: number; activity: number; trend: number;
    status: 'healthy' | 'warning' | 'risk' | 'idle';
  }>;
  taskTypeDistribution: AdminDashboardDetail['taskTypeDistribution'];
  allocationSuggestions: AdminDashboardDetail['allocationSuggestions'];
  groupActivityTrends: Array<Record<string, string | number>>;
}

export interface TechManagerDashboardDetail {
  memberStatus: DeptManagerDashboardDetail['memberStatus'];
  taskTypeDistribution: AdminDashboardDetail['taskTypeDistribution'];
  allocationSuggestions: AdminDashboardDetail['allocationSuggestions'];
  availableGroups: Array<{ id: number; name: string }>;
  memberActivityTrends: Array<Record<string, string | number>>;
}

export interface EngineerDashboardDetail {
  todoTasks: Array<{
    id: string; name: string; projectName: string; dueDate: string | null;
    progress: number; priority: string; daysOverdue?: number; lastUpdated?: string;
  }>;
  needUpdateTasks: Array<{
    id: string; name: string; projectName: string; dueDate: string | null;
    progress: number; priority: string; daysOverdue?: number; lastUpdated?: string;
  }>;
  taskStatusDistribution: Array<{ status: string; count: number }>;
}

export async function getAdminDashboardDetail(signal?: AbortSignal): Promise<AdminDashboardDetail> {
  const response = await apiClient.get<ApiResponse<AdminDashboardDetail>>(
    `${BASE_PATH}/dashboard/admin/detail`,
    { signal }
  );
  return response.data;
}

export async function getDeptManagerDashboardDetail(signal?: AbortSignal): Promise<DeptManagerDashboardDetail> {
  const response = await apiClient.get<ApiResponse<DeptManagerDashboardDetail>>(
    `${BASE_PATH}/dashboard/dept-manager/detail`,
    { signal }
  );
  return response.data;
}

export async function getTechManagerDashboardDetail(groupId?: number, signal?: AbortSignal): Promise<TechManagerDashboardDetail> {
  const response = await apiClient.get<ApiResponse<TechManagerDashboardDetail>>(
    `${BASE_PATH}/dashboard/tech-manager/detail`,
    { params: groupId ? { groupId } : {}, signal }
  );
  return response.data;
}

export async function getEngineerDashboardDetail(signal?: AbortSignal): Promise<EngineerDashboardDetail> {
  const response = await apiClient.get<ApiResponse<EngineerDashboardDetail>>(
    `${BASE_PATH}/dashboard/engineer/detail`,
    { signal }
  );
  return response.data;
}

export const analyticsApi = {
  getDashboardStats,
  getTaskTrend,
  getAllProjectsProgress,
  getTaskStatistics,
  getDelayAnalysis,
  getDashboardTrends,
  getReportTrend,
  getAdminDashboardDetail,
  getDeptManagerDashboardDetail,
  getTechManagerDashboardDetail,
  getEngineerDashboardDetail,
};

// ============ 审计日志 API ============

export interface AuditLog {
  auditId: string;
  actorUserId: number | null;
  actorUsername: string | null;
  actorRole: string | null;
  category: 'security' | 'project' | 'task' | 'org' | 'config';
  action: string;
  tableName: string;
  recordId: string | null;
  details: string | null;
  beforeData: Record<string, unknown> | null;
  afterData: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
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
  // axios 拦截器已经解包 response.data，所以 response = { success: true, data: AuditLogListResult }
  // response.data 就是 { items: [...], total: number }
  return response.data ?? { items: [], total: 0, page: 1, pageSize: 50 };
}

/**
 * 获取审计日志筛选选项
 */
export async function getAuditLogOptions(): Promise<AuditLogOptions> {
  const response = await apiClient.get<ApiResponse<AuditLogOptions>>(`${BASE_PATH}/audit-logs/options`);
  // axios 拦截器已经解包 response.data，所以 response.data 就是实际数据
  return response.data ?? { categories: [], actionTypes: [] };
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
