/**
 * 任务模块 API
 */
import apiClient from './client';
import type { ApiResponse } from '@/types/api';
import type {
  Task,
  TaskWithChildren,
  ProgressRecord,
  TaskStats,
  TaskQueryParams,
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskListResponse,
} from '@/features/tasks/types';

const BASE_PATH = '/api/task';

/**
 * 获取任务列表
 */
export async function getTasks(params: TaskQueryParams = {}): Promise<TaskListResponse> {
  const response = await apiClient.get<ApiResponse<TaskListResponse>>(`${BASE_PATH}/tasks`, {
    params,
  });
  return response.data.data;
}

/**
 * 获取任务详情
 */
export async function getTask(id: string): Promise<Task> {
  const response = await apiClient.get<ApiResponse<Task>>(`${BASE_PATH}/tasks/${id}`);
  return response.data.data;
}

/**
 * 获取任务统计
 */
export async function getTaskStats(projectId: string): Promise<TaskStats> {
  const response = await apiClient.get<ApiResponse<TaskStats>>(`${BASE_PATH}/tasks/stats/${projectId}`);
  return response.data.data;
}

/**
 * 批量获取任务
 */
export async function getTasksByIds(ids: string[]): Promise<Task[]> {
  const response = await apiClient.post<ApiResponse<Task[]>>(`${BASE_PATH}/batch/tasks`, { ids });
  return response.data.data;
}

/**
 * 创建任务
 */
export async function createTask(data: CreateTaskRequest): Promise<{ id: string }> {
  const response = await apiClient.post<ApiResponse<{ id: string }>>(`${BASE_PATH}/tasks`, data);
  return response.data.data;
}

/**
 * 更新任务
 */
export async function updateTask(id: string, data: UpdateTaskRequest): Promise<Task> {
  const response = await apiClient.put<ApiResponse<Task>>(`${BASE_PATH}/tasks/${id}`, data);
  return response.data.data;
}

/**
 * 删除任务
 */
export async function deleteTask(id: string): Promise<void> {
  await apiClient.delete(`${BASE_PATH}/tasks/${id}`);
}

/**
 * 获取进度记录
 */
export async function getProgressRecords(taskId: string): Promise<ProgressRecord[]> {
  const response = await apiClient.get<ApiResponse<ProgressRecord[]>>(
    `${BASE_PATH}/tasks/${taskId}/progress`
  );
  return response.data.data;
}

/**
 * 添加进度记录
 */
export async function addProgressRecord(taskId: string, content: string): Promise<{ id: string }> {
  const response = await apiClient.post<ApiResponse<{ id: string }>>(
    `${BASE_PATH}/tasks/${taskId}/progress`,
    { content }
  );
  return response.data.data;
}

/**
 * 构建 WBS 树结构
 */
export function buildWBSTree(tasks: Task[]): TaskWithChildren[] {
  const taskMap = new Map<string, TaskWithChildren>();
  const rootTasks: TaskWithChildren[] = [];

  // 初始化所有任务
  tasks.forEach((task) => {
    taskMap.set(task.id, { ...task, children: [] });
  });

  // 构建树结构
  tasks.forEach((task) => {
    const node = taskMap.get(task.id)!;
    if (task.parentId && taskMap.has(task.parentId)) {
      taskMap.get(task.parentId)!.children.push(node);
    } else {
      rootTasks.push(node);
    }
  });

  // 按 sortOrder 排序
  const sortByOrder = (nodes: TaskWithChildren[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder);
    nodes.forEach((node) => sortByOrder(node.children));
  };

  sortByOrder(rootTasks);
  return rootTasks;
}

export const taskApi = {
  getTasks,
  getTask,
  getTaskStats,
  getTasksByIds,
  createTask,
  updateTask,
  deleteTask,
  getProgressRecords,
  addProgressRecord,
  buildWBSTree,
};
