/**
 * 报表分析 API
 * 符合需求文档 REQ_07_analytics.md 要求
 *
 * 注：axios 拦截器会自动转换：
 * - 请求参数：camelCase -> snake_case
 * - 响应数据：snake_case -> camelCase
 */
import apiClient from './client';
import type { ApiResponse } from '@/types/api';
import type {
  ProjectProgressReportData,
  TaskStatisticsReportData,
  DelayAnalysisReportData,
  MemberAnalysisReportData,
  ResourceEfficiencyReportData,
  ReportFilters,
} from '@/features/reports/types';

const BASE_PATH = '/analytics';

// ============ 项目进度报表 ============

export async function getProjectProgressReport(projectId: string): Promise<ProjectProgressReportData> {
  const response = await apiClient.get<ApiResponse<any>>(
    `${BASE_PATH}/reports/project-progress`,
    { params: { projectId } }  // 拦截器会自动转换为 project_id
  );
  const data = response.data;  // 拦截器已将 snake_case 转换为 camelCase

  return {
    projectId: data.projectId,
    projectName: data.projectName,
    progress: data.progress ?? 0,
    totalTasks: data.totalTasks ?? 0,
    completedTasks: data.completedTasks ?? 0,
    inProgressTasks: data.inProgressTasks ?? 0,
    statusDistribution: (data.statusDistribution ?? []).map((s: any) => ({
      status: s.status,
      count: s.count,
    })),
    milestones: (data.milestones ?? []).map((m: any) => ({
      id: m.id,
      name: m.name,
      targetDate: m.targetDate,
      completionPercentage: m.completionPercentage ?? 0,
      status: m.status,
    })),
  };
}

// ============ 任务统计报表 ============

export async function getTaskStatisticsReport(filters: ReportFilters = {}): Promise<TaskStatisticsReportData> {
  const response = await apiClient.get<ApiResponse<any>>(
    `${BASE_PATH}/reports/task-statistics`,
    {
      params: {
        projectId: filters.projectId,      // 拦截器会转换为 project_id
        assigneeId: filters.assigneeId,    // 拦截器会转换为 assignee_id
        startDate: filters.startDate,      // 拦截器会转换为 start_date
        endDate: filters.endDate,          // 拦截器会转换为 end_date
      },
    }
  );
  const data = response.data;  // 拦截器已将 snake_case 转换为 camelCase

  return {
    totalTasks: data.totalTasks ?? 0,
    avgCompletionRate: data.avgCompletionRate ?? 0,
    delayRate: data.delayRate ?? 0,
    urgentCount: data.urgentCount ?? 0,
    priorityDistribution: data.priorityDistribution ?? {},
    assigneeDistribution: (data.assigneeDistribution ?? []).map((item: any) => ({
      assigneeId: item.assigneeId ?? 0,
      assigneeName: item.assigneeName ?? '未分配',
      taskCount: item.taskCount ?? 0,
      completedCount: item.completedCount ?? 0,
      delayedCount: item.delayedCount ?? 0,
    })),
    taskTypeDistribution: (data.taskTypeDistribution ?? []).map((item: any) => ({
      taskType: item.taskType ?? 'other',
      taskTypeName: item.taskTypeName ?? '其它',
      count: item.count ?? 0,
      completedCount: item.completedCount ?? 0,
      delayedCount: item.delayedCount ?? 0,
      avgDuration: item.avgDuration ?? 0,
    })),
    taskList: (data.taskList ?? []).map((t: any) => ({
      id: t.id,
      description: t.description,
      projectName: t.projectName ?? '未分配',
      status: t.status,
      progress: t.progress ?? 0,
      assigneeName: t.assigneeName ?? '未分配',
      priority: t.priority,
      plannedEndDate: t.plannedEndDate,
      taskType: t.taskType ?? 'other',
    })),
  };
}

// ============ 延期分析报表 ============

export async function getDelayAnalysisReport(filters: ReportFilters = {}): Promise<DelayAnalysisReportData> {
  const response = await apiClient.get<ApiResponse<any>>(
    `${BASE_PATH}/reports/delay-analysis`,
    {
      params: {
        projectId: filters.projectId,      // 拦截器会转换为 project_id
        delayType: filters.delayType,      // 拦截器会转换为 delay_type
        startDate: filters.startDate,      // 拦截器会转换为 start_date
        endDate: filters.endDate,          // 拦截器会转换为 end_date
      },
    }
  );
  const data = response.data;  // 拦截器已将 snake_case 转换为 camelCase

  return {
    totalDelayed: data.totalDelayed ?? 0,
    warningCount: data.warningCount ?? 0,
    delayedCount: data.delayedCount ?? 0,
    overdueCompletedCount: data.overdueCompletedCount ?? 0,
    delayReasons: (data.delayReasons ?? []).map((r: any) => ({
      reason: r.reason || '未填写',
      count: r.count ?? 0,
    })),
    delayTrend: (data.delayTrend ?? []).map((t: any) => ({
      date: t.date,
      value: t.value ?? 0,
    })),
    delayedTasks: (data.delayedTasks ?? []).map((t: any) => ({
      id: t.id,
      description: t.description,
      projectName: t.projectName ?? '未分配',
      assigneeName: t.assigneeName ?? '未分配',
      delayType: t.delayType,
      delayDays: t.delayDays ?? 0,
      reason: t.reason || '未填写',
      status: t.status,
    })),
  };
}

// ============ 成员任务分析报表 ============

export async function getMemberAnalysisReport(memberId: number): Promise<MemberAnalysisReportData> {
  const response = await apiClient.get<ApiResponse<any>>(
    `${BASE_PATH}/reports/member-analysis`,
    { params: { memberId } }  // 拦截器会自动转换为 member_id
  );
  const data = response.data;  // 拦截器已将 snake_case 转换为 camelCase

  return {
    memberId: data.memberId,
    memberName: data.memberName,
    currentTasks: data.currentTasks ?? 0,
    totalFullTimeRatio: data.totalFullTimeRatio ?? 0,
    avgCompletionRate: data.avgCompletionRate ?? 0,
    capabilityMatch: data.capabilityMatch,
    taskList: (data.taskList ?? []).map((t: any) => ({
      id: t.id,
      description: t.description,
      projectName: t.projectName ?? '未分配',
      status: t.status,
      progress: t.progress ?? 0,
      fullTimeRatio: t.fullTimeRatio ?? 0,
      priority: t.priority,
      plannedEndDate: t.plannedEndDate,
    })),
    capabilities: (data.capabilities ?? []).map((c: any) => ({
      modelName: c.modelName,
      dimensionScores: c.dimensionScores,
      overallScore: c.overallScore ?? 0,
    })),
  };
}

// ============ 资源效能分析报表（v1.2 新增） ============

export async function getResourceEfficiencyReport(filters: ReportFilters = {}): Promise<ResourceEfficiencyReportData> {
  const response = await apiClient.get<ApiResponse<any>>(
    `${BASE_PATH}/reports/resource-efficiency`,
    {
      params: {
        projectId: filters.projectId,
        startDate: filters.startDate,
        endDate: filters.endDate,
      },
    }
  );
  const data = response.data;

  return {
    avgProductivity: data.avgProductivity ?? 0,
    avgEstimationAccuracy: data.avgEstimationAccuracy ?? 0,
    avgReworkRate: data.avgReworkRate ?? 0,
    avgFulltimeUtilization: data.avgFulltimeUtilization ?? 0,
    memberEfficiencyList: (data.memberEfficiencyList ?? []).map((m: any) => ({
      memberId: m.memberId,
      memberName: m.memberName,
      department: m.department,
      techGroup: m.techGroup,
      completedTasks: m.completedTasks ?? 0,
      productivity: m.productivity ?? 0,
      estimationAccuracy: m.estimationAccuracy ?? 0,
      reworkRate: m.reworkRate ?? 0,
      fulltimeUtilization: m.fulltimeUtilization ?? 0,
      avgTaskComplexity: m.avgTaskComplexity ?? 0,
    })),
    productivityTrend: (data.productivityTrend ?? []).map((t: any) => ({
      period: t.period,
      productivity: t.productivity ?? 0,
      taskCount: t.taskCount ?? 0,
    })),
    teamEfficiencyComparison: (data.teamEfficiencyComparison ?? []).map((t: any) => ({
      teamName: t.teamName,
      teamType: t.teamType,
      memberCount: t.memberCount ?? 0,
      avgProductivity: t.avgProductivity ?? 0,
      avgEstimationAccuracy: t.avgEstimationAccuracy ?? 0,
      avgReworkRate: t.avgReworkRate ?? 0,
    })),
  };
}

// ============ 导出 ============

export const reportsApi = {
  getProjectProgressReport,
  getTaskStatisticsReport,
  getDelayAnalysisReport,
  getMemberAnalysisReport,
  getResourceEfficiencyReport,
};
