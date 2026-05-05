/**
 * 认证类型重导出
 * 统一从 @/features/auth/types 导出
 *
 * @module types/auth
 * @see @/features/auth/types
 */

export type {
  User,
  UserRole,
  Permission,
  AuthState,
  LoginRequest,
  LoginResponse,
} from '@/features/auth/types';

export {
  ROLE_CONFIG,
  canAccessDataScope,
  canPerformTaskOperation,
  canPerformUserManagement,
  canAccessOrganization,
} from '@/features/auth/types';
