// app/server/src/modules/auth/routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { AuthService } from './service';
import { ValidationError, AppError } from '../../core/errors';

const router = Router();
const authService = new AuthService();

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

    const context = await authService.getAuthContext(sessionId);
    if (!context) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: '会话已过期' }
      });
    }

    res.json({ success: true, data: context });
  } catch (error) {
    next(error);
  }
});

export default router;
