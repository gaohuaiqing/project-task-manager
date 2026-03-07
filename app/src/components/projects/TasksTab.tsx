/**
 * 任务标签页组件
 *
 * 封装 ModernGanttView，提供独立的WBS任务编辑界面
 * @module components/projects/TasksTab
 */

import React, { useMemo, useCallback } from 'react';
import { ModernGanttView } from '@/components/gantt';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WbsTask } from '@/types/wbs';
import { mergeToTimeNodes, updateWbsTasksFromNodes } from '@/utils/ganttAdapters';

export interface TasksTabProps {
  /** 任务列表 */
  tasks: WbsTask[];
  /** 项目开始日期 */
  projectStartDate: string;
  /** 项目结束日期 */
  projectEndDate: string;
  /** 任务变更回调 */
  onTasksChange: (tasks: WbsTask[]) => void;
  /** 添加任务回调 */
  onAddTask?: () => void;
  /** 是否只读 */
  readonly?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * 任务标签页组件
 */
export function TasksTab({
  tasks,
  projectStartDate,
  projectEndDate,
  onTasksChange,
  onAddTask,
  readonly = false,
  className,
}: TasksTabProps) {
  return (
    <div className={cn("h-full flex flex-col", className)}>
      {/* 工具栏 */}
      {!readonly && onAddTask && (
        <div className="flex items-center justify-between p-2 bg-muted/30 border border-border rounded-t-lg">
          <div className="text-sm text-muted-foreground">
            共 <span className="font-medium text-foreground">{tasks.length}</span> 个任务
          </div>
          <Button size="sm" variant="outline" onClick={onAddTask}>
            <Plus className="w-3 h-3 mr-1" />
            添加任务
          </Button>
        </div>
      )}

      {/* 甘特图视图 */}
      <div className={cn(
        "flex-1 border border-border rounded-lg overflow-hidden",
        !readonly && onAddTask && "rounded-t-none"
      )}>
        {tasks.length > 0 ? (
          <ModernGanttView
            projectStartDate={projectStartDate}
            projectEndDate={projectEndDate}
            nodes={useMemo(() => mergeToTimeNodes(tasks, []), [tasks])}
            onNodesChange={useCallback((nodes) => {
              onTasksChange(updateWbsTasksFromNodes(tasks, nodes));
            }, [tasks, onTasksChange])}
            readonly={readonly}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-8">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <Plus className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-2">暂无任务数据</p>
            <p className="text-xs text-muted-foreground mb-4">
              在甘特图中规划项目任务的详细时间安排
            </p>
            {!readonly && onAddTask && (
              <Button size="sm" variant="outline" onClick={onAddTask}>
                <Plus className="w-3 h-3 mr-1" />
                添加首个任务
              </Button>
            )}
          </div>
        )}
      </div>

      {/* 提示信息 */}
      {!readonly && tasks.length > 0 && (
        <div className="mt-4 p-3 bg-muted/30 border border-border rounded-lg">
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">操作提示：</strong>
            拖拽任务条可调整日期，右键点击任务可进行更多操作（添加子任务、删除、调整层级等）
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * 默认导出
 */
export default TasksTab;
