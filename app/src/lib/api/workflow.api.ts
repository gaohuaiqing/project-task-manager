/**
 * 工作流模块 API
 * 包含延期记录、计划变更、通知等功能
 */
import apiClient from './client';
import type { ApiResponse } from '@/types/api';

const BASE_PATH = '/workflow';

// ============ 类型定义 ============

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'timeout';

export type ApprovalType = 'delay' | 'reassign' | 'scope_change';

export interface PlanChange {
  id: string;
  taskId: string;
  userId: number;
  changeType: string;
  oldValue: string | null;
  newValue: string | null;
  reason: string;
  status: ApprovalStatus;
  approverId: number | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  // 关联信息
  taskDescription?: string;
  userName?: string;
  approverName?: string;
}

export interface DelayRecord {
  id: string;
  taskId: string;
  delayDays: number;
  reason: string;
  recordedBy: number;
  createdAt: string;
  // 关联信息
  taskDescription?: string;
  recorderName?: string;
}

export interface Approval {
  id: string;
  type: ApprovalType;
  taskId: string;
  taskName: string;
  requesterId: number;
  requesterName: string;
  approverId: number | null;
  approverName: string | null;
  status: ApprovalStatus;
  reason: string;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DelayRequest {
  taskId: string;
  originalEndDate: string;
  newEndDate: string;
  reason: string;
}

export interface ReassignRequest {
  taskId: string;
  originalAssigneeId: number;
  newAssigneeId: number;
  reason: string;
}

export interface CreateDelayRecordRequest {
  delayDays: number;
  reason: string;
}

export type NotificationType =
  | 'approval' | 'approval_result' | 'approval_timeout'
  | 'delay' | 'delay_warning' | 'task_delayed'
  | 'daily_summary' | 'system'
  | 'new_device'          // 新设备登录
  | 'ip_change'           // IP地址变更
  | 'session_terminated'; // 会话异常终止

export interface Notification {
  id: string;
  userId: number;
  type: NotificationType;
  title: string;
  content: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

// ============ 延期记录 API ============

/**
 * 获取任务的延期记录
 */
export async function getDelayRecords(taskId: string): Promise<DelayRecord[]> {
  const response = await apiClient.get<ApiResponse<DelayRecord[]>>(
    `${BASE_PATH}/tasks/${taskId}/delays`
  );
  return response.data;
}

/**
 * 添加延期记录
 */
export async function addDelayRecord(
  taskId: string,
  data: CreateDelayRecordRequest
): Promise<{ id: string }> {
  const response = await apiClient.post<ApiResponse<{ id: string }>>(
    `${BASE_PATH}/tasks/${taskId}/delays`,
    data
  );
  return response.data;
}

// ============ 计划变更 API ============

/**
 * 获取任务的计划变更历史
 */
export async function getPlanChangesByTask(taskId: string): Promise<PlanChange[]> {
  const response = await apiClient.get<ApiResponse<PlanChange[]>>(
    `/tasks/${taskId}/plan-changes`
  );
  return response.data;
}

/**
 * 获取计划变更列表
 */
export async function getPlanChanges(options?: {
  status?: ApprovalStatus;
  projectId?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ items: PlanChange[]; total: number; page: number; pageSize: number; totalPages: number }> {
  const response = await apiClient.get<
    ApiResponse<{ items: PlanChange[]; total: number; page: number; pageSize: number; totalPages: number }>
  >(`${BASE_PATH}/plan-changes`, { params: options });
  return response.data;
}

/**
 * 获取计划变更详情
 */
export async function getPlanChangeById(id: string): Promise<PlanChange | null> {
  const response = await apiClient.get<ApiResponse<PlanChange>>(`${BASE_PATH}/plan-changes/${id}`);
  return response.data;
}

/**
 * 审批通过
 */
export async function approvePlanChange(id: string, rejectionReason?: string): Promise<void> {
  await apiClient.post(`${BASE_PATH}/plan-changes/${id}/approve`, { rejection_reason: rejectionReason });
}

/**
 * 审批驳回
 */
export async function rejectPlanChange(id: string, rejectionReason: string): Promise<void> {
  await apiClient.post(`${BASE_PATH}/plan-changes/${id}/reject`, { rejection_reason: rejectionReason });
}

// ============ 审批 API ============

/**
 * 获取待审批列表
 */
export async function getPendingApprovals(): Promise<PlanChange[]> {
  const response = await apiClient.get<ApiResponse<PlanChange[]>>(`${BASE_PATH}/approvals/pending`);
  return response.data;
}

/**
 * 获取我发起的审批
 */
export async function getMyApprovals(): Promise<Approval[]> {
  const response = await apiClient.get<ApiResponse<Approval[]>>(`${BASE_PATH}/approvals/my`);
  return response.data;
}

/**
 * 提交延期申请
 */
export async function submitDelayRequest(data: DelayRequest): Promise<{ id: string }> {
  const response = await apiClient.post<ApiResponse<{ id: string }>>(`${BASE_PATH}/approvals/delay`, data);
  return response.data;
}

/**
 * 提交转派申请
 */
export async function submitReassignRequest(data: ReassignRequest): Promise<{ id: string }> {
  const response = await apiClient.post<ApiResponse<{ id: string }>>(`${BASE_PATH}/approvals/reassign`, data);
  return response.data;
}

/**
 * 审批通过（旧版兼容）
 */
export async function approveRequest(id: string, comment?: string): Promise<void> {
  await apiClient.post(`${BASE_PATH}/approvals/${id}/approve`, { comment });
}

/**
 * 审批拒绝（旧版兼容）
 */
export async function rejectRequest(id: string, comment: string): Promise<void> {
  await apiClient.post(`${BASE_PATH}/approvals/${id}/reject`, { comment });
}

// ============ 通知 API ============

/**
 * 获取通知列表
 */
export async function getNotifications(options?: {
  unreadOnly?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<{ items: Notification[]; total: number; unreadCount: number }> {
  const response = await apiClient.get<
    ApiResponse<{ items: Notification[]; total: number; unreadCount: number }>
  >(`${BASE_PATH}/notifications`, { params: options });
  return response.data;
}

/**
 * 标记通知已读
 */
export async function markNotificationAsRead(id: string): Promise<void> {
  await apiClient.put(`${BASE_PATH}/notifications/${id}/read`);
}

/**
 * 标记全部已读
 */
export async function markAllNotificationsAsRead(): Promise<{ count: number }> {
  const response = await apiClient.put<ApiResponse<{ count: number }>>(
    `${BASE_PATH}/notifications/read-all`
  );
  return response.data;
}

/**
 * 删除单个通知
 */
export async function deleteNotification(id: string): Promise<void> {
  await apiClient.delete(`${BASE_PATH}/notifications/${id}`);
}

export const workflowApi = {
  getDelayRecords,
  addDelayRecord,
  getPlanChangesByTask,
  getPlanChanges,
  getPlanChangeById,
  approvePlanChange,
  rejectPlanChange,
  getPendingApprovals,
  getMyApprovals,
  submitDelayRequest,
  submitReassignRequest,
  approveRequest,
  rejectRequest,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
};
