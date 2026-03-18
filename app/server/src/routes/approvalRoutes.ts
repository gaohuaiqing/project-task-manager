/**
 * 审批流程 API 路由
 *
 * 功能：
 * 1. 计划变更审批管理
 * 2. 延期原因记录
 * 3. 变更历史查询
 *
 * @author AI Assistant
 * @since 2026-03-17
 */

import express from 'express';
import type { Request, Response } from 'express';
import { databaseService } from '../services/DatabaseService.js';
import { AppError, NotFoundError, AuthorizationError, ValidationError } from '../errors/classes.js';
import { logger, LOG_CATEGORIES } from '../logging/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getCurrentUserId, validateNotEmpty, calculateDelayDays } from './route-utils.js';

const router = express.Router();

// ==================== 审批列表 ====================

/**
 * GET /api/approvals
 * 获取审批列表
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { status, type, project_id, page = 1, pageSize = 20 } = req.query;
    const userId = getCurrentUserId(req);

    // 构建查询条件
    const { whereClause, params } = buildApprovalListQuery(type, status, project_id, userId);

    // 计算总数
    const countResult = await databaseService.query(
      `SELECT COUNT(*) as count FROM plan_changes pc JOIN wbs_tasks t ON pc.task_id = t.id WHERE ${whereClause}`,
      params
    );
    const total = Number(countResult[0]?.count) || 0;

    // 分页查询
    const offset = (Number(page) - 1) * Number(pageSize);
    const data = await queryApprovalList(whereClause, params, Number(pageSize), offset);

    // 统计信息
    const stats = await queryApprovalStats(userId);

    logger.info(LOG_CATEGORIES.HTTP_REQUEST, '获取审批列表', { userId, type, status, total });

    // 添加待审批天数
    const dataWithDays = addDaysPending(data);

    res.json({
      success: true,
      data: dataWithDays,
      pagination: buildPagination(page, pageSize, total),
      stats
    });
  })
);

// ==================== 审批操作 ====================

/**
 * POST /api/approvals/:id/approve
 * 通过审批
 */
router.post(
  '/:id/approve',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = getCurrentUserId(req);

    const approval = await validateApproval(id, userId);
    const task = await getTask(approval.task_id as number);

    if (!task) {
      throw new NotFoundError('任务', String(approval.task_id));
    }

    // 更新审批状态
    await databaseService.query(
      'UPDATE plan_changes SET status = ?, approved_at = NOW() WHERE id = ?',
      ['approved', id]
    );

    // 更新任务字段
    await applyTaskUpdate(approval, task);

    logger.info(LOG_CATEGORIES.SYSTEM, '审批通过', {
      approvalId: id,
      taskId: approval.task_id,
      changeType: approval.change_type,
      userId
    });

    res.json({
      success: true,
      data: { approval_id: id, task_id: approval.task_id },
      message: '审批通过'
    });
  })
);

/**
 * POST /api/approvals/:id/reject
 * 驳回审批
 */
router.post(
  '/:id/reject',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { rejection_reason } = req.body;
    const userId = getCurrentUserId(req);

    const rejectionReason = validateNotEmpty(rejection_reason, '驳回原因');
    const approval = await validateApproval(id, userId);

    // 更新审批状态
    await databaseService.query(
      'UPDATE plan_changes SET status = ?, rejection_reason = ?, approved_at = NOW() WHERE id = ?',
      ['rejected', rejectionReason, id]
    );

    logger.info(LOG_CATEGORIES.SYSTEM, '审批驳回', {
      approvalId: id,
      taskId: approval.task_id,
      reason: rejectionReason,
      userId
    });

    res.json({
      success: true,
      data: { approval_id: id, task_id: approval.task_id },
      message: '审批已驳回'
    });
  })
);

// ==================== 变更历史 ====================

/**
 * GET /api/approvals/task/:taskId/changes
 * 获取任务变更历史
 */
router.get(
  '/task/:taskId/changes',
  asyncHandler(async (req: Request, res: Response) => {
    const { taskId } = req.params;

    const changes = await databaseService.query(
      `SELECT
        pc.id, pc.change_type, pc.old_value, pc.new_value, pc.reason,
        pc.status, pc.rejection_reason, pc.created_at, pc.approved_at,
        u.real_name as user_name, a.real_name as approver_name
      FROM plan_changes pc
      JOIN users u ON pc.user_id = u.id
      LEFT JOIN users a ON pc.approver_id = a.id
      WHERE pc.task_id = ?
      ORDER BY pc.created_at DESC`,
      [taskId]
    );

    res.json({ success: true, data: changes });
  })
);

// ==================== 延期记录 ====================

/**
 * POST /api/approvals/task/:taskId/delays
 * 添加延期原因
 */
router.post(
  '/task/:taskId/delays',
  asyncHandler(async (req: Request, res: Response) => {
    const { taskId } = req.params;
    const { reason } = req.body;
    const userId = getCurrentUserId(req);

    const delayReason = validateNotEmpty(reason, '延期原因');
    const task = await getTask(Number(taskId));

    if (!task) {
      throw new NotFoundError('任务', taskId);
    }

    // 计算延期天数
    const delayDays = calculateDelayDays(new Date(task.end_date as string));

    // 创建延期记录
    await databaseService.query(
      'INSERT INTO delay_records (task_id, delay_days, reason, recorded_by, created_at) VALUES (?, ?, ?, ?, NOW())',
      [taskId, delayDays, delayReason, userId]
    );

    logger.info(LOG_CATEGORIES.SYSTEM, '添加延期原因', { taskId, delayDays, reason: delayReason, userId });

    res.json({
      success: true,
      data: { delay_days: delayDays },
      message: '延期原因已记录'
    });
  })
);

/**
 * GET /api/approvals/task/:taskId/delays
 * 获取任务延期记录
 */
router.get(
  '/task/:taskId/delays',
  asyncHandler(async (req: Request, res: Response) => {
    const { taskId } = req.params;

    const delays = await databaseService.query(
      `SELECT dr.id, dr.delay_days, dr.reason, dr.created_at, u.real_name as recorder_name
       FROM delay_records dr
       JOIN users u ON dr.recorded_by = u.id
       WHERE dr.task_id = ?
       ORDER BY dr.created_at DESC`,
      [taskId]
    );

    res.json({ success: true, data: delays });
  })
);

export default router;

// ==================== 辅助函数 ====================

/** 构建审批列表查询条件 */
function buildApprovalListQuery(
  type: unknown,
  status: unknown,
  projectId: unknown,
  userId: number
): { whereClause: string; params: unknown[] } {
  const clauses: string[] = ['1=1'];
  const params: unknown[] = [];

  if (type === 'my_pending') {
    clauses.push('pc.approver_id = ?', "pc.status = 'pending'");
    params.push(userId);
  } else if (type === 'my_submitted') {
    clauses.push('pc.user_id = ?');
    params.push(userId);
  }

  if (status) {
    clauses.push('pc.status = ?');
    params.push(status);
  }

  if (projectId) {
    clauses.push('t.project_id = ?');
    params.push(projectId);
  }

  return { whereClause: clauses.join(' AND '), params };
}

/** 查询审批列表 */
async function queryApprovalList(
  whereClause: string,
  params: unknown[],
  pageSize: number,
  offset: number
): Promise<Record<string, unknown>[]> {
  return databaseService.query(
    `SELECT
      pc.*,
      t.description as task_description,
      t.wbs_code as task_wbs_code,
      p.name as project_name,
      u.real_name as user_name,
      a.real_name as approver_name
    FROM plan_changes pc
    JOIN wbs_tasks t ON pc.task_id = t.id
    JOIN projects p ON t.project_id = p.id
    JOIN users u ON pc.user_id = u.id
    LEFT JOIN users a ON pc.approver_id = a.id
    WHERE ${whereClause}
    ORDER BY pc.created_at DESC
    LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );
}

/** 查询审批统计 */
async function queryApprovalStats(userId: number): Promise<{ total: number; pending: number; timeout: number }> {
  const result = await databaseService.query(
    `SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN is_timeout = true THEN 1 ELSE 0 END) as timeout
    FROM plan_changes WHERE approver_id = ?`,
    [userId]
  );
  const row = result[0] as { total: number; pending: number; timeout: number } | undefined;
  return row || { total: 0, pending: 0, timeout: 0 };
}

/** 添加待审批天数 */
function addDaysPending(data: Record<string, unknown>[]): Record<string, unknown>[] {
  const now = Date.now();
  return data.map((item) => ({
    ...item,
    days_pending:
      item.status === 'pending'
        ? Math.floor((now - new Date(item.created_at as string).getTime()) / (1000 * 60 * 60 * 24))
        : 0
  }));
}

/** 构建分页信息 */
function buildPagination(page: unknown, pageSize: unknown, total: number) {
  return {
    page: Number(page),
    pageSize: Number(pageSize),
    total,
    totalPages: Math.ceil(total / Number(pageSize))
  };
}

/** 获取并验证审批记录 */
async function validateApproval(id: string, userId: number): Promise<Record<string, unknown>> {
  const result = await databaseService.query('SELECT * FROM plan_changes WHERE id = ?', [id]);
  const approval = result[0];

  if (!approval) {
    throw new NotFoundError('审批记录', id);
  }

  if (approval.approver_id !== userId) {
    throw new AuthorizationError('您不是该审批的审批人');
  }

  if (approval.status !== 'pending') {
    throw new AppError('APPROVAL_PROCESSED', '该审批已处理', 400);
  }

  return approval;
}

/** 获取任务信息 */
async function getTask(taskId: number): Promise<Record<string, unknown> | null> {
  const result = await databaseService.query('SELECT * FROM wbs_tasks WHERE id = ?', [taskId]);
  return result[0] || null;
}

/** 应用任务更新 */
async function applyTaskUpdate(
  approval: Record<string, unknown>,
  task: Record<string, unknown>
): Promise<void> {
  const updateData = buildTaskUpdateData(
    approval.change_type as string,
    approval.new_value as string,
    task
  );

  if (Object.keys(updateData).length > 0) {
    const setClauses = Object.keys(updateData)
      .map((key) => `${key} = ?`)
      .join(', ');
    await databaseService.query(
      `UPDATE wbs_tasks SET ${setClauses} WHERE id = ?`,
      [...Object.values(updateData), approval.task_id]
    );
  }
}

/** 构建任务更新数据 */
function buildTaskUpdateData(
  changeType: string,
  newValue: string,
  task: Record<string, unknown>
): Record<string, unknown> {
  const updateData: Record<string, unknown> = {};

  switch (changeType) {
    case 'start_date':
      updateData.start_date = newValue;
      break;
    case 'end_date':
      updateData.end_date = newValue;
      break;
    case 'duration':
      updateData.duration = Number(newValue);
      break;
    case 'predecessor_id':
      updateData.predecessor_id = newValue || null;
      break;
    case 'lag_days':
      updateData.lag_days = Number(newValue);
      break;
    default:
      return {};
  }

  updateData.version = Number(task.version) + 1;
  updateData.plan_change_count = (Number(task.plan_change_count) || 0) + 1;
  updateData.updated_at = new Date();

  return updateData;
}
