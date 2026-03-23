// app/server/src/modules/auth/routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { AuthService } from './service';
import { ValidationError, AppError, ForbiddenError } from '../../core/errors';

const router = Router();
const authService = new AuthService();

// 会话续期响应头标识
const SESSION_RENEWED_HEADER = 'X-Session-Renewed';

// 认证中间件（支持自动续期）
async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const sessionId = req.cookies?.sessionId;
  if (!sessionId) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: '未登录' }
    });
  }

  // 使用支持续期的验证方法
  const result = await authService.validateAndRenewSession(sessionId, req.ip);
  if (!result) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: '会话已过期' }
    });
  }

  (req as any).user = result.user;
  (req as any).session = result.session;
  (req as any).permissions = result.permissions;

  // 如果会话被续期，设置响应头和更新 Cookie
  if (result.renewed) {
    res.setHeader(SESSION_RENEWED_HEADER, 'true');
    res.cookie('sessionId', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
      sameSite: 'strict',
    });
  }

  next();
}

// 管理员权限中间件
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user || (user.role !== 'admin' && user.role !== 'tech_manager')) {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: '需要管理员权限' }
    });
  }
  next();
}

// 登录
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      throw new ValidationError('用户名和密码不能为空');
    }

    const ip = req.ip || req.socket.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';

    const result = await authService.login({ username, password }, ip, userAgent);

    res.cookie('sessionId', result.sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
      sameSite: 'strict',
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// 登出
router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = req.cookies?.sessionId;
    if (sessionId) {
      await authService.logout(sessionId);
      res.clearCookie('sessionId');
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// 获取当前用户信息
router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = req.cookies?.sessionId;
    if (!sessionId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: '未登录' }
      });
    }

    // 使用支持续期的验证方法
    const result = await authService.validateAndRenewSession(sessionId, req.ip);
    if (!result) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: '会话已过期' }
      });
    }

    const response: any = {
      user: result.user,
      sessionId,
      permissions: result.permissions,
    };

    // 如果会话被续期，设置响应头和更新 Cookie
    if (result.renewed) {
      res.setHeader(SESSION_RENEWED_HEADER, 'true');
      res.cookie('sessionId', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: 'strict',
      });
      response.sessionRenewed = true;
    }

    res.json({ success: true, data: response });
  } catch (error) {
    next(error);
  }
});

// ========== 会话管理 API ==========

// 获取当前用户的所有活跃会话
router.get('/sessions', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id;
    const sessions = await authService.getUserSessions(userId);

    // 隐藏敏感信息
    const safeSessions = sessions.map(s => ({
      id: s.session_id,
      ipAddress: s.ip_address ? maskIP(s.ip_address) : null,
      userAgent: s.user_agent,
      createdAt: s.created_at,
      lastAccessed: s.last_accessed,
      expiresAt: s.expires_at,
      isCurrent: s.session_id === req.cookies?.sessionId,
    }));

    res.json({ success: true, data: safeSessions });
  } catch (error) {
    next(error);
  }
});

// 终止指定会话
router.delete('/sessions/:sessionId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id;
    const sessionId = req.params.sessionId;

    await authService.terminateUserSession(userId, sessionId, 'user_terminated');
    res.json({ success: true, message: '会话已终止' });
  } catch (error) {
    next(error);
  }
});

// 终止所有其他会话
router.post('/sessions/terminate-others', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id;
    const currentSessionId = req.cookies?.sessionId;

    const sessions = await authService.getUserSessions(userId);
    const otherSessionIds = sessions
      .filter(s => s.session_id !== currentSessionId)
      .map(s => s.session_id);

    if (otherSessionIds.length > 0) {
      const { AuthRepository } = await import('./repository');
      const repo = new AuthRepository();
      await repo.terminateSessions(otherSessionIds, 'user_terminated_others');
    }

    res.json({
      success: true,
      message: `已终止 ${otherSessionIds.length} 个其他会话`
    });
  } catch (error) {
    next(error);
  }
});

// ========== 用户管理 API ==========

// 获取用户列表
router.get('/users', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const options = {
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 20,
      role: req.query.role as string,
      department_id: req.query.department_id ? parseInt(req.query.department_id as string) : undefined,
      is_active: req.query.is_active === 'true' ? true : req.query.is_active === 'false' ? false : undefined,
      search: req.query.search as string,
    };

    const result = await authService.getUsers(options);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// 创建用户
router.post('/users', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await authService.createUser(req.body);
    res.status(201).json({
      success: true,
      data: {
        id: result.id,
        initialPassword: result.initialPassword,
        message: '用户创建成功，请保存初始密码'
      }
    });
  } catch (error) {
    next(error);
  }
});

// 更新用户
router.put('/users/:id', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = parseInt(req.params.id);
    await authService.updateUser(userId, req.body);
    res.json({ success: true, message: '用户更新成功' });
  } catch (error) {
    next(error);
  }
});

// 删除用户（软删除）
router.delete('/users/:id', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = parseInt(req.params.id);
    const currentUserId = (req as any).user?.id;

    // 不允许删除自己
    if (userId === currentUserId) {
      throw new ValidationError('不能删除自己的账户');
    }

    await authService.deleteUser(userId);
    res.json({ success: true, message: '用户已禁用' });
  } catch (error) {
    next(error);
  }
});

// 重置密码
router.post('/users/:id/reset-password', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = parseInt(req.params.id);
    const newPassword = await authService.resetPassword(userId);
    res.json({
      success: true,
      data: {
        newPassword,
        message: '密码重置成功，请保存新密码'
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 隐藏 IP 地址的部分信息
 */
function maskIP(ip: string): string {
  // IPv4: 192.168.1.100 -> 192.168.*.*
  // IPv6: 2001:0db8:85a3:0000:0000:8a2e:0370:7334 -> 2001:0db8:*:*:*:*:*:*
  if (ip.includes('.')) {
    const parts = ip.split('.');
    return `${parts[0]}.${parts[1]}.*.*`;
  } else if (ip.includes(':')) {
    const parts = ip.split(':');
    return `${parts[0]}:${parts[1]}:*:*:*:*:*:*`;
  }
  return '***';
}

export default router;
