// app/server/src/core/types/user.types.ts

export type UserRole = 'admin' | 'tech_manager' | 'dept_manager' | 'engineer';

export type GenderType = 'male' | 'female' | 'other';

export type Permission =
  // 组织架构权限（4种）
  | 'DEPT_VIEW' | 'DEPT_CREATE' | 'DEPT_EDIT' | 'DEPT_DELETE'
  // 成员权限（4种）
  | 'MEMBER_VIEW' | 'MEMBER_CREATE' | 'MEMBER_EDIT' | 'MEMBER_DELETE'
  // 项目权限（4种）
  | 'PROJECT_VIEW' | 'PROJECT_CREATE' | 'PROJECT_EDIT' | 'PROJECT_DELETE'
  // 任务权限（5种）
  | 'TASK_VIEW' | 'TASK_CREATE' | 'TASK_EDIT' | 'TASK_DELETE' | 'TASK_ASSIGN'
  // 系统权限（7种）
  | 'USER_MANAGE' | 'SYSTEM_CONFIG' | 'AUDIT_LOG_VIEW'
  | 'CAPABILITY_CONFIG' | 'TASK_TYPE_CONFIG' | 'HOLIDAY_CONFIG' | 'TEAM_AUTHORIZATION';

export interface User {
  id: number;
  username: string;
  real_name: string;
  role: UserRole;
  gender: GenderType | null;
  department_id: number | null;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  is_builtin: boolean;
  deleted_at: Date | null;
  deleted_by: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface Session {
  id: string;
  session_id: string;  // 会话ID（用于cookie）
  user_id: number;
  ip_address: string | null;
  user_agent: string | null;
  status: 'active' | 'expired' | 'terminated';  // 会话状态
  expires_at: Date;
  last_accessed: Date | null;  // 最后访问时间
  created_at: Date;
  terminated_at: Date | null;
  termination_reason: string | null;
}
