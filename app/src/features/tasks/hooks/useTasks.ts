/**
 * 任务列表 Hook
 */
import { useQuery } from '@tanstack/react-query';
import { taskApi } from '@/lib/api/task.api';
import { queryKeys } from '@/lib/api/query-keys';
import type { TaskQueryParams } from '../types';

/**
 * 获取任务列表
 */
export function useTasks(params: TaskQueryParams = {}) {
  return useQuery({
    queryKey: queryKeys.task.list(params),
    queryFn: () => taskApi.getTasks(params),
    staleTime: 2 * 60 * 1000, // 2 分钟
  });
}

/**
 * 获取任务详情
 */
export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.task.detail(id!),
    queryFn: () => taskApi.getTask(id!),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * 获取任务统计
 */
export function useTaskStats(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.task.stats(projectId!),
    queryFn: () => taskApi.getTaskStats(projectId!),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * 获取任务进度记录
 */
export function useProgressRecords(taskId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.task.progressRecords(taskId!),
    queryFn: () => taskApi.getProgressRecords(taskId!),
    enabled: !!taskId,
    staleTime: 2 * 60 * 1000,
  });
}
