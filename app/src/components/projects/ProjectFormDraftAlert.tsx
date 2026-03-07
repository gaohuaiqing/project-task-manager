/**
 * 项目表单草稿恢复提示组件
 *
 * 功能：
 * 1. 检测是否有可恢复的草稿
 * 2. 显示草稿保存时间
 * 3. 提供恢复和忽略选项
 *
 * @module components/projects/ProjectFormDraftAlert
 */

import React from 'react';
import { AlertCircle, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ProjectFormDraftAlertProps {
  /** 是否显示草稿提示 */
  show: boolean;
  /** 草稿保存时间描述 */
  timeAgo?: string;
  /** 恢复草稿回调 */
  onRestore: () => void;
  /** 忽略草稿回调 */
  onDismiss: () => void;
  /** 自定义类名 */
  className?: string;
}

/**
 * 项目表单草稿恢复提示组件
 */
export function ProjectFormDraftAlert({
  show,
  timeAgo = '之前',
  onRestore,
  onDismiss,
  className,
}: ProjectFormDraftAlertProps) {
  if (!show) return null;

  return (
    <div className={cn(
      "flex items-start gap-3 p-4 rounded-lg border border-amber-500/30 bg-amber-500/10 animate-in slide-in-from-top-2 duration-300",
      className
    )}>
      <div className="flex-shrink-0 w-5 h-5 mt-0.5">
        <AlertCircle className="w-full h-full text-amber-500" />
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-white mb-1">
          发现未保存的草稿
        </h4>
        <p className="text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3" />
            保存于 {timeAgo}
          </span>
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          size="sm"
          variant="outline"
          onClick={onDismiss}
          className="h-7 text-xs"
        >
          忽略
        </Button>
        <Button
          size="sm"
          onClick={onRestore}
          className="h-7 text-xs"
        >
          恢复草稿
        </Button>
      </div>

      <button
        type="button"
        onClick={onDismiss}
        className="flex-shrink-0 text-muted-foreground hover:text-white transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

/**
 * 简化的草稿状态指示器（仅显示状态，不提供操作）
 */
interface ProjectFormDraftIndicatorProps {
  /** 是否有草稿 */
  hasDraft: boolean;
  /** 最后保存时间描述 */
  lastSaved?: string;
  /** 是否正在保存 */
  isSaving?: boolean;
  /** 点击回调（可选，用于显示详细信息） */
  onClick?: () => void;
  /** 自定义类名 */
  className?: string;
}

/**
 * 项目表单草稿状态指示器
 */
export function ProjectFormDraftIndicator({
  hasDraft,
  lastSaved,
  isSaving = false,
  onClick,
  className,
}: ProjectFormDraftIndicatorProps) {
  if (!hasDraft && !isSaving) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded bg-muted text-xs text-muted-foreground cursor-help transition-colors hover:bg-muted/70",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
      title={lastSaved ? `最后保存: ${lastSaved}` : undefined}
    >
      {isSaving ? (
        <>
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span>保存中...</span>
        </>
      ) : (
        <>
          <Clock className="w-3 h-3" />
          <span>已保存 {lastSaved}</span>
        </>
      )}
    </div>
  );
}

/**
 * 草稿管理面板（用于显示和管理所有草稿）
 */
interface ProjectFormDraftsPanelProps {
  /** 草稿列表 */
  drafts: Array<{
    projectId: string | number;
    timeAgo: string;
  }>;
  /** 恢复草稿回调 */
  onRestore: (projectId: string | number) => void;
  /** 删除草稿回调 */
  onDelete: (projectId: string | number) => void;
  /** 清除所有回调 */
  onClearAll: () => void;
  /** 关闭面板回调 */
  onClose: () => void;
  /** 自定义类名 */
  className?: string;
}

/**
 * 项目表单草稿管理面板
 */
export function ProjectFormDraftsPanel({
  drafts,
  onRestore,
  onDelete,
  onClearAll,
  onClose,
  className,
}: ProjectFormDraftsPanelProps) {
  if (drafts.length === 0) {
    return (
      <div className={cn("p-6 text-center text-muted-foreground text-sm", className)}>
        暂无保存的草稿
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* 头部 */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <h3 className="text-sm font-medium text-white">
          保存的草稿 ({drafts.length})
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-7 w-7 p-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* 草稿列表 */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {drafts.map((draft) => (
          <div
            key={draft.projectId}
            className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border hover:border-muted-foreground/50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm text-white truncate">
                {draft.projectId === 'new' ? '新建项目' : `项目 #${draft.projectId}`}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {draft.timeAgo}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRestore(draft.projectId)}
                className="h-7 text-xs"
              >
                恢复
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(draft.projectId)}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* 底部操作 */}
      <div className="pt-3 border-t border-border">
        <Button
          variant="outline"
          size="sm"
          onClick={onClearAll}
          className="w-full text-xs text-muted-foreground hover:text-red-400"
        >
          清除所有草稿
        </Button>
      </div>
    </div>
  );
}

export default ProjectFormDraftAlert;
