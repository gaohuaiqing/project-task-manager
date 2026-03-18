/**
 * 任务数据服务
 *
 * 核心功能：
 * - CRUD操作
 * - 乐观锁版本控制
 * - 缓存管理
 */

import { databaseService } from '../services/DatabaseService.js';
import { cacheManager } from '../cache/index.js';
import { broadcastService } from '../realtime/index.js';
import { logger, LOG_CATEGORIES } from '../logging/index.js';
import type { Task, QueryOptions } from './types.js';
import { VersionConflictError, DataChangeType } from './types.js';

/**
 * 任务数据服务类
 */
export class TaskService {
  /**
   * 获取任务列表
   */
  async getTasks(projectId?: number, options: QueryOptions = {}): Promise<Task[]> {
    const { sortBy = 'task_code', sortOrder = 'ASC', filters = {} } = options;

    // 尝试从缓存获取
    const cached = await cacheManager.getTasksList(projectId);
    if (cached.success && cached.data) {
      return cached.data;
    }

    // 从数据库查询
    let query = 'SELECT * FROM wbs_tasks WHERE 1=1';
    const params: any[] = [];

    if (projectId) {
      query += ' AND project_id = ?';
      params.push(projectId);
    }

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.assignee_id) {
      query += ' AND assignee_id = ?';
      params.push(filters.assignee_id);
    }

    if (filters.search) {
      query += ' AND (task_code LIKE ? OR task_name LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm);
    }

    query += ` ORDER BY ${sortBy} ${sortOrder}`;

    const tasks = await databaseService.query(query, params) as any[];

    // 写入缓存
    await cacheManager.setTasksList(tasks, projectId);

    return tasks;
  }

  /**
   * 获取任务详情
   */
  async getTask(taskId: number): Promise<Task | null> {
    // 尝试从缓存获取
    const cached = await cacheManager.getTask(taskId);
    if (cached.success && cached.data) {
      return cached.data;
    }

    // 从数据库查询
    const tasks = await databaseService.query(
      'SELECT * FROM wbs_tasks WHERE id = ?',
      [taskId]
    ) as any[];

    if (!tasks || tasks.length === 0) {
      return null;
    }

    const task = tasks[0];

    // 写入缓存
    await cacheManager.setTask(taskId, task);

    return task;
  }

  /**
   * 创建任务
   */
  async createTask(data: Partial<Task>, userId: number): Promise<Task> {
    const connection = await databaseService.getConnection();

    try {
      await connection.beginTransaction();

      const [result] = await connection.execute(
        `INSERT INTO wbs_tasks
         (project_id, parent_id, task_code, wbs_code, task_name, description, task_type, status,
          priority, estimated_hours, planned_start_date, planned_end_date, assignee_id,
          dependencies, tags, attachments, subtasks, progress, version, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        [
          data.project_id,
          data.parent_id || null,
          data.task_code,
          data.wbs_code || null,
          data.task_name,
          data.description || null,
          data.task_type || 'task',
          data.status || 'pending',
          data.priority || 1,
          data.estimated_hours || null,
          data.planned_start_date || null,
          data.planned_end_date || null,
          data.assignee_id || null,
          JSON.stringify(data.dependencies || []),
          JSON.stringify(data.tags || []),
          JSON.stringify(data.attachments || []),
          JSON.stringify(data.subtasks || []),
          data.progress || 0,
          userId
        ]
      );

      const taskId = (result as any).insertId;

      await connection.commit();

      const task = await this.getTask(taskId);

      // 广播变更
      await broadcastService.broadcastTaskChange(taskId, 'create' as DataChangeType, task, userId);

      // 删除列表缓存
      await cacheManager.invalidateTasksList(data.project_id);

      logger.info(LOG_CATEGORIES.DATA_SYNC, '任务已创建', {
        taskId,
        taskCode: data.task_code,
        userId
      });

      return task!;
    } catch (error: any) {
      await connection.rollback();
      logger.error(LOG_CATEGORIES.DATA_SYNC, '创建任务失败', {
        taskCode: data.task_code,
        error: error.message
      });
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 更新任务（带乐观锁）
   */
  async updateTask(
    taskId: number,
    data: Partial<Task>,
    currentVersion: number,
    userId: number
  ): Promise<Task> {
    const connection = await databaseService.getConnection();

    try {
      await connection.beginTransaction();

      const [result] = await connection.execute(
        `UPDATE wbs_tasks
         SET task_name = ?,
             description = ?,
             status = ?,
             priority = ?,
             estimated_hours = ?,
             actual_hours = ?,
             progress = ?,
             planned_start_date = ?,
             planned_end_date = ?,
             assignee_id = ?,
             dependencies = ?,
             tags = ?,
             version = version + 1
         WHERE id = ? AND version = ?`,
        [
          data.task_name,
          data.description || null,
          data.status,
          data.priority,
          data.estimated_hours || null,
          data.actual_hours || null,
          data.progress || 0,
          data.planned_start_date || null,
          data.planned_end_date || null,
          data.assignee_id || null,
          JSON.stringify(data.dependencies || []),
          JSON.stringify(data.tags || []),
          taskId,
          currentVersion
        ]
      );

      if ((result as any).affectedRows === 0) {
        await connection.rollback();
        throw new VersionConflictError({
          current: null,
          attempted: data,
          history: [],
          message: '版本冲突：该任务已被其他用户修改'
        });
      }

      await connection.commit();

      // 删除缓存
      await cacheManager.invalidateTask(taskId);

      const task = await this.getTask(taskId);

      // 广播变更
      await broadcastService.broadcastTaskChange(taskId, 'update' as DataChangeType, task, userId);

      logger.info(LOG_CATEGORIES.DATA_SYNC, '任务已更新', {
        taskId,
        version: currentVersion + 1,
        userId
      });

      return task!;
    } catch (error: any) {
      await connection.rollback();
      if (error instanceof VersionConflictError) {
        throw error;
      }
      logger.error(LOG_CATEGORIES.DATA_SYNC, '更新任务失败', {
        taskId,
        error: error.message
      });
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 删除任务（带乐观锁）
   */
  async deleteTask(taskId: number, currentVersion: number, userId: number): Promise<boolean> {
    const connection = await databaseService.getConnection();

    try {
      await connection.beginTransaction();

      const [result] = await connection.execute(
        'DELETE FROM wbs_tasks WHERE id = ? AND version = ?',
        [taskId, currentVersion]
      );

      if ((result as any).affectedRows === 0) {
        await connection.rollback();
        throw new VersionConflictError({
          current: null,
          attempted: { taskId, version: currentVersion },
          history: [],
          message: '版本冲突：该任务已被其他用户修改或删除'
        });
      }

      await connection.commit();

      // 删除缓存
      await cacheManager.invalidateTask(taskId);

      // 广播变更
      await broadcastService.broadcastTaskChange(taskId, 'delete' as DataChangeType, { taskId }, userId);

      logger.info(LOG_CATEGORIES.DATA_SYNC, '任务已删除', {
        taskId,
        userId
      });

      return true;
    } catch (error: any) {
      await connection.rollback();
      if (error instanceof VersionConflictError) {
        throw error;
      }
      logger.error(LOG_CATEGORIES.DATA_SYNC, '删除任务失败', {
        taskId,
        error: error.message
      });
      throw error;
    } finally {
      connection.release();
    }
  }
}

/**
 * 全局任务服务实例
 */
export const taskService = new TaskService();

/**
 * 默认导出
 */
export default taskService;
