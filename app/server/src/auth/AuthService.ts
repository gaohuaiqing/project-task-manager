/**
 * 认证服务
 *
 * 核心功能：
 * - 用户登录（密码验证）
 * - 用户登出
 * - 会话管理
 * - 权限验证
 * - 自动续期
 *
 * 刷新免登录流程：
 * 1. Cookie中存储session_id（7天有效期）
 * 2. Redis存储会话数据（24小时TTL）
 * 3. 刷新页面时从Cookie读取session_id
 * 4. 从Redis验证会话有效性
 * 5. 自动续期（剩余时间<30分钟时）
 */

import bcrypt from 'bcrypt';
import { databaseService } from '../services/DatabaseService.js';
import { authSessionManager } from './SessionManager.js';
import { logger, LOG_CATEGORIES } from '../logging/index.js';
import { TerminationReason, SessionStatus } from './types.js';
import type {
  User,
  LoginRequest,
  LoginResponse,
  ValidateResponse,
  UserRole
} from './types.js';

/**
 * 登录尝试记录（用于防暴力破解）
 */
interface LoginAttempt {
  count: number;
  lastAttempt: number;
  lockedUntil?: number;
}

const loginAttempts = new Map<string, LoginAttempt>();

/**
 * 认证服务类
 */
export class AuthService {
  private broadcastCallback?: (username: string, message: any) => void;

  constructor() {
    // 设置会话管理器的广播回调
    authSessionManager.setBroadcastCallback((username, message) => {
      this.broadcastCallback?.(username, message);
    });
  }

  /**
   * 设置广播回调
   */
  setBroadcastCallback(callback: (username: string, message: any) => void): void {
    this.broadcastCallback = callback;
  }

  /**
   * ============================================
   * 登录/登出
   * ============================================
   */

  /**
   * 用户登录
   *
   * 流程：
   * 1. 检查登录尝试次数（防暴力破解）
   * 2. 验证用户名和密码
   * 3. 创建会话
   * 4. 返回用户信息和session_id
   */
  async login(request: LoginRequest, ip: string): Promise<LoginResponse> {
    const { username, password, deviceId, deviceInfo } = request;

    logger.info(LOG_CATEGORIES.AUTH_LOGIN, '用户登录尝试', {
      username,
      ip,
      deviceId: deviceId || 'unknown'
    });

    // 1. 检查登录尝试次数
    const attemptCheck = this.checkLoginAttempts(username);
    if (!attemptCheck.allowed) {
      logger.warn(LOG_CATEGORIES.AUTH_LOGIN, '登录失败：账户已锁定', {
        username,
        ip,
        lockedUntil: attemptCheck.lockedUntil
      });

      return {
        success: false,
        message: `账户已锁定，请${Math.ceil((attemptCheck.lockedUntil! - Date.now()) / 60000)}分钟后重试`
      };
    }

    try {
      // 2. 查询用户
      const users = await databaseService.query(
        `SELECT id, username, password, role, name, department
         FROM users
         WHERE username = ?`,
        [username]
      ) as any[];

      if (!users || users.length === 0) {
        this.recordFailedAttempt(username);
        logger.warn(LOG_CATEGORIES.AUTH_LOGIN, '登录失败：用户不存在', { username, ip });
        return { success: false, message: '用户名或密码错误' };
      }

      const user = users[0];

      // 3. 验证密码
      const passwordValid = await bcrypt.compare(password, user.password);

      if (!passwordValid) {
        this.recordFailedAttempt(username);
        logger.warn(LOG_CATEGORIES.AUTH_LOGIN, '登录失败：密码错误', { username, ip });
        return { success: false, message: '用户名或密码错误' };
      }

      // 4. 清除登录尝试记录
      this.clearLoginAttempts(username);

      // 5. 构建用户信息
      const userInfo: User = {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role as UserRole,
        department: user.department,
        createdAt: user.created_at || new Date()
      };

      // 6. 创建会话
      const session = await authSessionManager.createSession(userInfo, ip, deviceId, deviceInfo);

      logger.info(LOG_CATEGORIES.AUTH_LOGIN, '用户登录成功', {
        username,
        userId: user.id,
        ip,
        sessionId: session.sessionId.slice(0, 8) + '...'
      });

      // 7. 返回结果
      return {
        success: true,
        session,
        user: userInfo
      };
    } catch (error: any) {
      logger.error(LOG_CATEGORIES.AUTH_LOGIN, '登录失败：系统错误', {
        username,
        ip,
        error: error.message
      });

      return {
        success: false,
        message: '登录失败，请稍后重试'
      };
    }
  }

  /**
   * 用户登出
   */
  async logout(sessionId: string, username: string): Promise<{ success: boolean; message?: string }> {
    try {
      await authSessionManager.terminateSession(sessionId, TerminationReason.USER_LOGOUT);

      logger.info(LOG_CATEGORIES.AUTH_LOGOUT, '用户登出成功', {
        username,
        sessionId: sessionId.slice(0, 8) + '...'
      });

      return { success: true };
    } catch (error: any) {
      logger.error(LOG_CATEGORIES.AUTH_LOGOUT, '登出失败', {
        username,
        error: error.message
      });

      return {
        success: false,
        message: '登出失败，请稍后重试'
      };
    }
  }

  /**
   * ============================================
   * 会话验证
   * ============================================
   */

  /**
   * 验证会话（刷新页面时调用）
   *
   * 这是实现"刷新免登录"的核心方法
   */
  async validateSession(sessionId: string, currentIp?: string): Promise<ValidateResponse> {
    const result = await authSessionManager.validateSession(sessionId, currentIp);

    if (result.valid && result.session) {
      // 会话有效，返回用户信息
      const users = await databaseService.query(
        `SELECT id, username, role, name, department
         FROM users
         WHERE id = ?`,
        [result.session.userId]
      ) as any[];

      if (users && users.length > 0) {
        const user = users[0];
        // 构建完整的 Session 对象
        const fullSession: import('./types.js').Session = {
          sessionId,
          userId: result.session.userId,
          username: result.session.username,
          role: result.session.role,
          ip: result.session.ip,
          deviceId: result.session.deviceId,
          deviceInfo: result.session.deviceInfo,
          status: SessionStatus.ACTIVE,
          createdAt: Date.now(), // 从数据库获取实际创建时间
          lastAccessed: result.session.lastAccessed,
          expiresAt: result.session.expiresAt
        };

        return {
          valid: true,
          session: fullSession,
          user: {
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role,
            department: user.department,
            createdAt: user.created_at || new Date()
          }
        };
      }
    }

    return {
      valid: false,
      reason: result.reason || '会话无效'
    };
  }

  /**
   * 刷新会话（续期）
   */
  async refreshSession(sessionId: string): Promise<boolean> {
    try {
      const result = await authSessionManager.validateSession(sessionId);

      if (result.valid) {
        logger.debug(LOG_CATEGORIES.AUTH_SESSION, '会话刷新成功', {
          sessionId: sessionId.slice(0, 8) + '...'
        });
        return true;
      }

      return false;
    } catch (error) {
      logger.error(LOG_CATEGORIES.AUTH_SESSION, '会话刷新失败', {
        sessionId: sessionId.slice(0, 8) + '...',
        error
      });
      return false;
    }
  }

  /**
   * ============================================
   * 用户管理
   * ============================================
   */

  /**
   * 创建用户
   */
  async createUser(data: {
    username: string;
    password: string;
    name: string;
    role: UserRole;
    department?: string;
  }): Promise<{ success: boolean; user?: User; message?: string }> {
    try {
      // 检查用户名是否已存在
      const existing = await databaseService.query(
        'SELECT id FROM users WHERE username = ?',
        [data.username]
      ) as any[];

      if (existing && existing.length > 0) {
        return { success: false, message: '用户名已存在' };
      }

      // 加密密码
      const passwordHash = await bcrypt.hash(data.password, 10);

      // 插入用户
      const result = await databaseService.query(
        `INSERT INTO users (username, password, name, role, department)
         VALUES (?, ?, ?, ?, ?)`,
        [data.username, passwordHash, data.name, data.role, data.department || null]
      ) as any;

      const userId = result.insertId;

      logger.info(LOG_CATEGORIES.AUTH, '用户创建成功', {
        username: data.username,
        userId,
        role: data.role
      });

      // 查询并返回用户信息
      const users = await databaseService.query(
        'SELECT id, username, name, role, department, created_at FROM users WHERE id = ?',
        [userId]
      ) as any[];

      const user = users[0];
      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          department: user.department,
          createdAt: user.created_at
        }
      };
    } catch (error: any) {
      logger.error(LOG_CATEGORIES.AUTH, '创建用户失败', {
        username: data.username,
        error: error.message
      });

      return {
        success: false,
        message: '创建用户失败'
      };
    }
  }

  /**
   * 修改密码
   */
  async changePassword(userId: number, oldPassword: string, newPassword: string): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
      // 查询用户
      const users = await databaseService.query(
        'SELECT password FROM users WHERE id = ?',
        [userId]
      ) as any[];

      if (!users || users.length === 0) {
        return { success: false, message: '用户不存在' };
      }

      // 验证旧密码
      const passwordValid = await bcrypt.compare(oldPassword, users[0].password);

      if (!passwordValid) {
        return { success: false, message: '原密码错误' };
      }

      // 加密新密码
      const passwordHash = await bcrypt.hash(newPassword, 10);

      // 更新密码
      await databaseService.query(
        'UPDATE users SET password = ? WHERE id = ?',
        [passwordHash, userId]
      );

      logger.info(LOG_CATEGORIES.AUTH, '密码修改成功', { userId });

      return { success: true };
    } catch (error: any) {
      logger.error(LOG_CATEGORIES.AUTH, '修改密码失败', {
        userId,
        error: error.message
      });

      return {
        success: false,
        message: '修改密码失败'
      };
    }
  }

  /**
   * ============================================
   * 防暴力破解
   * ============================================
   */

  /**
   * 检查登录尝试
   */
  private checkLoginAttempts(username: string): {
    allowed: boolean;
    lockedUntil?: number;
  } {
    const attempt = loginAttempts.get(username);

    if (!attempt) {
      return { allowed: true };
    }

    // 检查是否锁定
    if (attempt.lockedUntil && Date.now() < attempt.lockedUntil) {
      return {
        allowed: false,
        lockedUntil: attempt.lockedUntil
      };
    }

    // 清除过期记录
    if (attempt.lockedUntil && Date.now() >= attempt.lockedUntil) {
      loginAttempts.delete(username);
      return { allowed: true };
    }

    return { allowed: true };
  }

  /**
   * 记录失败尝试
   */
  private recordFailedAttempt(username: string): void {
    const now = Date.now();
    const attempt = loginAttempts.get(username) || { count: 0, lastAttempt: now };

    attempt.count++;
    attempt.lastAttempt = now;

    // 超过5次失败，锁定30分钟
    if (attempt.count >= 5) {
      attempt.lockedUntil = now + 30 * 60 * 1000;
      logger.warn(LOG_CATEGORIES.AUTH, '账户已锁定', {
        username,
        attemptCount: attempt.count
      });
    }

    loginAttempts.set(username, attempt);
  }

  /**
   * 清除登录尝试记录
   */
  private clearLoginAttempts(username: string): void {
    loginAttempts.delete(username);
  }

  /**
   * ============================================
   * 会话管理（委托给SessionManager）
   * ============================================
   */

  /**
   * 获取用户所有会话
   */
  async getUserSessions(userId: number): Promise<any[]> {
    try {
      const sessions = await databaseService.query(
        `SELECT session_id, device_id, device_info, ip_address,
                created_at, last_accessed, expires_at, status
         FROM sessions
         WHERE user_id = ?
         ORDER BY created_at DESC`,
        [userId]
      );

      return sessions || [];
    } catch (error) {
      logger.error(LOG_CATEGORIES.AUTH_SESSION, '获取用户会话失败', { userId, error });
      return [];
    }
  }

  /**
   * 终止会话
   */
  async terminateSession(sessionId: string, username: string): Promise<boolean> {
    return authSessionManager.terminateSession(sessionId, TerminationReason.ADMIN_ACTION);
  }

  /**
   * 终止用户所有会话
   */
  async terminateAllUserSessions(userId: number, username: string): Promise<number> {
    return authSessionManager.terminateAllUserSessions(userId, username, TerminationReason.ADMIN_ACTION);
  }

  /**
   * 清理过期会话（定时任务）
   */
  async cleanupExpiredSessions(): Promise<number> {
    return authSessionManager.cleanupExpiredSessions();
  }
}

/**
 * 全局认证服务实例
 */
export const authService = new AuthService();

/**
 * 默认导出
 */
export default authService;
