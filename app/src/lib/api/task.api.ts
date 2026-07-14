/**
 * 任务模块 API
 */
import apiClient from './client';
import type { ApiResponse } from '@/types/api';
import type {
  WBSTask,
  WBSTaskListItem,
  TaskListResponse,
  TaskStats,
  TaskQueryParams,
  CreateTaskRequest,
  UpdateTaskRequest,
  ProgressRecord,
  mapTaskToFrontend,
  mapTasksToFrontend,
  mapTaskToBackend,
} from '@/features/tasks/types';

const BASE_PATH = '/tasks';

// 从类型文件导入映射函数
import {
  mapTaskToFrontend as toFrontend,
  mapTasksToFrontend as toFrontendList,
  mapTaskToBackend as toBackend,
} from '@/features/tasks/types';

/**
 * 递归转换任务及其子任务
 */
function toFrontendListRecursive(items: WBSTaskListItem[]): WBSTaskListItem[] {
  return items.map(item => {
    const converted = toFrontend(item) as WBSTaskListItem;
    // 递归转换 children
    if (item.children && item.children.length > 0) {
      converted.children = toFrontendListRecursive(item.children as WBSTaskListItem[]);
    }
    return converted;
  });
}

/**
 * 将查询参数转换为后端格式（处理数组参数）
 * 注：axios 请求拦截器会自动转换 camelCase -> snake_case
 * 这里只需要处理数组参数的格式转换
 */
function toBackendQueryParams(params: TaskQueryParams): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;

    // 数组参数转为逗号分隔字符串
    if (Array.isArray(value)) {
      result[key] = value.join(',');
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * 获取任务列表（WBS树结构）
 */
export async function getTasks(params: TaskQueryParams = {}): Promise<TaskListResponse> {
  // 转换参数为后端格式（支持数组参数）
  const backendParams = toBackendQueryParams(params);
  const response = await apiClient.get<ApiResponse<{ items: WBSTaskListItem[]; total: number; page: number; pageSize: number }>>(
    `${BASE_PATH}`,
    { params: backendParams }
  );
  const data = response.data;
  return {
    items: toFrontendListRecursive(data.items),
    total: data.total,
    page: data.page,
    pageSize: data.pageSize,
  };
}

/**
 * 获取任务筛选选项（负责人下拉框候选：有任务的 distinct 责任人，项目联动）
 */
export async function getTaskFilterOptions(params?: {
  projectId?: string[];
}): Promise<{ assignees: Array<{ id: number | null; name: string | null }> }> {
  const query: Record<string, string> = {};
  if (params?.projectId && params.projectId.length > 0) {
    query.project_id = params.projectId.join(',');
  }
  const response = await apiClient.get<
    ApiResponse<{ assignees: Array<{ id: number | null; name: string | null }> }>
  >(`${BASE_PATH}/filter-options`, { params: query });
  return response.data;
}

/**
 * 获取任务详情
 */
export async function getTask(id: string): Promise<WBSTask> {
  const response = await apiClient.get<ApiResponse<WBSTask>>(`${BASE_PATH}/${id}`);
  return toFrontend(response.data);
}

/**
 * 根据WBS编码获取任务
 */
export async function getTaskByWbsCode(projectId: string, wbsCode: string): Promise<WBSTask | null> {
  try {
    const response = await apiClient.get<ApiResponse<WBSTask>>(
      `${BASE_PATH}/by-wbs-code/${encodeURIComponent(wbsCode)}`,
      { params: { projectId } }  // 拦截器会自动转换为 project_id
    );
    return toFrontend(response.data);
  } catch {
    return null;
  }
}

/**
 * 获取任务统计
 */
export async function getTaskStats(projectId: string): Promise<TaskStats> {
  const response = await apiClient.get<ApiResponse<TaskStats>>(`${BASE_PATH}/stats/${projectId}`);
  return response.data;
}

/**
 * 批量获取任务
 */
export async function getTasksByIds(ids: string[]): Promise<WBSTask[]> {
  const response = await apiClient.post<ApiResponse<WBSTask[]>>(`${BASE_PATH}/batch/tasks`, { ids });
  return toFrontendList(response.data);
}

/**
 * 创建任务
 */
export async function createTask(data: CreateTaskRequest): Promise<{ id: string }> {
  const backendData = toBackend(data);
  const response = await apiClient.post<ApiResponse<{ id: string }>>(`${BASE_PATH}`, backendData);
  return response.data;
}

/**
 * 更新任务
 * 返回值包含 needsApproval 字段，表示是否需要审批
 */
export async function updateTask(id: string, data: UpdateTaskRequest): Promise<WBSTask & { needsApproval?: boolean }> {
  const backendData = toBackend(data);
  const response = await apiClient.put<ApiResponse<WBSTask & { needsApproval?: boolean }>>(`${BASE_PATH}/${id}`, backendData);
  return toFrontend(response.data);
}

/**
 * 删除任务
 */
export async function deleteTask(id: string): Promise<void> {
  await apiClient.delete(`${BASE_PATH}/${id}`);
}

/**
 * 批量删除任务
 */
export interface BatchDeleteTaskResult {
  success: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}

export async function batchDeleteTasks(ids: string[]): Promise<BatchDeleteTaskResult> {
  const response = await apiClient.post<ApiResponse<BatchDeleteTaskResult>>(`${BASE_PATH}/batch-delete`, { ids });
  // 响应拦截器返回的是 response.data，即 { success: true, data: { success, failed, errors } }
  // 我们需要取 response.data，即后端返回的 data 字段
  return (response as any).data;
}

/**
 * P5: 获取删除预览数据
 */
export async function getDeletePreview(id: string): Promise<ApiResponse<{
  task: WBSTask;
  descendantCount: number;
  descendants: Array<{ id: string; wbs_code: string; description: string; assignee_id: number | null }>;
  hasMore: boolean;
}>> {
  const response = await apiClient.get<ApiResponse<{
    task: WBSTask;
    descendantCount: number;
    descendants: Array<{ id: string; wbs_code: string; description: string; assignee_id: number | null }>;
    hasMore: boolean;
  }>>(`${BASE_PATH}/${id}/delete-preview`);
  return response;
}

/**
 * 获取进度记录
 */
export async function getProgressRecords(taskId: string): Promise<ProgressRecord[]> {
  const response = await apiClient.get<ApiResponse<ProgressRecord[]>>(
    `${BASE_PATH}/${taskId}/progress`
  );
  return response.data.map(record => toFrontend(record) as ProgressRecord);
}

/**
 * 添加进度记录
 */
export async function addProgressRecord(taskId: string, content: string): Promise<{ id: string }> {
  const response = await apiClient.post<ApiResponse<{ id: string }>>(
    `${BASE_PATH}/${taskId}/progress`,
    { content }
  );
  return response.data;
}

/**
 * 构建 WBS 树结构
 */
export function buildWBSTree(tasks: WBSTask[]): WBSTaskListItem[] {
  const taskMap = new Map<string, WBSTaskListItem>();
  const rootTasks: WBSTaskListItem[] = [];

  // 初始化所有任务
  tasks.forEach((task) => {
    taskMap.set(task.id, { ...task, children: [] });
  });

  // 构建树结构
  tasks.forEach((task) => {
    const node = taskMap.get(task.id)!;
    if (task.parentId && taskMap.has(task.parentId)) {
      taskMap.get(task.parentId)!.children!.push(node);
    } else {
      rootTasks.push(node);
    }
  });

  // 按 wbsCode 排序
  const sortByWbsCode = (nodes: WBSTaskListItem[]) => {
    nodes.sort((a, b) => a.wbsCode.localeCompare(b.wbsCode, undefined, { numeric: true }));
    nodes.forEach((node) => {
      if (node.children) {
        sortByWbsCode(node.children);
      }
    });
  };

  sortByWbsCode(rootTasks);
  return rootTasks;
}

/**
 * 获取项目的完整WBS树
 */
export async function getWBSTree(projectId: string): Promise<WBSTaskListItem[]> {
  // 使用 getTasks API 按项目 ID 获取任务，然后构建树结构
  const result = await getTasks({ projectId, pageSize: 100 }); // 获取该项目的所有任务
  return buildWBSTree(result.items);
}

/**
 * 尝试获取任务（用于通知跳转，优雅处理权限错误）
 */
export async function tryGetTask(id: string): Promise<{
  success: boolean;
  task?: WBSTask;
  error?: { code: 'NOT_FOUND' | 'FORBIDDEN' | 'NETWORK_ERROR'; message: string };
}> {
  try {
    const response = await apiClient.get<ApiResponse<WBSTask>>(`${BASE_PATH}/${id}`);
    return { success: true, task: toFrontend(response.data) };
  } catch (error: unknown) {
    // apiClient 拦截器已将错误转换为 { code, message, statusCode } 格式
    const apiError = error as { code?: string; message?: string; statusCode?: number };
    if (apiError.statusCode === 404) {
      return { success: false, error: { code: 'NOT_FOUND', message: '任务不存在或已删除' } };
    }
    if (apiError.statusCode === 403) {
      return { success: false, error: { code: 'FORBIDDEN', message: apiError.message || '无权限访问此任务' } };
    }
    return { success: false, error: { code: 'NETWORK_ERROR', message: '网络错误，请稍后重试' } };
  }
}

/** 导入任务结果 */
export interface ImportResult {
  total: number;
  success: number;
  failed: number;
  results: Array<{
    success: boolean;
    wbsCode?: string;
    rowNumber?: number;
    error?: string;
  }>;
}

/**
 * 导入任务
 * 项目ID由后端根据项目编码自动匹配
 */
export async function importTasks(
  tasks: Array<Record<string, unknown>>
): Promise<ImportResult> {
  // 转换字段名：camelCase -> snake_case，并保留 rowNumber
  const mappedTasks = tasks.map(task => ({
    ...task,
    wbs_code: task.wbsCode || task.wbs_code,
    wbs_level: task.wbsLevel || task.wbs_level,
    task_type: task.taskType || task.task_type,
    assignee_name: task.assigneeName || task.assignee_name,
    assignee_id: task.assigneeId || task.assignee_id,
    predecessor_wbs: task.predecessorWbs || task.predecessor_wbs,
    lag_days: task.lagDays || task.lag_days,
    start_date: task.startDate || task.start_date,
    is_six_day_week: task.isSixDayWeek ?? task.is_six_day_week,
    warning_days: task.warningDays || task.warning_days,
    actual_start_date: task.actualStartDate || task.actual_start_date,
    actual_end_date: task.actualEndDate || task.actual_end_date,
    full_time_ratio: task.fullTimeRatio || task.full_time_ratio,
    redmine_link: task.redmineLink || task.redmine_link,
    project_code: task.projectCode || task.project_code,
  }));

  const response = await apiClient.post<ApiResponse<ImportResult>>(
    `${BASE_PATH}/import`,
    { tasks: mappedTasks }
  );
  return response.data;
}

/**
 * 修改任务等级
 * @param taskId 任务 ID
 * @param targetLevel 目标等级（1-5）
 */
export async function changeTaskLevel(taskId: string, targetLevel: number): Promise<WBSTask[]> {
  const response = await apiClient.patch<ApiResponse<{ affectedTasks: WBSTask[] }>>(
    `${BASE_PATH}/${taskId}/level`,
    { targetLevel }
  );
  return (response.data.affectedTasks || []).map(t => toFrontend(t));
}

/**
 * 拖拽排序：调整同级任务顺序
 * @param taskId 要移动的任务 ID
 * @param afterTaskId 放在哪个任务之后（null 表示排到最前）
 */
export async function reorderTask(taskId: string, afterTaskId: string | null): Promise<void> {
  await apiClient.patch(`${BASE_PATH}/${taskId}/reorder`, {
    afterTaskId,
  });
}

export const taskApi = {
  getTasks,
  getTask,
  tryGetTask,
  getTaskByWbsCode,
  getTaskStats,
  getTasksByIds,
  createTask,
  updateTask,
  deleteTask,
  batchDeleteTasks,
  getProgressRecords,
  addProgressRecord,
  buildWBSTree,
  getWBSTree,
  importTasks,
  changeTaskLevel,
  reorderTask,
};
