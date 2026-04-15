// app/server/src/modules/task/repository.ts
import { getPool } from '../../core/db';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import type { WBSTask, WBSTaskListItem, TaskStatus, ProgressRecord, CreateTaskRequest, UpdateTaskRequest, TaskQueryOptions } from './types';

interface TaskRow extends RowDataPacket, WBSTask {}
interface ProgressRecordRow extends RowDataPacket, ProgressRecord {}

export class TaskRepository {
  // ========== 任务 CRUD ==========

  async getTasks(options: TaskQueryOptions): Promise<{ items: WBSTaskListItem[]; total: number }> {
    const pool = getPool();
    const conditions: string[] = [];
    const params: (string | number | null)[] = [];

    // 辅助函数：添加条件（支持单值或数组）
    const addCondition = (field: string, value: string | number | (string | number)[] | undefined) => {
      if (!value) return;
      if (Array.isArray(value)) {
        if (value.length === 0) return;
        if (value.length === 1) {
          conditions.push(`${field} = ?`);
          params.push(value[0] as string | number);
        } else {
          const placeholders = value.map(() => '?').join(', ');
          conditions.push(`${field} IN (${placeholders})`);
          params.push(...(value as (string | number)[]));
        }
      } else {
        conditions.push(`${field} = ?`);
        params.push(value);
      }
    };

    if (options.project_id) {
      addCondition('t.project_id', options.project_id);
    }
    if (options.status) {
      addCondition('t.status', options.status);
    }
    if (options.task_type) {
      addCondition('t.task_type', options.task_type);
    }
    if (options.priority) {
      addCondition('t.priority', options.priority);
    }
    if (options.assignee_id) {
      addCondition('t.assignee_id', options.assignee_id);
    }
    if (options.parent_id !== undefined) {
      if (options.parent_id === null) {
        conditions.push('t.parent_id IS NULL');
      } else {
        conditions.push('t.parent_id = ?');
        params.push(options.parent_id);
      }
    }
    if (options.search) {
      conditions.push('(t.description LIKE ? OR t.wbs_code LIKE ?)');
      const searchPattern = `%${options.search}%`;
      params.push(searchPattern, searchPattern);
    }
    if (options.accessible_project_ids && options.accessible_project_ids.length > 0) {
      const placeholders = options.accessible_project_ids.map(() => '?').join(', ');
      conditions.push(`t.project_id IN (${placeholders})`);
      params.push(...options.accessible_project_ids);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count
    const [countRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM wbs_tasks t ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    // Data - 不在SQL层排序，改为应用层排序以支持任意层级WBS编码
    const page = options.page || 1;
    const pageSize = options.pageSize || 50;
    const offset = (page - 1) * pageSize;

    const [rows] = await pool.execute<TaskRow[]>(
      `SELECT t.*,
              u.real_name as assignee_name,
              p.name as project_name
       FROM wbs_tasks t
       LEFT JOIN users u ON t.assignee_id = u.id
       LEFT JOIN projects p ON t.project_id = p.id
       ${whereClause}
       LIMIT ${pageSize} OFFSET ${offset}`,
      params
    );

    // 应用层WBS编码排序（支持任意层级）
    const sortedRows = this.sortByWbsCode(rows);

    return { items: sortedRows, total };
  }

  /**
   * WBS编码排序（支持任意层级）
   * 将 WBS 编码如 "1.2.3.4" 拆分为数字数组进行比较
   */
  private sortByWbsCode(rows: TaskRow[]): TaskRow[] {
    return rows.sort((a, b) => {
      const aParts = a.wbs_code.split('.').map(Number);
      const bParts = b.wbs_code.split('.').map(Number);

      // 逐级比较
      const maxLen = Math.max(aParts.length, bParts.length);
      for (let i = 0; i < maxLen; i++) {
        const aVal = aParts[i] ?? 0;  // 不存在的层级视为0
        const bVal = bParts[i] ?? 0;
        if (aVal !== bVal) {
          return aVal - bVal;
        }
      }
      return 0;  // 完全相等
    });
  }

  async getTaskById(id: string): Promise<WBSTask | null> {
    const pool = getPool();
    const [rows] = await pool.execute<TaskRow[]>(
      'SELECT * FROM wbs_tasks WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  /**
   * 根据WBS编码获取任务
   */
  async getTaskByWbsCode(projectId: string, wbsCode: string): Promise<WBSTask | null> {
    const pool = getPool();
    const [rows] = await pool.execute<TaskRow[]>(
      'SELECT * FROM wbs_tasks WHERE project_id = ? AND wbs_code = ?',
      [projectId, wbsCode]
    );
    return rows[0] || null;
  }

  async createTask(data: CreateTaskRequest & { id: string; wbs_code: string; status: TaskStatus; end_date?: string; planned_duration?: number }): Promise<string> {
    const pool = getPool();
    await pool.execute(
      `INSERT INTO wbs_tasks (
        id, project_id, parent_id, wbs_code, wbs_level, description, status, task_type, priority,
        assignee_id, start_date, end_date, duration, planned_duration, is_six_day_week, warning_days, predecessor_id, dependency_type, lag_days,
        redmine_link, full_time_ratio, delay_count, plan_change_count, progress_record_count, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 1)`,
      [
        data.id, data.project_id, data.parent_id || null, data.wbs_code, data.wbs_level, data.description,
        data.status, data.task_type || 'other', data.priority || 'medium', data.assignee_id || null,
        data.start_date || null, data.end_date || null, data.duration || null,
        data.planned_duration ?? null,
        data.is_six_day_week ?? false,
        data.warning_days || 3, data.predecessor_id || null, data.dependency_type || 'FS', data.lag_days || null,
        data.redmine_link || null, data.full_time_ratio ?? 100
      ]
    );
    return data.id;
  }

  async updateTask(id: string, data: UpdateTaskRequest & { version: number; last_plan_refresh_at?: Date; planned_duration?: number; actual_duration?: number; actual_cycle?: number }): Promise<{ updated: boolean; conflict: boolean }> {
    const pool = getPool();
    const fields: string[] = [];
    const values: (string | number | boolean | Date | null)[] = [];

    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
    if (data.task_type !== undefined) { fields.push('task_type = ?'); values.push(data.task_type); }
    if (data.priority !== undefined) { fields.push('priority = ?'); values.push(data.priority); }
    if (data.assignee_id !== undefined) { fields.push('assignee_id = ?'); values.push(data.assignee_id); }
    if (data.start_date !== undefined) { fields.push('start_date = ?'); values.push(data.start_date); }
    if (data.duration !== undefined) { fields.push('duration = ?'); values.push(data.duration); }
    if (data.is_six_day_week !== undefined) { fields.push('is_six_day_week = ?'); values.push(data.is_six_day_week); }
    if (data.warning_days !== undefined) { fields.push('warning_days = ?'); values.push(data.warning_days); }
    if (data.predecessor_id !== undefined) { fields.push('predecessor_id = ?'); values.push(data.predecessor_id); }
    if ((data as any).dependency_type !== undefined) { fields.push('dependency_type = ?'); values.push((data as any).dependency_type); }
    if (data.lag_days !== undefined) { fields.push('lag_days = ?'); values.push(data.lag_days); }
    // 将空字符串日期转换为 null，避免 MySQL 错误
    if (data.actual_start_date !== undefined) { fields.push('actual_start_date = ?'); values.push(data.actual_start_date || null); }
    if (data.actual_end_date !== undefined) { fields.push('actual_end_date = ?'); values.push(data.actual_end_date || null); }
    if (data.redmine_link !== undefined) { fields.push('redmine_link = ?'); values.push(data.redmine_link); }
    if (data.full_time_ratio !== undefined) { fields.push('full_time_ratio = ?'); values.push(data.full_time_ratio); }
    if (data.last_plan_refresh_at !== undefined) { fields.push('last_plan_refresh_at = ?'); values.push(data.last_plan_refresh_at); }
    // 计算字段
    if ((data as any).planned_duration !== undefined) { fields.push('planned_duration = ?'); values.push((data as any).planned_duration); }
    if ((data as any).actual_duration !== undefined) { fields.push('actual_duration = ?'); values.push((data as any).actual_duration); }
    if ((data as any).actual_cycle !== undefined) { fields.push('actual_cycle = ?'); values.push((data as any).actual_cycle); }
    // 待审批变更字段
    if ((data as any).pending_changes !== undefined) { fields.push('pending_changes = ?'); values.push(JSON.stringify((data as any).pending_changes)); }
    if ((data as any).pending_change_type !== undefined) { fields.push('pending_change_type = ?'); values.push((data as any).pending_change_type); }

    if (fields.length === 0) {
      return { updated: false, conflict: false };
    }

    fields.push('version = version + 1');
    values.push(id, data.version);

    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE wbs_tasks SET ${fields.join(', ')} WHERE id = ? AND version = ?`,
      values
    );

    return {
      updated: result.affectedRows > 0,
      conflict: result.affectedRows === 0
    };
  }

  /**
   * 获取任务及其所有后代（使用MySQL CTE递归查询优化）
   * 用于删除前获取所有将被删除的任务列表
   */
  async getTaskWithDescendants(id: string): Promise<WBSTask[]> {
    const pool = getPool();

    // 使用 WITH RECURSIVE CTE 一次性获取所有后代任务
    const [rows] = await pool.execute<TaskRow[]>(
      `
      WITH RECURSIVE TaskTree AS (
        -- 基础查询：获取根任务
        SELECT * FROM wbs_tasks WHERE id = ?
        UNION ALL
        -- 递归查询：获取子任务
        SELECT t.* FROM wbs_tasks t
        INNER JOIN TaskTree tt ON t.parent_id = tt.id
      )
      SELECT * FROM TaskTree
      `,
      [id]
    );

    return rows;
  }

  async deleteTask(id: string): Promise<boolean> {
    const pool = getPool();

    // 使用 CTE 一次性删除所有后代任务（包括自身）
    // 先获取所有后代ID用于清理前置关系
    const [descendants] = await pool.execute<RowDataPacket[]>(
      `WITH RECURSIVE TaskTree AS (
        SELECT id FROM wbs_tasks WHERE id = ?
        UNION ALL
        SELECT t.id FROM wbs_tasks t
        INNER JOIN TaskTree tt ON t.parent_id = tt.id
      ) SELECT id FROM TaskTree`,
      [id]
    );

    const descendantIds = descendants.map((r: RowDataPacket) => r.id);

    if (descendantIds.length === 0) {
      return false;
    }

    // 清除以这些任务为前置的关系（防止悬空引用）
    const placeholders = descendantIds.map(() => '?').join(',');
    await pool.execute(
      `UPDATE wbs_tasks SET predecessor_id = NULL WHERE predecessor_id IN (${placeholders})`,
      descendantIds
    );

    // 删除所有后代任务
    const [result] = await pool.execute<ResultSetHeader>(
      `DELETE FROM wbs_tasks WHERE id IN (${placeholders})`,
      descendantIds
    );

    return result.affectedRows > 0;
  }

  async updateTaskStatus(id: string, status: TaskStatus): Promise<boolean> {
    const pool = getPool();
    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE wbs_tasks SET status = ?, version = version + 1 WHERE id = ?',
      [status, id]
    );
    return result.affectedRows > 0;
  }

  async incrementTaskCounter(id: string, counter: 'delay_count' | 'plan_change_count' | 'progress_record_count'): Promise<void> {
    const pool = getPool();
    await pool.execute(
      `UPDATE wbs_tasks SET ${counter} = ${counter} + 1 WHERE id = ?`,
      [id]
    );
  }

  // ========== WBS编码生成 ==========

  async getNextWbsCode(projectId: string, parentId: string | null): Promise<string> {
    const pool = getPool();
    if (parentId) {
      // 子任务
      const [rows] = await pool.execute<RowDataPacket[]>(
        'SELECT MAX(wbs_code) as max_code FROM wbs_tasks WHERE parent_id = ?',
        [parentId]
      );
      const parentTask = await this.getTaskById(parentId);
      if (!parentTask) return '1';

      const maxCode = rows[0].max_code;
      if (!maxCode) return `${parentTask.wbs_code}.1`;

      const parts = maxCode.split('.');
      const lastPart = parseInt(parts[parts.length - 1]) + 1;
      parts[parts.length - 1] = lastPart.toString();
      return parts.join('.');
    } else {
      // 根任务
      const [rows] = await pool.execute<RowDataPacket[]>(
        'SELECT MAX(CAST(SUBSTRING_INDEX(wbs_code, ".", 1) AS UNSIGNED)) as max_num FROM wbs_tasks WHERE project_id = ? AND parent_id IS NULL',
        [projectId]
      );
      const maxNum = rows[0].max_num || 0;
      return (maxNum + 1).toString();
    }
  }

  // ========== 进度记录 ==========

  async getProgressRecords(taskId: string): Promise<ProgressRecord[]> {
    const pool = getPool();
    try {
      const [rows] = await pool.execute<ProgressRecordRow[]>(
        `SELECT pr.*, u.real_name as recorder_name
         FROM progress_records pr
         JOIN users u ON pr.recorded_by = u.id
         WHERE pr.task_id = ?
         ORDER BY pr.created_at DESC`,
        [taskId]
      );
      return rows;
    } catch (error) {
      // 表不存在时返回空数组
      console.warn('progress_records表不存在，返回空数组');
      return [];
    }
  }

  async createProgressRecord(data: { id: string; task_id: string; content: string; recorded_by: number }): Promise<string> {
    const pool = getPool();
    await pool.execute(
      'INSERT INTO progress_records (id, task_id, content, recorded_by) VALUES (?, ?, ?, ?)',
      [data.id, data.task_id, data.content, data.recorded_by]
    );
    return data.id;
  }

  // ========== 批量操作 ==========

  async getTasksByIds(ids: string[]): Promise<WBSTask[]> {
    if (ids.length === 0) return [];
    const pool = getPool();
    const placeholders = ids.map(() => '?').join(',');
    const [rows] = await pool.execute<TaskRow[]>(
      `SELECT t.*, u.real_name as assignee_name, p.name as project_name
       FROM wbs_tasks t
       LEFT JOIN users u ON t.assignee_id = u.id
       LEFT JOIN projects p ON t.project_id = p.id
       WHERE t.id IN (${placeholders})`,
      ids
    );
    return rows;
  }

  // ========== 统计 ==========

  async getTaskStats(projectId: string): Promise<{ total: number; completed: number; delayed: number }> {
    const pool = getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status IN ('early_completed', 'on_time_completed', 'overdue_completed') THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status IN ('delay_warning', 'delayed') THEN 1 ELSE 0 END) as delayed_count
       FROM wbs_tasks WHERE project_id = ?`,
      [projectId]
    );
    const result = rows[0] as { total: number; completed: number; delayed_count: number };
    return { total: result.total, completed: result.completed, delayed: result.delayed_count };
  }

  // ========== 循环依赖检测辅助方法 ==========

  /**
   * 获取同项目所有任务用于循环依赖检测
   */
  async getAllTasksForCycleDetection(taskId: string): Promise<Array<{ id: string; predecessor_id: string | null }>> {
    const pool = getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT t.id, t.predecessor_id
       FROM wbs_tasks t
       WHERE t.project_id = (SELECT project_id FROM wbs_tasks WHERE id = ?)`,
      [taskId]
    );
    return rows as Array<{ id: string; predecessor_id: string | null }>;
  }

  // ========== 级联更新辅助方法 ==========

  /**
   * 获取以指定任务为前置的所有后续任务
   * P0修复：包含 dependency_type 字段以支持4种依赖类型的级联更新
   */
  async getSuccessorTasks(taskId: string): Promise<Array<{
    id: string;
    predecessor_id: string | null;
    start_date: Date | string | null;
    duration: number | null;
    lag_days: number | null;
    is_six_day_week: boolean;
    dependency_type: string;
  }>> {
    const pool = getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, predecessor_id, start_date, duration, lag_days, is_six_day_week, dependency_type
       FROM wbs_tasks
       WHERE predecessor_id = ?`,
      [taskId]
    );
    return rows as Array<{
      id: string;
      predecessor_id: string | null;
      start_date: Date | string | null;
      duration: number | null;
      lag_days: number | null;
      is_six_day_week: boolean;
      dependency_type: string;
    }>;
  }

  /**
   * 获取项目内所有任务
   */
  async getTasksByProject(projectId: string): Promise<Array<{ id: string; predecessor_id: string | null; start_date: Date | string | null; duration: number | null; lag_days: number | null; is_six_day_week: boolean }>> {
    const pool = getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, predecessor_id, start_date, duration, lag_days, is_six_day_week
       FROM wbs_tasks
       WHERE project_id = ?`,
      [projectId]
    );
    return rows as Array<{ id: string; predecessor_id: string | null; start_date: Date | string | null; duration: number | null; lag_days: number | null; is_six_day_week: boolean }>;
  }

  /**
   * 批量更新任务日期
   * 用于级联更新场景，自动增加版本号但不检查版本冲突
   *
   * 设计说明：
   * - 级联更新是系统自动操作，不需要版本冲突检查
   * - 版本号仍然会增加，确保数据一致性
   * - 如果用户在级联更新过程中同时编辑，会产生版本冲突（正常行为）
   *
   * @returns 是否更新成功
   */
  async updateTaskDates(taskId: string, dates: { start_date?: string; end_date?: string }): Promise<boolean> {
    const pool = getPool();
    const fields: string[] = [];
    const values: (string | null)[] = [];

    if (dates.start_date !== undefined) {
      fields.push('start_date = ?');
      values.push(dates.start_date);
    }
    if (dates.end_date !== undefined) {
      fields.push('end_date = ?');
      values.push(dates.end_date);
    }

    if (fields.length === 0) {
      return false;
    }

    // 自动增加版本号，但不检查版本冲突（级联更新是系统操作）
    fields.push('version = version + 1');
    values.push(taskId);

    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE wbs_tasks SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return result.affectedRows > 0;
  }
}
