/**
 * 任务权限验证中间件
 *
 * 验证用户是否有权限执行特定任务操作
 * 基于：
 * - 用户角色 (admin, tech_manager, dept_manager, engineer)
 * - 任务分配关系 (是否分配给自己)
 * - 操作类型 (create, read, update, delete, approve)
 */

import { Request, Response, NextFunction } from 'express';
import { databaseService } from '../services/DatabaseService.js';

// ==================== 类型定义 ====================

export enum TaskOperation {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  APPROVE = 'approve',
  FORCE_REFRESH = 'force_refresh'
}

export enum UserRole {
  ADMIN = 'admin',
  TECH_MANAGER = 'tech_manager',
  DEPT_MANAGER = 'dept_manager',
  ENGINEER = 'engineer'
}

export interface PermissionContext {
  userId: number;
  username: string;
  role: UserRole;
  taskId?: number;
}

// ==================== 权限规则矩阵 ====================

/**
 * 权限规则定义
 *
 * 权限级别：
 * - full: 完全权限，可以操作所有任务
 * - own: 只能操作分配给自己的任务
 * - write: 可以创建和编辑任务
 * - read: 只读权限
 * - none: 无权限
 */
const PERMISSION_RULES: Record<UserRole, Record<TaskOperation, string>> = {
  [UserRole.ADMIN]: {
    [TaskOperation.CREATE]: 'full',
    [TaskOperation.READ]: 'full',
    [TaskOperation.UPDATE]: 'full',
    [TaskOperation.DELETE]: 'full',
    [TaskOperation.APPROVE]: 'full',
    [TaskOperation.FORCE_REFRESH]: 'full',
  },
  [UserRole.TECH_MANAGER]: {
    [TaskOperation.CREATE]: 'write',
    [TaskOperation.READ]: 'full',
    [TaskOperation.UPDATE]: 'write',
    [TaskOperation.DELETE]: 'write',
    [TaskOperation.APPROVE]: 'write',
    [TaskOperation.FORCE_REFRESH]: 'write',
  },
  [UserRole.DEPT_MANAGER]: {
    [TaskOperation.CREATE]: 'write',
    [TaskOperation.READ]: 'full',
    [TaskOperation.UPDATE]: 'write',
    [TaskOperation.DELETE]: 'write',
    [TaskOperation.APPROVE]: 'none',
    [TaskOperation.FORCE_REFRESH]: 'write',
  },
  [UserRole.ENGINEER]: {
    [TaskOperation.CREATE]: 'own',
    [TaskOperation.READ]: 'full',
    [TaskOperation.UPDATE]: 'own',
    [TaskOperation.DELETE]: 'none',
    [TaskOperation.APPROVE]: 'none',
    [TaskOperation.FORCE_REFRESH]: 'none',
  },
};

// ==================== 权限验证函数 ====================

/**
 * 检查用户是否有执行指定操作的权限
 */
export async function checkTaskPermission(
  context: PermissionContext,
  operation: TaskOperation,
  taskId?: number
): Promise<{ allowed: boolean; reason?: string }> {
  const { userId, role, taskId: contextTaskId } = context;
  const targetTaskId = taskId || contextTaskId;

  // 获取权限规则
  const rule = PERMISSION_RULES[role]?.[operation];
  if (!rule) {
    return { allowed: false, reason: `角色 ${role} 没有 ${operation} 权限` };
  }

  // full 权限：可以操作所有任务
  if (rule === 'full') {
    return { allowed: true };
  }

  // none 权限：无权限
  if (rule === 'none') {
    return { allowed: false, reason: `角色 ${role} 没有 ${operation} 权限` };
  }

  // own 权限：只能操作分配给自己的任务
  if (rule === 'own' && targetTaskId) {
    const task = await getTask(targetTaskId);
    if (!task) {
      return { allowed: false, reason: '任务不存在' };
    }

    // 检查任务是否分配给该用户
    if (task.assignee_id === userId) {
      return { allowed: true };
    }

    return { allowed: false, reason: '只能操作分配给自己的任务' };
  }

  // write 权限：可以创建和编辑
  if (rule === 'write') {
    return { allowed: true };
  }

  // read 权限：只读
  if (rule === 'read' && operation === TaskOperation.READ) {
    return { allowed: true };
  }

  return { allowed: false, reason: '权限不足' };
}

/**
 * 获取任务信息
 */
async function getTask(taskId: number): Promise<any> {
  const tasks = await databaseService.query(
    'SELECT * FROM wbs_tasks WHERE id = ?',
    [taskId]
  ) as any[];
  return tasks[0] || null;
}

/**
 * 获取用户角色
 */
async function getUserRole(userId: number): Promise<UserRole | null> {
  const users = await databaseService.query(
    'SELECT role FROM users WHERE id = ?',
    [userId]
  ) as any[];
  return users[0]?.role || null;
}

// ==================== Express 中间件 ====================

/**
 * 通用任务权限验证中间件
 * 增强安全性：验证 taskId 格式和存在性
 */
export function requireTaskPermission(operation: TaskOperation) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId;
      const username = (req as any).session?.username;

      if (!userId) {
        return res.status(401).json({ success: false, message: '未认证' });
      }

      // 获取用户角色
      const role = await getUserRole(userId);
      if (!role) {
        return res.status(403).json({ success: false, message: '无法确定用户角色' });
      }

      // 获取任务 ID（从 URL 参数或请求体）
      // 安全增强：严格验证 taskId 格式
      let taskId: number | undefined;

      if (req.params.id) {
        const parsedId = parseInt(req.params.id, 10);
        // 验证是否为有效数字且在合理范围内
        if (isNaN(parsedId) || parsedId <= 0 || parsedId > Number.MAX_SAFE_INTEGER) {
          return res.status(400).json({ success: false, message: '无效的任务ID' });
        }
        taskId = parsedId;
      } else if (req.body.taskId) {
        const parsedId = parseInt(req.body.taskId, 10);
        // 验证是否为有效数字且在合理范围内
        if (isNaN(parsedId) || parsedId <= 0 || parsedId > Number.MAX_SAFE_INTEGER) {
          return res.status(400).json({ success: false, message: '无效的任务ID' });
        }
        taskId = parsedId;
      }

      // 对于需要任务ID的操作，进行额外验证
      if (taskId !== undefined) {
        // 验证任务是否存在
        const task = await getTask(taskId);
        if (!task) {
          return res.status(404).json({ success: false, message: '任务不存在' });
        }
      }

      // 构建权限上下文
      const context: PermissionContext = {
        userId,
        username,
        role,
        taskId
      };

      // 检查权限
      const result = await checkTaskPermission(context, operation, taskId);

      if (!result.allowed) {
        return res.status(403).json({
          success: false,
          message: result.reason || '权限不足'
        });
      }

      // 权限验证通过，继续处理请求
      next();
    } catch (error) {
      console.error('[PermissionMiddleware] 权限验证失败:', error);
      res.status(500).json({ success: false, message: '权限验证失败' });
    }
  };
}

/**
 * 创建任务权限验证（特殊处理：工程师可以创建分配给自己的任务）
 */
export function requireCreateTaskPermission() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId;
      const assigneeId = req.body.assignee_id;

      if (!userId) {
        return res.status(401).json({ success: false, message: '未认证' });
      }

      // 获取用户角色
      const role = await getUserRole(userId);
      if (!role) {
        return res.status(403).json({ success: false, message: '无法确定用户角色' });
      }

      // 工程师只能创建分配给自己的任务
      if (role === UserRole.ENGINEER && assigneeId && assigneeId !== userId) {
        return res.status(403).json({
          success: false,
          message: '工程师只能创建分配给自己的任务'
        });
      }

      // 工程师创建的任务需要审批
      if (role === UserRole.ENGINEER) {
        req.body.approval_status = 'pending';
      }

      next();
    } catch (error) {
      console.error('[PermissionMiddleware] 创建任务权限验证失败:', error);
      res.status(500).json({ success: false, message: '权限验证失败' });
    }
  };
}

/**
 * 审批权限验证（只有管理员和技术经理可以审批）
 */
export function requireApprovalPermission() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId;

      if (!userId) {
        return res.status(401).json({ success: false, message: '未认证' });
      }

      // 获取用户角色
      const role = await getUserRole(userId);
      if (!role) {
        return res.status(403).json({ success: false, message: '无法确定用户角色' });
      }

      // 只有管理员和技术经理可以审批
      if (role !== UserRole.ADMIN && role !== UserRole.TECH_MANAGER) {
        return res.status(403).json({
          success: false,
          message: '只有管理员和技术经理可以审批任务'
        });
      }

      next();
    } catch (error) {
      console.error('[PermissionMiddleware] 审批权限验证失败:', error);
      res.status(500).json({ success: false, message: '权限验证失败' });
    }
  };
}
