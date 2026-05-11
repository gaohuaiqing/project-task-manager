// app/server/src/modules/task/repository.ts
import { getPool } from '../../core/db';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import type { WBSTask, WBSTaskListItem, TaskStatus, ProgressRecord, CreateTaskRequest, UpdateTaskRequest, TaskQueryOptions } from './types';

interface TaskRow extends RowDataPacket, WBSTask {}
interface ProgressRecordRow extends RowDataPacket, ProgressRecord {}

/**
 * 允许用于 SQL 条件中的字段名白名单
 * 防止 SQL 注入攻击
 */
const ALLOWED_FILTER_FIELDS = [
  't.project_id',
  't.status',
  't.task_type',
  't.priority',
  't.assignee_id',
  't.parent_id',
] as const;

type AllowedFilterField = typeof ALLOWED_FILTER_FIELDS[number];

export class TaskRepository {
  // ========== 任务 CRUD ==========

  async getTasks(options: TaskQueryOptions): Promise<{ items: WBSTaskListItem[]; total: number }> {
    const pool = getPool();
    const conditions: string[] = [];
    const params: (string | number | null)[] = [];

    // 辅助函数：添加条件（支持单值或数组）
    // 安全修复：字段名必须来自白名单，防止 SQL 注入
    const addCondition = (field: AllowedFilterField, value: string | number | (string | number)[] | undefined) => {
      if (!value) return;
      // 验证字段名是否在白名单中
      if (!ALLOWED_FILTER_FIELDS.includes(field)) {
        throw new Error(`Invalid filter field: ${field}`);
      }
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
      conditions.push('(t.description LIKE ?)');
      const searchPattern = `%${options.search}%`;
      params.push(searchPattern);
    }
    // 数据隔离过滤（关键安全逻辑）
    // 当 accessible_project_ids 参数被设置时（非 admin 角色），必须进行项目范围过滤
    //
    // 安全规则：
    // 1. 正常任务：用户必须是项目成员且项目必须存在才能看到
    // 2. 无项目归属任务（project_id IS NULL）：只有任务负责人可见
    // 3. 悬空项目引用任务（project_id 有值但项目不存在）：视为无项目归属任务，只有负责人可见
    //
    // 注意：accessible_project_ids 可能包含不存在项目的ID（project_members 表悬空引用）
    //       必须在 SQL 层面验证项目存在性
    if (options.accessible_project_ids !== undefined) {
      if (options.accessible_project_ids.length === 0) {
        // 没有可访问项目：只能看到分配给自己的无项目归属/悬空引用任务
        if (options.user_id) {
          // 无项目归属 OR 悬空项目引用（project_id 有值但项目不存在）
          conditions.push(`(t.project_id IS NULL OR NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = t.project_id)) AND t.assignee_id = ?`);
          params.push(options.user_id);
        } else {
          conditions.push('1=0');
        }
      } else {
        // 有可访问项目：只能看到有效项目任务 + 分配给自己的悬空引用任务
        const placeholders = options.accessible_project_ids.map(() => '?').join(', ');
        if (options.user_id) {
          // 有效项目任务（project_id在列表中且项目存在）
          // OR 悬空引用任务（project_id在列表中但项目不存在，或无项目归属）且用户是负责人
          conditions.push(`(
            EXISTS (SELECT 1 FROM projects p WHERE p.id = t.project_id AND t.project_id IN (${placeholders}))
            OR ((t.project_id IS NULL OR NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = t.project_id)) AND t.assignee_id = ?)
          )`);
          params.push(...options.accessible_project_ids, options.user_id);
        } else {
          // 只能看到有效项目任务
          conditions.push(`EXISTS (SELECT 1 FROM projects p WHERE p.id = t.project_id AND t.project_id IN (${placeholders}))`);
          params.push(...options.accessible_project_ids);
        }
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count
    const [countRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM wbs_tasks t ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    // Data - 使用 SQL 层面的排序：sort_order 优先，无则按 created_at
    // WBS 编码不再存储，排序基于 sort_order 和创建时间
    const page = options.page || 1;
    const pageSize = options.pageSize || 50;
    const offset = (page - 1) * pageSize;

    const [rows] = await pool.execute<TaskRow[]>(
      `SELECT t.*,
              u.real_name as assignee_name,
              p.name as project_name,
              p.code as project_code
       FROM wbs_tasks t
       LEFT JOIN users u ON t.assignee_id = u.id
       LEFT JOIN projects p ON t.project_id = p.id
       ${whereClause}
       ORDER BY t.sort_order ASC, t.created_at ASC
       LIMIT ${pageSize} OFFSET ${offset}`,
      params
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

  async createTask(data: CreateTaskRequest & { id: string; status: TaskStatus; end_date?: string; planned_duration?: number; sort_order?: number }): Promise<string> {
    const pool = getPool();
    await pool.execute(
      `INSERT INTO wbs_tasks (
        id, project_id, parent_id, wbs_level, sort_order, description, status, task_type, priority,
        assignee_id, start_date, end_date, duration, planned_duration, is_six_day_week, warning_days, predecessor_id, dependency_type, lag_days,
        redmine_link, full_time_ratio, delay_count, plan_change_count, progress_record_count, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 1)`,
      [
        data.id, data.project_id, data.parent_id || null, data.wbs_level, data.sort_order || null, data.description,
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
    if (data.end_date !== undefined) { fields.push('end_date = ?'); values.push(data.end_date); }
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
      `SELECT t.*, u.real_name as assignee_name, p.name as project_name, p.code as project_code
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

  // ========== 任务层级管理 ==========

  /**
   * 获取任务的祖先链（从直接父任务到根任务）
   * 返回数组按层级从近到远排列：[父, 祖父, 曾祖父, ...]
   */
  async getAncestorChain(taskId: string): Promise<WBSTask[]> {
    const pool = getPool();
    const [rows] = await pool.execute<TaskRow[]>(
      `WITH RECURSIVE Ancestors AS (
        SELECT parent.* FROM wbs_tasks parent
        INNER JOIN wbs_tasks child ON child.parent_id = parent.id
        WHERE child.id = ?
        UNION ALL
        SELECT t.* FROM wbs_tasks t
        INNER JOIN Ancestors a ON t.id = a.parent_id
      )
      SELECT * FROM Ancestors ORDER BY wbs_level ASC`,
      [taskId]
    );
    return rows;
  }

  /**
   * 获取上方最近同级任务（按 sort_order/created_at 排序，在指定任务之前的最近一个）
   * 用于降低层级时确定新父任务
   */
  async getPreviousSibling(taskId: string): Promise<WBSTask | null> {
    const pool = getPool();
    // 先获取当前任务的 parent_id、sort_order 和 created_at
    const task = await this.getTaskById(taskId);
    if (!task) return null;

    // 根据是否有 sort_order 使用不同的排序逻辑
    if (task.sort_order !== null) {
      const [rows] = await pool.execute<TaskRow[]>(
        `SELECT * FROM wbs_tasks
         WHERE project_id = ? AND parent_id ${task.parent_id ? '= ?' : 'IS NULL'}
         AND sort_order < ?
         ORDER BY sort_order DESC
         LIMIT 1`,
        task.parent_id
          ? [task.project_id, task.parent_id, task.sort_order]
          : [task.project_id, task.sort_order]
      );
      return rows[0] || null;
    } else {
      const [rows] = await pool.execute<TaskRow[]>(
        `SELECT * FROM wbs_tasks
         WHERE project_id = ? AND parent_id ${task.parent_id ? '= ?' : 'IS NULL'}
         AND created_at < ?
         ORDER BY created_at DESC
         LIMIT 1`,
        task.parent_id
          ? [task.project_id, task.parent_id, task.created_at]
          : [task.project_id, task.created_at]
      );
      return rows[0] || null;
    }
  }

  /**
   * 获取同级任务列表（同一 parent 下的所有任务）
   * 按 sort_order 优先，无则按 created_at 排序
   */
  async getSiblings(projectId: string, parentId: string | null): Promise<WBSTask[]> {
    const pool = getPool();
    const [rows] = await pool.execute<TaskRow[]>(
      `SELECT * FROM wbs_tasks
       WHERE project_id = ? AND parent_id ${parentId ? '= ?' : 'IS NULL'}
       ORDER BY sort_order ASC, created_at ASC`,
      parentId ? [projectId, parentId] : [projectId]
    );
    return rows;
  }

  /**
   * 批量更新任务的层级和父任务字段
   * 用于层级变更和移动任务时的批量更新
   */
  async batchUpdateTaskHierarchy(updates: Array<{
    id: string;
    parent_id: string | null;
    wbs_level: number;
    sort_order?: number | null;
  }>): Promise<void> {
    if (updates.length === 0) return;
    const pool = getPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      for (const u of updates) {
        if (u.sort_order !== undefined) {
          await connection.execute(
            `UPDATE wbs_tasks
             SET parent_id = ?, wbs_level = ?, sort_order = ?, version = version + 1
             WHERE id = ?`,
            [u.parent_id, u.wbs_level, u.sort_order, u.id]
          );
        } else {
          await connection.execute(
            `UPDATE wbs_tasks
             SET parent_id = ?, wbs_level = ?, version = version + 1
             WHERE id = ?`,
            [u.parent_id, u.wbs_level, u.id]
          );
        }
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
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

  // ========== WBS 编码计算支持方法 ==========

  /**
   * 获取项目所有任务（用于编码计算）
   * 返回计算编码所需的最小字段集
   */
  async getTasksForCodeCalculation(projectId: string): Promise<Array<{
    id: string;
    parent_id: string | null;
    wbs_level: number;
    sort_order: number | null;
    created_at: Date;
  }>> {
    const pool = getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, parent_id, wbs_level, sort_order, created_at
       FROM wbs_tasks
       WHERE project_id = ?
       ORDER BY sort_order ASC, created_at ASC`,
      [projectId]
    );
    return rows as Array<{
      id: string;
      parent_id: string | null;
      wbs_level: number;
      sort_order: number | null;
      created_at: Date;
    }>;
  }

  /**
   * 获取任务及其所有后代任务的最大层级
   * 用于检查移动后是否会超过最大层级
   */
  async getMaxDescendantLevel(taskId: string): Promise<number> {
    const pool = getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      `WITH RECURSIVE TaskTree AS (
        SELECT id, wbs_level FROM wbs_tasks WHERE id = ?
        UNION ALL
        SELECT t.id, t.wbs_level FROM wbs_tasks t
        INNER JOIN TaskTree tt ON t.parent_id = tt.id
      )
      SELECT MAX(wbs_level) as max_level FROM TaskTree`,
      [taskId]
    );
    return rows[0]?.max_level || 0;
  }

  /**
   * 检查任务是否被其他任务引用为前置任务
   */
  async getPredecessorReferences(taskId: string): Promise<Array<{ id: string; description: string }>> {
    const pool = getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, description FROM wbs_tasks WHERE predecessor_id = ?`,
      [taskId]
    );
    return rows as Array<{ id: string; description: string }>;
  }

  /**
   * 清除指向指定任务的前置任务关系
   */
  async clearPredecessorReferences(taskId: string): Promise<number> {
    const pool = getPool();
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE wbs_tasks SET predecessor_id = NULL, version = version + 1 WHERE predecessor_id = ?`,
      [taskId]
    );
    return result.affectedRows;
  }

  /**
   * 更新任务排序值
   */
  async updateTaskSortOrder(taskId: string, sortOrder: number | null): Promise<boolean> {
    const pool = getPool();
    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE wbs_tasks SET sort_order = ?, version = version + 1 WHERE id = ?',
      [sortOrder, taskId]
    );
    return result.affectedRows > 0;
  }

  /**
   * 批量更新任务排序值
   */
  async batchUpdateSortOrder(updates: Array<{ id: string; sort_order: number }>): Promise<void> {
    if (updates.length === 0) return;
    const pool = getPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      for (const u of updates) {
        await connection.execute(
          'UPDATE wbs_tasks SET sort_order = ?, version = version + 1 WHERE id = ?',
          [u.sort_order, u.id]
        );
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}
