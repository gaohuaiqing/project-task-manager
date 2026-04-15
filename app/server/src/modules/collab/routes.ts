// app/server/src/modules/collab/routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { CollabService } from './service';
import { ValidationError } from '../../core/errors';
import type { User } from '../../core/types';
import type { UploadAttachmentRequest, BatchQueryRequest } from './types';

const router = Router();
const collabService = new CollabService();

function getCurrentUser(req: Request): User | null {
  return (req as any).user || null;
}

function requireUser(req: Request): User {
  const user = getCurrentUser(req);
  if (!user) throw new ValidationError('未登录');
  return user;
}

// ========== 在线状态 ==========

router.get('/online-users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await collabService.getOnlineUsers();
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
});

router.put('/online-status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    const { status } = req.body;
    await collabService.updateUserOnlineStatus(currentUser.id, status);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ========== 附件管理 ==========

router.get('/tasks/:id/attachments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const attachments = await collabService.getAttachments(req.params.id);
    res.json({ success: true, data: attachments });
  } catch (error) {
    next(error);
  }
});

router.post('/tasks/:id/attachments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    const data: UploadAttachmentRequest = {
      task_id: req.params.id,
      ...req.body,
    };
    const id = await collabService.uploadAttachment(data, currentUser);
    res.status(201).json({ success: true, data: { id } });
  } catch (error) {
    next(error);
  }
});

router.delete('/attachments/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    await collabService.deleteAttachment(req.params.id, currentUser);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ========== 版本历史 ==========

router.get('/versions/:tableName/:recordId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const history = await collabService.getVersionHistory(req.params.tableName, req.params.recordId);
    res.json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
});

// ========== 批量查询 ==========

router.post('/batch/query', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await collabService.batchQuery(req.body as BatchQueryRequest);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.post('/batch/projects', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ids } = req.body;
    const pool = require('../../core/db').getPool();
    const placeholders = ids.map(() => '?').join(',');
    const [rows] = await pool.execute('SELECT * FROM projects WHERE id IN (' + placeholders + ')', ids);
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

router.post('/batch/members', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ids } = req.body;
    const pool = require('../../core/db').getPool();
    const placeholders = ids.map(() => '?').join(',');
    const [rows] = await pool.execute(
      'SELECT id, username, real_name, role, department_id, email, phone, is_active FROM users WHERE id IN (' + placeholders + ')',
      ids
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

router.post('/batch/wbs-tasks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ids } = req.body;
    const pool = require('../../core/db').getPool();
    const placeholders = ids.map(() => '?').join(',');
    const [rows] = await pool.execute('SELECT * FROM wbs_tasks WHERE id IN (' + placeholders + ')', ids);
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

// ========== 缓存管理 ==========

router.get('/cache/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = await collabService.getCacheStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    next(error);
  }
});

router.delete('/cache/clear', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await collabService.clearCache();
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post('/cache/warmup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await collabService.warmupCache();
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ========== 审计日志 ==========

router.get('/audit-logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    // 只有 admin 和 dept_manager 可查看审计日志
    if (currentUser.role !== 'admin' && currentUser.role !== 'dept_manager') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: '无权限查看审计日志' }
      });
    }
    const options = {
      user_id: req.query.user_id ? parseInt(req.query.user_id as string) : undefined,
      action: req.query.action as string,
      table_name: req.query.table_name as string,
      start_date: req.query.start_date as string,
      end_date: req.query.end_date as string,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : 50,
    };
    const result = await collabService.getAuditLogs(options);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

export default router;
