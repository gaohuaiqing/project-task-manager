/**
 * 项目扩展 API 路由
 *
 * 补充项目相关的扩展功能：
 * - 项目成员管理
 * - 项目里程碑管理
 * - 项目进度自动计算
 * - 项目详情（含关联数据）
 *
 * @module routes/projectExtendedRoutes
 */

import express from 'express';
import { databaseService } from '../services/DatabaseService.js';
import { auditLogService } from '../services/AuditLogService.js';
import { projectMemberService } from '../services/ProjectMemberService.js';

const router = express.Router();

// ==================== 中间件 ====================

let sessionManager: any;

export function setSessionManager(sm: any) {
  sessionManager = sm;
}

/**
 * 会话验证中间件
 *
 * 性能优化：
 * - 直接从会话对象获取 userId，避免每次请求都查询数据库
 */
async function validateSession(req: any, res: any, next: any) {
  const sessionId = req.headers['x-session-id'] || req.body.sessionId;

  if (!sessionId) {
    return res.status(401).json({ success: false, message: '缺少会话ID' });
  }

  try {
    const session = await sessionManager.getSession(sessionId);
    if (!session) {
      return res.status(401).json({ success: false, message: '会话无效或已过期' });
    }
    req.session = session;

    // 性能优化：直接从会话对象获取 userId
    if (session.userId) {
      req.userId = session.userId;
    } else {
      console.warn('[validateSession] 会话缺少 userId，降级查询数据库');
      req.userId = await getUserIdByUsername(session.username);
    }

    next();
  } catch (error) {
    console.error('[API] 会话验证失败:', error);
    res.status(500).json({ success: false, message: '会话验证失败' });
  }
}

async function getUserIdByUsername(username: string): Promise<number> {
  const users = await databaseService.query(
    'SELECT id FROM users WHERE username = ?',
    [username]
  ) as any[];
  return users[0]?.id || 0;
}

function broadcastDataUpdate(dataType: string, operation: 'create' | 'update' | 'delete', record: any) {
  if ((global as any).broadcastToAll) {
    (global as any).broadcastToAll({
      type: 'data_updated',
      data: { dataType, operation, record }
    });
  }
}

// ==================== 项目详情 API ====================

/**
 * GET /api/projects/:id/detail
 * 获取项目完整详情（包含成员和里程碑）
 */
router.get('/projects/:id/detail', async (req: any, res: any) => {
  const { id } = req.params;

  try {
    // 获取项目基本信息
    const projects = await databaseService.query(
      `SELECT p.*, u.name as created_by_name
       FROM projects p
       LEFT JOIN users u ON p.created_by = u.id
       WHERE p.id = ? AND p.deleted_at IS NULL`,
      [id]
    ) as any[];

    if (!projects || projects.length === 0) {
      return res.status(404).json({ success: false, message: '项目不存在' });
    }

    const project = projects[0];

    // 获取项目成员
    const members = await projectMemberService.getProjectMembers(id);

    // 获取项目里程碑 (表已删除，返回空数组)
    const milestones: any[] = [];

    // 组装完整详情
    const detail = {
      ...project,
      // 确保字段名使用驼峰命名
      projectType: project.project_type,
      plannedStartDate: project.planned_start_date,
      plannedEndDate: project.planned_end_date,
      actualStartDate: project.actual_start_date,
      actualEndDate: project.actual_end_date,
      taskCount: project.task_count || 0,
      completedTaskCount: project.completed_task_count || 0,
      createdBy: project.created_by,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
      deletedAt: project.deleted_at,
      // 将 member_ids 字符串转换为数组（如果存在）
      memberIds: project.member_ids
        ? (typeof project.member_ids === 'string'
            ? project.member_ids.split(',').map((id: string) => parseInt(id.trim()))
            : project.member_ids)
        : members.map(m => m.user_id),
      // 项目成员列表
      members: members.map(m => ({
        id: m.id,
        projectId: m.project_id,
        memberId: m.user_id,
        memberName: m.name,
        role: m.role,
        joinedAt: m.created_at
      })),
      // 项目里程碑列表
      milestones: []
    };

    res.json({ success: true, data: detail });
  } catch (error) {
    console.error('[API] 获取项目详情失败:', error);
    res.status(500).json({ success: false, message: '获取项目详情失败' });
  }
});

// ==================== 项目成员管理 API ====================

/**
 * GET /api/projects/:id/members
 * 获取项目成员列表
 */
router.get('/projects/:id/members', async (req: any, res: any) => {
  const { id } = req.params;

  try {
    const members = await projectMemberService.getProjectMembers(id);
    res.json({ success: true, data: members });
  } catch (error) {
    console.error('[API] 获取项目成员失败:', error);
    res.status(500).json({ success: false, message: '获取项目成员失败' });
  }
});

/**
 * POST /api/projects/:id/members
 * 添加项目成员
 */
router.post('/projects/:id/members', validateSession, async (req: any, res: any) => {
  const { id } = req.params;
  const { userId: targetUserId } = req.body;
  const operatorId = req.userId;

  if (!targetUserId) {
    return res.status(400).json({ success: false, message: '用户ID不能为空' });
  }

  try {
    // 检查项目是否存在
    const project = await databaseService.query(
      'SELECT id FROM projects WHERE id = ? AND deleted_at IS NULL',
      [id]
    ) as any[];

    if (!project || project.length === 0) {
      return res.status(404).json({ success: false, message: '项目不存在' });
    }

    // 使用 ProjectMemberService 添加成员
    const newMember = await projectMemberService.addMemberToProject(id, targetUserId, operatorId);

    broadcastDataUpdate('project_members', 'create', { projectId: id, userId: targetUserId });

    res.json({ success: true, data: newMember });
  } catch (error: any) {
    console.error('[API] 添加项目成员失败:', error);
    if (error.message === '该用户已是项目成员' || error.message === '用户不存在') {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: '添加项目成员失败' });
  }
});

/**
 * PUT /api/projects/:id/members/:memberId
 * 更新项目成员角色
 */
router.put('/projects/:id/members/:userId', validateSession, async (req: any, res: any) => {
  const { id, userId } = req.params;
  const { role } = req.body;

  try {
    // 获取当前成员信息
    const members = await projectMemberService.getProjectMembers(id);
    const member = members.find(m => m.user_id === parseInt(userId));

    if (!member) {
      return res.status(404).json({ success: false, message: '成员不存在' });
    }

    // 验证角色值
    const validRoles = ['owner', 'manager', 'member', 'viewer'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: '无效的角色值' });
    }

    // 更新成员角色
    await databaseService.query(
      `UPDATE project_members
       SET role = ?, updated_at = NOW()
       WHERE project_id = ? AND user_id = ? AND deleted_at IS NULL`,
      [role || 'member', id, userId]
    );

    // 获取更新后的成员
    const updatedMembers = await projectMemberService.getProjectMembers(id);
    const updatedMember = updatedMembers.find(m => m.user_id === parseInt(userId));

    broadcastDataUpdate('project_members', 'update', { projectId: id, userId });

    res.json({ success: true, data: updatedMember });
  } catch (error) {
    console.error('[API] 更新项目成员失败:', error);
    res.status(500).json({ success: false, message: '更新项目成员失败' });
  }
});

/**
 * DELETE /api/projects/:id/members/:memberId
 * 移除项目成员（软删除）
 */
router.delete('/projects/:id/members/:userId', validateSession, async (req: any, res: any) => {
  const { id, userId } = req.params;
  const operatorId = req.userId;

  try {
    await projectMemberService.removeMemberFromProject(id, parseInt(userId), operatorId);

    broadcastDataUpdate('project_members', 'delete', { projectId: id, userId });

    res.json({ success: true });
  } catch (error) {
    console.error('[API] 移除项目成员失败:', error);
    res.status(500).json({ success: false, message: '移除项目成员失败' });
  }
});

// ==================== 项目里程碑管理 API ====================
// 注意: project_milestones 表已于 2026-02-24 删除
// 以下API端点返回空数据，如需恢复请先重建表结构

/**
 * GET /api/projects/:id/milestones
 * 获取项目里程碑列表 (已禁用)
 */
router.get('/projects/:id/milestones', async (req: any, res: any) => {
  res.json({ success: true, data: [] });
});

/**
 * POST /api/projects/:id/milestones
 * 创建项目里程碑 (已禁用)
 */
router.post('/projects/:id/milestones', validateSession, async (req: any, res: any) => {
  // 返回成功但不实际创建数据，保持前后端接口一致性
  res.json({ success: true, data: null, message: '里程碑功能暂不可用' });
});

/**
 * PUT /api/projects/:id/milestones/:milestoneId
 * 更新项目里程碑 (已禁用)
 */
router.put('/projects/:id/milestones/:milestoneId', validateSession, async (req: any, res: any) => {
  res.json({ success: true, data: null, message: '里程碑功能暂不可用' });
});

/**
 * DELETE /api/projects/:id/milestones/:milestoneId
 * 删除项目里程碑 (已禁用)
 */
router.delete('/projects/:id/milestones/:milestoneId', validateSession, async (req: any, res: any) => {
  res.json({ success: true, message: '里程碑功能暂不可用' });
});

// ==================== 项目进度管理 API ====================

/**
 * PUT /api/projects/:id/progress
 * 自动计算并更新项目进度
 * 基于关联的 WBS 任务完成情况
 */
router.put('/projects/:id/progress', validateSession, async (req: any, res: any) => {
  const { id } = req.params;
  const userId = req.userId;

  try {
    // 计算项目进度
    const taskStats = await databaseService.query(
      `SELECT
         COUNT(*) as total_tasks,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks
       FROM wbs_tasks
       WHERE project_id = ? AND deleted_at IS NULL`,
      [id]
    ) as any[];

    const stats = taskStats[0];
    const totalTasks = stats.total_tasks || 0;
    const completedTasks = stats.completed_tasks || 0;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // 更新项目进度
    await databaseService.query(
      `UPDATE projects
       SET progress = ?, task_count = ?, completed_task_count = ?, updated_at = NOW()
       WHERE id = ?`,
      [progress, totalTasks, completedTasks, id]
    );

    // 获取更新后的项目
    const project = await databaseService.query(
      'SELECT * FROM projects WHERE id = ?',
      [id]
    ) as any[];

    broadcastDataUpdate('projects', 'update', { ...project[0], progress });

    res.json({ success: true, data: project[0] });
  } catch (error) {
    console.error('[API] 更新项目进度失败:', error);
    res.status(500).json({ success: false, message: '更新项目进度失败' });
  }
});

/**
 * PUT /api/projects/:id/progress/manual
 * 手动设置项目进度
 */
router.put('/projects/:id/progress/manual', validateSession, async (req: any, res: any) => {
  const { id } = req.params;
  const { progress } = req.body;

  if (progress === undefined || progress < 0 || progress > 100) {
    return res.status(400).json({ success: false, message: '进度值必须在 0-100 之间' });
  }

  try {
    await databaseService.query(
      `UPDATE projects
       SET progress = ?, updated_at = NOW()
       WHERE id = ?`,
      [progress, id]
    );

    const project = await databaseService.query(
      'SELECT * FROM projects WHERE id = ?',
      [id]
    ) as any[];

    broadcastDataUpdate('projects', 'update', { ...project[0], progress });

    res.json({ success: true, data: project[0] });
  } catch (error) {
    console.error('[API] 设置项目进度失败:', error);
    res.status(500).json({ success: false, message: '设置项目进度失败' });
  }
});

export default router;
