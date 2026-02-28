/**
 * 用户账户服务
 *
 * 职责：
 * 1. 统一管理用户账户的 CRUD 操作
 * 2. 支持后端 API 和本地缓存的双层架构
 * 3. 提供安全的密码管理（不存储明文）
 * 4. 支持用户登录、注册、验证
 *
 * 架构说明：
 * - 主数据源：后端数据库（通过 API）
 * - 本地缓存：localStorage（仅作降级方案）
 * - 敏感数据：密码哈希存储，不传输明文
 */

import { CacheManager } from './CacheManager';

// ================================================================
// 类型定义
// ================================================================

export interface UserAccount {
  /** 用户ID（工号） */
  username: string;
  /** 密码哈希（生产环境应使用 bcrypt 等安全哈希） */
  password: string;
  /** 用户角色 */
  role: 'admin' | 'dept_manager' | 'tech_manager' | 'engineer';
  /** 用户姓名 */
  name: string;
  /** 创建时间 */
  createdAt?: number;
  /** 最后登录时间 */
  lastLoginAt?: number;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResult {
  success: boolean;
  message: string;
  user?: UserAccount;
  token?: string;
}

// ================================================================
// 常量定义
// ================================================================

/** 用户数据存储键 */
const USERS_KEY = 'app_users';

/** 默认管理员账户 */
const DEFAULT_ADMIN: UserAccount = {
  username: 'admin',
  password: 'admin123', // TODO: 生产环境应使用哈希
  role: 'admin',
  name: '系统管理员',
  createdAt: Date.now()
};

// ================================================================
// 工具函数
// ================================================================

/**
 * 简单密码哈希（仅用于演示，生产环境应使用 bcrypt）
 */
function hashPassword(password: string): string {
  // 这是一个简单的哈希实现，不应用于生产环境
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转为32位整数
  }
  return `hash_${Math.abs(hash).toString(36)}`;
}

/**
 * 验证密码
 */
function verifyPassword(password: string, hash: string): boolean {
  // 简单实现：直接比较（仅用于演示）
  // 生产环境应使用 bcrypt.compare()
  return hashPassword(password) === hash;
}

/**
 * 生成随机密码
 */
export function generateRandomPassword(length: number = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// ================================================================
// UserAccountService 类
// ================================================================

class UserAccountServiceClass {
  private backendUrl = 'http://localhost:3001/api';

  /**
   * 获取所有用户（优先从后端）
   */
  async getAllUsers(): Promise<Record<string, UserAccount>> {
    // 优先从后端获取
    try {
      const response = await fetch(`${this.backendUrl}/users`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // 缓存到本地
          CacheManager.set(USERS_KEY, result.data, { ttl: 60 * 60 * 1000 });
          return result.data;
        }
      }
    } catch (error) {
      console.warn('[UserAccountService] 从后端获取用户失败，使用本地缓存:', error);
    }

    // 降级：从本地缓存获取
    const cached = CacheManager.get<Record<string, UserAccount>>(USERS_KEY);
    if (cached) {
      return cached;
    }

    // 最后：返回默认管理员
    return { admin: DEFAULT_ADMIN };
  }

  /**
   * 获取单个用户
   */
  async getUser(username: string): Promise<UserAccount | null> {
    const users = await this.getAllUsers();
    return users[username] || null;
  }

  /**
   * 创建用户
   */
  async createUser(user: Omit<UserAccount, 'createdAt'>): Promise<{ success: boolean; message: string }> {
    // 先尝试保存到后端
    try {
      const response = await fetch(`${this.backendUrl}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...user,
          password: hashPassword(user.password), // 存储哈希而非明文
          createdAt: Date.now()
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // 清除缓存
          CacheManager.delete(USERS_KEY);
          return { success: true, message: '用户创建成功' };
        }
      }
    } catch (error) {
      console.warn('[UserAccountService] 后端创建用户失败，保存到本地:', error);
    }

    // 降级：保存到本地
    const users = await this.getAllUsers();
    if (users[user.username]) {
      return { success: false, message: '用户已存在' };
    }

    users[user.username] = {
      ...user,
      password: hashPassword(user.password),
      createdAt: Date.now()
    };

    CacheManager.set(USERS_KEY, users, { ttl: 60 * 60 * 1000 });
    return { success: true, message: '用户创建成功（本地）' };
  }

  /**
   * 更新用户
   */
  async updateUser(username: string, updates: Partial<Omit<UserAccount, 'username' | 'createdAt'>>): Promise<{ success: boolean; message: string }> {
    // 先尝试更新后端
    try {
      const response = await fetch(`${this.backendUrl}/users/${username}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          CacheManager.delete(USERS_KEY);
          return { success: true, message: '用户更新成功' };
        }
      }
    } catch (error) {
      console.warn('[UserAccountService] 后端更新用户失败，更新本地:', error);
    }

    // 降级：更新本地
    const users = await this.getAllUsers();
    if (!users[username]) {
      return { success: false, message: '用户不存在' };
    }

    users[username] = { ...users[username], ...updates };
    CacheManager.set(USERS_KEY, users, { ttl: 60 * 60 * 1000 });
    return { success: true, message: '用户更新成功（本地）' };
  }

  /**
   * 删除用户
   */
  async deleteUser(username: string): Promise<{ success: boolean; message: string }> {
    // 不能删除默认管理员
    if (username === 'admin') {
      return { success: false, message: '不能删除默认管理员' };
    }

    // 先尝试从后端删除
    try {
      const response = await fetch(`${this.backendUrl}/users/${username}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          CacheManager.delete(USERS_KEY);
          return { success: true, message: '用户删除成功' };
        }
      }
    } catch (error) {
      console.warn('[UserAccountService] 后端删除用户失败，删除本地:', error);
    }

    // 降级：从本地删除
    const users = await this.getAllUsers();
    if (!users[username]) {
      return { success: false, message: '用户不存在' };
    }

    delete users[username];
    CacheManager.set(USERS_KEY, users, { ttl: 60 * 60 * 1000 });
    return { success: true, message: '用户删除成功（本地）' };
  }

  /**
   * 验证用户登录
   */
  async validateLogin(credentials: LoginCredentials): Promise<LoginResult> {
    const user = await this.getUser(credentials.username);

    if (!user) {
      return { success: false, message: '用户不存在' };
    }

    // 验证密码
    if (!verifyPassword(credentials.password, user.password)) {
      return { success: false, message: '密码错误' };
    }

    // 更新最后登录时间
    await this.updateUser(credentials.username, { lastLoginAt: Date.now() });

    return {
      success: true,
      message: '登录成功',
      user: {
        ...user,
        password: '' // 不返回密码
      }
    };
  }

  /**
   * 修改密码
   */
  async changePassword(username: string, oldPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const user = await this.getUser(username);

    if (!user) {
      return { success: false, message: '用户不存在' };
    }

    // 验证旧密码
    if (!verifyPassword(oldPassword, user.password)) {
      return { success: false, message: '原密码错误' };
    }

    // 更新密码
    return await this.updateUser(username, { password: hashPassword(newPassword) });
  }

  /**
   * 重置密码（管理员操作）
   */
  async resetPassword(username: string): Promise<{ success: boolean; message: string; newPassword?: string }> {
    const user = await this.getUser(username);

    if (!user) {
      return { success: false, message: '用户不存在' };
    }

    const newPassword = generateRandomPassword();
    const result = await this.updateUser(username, { password: hashPassword(newPassword) });

    if (result.success) {
      return {
        success: true,
        message: `密码已重置，新密码：${newPassword}`,
        newPassword
      };
    }

    return result;
  }

  /**
   * 检查用户名是否存在
   */
  async userExists(username: string): Promise<boolean> {
    const user = await this.getUser(username);
    return user !== null;
  }

  /**
   * 获取用户列表
   */
  async getUserList(): Promise<UserAccount[]> {
    const users = await this.getAllUsers();
    return Object.values(users).map(u => ({ ...u, password: '' }));
  }
}

// ================================================================
// 导出单例
// ================================================================

export const UserAccountService = new UserAccountServiceClass();

// ================================================================
// 兼容旧代码的函数（将逐步废弃）
// ================================================================

/**
 * 获取所有用户（同步版本，仅用于兼容旧代码）
 * @deprecated 使用 UserAccountService.getAllUsers() 替代
 */
export function getUsersSync(): Record<string, UserAccount> {
  return CacheManager.get<Record<string, UserAccount>>(USERS_KEY) || { admin: DEFAULT_ADMIN };
}

/**
 * 保存用户（同步版本，仅用于兼容旧代码）
 * @deprecated 使用 UserAccountService.createUser() 替代
 */
export function saveUsersSync(users: Record<string, UserAccount>): void {
  CacheManager.set(USERS_KEY, users, { ttl: 60 * 60 * 1000 });
}
