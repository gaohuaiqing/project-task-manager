/**
 * 冲突解决管理 Hook
 *
 * 功能：
 * 1. 监听实时同步服务的冲突事件
 * 2. 自动显示冲突对话框
 * 3. 管理冲突解决状态
 * 4. 处理重试逻辑
 */

import React from 'react';
import { useState, useCallback, useEffect } from 'react';
import { realTimeSyncService } from '../services/RealTimeSyncService';
import type { ConflictListener, DataConflictMessage } from '../services/RealTimeSyncService';
import type { ConflictData, ConflictResolutionResult } from '../components/shared/DataConflictDialog';
import { DataConflictDialog } from '../components/shared/DataConflictDialog';

interface UseConflictResolutionOptions {
  // 数据类型标签（用于显示）
  dataTypeLabels?: Record<string, string>;
  // 冲突解决回调
  onResolved?: (result: ConflictResolutionResult) => void;
  // 冲突取消回调
  onCanceled?: () => void;
}

// ================================================================
// Hook
// ================================================================

export function useConflictResolution(options: UseConflictResolutionOptions = {}) {
  const { dataTypeLabels = {}, onResolved, onCanceled } = options;

  const [currentConflict, setCurrentConflict] = useState<ConflictData | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pendingConflicts, setPendingConflicts] = useState<ConflictData[]>([]);

  // 处理冲突事件
  const handleConflict: ConflictListener = useCallback((message: DataConflictMessage) => {
    const conflictData: ConflictData = {
      dataType: message.data.dataType,
      dataId: message.data.dataId,
      message: message.data.message,
      serverData: message.data.serverData,
      serverVersion: message.data.serverVersion
    };

    // 如果已有正在处理的冲突，加入队列
    if (currentConflict) {
      setPendingConflicts((prev) => [...prev, conflictData]);
    } else {
      setCurrentConflict(conflictData);
      setIsDialogOpen(true);
    }
  }, [currentConflict]);

  // 注册冲突监听器
  useEffect(() => {
    const unsubscribe = realTimeSyncService.onConflict(handleConflict);

    return () => {
      unsubscribe();
    };
  }, [handleConflict]);

  // 处理冲突解决
  const handleResolve = useCallback((result: ConflictResolutionResult) => {
    if (!currentConflict) return;

    // 调用外部回调
    onResolved?.(result);

    // 处理队列中的下一个冲突
    const nextConflict = pendingConflicts[0];

    if (nextConflict) {
      setCurrentConflict(nextConflict);
      setPendingConflicts((prev) => prev.slice(1));
    } else {
      setCurrentConflict(null);
      setIsDialogOpen(false);
    }
  }, [currentConflict, pendingConflicts, onResolved]);

  // 处理冲突取消
  const handleCancel = useCallback(() => {
    onCanceled?.();

    // 处理队列中的下一个冲突
    const nextConflict = pendingConflicts[0];

    if (nextConflict) {
      setCurrentConflict(nextConflict);
      setPendingConflicts((prev) => prev.slice(1));
    } else {
      setCurrentConflict(null);
      setIsDialogOpen(false);
    }
  }, [pendingConflicts, onCanceled]);

  // 手动触发冲突解决（用于测试）
  const triggerConflict = useCallback((conflict: ConflictData) => {
    setCurrentConflict(conflict);
    setIsDialogOpen(true);
  }, []);

  // 渲染冲突对话框
  const renderConflictDialog = useCallback(() => {
    return (
      <DataConflictDialog
        isOpen={isDialogOpen}
        conflict={currentConflict}
        onResolve={handleResolve}
        onCancel={handleCancel}
        dataTypeLabels={dataTypeLabels}
      />
    );
  }, [isDialogOpen, currentConflict, handleResolve, handleCancel, dataTypeLabels]);

  return {
    // 状态
    currentConflict,
    isDialogOpen,
    pendingConflictsCount: pendingConflicts.length,

    // 方法
    triggerConflict,
    renderConflictDialog
  };
}

// ================================================================
// Provider 组件（用于全局冲突管理）
// ================================================================

interface ConflictResolutionProviderProps {
  children: React.ReactNode;
  dataTypeLabels?: Record<string, string>;
  onResolved?: (result: ConflictResolutionResult) => void;
  onCanceled?: () => void;
}

export function ConflictResolutionProvider({
  children,
  dataTypeLabels,
  onResolved,
  onCanceled
}: ConflictResolutionProviderProps) {
  const { renderConflictDialog } = useConflictResolution({
    dataTypeLabels,
    onResolved,
    onCanceled
  });

  return (
    <>
      {children}
      {renderConflictDialog()}
    </>
  );
}

export default useConflictResolution;
