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
 * 用户信息（与后端字段对齐）
 */
export interface User {
  id: number;
  username: string;
  real_name: string | null;
  name?: string;
  email: string | null;
  phone?: string | null;
  avatar?: string;
  role: UserRole;
  permissions: Permission[];
  department_id?: number | null;
  is_active: number;
  created_at: string;
  updated_at: string;
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
 * 登录响应（与后端返回格式对齐）
 */
export interface LoginResponse {
  success: boolean;
  data: {
    user: User;
    sessionId: string;
    permissions: Permission[];
  };
}

/**
 * 认证状态
 */
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
