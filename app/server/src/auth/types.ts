/**
 * 认证服务类型定义
 */

/**
 * 用户角色枚举
 */
export enum UserRole {
  ADMIN = 'admin',
  TECH_MANAGER = 'tech_manager',
  DEPT_MANAGER = 'dept_manager',
  ENGINEER = 'engineer'
}

/**
 * 会话状态枚举
 */
export enum SessionStatus {
  ACTIVE = 'active',
  TERMINATED = 'terminated',
  EXPIRED = 'expired'
}

/**
 * 终止原因枚举
 */
export enum TerminationReason {
  USER_LOGOUT = 'user_logout',
  TIMEOUT = 'timeout',
  NEW_LOGIN = 'new_login',
  ADMIN_ACTION = 'admin_action',
  IP_CHANGE = 'ip_change',
  SECURITY = 'security'
}

/**
 * 设备类型枚举
 */
export enum DeviceType {
  DESKTOP = 'desktop',
  MOBILE = 'mobile',
  TABLET = 'tablet',
  UNKNOWN = 'unknown'
}

/**
 * 用户信息接口
 */
export interface User {
  id: number;
  username: string;
  name: string;
  role: UserRole;
  department?: string;
  createdAt: Date;
}

/**
 * 会话信息接口（完整）
 */
export interface Session {
  sessionId: string;
  userId: number;
  username: string;
  role: UserRole;
  ip: string;
  deviceId: string;
  deviceInfo?: string;
  status: SessionStatus;
  createdAt: number;
  lastAccessed: number;
  expiresAt: number;
  terminationReason?: TerminationReason;
  terminationTimestamp?: number;
}

/**
 * 会话信息接口（简化，用于存储）
 */
export interface SessionData {
  userId: number;
  username: string;
  role: UserRole;
  ip: string;
  deviceId: string;
  deviceInfo?: string;
  lastAccessed: number;
  expiresAt: number;
}

/**
 * 登录请求接口
 */
export interface LoginRequest {
  username: string;
  password: string;
  deviceId?: string;
  deviceInfo?: string;
}

/**
 * 登录响应接口
 */
export interface LoginResponse {
  success: boolean;
  session?: Session;
  user?: User;
  message?: string;
}

/**
 * 会话验证响应接口
 */
export interface ValidateResponse {
  valid: boolean;
  session?: Session;
  user?: User;
  reason?: string;
}

/**
 * 权限枚举
 */
export enum Permission {
  // 项目权限
  PROJECT_VIEW = 'project:view',
  PROJECT_CREATE = 'project:create',
  PROJECT_EDIT = 'project:edit',
  PROJECT_DELETE = 'project:delete',

  // 成员权限
  MEMBER_VIEW = 'member:view',
  MEMBER_CREATE = 'member:create',
  MEMBER_EDIT = 'member:edit',
  MEMBER_DELETE = 'member:delete',

  // 任务权限
  TASK_VIEW = 'task:view',
  TASK_CREATE = 'task:create',
  TASK_EDIT = 'task:edit',
  TASK_DELETE = 'task:delete',
  TASK_ASSIGN = 'task:assign',

  // 系统权限
  USER_MANAGE = 'user:manage',
  SYSTEM_CONFIG = 'system:config',
  AUDIT_LOG_VIEW = 'audit_log:view'
}

/**
 * 角色权限映射
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    // 所有权限
    Permission.PROJECT_VIEW, Permission.PROJECT_CREATE, Permission.PROJECT_EDIT, Permission.PROJECT_DELETE,
    Permission.MEMBER_VIEW, Permission.MEMBER_CREATE, Permission.MEMBER_EDIT, Permission.MEMBER_DELETE,
    Permission.TASK_VIEW, Permission.TASK_CREATE, Permission.TASK_EDIT, Permission.TASK_DELETE, Permission.TASK_ASSIGN,
    Permission.USER_MANAGE, Permission.SYSTEM_CONFIG, Permission.AUDIT_LOG_VIEW
  ],
  [UserRole.TECH_MANAGER]: [
    Permission.PROJECT_VIEW, Permission.PROJECT_CREATE, Permission.PROJECT_EDIT,
    Permission.MEMBER_VIEW, Permission.MEMBER_CREATE, Permission.MEMBER_EDIT,
    Permission.TASK_VIEW, Permission.TASK_CREATE, Permission.TASK_EDIT, Permission.TASK_DELETE, Permission.TASK_ASSIGN,
    Permission.AUDIT_LOG_VIEW
  ],
  [UserRole.DEPT_MANAGER]: [
    Permission.PROJECT_VIEW, Permission.PROJECT_EDIT,
    Permission.MEMBER_VIEW, Permission.MEMBER_EDIT,
    Permission.TASK_VIEW, Permission.TASK_EDIT, Permission.TASK_ASSIGN
  ],
  [UserRole.ENGINEER]: [
    Permission.PROJECT_VIEW,
    Permission.MEMBER_VIEW,
    Permission.TASK_VIEW, Permission.TASK_EDIT
  ]
};

/**
 * 会话策略配置接口
 */
export interface SessionPolicy {
  mode: 'single_device' | 'multi_device' | 'multi_device_same_type';
  maxSessionsPerUser: number;
  allowDifferentIPs: boolean;
  ipSubnetPrefix: number;
  allowLocalIPBypass: boolean;
  cookieMaxAge: number; // Cookie最大有效期（毫秒）
  redisTTL: number; // Redis TTL（秒）
}

/**
 * 默认会话策略
 */
export const DEFAULT_SESSION_POLICY: SessionPolicy = {
  mode: 'multi_device',
  maxSessionsPerUser: 10,
  allowDifferentIPs: true,
  ipSubnetPrefix: 24,
  allowLocalIPBypass: true,
  cookieMaxAge: 7 * 24 * 60 * 60 * 1000, // 7天
  redisTTL: 24 * 60 * 60 // 24小时
};

/**
 * 认证配置接口
 */
export interface AuthConfig {
  sessionPolicy: SessionPolicy;
  bcryptRounds: number;
  maxLoginAttempts: number;
  loginAttemptWindow: number; // 登录尝试时间窗口（毫秒）
  lockoutDuration: number; // 锁定时长（毫秒）
}

/**
 * 权限检查结果
 */
export interface PermissionCheckResult {
  granted: boolean;
  reason?: string;
}
