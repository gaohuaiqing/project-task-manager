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

    if (options.project_id) {
      conditions.push('t.project_id = ?');
      params.push(options.project_id);
    }
    if (options.status) {
      conditions.push('t.status = ?');
      params.push(options.status);
    }
    if (options.task_type) {
      conditions.push('t.task_type = ?');
      params.push(options.task_type);
    }
    if (options.priority) {
      conditions.push('t.priority = ?');
      params.push(options.priority);
    }
    if (options.assignee_id) {
      conditions.push('t.assignee_id = ?');
      params.push(options.assignee_id);
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

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count
    const [countRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM wbs_tasks t ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    // Data
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
       ORDER BY t.wbs_code
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    return { items: rows, total };
  }

  async getTaskById(id: string): Promise<WBSTask | null> {
    const pool = getPool();
    const [rows] = await pool.execute<TaskRow[]>(
      'SELECT * FROM wbs_tasks WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  async createTask(data: CreateTaskRequest & { id: string; wbs_code: string; status: TaskStatus }): Promise<string> {
    const pool = getPool();
    await pool.execute(
      `INSERT INTO wbs_tasks (
        id, project_id, parent_id, wbs_code, wbs_level, description, status, task_type, priority,
        assignee_id, start_date, duration, is_six_day_week, warning_days, predecessor_id, lag_days,
        redmine_link, full_time_ratio, delay_count, plan_change_count, progress_record_count, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 1)`,
      [
        data.id, data.project_id, data.parent_id || null, data.wbs_code, data.wbs_level, data.description,
        data.status, data.task_type || 'other', data.priority || 'medium', data.assignee_id || null,
        data.start_date || null, data.duration || null, data.is_six_day_week ?? false,
        data.warning_days || 3, data.predecessor_id || null, data.lag_days || null,
        data.redmine_link || null, data.full_time_ratio ?? 100
      ]
    );
    return data.id;
  }

  async updateTask(id: string, data: UpdateTaskRequest & { version: number }): Promise<{ updated: boolean; conflict: boolean }> {
    const pool = getPool();
    const fields: string[] = [];
    const values: (string | number | boolean | null)[] = [];

    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
    if (data.task_type !== undefined) { fields.push('task_type = ?'); values.push(data.task_type); }
    if (data.priority !== undefined) { fields.push('priority = ?'); values.push(data.priority); }
    if (data.assignee_id !== undefined) { fields.push('assignee_id = ?'); values.push(data.assignee_id); }
    if (data.start_date !== undefined) { fields.push('start_date = ?'); values.push(data.start_date); }
    if (data.duration !== undefined) { fields.push('duration = ?'); values.push(data.duration); }
    if (data.is_six_day_week !== undefined) { fields.push('is_six_day_week = ?'); values.push(data.is_six_day_week); }
    if (data.warning_days !== undefined) { fields.push('warning_days = ?'); values.push(data.warning_days); }
    if (data.predecessor_id !== undefined) { fields.push('predecessor_id = ?'); values.push(data.predecessor_id); }
    if (data.lag_days !== undefined) { fields.push('lag_days = ?'); values.push(data.lag_days); }
    if (data.actual_start_date !== undefined) { fields.push('actual_start_date = ?'); values.push(data.actual_start_date); }
    if (data.actual_end_date !== undefined) { fields.push('actual_end_date = ?'); values.push(data.actual_end_date); }
    if (data.redmine_link !== undefined) { fields.push('redmine_link = ?'); values.push(data.redmine_link); }
    if (data.full_time_ratio !== undefined) { fields.push('full_time_ratio = ?'); values.push(data.full_time_ratio); }

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

  async deleteTask(id: string): Promise<boolean> {
    const pool = getPool();
    // 先删除子任务
    await pool.execute('DELETE FROM wbs_tasks WHERE parent_id = ?', [id]);
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM wbs_tasks WHERE id = ?',
      [id]
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
    const [rows] = await pool.execute<ProgressRecordRow[]>(
      `SELECT pr.*, u.real_name as recorder_name
       FROM progress_records pr
       JOIN users u ON pr.recorded_by = u.id
       WHERE pr.task_id = ?
       ORDER BY pr.created_at DESC`,
      [taskId]
    );
    return rows;
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
        SUM(CASE WHEN status IN ('delay_warning', 'delayed') THEN 1 ELSE 0 END) as delayed
       FROM wbs_tasks WHERE project_id = ?`,
      [projectId]
    );
    return rows[0] as { total: number; completed: number; delayed: number };
  }
}
