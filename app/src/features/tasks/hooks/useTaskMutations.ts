/**
 * 任务变更 Hook
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.task.lists() });
    },
  });
}

/**
 * 更新任务
 */
export function useUpdateTask(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateTaskRequest) => taskApi.updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.task.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.task.lists() });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.task.all() });
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
