// app/server/src/modules/backup/types.ts

// ============ 备份配置相关 ============

export type BackupInterval = 'hourly' | '6hours' | 'daily' | 'weekly' | 'biweekly' | 'monthly';
export type BackupFormat = 'sql' | 'excel' | 'both';
export type RemoteType = 'local' | 'ssh' | 'ftp' | 'smb';

export interface BackupConfig {
  id: string;
  backup_interval: BackupInterval;
  target_path: string;
  retention_count: number;
  backup_format: BackupFormat;
  remote_type: RemoteType | null;
  remote_host: string | null;
  remote_port: number | null;
  remote_username: string | null;
  remote_password_encrypted: string | null;
  enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UpdateBackupConfigDTO {
  backup_interval?: BackupInterval;
  target_path?: string;
  retention_count?: number;
  backup_format?: BackupFormat;
  remote_type?: RemoteType;
  remote_host?: string;
  remote_port?: number;
  remote_username?: string;
  remote_password?: string; // 原始密码，存储时加密
  enabled?: boolean;
}

// ============ 备份记录相关 ============

export type BackupType = 'auto' | 'manual';
export type BackupRecordStatus = 'pending' | 'running' | 'success' | 'failed';

export interface BackupRecord {
  id: string;
  backup_time: Date;
  backup_type: BackupType;
  file_format: BackupFormat;
  sql_file_path: string | null;
  excel_file_path: string | null;
  file_size_bytes: number;
  status: BackupRecordStatus;
  operator_id: number | null;
  error_message: string | null;
  data_snapshot: DataSnapshot | null;
  created_at: Date;
  // 关联信息
  operator_name?: string;
}

export interface DataSnapshot {
  total_projects: number;
  total_tasks: number;
  total_users: number;
  total_departments: number;
  backup_tables: string[];
}

export interface CreateBackupRecordDTO {
  backup_type: BackupType;
  file_format: BackupFormat;
  operator_id?: number;
}

export interface BackupResult {
  record_id: string;
  sql_file_path?: string;
  excel_file_path?: string;
  total_size_bytes: number;
  status: BackupRecordStatus;
  error_message?: string;
}

export interface RestoreResult {
  success: boolean;
  restored_tables: string[];
  error_message?: string;
  pre_restore_backup_id?: string;
}

export interface DownloadResult {
  file_path: string;
  file_name: string;
  file_type: 'sql' | 'excel';
  size: number;
}

// ============ 目录浏览相关 ============

export interface DirectoryInfo {
  path: string;
  name: string;
  is_directory: boolean;
  is_writable: boolean;
  size?: number;
  modified_at?: Date;
}

export interface BrowseDirectoryResult {
  current_path: string;
  parent_path: string | null;
  directories: DirectoryInfo[];
  is_writable: boolean;
  error?: string;
}

// ============ 分页结果 ============

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============ Cron 映射 ============

export const INTERVAL_TO_CRON: Record<BackupInterval, string> = {
  hourly: '0 * * * *',          // 每小时整点
  '6hours': '0 */6 * * *',      // 每6小时
  daily: '0 2 * * *',           // 每天凌晨2点
  weekly: '0 2 * * 0',          // 每周日凌晨2点
  biweekly: '0 2 1,15 * *',     // 每月1日和15日凌晨2点
  monthly: '0 2 1 * *',         // 每月1日凌晨2点
};

// ============ 备份表清单 ============

// 核心业务数据表（不含系统日志和审计记录）
export const BACKUP_TABLES = [
  'users',
  'departments',
  'department_managers',
  'projects',
  'project_members',
  'project_milestones',
  'wbs_tasks',
  'task_assignments',
  'task_dependencies',
  'task_history',
  'progress_records',
  'plan_changes',
  'delay_records',
  'notifications',
  'capability_models',
  'member_capabilities',
  'task_type_model_mapping',
  'timelines',
  'timeline_tasks',
  'task_delay_approvals',
];