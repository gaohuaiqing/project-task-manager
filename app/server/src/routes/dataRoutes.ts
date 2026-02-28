/**
 * RESTful API 路由
 *
 * 设计原则：
 * 1. 所有数据操作通过MySQL
 * 2. 支持乐观锁版本控制
 * 3. 记录操作审计日志
 * 4. 通过WebSocket广播数据变更
 */

import express from 'express';
import { databaseService } from '../services/DatabaseService.js';
import { SessionManager } from '../services/SessionManager.js';
import type { SessionManager as SessionManagerType } from '../services/SessionManager.js';
import { validateTaskHierarchy } from '../services/WbsTaskHierarchyOptimized.js';
import { softDelete as softDeleteRecord } from '../services/initSoftDelete.js';
import {
  createProjectWithVersion,
  updateProjectWithVersion,
  deleteProjectWithVersion,
  createTaskWithCounter,
  deleteTaskWithCounter
} from '../services/AtomicTransaction.js';
import { systemLogger } from '../services/AsyncSystemLogger.js';
import { auditLogService } from '../services/AuditLogService.js';
import { taskApprovalService } from '../services/TaskApprovalService.js';
import { projectMemberService } from '../services/ProjectMemberService.js';
import { taskAssignmentService } from '../services/TaskAssignmentService.js';
import {
  requireTaskPermission,
  requireCreateTaskPermission,
  requireApprovalPermission,
  TaskOperation
} from '../middleware/taskPermissionMiddleware.js';
import { calculateTaskStatus } from '../services/TaskStatusCalculator.js';

const router = express.Router();

// SessionManager 实例将由 index.ts 注入
let sessionManager: SessionManagerType;

/**
 * 设置 SessionManager 实例（由 index.ts 调用）
 */
export function setSessionManager(sm: SessionManagerType) {
  sessionManager = sm;
}

// ==================== 中间件 ====================

/**
 * 会话验证中间件
 */
async function validateSession(req: any, res: any, next: any) {
  const sessionId = req.headers['x-session-id'] || req.body.sessionId;

  // 调试日志
  if (!sessionManager) {
    console.error('[validateSession] sessionManager 未设置！');
    return res.status(500).json({ success: false, message: '服务器配置错误' });
  }

  if (!sessionId) {
    return res.status(401).json({ success: false, message: '缺少会话ID' });
  }

  try {
    const session = await sessionManager.getSession(sessionId);
    if (!session) {
      console.log(`[validateSession] 会话验证失败: ${sessionId}`);
      return res.status(401).json({ success: false, message: '会话无效或已过期' });
    }

    req.session = session;
    req.userId = await getUserIdByUsername(session.username);
    next();
  } catch (error) {
    console.error('[API] 会话验证失败:', error);
    res.status(500).json({ success: false, message: '会话验证失败' });
  }
}

/**
 * 获取用户ID
 */
async function getUserIdByUsername(username: string): Promise<number> {
  const users = await databaseService.query(
    'SELECT id FROM users WHERE username = ?',
    [username]
  ) as any[];

  return users[0]?.id || 0;
}

/**
 * 获取用户名（用于审计日志）
 */
async function getUsernameById(userId: number): Promise<string> {
  const users = await databaseService.query(
    'SELECT username FROM users WHERE id = ?',
    [userId]
  ) as any[];

  return users[0]?.username || 'unknown';
}

/**
 * 广播数据变更到所有客户端
 */
function broadcastDataUpdate(dataType: string, operation: 'create' | 'update' | 'delete', record: any) {
  // 这里会被注入broadcastToAll函数
  if ((global as any).broadcastToAll) {
    (global as any).broadcastToAll({
      type: 'data_updated',
      data: { dataType, operation, record }
    });
  }
}

/**
 * 记录 API 错误日志
 */
async function logApiError(
  action: string,
  error: any,
  req?: any,
  additionalDetails?: any
) {
  const details = {
    error: error.message || String(error),
    stack: error.stack,
    ...(additionalDetails || {})
  };

  await systemLogger.error(
    `[API] ${action} 失败`,
    details,
    req?.userId,
    req?.session?.username
  );
}

/**
 * 记录用户操作日志
 */
async function logUserAction(
  action: string,
  details: any,
  req?: any
) {
  await systemLogger.logUserAction(
    action,
    details,
    req?.userId,
    req?.session?.username,
    req?.sessionId
  );
}

// ==================== 项目 API ====================

/**
 * GET /api/projects/clear-cache
 * 清除项目缓存（调试用）
 */
router.get('/projects/clear-cache', (req: any, res: any) => {
  res.json({ success: true, message: '请在浏览器控制台执行: mySqlDataService.clearCache()' });
});

/**
 * GET /api/projects
 * 获取所有项目列表
 */
router.get('/projects', async (req: any, res: any) => {
  try {
    const rows = await databaseService.query(`
      SELECT
        p.id,
        p.code,
        p.name,
        p.description,
        p.status,
        p.project_type as projectType,
        p.planned_start_date as plannedStartDate,
        p.planned_end_date as plannedEndDate,
        p.progress,
        p.task_count as taskCount,
        p.completed_task_count as completedTaskCount,
        p.created_at as createdAt,
        p.updated_at as updatedAt,
        p.created_by as createdBy,
        u.name as created_by_name
      FROM projects p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.deleted_at IS NULL
      ORDER BY p.created_at DESC
    `);

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('[API] 获取项目列表失败:', error);
    res.status(500).json({ success: false, message: '获取项目列表失败' });
  }
});

/**
 * GET /api/projects/:id
 * 获取单个项目详情
 */
router.get('/projects/:id', async (req: any, res: any) => {
  const { id } = req.params;

  try {
    const rows = await databaseService.query(
      `SELECT
        p.id,
        p.code,
        p.name,
        p.description,
        p.status,
        p.project_type as projectType,
        p.planned_start_date as plannedStartDate,
        p.planned_end_date as plannedEndDate,
        p.progress,
        p.task_count as taskCount,
        p.completed_task_count as completedTaskCount,
        p.created_at as createdAt,
        p.updated_at as updatedAt,
        p.created_by as createdBy,
        u.name as created_by_name
       FROM projects p
       LEFT JOIN users u ON p.created_by = u.id
       WHERE p.id = ?`,
      [id]
    ) as any[];

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: '项目不存在' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('[API] 获取项目详情失败:', error);
    res.status(500).json({ success: false, message: '获取项目详情失败' });
  }
});

/**
 * POST /api/projects
 * 创建项目
 */
router.post('/projects', validateSession, async (req: any, res: any) => {
  // 前端发送 camelCase，需要转换为 snake_case
  const {
    code,
    name,
    description,
    projectType,          // camelCase
    plannedStartDate,     // camelCase
    plannedEndDate,       // camelCase
    memberIds,
    milestones
  } = req.body;
  const createdBy = req.userId;

  if (!code || !name) {
    return res.status(400).json({ success: false, message: '项目编码和名称不能为空' });
  }

  try {
    // 检查项目编码是否已存在
    const existing = await databaseService.query(
      'SELECT id FROM projects WHERE code = ? AND deleted_at IS NULL',
      [code]
    );

    if (existing && existing.length > 0) {
      return res.status(400).json({ success: false, message: '项目编码已存在' });
    }

    // 使用原子事务创建项目（转换为 snake_case）
    const result = await createProjectWithVersion({
      code,
      name,
      description,
      project_type: projectType || 'other',         // camelCase → snake_case
      planned_start_date: plannedStartDate || null,  // camelCase → snake_case
      planned_end_date: plannedEndDate || null,      // camelCase → snake_case
      created_by: createdBy
    });

    if (!result.success) {
      await logApiError('创建项目', new Error(result.error || '未知错误'), req, { projectCode: code });
      return res.status(500).json({ success: false, message: result.error || '创建项目失败' });
    }

    // 广播变更
    broadcastDataUpdate('projects', 'create', result.data);

    // 自动添加创建者为项目成员
    try {
      await projectMemberService.addCreatorAsMember(result.data.id, createdBy);
    } catch (memberError) {
      console.error('[API] 添加创建者为项目成员失败:', memberError);
    }

    // 记录用户操作到系统日志
    await logUserAction('create_project', {
      projectId: result.data.id,
      projectCode: code,
      projectName: name
    }, req);

    // 记录审计日志
    try {
      const username = req.session?.username || (await getUsernameById(createdBy));
      await auditLogService.logProjectCreate(
        result.data.id,
        code,
        name,
        createdBy,
        username,
        req.session?.role || 'unknown',
        { description, project_type, planned_start_date, planned_end_date }
      );
    } catch (auditError) {
      console.error('[API] 记录项目创建审计日志失败:', auditError);
    }

    res.json({ success: true, data: result.data });
  } catch (error: any) {
    await logApiError('创建项目', error, req, { projectCode: code, projectName: name });
    res.status(500).json({ success: false, message: '创建项目失败', error: error.message });
  }
});

/**
 * PUT /api/projects/:id
 * 更新项目（带版本控制）
 */
router.put('/projects/:id', validateSession, async (req: any, res: any) => {
  const { id } = req.params;
  // 前端发送 camelCase，需要处理所有可能的字段
  const {
    name,
    description,
    status,
    progress,
    expectedVersion,
    projectType,          // camelCase
    plannedStartDate,     // camelCase
    plannedEndDate,       // camelCase
  } = req.body;
  const userId = req.userId;

  try {
    // 获取更新前的数据（用于审计日志）
    const beforeData = await databaseService.query(
      'SELECT * FROM projects WHERE id = ? AND deleted_at IS NULL',
      [id]
    ) as any[];
    const beforeProject = beforeData?.[0];

    // 使用原子事务更新项目
    const result = await updateProjectWithVersion(
      parseInt(id),
      { name, description, status, progress, expectedVersion },
      userId
    );

    if (!result.success) {
      if (result.conflict) {
        await logUserAction('update_project_conflict', {
          projectId: id,
          expectedVersion,
          currentData: result.data
        }, req);
        return res.status(409).json({
          success: false,
          message: '版本冲突，数据已被其他用户修改',
          currentVersion: result.data?.version,
          data: result.data
        });
      }
      await logApiError('更新项目', new Error(result.error || '未知错误'), req, { projectId: id });
      return res.status(500).json({ success: false, message: result.error || '更新项目失败' });
    }

    // 广播变更
    broadcastDataUpdate('projects', 'update', result.data);

    // 记录用户操作到系统日志
    await logUserAction('update_project', {
      projectId: id,
      changes: { name, description, status, progress }
    }, req);

    // 记录审计日志
    try {
      const username = req.session?.username || (await getUsernameById(userId));
      const afterProject = result.data;
      await auditLogService.logProjectUpdate(
        parseInt(id),
        beforeProject?.code || id,
        beforeProject?.name || `项目 ${id}`,
        {
          name: beforeProject?.name,
          description: beforeProject?.description,
          status: beforeProject?.status,
          progress: beforeProject?.progress
        },
        {
          name: afterProject?.name,
          description: afterProject?.description,
          status: afterProject?.status,
          progress: afterProject?.progress
        },
        userId,
        username,
        req.session?.role || 'unknown'
      );
    } catch (auditError) {
      console.error('[API] 记录项目更新审计日志失败:', auditError);
    }

    res.json({ success: true, data: result.data });
  } catch (error) {
    await logApiError('更新项目', error, req, { projectId: id });
    res.status(500).json({ success: false, message: '更新项目失败' });
  }
});

/**
 * PUT /api/projects/:id/full
 * 完整更新项目（包含成员和里程碑同步）
 */
router.put('/projects/:id/full', validateSession, async (req: any, res: any) => {
  const { id } = req.params;
  const {
    code,
    name,
    description,
    projectType,
    plannedStartDate,
    plannedEndDate,
    memberIds,
    milestones
  } = req.body;
  const userId = req.userId;

  try {
    // 获取更新前的数据（用于审计日志）
    const beforeData = await databaseService.query(
      'SELECT * FROM projects WHERE id = ? AND deleted_at IS NULL',
      [id]
    ) as any[];
    const beforeProject = beforeData?.[0];

    if (!beforeProject) {
      return res.status(404).json({ success: false, message: '项目不存在' });
    }

    // 更新项目基本信息
    const updateResult = await updateProjectWithVersion(
      parseInt(id),
      {
        name,
        description,
        projectType,
        plannedStartDate,
        plannedEndDate
      },
      userId
    );

    if (!updateResult.success) {
      return res.status(500).json({ success: false, message: updateResult.error || '更新项目失败' });
    }

    // 同步项目成员（如果提供了 memberIds）
    if (memberIds && Array.isArray(memberIds)) {
      // 先删除现有成员
      await databaseService.query(
        'UPDATE project_members SET deleted_at = NOW() WHERE project_id = ?',
        [id]
      );

      // 添加新成员
      for (const memberId of memberIds) {
        try {
          await projectMemberService.addMemberToProject(parseInt(id), memberId, userId);
        } catch (memberError) {
          console.error('[API] 添加项目成员失败:', memberError);
        }
      }
    }

    // 里程碑功能已禁用，跳过

    // 获取更新后的完整项目数据
    const updatedProject = await databaseService.query(
      `SELECT
        p.id,
        p.code,
        p.name,
        p.description,
        p.status,
        p.project_type as projectType,
        p.planned_start_date as plannedStartDate,
        p.planned_end_date as plannedEndDate,
        p.progress,
        p.task_count as taskCount,
        p.completed_task_count as completedTaskCount,
        p.created_at as createdAt,
        p.updated_at as updatedAt,
        p.created_by as createdBy,
        u.name as created_by_name
       FROM projects p
       LEFT JOIN users u ON p.created_by = u.id
       WHERE p.id = ?`,
      [id]
    ) as any[];

    // 广播变更
    broadcastDataUpdate('projects', 'update', updatedProject[0]);

    // 记录用户操作
    await logUserAction('update_project_full', {
      projectId: id,
      changes: { name, description, projectType, plannedStartDate, plannedEndDate }
    }, req);

    res.json({ success: true, data: updatedProject[0] });
  } catch (error) {
    await logApiError('完整更新项目', error, req, { projectId: id });
    res.status(500).json({ success: false, message: '更新项目失败' });
  }
});

/**
 * DELETE /api/projects/:id
 * 删除项目（软删除）
 */
router.delete('/projects/:id', validateSession, async (req: any, res: any) => {
  const { id } = req.params;
  const userId = req.userId;

  try {
    // 使用原子事务删除项目
    const result = await deleteProjectWithVersion(parseInt(id), userId);

    if (!result.success) {
      await logApiError('删除项目', new Error(result.error || '未知错误'), req, { projectId: id });
      return res.status(500).json({ success: false, message: result.error || '删除项目失败' });
    }

    // 广播变更
    broadcastDataUpdate('projects', 'delete', { id });

    // 记录用户操作
    await logUserAction('delete_project', { projectId: id }, req);

    res.json({ success: true });
  } catch (error) {
    await logApiError('删除项目', error, req, { projectId: id });
    res.status(500).json({ success: false, message: '删除项目失败' });
  }
});

// ==================== 成员 API ====================

/**
 * GET /api/members
 * 获取所有成员列表
 */
router.get('/members', async (req: any, res: any) => {
  try {
    const rows = await databaseService.query(`
      SELECT m.*, u.name as created_by_name
      FROM members m
      LEFT JOIN users u ON m.created_by = u.id
      WHERE m.status = 'active'
      ORDER BY m.department, m.name
    `);

    // 解析JSON字段
    const members = rows.map((row: any) => ({
      ...row,
      skills: row.skills ? JSON.parse(row.skills) : [],
      capabilities: row.capabilities ? JSON.parse(row.capabilities) : {}
    }));

    res.json({ success: true, data: members });
  } catch (error) {
    console.error('[API] 获取成员列表失败:', error);
    res.status(500).json({ success: false, message: '获取成员列表失败' });
  }
});

/**
 * POST /api/members
 * 创建成员
 */
router.post('/members', validateSession, async (req: any, res: any) => {
  const { name, employee_id, department, position, skills, capabilities } = req.body;
  const createdBy = req.userId;

  if (!name) {
    return res.status(400).json({ success: false, message: '成员姓名不能为空' });
  }

  try {
    // 检查员工编号是否已存在
    if (employee_id) {
      const existing = await databaseService.query(
        'SELECT id FROM members WHERE employee_id = ?',
        [employee_id]
      );

      if (existing && existing.length > 0) {
        return res.status(400).json({ success: false, message: '员工编号已存在' });
      }
    }

    const result = await databaseService.query(
      `INSERT INTO members (name, employee_id, department, position, skills, capabilities, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        employee_id,
        department,
        position,
        JSON.stringify(skills || []),
        JSON.stringify(capabilities || {}),
        createdBy
      ]
    );

    const newMember = await databaseService.query('SELECT * FROM members WHERE id = ?', [result.insertId]);

    // 记录版本历史
    await databaseService.recordVersion(
      'member',
      result.insertId,
      1,
      createdBy,
      'create',
      newMember[0],
      '创建成员'
    );

    // 广播变更
    broadcastDataUpdate('members', 'create', newMember[0]);

    res.json({ success: true, data: newMember[0] });
  } catch (error: any) {
    console.error('[API] 创建成员失败:', error);
    res.status(500).json({ success: false, message: '创建成员失败' });
  }
});

/**
 * PUT /api/members/:id
 * 更新成员（带版本控制）
 */
router.put('/members/:id', validateSession, async (req: any, res: any) => {
  const { id } = req.params;
  const { name, employee_id, department, position, skills, capabilities, status, expectedVersion } = req.body;
  const userId = req.userId;

  try {
    // 获取当前成员
    const current = await databaseService.query('SELECT * FROM members WHERE id = ?', [id]);
    if (!current || current.length === 0) {
      return res.status(404).json({ success: false, message: '成员不存在' });
    }

    // 检查版本冲突
    if (expectedVersion !== undefined && current[0].version !== expectedVersion) {
      return res.status(409).json({
        success: false,
        message: '版本冲突，数据已被其他用户修改',
        currentVersion: current[0].version,
        data: current[0]
      });
    }

    // 更新成员
    await databaseService.query(
      `UPDATE members SET
       name = COALESCE(?, name),
       employee_id = COALESCE(?, employee_id),
       department = COALESCE(?, department),
       position = COALESCE(?, position),
       skills = COALESCE(?, skills),
       capabilities = COALESCE(?, capabilities),
       status = COALESCE(?, status),
       version = version + 1,
       updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        name,
        employee_id,
        department,
        position,
        skills ? JSON.stringify(skills) : null,
        capabilities ? JSON.stringify(capabilities) : null,
        status,
        id
      ]
    );

    const updated = await databaseService.query('SELECT * FROM members WHERE id = ?', [id]);
    const newVersion = updated[0].version;

    // 记录版本历史
    await databaseService.recordVersion(
      'member',
      parseInt(id),
      newVersion,
      userId,
      'update',
      { before: current[0], after: updated[0] },
      '更新成员'
    );

    // 广播变更
    broadcastDataUpdate('members', 'update', updated[0]);

    res.json({ success: true, data: updated[0] });
  } catch (error) {
    console.error('[API] 更新成员失败:', error);
    res.status(500).json({ success: false, message: '更新成员失败' });
  }
});

/**
 * DELETE /api/members/:id
 * 删除成员（软删除）
 */
router.delete('/members/:id', validateSession, async (req: any, res: any) => {
  const { id } = req.params;
  const userId = req.userId;

  try {
    const current = await databaseService.query('SELECT * FROM members WHERE id = ? AND deleted_at IS NULL', [id]);
    if (!current || current.length === 0) {
      return res.status(404).json({ success: false, message: '成员不存在' });
    }

    // 使用软删除机制
    await softDeleteRecord('members', parseInt(id), userId);

    // 同时更新状态为 inactive（保持兼容性）
    await databaseService.query(
      `UPDATE members SET status = 'inactive', version = version + 1 WHERE id = ?`,
      [id]
    );

    // 记录版本历史
    await databaseService.recordVersion(
      'member',
      parseInt(id),
      current[0].version + 1,
      userId,
      'delete',
      current[0],
      '删除成员'
    );

    // 广播变更
    broadcastDataUpdate('members', 'delete', { id });

    res.json({ success: true });
  } catch (error) {
    console.error('[API] 删除成员失败:', error);
    res.status(500).json({ success: false, message: '删除成员失败' });
  }
});

// ==================== WBS任务 API ====================

/**
 * GET /api/wbs-tasks
 * 获取WBS任务列表
 */
router.get('/wbs-tasks', async (req: any, res: any) => {
  const { project_id } = req.query;

  try {
    let sql = `
      SELECT t.*,
             p.name as project_name,
             m.name as assignee_name,
             parent.task_name as parent_task_name
      FROM wbs_tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN members m ON t.assignee_id = m.id
      LEFT JOIN wbs_tasks parent ON t.parent_id = parent.id
    `;

    const params: any[] = [];
    if (project_id) {
      sql += ' WHERE t.project_id = ?';
      params.push(project_id);
    }

    sql += ' ORDER BY t.created_at DESC';

    const rows = await databaseService.query(sql, params);

    // 解析JSON字段
    const tasks = rows.map((row: any) => {
      const task = {
        ...row,
        dependencies: row.dependencies ? JSON.parse(row.dependencies) : [],
        tags: row.tags ? JSON.parse(row.tags) : [],
        attachments: row.attachments ? JSON.parse(row.attachments) : []
      };

      // 计算任务状态
      const statusInfo = calculateTaskStatus({
        status: task.status,
        actualStartDate: task.actual_start_date,
        actualEndDate: task.actual_end_date,
        plannedStartDate: task.planned_start_date,
        plannedEndDate: task.planned_end_date
      });

      // 添加计算的状态信息
      return {
        ...task,
        calculatedStatus: statusInfo
      };
    });

    res.json({ success: true, data: tasks });
  } catch (error) {
    console.error('[API] 获取WBS任务列表失败:', error);
    res.status(500).json({ success: false, message: '获取WBS任务列表失败' });
  }
});

/**
 * POST /api/wbs-tasks
 * 创建WBS任务
 */
router.post('/wbs-tasks', validateSession, requireCreateTaskPermission(), async (req: any, res: any) => {
  const {
    project_id,
    parent_id,
    task_code,
    task_name,
    description,
    task_type,
    planned_start_date,
    planned_end_date,
    assignee_id,
    dependencies,
    tags,
    priority
  } = req.body;
  const createdBy = req.userId;

  if (!project_id || !task_code || !task_name) {
    return res.status(400).json({ success: false, message: '项目ID、任务编码和任务名称不能为空' });
  }

  try {
    // 检查任务编码是否已存在
    const existing = await databaseService.query(
      'SELECT id FROM wbs_tasks WHERE project_id = ? AND task_code = ? AND deleted_at IS NULL',
      [project_id, task_code]
    );

    if (existing && existing.length > 0) {
      return res.status(400).json({ success: false, message: '任务编码在该项目中已存在' });
    }

    // 验证任务层级关系（防止循环引用）
    const hierarchyValidation = await validateTaskHierarchy(null, parent_id || null, project_id);
    if (!hierarchyValidation.valid) {
      return res.status(400).json({ success: false, message: hierarchyValidation.reason });
    }

    // 使用原子事务创建任务
    const result = await createTaskWithCounter({
      project_id,
      parent_id: parent_id || null,
      task_code,
      task_name,
      description,
      task_type: task_type || 'task',
      planned_start_date: planned_start_date || null,
      planned_end_date: planned_end_date || null,
      assignee_id: assignee_id || null,
      dependencies,
      tags,
      priority: priority || 1,
      created_by: createdBy
    });

    if (!result.success) {
      await logApiError('创建WBS任务', new Error(result.error || '未知错误'), req, { projectId: project_id, taskCode: task_code });
      return res.status(500).json({ success: false, message: result.error || '创建WBS任务失败' });
    }

    // 广播变更
    broadcastDataUpdate('wbs_tasks', 'create', result.data);

    // 记录用户操作
    await logUserAction('create_task', {
      taskId: result.data.id,
      projectId: project_id,
      taskCode: task_code,
      taskName: task_name
    }, req);

    res.json({ success: true, data: result.data });
  } catch (error: any) {
    await logApiError('创建WBS任务', error, req, { projectId: project_id, taskCode: task_code });
    res.status(500).json({ success: false, message: '创建WBS任务失败' });
  }
});

/**
 * PUT /api/wbs-tasks/:id
 * 更新WBS任务（带版本控制）
 */
router.put('/wbs-tasks/:id', validateSession, requireTaskPermission(TaskOperation.UPDATE), async (req: any, res: any) => {
  const { id } = req.params;
  const {
    task_name,
    description,
    status,
    priority,
    progress,
    estimated_hours,
    actual_hours,
    planned_start_date,
    planned_end_date,
    actual_start_date,
    actual_end_date,
    full_time_ratio,
    assignee_id,
    dependencies,
    tags,
    parent_id,  // 支持更新父任务
    expectedVersion
  } = req.body;
  const userId = req.userId;

  try {
    // 获取当前任务
    const current = await databaseService.query('SELECT * FROM wbs_tasks WHERE id = ?', [id]);
    if (!current || current.length === 0) {
      return res.status(404).json({ success: false, message: '任务不存在' });
    }

    // 检查版本冲突
    if (expectedVersion !== undefined && current[0].version !== expectedVersion) {
      return res.status(409).json({
        success: false,
        message: '版本冲突，数据已被其他用户修改',
        currentVersion: current[0].version,
        data: current[0]
      });
    }

    // 如果 parent_id 被修改，验证层级关系（防止循环引用）
    const newParentId = parent_id !== undefined ? parent_id : current[0].parent_id;
    if (newParentId !== current[0].parent_id) {
      const hierarchyValidation = await validateTaskHierarchy(parseInt(id), newParentId, current[0].project_id);
      if (!hierarchyValidation.valid) {
        return res.status(400).json({ success: false, message: hierarchyValidation.reason });
      }
    }

    // 更新任务
    await databaseService.query(
      `UPDATE wbs_tasks SET
       task_name = COALESCE(?, task_name),
       description = COALESCE(?, description),
       status = COALESCE(?, status),
       priority = COALESCE(?, priority),
       progress = COALESCE(?, progress),
       estimated_hours = COALESCE(?, estimated_hours),
       actual_hours = COALESCE(?, actual_hours),
       planned_start_date = COALESCE(?, planned_start_date),
       planned_end_date = COALESCE(?, planned_end_date),
       actual_start_date = COALESCE(?, actual_start_date),
       actual_end_date = COALESCE(?, actual_end_date),
       full_time_ratio = COALESCE(?, full_time_ratio),
       assignee_id = COALESCE(?, assignee_id),
       parent_id = COALESCE(?, parent_id),
       dependencies = COALESCE(?, dependencies),
       tags = COALESCE(?, tags),
       version = version + 1,
       updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        task_name,
        description,
        status,
        priority,
        progress,
        estimated_hours,
        actual_hours,
        planned_start_date,
        planned_end_date,
        actual_start_date,
        actual_end_date,
        full_time_ratio,
        assignee_id,
        parent_id,  // 添加 parent_id 更新
        dependencies ? JSON.stringify(dependencies) : null,
        tags ? JSON.stringify(tags) : null,
        id
      ]
    );

    const updated = await databaseService.query(
      `SELECT t.*, m.name as assignee_name
       FROM wbs_tasks t
       LEFT JOIN members m ON t.assignee_id = m.id
       WHERE t.id = ?`,
      [id]
    );

    const newVersion = updated[0].version;

    // 更新项目完成计数
    if (status === 'completed' && current[0].status !== 'completed') {
      await databaseService.query(
        'UPDATE projects SET completed_task_count = completed_task_count + 1 WHERE id = ?',
        [current[0].project_id]
      );
    } else if (status !== 'completed' && current[0].status === 'completed') {
      await databaseService.query(
        'UPDATE projects SET completed_task_count = completed_task_count - 1 WHERE id = ?',
        [current[0].project_id]
      );
    }

    // 记录版本历史
    await databaseService.recordVersion(
      'wbs_task',
      parseInt(id),
      newVersion,
      userId,
      'update',
      { before: current[0], after: updated[0] },
      '更新WBS任务'
    );

    // 广播变更
    broadcastDataUpdate('wbs_tasks', 'update', updated[0]);

    res.json({ success: true, data: updated[0] });
  } catch (error) {
    console.error('[API] 更新WBS任务失败:', error);
    res.status(500).json({ success: false, message: '更新WBS任务失败' });
  }
});

/**
 * PUT /api/wbs-tasks/batch-progress
 * 批量更新任务进度
 */
router.put('/wbs-tasks/batch-progress', validateSession, async (req: any, res: any) => {
  const { updates } = req.body;
  const userId = req.userId;

  if (!Array.isArray(updates) || updates.length === 0) {
    return res.status(400).json({ success: false, message: '更新列表不能为空' });
  }

  try {
    await databaseService.transaction(async (connection) => {
      for (const update of updates) {
        const { id, progress, expectedVersion } = update;

        // 检查版本冲突
        if (expectedVersion !== undefined) {
          const [rows] = await connection.execute(
            'SELECT version FROM wbs_tasks WHERE id = ?',
            [id]
          );
          const tasks = rows as any[];
          if (tasks.length === 0 || tasks[0].version !== expectedVersion) {
            throw new Error(`任务ID ${id} 版本冲突`);
          }
        }

        // 更新进度
        await connection.execute(
          'UPDATE wbs_tasks SET progress = ?, version = version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [progress, id]
        );
      }
    });

    // 批量广播
    for (const update of updates) {
      broadcastDataUpdate('wbs_tasks', 'update', { id: update.id, progress: update.progress });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('[API] 批量更新任务进度失败:', error);
    res.status(500).json({ success: false, message: error.message || '批量更新任务进度失败' });
  }
});

/**
 * DELETE /api/wbs-tasks/:id
 * 删除WBS任务（软删除）
 */
router.delete('/wbs-tasks/:id', validateSession, requireTaskPermission(TaskOperation.DELETE), async (req: any, res: any) => {
  const { id } = req.params;
  const userId = req.userId;

  try {
    // 使用原子事务删除任务
    const result = await deleteTaskWithCounter(parseInt(id), userId);

    if (!result.success) {
      await logApiError('删除WBS任务', new Error(result.error || '未知错误'), req, { taskId: id });
      return res.status(500).json({ success: false, message: result.error || '删除WBS任务失败' });
    }

    // 广播变更
    broadcastDataUpdate('wbs_tasks', 'delete', { id });

    // 记录用户操作
    await logUserAction('delete_task', { taskId: id }, req);

    res.json({ success: true });
  } catch (error) {
    await logApiError('删除WBS任务', error, req, { taskId: id });
    res.status(500).json({ success: false, message: '删除WBS任务失败' });
  }
});

// ==================== 任务分配 API ====================

/**
 * POST /api/task-assignments
 * 分配任务
 */
router.post('/task-assignments', validateSession, async (req: any, res: any) => {
  const { task_id, assignee_id, notes } = req.body;
  const assignedBy = req.userId;

  if (!task_id || !assignee_id) {
    return res.status(400).json({ success: false, message: '任务ID和被分配人ID不能为空' });
  }

  try {
    const result = await databaseService.query(
      `INSERT INTO task_assignments (task_id, assignee_id, assigned_by, notes)
       VALUES (?, ?, ?, ?)`,
      [task_id, assignee_id, assignedBy, notes]
    );

    const newAssignment = await databaseService.query(
      `SELECT ta.*, m.name as assignee_name, u.name as assigned_by_name
       FROM task_assignments ta
       LEFT JOIN members m ON ta.assignee_id = m.id
       LEFT JOIN users u ON ta.assigned_by = u.id
       WHERE ta.id = ?`,
      [result.insertId]
    );

    // 更新任务的assignee_id
    await databaseService.query(
      'UPDATE wbs_tasks SET assignee_id = ? WHERE id = ?',
      [assignee_id, task_id]
    );

    res.json({ success: true, data: newAssignment[0] });
  } catch (error) {
    console.error('[API] 分配任务失败:', error);
    res.status(500).json({ success: false, message: '分配任务失败' });
  }
});

/**
 * GET /api/task-assignments
 * 获取任务分配历史
 */
router.get('/task-assignments', async (req: any, res: any) => {
  const { task_id } = req.query;

  try {
    let sql = `
      SELECT ta.*, m.name as assignee_name, u.name as assigned_by_name
      FROM task_assignments ta
      LEFT JOIN members m ON ta.assignee_id = m.id
      LEFT JOIN users u ON ta.assigned_by = u.id
    `;

    const params: any[] = [];
    if (task_id) {
      sql += ' WHERE ta.task_id = ?';
      params.push(task_id);
    }

    sql += ' ORDER BY ta.assigned_at DESC';

    const rows = await databaseService.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('[API] 获取任务分配历史失败:', error);
    res.status(500).json({ success: false, message: '获取任务分配历史失败' });
  }
});

/**
 * DELETE /api/task-assignments/:id
 * 取消任务分配
 */
router.delete('/task-assignments/:id', validateSession, async (req: any, res: any) => {
  const { id } = req.params;

  try {
    const assignment = await databaseService.query(
      'SELECT * FROM task_assignments WHERE id = ?',
      [id]
    );

    if (!assignment || assignment.length === 0) {
      return res.status(404).json({ success: false, message: '分配记录不存在' });
    }

    await databaseService.query(
      'UPDATE task_assignments SET status = ?, unassigned_at = NOW() WHERE id = ?',
      ['cancelled', id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('[API] 取消任务分配失败:', error);
    res.status(500).json({ success: false, message: '取消任务分配失败' });
  }
});

// ==================== 节假日 API ====================

/**
 * GET /api/holidays
 * 获取节假日列表
 */
router.get('/holidays', async (req: any, res: any) => {
  const { year } = req.query;

  try {
    let sql = 'SELECT * FROM holidays';
    const params: any[] = [];

    if (year) {
      sql += ' WHERE year = ?';
      params.push(year);
    }

    sql += ' ORDER BY holiday_date';

    const rows = await databaseService.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('[API] 获取节假日列表失败:', error);
    res.status(500).json({ success: false, message: '获取节假日列表失败' });
  }
});

/**
 * POST /api/holidays
 * 添加节假日
 */
router.post('/holidays', validateSession, async (req: any, res: any) => {
  const { holiday_date, name, is_workday } = req.body;

  if (!holiday_date || !name) {
    return res.status(400).json({ success: false, message: '日期和名称不能为空' });
  }

  try {
    const date = new Date(holiday_date);

    const result = await databaseService.query(
      `INSERT INTO holidays (holiday_date, name, is_workday, year)
       VALUES (?, ?, ?, ?)`,
      [holiday_date, name, is_workday ? 1 : 0, date.getFullYear()]
    );

    const newHoliday = await databaseService.query('SELECT * FROM holidays WHERE id = ?', [result.insertId]) as any[];

    broadcastDataUpdate('holidays', 'create', newHoliday[0]);

    res.json({ success: true, data: newHoliday[0] });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: '该日期已存在' });
    }
    console.error('[API] 添加节假日失败:', error);
    res.status(500).json({ success: false, message: '添加节假日失败' });
  }
});

/**
 * DELETE /api/holidays/:id
 * 删除节假日
 */
router.delete('/holidays/:id', validateSession, async (req: any, res: any) => {
  const { id } = req.params;

  try {
    await databaseService.query('DELETE FROM holidays WHERE id = ?', [id]);

    broadcastDataUpdate('holidays', 'delete', { id });

    res.json({ success: true });
  } catch (error) {
    console.error('[API] 删除节假日失败:', error);
    res.status(500).json({ success: false, message: '删除节假日失败' });
  }
});

// ==================== 版本历史 API ====================

/**
 * GET /api/versions/:entityType/:entityId
 * 获取数据版本历史
 */
router.get('/versions/:entityType/:entityId', async (req: any, res: any) => {
  const { entityType, entityId } = req.params;
  const { limit } = req.query;

  try {
    const history = await databaseService.getVersionHistory(
      entityType,
      parseInt(entityId),
      limit ? parseInt(limit) : 10
    );

    res.json({ success: true, data: history });
  } catch (error) {
    console.error('[API] 获取版本历史失败:', error);
    res.status(500).json({ success: false, message: '获取版本历史失败' });
  }
});

// ==================== 优化的查询 API ====================

/**
 * GET /api/query/:table
 * 优化的分页查询接口
 */
router.get('/query/:table', async (req: any, res: any) => {
  const { table } = req.params;
  const {
    page = '1',
    pageSize = '50',
    fields = '',
    orderBy = 'created_at',
    order = 'DESC',
    where = ''
  } = req.query;

  // 验证表名，防止 SQL 注入
  const allowedTables = ['projects', 'members', 'wbs_tasks', 'holidays', 'users'];
  if (!allowedTables.includes(table)) {
    return res.status(400).json({ success: false, message: '无效的表名' });
  }

  try {
    const { QueryOptimizer } = await import('../utils/QueryOptimizer.js');

    // 解析字段
    const fieldList = fields ? (fields as string).split(',') : [];

    // 解析 WHERE 条件和参数
    let whereClause = '';
    let whereParams: any[] = [];
    if (where) {
      // 简单的 WHERE 条件解析（生产环境应该更严格）
      whereClause = where as string;
      // 如果有参数，从查询字符串中获取
      if (req.query.params) {
        whereParams = JSON.parse(req.query.params as string);
      }
    }

    const result = await QueryOptimizer.paginatedQuery(
      table,
      {
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string),
        fields: fieldList,
        orderBy: orderBy as string,
        order: order as 'ASC' | 'DESC',
        where: whereClause,
        params: whereParams
      }
    );

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('[API] 优化查询失败:', error);
    res.status(500).json({ success: false, message: '查询失败' });
  }
});

/**
 * GET /api/query/:table/fields
 * 只查询指定字段（性能优化）
 */
router.get('/query/:table/fields', async (req: any, res: any) => {
  const { table } = req.params;
  const { fields = 'id,name', where = '', orderBy = 'id', order = 'ASC' } = req.query;

  // 验证表名
  const allowedTables = ['projects', 'members', 'wbs_tasks', 'holidays', 'users'];
  if (!allowedTables.includes(table)) {
    return res.status(400).json({ success: false, message: '无效的表名' });
  }

  try {
    const { QueryOptimizer } = await import('../utils/QueryOptimizer.js');

    const fieldList = (fields as string).split(',');
    const data = await QueryOptimizer.selectFields(
      table,
      fieldList,
      {
        where: where as string,
        orderBy: orderBy as string,
        order: order as 'ASC' | 'DESC'
      }
    );

    res.json({ success: true, data });
  } catch (error) {
    console.error('[API] 字段查询失败:', error);
    res.status(500).json({ success: false, message: '查询失败' });
  }
});

/**
 * GET /api/query/:table/count
 * 快速计数（性能优化）
 */
router.get('/query/:table/count', async (req: any, res: any) => {
  const { table } = req.params;
  const { where = '' } = req.query;

  // 验证表名
  const allowedTables = ['projects', 'members', 'wbs_tasks', 'holidays', 'users'];
  if (!allowedTables.includes(table)) {
    return res.status(400).json({ success: false, message: '无效的表名' });
  }

  try {
    const { QueryOptimizer } = await import('../utils/QueryOptimizer.js');

    const count = await QueryOptimizer.count(table, where as string);
    res.json({ success: true, count });
  } catch (error) {
    console.error('[API] 计数查询失败:', error);
    res.status(500).json({ success: false, message: '查询失败' });
  }
});

/**
 * GET /api/query/analyze
 * 分析查询性能（仅开发环境）
 */
router.get('/query/analyze', async (req: any, res: any) => {
  // 仅在开发环境允许
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ success: false, message: '仅开发环境可用' });
  }

  const { query, params } = req.query;

  if (!query) {
    return res.status(400).json({ success: false, message: '缺少查询语句' });
  }

  try {
    const { QueryAnalyzer } = await import('../utils/DatabaseQueryOptimizer.js');
    const queryParams = params ? JSON.parse(params as string) : [];
    const analysis = await QueryAnalyzer.analyzeQuery(query as string, queryParams);

    res.json({ success: true, analysis });
  } catch (error) {
    console.error('[API] 查询分析失败:', error);
    res.status(500).json({ success: false, message: '查询分析失败' });
  }
});

/**
 * GET /api/query/stats/:table
 * 获取表统计信息（仅开发环境）
 */
router.get('/query/stats/:table', async (req: any, res: any) => {
  // 仅在开发环境允许
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ success: false, message: '仅开发环境可用' });
  }

  const { table } = req.params;

  // 验证表名
  const allowedTables = ['projects', 'members', 'wbs_tasks', 'holidays', 'users', 'sessions'];
  if (!allowedTables.includes(table)) {
    return res.status(400).json({ success: false, message: '无效的表名' });
  }

  try {
    const { QueryAnalyzer } = await import('../utils/DatabaseQueryOptimizer.js');

    const [stats, indexes] = await Promise.all([
      QueryAnalyzer.getTableStats(table),
      QueryAnalyzer.checkTableIndexes(table)
    ]);

    res.json({ success: true, stats, indexes });
  } catch (error) {
    console.error('[API] 获取表统计失败:', error);
    res.status(500).json({ success: false, message: '获取统计信息失败' });
  }
});

// ==================== 任务审批 API ====================

/**
 * GET /api/task-approvals/pending
 * 获取待审批列表
 */
router.get('/task-approvals/pending', validateSession, async (req: any, res: any) => {
  const { limit = '50' } = req.query;

  try {
    const records = await taskApprovalService.getPendingApprovals(parseInt(limit as string));
    res.json({ success: true, data: records });
  } catch (error) {
    console.error('[API] 获取待审批列表失败:', error);
    res.status(500).json({ success: false, message: '获取待审批列表失败' });
  }
});

/**
 * POST /api/task-approvals
 * 创建审批记录
 */
router.post('/task-approvals', validateSession, async (req: any, res: any) => {
  const {
    taskId,
    taskTitle,
    requesterRole,
    requestType = 'create_task',
    changeBefore,
    changeAfter
  } = req.body;
  const requesterId = req.userId;
  const requesterName = req.session?.username || '';

  if (!taskId || !taskTitle) {
    return res.status(400).json({ success: false, message: '任务ID和任务标题不能为空' });
  }

  try {
    const record = await taskApprovalService.createApproval({
      taskId: parseInt(taskId),
      taskTitle,
      requesterId,
      requesterName,
      requesterRole,
      requestType,
      changeBefore,
      changeAfter
    });

    // 记录用户操作
    await logUserAction('create_approval', {
      approvalId: record.id,
      taskId,
      taskTitle,
      requestType
    }, req);

    res.json({ success: true, data: record });
  } catch (error) {
    console.error('[API] 创建审批记录失败:', error);
    await logApiError('创建审批记录', error, req, { taskId, taskTitle });
    res.status(500).json({ success: false, message: '创建审批记录失败' });
  }
});

/**
 * PUT /api/task-approvals/:id/approve
 * 审批通过
 */
router.put('/task-approvals/:id/approve', validateSession, requireApprovalPermission(), async (req: any, res: any) => {
  const { id } = req.params;
  const { comment } = req.body;
  const approverId = req.userId;
  const approverName = req.session?.username || '';

  try {
    const record = await taskApprovalService.approve(parseInt(id), {
      approverId,
      approverName,
      comment
    });

    // 更新任务的审批状态
    await databaseService.query(
      'UPDATE wbs_tasks SET approval_status = ? WHERE id = ?',
      ['approved', record.taskId]
    );

    // 广播变更
    broadcastDataUpdate('task_approvals', 'update', record);
    broadcastDataUpdate('wbs_tasks', 'update', { id: record.taskId, approvalStatus: 'approved' });

    // 记录用户操作
    await logUserAction('approve_task', {
      approvalId: record.id,
      taskId: record.taskId,
      comment
    }, req);

    res.json({ success: true, data: record });
  } catch (error) {
    console.error('[API] 审批通过失败:', error);
    await logApiError('审批通过', error, req, { approvalId: id });
    res.status(500).json({ success: false, message: '审批通过失败' });
  }
});

/**
 * PUT /api/task-approvals/:id/reject
 * 审批拒绝
 */
router.put('/task-approvals/:id/reject', validateSession, requireApprovalPermission(), async (req: any, res: any) => {
  const { id } = req.params;
  const { comment } = req.body;
  const approverId = req.userId;
  const approverName = req.session?.username || '';

  try {
    const record = await taskApprovalService.reject(parseInt(id), {
      approverId,
      approverName,
      comment
    });

    // 更新任务的审批状态
    await databaseService.query(
      'UPDATE wbs_tasks SET approval_status = ? WHERE id = ?',
      ['rejected', record.taskId]
    );

    // 广播变更
    broadcastDataUpdate('task_approvals', 'update', record);
    broadcastDataUpdate('wbs_tasks', 'update', { id: record.taskId, approvalStatus: 'rejected' });

    // 记录用户操作
    await logUserAction('reject_task', {
      approvalId: record.id,
      taskId: record.taskId,
      comment
    }, req);

    res.json({ success: true, data: record });
  } catch (error) {
    console.error('[API] 审批拒绝失败:', error);
    await logApiError('审批拒绝', error, req, { approvalId: id });
    res.status(500).json({ success: false, message: '审批拒绝失败' });
  }
});

/**
 * GET /api/task-approvals/task/:taskId
 * 获取任务的审批历史
 */
router.get('/task-approvals/task/:taskId', async (req: any, res: any) => {
  const { taskId } = req.params;

  try {
    const records = await taskApprovalService.getTaskApprovalHistory(parseInt(taskId));
    res.json({ success: true, data: records });
  } catch (error) {
    console.error('[API] 获取任务审批历史失败:', error);
    res.status(500).json({ success: false, message: '获取任务审批历史失败' });
  }
});

/**
 * GET /api/task-approvals/user/:userId
 * 获取用户的审批请求
 */
router.get('/task-approvals/user/:userId', async (req: any, res: any) => {
  const { userId } = req.params;
  const { status } = req.query;

  try {
    const records = await taskApprovalService.getUserApprovalRequests(
      parseInt(userId),
      status as any
    );
    res.json({ success: true, data: records });
  } catch (error) {
    console.error('[API] 获取用户审批请求失败:', error);
    res.status(500).json({ success: false, message: '获取用户审批请求失败' });
  }
});

/**
 * GET /api/task-approvals/stats
 * 获取审批统计
 */
router.get('/task-approvals/stats', async (req: any, res: any) => {
  try {
    const stats = await taskApprovalService.getApprovalStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('[API] 获取审批统计失败:', error);
    res.status(500).json({ success: false, message: '获取审批统计失败' });
  }
});

/**
 * POST /api/task-approvals/batch/approve
 * 批量审批通过
 */
router.post('/task-approvals/batch/approve', validateSession, requireApprovalPermission(), async (req: any, res: any) => {
  const { recordIds, comment } = req.body;
  const approverId = req.userId;
  const approverName = req.session?.username || '';

  if (!Array.isArray(recordIds) || recordIds.length === 0) {
    return res.status(400).json({ success: false, message: '请选择要审批的记录' });
  }

  try {
    const result = await taskApprovalService.batchApprove({
      recordIds: recordIds.map((id: string) => parseInt(id)),
      approverId,
      approverName,
      comment
    });

    // 广播变更
    broadcastDataUpdate('task_approvals', 'batch_update', { result });

    // 记录用户操作
    await logUserAction('batch_approve', {
      count: result.success,
      failed: result.failed
    }, req);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[API] 批量审批通过失败:', error);
    await logApiError('批量审批通过', error, req, { recordIds });
    res.status(500).json({ success: false, message: '批量审批通过失败' });
  }
});

/**
 * POST /api/task-approvals/batch/reject
 * 批量拒绝
 */
router.post('/task-approvals/batch/reject', validateSession, requireApprovalPermission(), async (req: any, res: any) => {
  const { recordIds, comment } = req.body;
  const approverId = req.userId;
  const approverName = req.session?.username || '';

  if (!Array.isArray(recordIds) || recordIds.length === 0) {
    return res.status(400).json({ success: false, message: '请选择要拒绝的记录' });
  }

  if (!comment) {
    return res.status(400).json({ success: false, message: '拒绝时必须填写原因' });
  }

  try {
    const result = await taskApprovalService.batchReject({
      recordIds: recordIds.map((id: string) => parseInt(id)),
      approverId,
      approverName,
      comment
    });

    // 广播变更
    broadcastDataUpdate('task_approvals', 'batch_update', { result });

    // 记录用户操作
    await logUserAction('batch_reject', {
      count: result.success,
      failed: result.failed
    }, req);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[API] 批量拒绝失败:', error);
    await logApiError('批量拒绝', error, req, { recordIds });
    res.status(500).json({ success: false, message: '批量拒绝失败' });
  }
});

/**
 * DELETE /api/task-approvals/:id
 * 撤销审批请求（工程师撤销自己的待审批任务）
 */
router.delete('/task-approvals/:id', validateSession, async (req: any, res: any) => {
  const { id } = req.params;
  const requesterId = req.userId;

  try {
    await taskApprovalService.withdrawApproval(parseInt(id), requesterId);

    // 记录用户操作
    await logUserAction('withdraw_approval', {
      approvalId: id
    }, req);

    res.json({ success: true, message: '审批请求已撤销' });
  } catch (error: any) {
    console.error('[API] 撤销审批请求失败:', error);
    await logApiError('撤销审批请求', error, req, { approvalId: id });
    res.status(400).json({ success: false, message: error.message || '撤销失败' });
  }
});

/**
 * GET /api/task-approvals/overdue
 * 获取超时的待审批任务
 */
router.get('/task-approvals/overdue', validateSession, requireApprovalPermission(), async (req: any, res: any) => {
  const { hours = '24' } = req.query;

  try {
    const overdueApprovals = await taskApprovalService.getOverdueApprovals(parseInt(hours as string));
    res.json({ success: true, data: overdueApprovals });
  } catch (error) {
    console.error('[API] 获取超时任务失败:', error);
    res.status(500).json({ success: false, message: '获取超时任务失败' });
  }
});

// ==================== 导出路由 ====================

export default router;

/**
 * 设置广播函数
 */
export function setBroadcastFunction(fn: (message: any) => void) {
  (global as any).broadcastToAll = fn;
}
