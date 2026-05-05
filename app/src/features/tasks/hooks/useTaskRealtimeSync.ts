/**
 * WebSocket 任务数据实时同步
 *
 * 订阅后端推送的任务变更事件，直接更新 React Query 缓存，
 * 避免通过 HTTP 全量重请求数据。
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { wsClient } from '@/lib/api/websocket';
import { queryKeys } from '@/lib/api/query-keys';

interface TaskUpdatedEvent {
  taskId: string;
  projectId: string;
  changes: Record<string, unknown>;
}

interface TaskLifecycleEvent {
  taskId: string;
  projectId: string;
}

export function useTaskRealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleTaskUpdated = (data: unknown) => {
      const event = data as TaskUpdatedEvent;
      if (!event?.taskId) return;

      // 直接更新详情缓存
      queryClient.setQueryData(queryKeys.task.detail(event.taskId), (old: unknown) => {
        if (!old || typeof old !== 'object') return old;
        return { ...old, ...event.changes };
      });

      // 标记列表查询为过期（不立即重请求，下次访问时刷新）
      queryClient.invalidateQueries({
        queryKey: queryKeys.task.lists(),
        refetchType: 'none',
      });
    };

    const handleTaskCreated = (data: unknown) => {
      const event = data as TaskLifecycleEvent;
      if (!event?.taskId) return;

      queryClient.invalidateQueries({
        queryKey: queryKeys.task.lists(),
        refetchType: 'active',
      });
    };

    const handleTaskDeleted = (data: unknown) => {
      const event = data as TaskLifecycleEvent;
      if (!event?.taskId) return;

      queryClient.removeQueries({ queryKey: queryKeys.task.detail(event.taskId) });
      queryClient.invalidateQueries({
        queryKey: queryKeys.task.lists(),
        refetchType: 'active',
      });
    };

    const unsub1 = wsClient.subscribe('task_updated', handleTaskUpdated);
    const unsub2 = wsClient.subscribe('task_created', handleTaskCreated);
    const unsub3 = wsClient.subscribe('task_deleted', handleTaskDeleted);

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, [queryClient]);
}
