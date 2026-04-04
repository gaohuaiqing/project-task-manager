// app/server/src/modules/project/routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { ProjectService } from './service';
import { ValidationError } from '../../core/errors';
import type { User } from '../../core/types';
import type { CreateMilestoneRequest, UpdateMilestoneRequest } from './types';

const router = Router();
const projectService = new ProjectService();

function getCurrentUser(req: Request): User | null {
  return (req as any).user || null;
}

function requireUser(req: Request): User {
  const user = getCurrentUser(req);
  if (!user) {
    throw new ValidationError('未登录');
  }
  return user;
}

// ========== 节假日管理（放在 /:id 之前，避免路由冲突）==========

// 获取节假日
router.get('/holidays', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const holidays = await projectService.getHolidays(year);
    res.json({ success: true, data: holidays });
  } catch (error) {
    next(error);
  }
});

// 创建节假日
router.post('/holidays', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    await projectService.createHoliday(req.body, currentUser);
    res.status(201).json({ success: true });
  } catch (error) {
    next(error);
  }
});

// 删除节假日
router.delete('/holidays/:date', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    await projectService.deleteHoliday(req.params.date, currentUser);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ========== 项目管理 ==========

// 获取项目列表
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = getCurrentUser(req);
    const options: any = {
      status: req.query.status as string,
      project_type: req.query.project_type as string,
      search: req.query.search as string,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : 20,
    };

    // 非管理员只能看到自己参与的项目
    if (currentUser && currentUser.role !== 'admin') {
      options.member_id = currentUser.id;
    }

    const result = await projectService.getProjects(options);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// 获取项目详情
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await projectService.getProjectById(req.params.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '项目不存在' }
      });
    }

    // 验证访问权限
    const currentUser = getCurrentUser(req);
    if (currentUser && currentUser.role !== 'admin') {
      const isMember = await projectService.isProjectMember(req.params.id, currentUser.id);
      if (!isMember) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: '无权限访问此项目' }
        });
      }
    }

    res.json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
});

// 获取项目统计
router.get('/:id/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await projectService.getProjectStats(req.params.id);
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
});

// 创建项目
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    const id = await projectService.createProject(req.body, currentUser);
    res.status(201).json({ success: true, data: { id } });
  } catch (error) {
    next(error);
  }
});

// 更新项目
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    const result = await projectService.updateProject(req.params.id, req.body, currentUser);

    if (result.conflict) {
      return res.status(409).json({
        success: false,
        error: { code: 'VERSION_CONFLICT', message: '数据已被其他人修改，请刷新后重试' }
      });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// 删除项目
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    await projectService.deleteProject(req.params.id, currentUser);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ========== 里程碑管理 ==========

// 获取项目里程碑
router.get('/:id/milestones', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const milestones = await projectService.getMilestones(req.params.id);
    res.json({ success: true, data: milestones });
  } catch (error) {
    next(error);
  }
});

// 创建里程碑
router.post('/:id/milestones', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    // 前端拦截器已转换为蛇形命名，直接使用
    const body = req.body as Record<string, unknown>;
    const mappedData: CreateMilestoneRequest = {
      name: body.name as string,
      target_date: body.target_date as string,
      description: body.description as string | undefined,
      completion_percentage: body.completion_percentage as number | undefined,
    };

    const id = await projectService.createMilestone(req.params.id, mappedData, currentUser);
    res.status(201).json({ success: true, data: { id } });
  } catch (error) {
    next(error);
  }
});

// 更新里程碑
router.put('/milestones/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    // 前端拦截器已转换为蛇形命名，直接使用
    const body = req.body as Record<string, unknown>;
    const mappedData: UpdateMilestoneRequest = {};
    if (body.name !== undefined) mappedData.name = body.name as string;
    if (body.target_date !== undefined) mappedData.target_date = body.target_date as string;
    if (body.description !== undefined) mappedData.description = body.description as string;
    if (body.completion_percentage !== undefined) mappedData.completion_percentage = body.completion_percentage as number;

    const updated = await projectService.updateMilestone(req.params.id, mappedData, currentUser);
    res.json({ success: true, data: { updated } });
  } catch (error) {
    next(error);
  }
});

// 删除里程碑
router.delete('/milestones/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    await projectService.deleteMilestone(req.params.id, currentUser);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ========== 时间线管理 ==========

// 获取项目时间线
router.get('/:id/timelines', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const timelines = await projectService.getTimelines(req.params.id);
    res.json({ success: true, data: timelines });
  } catch (error) {
    next(error);
  }
});

// 创建时间线
router.post('/:id/timelines', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    const id = await projectService.createTimeline(req.params.id, req.body, currentUser);
    res.status(201).json({ success: true, data: { id } });
  } catch (error) {
    next(error);
  }
});

// 更新时间线
router.put('/timelines/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    const updated = await projectService.updateTimeline(req.params.id, req.body, currentUser);
    res.json({ success: true, data: { updated } });
  } catch (error) {
    next(error);
  }
});

// 删除时间线
router.delete('/timelines/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    await projectService.deleteTimeline(req.params.id, currentUser);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ========== 时间线任务管理 ==========

// 获取时间线任务
router.get('/timelines/:id/tasks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tasks = await projectService.getTimelineTasks(req.params.id);
    res.json({ success: true, data: tasks });
  } catch (error) {
    next(error);
  }
});

// 创建时间线任务
router.post('/timelines/:id/tasks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    const id = await projectService.createTimelineTask(req.params.id, req.body, currentUser);
    res.status(201).json({ success: true, data: { id } });
  } catch (error) {
    next(error);
  }
});

// 更新时间线任务
router.put('/timeline-tasks/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    const updated = await projectService.updateTimelineTask(req.params.id, req.body, currentUser);
    res.json({ success: true, data: { updated } });
  } catch (error) {
    next(error);
  }
});

// 删除时间线任务
router.delete('/timeline-tasks/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    await projectService.deleteTimelineTask(req.params.id, currentUser);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ========== 项目成员管理 ==========

// 获取项目成员
router.get('/:id/members', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const members = await projectService.getProjectMembers(req.params.id);
    res.json({ success: true, data: members });
  } catch (error) {
    next(error);
  }
});

// 添加项目成员
router.post('/:id/members', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    const added = await projectService.addProjectMember(req.params.id, req.body, currentUser);
    res.json({ success: true, data: { added } });
  } catch (error) {
    next(error);
  }
});

// 移除项目成员
router.delete('/:id/members/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    await projectService.removeProjectMember(
      req.params.id,
      parseInt(req.params.userId),
      currentUser
    );
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
