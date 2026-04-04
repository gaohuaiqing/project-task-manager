/**
 * 认证相关类型定义
 */

/**
 * 用户角色（与后端保持一致）
 */
export type UserRole = 'admin' | 'tech_manager' | 'dept_manager' | 'engineer';

/**
 * 用户权限
 */
export type Permission =
  | 'PROJECT_VIEW' | 'PROJECT_CREATE' | 'PROJECT_EDIT' | 'PROJECT_DELETE'
  | 'MEMBER_VIEW' | 'MEMBER_CREATE' | 'MEMBER_EDIT' | 'MEMBER_DELETE'
  | 'TASK_VIEW' | 'TASK_CREATE' | 'TASK_EDIT' | 'TASK_DELETE' | 'TASK_ASSIGN'
  | 'USER_MANAGE' | 'SYSTEM_CONFIG' | 'AUDIT_LOG_VIEW';

/**
 * 用户信息（前端统一使用 camelCase）
 * 自动转换拦截器会将后端 snake_case 转换为 camelCase
 */
export interface User {
  id: number;
  username: string;
  realName: string | null;
  /** @deprecated 使用 realName */
  name?: string;
  email: string | null;
  phone?: string | null;
  avatar?: string;
  gender?: 'male' | 'female' | 'other' | null;
  role: UserRole;
  permissions: Permission[];
  departmentId?: number | null;
  isActive: number;
  isBuiltin?: boolean;
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
