// app/server/src/modules/auth/service.ts
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { AuthRepository } from './repository';
import { AuthError, ForbiddenError } from '../../core/errors';
import type { User, Permission } from '../../core/types';
import type { LoginRequest, LoginResponse, AuthContext } from './types';

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

    // 创建会话
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7天
    await this.repo.createSession({
      id: sessionId,
      user_id: user.id,
      ip_address: ip,
      user_agent: userAgent,
      expires_at: expiresAt,
    });

    // 返回不含密码的用户信息
    const { password: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, sessionId };
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
    await this.repo.terminateSession(sessionId, 'user_logout');
  }
}
