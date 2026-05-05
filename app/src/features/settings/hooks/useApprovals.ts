/**
 * 审批管理 React Query Hooks
 * 封装工作流审批相关的数据查询和操作
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getPendingApprovals,
  getPlanChanges,
  approvePlanChange,
  rejectPlanChange,
  getApprovalItems,
  approveApprovalItem,
  rejectApprovalItem,
  type ApprovalStatus,
  type ApprovalItem,
} from '@/lib/api/workflow.api';
import { queryKeys } from '@/lib/api/query-keys';

/** 获取待审批列表 */
export function usePendingApprovals() {
  return useQuery({
    queryKey: queryKeys.workflow.pendingApprovals,
    queryFn: getPendingApprovals,
    staleTime: 30 * 1000, // 30秒
  });
}

/** 获取计划变更列表（支持筛选和分页） */
export function usePlanChanges(options?: {
  status?: ApprovalStatus;
  projectId?: string;
  page?: number;
  pageSize?: number;
}) {
  return useQuery({
    queryKey: [...queryKeys.workflow.approvals, options],
    queryFn: () => getPlanChanges(options),
    staleTime: 30 * 1000,
  });
}

/** 审批通过 */
export function useApprovePlanChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => approvePlanChange(id),
    onSuccess: () => {
      toast.success('审批通过', { description: '已通过该变更申请' });
      // 刷新审批相关缓存
      queryClient.invalidateQueries({ queryKey: queryKeys.workflow.pendingApprovals });
      queryClient.invalidateQueries({ queryKey: queryKeys.workflow.approvals });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() });
    },
    onError: (error: Error) => {
      toast.error('操作失败', { description: error.message });
    },
  });
}

/** 审批驳回 */
export function useRejectPlanChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      rejectPlanChange(id, reason),
    onSuccess: () => {
      toast.success('已驳回', { description: '已驳回该变更申请' });
      queryClient.invalidateQueries({ queryKey: queryKeys.workflow.pendingApprovals });
      queryClient.invalidateQueries({ queryKey: queryKeys.workflow.approvals });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() });
    },
    onError: (error: Error) => {
      toast.error('操作失败', { description: error.message });
    },
  });
}

// ============ 审批项分组 Hooks ============

/** 获取分组后的审批项列表 */
export function useApprovalItems(options?: {
  status?: ApprovalStatus;
  projectId?: string;
  userId?: number;
  page?: number;
  pageSize?: number;
}) {
  return useQuery({
    queryKey: [...queryKeys.workflow.approvals, 'items', options],
    queryFn: () => getApprovalItems(options),
    staleTime: 30 * 1000,
  });
}

/** 通过审批项 */
export function useApproveApprovalItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (submissionId: string) => approveApprovalItem(submissionId),
    onSuccess: () => {
      toast.success('审批通过', { description: '已通过该变更申请' });
      queryClient.invalidateQueries({ queryKey: queryKeys.workflow.pendingApprovals });
      queryClient.invalidateQueries({ queryKey: queryKeys.workflow.approvals });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() });
    },
    onError: (error: Error) => {
      toast.error('操作失败', { description: error.message });
    },
  });
}

/** 驳回审批项 */
export function useRejectApprovalItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ submissionId, reason }: { submissionId: string; reason: string }) =>
      rejectApprovalItem(submissionId, reason),
    onSuccess: () => {
      toast.success('已驳回', { description: '已驳回该变更申请' });
      queryClient.invalidateQueries({ queryKey: queryKeys.workflow.pendingApprovals });
      queryClient.invalidateQueries({ queryKey: queryKeys.workflow.approvals });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() });
    },
    onError: (error: Error) => {
      toast.error('操作失败', { description: error.message });
    },
  });
}
