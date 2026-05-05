/**
 * 任务变更 Hook
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { taskApi } from '@/lib/api/task.api';
import { queryKeys } from '@/lib/api/query-keys';
import { invalidationBatcher } from '@/lib/utils/invalidationBatcher';
import type { CreateTaskRequest, UpdateTaskRequest, WBSTask } from '../types';

/** 更新任务返回类型 */
type UpdateTaskResult = WBSTask & { needsApproval?: boolean };

/**
 * 创建任务
 */
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTaskRequest) => taskApi.createTask(data),
    onSuccess: async () => {
      // 立即刷新任务列表（创建任务后需要重新计算 WBS 编码）
      await queryClient.invalidateQueries({ queryKey: queryKeys.task.lists() });
      await queryClient.refetchQueries({ queryKey: queryKeys.task.lists() });
      invalidationBatcher.invalidate(queryKeys.analytics.all);
    },
  });
}

/**
 * 更新任务
 * @param id 任务ID（可选，如果未提供则需要在 mutationFn 中传递 { id, data }）
 */
export function useUpdateTask(id?: string) {
  const queryClient = useQueryClient();

  return useMutation<UpdateTaskResult, Error, UpdateTaskRequest | { id: string; data: UpdateTaskRequest }>({
    mutationFn: (input) => {
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
    onMutate: async (input) => {
      const taskId = 'id' in input ? input.id : id;
      if (!taskId) return {};

      await queryClient.cancelQueries({ queryKey: queryKeys.task.detail(taskId) });

      const previousTask = queryClient.getQueryData(queryKeys.task.detail(taskId));

      const updateData = 'data' in input ? input.data : input;
      if (previousTask && typeof updateData === 'object' && updateData !== null) {
        queryClient.setQueryData(queryKeys.task.detail(taskId), (old: unknown) => {
          if (!old || typeof old !== 'object') return old;
          return { ...old, ...updateData };
        });
      }

      return { previousTask, taskId };
    },
    onSuccess: async (result, variables) => {
      const taskId = 'id' in variables ? variables.id : id;
      if (taskId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.task.detail(taskId) });
      }
      // 强制刷新任务列表（更新任务后需要重新计算 WBS 编码）
      await queryClient.invalidateQueries({ queryKey: queryKeys.task.lists() });
      await queryClient.refetchQueries({ queryKey: queryKeys.task.lists() });
      invalidationBatcher.invalidate(queryKeys.analytics.all);

      // 处理审批响应
      if (result.needsApproval) {
        toast.info('已提交审批', {
          description: '您修改的计划字段需要审批，请等待主管审批',
        });
      }
    },
    onError: (_err, _variables, context) => {
      if (context?.previousTask && context?.taskId) {
        queryClient.setQueryData(
          queryKeys.task.detail(context.taskId),
          context.previousTask,
        );
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
      // 立即刷新任务列表（删除任务后需要重新计算 WBS 编码）
      await queryClient.invalidateQueries({ queryKey: queryKeys.task.lists() });
      await queryClient.refetchQueries({ queryKey: queryKeys.task.lists() });
      invalidationBatcher.invalidate(queryKeys.analytics.all);
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

/**
 * 修改任务等级
 */
export function useChangeTaskLevel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, targetLevel }: { taskId: string; targetLevel: number }) =>
      taskApi.changeTaskLevel(taskId, targetLevel),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.task.lists() });
      await queryClient.refetchQueries({ queryKey: queryKeys.task.lists() });
    },
  });
}

/**
 * 拖拽排序
 */
export function useReorderTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, afterTaskId }: { taskId: string; afterTaskId: string | null }) =>
      taskApi.reorderTask(taskId, afterTaskId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.task.lists() });
      await queryClient.refetchQueries({ queryKey: queryKeys.task.lists() });
    },
  });
}
