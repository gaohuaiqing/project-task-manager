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
    // 禁用缓存，确保前端获取最新数据
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

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

    const result = await orgService.deleteDepartment(id, currentUser);
    res.json({
      success: true,
      data: {
        message: `已删除 ${result.deletedDepartments} 个部门，${result.deletedMembers} 名成员`,
        deletedDepartments: result.deletedDepartments,
        deletedMembers: result.deletedMembers
      }
    });
  } catch (error) {
    next(error);
  }
});

// ========== 成员管理 ==========

// 获取成员列表
router.get('/members', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 禁用缓存，确保前端获取最新数据
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    // 获取当前用户（用于过滤内置用户）
    const currentUser = getCurrentUser(req);

    // 处理 status/is_active 参数
    let isActiveValue: boolean | undefined = undefined;
    if (req.query.status === 'active') {
      isActiveValue = true;
    } else if (req.query.status === 'inactive') {
      isActiveValue = false;
    } else if (req.query.is_active === 'true') {
      isActiveValue = true;
    } else if (req.query.is_active === 'false') {
      isActiveValue = false;
    }

    const options = {
      department_id: req.query.department_id ? parseInt(req.query.department_id as string) : undefined,
      is_active: isActiveValue,
      search: req.query.search as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : 20,
      // 只有 admin 能看到内置用户
      excludeBuiltin: currentUser ? currentUser.role !== 'admin' : true,
    };

    const result = await orgService.getMembers(options);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// 获取成员删除检查数据（必须在 /members/:id 之前注册）
router.get('/members/:id/deletion-check', async (req: Request, res: Response, next: NextFunction) => {
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
      throw new ValidationError('无效的成员ID');
    }

    const checkResult = await orgService.getMemberDeletionCheck(id, currentUser);
    res.json({ success: true, data: checkResult });
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

// 创建成员（自动创建用户账户）
router.post('/members', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = getCurrentUser(req);
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: '未登录' }
      });
    }

    const result = await orgService.createMember(req.body, currentUser);
    res.status(201).json({
      success: true,
      data: {
        id: result.id,
        initialPassword: result.initialPassword,
        message: '成员创建成功，请保存初始密码'
      }
    });
  } catch (error) {
    next(error);
  }
});

// 更新成员信息
router.put('/members/:id', async (req: Request, res: Response, next: NextFunction) => {
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
      throw new ValidationError('无效的成员ID');
    }

    const updated = await orgService.updateMember(id, req.body, currentUser);
    res.json({ success: true, data: { updated } });
  } catch (error) {
    next(error);
  }
});

// 软删除成员（停用）
router.put('/members/:id/deactivate', async (req: Request, res: Response, next: NextFunction) => {
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
      throw new ValidationError('无效的成员ID');
    }

    await orgService.deleteMember(id, currentUser);
    res.json({ success: true, message: '成员已停用' });
  } catch (error) {
    next(error);
  }
});

// 删除成员（支持软删除和物理删除）
router.delete('/members/:id', async (req: Request, res: Response, next: NextFunction) => {
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
      throw new ValidationError('无效的成员ID');
    }

    // 检查是否是物理删除
    const permanent = req.query.permanent === 'true';

    if (permanent) {
      await orgService.hardDeleteMember(id, currentUser);
      res.json({ success: true, message: '成员已永久删除' });
    } else {
      await orgService.deleteMember(id, currentUser);
      res.json({ success: true, message: '成员已停用' });
    }
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

// ========== 能力矩阵 ==========

// 获取能力矩阵
router.post('/capabilities/matrix', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params = req.body || {};
    const matrix = await orgService.getCapabilityMatrix(params);
    res.json({ success: true, data: matrix });
  } catch (error) {
    next(error);
  }
});

// 提交能力评估
router.post('/capabilities/assess', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = getCurrentUser(req);
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: '未登录' }
      });
    }

    const id = await orgService.submitCapabilityAssessment(req.body, currentUser.id);
    res.status(201).json({ success: true, data: { id } });
  } catch (error) {
    next(error);
  }
});

// 获取成员能力历史
router.get('/members/:id/capabilities/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      throw new ValidationError('无效的成员ID');
    }

    const history = await orgService.getCapabilityHistory(userId);
    res.json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
});

// ========== 智能分配 ==========

// 获取分配建议
router.post('/assignment/suggest', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { taskId, dimensions, minScore } = req.body;
    if (!taskId) {
      throw new ValidationError('任务ID不能为空');
    }

    const suggestions = await orgService.getAssignmentSuggestions(taskId, dimensions, minScore);
    res.json({ success: true, data: suggestions });
  } catch (error) {
    next(error);
  }
});

// 批量获取分配建议
router.post('/assignment/suggest-batch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { taskIds } = req.body;
    if (!taskIds || !Array.isArray(taskIds)) {
      throw new ValidationError('任务ID列表不能为空');
    }

    const suggestions = await orgService.batchAssignmentSuggestions(taskIds);
    res.json({ success: true, data: suggestions });
  } catch (error) {
    next(error);
  }
});

// ========== 能力发展计划 ==========

// 获取成员发展计划
router.get('/members/:id/development-plans', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      throw new ValidationError('无效的成员ID');
    }

    const plans = await orgService.getDevelopmentPlans(userId);
    res.json({ success: true, data: plans });
  } catch (error) {
    next(error);
  }
});

// 创建发展计划
router.post('/development-plans', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = getCurrentUser(req);
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: '未登录' }
      });
    }

    const id = await orgService.createDevelopmentPlan(req.body, currentUser.id);
    res.status(201).json({ success: true, data: { id } });
  } catch (error) {
    next(error);
  }
});

// ========== 任务类型-能力模型映射 ==========

// 获取所有任务类型映射
router.get('/task-type-mappings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const mappings = await orgService.getTaskTypeMappings();
    res.json({ success: true, data: mappings });
  } catch (error) {
    next(error);
  }
});

// 获取单个任务类型映射
router.get('/task-type-mappings/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new ValidationError('无效的映射ID');
    }

    const mapping = await orgService.getTaskTypeMappingById(id);
    if (!mapping) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '任务类型映射不存在' }
      });
    }

    res.json({ success: true, data: mapping });
  } catch (error) {
    next(error);
  }
});

// 创建任务类型映射
router.post('/task-type-mappings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = getCurrentUser(req);
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: '未登录' }
      });
    }

    const id = await orgService.createTaskTypeMapping(req.body, currentUser);
    res.status(201).json({ success: true, data: { id } });
  } catch (error) {
    next(error);
  }
});

// 更新任务类型映射
router.put('/task-type-mappings/:id', async (req: Request, res: Response, next: NextFunction) => {
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
      throw new ValidationError('无效的映射ID');
    }

    const updated = await orgService.updateTaskTypeMapping(id, req.body, currentUser);
    res.json({ success: true, data: { updated } });
  } catch (error) {
    next(error);
  }
});

// 删除任务类型映射
router.delete('/task-type-mappings/:id', async (req: Request, res: Response, next: NextFunction) => {
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
      throw new ValidationError('无效的映射ID');
    }

    await orgService.deleteTaskTypeMapping(id, currentUser);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ========== 导入导出功能 ==========

import multer from 'multer';
import { ImportExportService } from './import-export';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB 限制
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error('只支持 Excel 文件 (.xlsx, .xls)'));
    }
  }
});

const importExportService = new ImportExportService();

// 下载导入模板
router.get('/export/template/organization', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const buffer = importExportService.generateTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=organization_template.xlsx');
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

// 导出组织架构
router.get('/export/organization', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const buffer = await importExportService.exportOrganization();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=organization_${new Date().toISOString().split('T')[0]}.xlsx`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

// 导入组织架构
router.post('/import/organization', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = getCurrentUser(req);
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: '未登录' }
      });
    }

    if (!req.file) {
      throw new ValidationError('请上传文件');
    }

    const result = await importExportService.importOrganization(req.file.buffer, currentUser);
    const parts = [];
    if (result.departments > 0) parts.push(`创建 ${result.departments} 个部门`);
    if (result.members > 0) parts.push(`新增 ${result.members} 个成员`);
    if (result.updatedMembers > 0) parts.push(`更新 ${result.updatedMembers} 个成员部门`);
    res.json({
      success: true,
      data: {
        message: parts.length > 0 ? `导入完成：${parts.join('，')}` : '导入完成：无新增数据',
        departments: result.departments,
        members: result.members,
        updatedMembers: result.updatedMembers,
        errors: result.errors,
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
