/**
 * 里程碑标签页组件
 *
 * 封装ProjectTimelineView，提供独立的里程碑编辑界面
 * @module components/projects/MilestonesTab
 */

import React from 'react';
import { ProjectTimelineView } from './ProjectTimelineView';
import { cn } from '@/lib/utils';
import type { ProjectMilestone } from '@/types/project';

export interface MilestonesTabProps {
  /** 计划开始日期 */
  plannedStartDate: string;
  /** 计划结束日期 */
  plannedEndDate: string;
  /** 里程碑列表 */
  milestones: ProjectMilestone[];
  /** 里程碑变更回调 */
  onMilestonesChange: (milestones: ProjectMilestone[]) => void;
  /** 是否只读 */
  readonly?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * 里程碑标签页组件
 */
export function MilestonesTab({
  plannedStartDate,
  plannedEndDate,
  milestones,
  onMilestonesChange,
  readonly = false,
  className,
}: MilestonesTabProps) {
  return (
    <div className={cn("h-full flex flex-col", className)}>
      {/* 时间线视图 */}
      <div className="flex-1 overflow-auto">
        <ProjectTimelineView
          plannedStartDate={plannedStartDate}
          plannedEndDate={plannedEndDate}
          milestones={milestones}
          onMilestonesChange={onMilestonesChange}
          readonly={readonly}
        />
      </div>

      {/* 提示信息 */}
      {!readonly && (
        <div className="mt-4 p-3 bg-muted/30 border border-border rounded-lg">
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">操作提示：</strong>
            点击时间线可添加里程碑，拖拽里程碑节点可调整日期，右键点击里程碑可进行更多操作
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * 默认导出
 */
export default MilestonesTab;
