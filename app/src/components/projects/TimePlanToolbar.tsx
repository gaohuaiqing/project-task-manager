/**
 * 时间计划工具栏组件
 *
 * 包含标签页切换和统计信息显示
 * @module components/projects/TimePlanToolbar
 */

import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Calendar, ListTree, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProjectMilestone } from '@/types/project';
import type { WbsTask } from '@/types/wbs';

export interface TimePlanToolbarProps {
  /** 当前活动标签 */
  activeTab: 'milestones' | 'tasks';
  /** 标签切换回调 */
  onTabChange: (tab: 'milestones' | 'tasks') => void;
  /** 里程碑列表 */
  milestones: ProjectMilestone[];
  /** WBS任务列表 */
  tasks: WbsTask[];
  /** 是否有未保存的更改 */
  hasUnsavedChanges?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * 统计里程碑状态
 */
function getMilestoneStats(milestones: ProjectMilestone[]) {
  return {
    total: milestones.length,
    pending: milestones.filter(m => m.status === 'pending').length,
    inProgress: milestones.filter(m => m.status === 'in_progress').length,
    completed: milestones.filter(m => m.status === 'completed').length,
    delayed: milestones.filter(m => m.status === 'delayed').length,
  };
}

/**
 * 统计任务状态
 */
function getTaskStats(tasks: WbsTask[]) {
  return {
    total: tasks.length,
    notStarted: tasks.filter(t => t.status === 'not_started').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    delayed: tasks.filter(t => t.status === 'delayed').length,
  };
}

/**
 * 时间计划工具栏组件
 */
export function TimePlanToolbar({
  activeTab,
  onTabChange,
  milestones,
  tasks,
  hasUnsavedChanges = false,
  disabled = false,
  className,
}: TimePlanToolbarProps) {
  const milestoneStats = getMilestoneStats(milestones);
  const taskStats = getTaskStats(tasks);

  return (
    <div className={cn(
      "flex items-center justify-between p-3 bg-muted/30 border-b border-border",
      className
    )}>
      {/* 标签页切换 */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => onTabChange(v as 'milestones' | 'tasks')}
        className="flex-1"
      >
        <TabsList className="h-9 bg-background">
          <TabsTrigger
            value="milestones"
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            disabled={disabled}
          >
            <Calendar className="w-4 h-4" />
            <span>里程碑</span>
            <Badge variant="secondary" className="ml-1 text-xs">
              {milestoneStats.total}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="tasks"
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            disabled={disabled}
          >
            <ListTree className="w-4 h-4" />
            <span>任务分解</span>
            <Badge variant="secondary" className="ml-1 text-xs">
              {taskStats.total}
            </Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* 状态统计 */}
      <div className="flex items-center gap-4">
        {activeTab === 'milestones' ? (
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-gray-500" />
              <span className="text-muted-foreground">待开始: {milestoneStats.pending}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-muted-foreground">进行中: {milestoneStats.inProgress}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-muted-foreground">已完成: {milestoneStats.completed}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-gray-500" />
              <span className="text-muted-foreground">未开始: {taskStats.notStarted}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-muted-foreground">进行中: {taskStats.inProgress}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-muted-foreground">已完成: {taskStats.completed}</span>
            </div>
          </div>
        )}

        {/* 未保存提示 */}
        {hasUnsavedChanges && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/20 text-amber-600 rounded-md">
            <AlertCircle className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">未保存</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 默认导出
 */
export default TimePlanToolbar;
