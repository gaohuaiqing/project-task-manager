/**
 * 任务审批服务
 *
 * 处理任务创建和变更的审批流程：
 * - 创建审批记录
 * - 审批通过/拒绝
 * - 查询待审批列表
 * - 审批历史记录
 */

import { databaseService } from './DatabaseService.js';

// ==================== 类型定义 ====================

export enum RequestType {
  CREATE_TASK = 'create_task',
  DATE_CHANGE = 'date_change'
}

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export interface TaskApprovalRecord {
  id: number;
  taskId: number;
  taskTitle: string;
  requesterId: number;
  requesterName: string;
  requesterRole: string;
  requestType: RequestType;
  requestDate: string;
  approvalStatus: ApprovalStatus;
  approverId?: number;
  approverName?: string;
  approvalDate?: string;
  approvalComment?: string;
  changeBefore?: any;
  changeAfter?: any;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApprovalParams {
  taskId: number;
  taskTitle: string;
  requesterId: number;
  requesterName: string;
  requesterRole: string;
  requestType: RequestType;
  changeBefore?: any;
  changeAfter?: any;
}

export interface ApproveParams {
  approverId: number;
  approverName: string;
  comment?: string;
}

export interface BatchApproveParams {
  recordIds: number[];
  approverId: number;
  approverName: string;
  comment?: string;
}

export interface BatchApproveResult {
  success: number;
  failed: number;
  errors: Array<{ recordId: number; error: string }>;
}

// ==================== 主服务类 ====================

class TaskApprovalService {
  /**
   * 创建审批记录
   */
  async createApproval(params: CreateApprovalParams): Promise<TaskApprovalRecord> {
    const {
      taskId,
      taskTitle,
      requesterId,
      requesterName,
      requesterRole,
      requestType,
      changeBefore,
      changeAfter
    } = params;

    const result = await databaseService.query(
      `INSERT INTO task_approval_records (
        task_id, task_title, requester_id, requester_name, requester_role,
        request_type, approval_status, change_before, change_after
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        taskId,
        taskTitle,
        requesterId,
        requesterName,
        requesterRole,
        requestType,
        ApprovalStatus.PENDING,
        changeBefore ? JSON.stringify(changeBefore) : null,
        changeAfter ? JSON.stringify(changeAfter) : null
      ]
    );

    const insertId = result.insertId;

    // 获取刚插入的记录
    const records = await databaseService.query(
      'SELECT * FROM task_approval_records WHERE id = ?',
      [insertId]
    ) as TaskApprovalRecord[];

    return records[0];
  }

  /**
   * 审批通过
   */
  async approve(recordId: number, params: ApproveParams): Promise<TaskApprovalRecord> {
    const { approverId, approverName, comment } = params;

    await databaseService.query(
      `UPDATE task_approval_records
       SET approval_status = ?,
           approver_id = ?,
           approver_name = ?,
           approval_date = CURRENT_TIMESTAMP,
           approval_comment = ?
       WHERE id = ?`,
      [ApprovalStatus.APPROVED, approverId, approverName, comment, recordId]
    );

    // 获取更新后的记录
    const records = await databaseService.query(
      'SELECT * FROM task_approval_records WHERE id = ?',
      [recordId]
    ) as TaskApprovalRecord[];

    return records[0];
  }

  /**
   * 审批拒绝
   */
  async reject(recordId: number, params: ApproveParams): Promise<TaskApprovalRecord> {
    const { approverId, approverName, comment } = params;

    await databaseService.query(
      `UPDATE task_approval_records
       SET approval_status = ?,
           approver_id = ?,
           approver_name = ?,
           approval_date = CURRENT_TIMESTAMP,
           approval_comment = ?
       WHERE id = ?`,
      [ApprovalStatus.REJECTED, approverId, approverName, comment, recordId]
    );

    // 获取更新后的记录
    const records = await databaseService.query(
      'SELECT * FROM task_approval_records WHERE id = ?',
      [recordId]
    ) as TaskApprovalRecord[];

    return records[0];
  }

  /**
   * 获取待审批列表
   */
  async getPendingApprovals(limit: number = 50): Promise<TaskApprovalRecord[]> {
    const records = await databaseService.query(
      `SELECT * FROM task_approval_records
       WHERE approval_status = ?
       ORDER BY request_date DESC
       LIMIT ?`,
      [ApprovalStatus.PENDING, limit]
    ) as TaskApprovalRecord[];

    return records;
  }

  /**
   * 获取任务的审批历史
   */
  async getTaskApprovalHistory(taskId: number): Promise<TaskApprovalRecord[]> {
    const records = await databaseService.query(
      `SELECT * FROM task_approval_records
       WHERE task_id = ?
       ORDER BY request_date DESC`,
      [taskId]
    ) as TaskApprovalRecord[];

    return records;
  }

  /**
   * 获取用户的审批请求
   */
  async getUserApprovalRequests(
    requesterId: number,
    status?: ApprovalStatus
  ): Promise<TaskApprovalRecord[]> {
    let sql = `SELECT * FROM task_approval_records WHERE requester_id = ?`;
    const params: any[] = [requesterId];

    if (status) {
      sql += ' AND approval_status = ?';
      params.push(status);
    }

    sql += ' ORDER BY request_date DESC';

    const records = await databaseService.query(sql, params) as TaskApprovalRecord[];
    return records;
  }

  /**
   * 检查任务是否有待审批的请求
   */
  async hasPendingApproval(taskId: number): Promise<boolean> {
    const records = await databaseService.query(
      `SELECT COUNT(*) as count FROM task_approval_records
       WHERE task_id = ? AND approval_status = ?`,
      [taskId, ApprovalStatus.PENDING]
    ) as any[];

    return records[0].count > 0;
  }

  /**
   * 获取单个审批记录
   */
  async getApprovalRecord(recordId: number): Promise<TaskApprovalRecord | null> {
    const records = await databaseService.query(
      'SELECT * FROM task_approval_records WHERE id = ?',
      [recordId]
    ) as TaskApprovalRecord[];

    return records[0] || null;
  }

  /**
   * 删除审批记录（通常在删除任务时使用）
   */
  async deleteApprovalRecords(taskId: number): Promise<void> {
    await databaseService.query(
      'DELETE FROM task_approval_records WHERE task_id = ?',
      [taskId]
    );
  }

  /**
   * 获取审批统计
   */
  async getApprovalStats(): Promise<{
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  }> {
    const stats = await databaseService.query(
      `SELECT
        approval_status,
        COUNT(*) as count
       FROM task_approval_records
       GROUP BY approval_status`
    ) as any[];

    const result = {
      pending: 0,
      approved: 0,
      rejected: 0,
      total: 0
    };

    for (const stat of stats) {
      const status = stat.approval_status as ApprovalStatus;
      const count = parseInt(stat.count);

      result.total += count;

      switch (status) {
        case ApprovalStatus.PENDING:
          result.pending = count;
          break;
        case ApprovalStatus.APPROVED:
          result.approved = count;
          break;
        case ApprovalStatus.REJECTED:
          result.rejected = count;
          break;
      }
    }

    return result;
  }

  /**
   * 批量审批通过
   */
  async batchApprove(params: BatchApproveParams): Promise<BatchApproveResult> {
    const { recordIds, approverId, approverName, comment } = params;

    const result: BatchApproveResult = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (const recordId of recordIds) {
      try {
        await this.approve(recordId, { approverId, approverName, comment });

        // 同时更新任务的审批状态
        const record = await this.getApprovalRecord(recordId);
        if (record) {
          await databaseService.query(
            'UPDATE wbs_tasks SET approval_status = ? WHERE id = ?',
            ['approved', record.taskId]
          );
        }

        result.success++;
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          recordId,
          error: error.message || '未知错误'
        });
      }
    }

    return result;
  }

  /**
   * 批量拒绝
   */
  async batchReject(params: BatchApproveParams): Promise<BatchApproveResult> {
    const { recordIds, approverId, approverName, comment } = params;

    const result: BatchApproveResult = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (const recordId of recordIds) {
      try {
        await this.reject(recordId, { approverId, approverName, comment });

        // 同时更新任务的审批状态
        const record = await this.getApprovalRecord(recordId);
        if (record) {
          await databaseService.query(
            'UPDATE wbs_tasks SET approval_status = ? WHERE id = ?',
            ['rejected', record.taskId]
          );
        }

        result.success++;
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          recordId,
          error: error.message || '未知错误'
        });
      }
    }

    return result;
  }

  /**
   * 撤销审批请求（工程师可以撤销自己的待审批任务）
   */
  async withdrawApproval(recordId: number, requesterId: number): Promise<boolean> {
    // 验证是否为请求人
    const record = await this.getApprovalRecord(recordId);
    if (!record) {
      throw new Error('审批记录不存在');
    }

    if (record.requesterId !== requesterId) {
      throw new Error('只能撤销自己的审批请求');
    }

    if (record.approvalStatus !== ApprovalStatus.PENDING) {
      throw new Error('只能撤销待审批状态的请求');
    }

    // 删除审批记录
    await databaseService.query(
      'DELETE FROM task_approval_records WHERE id = ?',
      [recordId]
    );

    // 同时删除对应的任务（因为未通过审批，任务应该被删除）
    await databaseService.query(
      'DELETE FROM wbs_tasks WHERE id = ?',
      [record.taskId]
    );

    return true;
  }

  /**
   * 获取超时的待审批任务（超过24小时未处理）
   */
  async getOverdueApprovals(hours: number = 24): Promise<TaskApprovalRecord[]> {
    const records = await databaseService.query(
      `SELECT * FROM task_approval_records
       WHERE approval_status = ?
       AND request_date < DATE_SUB(NOW(), INTERVAL ? HOUR)
       ORDER BY request_date ASC`,
      [ApprovalStatus.PENDING, hours]
    ) as TaskApprovalRecord[];

    return records;
  }

  /**
   * 自动拒绝超时任务（可选功能）
   */
  async autoRejectOverdue(hours: number = 48): Promise<number> {
    const overdueApprovals = await this.getOverdueApprovals(hours);

    let rejectedCount = 0;
    for (const approval of overdueApprovals) {
      try {
        await this.reject(approval.id, {
          approverId: 0,
          approverName: '系统自动',
          comment: `审批超时${hours}小时，自动拒绝`
        });
        rejectedCount++;
      } catch (error) {
        console.error(`[TaskApprovalService] 自动拒绝失败 ${approval.id}:`, error);
      }
    }

    return rejectedCount;
  }
}

// 导出单例
export const taskApprovalService = new TaskApprovalService();
