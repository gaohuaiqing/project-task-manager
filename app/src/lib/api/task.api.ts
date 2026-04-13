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

export const taskApi = {
  getTasks,
  getTask,
  getTaskByWbsCode,
  getTaskStats,
  getTasksByIds,
  createTask,
  updateTask,
  deleteTask,
  getProgressRecords,
  addProgressRecord,
  buildWBSTree,
  getWBSTree,
};
