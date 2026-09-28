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
  ActivityTrendQueryOptions,
  ActivityTrendResponse,
} from '@/types/api/analytics';
import type { DelayDetailQuery, DelayDetailResult, DelayType } from '../types';

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
 * v2 交互增强：延期明细下钻（点击柱子查看该维度延期任务明细）
 * 响应 snake_case → camelCase 内联转换（明细为独立小功能，不单独写 transformer）
 */
export async function getDelayDetailTasks(
  options: DelayDetailQuery,
  signal?: AbortSignal
): Promise<DelayDetailResult> {
  const params = new URLSearchParams();
  if (options.assignee_id) params.set('assignee_id', String(options.assignee_id));
  if (options.project_id) params.set('project_id', options.project_id);
  if (options.task_type) params.set('task_type', options.task_type);
  // 逾期未开始下钻模式（后端切换 WHERE 为 MUTEX overdueStart 实时口径并忽略时间段）
  if (options.overdue_start) params.set('overdue_start', 'true');
  if (options.start_date) params.set('start_date', options.start_date);
  if (options.end_date) params.set('end_date', options.end_date);
  if (options.page) params.set('page', String(options.page));
  if (options.page_size) params.set('page_size', String(options.page_size));

  const response = await apiService.get<ApiResponse<any>>(
    `/analytics/reports/delay-analysis/detail-tasks?${params.toString()}`,
    { signal }
  );
  // 注意：apiService 响应拦截器已将 snake_case → camelCase，故 raw/字段均为 camelCase
  const raw = (response.data || {}) as { items?: any[]; total?: number; page?: number; pageSize?: number };
  return {
    items: (raw.items || []).map((t: any) => ({
      id: String(t.id ?? ''),
      taskName: String(t.description ?? ''),
      wbsCode: t.wbsCode || String(t.id ?? ''),
      rootTaskName: t.rootTaskName ?? null,
      assigneeName: String(t.assigneeName ?? '未分配'),
      assigneeId: t.assigneeId != null ? Number(t.assigneeId) : undefined,
      projectName: String(t.projectName ?? '未分配'),
      projectId: t.projectId != null ? String(t.projectId) : undefined,
      taskType: t.taskType ?? undefined,
      priority: t.priority ?? undefined,
      progress: t.progress != null ? Number(t.progress) : undefined,
      actualEndDate: t.actualEndDate ?? null,
      status: t.status ?? undefined,
      plannedEndDate: t.plannedEndDate || '',
      delayDays: Number(t.delayDays) || 0,
      delayType: (t.delayType ?? 'delayed') as DelayType,
      delayReason: String(t.reason ?? '未填写'),
    })),
    total: Number(raw.total) || 0,
    page: Number(raw.page) || 1,
    pageSize: Number(raw.pageSize) || 20,
  };
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
 * 获取活跃度趋势（团队/个人 维护活动时间曲线）
 */
export async function getActivityTrend(
  options: ActivityTrendQueryOptions
): Promise<ActivityTrendResponse> {
  const params = new URLSearchParams();
  params.set('dimension', options.dimension);
  params.set('metric', options.metric);
  if (options.startDate) params.set('start_date', options.startDate);
  if (options.endDate) params.set('end_date', options.endDate);
  if (options.projectId) params.set('project_id', options.projectId);
  if (options.departmentId) params.set('department_id', String(options.departmentId));
  if (options.assigneeId) params.set('assignee_id', String(options.assigneeId));
  if (options.topN) params.set('top_n', String(options.topN));

  const response = await apiService.get<ApiResponse<ActivityTrendResponse>>(
    `/analytics/reports/activity-trend?${params.toString()}`
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
  getActivityTrend,
  getProjectsSimple,
  getMembersSimple,
};
