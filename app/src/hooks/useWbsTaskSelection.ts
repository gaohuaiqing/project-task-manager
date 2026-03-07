/**
 * WBS 任务选择逻辑 Hook
 *
 * 职责：
 * - 管理任务选择状态
 * - 全选/取消全选
 * - 获取选中任务
 */

import { useState, useCallback, useMemo } from 'react';

export function useWbsTaskSelection(taskIds: string[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 选择/取消选择单个任务
  const toggleSelection = useCallback((taskId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }, []);

  // 全选/取消全选
  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === taskIds.length) {
        return new Set();
      }
      return new Set(taskIds);
    });
  }, [taskIds]);

  // 清除选择
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // 是否全选
  const isAllSelected = useMemo(() => {
    return taskIds.length > 0 && selectedIds.size === taskIds.length;
  }, [selectedIds.size, taskIds.length]);

  // 是否部分选中
  const isSomeSelected = useMemo(() => {
    return selectedIds.size > 0 && selectedIds.size < taskIds.length;
  }, [selectedIds.size, taskIds.length]);

  // 检查单个任务是否选中
  const isSelected = useCallback((taskId: string) => {
    return selectedIds.has(taskId);
  }, [selectedIds]);

  return {
    selectedIds,
    selectedCount: selectedIds.size,
    isAllSelected,
    isSomeSelected,
    isSelected,
    toggleSelection,
    toggleAll,
    clearSelection,
  };
}
