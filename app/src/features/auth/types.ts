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
  | 'PROJECT_VIEW' | 'PROJECT_CREATE' | 'PROJECT_EDIT' | 'PROJECT_DELETE' | 'PROJECT_BATCH_DELETE'
  | 'MEMBER_VIEW' | 'MEMBER_CREATE' | 'MEMBER_EDIT' | 'MEMBER_DELETE'
  | 'TASK_VIEW' | 'TASK_CREATE' | 'TASK_EDIT' | 'TASK_DELETE' | 'TASK_ASSIGN' | 'TASK_BATCH_DELETE'
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
  deviceId?: string;
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

/**
 * 角色权限配置
 */
export const ROLE_CONFIG: Record<UserRole, {
  dataScope: 'all' | 'department' | 'team' | 'self';
  canCreateProject: boolean;
  canDeleteProject: boolean;
  canManageUsers: boolean;
  canConfigSystem: boolean;
}> = {
  admin: {
    dataScope: 'all',
    canCreateProject: true,
    canDeleteProject: true,
    canManageUsers: true,
    canConfigSystem: true,
  },
  dept_manager: {
    dataScope: 'department',
    canCreateProject: true,
    canDeleteProject: true,
    canManageUsers: false,
    canConfigSystem: false,
  },
  tech_manager: {
    dataScope: 'team',
    canCreateProject: true,
    canDeleteProject: true,
    canManageUsers: false,
    canConfigSystem: false,
  },
  engineer: {
    dataScope: 'self',
    canCreateProject: false,
    canDeleteProject: false,
    canManageUsers: false,
    canConfigSystem: false,
  },
};

/**
 * 检查用户是否有指定数据范围访问权限
 */
export function canAccessDataScope(user: User | null, scope: 'all' | 'department' | 'team' | 'self'): boolean {
  if (!user) return false;
  const config = ROLE_CONFIG[user.role];
  if (!config) return false;

  const scopeOrder = ['self', 'team', 'department', 'all'];
  const userScopeIndex = scopeOrder.indexOf(config.dataScope);
  const requiredScopeIndex = scopeOrder.indexOf(scope);

  return userScopeIndex >= requiredScopeIndex;
}

/**
 * 检查用户是否可以执行任务操作
 */
export function canPerformTaskOperation(user: User | null, operation: 'create' | 'edit' | 'delete' | 'assign'): boolean {
  if (!user) return false;
  const role = user.role;

  switch (operation) {
    case 'create':
      return role === 'admin' || role === 'dept_manager' || role === 'tech_manager' || role === 'engineer';
    case 'edit':
      return role === 'admin' || role === 'dept_manager' || role === 'tech_manager' || role === 'engineer';
    case 'delete':
      return role === 'admin' || role === 'dept_manager' || role === 'tech_manager';
    case 'assign':
      return role === 'admin' || role === 'dept_manager' || role === 'tech_manager';
    default:
      return false;
  }
}

/**
 * 检查用户是否可以执行用户管理操作
 */
export function canPerformUserManagement(user: User | null, operation: 'assign_role' | 'reset_password' | 'activate' | 'delete'): boolean {
  if (!user) return false;
  return user.role === 'admin';
}

/**
 * 检查用户是否可以访问组织架构
 */
export function canAccessOrganization(user: User | null): boolean {
  if (!user) return false;
  return user.role === 'admin' || user.role === 'dept_manager';
}
