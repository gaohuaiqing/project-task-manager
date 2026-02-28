/**
 * 任务分配服务
 *
 * 职责：
 * - 记录任务分配历史
 * - 追踪任务分配状态变更
 * - 提供任务分配审计功能
 *
 * @module services/TaskAssignmentService
 */

import { databaseService } from './DatabaseService.js';
import { systemLogger } from './AsyncSystemLogger.js';

// ==================== 类型定义 ====================

export type AssignmentStatus = 'active' | 'cancelled' | 'completed';

export interface TaskAssignment {
  id: number;
  task_id: number;
  assignee_id: number;
  assigned_by: number;
  assigned_at: Date;
  unassigned_at: Date | null;
  status: AssignmentStatus;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface TaskAssignmentWithDetails extends TaskAssignment {
  task_name?: string;
  assignee_name?: string;
  assignee_username?: string;
  assignee_employee_id?: string;
  assigned_by_name?: string;
  assigned_by_username?: string;
}

export interface CreateAssignmentOptions {
  taskId: number;
  assigneeId: number;
  assignedBy: number;
  notes?: string;
}

export interface UpdateAssignmentOptions {
  status?: AssignmentStatus;
  notes?: string;
}

// ==================== 主服务类 ====================

export class TaskAssignmentService {
  /**
   * 分配任务给用户
   *
   * @param options 分配选项
   * @returns 创建的任务分配记录
   */
  async assignTask(options: CreateAssignmentOptions): Promise<TaskAssignmentWithDetails> {
    const connection = await databaseService.getConnection();
    if (!connection) {
      throw new Error('无法获取数据库连接');
    }

    try {
      const { taskId, assigneeId, assignedBy, notes } = options;

      // 检查任务是否存在
      const [tasks] = await connection.query(
        'SELECT id, name FROM wbs_tasks WHERE id = ? AND deleted_at IS NULL',
        [taskId]
      );

      if ((tasks as any[]).length === 0) {
        throw new Error('任务不存在');
      }

      // 检查用户是否存在
      const [users] = await connection.query(
        'SELECT id, username, name, employee_id FROM users WHERE id = ? AND deleted_at IS NULL',
        [assigneeId]
      );

      if ((users as any[]).length === 0) {
        throw new Error('用户不存在');
      }

      // 检查是否有活跃的分配记录
      const [existing] = await connection.query(
        `SELECT id FROM task_assignments
         WHERE task_id = ? AND assignee_id = ? AND status = 'active'`,
        [taskId, assigneeId]
      );

      if ((existing as any[]).length > 0) {
        throw new Error('该任务已分配给此用户');
      }

      // 创建分配记录
      const [result] = await connection.query(
        `INSERT INTO task_assignments (task_id, assignee_id, assigned_by, notes)
         VALUES (?, ?, ?, ?)`,
        [taskId, assigneeId, assignedBy, notes || null]
      ) as any[];

      // 获取完整的分配记录
      const [assignments] = await connection.query(
        `SELECT ta.*,
           t.name as task_name,
           u1.username as assignee_username,
           u1.name as assignee_name,
           u1.employee_id as assignee_employee_id,
           u2.username as assigned_by_username,
           u2.name as assigned_by_name
         FROM task_assignments ta
         LEFT JOIN wbs_tasks t ON ta.task_id = t.id
         LEFT JOIN users u1 ON ta.assignee_id = u1.id
         LEFT JOIN users u2 ON ta.assigned_by = u2.id
         WHERE ta.id = ?`,
        [result.insertId]
      );

      const assignment = (assignments as any[])[0];

      // 记录日志
      await systemLogger.logUserAction(
        'assign_task',
        { taskId, assigneeId, assignmentId: assignment.id },
        assignedBy,
        'system'
      );

      console.log(`[TaskAssignmentService] 任务分配成功: 任务${taskId} -> 用户${assigneeId}`);
      return assignment;

    } finally {
      connection.release();
    }
  }

  /**
   * 取消任务分配（软删除）
   *
   * @param assignmentId 分配记录ID
   * @param cancelledBy 取消人ID
   */
  async cancelAssignment(assignmentId: number, cancelledBy: number): Promise<void> {
    const connection = await databaseService.getConnection();
    if (!connection) {
      throw new Error('无法获取数据库连接');
    }

    try {
      // 取消分配记录
      await connection.query(
        `UPDATE task_assignments
         SET status = 'cancelled',
             unassigned_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND status = 'active'`,
        [assignmentId]
      );

      // 记录日志
      await systemLogger.logUserAction(
        'cancel_task_assignment',
        { assignmentId },
        cancelledBy,
        'system'
      );

      console.log(`[TaskAssignmentService] 任务分配取消成功: ${assignmentId}`);

    } finally {
      connection.release();
    }
  }

  /**
   * 标记任务分配为完成
   *
   * @param assignmentId 分配记录ID
   */
  async completeAssignment(assignmentId: number): Promise<void> {
    try {
      await databaseService.query(
        `UPDATE task_assignments
         SET status = 'completed',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND status = 'active'`,
        [assignmentId]
      );

      console.log(`[TaskAssignmentService] 任务分配完成: ${assignmentId}`);

    } catch (error) {
      console.error('[TaskAssignmentService] 完成任务分配失败:', error);
      throw error;
    }
  }

  /**
   * 获取任务的所有分配记录
   *
   * @param taskId 任务ID
   * @returns 分配记录列表
   */
  async getTaskAssignments(taskId: number): Promise<TaskAssignmentWithDetails[]> {
    try {
      const [rows] = await databaseService.query(
        `SELECT ta.*,
           t.name as task_name,
           u1.username as assignee_username,
           u1.name as assignee_name,
           u1.employee_id as assignee_employee_id,
           u2.username as assigned_by_username,
           u2.name as assigned_by_name
         FROM task_assignments ta
         LEFT JOIN wbs_tasks t ON ta.task_id = t.id
         LEFT JOIN users u1 ON ta.assignee_id = u1.id
         LEFT JOIN users u2 ON ta.assigned_by = u2.id
         WHERE ta.task_id = ?
         ORDER BY ta.assigned_at DESC`,
        [taskId]
      );

      return rows as TaskAssignmentWithDetails[];

    } catch (error) {
      console.error('[TaskAssignmentService] 获取任务分配记录失败:', error);
      return [];
    }
  }

  /**
   * 获取任务的当前分配信息（活跃分配）
   *
   * @param taskId 任务ID
   * @returns 当前活跃的分配记录
   */
  async getActiveAssignment(taskId: number): Promise<TaskAssignmentWithDetails | null> {
    try {
      const [rows] = await databaseService.query(
        `SELECT ta.*,
           t.name as task_name,
           u1.username as assignee_username,
           u1.name as assignee_name,
           u1.employee_id as assignee_employee_id,
           u2.username as assigned_by_username,
           u2.name as assigned_by_name
         FROM task_assignments ta
         LEFT JOIN wbs_tasks t ON ta.task_id = t.id
         LEFT JOIN users u1 ON ta.assignee_id = u1.id
         LEFT JOIN users u2 ON ta.assigned_by = u2.id
         WHERE ta.task_id = ? AND ta.status = 'active'
         ORDER BY ta.assigned_at DESC
         LIMIT 1`,
        [taskId]
      );

      const assignments = rows as TaskAssignmentWithDetails[];
      return assignments.length > 0 ? assignments[0] : null;

    } catch (error) {
      console.error('[TaskAssignmentService] 获取活跃分配失败:', error);
      return null;
    }
  }

  /**
   * 获取用户的活跃任务分配
   *
   * @param userId 用户ID
   * @returns 活跃分配记录列表
   */
  async getUserActiveAssignments(userId: number): Promise<TaskAssignmentWithDetails[]> {
    try {
      const [rows] = await databaseService.query(
        `SELECT ta.*,
           t.id as task_id,
           t.name as task_name,
           t.status as task_status,
           t.wbs_code,
           u1.username as assignee_username,
           u1.name as assignee_name,
           u1.employee_id as assignee_employee_id,
           u2.username as assigned_by_username,
           u2.name as assigned_by_name
         FROM task_assignments ta
         LEFT JOIN wbs_tasks t ON ta.task_id = t.id
         LEFT JOIN users u1 ON ta.assignee_id = u1.id
         LEFT JOIN users u2 ON ta.assigned_by = u2.id
         WHERE ta.assignee_id = ? AND ta.status = 'active'
         ORDER BY ta.assigned_at DESC`,
        [userId]
      );

      return rows as TaskAssignmentWithDetails[];

    } catch (error) {
      console.error('[TaskAssignmentService] 获取用户活跃分配失败:', error);
      return [];
    }
  }

  /**
   * 获取用户的所有任务分配历史
   *
   * @param userId 用户ID
   * @param options 查询选项
   * @returns 分配记录列表
   */
  async getUserAssignmentHistory(
    userId: number,
    options: {
      limit?: number;
      offset?: number;
      status?: AssignmentStatus;
    } = {}
  ): Promise<{ assignments: TaskAssignmentWithDetails[]; total: number }> {
    try {
      const { limit = 50, offset = 0, status } = options;

      // 构建查询条件
      let whereClause = 'WHERE ta.assignee_id = ?';
      const params: any[] = [userId];

      if (status) {
        whereClause += ' AND ta.status = ?';
        params.push(status);
      }

      // 获取总数
      const [countResult] = await databaseService.query(
        `SELECT COUNT(*) as total
         FROM task_assignments ta
         ${whereClause}`,
        params
      );
      const total = (countResult as any[])[0].total;

      // 获取记录
      const [rows] = await databaseService.query(
        `SELECT ta.*,
           t.name as task_name,
           t.status as task_status,
           t.wbs_code,
           u1.username as assignee_username,
           u1.name as assignee_name,
           u1.employee_id as assignee_employee_id,
           u2.username as assigned_by_username,
           u2.name as assigned_by_name
         FROM task_assignments ta
         LEFT JOIN wbs_tasks t ON ta.task_id = t.id
         LEFT JOIN users u1 ON ta.assignee_id = u1.id
         LEFT JOIN users u2 ON ta.assigned_by = u2.id
         ${whereClause}
         ORDER BY ta.assigned_at DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      return {
        assignments: rows as TaskAssignmentWithDetails[],
        total
      };

    } catch (error) {
      console.error('[TaskAssignmentService] 获取用户分配历史失败:', error);
      return { assignments: [], total: 0 };
    }
  }

  /**
   * 更新任务分配
   *
   * @param assignmentId 分配记录ID
   * @param options 更新选项
   * @param updatedBy 更新人ID
   */
  async updateAssignment(
    assignmentId: number,
    options: UpdateAssignmentOptions,
    updatedBy?: number
  ): Promise<TaskAssignmentWithDetails | null> {
    const connection = await databaseService.getConnection();
    if (!connection) {
      throw new Error('无法获取数据库连接');
    }

    try {
      const { status, notes } = options;
      const updates: string[] = [];
      const values: any[] = [];

      if (status !== undefined) {
        updates.push('status = ?');
        values.push(status);
      }

      if (notes !== undefined) {
        updates.push('notes = ?');
        values.push(notes);
      }

      if (updates.length === 0) {
        throw new Error('没有要更新的字段');
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(assignmentId);

      await connection.query(
        `UPDATE task_assignments
         SET ${updates.join(', ')}
         WHERE id = ?`,
        values
      );

      // 记录日志
      if (updatedBy) {
        await systemLogger.logUserAction(
          'update_task_assignment',
          { assignmentId, options },
          updatedBy,
          'system'
        );
      }

      // 返回更新后的记录
      const [rows] = await connection.query(
        `SELECT ta.*,
           t.name as task_name,
           u1.username as assignee_username,
           u1.name as assignee_name,
           u1.employee_id as assignee_employee_id,
           u2.username as assigned_by_username,
           u2.name as assigned_by_name
         FROM task_assignments ta
         LEFT JOIN wbs_tasks t ON ta.task_id = t.id
         LEFT JOIN users u1 ON ta.assignee_id = u1.id
         LEFT JOIN users u2 ON ta.assigned_by = u2.id
         WHERE ta.id = ?`,
        [assignmentId]
      );

      const assignments = rows as TaskAssignmentWithDetails[];
      return assignments.length > 0 ? assignments[0] : null;

    } finally {
      connection.release();
    }
  }

  /**
   * 获取分配统计信息
   *
   * @param taskId 任务ID
   * @returns 统计信息
   */
  async getAssignmentStats(taskId: number): Promise<{
    total: number;
    active: number;
    completed: number;
    cancelled: number;
  }> {
    try {
      const [rows] = await databaseService.query(
        `SELECT
           COUNT(*) as total,
           SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
           SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
           SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
         FROM task_assignments
         WHERE task_id = ?`,
        [taskId]
      );

      const stats = (rows as any[])[0];
      return {
        total: stats.total || 0,
        active: stats.active || 0,
        completed: stats.completed || 0,
        cancelled: stats.cancelled || 0
      };

    } catch (error) {
      console.error('[TaskAssignmentService] 获取分配统计失败:', error);
      return { total: 0, active: 0, completed: 0, cancelled: 0 };
    }
  }
}

// ==================== 导出单例 ====================

export const taskAssignmentService = new TaskAssignmentService();
