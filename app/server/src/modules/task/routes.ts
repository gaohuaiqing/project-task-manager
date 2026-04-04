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

/**
 * 解析数组参数（支持逗号分隔字符串或数组）
 */
function parseArrayParam<T extends string>(param: unknown): T[] | undefined {
  if (!param) return undefined;
  if (Array.isArray(param)) return param as T[];
  const str = String(param);
  if (!str.trim()) return undefined;
  return str.split(',').filter(Boolean) as T[];
}

/**
 * 解析数字数组参数
 */
function parseNumberArrayParam(param: unknown): number[] | undefined {
  if (!param) return undefined;
  if (Array.isArray(param)) return param.map(Number).filter(n => !isNaN(n));
  const str = String(param);
  if (!str.trim()) return undefined;
  return str.split(',').filter(Boolean).map(Number).filter(n => !isNaN(n));
}

// ========== 任务管理 ==========

// 获取任务列表
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req); // 认证检查
    const options: TaskQueryOptions = {
      project_id: parseArrayParam(req.query.project_id),
      status: parseArrayParam(req.query.status),
      task_type: parseArrayParam(req.query.task_type),
      priority: parseArrayParam(req.query.priority),
      assignee_id: parseNumberArrayParam(req.query.assignee_id),
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
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    requireUser(req); // 认证检查
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
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    const id = await taskService.createTask(req.body as CreateTaskRequest, currentUser);
    res.status(201).json({ success: true, data: { id } });
  } catch (error) {
    next(error);
  }
});

// 更新任务
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
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
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
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
router.get('/:id/progress', async (req: Request, res: Response, next: NextFunction) => {
  try {
    requireUser(req); // 认证检查
    const records = await taskService.getProgressRecords(req.params.id);
    res.json({ success: true, data: records });
  } catch (error) {
    next(error);
  }
});

// 添加进度记录
router.post('/:id/progress', async (req: Request, res: Response, next: NextFunction) => {
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
router.post('/batch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    requireUser(req); // 认证检查
    const { ids } = req.body;
    const tasks = await taskService.getTasksByIds(ids || []);
    res.json({ success: true, data: tasks });
  } catch (error) {
    next(error);
  }
});

// ========== 统计 ==========

router.get('/stats/:projectId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    requireUser(req); // 认证检查
    const stats = await taskService.getTaskStats(req.params.projectId);
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
});

// ========== WBS编码查询 ==========

// 根据WBS编码获取任务
router.get('/by-wbs-code/:wbsCode', async (req: Request, res: Response, next: NextFunction) => {
  try {
    requireUser(req); // 认证检查
    const projectId = req.query.project_id as string;
    if (!projectId) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: '缺少project_id参数' } });
    }
    const task = await taskService.getTaskByWbsCode(projectId, req.params.wbsCode);
    if (!task) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '任务不存在' } });
    }
    res.json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
});

// ========== 计划变更历史 ==========

// 获取任务的计划变更历史
router.get('/:id/plan-changes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    requireUser(req); // 认证检查
    // 导入 WorkflowService
    const { WorkflowService } = await import('../workflow/service');
    const workflowService = new WorkflowService();
    const changes = await workflowService.getPlanChangesByTaskId(req.params.id);
    res.json({ success: true, data: changes });
  } catch (error) {
    next(error);
  }
});

export default router;
