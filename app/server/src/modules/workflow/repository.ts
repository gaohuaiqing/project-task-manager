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

  // ========== 批量通知 ==========

  async createNotificationsForUsers(userIds: number[], data: Omit<CreateNotificationRequest, 'user_id'>): Promise<void> {
    const pool = getPool();
    for (const userId of userIds) {
      const id = crypto.randomUUID();
      await this.createNotification({ id, user_id: userId, ...data });
    }
  }
}
