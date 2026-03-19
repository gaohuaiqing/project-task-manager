/**
 * 设置模块类型定义
 */

// 用户配置
export interface UserSettings {
  id: number;
  username: string;
  email: string;
  displayName: string;
  avatar: string | null;
  role: UserRole;
  departmentId: number | null;
  departmentName: string | null;
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'admin' | 'tech_manager' | 'department_manager' | 'engineer';

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: 'zh-CN' | 'en-US';
  notifications: NotificationPreferences;
  dashboard: DashboardPreferences;
}

export interface NotificationPreferences {
  email: boolean;
  browser: boolean;
  taskAssigned: boolean;
  taskCompleted: boolean;
  projectUpdated: boolean;
  mentionNotify: boolean;
}

export interface DashboardPreferences {
  defaultView: 'dashboard' | 'projects' | 'tasks';
  showOverdueTasks: boolean;
  compactMode: boolean;
}

// 权限配置
export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
}

export interface RolePermission {
  role: UserRole;
  permissions: string[];
}

// 系统配置
export interface SystemConfig {
  key: string;
  value: string | number | boolean | object;
  description: string;
  category: string;
  updatedAt: string;
  updatedBy: string;
}

// 操作日志
export interface OperationLog {
  id: string;
  userId: number;
  userName: string;
  action: string;
  resource: string;
  resourceId: string | null;
  details: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

// 节假日配置
export interface Holiday {
  id: string;
  date: string;
  name: string;
  type: 'public' | 'company' | 'makeup';
  isWorkingDay: boolean;
  year: number;
}

// 任务类型配置
export interface TaskTypeConfig {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  estimatedHours: number;
  sortOrder: number;
  isActive: boolean;
}

// 项目类型配置
export interface ProjectTypeConfig {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  defaultMilestones: string[];
  sortOrder: number;
  isActive: boolean;
}

// 设置更新请求
export interface UpdateSettingsRequest {
  preferences?: Partial<UserPreferences>;
  displayName?: string;
  avatar?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// 日志查询参数
export interface LogQueryParams {
  userId?: number;
  action?: string;
  resource?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}
