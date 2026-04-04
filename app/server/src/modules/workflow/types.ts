// app/server/src/modules/workflow/types.ts

// ============ 审批相关 ============

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'timeout';

export interface PlanChange {
  id: string;
  task_id: string;
  user_id: number;
  change_type: string;
  old_value: string | null;
  new_value: string | null;
  reason: string;
  status: ApprovalStatus;
  approver_id: number | null;
  approved_at: Date | null;
  rejection_reason: string | null;
  created_at: Date;
  // 关联信息
  task_description?: string;
  user_name?: string;
  approver_name?: string;
}

export interface CreatePlanChangeRequest {
  task_id: string;
  change_type: string;
  old_value?: string | null;
  new_value?: string | null;
  reason: string;
}

export interface ApprovalDecisionRequest {
  approved: boolean;
  rejection_reason?: string;
}

export interface ApprovalQueryOptions {
  status?: ApprovalStatus;
  user_id?: number;
  approver_id?: number;
  project_id?: string;
  page?: number;
  pageSize?: number;
}

// ============ 延期记录相关 ============

export interface DelayRecord {
  id: string;
  task_id: string;
  delay_days: number;
  reason: string;
  recorded_by: number;
  created_at: Date;
  // 关联信息
  task_description?: string;
  recorder_name?: string;
}

export interface CreateDelayRecordRequest {
  delay_days: number;
  reason: string;
}

// ============ 通知相关 ============

export type NotificationType =
  | 'approval' | 'approval_result' | 'approval_timeout'
  | 'delay' | 'delay_warning' | 'task_delayed'
  | 'daily_summary' | 'system'
  | 'new_device'          // 新设备登录
  | 'ip_change'           // IP地址变更
  | 'session_terminated'; // 会话异常终止

export interface Notification {
  id: string;
  user_id: number;
  type: NotificationType;
  title: string;
  content: string;
  link: string | null;
  is_read: boolean;
  created_at: Date;
}

export interface CreateNotificationRequest {
  user_id: number;
  type: NotificationType;
  title: string;
  content: string;
  link?: string;
}
