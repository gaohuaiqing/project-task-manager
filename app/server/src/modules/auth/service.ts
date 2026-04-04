// app/server/src/modules/auth/service.ts
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { AuthRepository } from './repository';
import { AuthError, ForbiddenError, ValidationError } from '../../core/errors';
import { audit } from '../../core/audit';
import type { User, Permission, Session } from '../../core/types';
import type { LoginRequest, LoginResponse, AuthContext, CreateUserRequest, UpdateUserRequest, UserListOptions, UserListResponse } from './types';

// 会话管理常量
const MAX_SESSIONS_PER_USER = 10;
const SESSION_RENEWAL_THRESHOLD_MINUTES = 5;
const SESSION_DURATION_DAYS = 7;

export class AuthService {
  private repo = new AuthRepository();

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
      // 终止最旧的会话
      const sessionsToTerminate = activeSessions
        .slice(0, activeSessions.length - MAX_SESSIONS_PER_USER + 1)
        .map(s => s.session_id);
      await this.repo.terminateSessions(sessionsToTerminate, 'max_sessions_exceeded');
      console.log(`[Auth] User ${user.id} exceeded max sessions, terminated ${sessionsToTerminate.length} old sessions`);
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

    // 记录登录审计日志
    audit.log({
      userId: user.id,
      username: user.real_name,
      userRole: user.role,
      category: 'security',
      action: 'LOGIN',
      tableName: 'sessions',
      recordId: sessionId,
      details: `用户登录成功，IP: ${ip}`,
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
      console.log(`[Auth] Session ${sessionId.substring(0, 8)}... auto-renewed for user ${user.id}`);
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
        audit.log({
          userId: user.id,
          username: user.real_name,
          userRole: user.role,
          category: 'security',
          action: 'LOGOUT',
          tableName: 'sessions',
          recordId: sessionId,
          details: `用户登出，IP: ${session.ip_address || 'unknown'}`,
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

    // 记录审计日志
    audit.log({
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
   */
  private async notifyNewDeviceLogin(
    user: User,
    existingSessions: Session[],
    newIP: string,
    newUserAgent: string
  ): Promise<void> {
    // 这里可以集成邮件或推送通知服务
    // 目前仅记录日志
    console.log(`[Auth] New device login for user ${user.id} (${user.username})`);
    console.log(`  - IP: ${newIP}`);
    console.log(`  - User-Agent: ${newUserAgent}`);
    console.log(`  - Existing sessions: ${existingSessions.length}`);

    // TODO: 集成邮件通知
    // await emailService.send({
    //   to: user.email,
    //   subject: '新设备登录通知',
    //   body: `检测到您的账户在新设备上登录。IP: ${newIP}`
    // });
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
