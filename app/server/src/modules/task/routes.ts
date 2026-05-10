// app/server/src/modules/task/routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { TaskService } from './service';
import { OrgService } from '../org/service';
import { ValidationError } from '../../core/errors';
import type { User } from '../../core/types';
import type { TaskQueryOptions, CreateTaskRequest, UpdateTaskRequest } from './types';
import type { ChangeTaskLevelRequest, ReorderTaskRequest } from './types';

const router = Router();
const taskService = new TaskService();
const orgService = new OrgService();

function getCurrentUser(req: Request): User | null {
  return (req as any).user || null;
}

function requireUser(req: Request): User {
  const user = getCurrentUser(req);
  if (!user) throw new ValidationError('未登录');
  return user;
}

/**
 * 数据隔离检查：验证用户是否有权限访问指定任务
 * @param user 当前用户
 * @param task 要访问的任务（需要 project_id 和 assignee_id）
 * @returns true 表示有权限，false 表示无权限
 *
 * 安全规则：
 * 1. admin 有全部权限
 * 2. 无项目归属任务：只有任务负责人可以访问
 * 3. 悬空项目引用任务（项目不存在）：视为无项目归属任务，只有负责人可见
 * 4. 正常项目任务：用户必须是项目成员
 */
async function checkTaskAccess(user: User, task: { project_id: string | null; assignee_id: number | null }): Promise<boolean> {
  // admin 有全部权限
  if (user.role === 'admin') return true;

  // 任务无项目归属时，只有任务负责人可以访问
  if (!task.project_id) {
    return task.assignee_id === user.id;
  }

  // 检查项目是否存在（防止悬空引用）
  const projectRepo = new (await import('../project/repository')).ProjectRepository();
  const project = await projectRepo.getProjectById(task.project_id);

  // 项目不存在（悬空引用）：视为无项目归属任务，只有负责人可见
  if (!project) {
    return task.assignee_id === user.id;
  }

  // 有项目归属的任务：检查用户是否是项目成员
  const accessibleProjectIds = await taskService.getAccessibleProjectIds(user);
  if (!accessibleProjectIds || accessibleProjectIds.length === 0) return false;

  // accessibleProjectIds 是 string[]，task.project_id 可能是 number，需要统一类型
  return accessibleProjectIds.includes(String(task.project_id));
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

    // 根据角色过滤数据范围
    const accessibleProjectIds = await taskService.getAccessibleProjectIds(currentUser);
    if (accessibleProjectIds) {
      options.accessible_project_ids = accessibleProjectIds;
      // 传递 user_id 用于过滤无项目归属的任务（只有负责人可见）
      if (currentUser.role !== 'admin') {
        options.user_id = currentUser.id;
      }
    }

    const result = await taskService.getTasks(options, currentUser);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// ========== 导入导出功能（必须在 :id 路由之前） ==========

// 导出任务列表
router.get('/export', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    const format = (req.query.format as string) || 'csv';
    const projectId = req.query.project_id as string;

    // 构建查询选项
    // P14修复：限制最大导出数量，防止 OOM
    const MAX_EXPORT_SIZE = 5000;
    const options: TaskQueryOptions = {
      project_id: projectId,
      page: 1,
      pageSize: MAX_EXPORT_SIZE,
    };

    // 数据隔离过滤
    if (currentUser.role !== 'admin') {
      options.accessible_project_ids = await taskService.getAccessibleProjectIds(currentUser);
      options.user_id = currentUser.id;
    }

    const { items: tasks } = await taskService.getTasks(options);

    // 根据格式导出
    if (format === 'csv') {
      const csvHeaders = [
        'WBS编码', '描述', '任务类型', '优先级', '状态',
        '负责人', '开始日期', '结束日期', '工期', '前置任务',
        '依赖类型', '滞后天数', '实际开始', '实际结束', '进度记录数'
      ];
      const csvRows = tasks.map(t => [
        t.wbs_code || '',
        t.description || '',
        t.task_type || '',
        t.priority || '',
        t.status || '',
        t.assignee_name || '',
        t.start_date || '',
        t.end_date || '',
        t.duration || '',
        t.predecessor_id || '',
        t.dependency_type || '',
        t.lag_days || '',
        t.actual_start_date || '',
        t.actual_end_date || '',
        t.progress_record_count || 0
      ]);

      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="tasks_export_${new Date().toISOString().slice(0, 10)}.csv"`);
      res.send('﻿' + csvContent);  // UTF-8 BOM for Excel compatibility
    } else if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="tasks_export_${new Date().toISOString().slice(0, 10)}.json"`);
      res.json({ success: true, data: tasks, total: tasks.length });
    } else {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: '不支持的导出格式' } });
    }
  } catch (error) {
    next(error);
  }
});

// 下载导入模板（带数据验证的 Excel 格式）
router.get('/import/template', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);

    // 获取当前系统配置的任务类型
    const taskTypes = await orgService.getTaskTypes();

    // 获取所有项目列表（用于项目编码下拉框）
    const { items: projects } = await new (await import('../project/repository')).ProjectRepository().getProjects({ pageSize: 1000 });

    // 生成带数据验证的 Excel 模板
    const buffer = await taskService.generateImportTemplate(taskTypes, projects);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', "attachment; filename*=UTF-8''WBS%E4%BB%BB%E5%8A%A1%E5%AF%BC%E5%85%A5%E6%A8%A1%E6%9D%BF.xlsx");
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

// 导入任务（事务保护）
router.post('/import', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    const { tasks } = req.body;

    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: '缺少任务数据或数据格式错误' } });
    }

    // 使用事务保护的批量导入（根据项目编码自动匹配项目UUID）
    const result = await taskService.importTasks(tasks, currentUser);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// 批量获取任务
router.post('/batch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    const { ids } = req.body;

    // admin 不过滤
    if (currentUser.role === 'admin') {
      const tasks = await taskService.getTasksByIds(ids || []);
      return res.json({ success: true, data: tasks });
    }

    const accessibleProjectIds = await taskService.getAccessibleProjectIds(currentUser);
    const tasks = await taskService.getTasksByIds(ids || []);

    // 数据隔离过滤：参与项目的任务 + 分配给自己的无项目归属/悬空引用任务
    // 悬空项目引用（project_id 有值但项目不存在）视为无项目归属任务
    const filtered = tasks.filter(task => {
      if (task.project_id) {
        // 有项目归属：必须是有效项目且用户是项目成员
        // project_name 为 null 说明项目不存在（LEFT JOIN 结果）
        if (!(task as any).project_name) {
          return task.assignee_id === currentUser.id;
        }
        return accessibleProjectIds && accessibleProjectIds.includes(String(task.project_id));
      }
      // 无项目归属：必须是任务负责人
      return task.assignee_id === currentUser.id;
    });

    res.json({ success: true, data: filtered });
  } catch (error) {
    next(error);
  }
});

// P11: 批量更新任务（管理员/经理专用）
router.post('/batch-update', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    const { ids, updates } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: '请提供要更新的任务ID列表' } });
    }

    // 权限检查：只有管理员和经理可以批量更新
    if (currentUser.role !== 'admin' && currentUser.role !== 'tech_manager' && currentUser.role !== 'dept_manager') {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: '无权限批量更新任务' } });
    }

    // 限制单次批量更新数量
    if (ids.length > 100) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: '单次最多更新100个任务' } });
    }

    const results = await taskService.batchUpdateTasks(ids, updates, currentUser);
    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
});

// P11: 批量删除任务（管理员专用）
router.post('/batch-delete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: '请提供要删除的任务ID列表' } });
    }

    // 限制单次批量删除数量（防止大量删除影响性能）
    if (ids.length > 50) {
      return res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: '单次最多删除50个任务' }
      });
    }

    // 权限检查：admin/dept_manager 可以批量删除
    if (currentUser.role !== 'admin' && currentUser.role !== 'dept_manager') {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: '无权限批量删除任务' } });
    }

    const results = await taskService.batchDeleteTasks(ids, currentUser);
    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
});

// ========== 任务详情路由 ==========

// 获取任务详情
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    const task = await taskService.getTaskById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '任务不存在' } });
    }

    // 数据隔离检查
    if (!await checkTaskAccess(currentUser, task)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: '无权访问此任务' } });
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

// P5: 删除预览接口 - 显示将被删除的任务及其子任务
router.get('/:id/delete-preview', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    const task = await taskService.getTaskById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '任务不存在' } });
    }

    // 数据隔离检查
    if (!await checkTaskAccess(currentUser, task)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: '无权访问此任务' } });
    }

    // 获取所有将被删除的后代任务
    const descendants = await taskService.getTaskWithDescendants(req.params.id);
    const descendantCount = descendants.length - 1; // 排除任务自身

    res.json({
      success: true,
      data: {
        task,
        descendantCount,
        descendants: descendants.slice(1, 11).map(t => ({
          id: t.id,
          wbs_code: t.wbs_code,
          description: t.description,
          assignee_id: t.assignee_id,
        })),
        hasMore: descendants.length > 11,
      },
    });
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
    const currentUser = requireUser(req);
    const task = await taskService.getTaskById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '任务不存在' } });
    }

    // 数据隔离检查
    if (!await checkTaskAccess(currentUser, task)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: '无权访问此任务' } });
    }

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
    const task = await taskService.getTaskById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '任务不存在' } });
    }

    // 数据隔离检查
    if (!await checkTaskAccess(currentUser, task)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: '无权访问此任务' } });
    }

    const { content } = req.body;
    const id = await taskService.addProgressRecord(req.params.id, content, currentUser.id);
    res.status(201).json({ success: true, data: { id } });
  } catch (error) {
    next(error);
  }
});

// ========== 任务层级管理 ==========

// 修改任务等级
router.patch('/:id/level', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    // 前端 axios 拦截器会将 camelCase 转换为 snake_case
    const { target_level: targetLevel } = req.body as any;

    if (typeof targetLevel !== 'number' || !Number.isInteger(targetLevel)) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'targetLevel 必须是整数' } });
    }

    const task = await taskService.getTaskById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '任务不存在' } });
    }

    if (!await checkTaskAccess(currentUser, task)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: '无权访问此任务' } });
    }

    const affectedTasks = await taskService.changeTaskLevel(req.params.id, targetLevel, currentUser);

    // WebSocket 广播
    if (task.project_id) {
      const { sendToProjectMembers } = await import('../../core/realtime');
      sendToProjectMembers(task.project_id, 'task_hierarchy_changed', {
        projectId: task.project_id,
        affectedTaskIds: affectedTasks.map(t => t.id),
      });
    }

    res.json({ success: true, data: { affectedTasks } });
  } catch (error) {
    next(error);
  }
});

// 拖拽排序
router.patch('/:id/reorder', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    // 前端 axios 拦截器会将 camelCase 转换为 snake_case
    const { after_task_id: afterTaskId } = req.body as any;

    const task = await taskService.getTaskById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '任务不存在' } });
    }

    if (!await checkTaskAccess(currentUser, task)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: '无权访问此任务' } });
    }

    await taskService.reorderTask(req.params.id, afterTaskId || null, currentUser);

    // WebSocket 广播
    if (task.project_id) {
      const { sendToProjectMembers } = await import('../../core/realtime');
      sendToProjectMembers(task.project_id, 'task_reordered', {
        taskId: req.params.id,
        projectId: task.project_id,
        afterTaskId,
      });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ========== 统计 ==========

router.get('/stats/:projectId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);

    // 数据隔离检查：非 admin 用户只能查看自己参与项目的统计
    if (currentUser.role !== 'admin') {
      const accessibleProjectIds = await taskService.getAccessibleProjectIds(currentUser);
      if (!accessibleProjectIds || !accessibleProjectIds.includes(req.params.projectId)) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: '无权访问此项目统计' } });
      }
    }

    const stats = await taskService.getTaskStats(req.params.projectId);
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
});

// ========== 计划变更历史 ==========

// 获取任务的计划变更历史
router.get('/:id/plan-changes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    const task = await taskService.getTaskById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '任务不存在' } });
    }

    // 数据隔离检查
    if (!await checkTaskAccess(currentUser, task)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: '无权访问此任务' } });
    }

    // 导入共享的 WorkflowService 实例
    const { workflowService } = await import('../workflow/routes');
    const changes = await workflowService.getPlanChangesByTaskId(req.params.id);
    res.json({ success: true, data: changes });
  } catch (error) {
    next(error);
  }
});

export default router;
