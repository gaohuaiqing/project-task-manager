import { v4 as uuidv4 } from 'uuid';
import type { Session } from '../types/index.js';
import { databaseService } from './DatabaseService.js';
import { hasQueryData, getFirstResult, isAffectedRows } from '../utils/DatabaseTypeGuards.js';
import { QUERY_TIMEOUT, withQueryTimeout, transactionWithTimeout } from '../utils/DatabaseQueryTimeout.js';

const SESSION_TIMEOUT = 28800000; // 8小时会话超时 (适合办公场景)

// ================================================================
// 会话策略配置
// ================================================================

/**
 * 设备类型枚举
 */
export enum DeviceType {
  DESKTOP = 'desktop',
  MOBILE = 'mobile',
  TABLET = 'tablet',
  UNKNOWN = 'unknown'
}

/**
 * 会话策略配置接口
 */
export interface SessionPolicy {
  // 会话模式
  mode: 'single_device' | 'multi_device' | 'multi_device_same_type';
  // 每个用户最大会话数（0表示无限制）
  maxSessionsPerUser: number;
  // 是否允许IP地址变更
  allowDifferentIPs: boolean;
  // IP子网掩码（用于判断是否为同一网络）
  ipSubnetPrefix: number;
  // 是否允许本地IP例外
  allowLocalIPBypass: boolean;
}

/**
 * 默认会话策略：多设备模式，适合办公协作场景
 */
const DEFAULT_SESSION_POLICY: SessionPolicy = {
  mode: 'multi_device',
  maxSessionsPerUser: 10,
  allowDifferentIPs: true,  // 允许IP变化（移动网络等场景）
  ipSubnetPrefix: 24,        // /24子网掩码
  allowLocalIPBypass: true   // 允许local IP例外
};

export class SessionManager {
  private broadcastCallback?: (username: string, message: any) => void;
  private isInitialized: boolean = false;
  private sessionPolicy: SessionPolicy;

  constructor(policy?: Partial<SessionPolicy>) {
    // 合并用户提供的策略与默认策略
    this.sessionPolicy = { ...DEFAULT_SESSION_POLICY, ...policy };
    console.log('[SessionManager] 会话策略配置:', JSON.stringify(this.sessionPolicy));
  }

  /**
   * 设置会话策略（运行时动态修改）
   */
  setSessionPolicy(policy: Partial<SessionPolicy>): void {
    this.sessionPolicy = { ...this.sessionPolicy, ...policy };
    console.log('[SessionManager] 会话策略已更新:', JSON.stringify(this.sessionPolicy));
  }

  /**
   * 获取当前会话策略
   */
  getSessionPolicy(): SessionPolicy {
    return { ...this.sessionPolicy };
  }

  // 设置广播回调，用于发送会话终止通知
  setBroadcastCallback(callback: (username: string, message: any) => void) {
    this.broadcastCallback = callback;
  }

  /**
   * 初始化会话管理器（确保数据库可用）
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // 测试数据库连接
      await databaseService.query('SELECT 1');
      this.isInitialized = true;
      console.log('[SessionManager] 数据库连接验证成功');
    } catch (error) {
      console.error('[SessionManager] 数据库连接失败，系统无法启动:', error);
      throw new Error('SessionManager requires database connection to function');
    }
  }

  /**
   * 创建会话（原子事务，优化版本）
   * 根据会话策略决定是否踢出其他会话
   *
   * 性能优化：
   * - 合并用户信息和现有会话查询为一次
   * - 减少数据库往返次数
   *
   * 安全优化：
   * - 防止会话固定攻击：创建临时会话，认证通过后重新生成 sessionID
   */
  async createSession(username: string, ip: string, deviceId?: string, sourceDeviceInfo?: string): Promise<Session> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    const now = Date.now();
    const expiresAt = now + SESSION_TIMEOUT;
    const deviceType = this.getDeviceType(deviceId, sourceDeviceInfo);

    // 使用原子事务：一次性获取用户信息和现有会话，并创建新会话
    const session = await transactionWithTimeout(async (connection: any) => {
      // 【优化】合并查询：一次性获取用户信息和现有活动会话
      const [userData] = await connection.execute(
        `SELECT
          u.id as user_id,
          u.role,
          (SELECT COUNT(*) FROM sessions s WHERE s.user_id = u.id AND s.status = 'active') as active_session_count,
          (SELECT GROUP_CONCAT(s.session_id) FROM sessions s WHERE s.user_id = u.id AND s.status = 'active') as active_session_ids
         FROM users u
         WHERE u.username = ?
         FOR UPDATE`,
        [username]
      ) as any[];

      if (!hasQueryData(userData)) {
        throw new Error('用户不存在');
      }

      const userId = userData[0].user_id;
      const userRole = userData[0].role;
      const activeSessionCount = userData[0].active_session_count || 0;
      const activeSessionIds = userData[0].active_session_ids ? userData[0].active_session_ids.split(',') : [];

      // 处理现有会话（根据策略）
      await this.handleExistingSessionsInTransaction(
        connection,
        username,
        userId,
        deviceType,
        ip,
        activeSessionCount,
        activeSessionIds
      );

      // 创建新会话 - 使用安全的 sessionID 生成
      const sessionId = uuidv4();

      await connection.execute(
        `INSERT INTO sessions
         (session_id, user_id, device_id, device_info, ip_address, status, created_at, last_accessed, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [sessionId, userId, deviceId || 'unknown', sourceDeviceInfo, ip, 'active', now, now, expiresAt]
      );

      return {
        sessionId,
        username,
        ip,
        deviceId,
        createdAt: now,
        lastAccessed: now,
        expiresAt,
        status: 'active' as const,
        sourceDeviceInfo,
        userId,
        role: userRole
      } as Session;
    }, QUERY_TIMEOUT.MEDIUM);

    const duration = Date.now() - startTime;
    console.log(`[SessionManager] 创建会话完成: ${session.sessionId}, 用户: ${username}, 耗时: ${duration}ms`);

    return session;
  }

  /**
   * 在事务中处理现有会话（优化版本）
   * 直接在事务中终止会话，避免额外的数据库调用
   */
  private async handleExistingSessionsInTransaction(
    connection: any,
    username: string,
    userId: number,
    newDeviceType: DeviceType,
    newIp: string,
    activeSessionCount: number,
    activeSessionIds: string[]
  ): Promise<void> {
    const policy = this.sessionPolicy;

    // 如果没有现有会话，直接返回
    if (activeSessionCount === 0) {
      return;
    }

    let sessionsToTerminate: string[] = [];
    let terminateReason = '';

    switch (policy.mode) {
      case 'single_device':
        // 单设备模式：踢出所有现有会话
        sessionsToTerminate = activeSessionIds;
        terminateReason = '单设备登录策略：新设备登录';
        break;

      case 'multi_device_same_type':
        // 需要查询现有会话的设备信息
        const [sessions] = await connection.execute(
          `SELECT session_id, device_id, device_info
           FROM sessions
           WHERE user_id = ? AND status = 'active'`,
          [userId]
        ) as any[];

        sessionsToTerminate = sessions
          .filter((s: any) => {
            const existingDeviceType = this.getDeviceType(s.device_id, s.device_info);
            return existingDeviceType === newDeviceType;
          })
          .map((s: any) => s.session_id);

        if (sessionsToTerminate.length > 0) {
          terminateReason = '同类型设备登录';
        }
        break;

      case 'multi_device':
        // 多设备模式：仅检查会话数量限制
        if (policy.maxSessionsPerUser > 0 && activeSessionCount >= policy.maxSessionsPerUser) {
          // 获取最旧的会话
          const [oldestSession] = await connection.execute(
            `SELECT session_id FROM sessions
             WHERE user_id = ? AND status = 'active'
             ORDER BY created_at ASC
             LIMIT 1`,
            [userId]
          ) as any[];

          if (hasQueryData(oldestSession)) {
            sessionsToTerminate = [oldestSession[0].session_id];
            terminateReason = '超过最大会话数限制';
          }
        }
        break;
    }

    // 批量终止会话
    if (sessionsToTerminate.length > 0) {
      const now = Date.now();
      await connection.execute(
        `UPDATE sessions
         SET status = 'terminated', termination_reason = ?, termination_timestamp = ?
         WHERE session_id IN (${sessionsToTerminate.map(() => '?').join(',')})`,
        [terminateReason, now, ...sessionsToTerminate]
      );

      console.log(`[SessionManager] 终止用户 ${username} 的 ${sessionsToTerminate.length} 个会话: ${terminateReason}`);
    }
  }

  /**
   * 根据会话策略处理现有会话
   */
  private async handleExistingSessions(username: string, newDeviceType: DeviceType, newIp: string): Promise<void> {
    const existingSessions = await this.getSessionsByUsername(username);
    const activeSessions = existingSessions.filter(s => s.status === 'active');

    // 如果没有现有会话，直接返回
    if (activeSessions.length === 0) {
      return;
    }

    const policy = this.sessionPolicy;

    switch (policy.mode) {
      case 'single_device':
        // 单设备模式：踢出所有现有会话
        await this.terminateAllUserSessions(username, '单设备登录策略：新设备登录');
        console.log(`[SessionManager] 单设备模式：踢出用户 ${username} 的所有会话`);
        break;

      case 'multi_device_same_type':
        // 同类型设备互斥模式：踢出同类型设备的会话
        const sameTypeSessions = activeSessions.filter(s => {
          const existingDeviceType = this.getDeviceType(s.deviceId, s.sourceDeviceInfo);
          return existingDeviceType === newDeviceType;
        });

        if (sameTypeSessions.length > 0) {
          for (const session of sameTypeSessions) {
            await this.terminateSession(session.sessionId, '同类型设备登录');
          }
          console.log(`[SessionManager] 同类型设备模式：踢出用户 ${username} 的 ${sameTypeSessions.length} 个同类型会话`);
        }
        break;

      case 'multi_device':
        // 多设备模式：仅检查会话数量限制
        if (policy.maxSessionsPerUser > 0 && activeSessions.length >= policy.maxSessionsPerUser) {
          // 终止最旧的会话
          const oldestSession = activeSessions.sort((a, b) => a.createdAt - b.createdAt)[0];
          await this.terminateSession(oldestSession.sessionId, '超过最大会话数限制');
          console.log(`[SessionManager] 多设备模式：踢出用户 ${username} 的最旧会话（超过最大数量 ${policy.maxSessionsPerUser}）`);
        }
        break;
    }
  }

  /**
   * 根据设备信息判断设备类型
   */
  private getDeviceType(deviceId?: string, deviceInfo?: string): DeviceType {
    if (!deviceId && !deviceInfo) {
      return DeviceType.UNKNOWN;
    }

    const info = (deviceId || deviceInfo || '').toLowerCase();

    if (info.includes('mobile') || info.includes('android') || info.includes('iphone') || info.includes('ipad')) {
      return DeviceType.MOBILE;
    }
    if (info.includes('tablet') || info.includes('ipad')) {
      return DeviceType.TABLET;
    }
    if (info.includes('desktop') || info.includes('windows') || info.includes('mac') || info.includes('linux')) {
      return DeviceType.DESKTOP;
    }

    return DeviceType.UNKNOWN;
  }

  /**
   * 获取会话（带超时保护）
   */
  async getSession(sessionId: string): Promise<Session | undefined> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const sessions = await withQueryTimeout(
      databaseService.query(
        `SELECT s.session_id, u.username, s.ip_address as ip, s.device_id, s.created_at, s.last_accessed, s.expires_at,
                s.status, s.termination_reason, s.termination_timestamp, s.device_info as sourceDeviceInfo
         FROM sessions s
         JOIN users u ON s.user_id = u.id
         WHERE s.session_id = ? AND s.status = 'active'`,
        [sessionId]
      ),
      QUERY_TIMEOUT.SHORT,
      `getSession(${sessionId})`
    ) as any[];

    const sessionData = getFirstResult(sessions);
    if (!sessionData) {
      return undefined;
    }

    // 检查会话是否超时
    if (Date.now() > sessionData.expires_at) {
      await this.terminateSession(sessionId, 'timeout');
      return undefined;
    }

    return {
      sessionId: sessionData.session_id,
      username: sessionData.username,
      ip: sessionData.ip,
      deviceId: sessionData.device_id,
      createdAt: sessionData.created_at,
      lastAccessed: sessionData.last_accessed,
      expiresAt: sessionData.expires_at,
      status: sessionData.status,
      terminationReason: sessionData.termination_reason,
      terminationTimestamp: sessionData.termination_timestamp,
      sourceDeviceInfo: sessionData.sourceDeviceInfo
    };
  }

  /**
   * 根据用户名获取会话（带超时保护）
   */
  async getSessionByUsername(username: string): Promise<Session | undefined> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const sessions = await withQueryTimeout(
      databaseService.query(
        `SELECT s.session_id, u.username, s.ip_address as ip, s.device_id, s.created_at, s.last_accessed, s.expires_at,
                s.status, s.termination_reason, s.termination_timestamp, s.device_info as sourceDeviceInfo
         FROM sessions s
         JOIN users u ON s.user_id = u.id
         WHERE u.username = ? AND s.status = 'active'
         LIMIT 1`,
        [username]
      ),
      QUERY_TIMEOUT.SHORT,
      `getSessionByUsername(${username})`
    ) as any[];

    const sessionData = getFirstResult(sessions);
    if (!sessionData) {
      return undefined;
    }

    return {
      sessionId: sessionData.session_id,
      username: sessionData.username,
      ip: sessionData.ip,
      deviceId: sessionData.device_id,
      createdAt: sessionData.created_at,
      lastAccessed: sessionData.last_accessed,
      expiresAt: sessionData.expires_at,
      status: sessionData.status,
      terminationReason: sessionData.termination_reason,
      terminationTimestamp: sessionData.termination_timestamp,
      sourceDeviceInfo: sessionData.sourceDeviceInfo
    };
  }

  /**
   * 根据用户名获取所有会话（带超时保护）
   */
  async getSessionsByUsername(username: string): Promise<Session[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const sessions = await withQueryTimeout(
      databaseService.query(
        `SELECT s.session_id, u.username, s.ip_address as ip, s.device_id, s.created_at, s.last_accessed, s.expires_at,
                s.status, s.termination_reason, s.termination_timestamp, s.device_info as sourceDeviceInfo
         FROM sessions s
         JOIN users u ON s.user_id = u.id
         WHERE u.username = ?`,
        [username]
      ),
      QUERY_TIMEOUT.DEFAULT,
      `getSessionsByUsername(${username})`
    ) as any[];

    if (!hasQueryData(sessions)) {
      return [];
    }

    return sessions.map((sessionData: any) => ({
      sessionId: sessionData.session_id,
      username: sessionData.username,
      ip: sessionData.ip,
      deviceId: sessionData.device_id,
      createdAt: sessionData.created_at,
      lastAccessed: sessionData.last_accessed,
      expiresAt: sessionData.expires_at,
      status: sessionData.status,
      terminationReason: sessionData.termination_reason,
      terminationTimestamp: sessionData.termination_timestamp,
      sourceDeviceInfo: sessionData.sourceDeviceInfo
    }));
  }

  /**
   * 更新会话活动时间（带超时保护）
   */
  async updateSessionActivity(sessionId: string): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const now = Date.now();
    const expiresAt = now + SESSION_TIMEOUT;

    const result = await withQueryTimeout(
      databaseService.query(
        `UPDATE sessions
         SET last_accessed = ?, expires_at = ?
         WHERE session_id = ? AND status = 'active'`,
        [now, expiresAt, sessionId]
      ),
      QUERY_TIMEOUT.SHORT,
      `updateSessionActivity(${sessionId})`
    );

    return isAffectedRows(result);
  }

  /**
   * 终止会话（带超时保护）
   */
  async terminateSession(sessionId: string, reason: string): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const now = Date.now();

    const result = await withQueryTimeout(
      databaseService.query(
        `UPDATE sessions
         SET status = 'terminated', termination_reason = ?, termination_timestamp = ?
         WHERE session_id = ? AND status = 'active'`,
        [reason, now, sessionId]
      ),
      QUERY_TIMEOUT.SHORT,
      `terminateSession(${sessionId})`
    );

    if (isAffectedRows(result)) {
      console.log(`[SessionManager] 终止会话: ${sessionId}, 原因: ${reason}`);
      return true;
    }

    return false;
  }

  /**
   * 终止用户所有会话（带超时保护）
   */
  async terminateAllUserSessions(username: string, reason: string): Promise<number> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const now = Date.now();

    // 首先获取所有活动会话，用于发送通知
    const activeSessions = await withQueryTimeout(
      databaseService.query(
        `SELECT s.session_id
         FROM sessions s
         JOIN users u ON s.user_id = u.id
         WHERE u.username = ? AND s.status = 'active'`,
        [username]
      ),
      QUERY_TIMEOUT.SHORT,
      `terminateAllUserSessions-get(${username})`
    ) as any[];

    // 终止所有会话
    const result = await withQueryTimeout(
      databaseService.query(
        `UPDATE sessions s
         JOIN users u ON s.user_id = u.id
         SET s.status = 'terminated', s.termination_reason = ?, s.termination_timestamp = ?
         WHERE u.username = ? AND s.status = 'active'`,
        [reason, now, username]
      ),
      QUERY_TIMEOUT.MEDIUM,
      `terminateAllUserSessions-update(${username})`
    );

    const affectedRows = (result as any).affectedRows;
    console.log(`[SessionManager] 终止用户所有会话: ${username}, 数量: ${affectedRows}, 原因: ${reason}`);

    // 发送会话终止通知（异步，不阻塞响应）
    if (affectedRows > 0 && this.broadcastCallback) {
      setImmediate(() => {
        this.broadcastCallback!(username, {
          type: 'session_terminated',
          data: {
            message: `您的账号已在其他设备登录，当前会话已被终止`,
            reason: reason,
            timestamp: now
          }
        });
      });
    }

    return affectedRows;
  }

  /**
   * 清理过期会话（带超时保护）
   */
  async cleanupExpiredSessions(): Promise<Session[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const now = Date.now();

    // 获取过期会话
    const expiredSessions = await withQueryTimeout(
      databaseService.query(
        `SELECT s.session_id, u.username, s.ip_address as ip, s.device_id, s.created_at, s.last_accessed, s.expires_at,
                s.status, s.termination_reason, s.termination_timestamp, s.device_info as sourceDeviceInfo
         FROM sessions s
         JOIN users u ON s.user_id = u.id
         WHERE s.status = 'active' AND s.expires_at < ?`,
        [now]
      ),
      QUERY_TIMEOUT.MEDIUM,
      `cleanupExpiredSessions()`
    ) as any[];

    if (!hasQueryData(expiredSessions)) {
      return [];
    }

    // 批量终止过期会话（使用批量更新而不是逐个调用）
    if (expiredSessions.length > 0) {
      await withQueryTimeout(
        databaseService.query(
          `UPDATE sessions
           SET status = 'terminated', termination_reason = 'timeout', termination_timestamp = ?
           WHERE session_id IN (${expiredSessions.map(() => '?').join(',')})`,
          [now, ...expiredSessions.map((s: any) => s.session_id)]
        ),
        QUERY_TIMEOUT.MEDIUM,
        `cleanupExpiredSessions-bulkUpdate`
      );
      console.log(`[SessionManager] 清理过期会话: ${expiredSessions.length} 个`);
    }

    return expiredSessions.map((sessionData: any) => ({
      sessionId: sessionData.session_id,
      username: sessionData.username,
      ip: sessionData.ip,
      deviceId: sessionData.device_id,
      createdAt: sessionData.created_at,
      lastAccessed: sessionData.last_accessed,
      expiresAt: sessionData.expires_at,
      status: 'terminated',
      terminationReason: 'timeout',
      terminationTimestamp: now,
      sourceDeviceInfo: sessionData.sourceDeviceInfo
    }));
  }

  /**
   * 获取活动会话数量（带超时保护）
   */
  async getActiveSessionCount(): Promise<number> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const result = await withQueryTimeout(
      databaseService.query(
        'SELECT COUNT(*) as count FROM sessions WHERE status = ?',
        ['active']
      ),
      QUERY_TIMEOUT.SHORT,
      `getActiveSessionCount()`
    );

    return (result as any)[0]?.count || 0;
  }

  /**
   * 获取用户会话数量（带超时保护）
   */
  async getUserSessionCount(username: string): Promise<number> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const result = await withQueryTimeout(
      databaseService.query(
        `SELECT COUNT(*) as count
         FROM sessions s
         JOIN users u ON s.user_id = u.id
         WHERE u.username = ? AND s.status = ?`,
        [username, 'active']
      ),
      QUERY_TIMEOUT.SHORT,
      `getUserSessionCount(${username})`
    );

    return (result as any)[0]?.count || 0;
  }

  async isSessionValid(sessionId: string): Promise<boolean> {
    const session = await this.getSession(sessionId);
    return !!session;
  }

  async validateSession(sessionId: string, username: string, ip: string): Promise<{ valid: boolean; reason?: string }> {
    const session = await this.getSession(sessionId);

    if (!session) {
      return { valid: false, reason: '会话不存在' };
    }

    if (session.username !== username) {
      return { valid: false, reason: '用户名不匹配' };
    }

    // 改进的IP地址验证
    const ipValidation = this.validateIPChange(session.ip, ip);
    if (!ipValidation.valid) {
      await this.terminateSession(sessionId, `IP地址变更: ${ipValidation.reason}`);
      return { valid: false, reason: `IP地址变更: ${ipValidation.reason}` };
    }

    // 如果IP在允许范围内变化，更新会话IP
    if (ipValidation.ipChanged && ipValidation.updateAllowed) {
      await databaseService.query(
        'UPDATE sessions SET ip_address = ? WHERE session_id = ?',
        [ip, sessionId]
      );
      console.log(`[SessionManager] 会话IP已更新: ${sessionId}, ${session.ip} -> ${ip}`);
    }

    if (Date.now() > session.expiresAt!) {
      await this.terminateSession(sessionId, 'timeout');
      return { valid: false, reason: '会话已超时' };
    }

    // 更新会话活动
    await this.updateSessionActivity(sessionId);

    return { valid: true };
  }

  /**
   * 验证IP地址变更是否可接受
   */
  private validateIPChange(sessionIp: string, currentIp: string): {
    valid: boolean;
    reason?: string;
    ipChanged: boolean;
    updateAllowed: boolean;
  } {
    // IP未变化
    if (sessionIp === currentIp) {
      return { valid: true, ipChanged: false, updateAllowed: false };
    }

    const policy = this.sessionPolicy;

    // 允许本地IP例外
    if (policy.allowLocalIPBypass && (sessionIp === 'local' || currentIp === 'local')) {
      return { valid: true, ipChanged: true, updateAllowed: true };
    }

    // 策略允许不同IP
    if (policy.allowDifferentIPs) {
      // 检查是否为同一子网
      if (this.isSameSubnet(sessionIp, currentIp, policy.ipSubnetPrefix)) {
        return { valid: true, ipChanged: true, updateAllowed: true };
      }

      // 检查是否为VPN切换（内网IP之间切换）
      if (this.isVPNIPChange(sessionIp, currentIp)) {
        return { valid: true, ipChanged: true, updateAllowed: true };
      }

      // IP变化超出允许范围
      return {
        valid: false,
        reason: `IP地址从 ${sessionIp} 变更为 ${currentIp}，不在允许的子网范围`,
        ipChanged: true,
        updateAllowed: false
      };
    }

    // 不允许IP变化
    return {
      valid: false,
      reason: 'IP地址变更，当前策略不允许IP变化',
      ipChanged: true,
      updateAllowed: false
    };
  }

  /**
   * 检查两个IP是否在同一子网
   * @param ip1 第一个IP地址
   * @param ip2 第二个IP地址
   * @param prefix 子网掩码前缀长度（默认24，即/24）
   */
  private isSameSubnet(ip1: string, ip2: string, prefix: number = 24): boolean {
    try {
      const num1 = this.ipToNumber(ip1);
      const num2 = this.ipToNumber(ip2);

      if (num1 === null || num2 === null) {
        return false;
      }

      const mask = (0xFFFFFFFF << (32 - prefix)) >>> 0;
      return (num1 & mask) === (num2 & mask);
    } catch (error) {
      console.warn('[SessionManager] IP子网检查失败:', error);
      return false;
    }
  }

  /**
   * 检测是否为VPN/内网IP切换
   * 判断两个IP是否都为内网IP或都在VPN地址段内
   */
  private isVPNIPChange(ip1: string, ip2: string): boolean {
    const isInternal1 = this.isInternalIP(ip1);
    const isInternal2 = this.isInternalIP(ip2);

    // 如果两个都是内网IP，允许切换
    return isInternal1 && isInternal2;
  }

  /**
   * 判断是否为内网IP
   */
  private isInternalIP(ip: string): boolean {
    try {
      const num = this.ipToNumber(ip);
      if (num === null) return false;

      // 10.0.0.0 - 10.255.255.255
      if ((num & 0xFF000000) === 0x0A000000) return true;

      // 172.16.0.0 - 172.31.255.255
      if ((num & 0xFFF00000) === 0xAC100000) return true;

      // 192.168.0.0 - 192.168.255.255
      if ((num & 0xFFFF0000) === 0xC0A80000) return true;

      // 127.0.0.1 (localhost)
      if (num === 0x7F000001) return true;

      return false;
    } catch {
      return false;
    }
  }

  /**
   * 将IP地址转换为数字
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
      return result >>> 0; // 转换为无符号32位整数
    } catch {
      return null;
    }
  }
}
