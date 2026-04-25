// app/server/src/modules/auth/service.ts
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { AuthRepository } from './repository';
import { WorkflowRepository } from '../workflow/repository';
import { AuthError, ForbiddenError, ValidationError } from '../../core/errors';
import { sanitizeString } from '../../core/utils/sanitize';
import { audit } from '../../core/audit';
import { sendToUser } from '../../core/realtime';
import { logger } from '../../core/logger';
import type { User, Permission, Session } from '../../core/types';
import type { LoginRequest, LoginResponse, AuthContext, CreateUserRequest, UpdateUserRequest, UserListOptions, UserListResponse } from './types';

// 会话管理常量
const MAX_SESSIONS_PER_USER = 10;
const SESSION_RENEWAL_THRESHOLD_MINUTES = 5;
const SESSION_DURATION_DAYS = 7;

export class AuthService {
  private repo = new AuthRepository();
  private workflowRepo = new WorkflowRepository();

  async login(data: LoginRequest, ip: string, userAgent: string): Promise<LoginResponse> {
    const user = await this.repo.findByUsername(data.username);
    if (!user) {
      throw new AuthError('用户名或密码错误');
    }

    // 检查锁定状态
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      throw new AuthError('账户已锁定，请稍后重试');
    }

    // 验证密码
    const isValid = await bcrypt.compare(data.password, user.password);
    if (!isValid) {
      const attempts = (user.login_attempts || 0) + 1;
      const lockedUntil = attempts >= 5
        ? new Date(Date.now() + 30 * 60 * 1000) // 锁定30分钟
        : null;
      await this.repo.updateLoginAttempts(user.id, attempts, lockedUntil);
      throw new AuthError('用户名或密码错误');
    }

    // 重置登录尝试
    await this.repo.updateLoginAttempts(user.id, 0, null);

    // 检查并管理多设备登录限制
    const activeSessions = await this.repo.getActiveSessionsByUser(user.id);
    const newDeviceLogin = this.isNewDeviceLogin(activeSessions, ip, userAgent);

    if (activeSessions.length >= MAX_SESSIONS_PER_USER) {
      // 终止最旧的会话并发送通知
      const sessionsToTerminate = activeSessions
        .slice(0, activeSessions.length - MAX_SESSIONS_PER_USER + 1);

      for (const session of sessionsToTerminate) {
        await this.notifySessionTerminated(user, session, 'max_sessions_exceeded', ip);
      }

      await this.repo.terminateSessions(
        sessionsToTerminate.map(s => s.session_id),
        'max_sessions_exceeded'
      );
      logger.info(`[Auth] User ${user.id} exceeded max sessions, terminated ${sessionsToTerminate.length} old sessions`);
    }

    // 创建会话
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);
    await this.repo.createSession({
      id: sessionId,
      user_id: user.id,
      ip_address: ip,
      user_agent: userAgent,
      expires_at: expiresAt,
    });

    // 如果是新设备登录，发送通知
    if (newDeviceLogin && activeSessions.length > 0) {
      await this.notifyNewDeviceLogin(user, activeSessions, ip, userAgent);
    }

    // 记录登录审计日志（同步写入，确保安全操作被记录）
    await audit.logSync({
      userId: user.id,
      username: user.real_name,
      userRole: user.role,
      category: 'security',
      action: 'LOGIN',
      tableName: 'sessions',
      recordId: sessionId,
      details: '登录成功',
      ipAddress: ip,
      userAgent: userAgent,
    });

    // 返回不含密码的用户信息
    const { password: _, ...userWithoutPassword } = user;
    const permissions = await this.repo.getPermissionsByRole(user.role);
    return { user: userWithoutPassword, sessionId, permissions };
  }

  async validateSession(sessionId: string): Promise<User | null> {
    const session = await this.repo.findSession(sessionId);
    if (!session) return null;
    return this.repo.findById(session.user_id);
  }

  async getAuthContext(sessionId: string): Promise<AuthContext | null> {
    const session = await this.repo.findSession(sessionId);
    if (!session) return null;

    const user = await this.repo.findById(session.user_id);
    if (!user) return null;

    const permissions = await this.repo.getPermissionsByRole(user.role);
    return { user, sessionId, permissions };
  }

  /**
   * 验证会话并检查是否需要续期
   * 返回 { user, permissions, renewed } - renewed 表示是否已自动续期
   */
  async validateAndRenewSession(sessionId: string, currentIp?: string): Promise<{
    user: User;
    permissions: Permission[];
    renewed: boolean;
    session: Session;
  } | null> {
    const session = await this.repo.findSession(sessionId);
    if (!session) return null;

    const user = await this.repo.findById(session.user_id);
    if (!user) return null;

    // 更新最后访问时间
    await this.repo.updateSessionLastAccessed(sessionId);

    // 检查是否需要续期
    let renewed = false;
    const expiresAt = session.expires_at instanceof Date
      ? session.expires_at
      : new Date(session.expires_at);
    const now = new Date();
    const minutesUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60);

    if (minutesUntilExpiry <= SESSION_RENEWAL_THRESHOLD_MINUTES && minutesUntilExpiry > 0) {
      // 自动续期
      const newExpiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);
      await this.repo.renewSession(sessionId, newExpiresAt);
      renewed = true;
      logger.info(`[Auth] Session ${sessionId.substring(0, 8)}... auto-renewed for user ${user.id}`);
    }

    // 检测 IP 变更（同一会话，IP 发生变化）
    if (currentIp && session.ip_address && currentIp !== session.ip_address) {
      await this.notifyIPChange(user, session.ip_address, currentIp);
    }

    const permissions = await this.repo.getPermissionsByRole(user.role);
    return { user, permissions, renewed, session };
  }

  async hasPermission(userId: number, permission: Permission): Promise<boolean> {
    const user = await this.repo.findById(userId);
    if (!user) return false;
    const permissions = await this.repo.getPermissionsByRole(user.role);
    return permissions.includes(permission);
  }

  async hasAnyPermission(userId: number, permissions: Permission[]): Promise<boolean> {
    const user = await this.repo.findById(userId);
    if (!user) return false;
    const userPermissions = await this.repo.getPermissionsByRole(user.role);
    return permissions.some(p => userPermissions.includes(p));
  }

  async logout(sessionId: string): Promise<void> {
    // 获取会话信息用于审计日志
    const session = await this.repo.findSession(sessionId);
    if (session) {
      const user = await this.repo.findById(session.user_id);
      if (user) {
        await audit.logSync({
          userId: user.id,
          username: user.real_name,
          userRole: user.role,
          category: 'security',
          action: 'LOGOUT',
          tableName: 'sessions',
          recordId: sessionId,
          details: '登出成功',
          ipAddress: session.ip_address || undefined,
          userAgent: session.user_agent || undefined,
        });
      }
    }
    await this.repo.terminateSession(sessionId, 'user_logout');
  }

  /**
   * 获取用户的所有活跃会话
   */
  async getUserSessions(userId: number): Promise<Session[]> {
    return this.repo.getActiveSessionsByUser(userId);
  }

  /**
   * 终止指定会话
   */
  async terminateUserSession(userId: number, sessionId: string, reason: string = 'user_terminated'): Promise<void> {
    const session = await this.repo.findSession(sessionId);
    if (!session || session.user_id !== userId) {
      throw new ForbiddenError('无权终止此会话');
    }
    await this.repo.terminateSession(sessionId, reason);
  }

  // ========== 用户管理 ==========

  async getUsers(options: UserListOptions, currentUser?: User): Promise<UserListResponse> {
    // 只有 admin 能看到内置用户
    if (currentUser && currentUser.role !== 'admin') {
      options.excludeBuiltin = true;
    }
    const { items, total } = await this.repo.getUsers(options);
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    const totalPages = Math.ceil(total / pageSize);
    return { items, total, page, pageSize, totalPages };
  }

  async createUser(data: CreateUserRequest): Promise<{ id: number; initialPassword: string }> {
    // 验证必填字段
    if (!data.username) {
      throw new ValidationError('用户名不能为空');
    }
    if (!data.real_name) {
      throw new ValidationError('真实姓名不能为空');
    }
    if (!data.role) {
      throw new ValidationError('角色不能为空');
    }

    // 检查用户名是否已存在
    const exists = await this.repo.usernameExists(data.username);
    if (exists) {
      throw new ValidationError('用户名已存在');
    }

    // 生成初始密码
    const initialPassword = data.password || this.generateRandomPassword();
    const hashedPassword = await bcrypt.hash(initialPassword, 10);

    // XSS 防护：消毒文本字段
    data.real_name = sanitizeString(data.real_name);

    const id = await this.repo.createUser({
      ...data,
      password: hashedPassword,
    });

    return { id, initialPassword };
  }

  async updateUser(userId: number, data: UpdateUserRequest): Promise<boolean> {
    const user = await this.repo.findById(userId);
    if (!user) {
      throw new ValidationError('用户不存在');
    }

    // XSS 防护：消毒文本字段
    if (data.real_name !== undefined) data.real_name = sanitizeString(data.real_name);

    return this.repo.updateUser(userId, data);
  }

  async deleteUser(userId: number): Promise<boolean> {
    const user = await this.repo.findById(userId);
    if (!user) {
      throw new ValidationError('用户不存在');
    }

    // 不允许删除自己
    // (调用方需要在 routes 中传入当前用户ID进行验证)

    return this.repo.softDeleteUser(userId);
  }

  async resetPassword(userId: number): Promise<string> {
    const user = await this.repo.findById(userId);
    if (!user) {
      throw new ValidationError('用户不存在');
    }

    const newPassword = this.generateRandomPassword();
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.repo.updatePassword(userId, hashedPassword);

    return newPassword;
  }

  /**
   * 用户修改自己的密码
   */
  async changePassword(userId: number, oldPassword: string, newPassword: string): Promise<void> {
    // 验证参数
    if (!oldPassword || !newPassword) {
      throw new ValidationError('旧密码和新密码不能为空');
    }

    if (newPassword.length < 8) {
      throw new ValidationError('新密码长度至少为 8 位');
    }

    // 获取用户（包含密码）
    const user = await this.repo.findByUsername(
      (await this.repo.findById(userId))?.username || ''
    );
    if (!user) {
      throw new ValidationError('用户不存在');
    }

    // 验证旧密码
    const isValid = await bcrypt.compare(oldPassword, (user as any).password);
    if (!isValid) {
      throw new AuthError('当前密码错误');
    }

    // 哈希新密码并更新
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.repo.updatePassword(userId, hashedPassword);

    // 记录审计日志（同步写入，确保安全操作被记录）
    await audit.logSync({
      userId: user.id,
      username: user.real_name,
      userRole: user.role,
      category: 'security',
      action: 'PASSWORD_CHANGE',
      tableName: 'users',
      recordId: String(userId),
      details: '用户修改密码成功',
    });
  }

  // ========== 私有辅助方法 ==========

  /**
   * 检查是否为新设备登录
   */
  private isNewDeviceLogin(sessions: Session[], ip: string, userAgent: string): boolean {
    if (sessions.length === 0) return false;

    // 检查是否有相同 IP 和 User-Agent 的会话
    const knownDevice = sessions.some(s =>
      s.ip_address === ip && s.user_agent === userAgent
    );

    // 检查是否有相同 IP 子网的会话
    const knownSubnet = sessions.some(s =>
      s.ip_address && this.isSameIPSubnet(s.ip_address, ip)
    );

    return !knownDevice && !knownSubnet;
  }

  /**
   * 检查两个 IP 是否在同一子网（/24）
   */
  private isSameIPSubnet(ip1: string, ip2: string): boolean {
    if (!ip1 || !ip2) return false;

    // IPv4 子网比较
    const parts1 = ip1.split('.');
    const parts2 = ip2.split('.');

    if (parts1.length === 4 && parts2.length === 4) {
      // 比较 /24 子网（前三段）
      return parts1[0] === parts2[0] &&
             parts1[1] === parts2[1] &&
             parts1[2] === parts2[2];
    }

    // IPv6 或其他格式：简单比较前半部分
    return ip1.substring(0, Math.floor(ip1.length / 2)) ===
           ip2.substring(0, Math.floor(ip2.length / 2));
  }

  /**
   * 发送新设备登录通知
   * 创建系统通知并通过 WebSocket 实时推送给用户的其他在线设备
   */
  private async notifyNewDeviceLogin(
    user: User,
    existingSessions: Session[],
    newIP: string,
    newUserAgent: string
  ): Promise<void> {
    logger.info(`[Auth] 新设备登录通知 - 用户 ${user.id} (${user.username})`);
    logger.info(`  - IP: ${newIP}`);
    logger.info(`  - User-Agent: ${newUserAgent}`);

    try {
      // 解析设备信息
      const deviceInfo = this.parseUserAgent(newUserAgent);

      // 创建系统通知
      const notificationId = uuidv4();
      const title = '新设备登录通知';
      const content = `检测到您的账户在新设备上登录\n设备: ${deviceInfo}\nIP地址: ${newIP}\n时间: ${new Date().toLocaleString('zh-CN')}`;

      await this.workflowRepo.createNotification({
        id: notificationId,
        user_id: user.id,
        type: 'new_device',
        title,
        content,
        link: '/settings/sessions',
      });

      // WebSocket 实时推送给用户的其他在线设备
      sendToUser(user.id, 'notification', {
        id: notificationId,
        type: 'new_device',
        title,
        content,
        link: '/settings/sessions',
        is_read: false,
        created_at: new Date().toISOString(),
      });

      logger.info(`[Auth] 已发送新设备登录通知给用户 ${user.id}`);
    } catch (error) {
      logger.error('[Auth] 发送新设备登录通知失败: %s', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * 解析 User-Agent 字符串，提取设备和浏览器信息
   */
  private parseUserAgent(userAgent: string): string {
    if (!userAgent) return '未知设备';

    // 简单的 User-Agent 解析
    const browser = userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera|MSIE|Trident)[\/\s](\d+)/i);
    const os = userAgent.match(/(Windows NT|Mac OS X|Linux|Android|iOS)[\/\s]?([\d._]*)/i);

    const browserInfo = browser ? `${browser[1]} ${browser[2]}` : '未知浏览器';
    const osInfo = os ? `${os[1]} ${os[2] || ''}`.replace(/_/g, '.') : '未知系统';

    // 检测设备类型
    let deviceType = '电脑';
    if (/mobile/i.test(userAgent)) {
      deviceType = '手机';
    } else if (/tablet/i.test(userAgent)) {
      deviceType = '平板';
    }

    return `${deviceType} - ${osInfo} - ${browserInfo}`;
  }

  /**
   * 发送会话终止通知
   * 当用户的其他设备会话被终止时发送通知
   */
  private async notifySessionTerminated(
    user: User,
    session: Session,
    reason: string,
    newLoginIP?: string
  ): Promise<void> {
    try {
      // 仅在超过最大会话数场景发送通知
      if (reason !== 'max_sessions_exceeded') {
        return;
      }

      const notificationId = uuidv4();
      const title = '会话已终止';
      const content = `您在另一台设备登录（IP: ${newLoginIP || '未知'}），本设备的登录已失效`;

      await this.workflowRepo.createNotification({
        id: notificationId,
        user_id: user.id,
        type: 'session_terminated',
        title,
        content,
        link: '/settings/profile',
      });

      // WebSocket 推送
      sendToUser(user.id, 'notification', {
        id: notificationId,
        type: 'session_terminated',
        title,
        content,
        link: '/settings/profile',
        is_read: false,
        created_at: new Date().toISOString(),
      });

      logger.info(`[Auth] 已发送会话终止通知给用户 ${user.id}`);
    } catch (error) {
      logger.error('[Auth] 发送会话终止通知失败: %s', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * 发送 IP 变更通知
   * 当检测到同一会话的 IP 地址发生变化时发送通知
   */
  private async notifyIPChange(
    user: User,
    oldIP: string,
    newIP: string
  ): Promise<void> {
    try {
      const notificationId = uuidv4();
      const title = 'IP 地址变更通知';
      const content = `检测到您的登录 IP 地址发生变化:\n原 IP: ${oldIP}\n新 IP: ${newIP}\n时间: ${new Date().toLocaleString('zh-CN')}\n\n如非本人操作，请立即修改密码。`;

      await this.workflowRepo.createNotification({
        id: notificationId,
        user_id: user.id,
        type: 'ip_change',
        title,
        content,
        link: '/settings/security',
      });

      // WebSocket 推送
      sendToUser(user.id, 'notification', {
        id: notificationId,
        type: 'ip_change',
        title,
        content,
        link: '/settings/security',
        is_read: false,
        created_at: new Date().toISOString(),
      });

      logger.info(`[Auth] 已发送 IP 变更通知给用户 ${user.id} (${oldIP} -> ${newIP})`);
    } catch (error) {
      logger.error('[Auth] 发送 IP 变更通知失败: %s', error instanceof Error ? error.message : String(error));
    }
  }

  private generateRandomPassword(): string {
    // 生成 12 位随机密码
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}
