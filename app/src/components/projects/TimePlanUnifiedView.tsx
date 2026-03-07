/**
 * 统一的时间计划视图组件
 *
 * 左右分栏布局：里程碑时间线 | WBS任务甘特图
 * 支持拖动分隔线调整左右面板宽度
 *
 * @module components/projects/TimePlanUnifiedView
 */

import React, { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { ProjectTimelineView } from './ProjectTimelineView';
import { ModernGanttView } from '@/components/gantt';
import { QuickActionBar } from './QuickActionBar';
import { Badge } from '@/components/ui/badge';
import { Calendar, ListTree, BarChart3 } from 'lucide-react';
import type { ProjectMilestone } from '@/types/project';
import type { WbsTask } from '@/types/wbs';
import { mergeToTimeNodes, updateWbsTasksFromNodes } from '@/utils/ganttAdapters';

export interface TimePlanUnifiedViewProps {
  /** 计划开始日期 */
  plannedStartDate: string;
  /** 计划结束日期 */
  plannedEndDate: string;
  /** 里程碑列表 */
  milestones: ProjectMilestone[];
  /** WBS任务列表 */
  wbsTasks: WbsTask[];
  /** 里程碑变更回调 */
  onMilestonesChange: (milestones: ProjectMilestone[]) => void;
  /** 任务变更回调 */
  onTasksChange: (tasks: WbsTask[]) => void;
  /** 项目日期范围变更回调（用于自动扩展项目起止时间） */
  onProjectDateRangeChange?: (startDate: string, endDate: string) => void;
  /** 添加里程碑回调 */
  onAddMilestone?: () => void;
  /** 添加任务回调 */
  onAddTask?: () => void;
  /** 自动排列回调 */
  onAutoArrange?: () => void;
  /** 重置更改回调 */
  onReset?: () => void;
  /** 是否只读 */
  readonly?: boolean;
  /** 项目ID（用于创建新任务） */
  projectId?: string | number;
  /** 成员ID（用于创建新任务） */
  memberId?: string;
  /** 自定义类名 */
  className?: string;
}

/**
 * 面板配置
 */
const DEFAULT_PANEL_SIZES = {
  left: 40, // 左侧面板占比 40%
  right: 60, // 右侧面板占比 60%
};

const MIN_PANEL_SIZES = {
  left: 30, // 左侧最小占比 30%
  right: 40, // 右侧最小占比 40%
};

/**
 * 统一的时间计划视图组件
 */
export function TimePlanUnifiedView({
  plannedStartDate,
  plannedEndDate,
  milestones,
  wbsTasks,
  onMilestonesChange,
  onTasksChange,
  onProjectDateRangeChange,
  onAddMilestone,
  onAddTask,
  onAutoArrange,
  onReset,
  readonly = false,
  projectId = 'new',
  memberId = '',
  className,
}: TimePlanUnifiedViewProps) {
  // ==================== 状态管理 ====================
  const [leftPanelSize, setLeftPanelSize] = useState(DEFAULT_PANEL_SIZES.left);

  // ==================== 计算统计信息 ====================
  const stats = {
    totalMilestones: milestones.length,
    completedMilestones: milestones.filter(m => m.status === 'completed').length,
    totalTasks: wbsTasks.filter(t => !t.parentId).length,
    completedTasks: wbsTasks.filter(t => t.status === 'completed' && !t.parentId).length,
    inProgressTasks: wbsTasks.filter(t => t.status === 'in_progress' && !t.parentId).length,
    totalProgress: wbsTasks.length > 0
      ? Math.round(wbsTasks.reduce((sum, t) => sum + (t.progress || 0), 0) / wbsTasks.length)
      : 0,
  };

  // ==================== 面板尺寸变更处理 ====================
  const handlePanelResize = useCallback((sizes: number[]) => {
    setLeftPanelSize(sizes[0]);
  }, []);

  // ==================== 渲染统计信息 ====================
  const renderStats = () => (
    <div className="flex items-center gap-4 text-xs">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">
          <Calendar className="w-3 h-3 mr-1" />
          里程碑: {stats.totalMilestones}
        </Badge>
        {stats.completedMilestones > 0 && (
          <Badge variant="secondary" className="text-xs">
            已完成: {stats.completedMilestones}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">
          <ListTree className="w-3 h-3 mr-1" />
          任务: {stats.totalTasks}
        </Badge>
        {stats.inProgressTasks > 0 && (
          <Badge variant="secondary" className="text-xs bg-blue-500/20 text-blue-600">
            进行中: {stats.inProgressTasks}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">
          <BarChart3 className="w-3 h-3 mr-1" />
          进度: {stats.totalProgress}%
        </Badge>
      </div>
    </div>
  );

  // ==================== 渲染内容 ====================
  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* 统计信息栏 */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-white">
            项目时间线
          </h3>
        </div>
        {renderStats()}
      </div>

      {/* 主内容区 - 可调整大小的左右分栏 */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup
          direction="horizontal"
          className="h-full"
          onLayout={handlePanelResize}
        >
          {/* 左侧面板 - 里程碑时间线 */}
          <ResizablePanel
            defaultSize={DEFAULT_PANEL_SIZES.left}
            minSize={MIN_PANEL_SIZES.left}
            className="overflow-auto"
          >
            <div className="h-full p-6 border-r border-border">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-4 h-4 text-primary" />
                <h4 className="text-sm font-semibold text-white">里程碑时间线</h4>
                {!readonly && (
                  <span className="text-xs text-muted-foreground ml-2">
                    💡 点击时间线添加里程碑，拖拽节点调整日期
                  </span>
                )}
              </div>

              <ProjectTimelineView
                plannedStartDate={plannedStartDate}
                plannedEndDate={plannedEndDate}
                milestones={milestones}
                onMilestonesChange={onMilestonesChange}
                onProjectDateRangeChange={onProjectDateRangeChange}
                readonly={readonly}
                className="mt-4"
              />
            </div>
          </ResizablePanel>

          {/* 分隔线 */}
          <ResizableHandle withHandle />

          {/* 右侧面板 - WBS任务甘特图 */}
          <ResizablePanel
            defaultSize={DEFAULT_PANEL_SIZES.right}
            minSize={MIN_PANEL_SIZES.right}
            className="overflow-hidden"
          >
            <div className="h-full flex flex-col">
              <div className="flex items-center gap-2 px-6 py-3 border-b border-border">
                <BarChart3 className="w-4 h-4 text-primary" />
                <h4 className="text-sm font-semibold text-white">WBS任务甘特图</h4>
                {!readonly && (
                  <span className="text-xs text-muted-foreground ml-2">
                    💡 拖拽任务条调整时间，右键打开菜单
                  </span>
                )}
              </div>

              <div className="flex-1 overflow-hidden">
                <ModernGanttView
                  projectStartDate={plannedStartDate}
                  projectEndDate={plannedEndDate}
                  nodes={useMemo(() => mergeToTimeNodes(wbsTasks, milestones), [wbsTasks, milestones])}
                  onNodesChange={useCallback((nodes) => {
                    onTasksChange(updateWbsTasksFromNodes(wbsTasks, nodes));
                  }, [wbsTasks, onTasksChange])}
                  readonly={readonly}
                  rowHeight={40}
                  className="h-full border-0 rounded-none"
                />
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* 快速操作栏 */}
      {!readonly && (
        <div className="px-6 py-4 border-t border-border bg-muted/20">
          <QuickActionBar
            onAddMilestone={onAddMilestone}
            onAddTask={onAddTask}
            onAutoArrange={onAutoArrange}
            onReset={onReset}
          />
        </div>
      )}
    </div>
  );
}

/**
 * 默认导出
 */
export default TimePlanUnifiedView;
