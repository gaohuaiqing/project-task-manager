// app/server/src/modules/workflow/routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { WorkflowService } from './service';
import { ValidationError } from '../../core/errors';
import type { User } from '../../core/types';
import type { CreatePlanChangeRequest, ApprovalDecisionRequest, CreateDelayRecordRequest, ApprovalItemsQueryOptions } from './types';

const router = Router();

// 共享单例实例，避免重复注册事件监听器
export const workflowService = new WorkflowService();

function getCurrentUser(req: Request): User | null {
  return (req as any).user || null;
}

function requireUser(req: Request): User {
  const user = getCurrentUser(req);
  if (!user) throw new ValidationError('未登录');
  return user;
}

// ========== 计划变更管理 ==========

// 获取变更列表
router.get('/plan-changes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const options = {
      status: req.query.status as any,
      project_id: req.query.project_id as string,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : 20,
    };

    const result = await workflowService.getPlanChanges(options);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// 获取变更详情
router.get('/plan-changes/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const change = await workflowService.getPlanChangeById(req.params.id);
    if (!change) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '变更请求不存在' } });
    }
    res.json({ success: true, data: change });
  } catch (error) {
    next(error);
  }
});

// 提交计划变更
router.post('/plan-changes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    const id = await workflowService.createPlanChange(req.body as CreatePlanChangeRequest, currentUser);
    res.status(201).json({ success: true, data: { id } });
  } catch (error) {
    next(error);
  }
});

// 审批变更
router.post('/plan-changes/:id/approve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    const data: ApprovalDecisionRequest = {
      approved: true,
      rejection_reason: req.body.rejection_reason,
    };
    await workflowService.approvePlanChange(req.params.id, data, currentUser);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// 驳回变更
router.post('/plan-changes/:id/reject', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    const rejectionReason = req.body.rejection_reason?.trim();
    if (!rejectionReason || rejectionReason.length < 2) {
      throw new ValidationError('驳回原因不能为空且至少2个字符');
    }
    if (rejectionReason.length > 500) {
      throw new ValidationError('驳回原因不能超过500个字符');
    }
    const data: ApprovalDecisionRequest = {
      approved: false,
      rejection_reason: rejectionReason,
    };
    await workflowService.approvePlanChange(req.params.id, data, currentUser);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// 获取待审批列表
router.get('/approvals/pending', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    const items = await workflowService.getPendingApprovals(currentUser);
    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
});

// ========== 审批项分组管理 ==========

// 获取分组后的审批项列表
router.get('/approval-items', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const options: ApprovalItemsQueryOptions = {
      status: req.query.status as any,
      projectId: req.query.projectId as string,
      userId: req.query.userId ? parseInt(req.query.userId as string) : undefined,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : 20,
    };
    const result = await workflowService.getApprovalItems(options);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// 获取审批项详情
router.get('/approval-items/:submissionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await workflowService.getApprovalItemBySubmissionId(req.params.submissionId);
    if (!item) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '审批请求不存在' } });
    }
    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

// 通过审批项
router.post('/approval-items/:submissionId/approve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    const data: ApprovalDecisionRequest = {
      approved: true,
      rejection_reason: req.body.rejection_reason,
    };
    await workflowService.approveSubmission(req.params.submissionId, data, currentUser);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// 驳回审批项
router.post('/approval-items/:submissionId/reject', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    const rejectionReason = req.body.rejection_reason?.trim();
    if (!rejectionReason || rejectionReason.length < 2) {
      throw new ValidationError('驳回原因不能为空且至少2个字符');
    }
    if (rejectionReason.length > 500) {
      throw new ValidationError('驳回原因不能超过500个字符');
    }
    const data: ApprovalDecisionRequest = {
      approved: false,
      rejection_reason: rejectionReason,
    };
    await workflowService.approveSubmission(req.params.submissionId, data, currentUser);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ========== 延期记录 ==========

// 获取延期记录
router.get('/tasks/:id/delays', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const records = await workflowService.getDelayRecords(req.params.id);
    res.json({ success: true, data: records });
  } catch (error) {
    next(error);
  }
});

// 添加延期记录
router.post('/tasks/:id/delays', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    const id = await workflowService.addDelayRecord(req.params.id, req.body as CreateDelayRecordRequest, currentUser);
    res.status(201).json({ success: true, data: { id } });
  } catch (error) {
    next(error);
  }
});

// ========== 通知管理 ==========

// 获取通知列表
router.get('/notifications', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    const options = {
      unreadOnly: req.query.unreadOnly === 'true',
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : 20,
    };
    const result = await workflowService.getNotifications(currentUser.id, options);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// 标记通知已读
router.put('/notifications/:id/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    await workflowService.markNotificationAsRead(req.params.id, currentUser.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// 标记全部已读
router.put('/notifications/read-all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    const count = await workflowService.markAllNotificationsAsRead(currentUser.id);
    res.json({ success: true, data: { count } });
  } catch (error) {
    next(error);
  }
});

// 删除单个通知
router.delete('/notifications/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    await workflowService.deleteNotification(req.params.id, currentUser.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// 批量删除通知
router.post('/notifications/batch-delete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    const { ids } = req.body as { ids: string[] };
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'ids 不能为空' } });
    }
    if (ids.length > 100) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: '单次最多删除 100 条通知' } });
    }
    const count = await workflowService.deleteNotifications(ids, currentUser.id);
    res.json({ success: true, data: { count } });
  } catch (error) {
    next(error);
  }
});

// 删除所有已读通知
router.delete('/notifications/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    const count = await workflowService.deleteAllReadNotifications(currentUser.id);
    res.json({ success: true, data: { count } });
  } catch (error) {
    next(error);
  }
});

export default router;
