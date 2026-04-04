/**
 * 里程碑行组件
 *
 * @module features/projects/components/MilestoneRow
 * @description 显示里程碑标记，符合 REQ_03 3.4节规范
 *
 * 状态显示规范 (REQ_03 3.3节):
 * - 未完成: 灰色旗帜
 * - 已完成: 绿色旗帜 + ✓
 *
 * 缩放适配 (REQ_03 4.11.7节):
 * - 日视图/周视图: 显示完整名称 + 日期
 * - 月视图: 仅显示缩短名称，标签过窄时显示 Tooltip
 */

import { useMemo } from 'react';
import { Flag, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Milestone, TimelineZoomLevel } from '@/types/timeline';
import { getDateCenterPosition, normalizeDate } from '@/utils/ganttGeometry';

// ============ 常量 ============

/** 行高度 */
export const MILESTONE_ROW_HEIGHT = 60;

// ============ Props 定义 ============

export interface MilestoneRowProps {
  /** 里程碑列表 */
  milestones?: Milestone[];
  /** 时间线开始日期 */
  minDate: string;
  /** 每天像素宽度 */
  dayWidth: number;
  /** 总宽度 */
  width?: number;
  /** 缩放级别 */
  zoomLevel?: TimelineZoomLevel;
  /** 里程碑点击回调 */
  onMilestoneClick?: (milestone: Milestone) => void;
  /** 里程碑双击回调 */
  onMilestoneDoubleClick?: (milestone: Milestone) => void;
}

// ============ 组件实现 ============

export function MilestoneRow({
  milestones = [],
  minDate,
  dayWidth,
  width,
  zoomLevel = 'week',
  onMilestoneClick,
  onMilestoneDoubleClick,
}: MilestoneRowProps) {
  // 规范化 minDate
  const normalizedMinDate = normalizeDate(minDate) || minDate;

  // 计算里程碑位置
  const milestoneData = useMemo(() => {
    return milestones.map((milestone) => {
      // 规范化目标日期
      const normalizedTargetDate = normalizeDate(milestone.targetDate);

      // 如果日期无效，跳过
      if (!normalizedTargetDate) {
        console.warn('[MilestoneRow] 无效的目标日期:', milestone.targetDate);
        return null;
      }

      // 解析日期用于显示
      const [year, month, day] = normalizedTargetDate.split('-').map(Number);
      const targetDate = new Date(year, month - 1, day);

      // 使用统一的中心位置计算函数
      const position = getDateCenterPosition(normalizedTargetDate, normalizedMinDate, dayWidth);

      // 格式化日期标签 (M/D 格式)
      const dateLabel = `${targetDate.getMonth() + 1}/${targetDate.getDate()}`;

      // 是否已完成
      const isCompleted = milestone.isCompleted || milestone.status === 'achieved';

      return {
        ...milestone,
        targetDate: normalizedTargetDate,
        position,
        dateLabel,
        isCompleted,
      };
    }).filter(Boolean); // 过滤掉 null 值
  }, [milestones, normalizedMinDate, dayWidth]);

  // 根据缩放级别决定显示策略
  const isMonthView = zoomLevel === 'month';
  const isDayView = zoomLevel === 'day';

  // 如果没有里程碑，不显示此行
  if (milestones.length === 0) {
    return null;
  }

  return (
    <div
      className="relative border-b border-border bg-muted/30 transition-all duration-200 ease-out"
      style={{
        height: MILESTONE_ROW_HEIGHT,
        width: width || '100%',
        zIndex: 50,
      }}
    >
      {/* 横向基线 */}
      <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-border" />

      {/* 里程碑标记 */}
      {milestoneData.map((milestone) => {
        if (!milestone) return null;

        // 月视图下缩短名称
        const displayName = isMonthView
          ? milestone.name.length > 6 ? milestone.name.slice(0, 6) + '…' : milestone.name
          : milestone.name;

        return (
          <div
            key={milestone.id}
            className={cn(
              'absolute top-0 bottom-0 cursor-pointer group',
              'flex flex-col items-center',
              'hover:z-[200] z-10'  // 悬停时提升到最上层
            )}
            style={{
              left: milestone.position,
              transform: 'translateX(-50%)',
              minWidth: isMonthView ? 40 : 80,
            }}
            onClick={() => onMilestoneClick?.(milestone)}
            onDoubleClick={() => onMilestoneDoubleClick?.(milestone)}
          >
            {/* 里程碑标签 - 顶部 */}
            <div
              className={cn(
                'absolute left-1/2 -translate-x-1/2 z-10',
                'flex items-center gap-1.5 px-2.5 py-1 rounded-lg',
                'text-xs font-semibold whitespace-nowrap',
                'shadow-md border transition-all duration-200',
                milestone.isCompleted
                  ? 'bg-green-500 dark:bg-green-600 text-white border-green-600 dark:border-green-700 shadow-green-200/50 dark:shadow-green-900/50'
                  : 'bg-card text-foreground border-border shadow-muted-foreground/10'
              )}
              style={{
                top: 4,
              }}
            >
              <Flag
                className={cn(
                  isMonthView ? 'w-3 h-3' : 'w-4 h-4',
                  milestone.isCompleted ? 'text-white' : 'text-muted-foreground'
                )}
              />
              <span className={isMonthView ? 'text-[10px]' : ''}>{displayName}</span>
              {milestone.isCompleted && !isMonthView && (
                <Check className="w-3.5 h-3.5 ml-0.5" />
              )}
            </div>

            {/* 垂直线 - 中间 */}
            <div
              className={cn(
                'absolute w-0.5',
                milestone.isCompleted ? 'bg-green-400 dark:bg-green-500' : 'bg-border'
              )}
              style={{
                top: '50%',
                height: isMonthView ? 10 : 16,
              }}
            />

            {/* 日期标签 - 底部 */}
            <div
              className={cn(
                'absolute bottom-1.5 left-1/2 -translate-x-1/2 z-10',
                'text-xs font-medium whitespace-nowrap',
                milestone.isCompleted ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground',
                isMonthView && 'text-[10px]'
              )}
            >
              {milestone.dateLabel}
            </div>

            {/* 悬停提示 - 使用 Portal 效果，确保不被遮挡 */}
            <div
              className={cn(
                'absolute left-1/2 -translate-x-1/2 z-[100]',
                'opacity-0 invisible group-hover:opacity-100 group-hover:visible',
                'transition-opacity duration-150'
              )}
              style={{
                top: '100%',
                marginTop: '4px',
              }}
            >
              <div className="bg-popover text-popover-foreground text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-xl border border-border">
                <div className="font-medium">{milestone.name}</div>
                <div className="text-muted-foreground mt-1">
                  目标日期: {milestone.targetDate}
                </div>
                <div className="text-muted-foreground/70 mt-0.5">
                  状态: {milestone.isCompleted ? '已完成' : '未完成'}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
