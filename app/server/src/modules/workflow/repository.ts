// app/server/src/modules/workflow/repository.ts
import { getPool } from '../../core/db';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import type { PlanChange, ApprovalStatus, DelayRecord, Notification, CreatePlanChangeRequest, ApprovalDecisionRequest, CreateDelayRecordRequest, CreateNotificationRequest, ApprovalItem, ApprovalChange, ApprovalItemsQueryOptions } from './types';

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

    // 使用 query 而不是 execute，因为 LIMIT 和 OFFSET 不支持参数化
    const [rows] = await pool.query<PlanChangeRow[]>(
      `SELECT pc.*,
              t.description as task_description,
              p.name as project_name,
              u.real_name as user_name,
              a.real_name as approver_name
       FROM plan_changes pc
       LEFT JOIN wbs_tasks t ON pc.task_id = t.id
       LEFT JOIN projects p ON t.project_id = p.id
       LEFT JOIN users u ON pc.user_id = u.id
       LEFT JOIN users a ON pc.approver_id = a.id
       ${whereClause}
       ORDER BY pc.created_at DESC
       LIMIT ${pageSize} OFFSET ${offset}`,
      params
    );

    return { items: rows, total };
  }

  async getPlanChangeById(id: string): Promise<PlanChange | null> {
    const pool = getPool();
    const [rows] = await pool.execute<PlanChangeRow[]>(
      `SELECT pc.*,
              t.description as task_description,
              p.name as project_name,
              u.real_name as user_name,
              a.real_name as approver_name
       FROM plan_changes pc
       LEFT JOIN wbs_tasks t ON pc.task_id = t.id
       LEFT JOIN projects p ON t.project_id = p.id
       LEFT JOIN users u ON pc.user_id = u.id
       LEFT JOIN users a ON pc.approver_id = a.id
       WHERE pc.id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  async createPlanChange(data: CreatePlanChangeRequest & { id: string; user_id: number }): Promise<string> {
    const pool = getPool();

    // 去重检查：同一任务、同一字段、同一新值、pending 状态的记录已存在则跳过
    const [existing] = await pool.execute<RowDataPacket[]>(
      `SELECT id FROM plan_changes
       WHERE task_id = ? AND change_type = ? AND new_value = ? AND status = 'pending'
       LIMIT 1`,
      [data.task_id, data.change_type, data.new_value]
    );
    if (existing.length > 0) {
      return existing[0].id;
    }

    // 使用传入的 submission_id，如果没有则使用 id 作为默认值（向后兼容）
    const submissionId = data.submission_id || data.id;

    await pool.execute(
      `INSERT INTO plan_changes (id, submission_id, task_id, user_id, change_type, old_value, new_value, reason, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [data.id, submissionId, data.task_id, data.user_id, data.change_type, data.old_value || null, data.new_value, data.reason]
    );
    return data.id;
  }

  /**
   * 创建「直接生效」的计划变更记录（admin/tech_manager/dept_manager 用）
   * - status 直接置 'approved'
   * - approver_id = 操作者本人（自审语义，前端据此识别「直接变更」）
   * - approved_at = NOW()
   * - 不做 pending 去重（每一次真实变更都应留痕）
   * 注意：new_value / reason 为 NOT NULL，调用方须保证非空
   */
  async createDirectPlanChange(data: {
    id: string;
    submission_id: string;
    task_id: string;
    user_id: number;
    change_type: string;
    old_value: string | null;
    new_value: string;
    reason: string;
  }): Promise<string> {
    const pool = getPool();
    await pool.execute(
      `INSERT INTO plan_changes
         (id, submission_id, task_id, user_id, change_type,
          old_value, new_value, reason, status, approver_id, approved_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?, NOW())`,
      [data.id, data.submission_id, data.task_id, data.user_id, data.change_type,
       data.old_value, data.new_value, data.reason, data.user_id]
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

  // ========== 审批项分组查询 ==========

  /**
   * 获取审批项列表（按 submission_id 分组）
   */
  async getApprovalItems(options?: ApprovalItemsQueryOptions): Promise<{ items: ApprovalItem[]; total: number }> {
    const pool = getPool();
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (options?.status) {
      conditions.push('pc.status = ?');
      params.push(options.status);
    }
    if (options?.projectId) {
      conditions.push('t.project_id = ?');
      params.push(options.projectId);
    }
    if (options?.userId) {
      conditions.push('pc.user_id = ?');
      params.push(options.userId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 1. 获取 submission_id 总数用于分页
    const [countRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(DISTINCT pc.submission_id) as total
       FROM plan_changes pc
       LEFT JOIN wbs_tasks t ON pc.task_id = t.id
       ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    // 2. 获取分页后的 submission_ids
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    const [submissionRows] = await pool.query<RowDataPacket[]>(
      `SELECT DISTINCT pc.submission_id,
              (SELECT MIN(created_at) FROM plan_changes WHERE submission_id = pc.submission_id) as earliest_created_at
       FROM plan_changes pc
       LEFT JOIN wbs_tasks t ON pc.task_id = t.id
       ${whereClause}
       ORDER BY earliest_created_at DESC
       LIMIT ${pageSize} OFFSET ${offset}`,
      params
    );

    if (submissionRows.length === 0) {
      return { items: [], total };
    }

    const submissionIds = submissionRows.map(r => r.submission_id);

    // 3. 获取这些提交的所有记录
    const placeholders = submissionIds.map(() => '?').join(',');
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT pc.*,
              t.description as task_description,
              p.name as project_name,
              u.real_name as user_name,
              a.real_name as approver_name
       FROM plan_changes pc
       LEFT JOIN wbs_tasks t ON pc.task_id = t.id
       LEFT JOIN projects p ON t.project_id = p.id
       LEFT JOIN users u ON pc.user_id = u.id
       LEFT JOIN users a ON pc.approver_id = a.id
       WHERE pc.submission_id IN (${placeholders})
       ORDER BY pc.created_at ASC`,
      submissionIds
    );

    // 4. 按 submission_id 分组
    const grouped = new Map<string, ApprovalItem>();
    for (const row of rows) {
      const submissionId = row.submission_id;

      if (!grouped.has(submissionId)) {
        grouped.set(submissionId, {
          submissionId,
          taskId: row.task_id,
          taskDescription: row.task_description || '',
          projectName: row.project_name || '',
          userId: row.user_id,
          userName: row.user_name || '',
          reason: row.reason,
          status: row.status,
          approverId: row.approver_id,
          approverName: row.approver_name,
          approvedAt: row.approved_at,
          rejectionReason: row.rejection_reason,
          createdAt: row.created_at,
          changes: [],
        });
      }

      const item = grouped.get(submissionId)!;
      item.changes.push({
        id: row.id,
        change_type: row.change_type,
        old_value: row.old_value,
        new_value: row.new_value,
      });

      // 更新状态为最严重的（pending > timeout > rejected > approved）
      const statusPriority: Record<string, number> = {
        pending: 4, timeout: 3, rejected: 2, approved: 1,
      };
      if (statusPriority[row.status] > statusPriority[item.status]) {
        item.status = row.status;
      }
    }

    // 5. 按原始顺序返回
    const items = submissionIds
      .filter(id => grouped.has(id))
      .map(id => grouped.get(id)!);

    return { items, total };
  }

  /**
   * 批量审批提交（更新 submission_id 下的所有变更）
   */
  async approveSubmission(
    submissionId: string,
    approverId: number,
    approved: boolean,
    rejectionReason?: string
  ): Promise<{ taskId: string; changes: Array<{ changeType: string; newValue: string | null }> }> {
    const pool = getPool();

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM plan_changes WHERE submission_id = ?`,
      [submissionId]
    );

    if (rows.length === 0) {
      throw new Error('submission not found');
    }

    const status: ApprovalStatus = approved ? 'approved' : 'rejected';

    await pool.execute(
      `UPDATE plan_changes
       SET status = ?, approver_id = ?, approved_at = NOW(), rejection_reason = ?
       WHERE submission_id = ?`,
      [status, approverId, rejectionReason || null, submissionId]
    );

    return {
      taskId: rows[0].task_id,
      changes: rows.map(r => ({
        changeType: r.change_type,
        newValue: r.new_value,
      })),
    };
  }

  /**
   * 根据 submission_id 获取审批项详情
   */
  async getApprovalItemBySubmissionId(submissionId: string): Promise<ApprovalItem | null> {
    const pool = getPool();

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT pc.*,
              t.description as task_description,
              p.name as project_name,
              u.real_name as user_name,
              a.real_name as approver_name
       FROM plan_changes pc
       LEFT JOIN wbs_tasks t ON pc.task_id = t.id
       LEFT JOIN projects p ON t.project_id = p.id
       LEFT JOIN users u ON pc.user_id = u.id
       LEFT JOIN users a ON pc.approver_id = a.id
       WHERE pc.submission_id = ?
       ORDER BY pc.created_at ASC`,
      [submissionId]
    );

    if (rows.length === 0) {
      return null;
    }

    const firstRow = rows[0];
    return {
      submissionId: firstRow.submission_id,
      taskId: firstRow.task_id,
      taskDescription: firstRow.task_description || '',
      projectName: firstRow.project_name || '',
      userId: firstRow.user_id,
      userName: firstRow.user_name || '',
      reason: firstRow.reason,
      status: firstRow.status,
      approverId: firstRow.approver_id,
      approverName: firstRow.approver_name,
      approvedAt: firstRow.approved_at,
      rejectionReason: firstRow.rejection_reason,
      createdAt: firstRow.created_at,
      changes: rows.map((r: RowDataPacket) => ({
        id: r.id,
        change_type: r.change_type,
        old_value: r.old_value,
        new_value: r.new_value,
      })),
    };
  }

  /**
   * 获取用户待审批的计划变更列表（基于审批链）
   *
   * 简化审批链规则：
   * 1. 找到申请人所在部门的直接经理（第1级主管）
   * 2. 如果没有直接经理，向上查找父部门的经理（第2级主管）
   * 3. 继续向上直到找到有经理的部门
   * 4. admin 作为最终兜底
   */
  async getPendingApprovalsForUser(userId: number): Promise<PlanChange[]> {
    const pool = getPool();

    // 获取当前用户信息
    const [userRows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, role, department_id FROM users WHERE id = ?`,
      [userId]
    );
    if (userRows.length === 0) return [];

    const user = userRows[0] as { id: number; role: string; department_id: number | null };

    // 获取所有待审批的变更
    const [allPending] = await pool.execute<PlanChangeRow[]>(
      `SELECT pc.*,
              t.description as task_description,
              p.name as project_name,
              u.real_name as user_name
       FROM plan_changes pc
       LEFT JOIN wbs_tasks t ON pc.task_id = t.id
       LEFT JOIN projects p ON t.project_id = p.id
       LEFT JOIN users u ON pc.user_id = u.id
       WHERE pc.status = 'pending'
       ORDER BY pc.created_at ASC`,
      []
    );

    // 筛选当前用户需要审批的变更
    const result: PlanChange[] = [];
    for (const change of allPending) {
      const needsApproval = await this.checkIfUserNeedsToApproveSimple(pool, user, change.user_id);
      if (needsApproval) {
        result.push(change);
      }
    }

    return result;
  }

  /**
   * 简化的审批检查逻辑
   * 规则：找到申请人的直接上级主管，如果是当前用户则需要审批
   */
  private async checkIfUserNeedsToApproveSimple(
    pool: ReturnType<typeof getPool>,
    approver: { id: number; role: string; department_id: number | null },
    applicantUserId: number
  ): Promise<boolean> {
    // 获取申请人的部门信息
    const [applicantRows] = await pool.execute<RowDataPacket[]>(
      `SELECT u.id, u.department_id, d.parent_id
       FROM users u
       JOIN departments d ON u.department_id = d.id
       WHERE u.id = ?`,
      [applicantUserId]
    );

    if (applicantRows.length === 0) return false;
    const applicant = applicantRows[0];

    // 逐级向上查找主管
    let currentDeptId: number | null = applicant.department_id;
    const visitedDepts = new Set<number>();

    while (currentDeptId && !visitedDepts.has(currentDeptId)) {
      visitedDepts.add(currentDeptId);

      // 获取当前部门的经理
      const [deptRows] = await pool.execute<RowDataPacket[]>(
        `SELECT d.id, d.manager_id, d.parent_id, u.role as manager_role
         FROM departments d
         LEFT JOIN users u ON d.manager_id = u.id
         WHERE d.id = ?`,
        [currentDeptId]
      );

      if (deptRows.length === 0) break;

      const dept = deptRows[0];

      // 如果部门有经理，且经理不是申请人自己
      if (dept.manager_id && dept.manager_id !== applicantUserId) {
        // 检查经理是否是当前审批人
        if (dept.manager_id === approver.id) {
          return true;
        }
        // 找到了经理，但不是当前审批人，不需要审批
        return false;
      }

      // 没有经理，向上查找父部门
      currentDeptId = dept.parent_id;
    }

    // 没有找到任何主管，admin 作为兜底
    return approver.role === 'admin';
  }

  /**
   * 获取用户待审批数量（基于审批链，用于仪表板统计）
   * 简化实现：分步查询避免复杂嵌套SQL导致的 ER_MALFORMED_PACKET 错误
   */
  async getPendingApprovalsCountForUser(userId: number): Promise<number> {
    const pool = getPool();

    // 1. 获取当前用户信息
    const [userRows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, role, department_id FROM users WHERE id = ?`,
      [userId]
    );
    if (userRows.length === 0) return 0;
    const user = userRows[0] as { id: number; role: string; department_id: number | null };

    // 2. 获取所有待审批的变更申请
    const [pendingChanges] = await pool.execute<RowDataPacket[]>(
      `SELECT pc.id, pc.user_id, u.role as applicant_role, u.department_id as applicant_dept_id
       FROM plan_changes pc
       JOIN users u ON pc.user_id = u.id
       WHERE pc.status = 'pending'`,
      []
    );

    if (pendingChanges.length === 0) return 0;

    // 3. 筛选需要审批的申请
    let count = 0;

    for (const change of pendingChanges) {
      const typedChange = change as { user_id: number };
      const needsApproval = await this.checkIfUserNeedsToApproveSimple(pool, user, typedChange.user_id);
      if (needsApproval) count++;
    }

    return count;
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
    const params: (number)[] = [userId];

    if (options?.unreadOnly) {
      conditions.push('n.is_read = ?');
      params.push(0); // 使用 0 代替 false
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

    // 使用 query 而不是 execute，因为 LIMIT 和 OFFSET 不支持参数化
    const [rows] = await pool.query<NotificationRow[]>(
      `SELECT * FROM notifications n ${whereClause} ORDER BY n.created_at DESC LIMIT ${pageSize} OFFSET ${offset}`,
      params
    );

    return { items: rows, total };
  }

  async createNotification(data: CreateNotificationRequest & { id: string }): Promise<string> {
    const pool = getPool();

    // 验证用户是否存在
    const [userRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM users WHERE id = ?',
      [data.user_id]
    );
    if (userRows.length === 0) {
      throw new Error(`通知目标用户不存在: user_id=${data.user_id}`);
    }

    await pool.execute(
      'INSERT INTO notifications (id, user_id, project_id, task_id, type, title, content, link) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [data.id, data.user_id, data.project_id || null, data.task_id || null, data.type, data.title, data.content, data.link || null]
    );
    return data.id;
  }

  async markNotificationAsRead(id: string): Promise<boolean> {
    const pool = getPool();
    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE notifications SET is_read = true, read_at = NOW() WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  async markAllNotificationsAsRead(userId: number): Promise<number> {
    const pool = getPool();
    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE notifications SET is_read = true, read_at = NOW() WHERE user_id = ? AND is_read = false',
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

  /**
   * 批量删除通知
   */
  async deleteNotifications(ids: string[], userId: number): Promise<number> {
    if (ids.length === 0) return 0;
    const pool = getPool();
    const placeholders = ids.map(() => '?').join(', ');
    const [result] = await pool.execute<ResultSetHeader>(
      `DELETE FROM notifications WHERE id IN (${placeholders}) AND user_id = ?`,
      [...ids, userId]
    );
    return result.affectedRows;
  }

  /**
   * 删除所有已读通知
   */
  async deleteAllReadNotifications(userId: number): Promise<number> {
    const pool = getPool();
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM notifications WHERE user_id = ? AND is_read = true',
      [userId]
    );
    return result.affectedRows;
  }

  // ========== 批量通知 ==========

  async createNotificationsForUsers(userIds: number[], data: Omit<CreateNotificationRequest, 'user_id'>): Promise<void> {
    if (userIds.length === 0) return;
    const pool = getPool();

    // 批量插入：单条 SQL 替代循环 N 次 INSERT
    const placeholders = userIds.map(() => '(UUID(), ?, ?, ?, ?, ?, ?, ?)').join(', ');
    const params: (number | string | null)[] = [];
    for (const userId of userIds) {
      params.push(userId, data.project_id || null, data.task_id || null, data.type, data.title, data.content, data.link || null);
    }

    await pool.execute(
      `INSERT INTO notifications (id, user_id, project_id, task_id, type, title, content, link) VALUES ${placeholders}`,
      params
    );
  }

  // ========== 通知清理方法 ==========

  /**
   * 删除指定任务和用户的通知
   */
  async deleteNotificationsByTaskAndUser(taskId: string, userId: number): Promise<number> {
    const pool = getPool();
    const [result] = await pool.execute<ResultSetHeader>(
      `DELETE FROM notifications WHERE task_id = ? AND user_id = ?`,
      [taskId, userId]
    );
    return result.affectedRows;
  }

  /**
   * 删除指定项目和用户的通知
   */
  async deleteNotificationsByProjectAndUser(projectId: string, userId: number): Promise<number> {
    const pool = getPool();
    const [result] = await pool.execute<ResultSetHeader>(
      `DELETE FROM notifications WHERE project_id = ? AND user_id = ?`,
      [projectId, userId]
    );
    return result.affectedRows;
  }

  /**
   * 删除超过指定天数的已读通知
   */
  async deleteOldReadNotifications(daysOld: number): Promise<number> {
    const pool = getPool();
    const [result] = await pool.execute<ResultSetHeader>(
      `DELETE FROM notifications WHERE is_read = true AND created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [daysOld]
    );
    return result.affectedRows;
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
  async getTasksNeedingWarning(): Promise<Array<{ id: string; description: string; assignee_id: number | null; project_id: string }>> {
    const pool = getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT t.id, t.description, t.assignee_id, t.project_id
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
    return rows as Array<{ id: string; description: string; assignee_id: number | null; project_id: string }>;
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
    end_date: Date;
  }>> {
    const pool = getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT t.id, t.description, t.assignee_id, u.real_name as assignee_name, t.project_id, t.end_date
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
      end_date: Date;
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
       AND u.role IN ('admin', 'tech_manager', 'dept_manager')`,
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
                        p.name as project_name,
                        u.real_name as user_name,
                        a.real_name as approver_name
                 FROM plan_changes pc
                 LEFT JOIN wbs_tasks t ON pc.task_id = t.id
                 LEFT JOIN projects p ON t.project_id = p.id
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
  async getTaskById(taskId: string): Promise<{ id: string; project_id: string; version: number; last_plan_refresh_at: Date | null; delay_count: number; actual_start_date: Date | null } | null> {
    const pool = getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, project_id, version, last_plan_refresh_at, delay_count, actual_start_date FROM wbs_tasks WHERE id = ?',
      [taskId]
    );
    return rows.length > 0 ? (rows[0] as { id: string; project_id: string; version: number; last_plan_refresh_at: Date | null; delay_count: number; actual_start_date: Date | null }) : null;
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
   * 获取任务的日期和计数器信息
   */
  async getTaskWithDates(taskId: string): Promise<{
    id: string;
    project_id: string;
    description: string;
    end_date: Date | null;
    actual_start_date: Date | null;
    actual_end_date: Date | null;
    warning_days: number;
    pending_changes: string | null;
    pending_change_type: string | null;
    last_plan_refresh_at: Date | null;
    delay_count: number;
    version: number;
  } | null> {
    const pool = getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, project_id, description, end_date, actual_start_date, actual_end_date, warning_days, pending_changes, pending_change_type, last_plan_refresh_at, delay_count, version
       FROM wbs_tasks
       WHERE id = ?`,
      [taskId]
    );
    if (!rows[0]) {
      return null;
    }
    const row = rows[0];
    return {
      id: row.id,
      project_id: row.project_id,
      description: row.description || '',
      end_date: row.end_date || null,
      actual_start_date: row.actual_start_date || null,
      actual_end_date: row.actual_end_date || null,
      warning_days: row.warning_days || 3,
      pending_changes: row.pending_changes || null,
      pending_change_type: row.pending_change_type || null,
      last_plan_refresh_at: row.last_plan_refresh_at || null,
      delay_count: row.delay_count || 0,
      version: row.version || 1,
    };
  }

  /**
   * 获取用户基本信息
   */
  async getUserById(userId: number): Promise<{ id: number; real_name: string } | null> {
    const pool = getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, real_name FROM users WHERE id = ?',
      [userId]
    );
    return rows.length > 0 ? (rows[0] as { id: number; real_name: string }) : null;
  }

  /**
   * 获取项目名称
   */
  async getProjectName(projectId: string): Promise<string | null> {
    const pool = getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT name FROM projects WHERE id = ?',
      [projectId]
    );
    return rows.length > 0 ? rows[0].name : null;
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
   * 清除任务的待审批数据（完全清空）
   */
  async clearPendingChanges(taskId: string): Promise<boolean> {
    const pool = getPool();
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE wbs_tasks SET pending_changes = NULL, pending_change_type = NULL, version = version + 1 WHERE id = ?`,
      [taskId]
    );
    return result.affectedRows > 0;
  }

  /**
   * P9: 按 submission_id 移除待审批变更
   * 如果移除后数组为空，则完全清空
   */
  async removePendingChangeBySubmissionId(taskId: string, submissionId: string): Promise<boolean> {
    const pool = getPool();

    // 1. 读取当前 pending_changes
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT pending_changes FROM wbs_tasks WHERE id = ?',
      [taskId]
    );

    if (!rows[0]?.pending_changes) {
      return false;
    }

    let pendingChanges: unknown[];
    try {
      const raw = rows[0].pending_changes;
      pendingChanges = Array.isArray(raw) ? raw : [raw];
    } catch {
      return false;
    }

    // 2. 过滤掉指定的 submission_id
    const filtered = pendingChanges.filter((item: any) => item.submission_id !== submissionId);

    if (filtered.length === 0) {
      // 数组为空，完全清空
      return this.clearPendingChanges(taskId);
    }

    // 3. 更新为过滤后的数组
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE wbs_tasks SET pending_changes = ?, version = version + 1 WHERE id = ?`,
      [JSON.stringify(filtered), taskId]
    );
    return result.affectedRows > 0;
  }
}
