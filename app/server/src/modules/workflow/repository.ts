// app/server/src/modules/workflow/repository.ts
import { getPool } from '../../core/db';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import type { PlanChange, ApprovalStatus, DelayRecord, Notification, CreatePlanChangeRequest, ApprovalDecisionRequest, CreateDelayRecordRequest, CreateNotificationRequest } from './types';

interface PlanChangeRow extends RowDataPacket, PlanChange {}
interface DelayRecordRow extends RowDataPacket, DelayRecord {}
interface NotificationRow extends RowDataPacket, Notification {}

export class WorkflowRepository {
  // ========== 计划变更/审批 ==========

  async getPlanChanges(options?: {
    status?: ApprovalStatus;
    user_id?: number;
    approver_id?: number;
    project_id?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: PlanChange[]; total: number }> {
    const pool = getPool();
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (options?.status) {
      conditions.push('pc.status = ?');
      params.push(options.status);
    }
    if (options?.user_id) {
      conditions.push('pc.user_id = ?');
      params.push(options.user_id);
    }
    if (options?.approver_id) {
      conditions.push('pc.approver_id = ?');
      params.push(options.approver_id);
    }
    if (options?.project_id) {
      conditions.push('t.project_id = ?');
      params.push(options.project_id);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count
    const [countRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM plan_changes pc
       LEFT JOIN wbs_tasks t ON pc.task_id = t.id
       ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    // Data
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    const [rows] = await pool.execute<PlanChangeRow[]>(
      `SELECT pc.*,
              t.description as task_description,
              u.real_name as user_name,
              a.real_name as approver_name
       FROM plan_changes pc
       LEFT JOIN wbs_tasks t ON pc.task_id = t.id
       LEFT JOIN users u ON pc.user_id = u.id
       LEFT JOIN users a ON pc.approver_id = a.id
       ${whereClause}
       ORDER BY pc.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    return { items: rows, total };
  }

  async getPlanChangeById(id: string): Promise<PlanChange | null> {
    const pool = getPool();
    const [rows] = await pool.execute<PlanChangeRow[]>(
      `SELECT pc.*,
              t.description as task_description,
              u.real_name as user_name,
              a.real_name as approver_name
       FROM plan_changes pc
       LEFT JOIN wbs_tasks t ON pc.task_id = t.id
       LEFT JOIN users u ON pc.user_id = u.id
       LEFT JOIN users a ON pc.approver_id = a.id
       WHERE pc.id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  async createPlanChange(data: CreatePlanChangeRequest & { id: string; user_id: number }): Promise<string> {
    const pool = getPool();
    await pool.execute(
      `INSERT INTO plan_changes (id, task_id, user_id, change_type, old_value, new_value, reason, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [data.id, data.task_id, data.user_id, data.change_type, data.old_value || null, data.new_value || null, data.reason]
    );
    return data.id;
  }

  async approvePlanChange(id: string, approverId: number, rejectionReason?: string): Promise<boolean> {
    const pool = getPool();
    const status: ApprovalStatus = rejectionReason ? 'rejected' : 'approved';
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE plan_changes SET status = ?, approver_id = ?, approved_at = NOW(), rejection_reason = ? WHERE id = ?`,
      [status, approverId, rejectionReason || null, id]
    );
    return result.affectedRows > 0;
  }

  async getPendingApprovalsForUser(userId: number): Promise<PlanChange[]> {
    const pool = getPool();
    // 获取用户作为审批人的待审批项（基于组织架构）
    const [rows] = await pool.execute<PlanChangeRow[]>(
      `SELECT pc.*,
              t.description as task_description,
              u.real_name as user_name
       FROM plan_changes pc
       LEFT JOIN wbs_tasks t ON pc.task_id = t.id
       LEFT JOIN users u ON pc.user_id = u.id
       WHERE pc.status = 'pending'
       AND (
         EXISTS (SELECT 1 FROM users approver WHERE approver.id = ? AND approver.role IN ('admin', 'tech_manager'))
         OR EXISTS (
           SELECT 1 FROM users applicant
           JOIN departments d ON applicant.department_id = d.id
           WHERE applicant.id = pc.user_id AND d.manager_id = ?
         )
       )
       ORDER BY pc.created_at ASC`,
      [userId, userId]
    );
    return rows;
  }

  // ========== 延期记录 ==========

  async getDelayRecords(taskId: string): Promise<DelayRecord[]> {
    const pool = getPool();
    const [rows] = await pool.execute<DelayRecordRow[]>(
      `SELECT dr.*, t.description as task_description, u.real_name as recorder_name
       FROM delay_records dr
       LEFT JOIN wbs_tasks t ON dr.task_id = t.id
       LEFT JOIN users u ON dr.recorded_by = u.id
       WHERE dr.task_id = ?
       ORDER BY dr.created_at DESC`,
      [taskId]
    );
    return rows;
  }

  async createDelayRecord(data: CreateDelayRecordRequest & { id: string; task_id: string; recorded_by: number }): Promise<string> {
    const pool = getPool();
    await pool.execute(
      'INSERT INTO delay_records (id, task_id, delay_days, reason, recorded_by) VALUES (?, ?, ?, ?, ?)',
      [data.id, data.task_id, data.delay_days, data.reason, data.recorded_by]
    );
    return data.id;
  }

  // ========== 通知 ==========

  async getNotifications(userId: number, options?: { unreadOnly?: boolean; page?: number; pageSize?: number }): Promise<{ items: Notification[]; total: number }> {
    const pool = getPool();
    const conditions = ['n.user_id = ?'];
    const params: (number | boolean)[] = [userId];

    if (options?.unreadOnly) {
      conditions.push('n.is_read = ?');
      params.push(false);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Count
    const [countRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM notifications n ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    // Data
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    const [rows] = await pool.execute<NotificationRow[]>(
      `SELECT * FROM notifications n ${whereClause} ORDER BY n.created_at DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    return { items: rows, total };
  }

  async createNotification(data: CreateNotificationRequest & { id: string }): Promise<string> {
    const pool = getPool();
    await pool.execute(
      'INSERT INTO notifications (id, user_id, type, title, content, link) VALUES (?, ?, ?, ?, ?, ?)',
      [data.id, data.user_id, data.type, data.title, data.content, data.link || null]
    );
    return data.id;
  }

  async markNotificationAsRead(id: string): Promise<boolean> {
    const pool = getPool();
    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE notifications SET is_read = true WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  async markAllNotificationsAsRead(userId: number): Promise<number> {
    const pool = getPool();
    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE notifications SET is_read = true WHERE user_id = ? AND is_read = false',
      [userId]
    );
    return result.affectedRows;
  }

  async deleteNotification(id: string, userId: number): Promise<boolean> {
    const pool = getPool();
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    return result.affectedRows > 0;
  }

  // ========== 批量通知 ==========

  async createNotificationsForUsers(userIds: number[], data: Omit<CreateNotificationRequest, 'user_id'>): Promise<void> {
    const pool = getPool();
    for (const userId of userIds) {
      const id = crypto.randomUUID();
      await this.createNotification({ id, user_id: userId, ...data });
    }
  }

  // ========== 定时任务辅助方法 ==========

  /**
   * 标记超时审批（超过指定天数）
   */
  async markTimeoutApprovals(timeoutDays: number): Promise<number> {
    const pool = getPool();
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE plan_changes
       SET status = 'timeout'
       WHERE status = 'pending'
       AND created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [timeoutDays]
    );
    return result.affectedRows;
  }

  /**
   * 获取超时的审批列表
   */
  async getTimeoutApprovals(): Promise<PlanChange[]> {
    const pool = getPool();
    const [rows] = await pool.execute<PlanChangeRow[]>(
      `SELECT * FROM plan_changes WHERE status = 'timeout'`
    );
    return rows;
  }

  /**
   * 获取需要预警的任务（在预警天数内即将到期）
   * 根据需求文档：无实际完成日期且当前距离计划完成日期≤预警天数
   * 注意：不需要有实际开始日期，未开始的任务也可能触发预警
   */
  async getTasksNeedingWarning(): Promise<Array<{ id: string; description: string; assignee_id: number | null }>> {
    const pool = getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT t.id, t.description, t.assignee_id
       FROM wbs_tasks t
       WHERE t.status IN ('not_started', 'in_progress', 'delay_warning')
       AND t.end_date IS NOT NULL
       AND t.actual_end_date IS NULL
       AND DATEDIFF(t.end_date, CURDATE()) BETWEEN 0 AND t.warning_days
       AND NOT EXISTS (
         SELECT 1 FROM notifications n
         WHERE n.link = CONCAT('/tasks/', t.id)
         AND n.type = 'delay_warning'
         AND DATE(n.created_at) = CURDATE()
       )`
    );
    return rows as Array<{ id: string; description: string; assignee_id: number | null }>;
  }

  /**
   * 获取已延期的任务（超过截止日期但未完成）
   */
  async getDelayedTasks(): Promise<Array<{
    id: string;
    description: string;
    assignee_id: number | null;
    assignee_name: string | null;
    project_id: string;
  }>> {
    const pool = getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT t.id, t.description, t.assignee_id, u.real_name as assignee_name, t.project_id
       FROM wbs_tasks t
       LEFT JOIN users u ON t.assignee_id = u.id
       WHERE t.status IN ('in_progress', 'delay_warning')
       AND t.end_date IS NOT NULL
       AND t.end_date < CURDATE()
       AND t.actual_end_date IS NULL`
    );
    return rows as Array<{
      id: string;
      description: string;
      assignee_id: number | null;
      assignee_name: string | null;
      project_id: string;
    }>;
  }

  /**
   * 更新任务状态
   */
  async updateTaskStatus(taskId: string, status: string): Promise<boolean> {
    const pool = getPool();
    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE wbs_tasks SET status = ?, version = version + 1 WHERE id = ?',
      [status, taskId]
    );
    return result.affectedRows > 0;
  }

  /**
   * 获取需要从预警状态恢复的任务
   * 条件：状态为 delay_warning，但剩余天数已超过预警天数（截止日期被延长）
   * 返回 actual_start_date 用于判断恢复到哪个状态
   */
  async getTasksToRecoverFromWarning(): Promise<Array<{ id: string; description: string; actual_start_date: Date | null }>> {
    const pool = getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, description, actual_start_date
       FROM wbs_tasks
       WHERE status = 'delay_warning'
       AND end_date IS NOT NULL
       AND DATEDIFF(end_date, CURDATE()) > warning_days`
    );
    return rows as Array<{ id: string; description: string; actual_start_date: Date | null }>;
  }

  /**
   * 获取项目的管理人员（项目经理、技术经理、部门经理）
   */
  async getProjectManagers(projectId: string): Promise<Array<{ id: number; real_name: string }>> {
    const pool = getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT u.id, u.real_name
       FROM users u
       JOIN projects p ON u.department_id = p.department_id
       WHERE p.id = ?
       AND u.role IN ('admin', 'tech_manager', 'department_manager')`,
      [projectId]
    );
    return rows as Array<{ id: number; real_name: string }>;
  }

  /**
   * 获取有活跃任务的用户
   */
  async getUsersWithActiveTasks(): Promise<Array<{ id: number }>> {
    const pool = getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT DISTINCT assignee_id as id
       FROM wbs_tasks
       WHERE assignee_id IS NOT NULL
       AND status IN ('not_started', 'in_progress', 'delay_warning', 'delayed')`
    );
    return rows as Array<{ id: number }>;
  }

  /**
   * 获取用户的任务摘要
   */
  async getUserTaskSummary(userId: number): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    delayed: number;
  }> {
    const pool = getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'not_started' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as inProgress,
        SUM(CASE WHEN status IN ('delay_warning', 'delayed') THEN 1 ELSE 0 END) as delayed
       FROM wbs_tasks
       WHERE assignee_id = ?`,
      [userId]
    );
    return rows[0] as { total: number; pending: number; inProgress: number; delayed: number };
  }

  // ========== 审批流程辅助方法 ==========

  /**
   * 获取任务的所有审批记录
   */
  async getPlanChangesByTask(taskId: string, status?: ApprovalStatus): Promise<PlanChange[]> {
    const pool = getPool();
    let query = `SELECT pc.*,
                        t.description as task_description,
                        u.real_name as user_name,
                        a.real_name as approver_name
                 FROM plan_changes pc
                 LEFT JOIN wbs_tasks t ON pc.task_id = t.id
                 LEFT JOIN users u ON pc.user_id = u.id
                 LEFT JOIN users a ON pc.approver_id = a.id
                 WHERE pc.task_id = ?`;
    const params: (string | number)[] = [taskId];

    if (status) {
      query += ' AND pc.status = ?';
      params.push(status);
    }

    query += ' ORDER BY pc.created_at DESC';

    const [rows] = await pool.execute<PlanChangeRow[]>(query, params);
    return rows;
  }

  /**
   * 获取任务基本信息
   */
  async getTaskById(taskId: string): Promise<{ id: string; project_id: string; version: number; last_plan_refresh_at: Date | null; delay_count: number } | null> {
    const pool = getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, project_id, version, last_plan_refresh_at, delay_count FROM wbs_tasks WHERE id = ?',
      [taskId]
    );
    return rows.length > 0 ? (rows[0] as { id: string; project_id: string; version: number; last_plan_refresh_at: Date | null; delay_count: number }) : null;
  }

  /**
   * 更新任务字段（带白名单验证）
   * 仅允许更新特定字段
   */
  async updateTaskField(
    taskId: string,
    field: string,
    value: string | number | null
  ): Promise<boolean> {
    // 白名单验证：只允许更新这些字段
    const allowedFields = ['start_date', 'duration', 'predecessor_id', 'lag_days'];
    if (!allowedFields.includes(field)) {
      throw new Error(`不允许更新字段: ${field}`);
    }

    const pool = getPool();
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE wbs_tasks SET ${field} = ?, version = version + 1 WHERE id = ?`,
      [value, taskId]
    );
    return result.affectedRows > 0;
  }

  /**
   * 批量更新任务字段（审批通过后）
   */
  async updateTaskFields(
    taskId: string,
    updates: Record<string, string | number | null>
  ): Promise<boolean> {
    // 白名单验证
    const allowedFields = ['start_date', 'duration', 'predecessor_id', 'lag_days'];
    const fields = Object.keys(updates).filter(f => allowedFields.includes(f));

    if (fields.length === 0) {
      return false;
    }

    const pool = getPool();
    const setClauses = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => updates[f]);
    values.push(taskId);

    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE wbs_tasks SET ${setClauses}, version = version + 1 WHERE id = ?`,
      values
    );
    return result.affectedRows > 0;
  }

  /**
   * 增加任务计数器
   */
  async incrementTaskCounter(taskId: string, counter: 'delay_count' | 'plan_change_count' | 'progress_record_count'): Promise<void> {
    const pool = getPool();
    await pool.execute(
      `UPDATE wbs_tasks SET ${counter} = ${counter} + 1 WHERE id = ?`,
      [taskId]
    );
  }

  /**
   * 清除任务的待审批数据
   */
  async clearPendingChanges(taskId: string): Promise<boolean> {
    const pool = getPool();
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE wbs_tasks SET pending_changes = NULL, pending_change_type = NULL, version = version + 1 WHERE id = ?`,
      [taskId]
    );
    return result.affectedRows > 0;
  }
}
