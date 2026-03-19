/**
 * 能力模型 Hook
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orgApi } from '@/lib/api/org.api';
import type {
  CapabilityMatrixParams,
  CapabilityAssessmentRequest,
} from '../types';

/**
 * 获取成员能力档案
 */
export function useMemberCapabilities(memberId: number | undefined) {
  return useQuery({
    queryKey: ['org', 'capabilities', memberId],
    queryFn: () => orgApi.getMemberCapabilities(memberId!),
    enabled: !!memberId,
    staleTime: 5 * 60 * 1000, // 5 分钟
  });
}

/**
 * 获取能力矩阵
 */
export function useCapabilityMatrix(params: CapabilityMatrixParams = {}) {
  return useQuery({
    queryKey: ['org', 'capabilities', 'matrix', params],
    queryFn: () => orgApi.getCapabilityMatrix(params),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 获取能力评估历史
 */
export function useCapabilityHistory(memberId: number | undefined) {
  return useQuery({
    queryKey: ['org', 'capabilities', 'history', memberId],
    queryFn: () => orgApi.getCapabilityHistory(memberId!),
    enabled: !!memberId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 提交能力评估
 */
export function useSubmitCapabilityAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CapabilityAssessmentRequest) =>
      orgApi.submitCapabilityAssessment(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['org', 'capabilities', variables.memberId]
      });
      queryClient.invalidateQueries({
        queryKey: ['org', 'capabilities', 'matrix']
      });
    },
  });
}

/**
 * 获取分配建议
 */
export function useAssignmentSuggestions(params: {
  taskId: string | undefined;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ['org', 'assignment', 'suggest', params.taskId],
    queryFn: () => orgApi.getAssignmentSuggestions({ taskId: params.taskId! }),
    enabled: !!params.taskId && (params.enabled ?? true),
    staleTime: 2 * 60 * 1000, // 2 分钟
  });
}

/**
 * 批量获取分配建议
 */
export function useBatchAssignmentSuggestions(taskIds: string[]) {
  return useQuery({
    queryKey: ['org', 'assignment', 'suggest-batch', taskIds],
    queryFn: () => orgApi.batchAssignmentSuggestions({ taskIds }),
    enabled: taskIds.length > 0,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * 获取能力发展计划
 */
export function useDevelopmentPlans(memberId: number | undefined) {
  return useQuery({
    queryKey: ['org', 'development-plans', memberId],
    queryFn: () => orgApi.getDevelopmentPlans(memberId!),
    enabled: !!memberId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 创建能力发展计划
 */
export function useCreateDevelopmentPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof orgApi.createDevelopmentPlan>[0]) =>
      orgApi.createDevelopmentPlan(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['org', 'development-plans', variables.memberId]
      });
    },
  });
}
