/**
 * 里程碑标记组件
 * 在时间线上方显示里程碑，使用旗帜图标
 */

import { useMemo } from 'react';
import { Flag } from 'lucide-react';
import { TRACK_SPECS } from '@/utils/ganttGeometry';
import { cn } from '@/lib/utils';

interface Milestone {
  id: string;
  name: string;
  targetDate: string;
  status: 'pending' | 'achieved' | 'overdue';
}

interface MilestoneMarkersProps {
  milestones: Milestone[];
  minDate: string;
  dayWidth: number;
  onMilestoneClick?: (milestone: Milestone) => void;
}

export function MilestoneMarkers({
  milestones,
  minDate,
  dayWidth,
  onMilestoneClick,
}: MilestoneMarkersProps) {
  // 计算里程碑位置
  const milestonePositions = useMemo(() => {
    const start = new Date(minDate);
    start.setHours(0, 0, 0, 0);

    return milestones.map((milestone) => {
      const targetDate = new Date(milestone.targetDate);
      targetDate.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor(
        (targetDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      );
      const position = daysDiff * dayWidth + dayWidth / 2;

      const dateLabel = `${targetDate.getMonth() + 1}/${targetDate.getDate()}`;

      return {
        ...milestone,
        position,
        dateLabel,
      };
    });
  }, [milestones, minDate, dayWidth]);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'achieved':
        return {
          icon: 'text-green-500',
          name: 'text-green-600',
          date: 'text-green-500',
          line: 'bg-green-400',
        };
      case 'overdue':
        return {
          icon: 'text-red-500',
          name: 'text-red-600',
          date: 'text-red-500',
          line: 'bg-red-400',
        };
      default:
        return {
          icon: 'text-amber-500',
          name: 'text-amber-600',
          date: 'text-amber-500',
          line: 'bg-amber-400',
        };
    }
  };

  return (
    <div className="relative border-b bg-gray-50" style={{ height: 48 }}>
      {/* 左侧标签 */}
      <div
        className="absolute left-0 top-0 bottom-0 flex items-center px-3 border-r bg-gray-50"
        style={{ width: TRACK_SPECS.defaultLabelWidth }}
      >
        <Flag className="w-4 h-4 text-gray-400 mr-2" />
        <span className="text-xs text-gray-500 font-medium">里程碑</span>
      </div>

      {/* 里程碑标记区域 */}
      <div
        className="absolute top-0 bottom-0 overflow-hidden"
        style={{ left: TRACK_SPECS.defaultLabelWidth, right: 0 }}
      >
        {milestonePositions.map((milestone) => {
          const style = getStatusStyle(milestone.status);

          return (
            <div
              key={milestone.id}
              className="absolute top-0 bottom-0 cursor-pointer group"
              style={{ left: milestone.position }}
              onClick={() => onMilestoneClick?.(milestone)}
            >
              {/* 名称（在横线上方） */}
              <div
                className={cn(
                  'absolute -top-0.5 left-1/2 -translate-x-1/2',
                  'text-xs font-medium whitespace-nowrap',
                  'opacity-0 group-hover:opacity-100 transition-opacity',
                  style.name
                )}
              >
                {milestone.name}
              </div>

              {/* 横线 */}
              <div className="absolute top-4 left-0 right-0 h-px bg-gray-300" />

              {/* 旗帜图标 */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2">
                <Flag className={cn('w-4 h-4', style.icon)} fill="currentColor" />
              </div>

              {/* 日期（在横线下方） */}
              <div
                className={cn(
                  'absolute top-7 left-1/2 -translate-x-1/2',
                  'text-xs whitespace-nowrap',
                  style.date
                )}
              >
                {milestone.dateLabel}
              </div>

              {/* 垂直虚线 */}
              <div
                className={cn('absolute top-10 w-px h-6 opacity-50', style.line)}
                style={{ left: 0 }}
              />

              {/* 悬停提示 */}
              <div className="absolute left-4 top-8 hidden group-hover:block z-50">
                <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-lg">
                  <div className="font-medium">{milestone.name}</div>
                  <div className="text-gray-300 mt-1">目标日期: {milestone.targetDate}</div>
                  <div className="text-gray-400 mt-0.5">
                    状态: {milestone.status === 'achieved' ? '已达成' : milestone.status === 'overdue' ? '已逾期' : '待处理'}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {milestones.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">
            暂无里程碑
          </div>
        )}
      </div>
    </div>
  );
}
