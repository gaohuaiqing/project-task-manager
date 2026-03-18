// app/server/src/modules/org/routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { OrgService } from './service';
import { ValidationError } from '../../core/errors';
import type { User } from '../../core/types';

const router = Router();
const orgService = new OrgService();

// 获取当前用户的辅助函数
function getCurrentUser(req: Request): User | null {
  return (req as any).user || null;
}

// ========== 部门管理 ==========

// 获取部门树
router.get('/departments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tree = await orgService.getDepartmentTree();
    res.json({ success: true, data: tree });
  } catch (error) {
    next(error);
  }
});

// 获取部门详情
router.get('/departments/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new ValidationError('无效的部门ID');
    }

    const department = await orgService.getDepartmentById(id);
    if (!department) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '部门不存在' }
      });
    }

    res.json({ success: true, data: department });
  } catch (error) {
    next(error);
  }
});

// 创建部门
router.post('/departments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = getCurrentUser(req);
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: '未登录' }
      });
    }

    const id = await orgService.createDepartment(req.body, currentUser);
    res.status(201).json({ success: true, data: { id } });
  } catch (error) {
    next(error);
  }
});

// 更新部门
router.put('/departments/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = getCurrentUser(req);
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: '未登录' }
      });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new ValidationError('无效的部门ID');
    }

    const updated = await orgService.updateDepartment(id, req.body, currentUser);
    res.json({ success: true, data: { updated } });
  } catch (error) {
    next(error);
  }
});

// 删除部门
router.delete('/departments/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = getCurrentUser(req);
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: '未登录' }
      });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new ValidationError('无效的部门ID');
    }

    await orgService.deleteDepartment(id, currentUser);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ========== 成员管理 ==========

// 获取成员列表
router.get('/members', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const options = {
      department_id: req.query.department_id ? parseInt(req.query.department_id as string) : undefined,
      is_active: req.query.is_active === 'true' ? true : req.query.is_active === 'false' ? false : undefined,
      search: req.query.search as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : 20,
    };

    const result = await orgService.getMembers(options);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// 获取成员详情
router.get('/members/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new ValidationError('无效的成员ID');
    }

    const member = await orgService.getMemberById(id);
    if (!member) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '成员不存在' }
      });
    }

    res.json({ success: true, data: member });
  } catch (error) {
    next(error);
  }
});

// 获取部门成员
router.get('/departments/:id/members', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new ValidationError('无效的部门ID');
    }

    const members = await orgService.getDepartmentMembers(id);
    res.json({ success: true, data: members });
  } catch (error) {
    next(error);
  }
});

// ========== 能力模型管理 ==========

// 获取能力模型列表
router.get('/capability-models', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const models = await orgService.getCapabilityModels();
    res.json({ success: true, data: models });
  } catch (error) {
    next(error);
  }
});

// 获取能力模型详情
router.get('/capability-models/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const model = await orgService.getCapabilityModelById(req.params.id);
    if (!model) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '能力模型不存在' }
      });
    }

    res.json({ success: true, data: model });
  } catch (error) {
    next(error);
  }
});

// 创建能力模型
router.post('/capability-models', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = getCurrentUser(req);
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: '未登录' }
      });
    }

    const id = await orgService.createCapabilityModel(req.body, currentUser);
    res.status(201).json({ success: true, data: { id } });
  } catch (error) {
    next(error);
  }
});

// 更新能力模型
router.put('/capability-models/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = getCurrentUser(req);
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: '未登录' }
      });
    }

    const updated = await orgService.updateCapabilityModel(req.params.id, req.body, currentUser);
    res.json({ success: true, data: { updated } });
  } catch (error) {
    next(error);
  }
});

// 删除能力模型
router.delete('/capability-models/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = getCurrentUser(req);
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: '未登录' }
      });
    }

    await orgService.deleteCapabilityModel(req.params.id, currentUser);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ========== 成员能力评定 ==========

// 获取成员能力列表
router.get('/members/:id/capabilities', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      throw new ValidationError('无效的成员ID');
    }

    const capabilities = await orgService.getMemberCapabilities(userId);
    res.json({ success: true, data: capabilities });
  } catch (error) {
    next(error);
  }
});

// 添加成员能力评定
router.post('/members/:id/capabilities', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = getCurrentUser(req);
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: '未登录' }
      });
    }

    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      throw new ValidationError('无效的成员ID');
    }

    const id = await orgService.addMemberCapability(userId, req.body, currentUser.id);
    res.status(201).json({ success: true, data: { id } });
  } catch (error) {
    next(error);
  }
});

// 更新成员能力评定
router.put('/members/:id/capabilities/:capId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = getCurrentUser(req);
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: '未登录' }
      });
    }

    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      throw new ValidationError('无效的成员ID');
    }

    const updated = await orgService.updateMemberCapability(userId, req.params.capId, req.body, currentUser.id);
    res.json({ success: true, data: { updated } });
  } catch (error) {
    next(error);
  }
});

// 删除成员能力评定
router.delete('/members/:id/capabilities/:capId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      throw new ValidationError('无效的成员ID');
    }

    await orgService.deleteMemberCapability(userId, req.params.capId);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ========== 智能推荐 ==========

// 获取任务负责人推荐
router.get('/recommend-assignee', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskType = req.query.task_type as string;
    if (!taskType) {
      throw new ValidationError('任务类型不能为空');
    }

    const recommendations = await orgService.getAssigneeRecommendations(taskType);
    res.json({ success: true, data: recommendations });
  } catch (error) {
    next(error);
  }
});

export default router;
