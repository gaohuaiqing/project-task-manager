/**
 * 工作流模块 API
 */
import apiClient from './client';
import type { ApiResponse } from '@/types/api';

const BASE_PATH = '/api/workflow';

// 审批状态
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

// 审批类型
export type ApprovalType = 'delay' | 'reassign' | 'scope_change';

// 审批记录
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

// 延期申请
export interface DelayRequest {
  taskId: string;
  originalEndDate: string;
  newEndDate: string;
  reason: string;
}

// 转派申请
export interface ReassignRequest {
  taskId: string;
  originalAssigneeId: number;
  newAssigneeId: number;
  reason: string;
}

// 获取待审批列表
export async function getPendingApprovals(): Promise<Approval[]> {
  const response = await apiClient.get<ApiResponse<Approval[]>>(`${BASE_PATH}/approvals/pending`);
  return response.data.data;
}

// 获取我发起的审批
export async function getMyApprovals(): Promise<Approval[]> {
  const response = await apiClient.get<ApiResponse<Approval[]>>(`${BASE_PATH}/approvals/my`);
  return response.data.data;
}

// 提交延期申请
export async function submitDelayRequest(data: DelayRequest): Promise<{ id: string }> {
  const response = await apiClient.post<ApiResponse<{ id: string }>>(`${BASE_PATH}/approvals/delay`, data);
  return response.data.data;
}

// 提交转派申请
export async function submitReassignRequest(data: ReassignRequest): Promise<{ id: string }> {
  const response = await apiClient.post<ApiResponse<{ id: string }>>(`${BASE_PATH}/approvals/reassign`, data);
  return response.data.data;
}

// 审批通过
export async function approveRequest(id: string, comment?: string): Promise<void> {
  await apiClient.post(`${BASE_PATH}/approvals/${id}/approve`, { comment });
}

// 审批拒绝
export async function rejectRequest(id: string, comment: string): Promise<void> {
  await apiClient.post(`${BASE_PATH}/approvals/${id}/reject`, { comment });
}

export const workflowApi = {
  getPendingApprovals,
  getMyApprovals,
  submitDelayRequest,
  submitReassignRequest,
  approveRequest,
  rejectRequest,
};
