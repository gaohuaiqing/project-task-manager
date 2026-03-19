/**
 * 任务管理模块类型定义
 */

// 任务状态
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'delayed';

// 任务优先级
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

// 任务类型
export type TaskType = 'frontend' | 'backend' | 'test' | 'design' | 'other';

// 任务基本信息
export interface Task {
  id: string;
  projectId: string;
  parentId: string | null;
  wbsCode: string;
  name: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  taskType: TaskType;
  assigneeId: number | null;
  assigneeName: string | null;
  estimatedHours: number | null;
  actualHours: number | null;
  progress: number;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  sortOrder: number;
  level: number;
  createdAt: string;
  updatedAt: string;
  version: number;
}

// 任务依赖
export interface TaskDependency {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
  dependencyType: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';
  createdAt: string;
}

// 进度记录
export interface ProgressRecord {
  id: string;
  taskId: string;
  content: string;
  progress: number;
  createdBy: number;
  creatorName: string;
  createdAt: string;
}

// 任务统计
export interface TaskStats {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  delayed: number;
  avgProgress: number;
}

// 任务查询参数
export interface TaskQueryParams {
  project_id?: string;
  status?: TaskStatus;
  task_type?: TaskType;
  priority?: TaskPriority;
  assignee_id?: number;
  parent_id?: string | null;
  search?: string;
  page?: number;
  pageSize?: number;
}

// 创建任务请求
export interface CreateTaskRequest {
  projectId: string;
  parentId?: string | null;
  name: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  taskType?: TaskType;
  assigneeId?: number | null;
  estimatedHours?: number | null;
  plannedStartDate?: string | null;
  plannedEndDate?: string | null;
}

// 更新任务请求
export interface UpdateTaskRequest {
  name?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  taskType?: TaskType;
  assigneeId?: number | null;
  estimatedHours?: number | null;
  actualHours?: number | null;
  progress?: number;
  plannedStartDate?: string | null;
  plannedEndDate?: string | null;
  actualStartDate?: string | null;
  actualEndDate?: string | null;
  version: number;
}

// 任务列表响应
export interface TaskListResponse {
  items: Task[];
  total: number;
  page: number;
  pageSize: number;
}

// 带层级的任务（用于 WBS 树）
export interface TaskWithChildren extends Task {
  children: TaskWithChildren[];
}
