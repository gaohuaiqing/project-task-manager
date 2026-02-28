/**
 * 权限配置 API 路由
 * 提供权限配置的增删改查接口
 */

import { Router, Request, Response } from 'express';
import { permissionConfigService } from '../services/PermissionConfigService.js';
import { systemLogger } from '../services/AsyncSystemLogger.js';
import { databaseService } from '../services/DatabaseService.js';

const router = Router();

// ================================================================
// 中间件
// ================================================================

/**
 * 认证中间件：验证用户身份
 */
async function requireAuth(req: Request, res: Response, next: Function) {
  // 简化的认证逻辑：从请求头获取用户信息
  // 实际应该从 session/token 中获取
  const userId = req.headers['x-user-id'] as string;
  const userRole = req.headers['x-user-role'] as string;

  if (!userId) {
    return res.status(401).json({ error: '未授权：缺少用户ID' });
  }

  req.userId = parseInt(userId);
  req.userRole = userRole || 'engineer';

  // 获取用户名
  try {
    const [users] = await databaseService.query(
      'SELECT username FROM users WHERE id = ?',
      [req.userId]
    ) as any[];
    req.username = users?.[0]?.username || `user_${req.userId}`;
  } catch (error) {
    console.error('[requireAuth] 获取用户名失败:', error);
    req.username = `user_${req.userId}`;
  }

  next();
}

/**
 * 管理员权限中间件
 */
async function requireAdmin(req: Request, res: Response, next: Function) {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: '禁止访问：需要管理员权限' });
  }
  next();
}

// ================================================================
// 路由定义
// ================================================================

/**
 * GET /api/permissions/config
 * 获取权限配置
 */
router.get('/config', requireAuth, async (req: Request, res: Response) => {
  try {
    const config = await permissionConfigService.getPermissionConfig();
    res.json({ success: true, data: config });
  } catch (error) {
    console.error('[GET /api/permissions/config] 错误:', error);
    res.status(500).json({ success: false, error: '获取权限配置失败' });
  }
});

/**
 * POST /api/permissions/config
 * 保存权限配置
 */
router.post('/config', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const config = req.body;
    const userId = req.userId!;
    const username = req.username!;

    const savedConfig = await permissionConfigService.savePermissionConfig(
      config,
      userId,
      username,
      req.body.action || 'update',
      req.body.details
    );

    res.json({ success: true, data: savedConfig });
  } catch (error) {
    console.error('[POST /api/permissions/config] 错误:', error);
    await systemLogger.error('[API] 保存权限配置失败', { error: String(error) }, req.userId, req.username);
    res.status(500).json({ success: false, error: '保存权限配置失败' });
  }
});

/**
 * POST /api/permissions/item
 * 添加权限项
 */
router.post('/item', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const item = req.body;
    const userId = req.userId!;
    const username = req.username!;

    const config = await permissionConfigService.addPermissionItem(item, userId, username);

    res.json({ success: true, data: config });
  } catch (error) {
    console.error('[POST /api/permissions/item] 错误:', error);
    await systemLogger.error('[API] 添加权限项失败', { error: String(error), item: req.body }, req.userId, req.username);
    res.status(500).json({ success: false, error: '添加权限项失败' });
  }
});

/**
 * PUT /api/permissions/item/:id
 * 更新权限项
 */
router.put('/item/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const itemId = req.params.id;
  const updates = req.body;
  const userId = req.userId!;
  const username = req.username!;

  try {
    const config = await permissionConfigService.updatePermissionItem(itemId, updates, userId, username);

    res.json({ success: true, data: config });
  } catch (error) {
    console.error('[PUT /api/permissions/item/:id] 错误:', error);
    await systemLogger.error('[API] 更新权限项失败', { error: String(error), itemId, updates }, req.userId, req.username);
    res.status(500).json({ success: false, error: '更新权限项失败' });
  }
});

/**
 * DELETE /api/permissions/item/:id
 * 删除权限项
 */
router.delete('/item/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const itemId = req.params.id;
  const userId = req.userId!;
  const username = req.username!;

  try {
    const config = await permissionConfigService.deletePermissionItem(itemId, userId, username);

    res.json({ success: true, data: config });
  } catch (error) {
    console.error('[DELETE /api/permissions/item/:id] 错误:', error);
    await systemLogger.error('[API] 删除权限项失败', { error: String(error), itemId }, req.userId, req.username);
    res.status(500).json({ success: false, error: '删除权限项失败' });
  }
});

/**
 * PUT /api/permissions/roles
 * 批量更新角色权限
 */
router.put('/roles', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { rolePermissions } = req.body;
    const userId = req.userId!;
    const username = req.username!;

    const config = await permissionConfigService.updateRolePermissions(rolePermissions, userId, username);

    res.json({ success: true, data: config });
  } catch (error) {
    console.error('[PUT /api/permissions/roles] 错误:', error);
    await systemLogger.error('[API] 更新角色权限失败', { error: String(error) }, req.userId, req.username);
    res.status(500).json({ success: false, error: '更新角色权限失败' });
  }
});

/**
 * GET /api/permissions/history
 * 获取权限变更历史
 */
router.get('/history', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;

    const history = await permissionConfigService.getPermissionHistory(limit);

    res.json({ success: true, data: history });
  } catch (error) {
    console.error('[GET /api/permissions/history] 错误:', error);
    res.status(500).json({ success: false, error: '获取权限历史失败' });
  }
});

/**
 * GET /api/permissions/check/:operation
 * 检查当前用户是否有指定操作的权限
 */
router.get('/check/:operation', requireAuth, async (req: Request, res: Response) => {
  try {
    const operation = req.params.operation;
    const userId = req.userId!;
    const role = req.userRole!;

    const hasPermission = await permissionConfigService.checkPermission(userId, role, operation);

    res.json({ success: true, data: { hasPermission, operation, role } });
  } catch (error) {
    console.error('[GET /api/permissions/check/:operation] 错误:', error);
    res.status(500).json({ success: false, error: '检查权限失败' });
  }
});

/**
 * GET /api/permissions/level/:operation
 * 获取当前用户对指定操作的权限级别
 */
router.get('/level/:operation', requireAuth, async (req: Request, res: Response) => {
  try {
    const operation = req.params.operation;
    const userId = req.userId!;
    const role = req.userRole!;

    const level = await permissionConfigService.getPermissionLevel(userId, role, operation);

    res.json({ success: true, data: { level, operation, role } });
  } catch (error) {
    console.error('[GET /api/permissions/level/:operation] 错误:', error);
    res.status(500).json({ success: false, error: '获取权限级别失败' });
  }
});

// ================================================================
// 类型扩展
// ================================================================

declare module 'express' {
  export interface Request {
    userId?: number;
    userRole?: string;
    username?: string;
  }
}

export default router;
