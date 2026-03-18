/**
 * 会话管理器
 *
 * Cookie + Redis 双存储策略：
 * 1. MySQL: 记录会话历史（审计用）
 * 2. Redis: 存储会话数据（24小时TTL，快速访问）
 * 3. Cookie: 存储session_id（7天，自动续期）
 * 4. localStorage: 备份（降级用）
 *
 * 刷新页面时：
 * 1. 检查Cookie中的session_id
 * 2. 从Redis验证会话有效性
 * 3. 自动续期（剩余时间<30分钟时）
 * 4. 无需重新登录 ✅
 */

import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { databaseService } from '../services/DatabaseService.js';
import { redisService } from '../cache/index.js';
import { logger, LOG_CATEGORIES } from '../logging/index.js';
import type {
  Session,
  SessionData,
  SessionStatus,
  TerminationReason,
  User,
  SessionPolicy,
  DEFAULT_SESSION_POLICY
} from './types.js';

/**
 * 会话管理器类
 */
export class AuthSessionManager {
  private policy: SessionPolicy;
  private broadcastCallback?: (username: string, message: any) => void;
  private isInitialized: boolean = false;

  constructor(policy?: Partial<SessionPolicy>) {
    // 导入 DEFAULT_SESSION_POLICY 避免循环依赖
    const defaultPolicy: SessionPolicy = {
      mode: 'multi_device',
      maxSessionsPerUser: 10,
      allowDifferentIPs: true,
      ipSubnetPrefix: 24,
      allowLocalIPBypass: true,
      cookieMaxAge: 7 * 24 * 60 * 60 * 1000,
      redisTTL: 24 * 60 * 60
    };

    this.policy = { ...defaultPolicy, ...policy };
    logger.info(LOG_CATEGORIES.AUTH_SESSION, '会话管理器已初始化', { policy: this.policy });
  }

  /**
   * 初始化会话管理器
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // 测试数据库连接
      await databaseService.query('SELECT 1');
      this.isInitialized = true;
      logger.info(LOG_CATEGORIES.AUTH_SESSION, '会话管理器初始化成功');
    } catch (error) {
      logger.error(LOG_CATEGORIES.AUTH_SESSION, '会话管理器初始化失败', { error });
      throw new Error('SessionManager requires database connection');
    }
  }

  /**
   * 设置广播回调
   */
  setBroadcastCallback(callback: (username: string, message: any) => void): void {
    this.broadcastCallback = callback;
  }

  /**
   * ============================================
   * 会话创建（核心流程）
   * ============================================
   */

  /**
   * 创建会话（登录成功后调用）
   *
   * 流程：
   * 1. 根据策略处理现有会话
   * 2. 生成新的session_id
   * 3. MySQL记录会话历史
   * 4. Redis存储会话数据（24小时TTL）
   * 5. 返回session_id（用于设置Cookie）
   */
  async createSession(
    user: User,
    ip: string,
    deviceId?: string,
    deviceInfo?: string
  ): Promise<Session> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    const now = Date.now();
    const sessionId = uuidv4();
    const expiresAt = now + this.policy.cookieMaxAge;

    logger.info(LOG_CATEGORIES.AUTH_SESSION, '创建会话', {
      username: user.username,
      userId: user.id,
      ip,
      sessionId: sessionId.slice(0, 8) + '...'
    });

    try {
      // 1. 根据策略处理现有会话
      await this.handleExistingSessions(user.id, user.username);

      // 2. 会话数据
      const sessionData: SessionData = {
        userId: user.id,
        username: user.username,
        role: user.role,
        ip,
        deviceId: deviceId || 'unknown',
        deviceInfo,
        lastAccessed: now,
        expiresAt
      };

      // 3. MySQL记录会话历史（异步，不阻塞）
      this.recordSessionToMySQL(sessionId, user.id, ip, deviceId, deviceInfo, now, expiresAt).catch(error => {
        logger.error(LOG_CATEGORIES.AUTH_SESSION, 'MySQL会话记录失败', { error });
      });

      // 4. Redis存储会话数据
      const redisKey = `session:${sessionId}`;
      await redisService.set(redisKey, sessionData, this.policy.redisTTL);

      // 5. 返回完整会话信息
      const session: Session = {
        sessionId,
        userId: user.id,
        username: user.username,
        role: user.role,
        ip,
        deviceId: deviceId || 'unknown',
        deviceInfo,
        status: 'active' as SessionStatus,
        createdAt: now,
        lastAccessed: now,
        expiresAt
      };

      const duration = Date.now() - startTime;
      logger.info(LOG_CATEGORIES.AUTH_SESSION, '会话创建成功', {
        sessionId: sessionId.slice(0, 8) + '...',
        username: user.username,
        duration
      });

      return session;
    } catch (error: any) {
      logger.error(LOG_CATEGORIES.AUTH_SESSION, '会话创建失败', {
        username: user.username,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * ============================================
   * 会话验证（核心流程）
   * ============================================
   */

  /**
   * 验证会话
   *
   * 流程：
   * 1. 从Redis获取会话数据
   * 2. 检查会话有效性
   * 3. 自动续期（剩余时间<30分钟时）
   * 4. 返回用户信息
   */
  async validateSession(sessionId: string, currentIp?: string): Promise<{
    valid: boolean;
    session?: SessionData;
    reason?: string;
  }> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // 1. 从Redis获取会话
      const redisKey = `session:${sessionId}`;
      const result = await redisService.get<SessionData>(redisKey);

      if (!result.success || !result.data) {
        // Redis未命中，检查MySQL（可能是Redis重启导致）
        const mysqlSession = await this.getSessionFromMySQL(sessionId);
        if (!mysqlSession) {
          logger.warn(LOG_CATEGORIES.AUTH_SESSION, '会话不存在', {
            sessionId: sessionId.slice(0, 8) + '...'
          });
          return { valid: false, reason: '会话不存在或已过期' };
        }

        // 从MySQL恢复到Redis
        await redisService.set(redisKey, mysqlSession, this.policy.redisTTL);
      }

      const sessionData = result.data || (await this.getSessionFromMySQL(sessionId));

      if (!sessionData) {
        return { valid: false, reason: '会话不存在或已过期' };
      }

      // 2. 检查会话过期
      if (Date.now() > sessionData.expiresAt) {
        await this.terminateSession(sessionId, 'timeout' as TerminationReason);
        return { valid: false, reason: '会话已过期' };
      }

      // 3. IP验证（如果启用）
      if (currentIp && !this.policy.allowDifferentIPs) {
        const ipValidation = this.validateIPChange(sessionData.ip, currentIp);
        if (!ipValidation.valid) {
          await this.terminateSession(sessionId, 'ip_change' as TerminationReason);
          return { valid: false, reason: `IP地址变更: ${ipValidation.reason}` };
        }
      }

      // 4. 自动续期（剩余时间<30分钟时）
      const remainingTime = sessionData.expiresAt - Date.now();
      const renewThreshold = 30 * 60 * 1000; // 30分钟

      if (remainingTime < renewThreshold) {
        const newExpiresAt = Date.now() + this.policy.cookieMaxAge;
        sessionData.expiresAt = newExpiresAt;
        sessionData.lastAccessed = Date.now();

        await redisService.set(redisKey, sessionData, this.policy.redisTTL);

        logger.debug(LOG_CATEGORIES.AUTH_SESSION, '会话自动续期', {
          sessionId: sessionId.slice(0, 8) + '...',
          remainingTime: Math.floor(remainingTime / 1000 / 60) + '分钟'
        });
      }

      // 5. 更新最后访问时间
      sessionData.lastAccessed = Date.now();

      return { valid: true, session: sessionData };
    } catch (error: any) {
      logger.error(LOG_CATEGORIES.AUTH_SESSION, '会话验证失败', {
        sessionId: sessionId.slice(0, 8) + '...',
        error: error.message
      });
      return { valid: false, reason: '会话验证失败' };
    }
  }

  /**
   * ============================================
   * 会话终止
   * ============================================
   */

  /**
   * 终止会话
   */
  async terminateSession(sessionId: string, reason: TerminationReason): Promise<boolean> {
    try {
      // 1. 删除Redis会话
      const redisKey = `session:${sessionId}`;
      await redisService.del(redisKey);

      // 2. 更新MySQL会话状态
      await databaseService.query(
        `UPDATE sessions
         SET status = 'terminated', termination_reason = ?, termination_timestamp = ?
         WHERE session_id = ?`,
        [reason, Date.now(), sessionId]
      );

      logger.info(LOG_CATEGORIES.AUTH_SESSION, '会话已终止', {
        sessionId: sessionId.slice(0, 8) + '...',
        reason
      });

      return true;
    } catch (error: any) {
      logger.error(LOG_CATEGORIES.AUTH_SESSION, '终止会话失败', {
        sessionId: sessionId.slice(0, 8) + '...',
        error: error.message
      });
      return false;
    }
  }

  /**
   * 终止用户所有会话
   */
  async terminateAllUserSessions(userId: number, username: string, reason: TerminationReason): Promise<number> {
    try {
      // 1. 获取用户所有会话
      const sessions = await databaseService.query(
        `SELECT session_id FROM sessions WHERE user_id = ? AND status = 'active'`,
        [userId]
      ) as any[];

      if (sessions.length === 0) {
        return 0;
      }

      // 2. 批量删除Redis会话
      for (const session of sessions) {
        const redisKey = `session:${session.session_id}`;
        await redisService.del(redisKey);
      }

      // 3. 更新MySQL会话状态
      await databaseService.query(
        `UPDATE sessions
         SET status = 'terminated', termination_reason = ?, termination_timestamp = ?
         WHERE user_id = ? AND status = 'active'`,
        [reason, Date.now(), userId]
      );

      logger.info(LOG_CATEGORIES.AUTH_SESSION, '用户所有会话已终止', {
        username,
        count: sessions.length,
        reason
      });

      // 4. 发送WebSocket通知（异步）
      if (this.broadcastCallback && sessions.length > 0) {
        setImmediate(() => {
          this.broadcastCallback!(username, {
            type: 'session_terminated',
            data: {
              message: `您的账号已在其他设备登录，当前会话已被终止`,
              reason
            }
          });
        });
      }

      return sessions.length;
    } catch (error: any) {
      logger.error(LOG_CATEGORIES.AUTH_SESSION, '终止用户会话失败', {
        username,
        error: error.message
      });
      return 0;
    }
  }

  /**
   * ============================================
   * 辅助方法
   * ============================================
   */

  /**
   * 处理现有会话（根据策略）
   */
  private async handleExistingSessions(userId: number, username: string): Promise<void> {
    const activeSessions = await databaseService.query(
      `SELECT session_id, device_id, ip_address, created_at
       FROM sessions
       WHERE user_id = ? AND status = 'active'
       ORDER BY created_at ASC`,
      [userId]
    ) as any[];

    if (activeSessions.length === 0) {
      return;
    }

    let sessionsToTerminate: string[] = [];

    switch (this.policy.mode) {
      case 'single_device':
        // 单设备模式：踢出所有
        sessionsToTerminate = activeSessions.map((s: any) => s.session_id);
        break;

      case 'multi_device_same_type':
        // 同类型设备互斥（简化：这里踢出所有，可根据需要优化）
        sessionsToTerminate = activeSessions.map((s: any) => s.session_id);
        break;

      case 'multi_device':
        // 多设备模式：检查数量限制
        if (this.policy.maxSessionsPerUser > 0 && activeSessions.length >= this.policy.maxSessionsPerUser) {
          // 终止最旧的会话
          sessionsToTerminate = [activeSessions[0].session_id];
        }
        break;
    }

    // 终止选定的会话
    for (const sessionId of sessionsToTerminate) {
      await this.terminateSession(sessionId, 'new_login' as TerminationReason);
    }
  }

  /**
   * 记录会话到MySQL
   */
  private async recordSessionToMySQL(
    sessionId: string,
    userId: number,
    ip: string,
    deviceId: string | undefined,
    deviceInfo: string | undefined,
    createdAt: number,
    expiresAt: number
  ): Promise<void> {
    await databaseService.query(
      `INSERT INTO sessions
       (session_id, user_id, device_id, device_info, ip_address, status, created_at, last_accessed, expires_at)
       VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
      [sessionId, userId, deviceId || 'unknown', deviceInfo, ip, createdAt, createdAt, expiresAt]
    );
  }

  /**
   * 从MySQL获取会话
   */
  private async getSessionFromMySQL(sessionId: string): Promise<SessionData | null> {
    const result = await databaseService.query(
      `SELECT s.user_id, u.username, u.role, s.ip_address as ip, s.device_id,
              s.device_info as deviceInfo, s.expires_at
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.session_id = ? AND s.status = 'active'`,
      [sessionId]
    ) as any[];

    if (!result || result.length === 0) {
      return null;
    }

    const row = result[0];
    return {
      userId: row.user_id,
      username: row.username,
      role: row.role,
      ip: row.ip,
      deviceId: row.device_id,
      deviceInfo: row.deviceInfo,
      lastAccessed: Date.now(),
      expiresAt: row.expires_at
    };
  }

  /**
   * 验证IP变更
   */
  private validateIPChange(sessionIp: string, currentIp: string): {
    valid: boolean;
    reason?: string;
  } {
    if (sessionIp === currentIp) {
      return { valid: true };
    }

    // 允许本地IP
    if (this.policy.allowLocalIPBypass && (sessionIp === 'local' || currentIp === 'local')) {
      return { valid: true };
    }

    // 同一子网检查
    if (this.isSameSubnet(sessionIp, currentIp, this.policy.ipSubnetPrefix)) {
      return { valid: true };
    }

    return {
      valid: false,
      reason: `IP地址从 ${sessionIp} 变更为 ${currentIp}`
    };
  }

  /**
   * 检查两个IP是否在同一子网
   */
  private isSameSubnet(ip1: string, ip2: string, prefix: number): boolean {
    try {
      const num1 = this.ipToNumber(ip1);
      const num2 = this.ipToNumber(ip2);

      if (num1 === null || num2 === null) {
        return false;
      }

      const mask = (0xFFFFFFFF << (32 - prefix)) >>> 0;
      return (num1 & mask) === (num2 & mask);
    } catch {
      return false;
    }
  }

  /**
   * IP转数字
   */
  private ipToNumber(ip: string): number | null {
    try {
      const parts = ip.split('.');
      if (parts.length !== 4) return null;

      let result = 0;
      for (let i = 0; i < 4; i++) {
        const part = parseInt(parts[i], 10);
        if (isNaN(part) || part < 0 || part > 255) return null;
        result = (result << 8) | part;
      }
      return result >>> 0;
    } catch {
      return null;
    }
  }

  /**
   * 清理过期会话（定时任务）
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const now = Date.now();

      const result = await databaseService.query(
        `UPDATE sessions
         SET status = 'terminated', termination_reason = 'timeout', termination_timestamp = ?
         WHERE status = 'active' AND expires_at < ?`,
        [now, now]
      ) as any;

      const count = result.affectedRows || 0;

      if (count > 0) {
        logger.info(LOG_CATEGORIES.AUTH_SESSION, '清理过期会话', { count });
      }

      return count;
    } catch (error: any) {
      logger.error(LOG_CATEGORIES.AUTH_SESSION, '清理过期会话失败', { error: error.message });
      return 0;
    }
  }
}

/**
 * 全局会话管理器实例
 */
export const authSessionManager = new AuthSessionManager();

/**
 * 默认导出
 */
export default authSessionManager;
