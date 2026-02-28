// 用户角色类型
export type UserRole = 'admin' | 'tech_manager' | 'dept_manager' | 'engineer';

// 数据访问范围（简化为两级权限）
export type DataAccessScope = 'personal' | 'department' | 'all';

// 操作权限类型
export type OperationPermission =
  | 'create_task'
  | 'edit_task'
  | 'delete_task'
  | 'approve_task_plan'
  | 'create_project'
  | 'update_project'
  | 'delete_project'
  | 'assign_user_role'
  | 'reset_user_password'
  | 'force_refresh_task_plan'
  | 'config_tech_manager_scope'
  | 'manage_users'
  | 'manage_holidays'
  | 'manage_task_types'
  | 'manage_permissions'
  | 'manage_organization'
  | 'update_org_structure';

// 权限级别
export type PermissionLevel = 'none' | 'read' | 'write' | 'full';

// 权限配置项
export interface PermissionConfigItem {
  id: string;
  name: string;
  description: string;
  module: string;
  permission: OperationPermission;
  defaultLevels: Record<UserRole, PermissionLevel>;
  createdAt: number;
  updatedAt: number;
}

// 权限配置
export interface PermissionConfig {
  items: PermissionConfigItem[];
  rolePermissions: Record<UserRole, Partial<Record<OperationPermission, PermissionLevel>>>;
  version: number;
  lastUpdated: number;
  lastUpdatedBy: string;
}

// 权限变更历史记录
export interface PermissionHistoryRecord {
  id: string;
  timestamp: number;
  user: string;
  action: string;
  details: string;
  oldValue?: any;
  newValue?: any;
}

// 用户角色信息
export interface UserRoleInfo {
  role: UserRole;
  label: string;
  description: string;
  dataAccessScope: DataAccessScope;
  operationPermissions: OperationPermission[];
}

// 用户信息
export interface User {
  id: string;
  username: string;
  role: UserRole;
  name: string;
  avatar?: string;
}

// 角色配置
export const ROLE_CONFIG: Record<UserRole, UserRoleInfo> = {
  admin: {
    role: 'admin',
    label: '管理员',
    description: '拥有所有权限，可管理所有用户和系统设置',
    dataAccessScope: 'all',
    operationPermissions: [
      'assign_user_role',
      'reset_user_password',
      'force_refresh_task_plan',
      'config_tech_manager_scope',
      'manage_organization'
    ]
  },
  tech_manager: {
    role: 'tech_manager',
    label: '技术经理',
    description: '具备任务创建权限、任务计划制定审批权限、项目更新权限',
    dataAccessScope: 'all',
    operationPermissions: [
      'create_task',
      'approve_task_plan',
      'update_project',
      'force_refresh_task_plan'
    ]
  },
  dept_manager: {
    role: 'dept_manager',
    label: '部门经理',
    description: '具备项目创建权限、项目删除权限',
    dataAccessScope: 'all',
    operationPermissions: [
      'create_project',
      'update_project',
      'delete_project',
      'config_tech_manager_scope',
      'force_refresh_task_plan',
      'manage_organization'
    ]
  },
  engineer: {
    role: 'engineer',
    label: '工程师',
    description: '仅可查看个人任务统计数据及任务详情，无任务创建、修改或审批权限',
    dataAccessScope: 'personal',
    operationPermissions: []
  }
};

// 检查用户是否有特定操作权限
export function hasOperationPermission(user: User | null, permission: OperationPermission): boolean {
  if (!user) return false;
  return ROLE_CONFIG[user.role].operationPermissions.includes(permission);
}

// 检查用户是否可以访问特定数据范围
export function canAccessDataScope(user: User | null, targetScope: DataAccessScope): boolean {
  if (!user) return false;
  const userScope = ROLE_CONFIG[user.role].dataAccessScope;

  const scopeHierarchy: Record<DataAccessScope, number> = {
    'personal': 1,
    'department': 2,
    'all': 3
  };

  return scopeHierarchy[userScope] >= scopeHierarchy[targetScope];
}

// 检查用户是否可以访问特定用户的任务数据
export function canAccessUserTaskData(currentUser: User | null, targetUserId: string): boolean {
  if (!currentUser) return false;

  const userScope = ROLE_CONFIG[currentUser.role].dataAccessScope;

  switch (userScope) {
    case 'all':
      return true;
    case 'personal':
      return currentUser.id === targetUserId;
    default:
      return false;
  }
}

// 检查用户是否可以访问特定项目数据
export function canAccessProjectData(currentUser: User | null): boolean {
  if (!currentUser) return false;

  const userScope = ROLE_CONFIG[currentUser.role].dataAccessScope;

  switch (userScope) {
    case 'all':
      return true;
    case 'personal':
      return false;
    default:
      return false;
  }
}

// 检查用户是否可以执行任务相关操作
export function canPerformTaskOperation(user: User | null, operation: 'create' | 'edit' | 'delete' | 'approve'): boolean {
  if (!user) return false;
  
  const permissionMap: Record<string, OperationPermission> = {
    'create': 'create_task',
    'edit': 'edit_task',
    'delete': 'delete_task',
    'approve': 'approve_task_plan'
  };
  
  return hasOperationPermission(user, permissionMap[operation]);
}

// 检查用户是否可以执行项目相关操作
export function canPerformProjectOperation(user: User | null, operation: 'create' | 'update' | 'delete'): boolean {
  if (!user) return false;
  
  const permissionMap: Record<string, OperationPermission> = {
    'create': 'create_project',
    'update': 'update_project',
    'delete': 'delete_project'
  };
  
  return hasOperationPermission(user, permissionMap[operation]);
}

// 检查用户是否可以强行刷新任务计划
export function canForceRefreshTaskPlan(user: User | null): boolean {
  return hasOperationPermission(user, 'force_refresh_task_plan');
}

// 检查用户是否可以配置技术经理可见范围
export function canConfigTechManagerScope(user: User | null): boolean {
  return hasOperationPermission(user, 'config_tech_manager_scope');
}

// 检查用户是否可以执行用户管理操作
export function canPerformUserManagement(user: User | null, operation: 'assign_role' | 'reset_password'): boolean {
  if (!user) return false;

  const permissionMap: Record<string, OperationPermission> = {
    'assign_role': 'assign_user_role',
    'reset_password': 'reset_user_password'
  };

  return hasOperationPermission(user, permissionMap[operation]);
}

// 检查用户是否可以访问组织架构模块
export function canAccessOrganization(user: User | null): boolean {
  if (!user) return false;

  // 工程师不能访问
  if (user.role === 'engineer') {
    return false;
  }

  // 部门经理、技术经理、管理员可以访问
  return ['dept_manager', 'tech_manager', 'admin'].includes(user.role);
}

// 检查用户是否可以编辑组织架构
export function canEditOrganization(user: User | null): boolean {
  return hasOperationPermission(user, 'manage_organization');
}

// 获取角色颜色
export function getRoleColor(role: UserRole): string {
  const colorMap: Record<UserRole, string> = {
    admin: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
    tech_manager: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
    dept_manager: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
    engineer: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100'
  };
  return colorMap[role];
}

// 获取角色标签
export function getRoleLabel(role: UserRole): string {
  return ROLE_CONFIG[role].label;
}
