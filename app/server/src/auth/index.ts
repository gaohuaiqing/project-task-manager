/**
 * 认证服务 - 导出入口
 *
 * 使用示例：
 * ```typescript
 * import { authService, authSessionManager, permissionService } from './auth/index.js';
 *
 * // 登录
 * const result = await authService.login({ username, password }, ip);
 *
 * // 验证会话（刷新免登录）
 * const valid = await authService.validateSession(sessionId);
 *
 * // 权限检查
 * const hasPermission = await permissionService.hasPermission(userId, role, Permission.PROJECT_EDIT);
 * ```
 */

// 导出认证服务
export { AuthService, authService } from './AuthService.js';

// 导出会话管理器
export { AuthSessionManager, authSessionManager } from './SessionManager.js';

// 导出权限服务
export {
  PermissionService,
  permissionService,
  requirePermission,
  requireRole
} from './PermissionService.js';

// 导出类型定义
export {
  UserRole,
  SessionStatus,
  TerminationReason,
  DeviceType,
  Permission,
  ROLE_PERMISSIONS,
  DEFAULT_SESSION_POLICY,
  type User,
  type Session,
  type SessionData,
  type LoginRequest,
  type LoginResponse,
  type ValidateResponse,
  type PermissionCheckResult,
  type SessionPolicy,
  type AuthConfig
} from './types.js';

// 默认导出认证服务
export { default } from './AuthService.js';
