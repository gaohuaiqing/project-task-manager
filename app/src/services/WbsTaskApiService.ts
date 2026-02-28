/**
 * WBS 任务 API 服务
 *
 * 统一前端 WBS 任务数据访问层，解决以下问题：
 * 1. 双轨数据存储（dataService vs mySqlDataService）
 * 2. 前后端类型不匹配（string vs number ID）
 * 3. 统一 API 调用入口
 *
 * 设计原则：
 * - 前端使用 string 类型的 task ID
 * - 与后端通信时自动进行类型转换
 * - 所有操作通过 mySqlDataService 调用后端 API
 */

import { mySqlDataService, type WbsTask as MySqlWbsTask } from './MySqlDataService';
import type { WbsTask } from '@/types/wbs';

// ==================== 类型转换工具 ====================

/**
 * 将后端 WbsTask（number ID）转换为前端 WbsTask（string ID）
 */
export function toFrontendWbsTask(backendTask: MySqlWbsTask): WbsTask {
  return {
    id: String(backendTask.id),
    projectId: String(backendTask.project_id),
    memberId: backendTask.assignee_id ? String(backendTask.assignee_id) : '',
    title: backendTask.task_name,
    description: backendTask.description || '',
    status: mapBackendStatus(backendTask.status),
    priority: mapPriorityFromNumber(backendTask.priority),
    approvalStatus: backendTask.approval_status || undefined,

    // 计划时间
    plannedStartDate: backendTask.planned_start_date || '',
    plannedEndDate: backendTask.planned_end_date || '',
    plannedDays: calculatePlannedDays(backendTask.planned_start_date, backendTask.planned_end_date),

    // 实际时间
    actualStartDate: backendTask.actual_start_date,
    actualEndDate: backendTask.actual_end_date,
    actualDays: calculateActualDays(backendTask.actual_start_date, backendTask.actual_end_date),
    fullTimeRatio: backendTask.full_time_ratio,

    // WBS 层级结构
    parentId: backendTask.parent_id != null ? String(backendTask.parent_id) : undefined,
    wbsCode: backendTask.task_code,
    level: 0, // 需要根据 parentId 计算
    subtasks: [], // 需要根据父子关系构建

    // 进度
    progress: backendTask.progress || 0,

    // 前置任务
    predecessor: backendTask.dependencies?.[0] ? String(backendTask.dependencies[0]) : undefined,

    // 扩展字段
    order: 0,
    isExpanded: true,
    estimatedHours: backendTask.estimated_hours,
    actualHours: backendTask.actual_hours,

    // 时间戳
    createdAt: backendTask.created_at,
    updatedAt: backendTask.updated_at,
  };
}

/**
 * 将前端 WbsTask（string ID）转换为后端数据格式
 */
export function toBackendWbsTaskData(frontendTask: Partial<WbsTask>): Partial<MySqlWbsTask> {
  const backendData: Partial<MySqlWbsTask> = {
    task_name: frontendTask.title,
    description: frontendTask.description,
    task_code: frontendTask.wbsCode,
    task_type: 'task', // 默认类型
    status: mapFrontendStatus(frontendTask.status),
    priority: mapPriorityToNumber(frontendTask.priority),
    progress: frontendTask.progress || 0,
    estimated_hours: frontendTask.estimatedHours,
    actual_hours: frontendTask.actualHours,
    planned_start_date: frontendTask.plannedStartDate,
    planned_end_date: frontendTask.plannedEndDate,
    actual_start_date: frontendTask.actualStartDate,
    actual_end_date: frontendTask.actualEndDate,
    full_time_ratio: frontendTask.fullTimeRatio,
    parent_id: frontendTask.parentId ? parseInt(frontendTask.parentId) : undefined,
    assignee_id: frontendTask.memberId ? parseInt(frontendTask.memberId) : undefined,
    dependencies: frontendTask.predecessor ? [parseInt(frontendTask.predecessor)] : undefined,
  };

  // 项目ID转换
  if (frontendTask.projectId) {
    backendData.project_id = parseInt(frontendTask.projectId);
  }

  return backendData;
}

// ==================== 状态映射 ====================

function mapBackendStatus(status: MySqlWbsTask['status']): WbsTask['status'] {
  const statusMap: Record<MySqlWbsTask['status'], WbsTask['status']> = {
    'pending': 'not_started',
    'in_progress': 'in_progress',
    'completed': 'completed',
    'delayed': 'delayed',
    'cancelled': 'cancelled', // 取消状态独立映射
  };
  return statusMap[status] || 'not_started';
}

function mapFrontendStatus(status: WbsTask['status'] | undefined): MySqlWbsTask['status'] {
  if (!status) return 'pending';
  const statusMap: Record<WbsTask['status'], MySqlWbsTask['status']> = {
    'not_started': 'pending',
    'in_progress': 'in_progress',
    'completed': 'completed',
    'delayed': 'delayed',
    'cancelled': 'cancelled', // 支持取消状态
  };
  return statusMap[status] || 'pending';
}

function mapPriorityFromNumber(priority: number): WbsTask['priority'] {
  if (priority >= 3) return 'high';
  if (priority >= 2) return 'medium';
  return 'low';
}

function mapPriorityToNumber(priority: WbsTask['priority'] | undefined): number {
  const priorityMap: Record<WbsTask['priority'], number> = {
    'low': 1,
    'medium': 2,
    'high': 3,
  };
  return priorityMap[priority || 'medium'];
}

// ==================== 日期计算工具 ====================

function calculatePlannedDays(startDate: string | undefined, endDate: string | undefined): number {
  if (!startDate || !endDate) return 1;
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
}

function calculateActualDays(startDate: string | undefined, endDate: string | undefined): number | undefined {
  if (!startDate || !endDate) return undefined;
  return calculatePlannedDays(startDate, endDate);
}

// ==================== 主服务类 ====================

class WbsTaskApiService {
  // 内存缓存（使用前端数据类型）
  private cache: Map<string, { data: WbsTask[]; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 60 * 1000; // 60秒

  /**
   * 获取所有任务（前端类型）
   */
  async getTasks(projectId?: string): Promise<WbsTask[]> {
    const cacheKey = projectId ? `wbs_tasks_${projectId}` : 'wbs_tasks_all';

    // 检查缓存
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log('[WbsTaskApiService] 从缓存获取任务列表');
      return cached.data;
    }

    try {
      // 调用后端 API
      const backendTasks = await mySqlDataService.getWbsTasks(
        projectId ? parseInt(projectId) : undefined
      );

      // 转换为前端类型
      const frontendTasks = backendTasks.map(toFrontendWbsTask);

      // 更新缓存
      this.cache.set(cacheKey, {
        data: frontendTasks,
        timestamp: Date.now()
      });

      console.log('[WbsTaskApiService] 从服务器获取任务列表:', frontendTasks.length, '个任务');
      return frontendTasks;
    } catch (error) {
      console.error('[WbsTaskApiService] 获取任务列表失败:', error);
      // 返回缓存数据（如果有）
      return cached?.data || [];
    }
  }

  /**
   * 获取单个任务
   */
  async getTask(taskId: string): Promise<WbsTask | null> {
    try {
      // 从所有任务中查找（优化：可添加后端单个查询接口）
      const tasks = await this.getTasks();
      return tasks.find(t => t.id === taskId) || null;
    } catch (error) {
      console.error('[WbsTaskApiService] 获取任务失败:', error);
      return null;
    }
  }

  /**
   * 创建任务
   */
  async createTask(task: Partial<WbsTask>): Promise<WbsTask> {
    try {
      // 转换为后端格式
      const backendData = toBackendWbsTaskData(task);

      // 调用后端 API
      const createdTask = await mySqlDataService.createWbsTask(backendData);

      // 清除缓存
      this.invalidateCache();

      // 转换回前端格式
      return toFrontendWbsTask(createdTask);
    } catch (error) {
      console.error('[WbsTaskApiService] 创建任务失败:', error);
      throw error;
    }
  }

  /**
   * 更新任务
   */
  async updateTask(taskId: string, updates: Partial<WbsTask>, expectedVersion?: number): Promise<WbsTask> {
    try {
      // 转换为后端格式
      const backendData = toBackendWbsTaskData(updates);

      // 调用后端 API
      const updatedTask = await mySqlDataService.updateWbsTask(
        parseInt(taskId),
        backendData,
        expectedVersion
      );

      // 清除缓存
      this.invalidateCache();

      // 转换回前端格式
      return toFrontendWbsTask(updatedTask);
    } catch (error) {
      console.error('[WbsTaskApiService] 更新任务失败:', error);
      throw error;
    }
  }

  /**
   * 删除任务
   */
  async deleteTask(taskId: string): Promise<void> {
    try {
      await mySqlDataService.deleteWbsTask(parseInt(taskId));

      // 清除缓存
      this.invalidateCache();
    } catch (error) {
      console.error('[WbsTaskApiService] 删除任务失败:', error);
      throw error;
    }
  }

  /**
   * 批量保存任务（用于表格编辑）
   * 使用事务性保存，失败时回滚已创建的任务
   */
  async saveTasks(tasks: WbsTask[]): Promise<{ success: boolean; message?: string }> {
    // 记录已创建的任务ID（用于回滚）
    const createdTaskIds: number[] = [];
    const updatedTaskIds: number[] = [];

    try {
      // 逐个保存任务
      for (const task of tasks) {
        const backendData = toBackendWbsTaskData(task);

        // 检查是否是新任务（ID以 task- 开头表示前端临时ID）
        if (task.id.startsWith('task-')) {
          // 新任务：创建
          const createdTask = await mySqlDataService.createWbsTask(backendData);
          createdTaskIds.push(createdTask.id);
        } else {
          // 已存在的任务：更新
          const taskId = parseInt(task.id);
          await mySqlDataService.updateWbsTask(taskId, backendData);
          updatedTaskIds.push(taskId);
        }
      }

      // 清除缓存
      this.invalidateCache();

      console.log('[WbsTaskApiService] 批量保存任务成功:', tasks.length, '个任务');
      return { success: true };
    } catch (error) {
      console.error('[WbsTaskApiService] 批量保存任务失败:', error);

      // 尝试回滚已创建的新任务
      try {
        for (const taskId of createdTaskIds) {
          await mySqlDataService.deleteWbsTask(taskId);
        }
        console.log('[WbsTaskApiService] 已回滚', createdTaskIds.length, '个新创建的任务');
      } catch (rollbackError) {
        console.error('[WbsTaskApiService] 回滚失败:', rollbackError);
      }

      return {
        success: false,
        message: error instanceof Error ? error.message : '保存失败'
      };
    }
  }

  /**
   * 批量更新任务进度
   */
  async batchUpdateProgress(updates: Array<{ taskId: string; progress: number }>): Promise<void> {
    try {
      // 转换为后端格式
      const backendUpdates = updates.map(u => ({
        id: parseInt(u.taskId),
        progress: u.progress
      }));

      await mySqlDataService.batchUpdateTaskProgress(backendUpdates);

      // 清除缓存
      this.invalidateCache();
    } catch (error) {
      console.error('[WbsTaskApiService] 批量更新进度失败:', error);
      throw error;
    }
  }

  /**
   * 更新任务状态
   */
  async updateTaskStatus(taskId: string, status: WbsTask['status']): Promise<WbsTask> {
    return this.updateTask(taskId, { status });
  }

  // ==================== 缓存管理 ====================

  private invalidateCache(): void {
    this.cache.clear();
    console.log('[WbsTaskApiService] 缓存已清除');
  }

  /**
   * 清除所有缓存
   */
  clearCache(): void {
    this.invalidateCache();
  }

  // ==================== 监听器 ====================

  /**
   * 监听数据变化
   */
  onDataChange(callback: (tasks: WbsTask[]) => void): () => void {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'wbsTasks' && e.newValue) {
        try {
          const tasks = JSON.parse(e.newValue) as WbsTask[];
          callback(tasks);
        } catch (error) {
          console.error('[WbsTaskApiService] 解析任务数据失败:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }

  /**
   * 监听后端数据变化（通过 mySqlDataService）
   */
  onBackendChange(callback: (operation: 'create' | 'update' | 'delete', task: WbsTask) => void): () => void {
    return mySqlDataService.on('wbs_tasks', ({ operation, record }) => {
      try {
        const frontendTask = toFrontendWbsTask(record as MySqlWbsTask);
        callback(operation, frontendTask);
      } catch (error) {
        console.error('[WbsTaskApiService] 转换任务数据失败:', error);
      }
    });
  }
}

// 导出单例
export const wbsTaskApiService = new WbsTaskApiService();
