// app/server/src/modules/workflow/routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { WorkflowService } from './service';
import { ValidationError } from '../../core/errors';
import type { User } from '../../core/types';
import type { CreatePlanChangeRequest, ApprovalDecisionRequest, CreateDelayRecordRequest } from './types';

const router = Router();
const workflowService = new WorkflowService();

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
    const data: ApprovalDecisionRequest = {
      approved: false,
      rejection_reason: req.body.rejection_reason,
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

export default router;
