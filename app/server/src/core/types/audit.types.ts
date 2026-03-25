// app/server/src/core/types/audit.types.ts

/**
 * 审计日志分类
 */
export type AuditCategory = 'security' | 'project' | 'task' | 'org' | 'config';

/**
 * 审计操作类型
 */
export type AuditAction =
  // 安全相关
  | 'LOGIN'
  | 'LOGOUT'
  | 'PASSWORD_CHANGE'
  | 'ROLE_CHANGE'
  // 数据操作
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'ASSIGN'
  | 'ARCHIVE'
  | 'RESTORE'
  // 审批操作
  | 'APPROVE'
  | 'REJECT';

/**
 * 审计日志记录
 */
export interface AuditLog {
  audit_id: string;
  actor_user_id: number | null;
  actor_username: string | null;
  actor_role: string | null;
  category: AuditCategory;
  action: AuditAction | string;
  table_name: string;
  record_id: string | null;
  details: string | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
}

/**
 * 创建审计日志参数
 */
export interface CreateAuditLogParams {
  userId: number;
  username: string;
  userRole: string;
  category: AuditCategory;
  action: AuditAction | string;
  tableName: string;
  recordId?: string;
  details?: string;
  beforeData?: Record<string, unknown> | null;
  afterData?: Record<string, unknown> | null;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * 审计日志查询选项
 */
export interface AuditLogQueryOptions {
  category?: AuditCategory;
  action?: string;
  userId?: number;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

/**
 * 审计日志列表结果
 */
export interface AuditLogListResult {
  items: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
}
