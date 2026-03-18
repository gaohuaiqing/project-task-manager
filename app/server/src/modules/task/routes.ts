// app/server/src/modules/task/routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { TaskService } from './service';
import { ValidationError } from '../../core/errors';
import type { User } from '../../core/types';
import type { TaskQueryOptions, CreateTaskRequest, UpdateTaskRequest } from './types';

const router = Router();
const taskService = new TaskService();

function getCurrentUser(req: Request): User | null {
  return (req as any).user || null;
}

function requireUser(req: Request): User {
  const user = getCurrentUser(req);
  if (!user) throw new ValidationError('未登录');
  return user;
}

// ========== 任务管理 ==========

// 获取任务列表
router.get('/tasks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const options: TaskQueryOptions = {
      project_id: req.query.project_id as string,
      status: req.query.status as any,
      task_type: req.query.task_type as any,
      priority: req.query.priority as any,
      assignee_id: req.query.assignee_id ? parseInt(req.query.assignee_id as string) : undefined,
      parent_id: req.query.parent_id === 'null' ? null : req.query.parent_id as string,
      search: req.query.search as string,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : 50,
    };

    const result = await taskService.getTasks(options);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// 获取任务详情
router.get('/tasks/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = await taskService.getTaskById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '任务不存在' } });
    }
    res.json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
});

// 创建任务
router.post('/tasks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    const id = await taskService.createTask(req.body as CreateTaskRequest, currentUser);
    res.status(201).json({ success: true, data: { id } });
  } catch (error) {
    next(error);
  }
});

// 更新任务
router.put('/tasks/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    const result = await taskService.updateTask(req.params.id, req.body as UpdateTaskRequest, currentUser);

    if (result.conflict) {
      return res.status(409).json({ success: false, error: { code: 'VERSION_CONFLICT', message: '数据已被修改，请刷新后重试' } });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// 删除任务
router.delete('/tasks/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    await taskService.deleteTask(req.params.id, currentUser);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ========== 进度记录 ==========

// 获取进度记录
router.get('/tasks/:id/progress', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const records = await taskService.getProgressRecords(req.params.id);
    res.json({ success: true, data: records });
  } catch (error) {
    next(error);
  }
});

// 添加进度记录
router.post('/tasks/:id/progress', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    const { content } = req.body;
    const id = await taskService.addProgressRecord(req.params.id, content, currentUser.id);
    res.status(201).json({ success: true, data: { id } });
  } catch (error) {
    next(error);
  }
});

// ========== 批量操作 ==========

// 批量获取任务
router.post('/batch/tasks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ids } = req.body;
    const tasks = await taskService.getTasksByIds(ids || []);
    res.json({ success: true, data: tasks });
  } catch (error) {
    next(error);
  }
});

// ========== 统计 ==========

router.get('/tasks/stats/:projectId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await taskService.getTaskStats(req.params.projectId);
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
});

export default router;
