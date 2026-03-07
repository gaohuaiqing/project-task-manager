/**
 * 任务数据服务
 *
 * 负责WBS任务相关的所有数据操作：
 * - 任务CRUD
 * - 任务分配
 * - 任务依赖
 * - 任务进度
 */

import { BaseDataService } from './BaseDataService';

export interface WbsTask {
  id: number;
  project_id: number;
  parent_id?: number;
  task_code: string;
  task_name: string;
  description?: string;
  task_type: 'milestone' | 'phase' | 'task' | 'deliverable';
  status: 'pending' | 'in_progress' | 'completed' | 'delayed' | 'cancelled';
  priority: number;
  estimated_hours?: number;
  actual_hours?: number;
  progress: number;
  planned_start_date?: string;
  planned_end_date?: string;
  actual_start_date?: string;
  actual_end_date?: string;
  full_time_ratio?: number;
  assignee_id?: number;
  assignee_name?: string;
  dependencies?: number[];
  tags?: string[];
  attachments?: any[];
  version: number;
  created_at: string;
  updated_at: string;

  // 审批状态
  approval_status?: 'pending' | 'approved' | 'rejected';
}

export interface TaskAssignment {
  id: number;
  task_id: number;
  assignee_id: number;
  assignee_name?: string;
  assigned_by: number;
  assigned_by_name?: string;
  assigned_at: string;
  unassigned_at?: string;
  status: 'active' | 'cancelled' | 'completed';
  notes?: string;
}

/**
 * 任务数据服务类
 */
export class TaskDataService extends BaseDataService<WbsTask> {
  constructor() {
    super();
    console.log('[TaskDataService] 初始化任务数据服务');
  }

  getServiceName(): string {
    return 'TaskDataService';
  }

  getEndpointPrefix(): string {
    return '/wbs-tasks';
  }

  // ==================== 任务 CRUD 操作 ====================

  /**
   * 获取所有WBS任务
   */
  async getWbsTasks(projectId?: number): Promise<WbsTask[]> {
    const cacheKey = projectId ? `wbs_tasks_project_${projectId}` : 'wbs_tasks_all';
    const cached = this.getListFromCache(cacheKey);
    if (cached) return cached;

    try {
      console.log('[TaskDataService] 从服务器获取WBS任务列表');
      const endpoint = projectId ? `/wbs-tasks?project_id=${projectId}` : '/wbs-tasks';
      const result = await this.get<WbsTask[]>(endpoint);
      this.updateListCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('[TaskDataService] 获取WBS任务列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取单个任务
   */
  async getWbsTask(id: number): Promise<WbsTask | null> {
    const cacheKey = `wbs_task_${id}`;
    const cached = this.getSingleFromCache(cacheKey);
    if (cached) return cached;

    try {
      console.log('[TaskDataService] 获取任务:', id);
      const result = await this.get<WbsTask>(`/wbs-tasks/${id}`);
      this.updateSingleCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('[TaskDataService] 获取任务失败:', error);
      return null;
    }
  }

  /**
   * 创建WBS任务
   */
  async createWbsTask(data: Partial<WbsTask>): Promise<WbsTask> {
    try {
      console.log('[TaskDataService] 创建WBS任务:', data);
      const result = await this.post<WbsTask>('/wbs-tasks', data);
      this.clearCache(); // 清除缓存
      return result;
    } catch (error) {
      console.error('[TaskDataService] 创建WBS任务失败:', error);
      throw error;
    }
  }

  /**
   * 更新WBS任务
   */
  async updateWbsTask(id: number, updates: Partial<WbsTask>, expectedVersion?: number): Promise<WbsTask> {
    try {
      console.log('[TaskDataService] 更新WBS任务:', id, updates);
      const result = await this.put<WbsTask>(`/wbs-tasks/${id}`, { ...updates, expectedVersion });
      this.clearCache(); // 清除缓存
      return result;
    } catch (error: any) {
      if (error.message?.includes('版本冲突') || error.message?.includes('409')) {
        this.handleVersionConflict({ taskId: id, updates });
      }
      throw error;
    }
  }

  /**
   * 删除WBS任务
   */
  async deleteWbsTask(id: number): Promise<void> {
    try {
      console.log('[TaskDataService] 删除WBS任务:', id);
      await this.del(`/wbs-tasks/${id}`);
      this.clearCache(); // 清除缓存
    } catch (error) {
      console.error('[TaskDataService] 删除WBS任务失败:', error);
      throw error;
    }
  }

  // ==================== 任务分配操作 ====================

  /**
   * 分配任务
   */
  async assignTask(taskId: number, assigneeId: number, notes?: string): Promise<TaskAssignment> {
    try {
      console.log('[TaskDataService] 分配任务:', taskId, 'to', assigneeId);
      const result = await this.post<TaskAssignment>(`/wbs-tasks/${taskId}/assign`, {
        assigneeId,
        notes
      });
      this.clearCache();
      return result;
    } catch (error) {
      console.error('[TaskDataService] 分配任务失败:', error);
      throw error;
    }
  }

  /**
   * 取消任务分配
   */
  async unassignTask(taskId: number, assignmentId: number): Promise<void> {
    try {
      console.log('[TaskDataService] 取消任务分配:', taskId, assignmentId);
      await this.del(`/wbs-tasks/${taskId}/assignments/${assignmentId}`);
      this.clearCache();
    } catch (error) {
      console.error('[TaskDataService] 取消任务分配失败:', error);
      throw error;
    }
  }

  /**
   * 获取任务分配历史
   */
  async getTaskAssignments(taskId: number): Promise<TaskAssignment[]> {
    try {
      console.log('[TaskDataService] 获取任务分配历史:', taskId);
      const result = await this.get<TaskAssignment[]>(`/wbs-tasks/${taskId}/assignments`);
      return result;
    } catch (error) {
      console.error('[TaskDataService] 获取任务分配历史失败:', error);
      return [];
    }
  }

  // ==================== 任务进度操作 ====================

  /**
   * 批量更新任务进度
   */
  async batchUpdateTaskProgress(updates: Array<{ id: number; progress: number }>): Promise<void> {
    try {
      console.log('[TaskDataService] 批量更新任务进度:', updates);
      await this.post('/wbs-tasks/batch/progress', { updates });
      this.clearCache();
    } catch (error) {
      console.error('[TaskDataService] 批量更新任务进度失败:', error);
      throw error;
    }
  }

  /**
   * 更新任务状态
   */
  async updateTaskStatus(id: number, status: WbsTask['status']): Promise<WbsTask> {
    try {
      console.log('[TaskDataService] 更新任务状态:', id, status);
      const result = await this.put<WbsTask>(`/wbs-tasks/${id}/status`, { status });
      this.clearCache();
      return result;
    } catch (error) {
      console.error('[TaskDataService] 更新任务状态失败:', error);
      throw error;
    }
  }

  // ==================== 任务依赖操作 ====================

  /**
   * 添加任务依赖
   */
  async addTaskDependency(taskId: number, dependsOnTaskId: number): Promise<void> {
    try {
      console.log('[TaskDataService] 添加任务依赖:', taskId, 'depends on', dependsOnTaskId);
      await this.post(`/wbs-tasks/${taskId}/dependencies`, { dependsOnTaskId });
      this.clearCache();
    } catch (error) {
      console.error('[TaskDataService] 添加任务依赖失败:', error);
      throw error;
    }
  }

  /**
   * 移除任务依赖
   */
  async removeTaskDependency(taskId: number, dependsOnTaskId: number): Promise<void> {
    try {
      console.log('[TaskDataService] 移除任务依赖:', taskId, 'depends on', dependsOnTaskId);
      await this.del(`/wbs-tasks/${taskId}/dependencies/${dependsOnTaskId}`);
      this.clearCache();
    } catch (error) {
      console.error('[TaskDataService] 移除任务依赖失败:', error);
      throw error;
    }
  }

  // ==================== 批量操作 ====================

  /**
   * 批量创建任务
   */
  async batchCreateTasks(tasks: Partial<WbsTask>[]): Promise<WbsTask[]> {
    try {
      console.log('[TaskDataService] 批量创建任务:', tasks.length);
      const result = await this.post<WbsTask[]>('/wbs-tasks/batch', { tasks });
      this.clearCache();
      return result;
    } catch (error) {
      console.error('[TaskDataService] 批量创建任务失败:', error);
      throw error;
    }
  }

  /**
   * 批量更新任务
   */
  async batchUpdateTasks(updates: Array<{ id: number; data: Partial<WbsTask> }>): Promise<WbsTask[]> {
    try {
      console.log('[TaskDataService] 批量更新任务:', updates.length);
      const result = await this.post<WbsTask[]>('/wbs-tasks/batch-update', { updates });
      this.clearCache();
      return result;
    } catch (error) {
      console.error('[TaskDataService] 批量更新任务失败:', error);
      throw error;
    }
  }

  /**
   * 批量删除任务
   */
  async batchDeleteTasks(ids: number[]): Promise<void> {
    try {
      console.log('[TaskDataService] 批量删除任务:', ids);
      await this.post('/wbs-tasks/batch-delete', { ids });
      this.clearCache();
    } catch (error) {
      console.error('[TaskDataService] 批量删除任务失败:', error);
      throw error;
    }
  }
}

// 导出单例
export const taskDataService = new TaskDataService();
