/**
 * 任务变更 Hook
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { taskApi } from '@/lib/api/task.api';
import { queryKeys } from '@/lib/api/query-keys';
import type { CreateTaskRequest, UpdateTaskRequest } from '../types';

/**
 * 创建任务
 */
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTaskRequest) => taskApi.createTask(data),
    onSuccess: async () => {
      // 使用 refetchQueries 确保等待数据重新获取完成
      await queryClient.refetchQueries({ queryKey: queryKeys.task.lists() });
      // 刷新仪表板统计
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
    },
  });
}

/**
 * 更新任务
 * @param id 任务ID（可选，如果未提供则需要在 mutationFn 中传递 { id, data }）
 */
export function useUpdateTask(id?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateTaskRequest | { id: string; data: UpdateTaskRequest }) => {
      // 支持两种调用方式：
      // 1. useUpdateTask(taskId).mutate(data) - id 在 hook 参数中
      // 2. useUpdateTask().mutate({ id, data }) - id 在 mutation 参数中
      if ('id' in input && 'data' in input) {
        return taskApi.updateTask(input.id, input.data);
      }
      if (id) {
        return taskApi.updateTask(id, input as UpdateTaskRequest);
      }
      throw new Error('Task ID is required for update');
    },
    onSuccess: async (result, variables) => {
      const taskId = 'id' in variables ? variables.id : id;
      if (taskId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.task.detail(taskId) });
      }
      // 使用 refetchQueries 确保等待数据重新获取完成
      await queryClient.refetchQueries({ queryKey: queryKeys.task.lists() });

      // 处理审批响应
      if (result.needsApproval) {
        toast.info('已提交审批', {
          description: '您修改的计划字段需要审批，请等待主管审批',
        });
      }
    },
  });
}

/**
 * 删除任务
 */
export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => taskApi.deleteTask(id),
    onSuccess: async () => {
      // 使用 refetchQueries 确保等待数据重新获取完成
      await queryClient.refetchQueries({ queryKey: queryKeys.task.lists() });
      // 同时刷新仪表板统计
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
    },
  });
}

/**
 * 添加进度记录
 */
export function useAddProgressRecord(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) => taskApi.addProgressRecord(taskId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.task.progressRecords(taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.task.detail(taskId) });
    },
  });
}
