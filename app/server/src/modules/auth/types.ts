// app/server/src/modules/auth/types.ts
import type { User, Permission } from '../../core/types';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: Omit<User, 'password'>;
  sessionId: string;
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
