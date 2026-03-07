/**
 * 任务 CRUD 操作 Hook
 *
 * 职责：
 * - 任务创建
 * - 任务更新
 * - 任务删除
 * - 状态更新
 */

import { useState, useCallback } from 'react';
import type { WbsTask } from '@/types/wbs';
import { wbsTaskApiService } from '@/services/WbsTaskApiService';

export function useTaskCrud() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 创建任务
  const createTask = useCallback(async (taskData: Partial<WbsTask>) => {
    setIsLoading(true);
    setError(null);
    try {
      const newTask = await wbsTaskApiService.createTask(taskData);
      return newTask;
    } catch (err) {
      const message = err instanceof Error ? err.message : '创建任务失败';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 更新任务
  const updateTask = useCallback(async (taskId: string, taskData: Partial<WbsTask>) => {
    setIsLoading(true);
    setError(null);
    try {
      const updatedTask = await wbsTaskApiService.updateTask(taskId, taskData);
      return updatedTask;
    } catch (err) {
      const message = err instanceof Error ? err.message : '更新任务失败';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 删除任务
  const deleteTask = useCallback(async (taskId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await wbsTaskApiService.deleteTask(taskId);
    } catch (err) {
      const message = err instanceof Error ? err.message : '删除任务失败';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 批量删除任务
  const batchDeleteTasks = useCallback(async (taskIds: string[]) => {
    setIsLoading(true);
    setError(null);
    try {
      await Promise.all(taskIds.map(id => wbsTaskApiService.deleteTask(id)));
    } catch (err) {
      const message = err instanceof Error ? err.message : '批量删除失败';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 更新任务状态
  const updateTaskStatus = useCallback(async (taskId: string, status: string) => {
    return updateTask(taskId, { status });
  }, [updateTask]);

  // 批量更新状态
  const batchUpdateStatus = useCallback(async (taskIds: string[], status: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await Promise.all(
        taskIds.map(id => wbsTaskApiService.updateTask(id, { status }))
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : '批量更新失败';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 批量分配
  const batchAssign = useCallback(async (taskIds: string[], assigneeId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await Promise.all(
        taskIds.map(id => wbsTaskApiService.updateTask(id, { assigneeId }))
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : '批量分配失败';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    createTask,
    updateTask,
    deleteTask,
    batchDeleteTasks,
    updateTaskStatus,
    batchUpdateStatus,
    batchAssign,
  };
}
