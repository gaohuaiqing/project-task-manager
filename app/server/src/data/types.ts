/**
 * 数据服务类型定义
 */

/**
 * 版本冲突错误
 */
export class VersionConflictError extends Error {
  public current: any;
  public attempted: any;
  public history: any[];

  constructor(data: { current: any; attempted: any; history: any[]; message: string }) {
    super(data.message);
    this.name = 'VersionConflictError';
    this.current = data.current;
    this.attempted = data.attempted;
    this.history = data.history;
  }
}

/**
 * 基础实体接口（带版本控制）
 */
export interface VersionedEntity {
  id: number;
  version: number;
  created_at: Date;
  updated_at: Date;
  created_by?: number;
}

/**
 * 项目实体
 */
export interface Project extends VersionedEntity {
  code: string;
  name: string;
  description?: string;
  status: 'planning' | 'in_progress' | 'completed' | 'delayed';
  project_type: 'product_development' | 'other';
  planned_start_date?: Date;
  planned_end_date?: Date;
  actual_start_date?: Date;
  actual_end_date?: Date;
  progress: number;
  task_count: number;
  completed_task_count: number;
}

/**
 * 成员实体
 */
export interface Member extends VersionedEntity {
  name: string;
  employee_id?: string;
  department?: string;
  position?: string;
  skills?: any;
  capabilities?: any;
  status: 'active' | 'inactive';
  user_id?: number;
}

/**
 * 任务实体
 */
export interface Task extends VersionedEntity {
  project_id: number;
  parent_id?: number;
  task_code: string;
  wbs_code?: string;
  task_name: string;
  level?: number;
  description?: string;
  task_type: 'milestone' | 'phase' | 'task' | 'deliverable';
  status: 'pending' | 'in_progress' | 'completed' | 'delayed' | 'cancelled';
  priority: number;
  estimated_hours?: number;
  actual_hours?: number;
  progress: number;
  planned_start_date?: Date;
  planned_end_date?: Date;
  actual_start_date?: Date;
  actual_end_date?: Date;
  assignee_id?: number;
  dependencies?: any;
  tags?: any;
  attachments?: any;
  subtasks?: any;
}

/**
 * 查询选项
 */
export interface QueryOptions {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  filters?: Record<string, any>;
}

/**
 * 分页结果
 */
export interface PaginatedResult<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 批量操作结果
 */
export interface BatchOperationResult {
  success: boolean;
  affected: number;
  errors?: Array<{ id: number; error: string }>;
}

/**
 * 版本历史记录
 */
export interface VersionHistory {
  id: number;
  entity_type: string;
  entity_id: number;
  version: number;
  changed_by: number;
  changed_by_name?: string;
  change_type: 'create' | 'update' | 'delete';
  change_data?: any;
  change_reason?: string;
  created_at: Date;
}

/**
 * 数据变更类型
 */
export enum DataChangeType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete'
}
