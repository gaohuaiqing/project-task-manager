// app/server/src/modules/auth/types.ts
import type { User, Permission } from '../../core/types';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: Omit<User, 'password'>;
  sessionId: string;
  permissions: Permission[];
}

export interface AuthContext {
  user: User;
  sessionId: string;
  permissions: Permission[];
}

export interface PermissionCheckResult {
  hasPermission: boolean;
  reason?: string;
}

// 用户管理相关类型
export interface CreateUserRequest {
  username: string;
  password?: string;
  real_name: string;
  role: string;
  department_id?: number;
  email?: string;
  phone?: string;
}

export interface UpdateUserRequest {
  real_name?: string;
  role?: string;
  department_id?: number | null;
  email?: string;
  phone?: string;
  is_active?: boolean;
}

export interface UserListOptions {
  page?: number;
  pageSize?: number;
  role?: string;
  department_id?: number;
  is_active?: boolean;
  search?: string;
  excludeBuiltin?: boolean;
}

export interface UserListResponse {
  items: User[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
