/**
 * 认证相关类型定义
 */

/**
 * 用户角色
 */
export type UserRole = 'admin' | 'manager' | 'member' | 'viewer';

/**
 * 用户权限
 */
export type Permission =
  | 'project:create'
  | 'project:read'
  | 'project:update'
  | 'project:delete'
  | 'task:create'
  | 'task:read'
  | 'task:update'
  | 'task:delete'
  | 'member:manage'
  | 'permission:manage'
  | 'setting:manage';

/**
 * 用户信息
 */
export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatar?: string;
  role: UserRole;
  permissions: Permission[];
  departmentId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * 登录请求
 */
export interface LoginRequest {
  username: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * 登录响应
 */
export interface LoginResponse {
  user: User;
  message: string;
}

/**
 * 认证状态
 */
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
