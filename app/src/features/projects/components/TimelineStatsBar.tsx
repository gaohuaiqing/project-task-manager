/**
 * 时间线统计信息栏组件
 *
 * @module features/projects/components/TimelineStatsBar
 * @description 顶部统计信息栏，显示时间轴数、任务数、完成数、进度等
 */

import { Progress } from '@/components/ui/progress';
import type { TimelineStats } from '@/types/timeline';
import { cn } from '@/lib/utils';

// ============ Props 定义 ============

export interface TimelineStatsBarProps {
  /** 统计数据 */
  stats: TimelineStats;
  /** 自定义类名 */
  className?: string;
}

// ============ 组件实现 ============

export function TimelineStatsBar({
  stats,
  className,
}: TimelineStatsBarProps) {
  const {
    timelineCount,
    taskCount,
    completedTaskCount,
    progress,
  } = stats;

  return (
    <div
      className={cn(
        'flex items-center gap-6 px-4 py-2',
        'bg-white border-b',
        'text-sm',
        className
      )}
    >
      {/* 时间轴数 */}
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">时间轴数:</span>
        <span className="font-medium">{timelineCount}</span>
      </div>

      {/* 分隔符 */}
      <div className="w-px h-4 bg-gray-200" />

      {/* 任务数 */}
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">任务数:</span>
        <span className="font-medium">{taskCount}</span>
      </div>

      {/* 分隔符 */}
      <div className="w-px h-4 bg-gray-200" />

      {/* 已完成 */}
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">完成:</span>
        <span className="font-medium text-green-600">{completedTaskCount}</span>
      </div>

      {/* 分隔符 */}
      <div className="w-px h-4 bg-gray-200" />

      {/* 进度 */}
      <div className="flex items-center gap-2 flex-1">
        <span className="text-muted-foreground">进度:</span>
        <div className="flex-1 max-w-32">
          <Progress value={progress} className="h-2" />
        </div>
        <span className="font-medium">{progress}%</span>
      </div>
    </div>
  );
}
