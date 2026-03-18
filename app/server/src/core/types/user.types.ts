// app/server/src/core/types/user.types.ts

export type UserRole = 'admin' | 'tech_manager' | 'dept_manager' | 'engineer';

export type Permission =
  | 'PROJECT_VIEW' | 'PROJECT_CREATE' | 'PROJECT_EDIT' | 'PROJECT_DELETE'
  | 'MEMBER_VIEW' | 'MEMBER_CREATE' | 'MEMBER_EDIT' | 'MEMBER_DELETE'
  | 'TASK_VIEW' | 'TASK_CREATE' | 'TASK_EDIT' | 'TASK_DELETE' | 'TASK_ASSIGN'
  | 'USER_MANAGE' | 'SYSTEM_CONFIG' | 'AUDIT_LOG_VIEW';

export interface User {
  id: number;
  username: string;
  real_name: string;
  role: UserRole;
  department_id: number | null;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Session {
  id: string;
  user_id: number;
  ip_address: string | null;
  user_agent: string | null;
  expires_at: Date;
  created_at: Date;
  terminated_at: Date | null;
  termination_reason: string | null;
}
