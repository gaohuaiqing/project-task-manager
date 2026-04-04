/**
 * 增强时间线视图组件
 *
 * @module features/projects/components/EnhancedTimelineView
 * @description 时间线主容器，符合 REQ_03 需求规范
 *
 * 布局结构 (REQ_03 4.3节):
 * ┌──────────────────────────────────────────────────────────────────┐
 * │  [📍 今天] [添加时间轴] [添加里程碑]      [日][周][月] ──●── 周视图 │
 * ├──────────────────────────────────────────────────────────────────┤
 * │  时间   │  3月  │  4月  │  5月  │                                  │
 * │         │ 1  5  10 15 20 25  1  5  10 15 20 25  1  5  10 15...    │
 * ├─────────┼──────────────────────────────────────────────────────────┤
 * │  里程碑  │   🚩需求评审    🚩设计完成         🚩上线              │
 * │         │     3/15          4/1              5/20                 │
 * ├─────────┼──────────────────────────────────────────────────────────┤
 * │ 需求阶段 │ ████████████░░░░  75%                             │
 * │ 前端开发 │ ████████████████  100%  ✓                         │
 * │ 后端开发 │ ████████░░░░░░░░  50%   ⚠️                         │
 * │ 测试验收 │ ░░░░░░░░░░░░░░░░  0%                               │
 * └─────────┴──────────────────────────────────────────────────────────┘
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { TimelineRuler } from './TimelineRuler';
import { MilestoneRow, MILESTONE_ROW_HEIGHT } from './MilestoneRow';
import { TimelineTrackRow } from './TimelineTrackRow';
import { AddTimelineDialog, type AddTimelineFormData } from './AddTimelineDialog';
import { AddMilestoneDialog } from './AddMilestoneDialog';
import { EditTimelineDialog } from './EditTimelineDialog';
import { EditMilestoneDialog } from './EditMilestoneDialog';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Slider } from '@/components/ui/slider';
import { Plus, Flag } from 'lucide-react';
import type {
  Timeline,
  Holiday,
  Milestone,
  TimelineZoomLevel,
} from '@/types/timeline';
import { TIMELINE_ZOOM_CONFIGS } from '@/types/timeline';
import { useTimelineZoom } from '@/hooks/useTimelineZoom';
import { RULER_SPECS, TRACK_SPECS, generateMonthTicks, generateWeekendColumns, generateHolidayColumns, getDateFromPosition, getDatePosition, getDateCenterPosition } from '@/utils/ganttGeometry';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// ============ 常量定义 ============

/** 左侧固定列宽度 (REQ_03 4.3.2节) */
const LEFT_COLUMN_WIDTH = 180;

/** 工具栏高度 */
const TOOLBAR_HEIGHT = 48;

// ============ Props 定义 ============

export interface EnhancedTimelineViewProps {
  /** 项目ID */
  projectId: string;
  /** 时间线列表 */
  timelines: Timeline[];
  /** 节假日列表 */
  holidays: Holiday[];
  /** 里程碑列表 */
  milestones?: Milestone[];
  /** 项目周期 */
  projectRange?: {
    startDate: string;
    endDate: string;
  };
  /** 里程碑点击回调 */
  onMilestoneClick?: (milestone: { id: string; name: string }) => void;
  /** 时间线创建回调 */
  onTimelineCreate?: (data: { name: string; type: string; startDate: string; endDate: string }) => void;
  /** 时间线更新回调 */
  onTimelineUpdate?: (timelineId: string, data: Partial<Timeline>) => void;
  /** 时间线删除回调 */
  onTimelineDelete?: (timelineId: string) => void;
  /** 里程碑创建回调 */
  onMilestoneCreate?: (data: { name: string; targetDate: string }) => void;
  /** 里程碑更新回调 */
  onMilestoneUpdate?: (milestoneId: string, data: Partial<Milestone>) => void;
  /** 里程碑删除回调 */
  onMilestoneDelete?: (milestoneId: string) => void;
  /** 是否只读 */
  readOnly?: boolean;
  /** 自定义类名 */
  className?: string;
}

// ============ 主组件 ============

export function EnhancedTimelineView({
  projectId,
  timelines,
  holidays,
  milestones = [],
  projectRange,
  onMilestoneClick,
  onTimelineCreate,
  onTimelineUpdate,
  onTimelineDelete,
  onMilestoneCreate,
  onMilestoneUpdate,
  onMilestoneDelete,
  readOnly = false,
  className,
}: EnhancedTimelineViewProps) {
  // ============ 状态管理 ============

  /** 选中的时间线 */
  const [selectedTimeline, setSelectedTimeline] = useState<Timeline | null>(null);

  /** 选中的里程碑 */
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);

  /** 添加时间线对话框 */
  const [addTimelineDialog, setAddTimelineDialog] = useState(false);

  /** 编辑时间线对话框 */
  const [editTimelineDialog, setEditTimelineDialog] = useState(false);

  /** 添加里程碑对话框 */
  const [addMilestoneDialog, setAddMilestoneDialog] = useState(false);

  /** 编辑里程碑对话框 */
  const [editMilestoneDialog, setEditMilestoneDialog] = useState(false);

  /** 删除确认对话框 */
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    type: 'timeline' | 'milestone';
    id: string;
    name: string;
  }>({ open: false, type: 'timeline', id: '', name: '' });

  /** 容器引用 */
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const leftColumnRef = useRef<HTMLDivElement>(null);

  // ============ 缩放管理 (REQ_03 4.11节) ============

  const { config, zoomLevel, setZoom } = useTimelineZoom({
    initialLevel: 'week',
  });

  /** 每天宽度（像素），从缩放配置获取 */
  const dayWidth = config.dayWidth;

  // ============ 计算时间线范围 ============
  // REQ_03 4.5.1: 时间刻度范围由项目的开始日期和结束日期决定

  const { minDate, maxDate } = useMemo(() => {
    // 辅助函数：确保日期为 YYYY-MM-DD 字符串格式
    const normalizeDate = (dateInput: unknown): string => {
      if (!dateInput) return '';

      // 如果是 Date 对象，转换为字符串
      if (dateInput instanceof Date) {
        const year = dateInput.getFullYear();
        const month = String(dateInput.getMonth() + 1).padStart(2, '0');
        const day = String(dateInput.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }

      // 如果是字符串
      if (typeof dateInput === 'string') {
        // 如果是 ISO 格式，提取日期部分
        if (dateInput.includes('T')) {
          return dateInput.split('T')[0];
        }
        return dateInput;
      }

      // 其他类型，尝试转换
      return String(dateInput);
    };

    // 调试：打印原始数据
    console.log('[EnhancedTimelineView] projectRange:', projectRange);
    console.log('[EnhancedTimelineView] timelines:', timelines);
    console.log('[EnhancedTimelineView] timelines[0]:', timelines[0]);

    if (projectRange?.startDate && projectRange?.endDate) {
      const normalizedStart = normalizeDate(projectRange.startDate);
      const normalizedEnd = normalizeDate(projectRange.endDate);
      console.log('[EnhancedTimelineView] normalized projectRange:', { start: normalizedStart, end: normalizedEnd });
      return {
        minDate: normalizedStart,
        maxDate: normalizedEnd,
      };
    }

    if (timelines.length === 0) {
      const today = new Date();
      const start = new Date(today);
      start.setDate(start.getDate() - 30);
      const end = new Date(today);
      end.setDate(end.getDate() + 90);
      return {
        minDate: start.toISOString().split('T')[0],
        maxDate: end.toISOString().split('T')[0],
      };
    }

    // 从 timelines 计算
    const firstTimeline = timelines[0];
    console.log('[EnhancedTimelineView] firstTimeline dates:', {
      startDate: firstTimeline.startDate,
      startDateType: typeof firstTimeline.startDate,
      endDate: firstTimeline.endDate,
      endDateType: typeof firstTimeline.endDate,
    });

    let minDate = normalizeDate(firstTimeline.startDate);
    let maxDate = normalizeDate(firstTimeline.endDate);

    for (const timeline of timelines) {
      const timelineStart = normalizeDate(timeline.startDate);
      const timelineEnd = normalizeDate(timeline.endDate);
      if (timelineStart && timelineStart < minDate) {
        minDate = timelineStart;
      }
      if (timelineEnd && timelineEnd > maxDate) {
        maxDate = timelineEnd;
      }
    }

    console.log('[EnhancedTimelineView] calculated from timelines:', { minDate, maxDate });
    return { minDate, maxDate };
  }, [projectRange, timelines]);

  /** 时间线总宽度 */
  const timelineWidth = useMemo(() => {
    // 使用本地时间解析，避免 UTC 时区偏差
    const [startYear, startMonth, startDay] = minDate.split('-').map(Number);
    const [endYear, endMonth, endDay] = maxDate.split('-').map(Number);
    const start = new Date(startYear, startMonth - 1, startDay);
    const end = new Date(endYear, endMonth - 1, endDay);
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return totalDays * dayWidth;
  }, [minDate, maxDate, dayWidth]);

  /** 今天位置（居中） */
  const todayPosition = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const pos = getDateCenterPosition(todayStr, minDate, dayWidth);
    return pos >= 0 ? pos : null;
  }, [minDate, dayWidth]);

  /** 今天日期字符串 */
  const todayDateString = useMemo(() => {
    const today = new Date();
    return `${today.getMonth() + 1}/${today.getDate()}`;
  }, []);

  /** 月份列背景数据（用于内容区域交替着色） */
  const contentMonthTicks = useMemo(
    () => generateMonthTicks(minDate, maxDate, dayWidth),
    [minDate, maxDate, dayWidth]
  );

  /** 内容区域周末背景列 */
  const contentWeekendColumns = useMemo(
    () => generateWeekendColumns(minDate, maxDate, dayWidth),
    [minDate, maxDate, dayWidth]
  );

  /** 内容区域节假日背景列 */
  const contentHolidayColumns = useMemo(
    () => generateHolidayColumns(minDate, maxDate, dayWidth, holidays),
    [minDate, maxDate, dayWidth, holidays]
  );

  // ============ 缩放级别变化处理 (REQ_03 4.11.6节) ============
  /** 缩放级别变化时保持视口中心锚定 */

  const handleZoomChange = useCallback((newLevel: TimelineZoomLevel) => {
    if (!scrollContainerRef.current || newLevel === zoomLevel) return;

    const container = scrollContainerRef.current;
    const oldDayWidth = config.dayWidth;
    const containerWidth = container.clientWidth;

    // 计算当前视口中心的日期
    const scrollCenter = container.scrollLeft + containerWidth / 2;
    const centerDate = getDateFromPosition(scrollCenter, minDate, oldDayWidth);

    // 切换缩放级别
    setZoom(newLevel);

    // 下一帧重新计算位置并设置滚动
    requestAnimationFrame(() => {
      const newDayWidth = TIMELINE_ZOOM_CONFIGS[newLevel].dayWidth;
      const newCenterPos = getDatePosition(centerDate, minDate, newDayWidth);
      container.scrollLeft = newCenterPos - containerWidth / 2;
    });
  }, [config.dayWidth, minDate, zoomLevel, setZoom]);

  // ============ 滚动同步 ============
  // 左侧固定列与右侧内容区域同步滚动

  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current && leftColumnRef.current) {
      leftColumnRef.current.scrollTop = scrollContainerRef.current.scrollTop;
    }
  }, []);

  // ============ 滚动到今天 ============

  const handleGoToToday = useCallback(() => {
    if (scrollContainerRef.current && todayPosition !== null) {
      const containerWidth = scrollContainerRef.current.clientWidth;
      scrollContainerRef.current.scrollLeft = todayPosition - containerWidth / 2;
    }
  }, [todayPosition]);

  // ============ 页面加载时自动居中"今天" ============
  // REQ_03 4.2.4: 页面加载时自动滚动到今天

  useEffect(() => {
    if (scrollContainerRef.current && todayPosition !== null && timelines.length > 0) {
      const containerWidth = scrollContainerRef.current.clientWidth;
      scrollContainerRef.current.scrollLeft = todayPosition - containerWidth / 2;
    }
  }, []); // 仅首次加载

  // ============ 键盘快捷键 ============

  useEffect(() => {
    if (readOnly) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // T - 滚动到今天
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        handleGoToToday();
        return;
      }

      // 方向键滚动
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        if (scrollContainerRef.current) {
          const scrollAmount = dayWidth * 7;
          scrollContainerRef.current.scrollLeft +=
            e.key === 'ArrowLeft' ? -scrollAmount : scrollAmount;
        }
        return;
      }

      // Escape 取消选中
      if (e.key === 'Escape') {
        setSelectedTimeline(null);
        setSelectedMilestone(null);
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [readOnly, dayWidth, handleGoToToday]);

  // ============ 事件处理 ============

  /** 处理时间线点击 - 打开编辑对话框 */
  const handleTimelineClick = useCallback((timeline: Timeline) => {
    setSelectedTimeline(timeline);
    setEditTimelineDialog(true);
  }, []);

  /** 处理里程碑点击 - 打开编辑对话框 */
  const handleMilestoneClickInternal = useCallback((milestone: Milestone) => {
    setSelectedMilestone(milestone);
    setEditMilestoneDialog(true);
    onMilestoneClick?.({ id: milestone.id, name: milestone.name });
  }, [onMilestoneClick]);

  /** 处理创建时间线 */
  const handleTimelineCreate = useCallback((data: AddTimelineFormData) => {
    onTimelineCreate?.({
      name: data.name,
      type: data.type,
      startDate: data.startDate,
      endDate: data.endDate,
    });
    setAddTimelineDialog(false);
  }, [onTimelineCreate]);

  /** 处理更新时间线 */
  const handleTimelineUpdate = useCallback((data: Partial<Timeline>) => {
    if (selectedTimeline) {
      onTimelineUpdate?.(selectedTimeline.id, data);
      setEditTimelineDialog(false);
      setSelectedTimeline(null);
    }
  }, [selectedTimeline, onTimelineUpdate]);

  /** 处理删除时间线 */
  const handleTimelineDelete = useCallback(() => {
    if (selectedTimeline) {
      setDeleteConfirm({
        open: true,
        type: 'timeline',
        id: selectedTimeline.id,
        name: selectedTimeline.name,
      });
      setEditTimelineDialog(false);
    }
  }, [selectedTimeline]);

  /** 处理创建里程碑 */
  const handleMilestoneCreate = useCallback((data: { name: string; targetDate: string }) => {
    onMilestoneCreate?.(data);
    setAddMilestoneDialog(false);
  }, [onMilestoneCreate]);

  /** 处理更新里程碑 */
  const handleMilestoneUpdate = useCallback((data: Partial<Milestone>) => {
    if (selectedMilestone) {
      onMilestoneUpdate?.(selectedMilestone.id, data);
      setEditMilestoneDialog(false);
      setSelectedMilestone(null);
    }
  }, [selectedMilestone, onMilestoneUpdate]);

  /** 处理删除里程碑 */
  const handleMilestoneDelete = useCallback(() => {
    if (selectedMilestone) {
      setDeleteConfirm({
        open: true,
        type: 'milestone',
        id: selectedMilestone.id,
        name: selectedMilestone.name,
      });
      setEditMilestoneDialog(false);
    }
  }, [selectedMilestone]);

  /** 确认删除 */
  const handleConfirmDelete = useCallback(() => {
    if (deleteConfirm.type === 'timeline') {
      onTimelineDelete?.(deleteConfirm.id);
    } else {
      onMilestoneDelete?.(deleteConfirm.id);
    }
    setDeleteConfirm({ open: false, type: 'timeline', id: '', name: '' });
    setSelectedTimeline(null);
    setSelectedMilestone(null);
  }, [deleteConfirm, onTimelineDelete, onMilestoneDelete]);

  /** 取消删除 */
  const handleCancelDelete = useCallback(() => {
    setDeleteConfirm({ open: false, type: 'timeline', id: '', name: '' });
  }, []);

  // ============ 渲染 ============

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex flex-col h-full bg-card border rounded-lg overflow-hidden',
        className
      )}
    >
      {/* 工具栏 - REQ_03 4.6节 */}
      <div
        className="flex items-center justify-between px-4 border-b bg-muted/50"
        style={{ height: TOOLBAR_HEIGHT }}
      >
        {/* 操作按钮 - REQ_03 4.6.1/4.6.2/4.6.3节 */}
        <div className="flex items-center gap-2">
          {/* 📍 今天按钮 */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleGoToToday}
            className="gap-1.5 h-8 font-medium"
            title="定位到今天 (T)"
          >
            📍 今天
          </Button>

          {!readOnly && (
            <>
              {/* 添加时间轴按钮 */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddTimelineDialog(true)}
                className="gap-1.5 h-8 text-blue-600 hover:bg-blue-50"
              >
                <Plus className="h-4 w-4" />
                添加时间轴
              </Button>

              {/* 添加里程碑按钮 */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddMilestoneDialog(true)}
                className="gap-1.5 h-8 text-amber-600 hover:bg-amber-50"
              >
                <Flag className="h-4 w-4" />
                添加里程碑
              </Button>
            </>
          )}
        </div>

        {/* 缩放控件 - REQ_03 4.11.4节 */}
        <div className="flex items-center gap-3">
          {/* ToggleGroup 日/周/月切换 */}
          <ToggleGroup
            type="single"
            value={zoomLevel}
            onValueChange={(value) => value && handleZoomChange(value as TimelineZoomLevel)}
            className="border rounded-md"
          >
            <ToggleGroupItem
              value="day"
              className="text-xs px-3 data-[state=on]:bg-blue-100 data-[state=on]:text-blue-700"
            >
              日
            </ToggleGroupItem>
            <ToggleGroupItem
              value="week"
              className="text-xs px-3 data-[state=on]:bg-blue-100 data-[state=on]:text-blue-700"
            >
              周
            </ToggleGroupItem>
            <ToggleGroupItem
              value="month"
              className="text-xs px-3 data-[state=on]:bg-blue-100 data-[state=on]:text-blue-700"
            >
              月
            </ToggleGroupItem>
          </ToggleGroup>

          {/* 缩放滑块 */}
          <div className="flex items-center gap-2">
            <Slider
              min={0}
              max={2}
              step={1}
              value={[zoomLevel === 'month' ? 0 : zoomLevel === 'week' ? 1 : 2]}
              onValueChange={([v]) => handleZoomChange(['month', 'week', 'day'][v] as TimelineZoomLevel)}
              className="w-20"
            />
            <span className="text-xs text-gray-500 w-12">{config.label}</span>
          </div>
        </div>
      </div>

      {/* 主体区域 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧固定列 - REQ_03 4.3.2节 */}
        <div
          ref={leftColumnRef}
          className="flex-shrink-0 border-r bg-muted/30 overflow-y-hidden"
          style={{ width: LEFT_COLUMN_WIDTH }}
        >
          {/* 表头 - 对齐时间刻度尺高度 */}
          <div
            className="px-3 border-b bg-muted/50 text-sm font-semibold text-foreground flex items-center"
            style={{ height: RULER_SPECS.height }}
          >
            时间轴
          </div>

          {/* 里程碑标签行 - 对齐里程碑内容区 */}
          <div
            className="px-3 border-b bg-muted/30 flex items-center"
            style={{ height: MILESTONE_ROW_HEIGHT }}
          >
            <Flag className="w-4 h-4 text-muted-foreground mr-2 flex-shrink-0" />
            <span className="text-sm text-muted-foreground font-medium truncate">里程碑</span>
          </div>

          {/* 时间轴标签列表 */}
          {timelines.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              暂无时间轴
            </div>
          ) : (
            timelines.map((timeline) => (
              <div
                key={timeline.id}
                className={cn(
                  'px-3 border-b flex items-center cursor-pointer hover:bg-accent transition-colors',
                  selectedTimeline?.id === timeline.id && 'bg-accent'
                )}
                style={{ height: TRACK_SPECS.height }}
                onClick={() => handleTimelineClick(timeline)}
              >
                <span className="truncate text-sm">{timeline.name}</span>
              </div>
            ))
          )}
        </div>

        {/* 右侧时间线主区域 */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-auto relative"
          onScroll={handleScroll}
        >
          {timelines.length === 0 ? (
            <div className="flex items-center justify-center h-full min-h-64 text-muted-foreground">
              <div className="text-center">
                <div className="text-4xl mb-2">📋</div>
                <div className="text-sm font-medium">暂无时间轴</div>
                <div className="text-xs mt-1">点击上方"添加时间轴"按钮开始</div>
              </div>
            </div>
          ) : (
            <div className="relative" style={{ width: timelineWidth }}>
              {/* 月份交替背景列 - 覆盖内容区域 */}
              {contentMonthTicks.map((month, i) => {
                const isOdd = (month.year * 12 + month.month) % 2 === 1;
                return (
                  <div
                    key={`content-month-bg-${i}`}
                    className={cn('absolute top-0 bottom-0', isOdd ? 'bg-muted/30' : '')}
                    style={{
                      left: month.position,
                      width: month.width,
                    }}
                  />
                );
              })}

              {/* 周末背景列 - 覆盖内容区域 */}
              {contentWeekendColumns.map((col, i) => (
                <div
                  key={`content-weekend-${i}`}
                  className="absolute top-0 bottom-0 bg-muted/50"
                  style={{
                    left: col.start,
                    width: col.width,
                  }}
                />
              ))}

              {/* 节假日背景列 - 覆盖内容区域 */}
              {contentHolidayColumns.map((col, i) => (
                <div
                  key={`content-holiday-${i}`}
                  className="absolute top-0 bottom-0 bg-red-50/50 dark:bg-red-900/20"
                  style={{
                    left: col.start,
                    width: col.width,
                  }}
                  title={col.name}
                />
              ))}

              {/* 时间刻度尺 */}
              <TimelineRuler
                minDate={minDate}
                maxDate={maxDate}
                holidays={holidays}
                dayWidth={dayWidth}
                width={timelineWidth}
                zoomLevel={zoomLevel}
              />

              {/* 里程碑行 */}
              <MilestoneRow
                milestones={milestones}
                minDate={minDate}
                dayWidth={dayWidth}
                width={timelineWidth}
                zoomLevel={zoomLevel}
                onMilestoneClick={handleMilestoneClickInternal}
              />

              {/* 时间轴轨道列表 - REQ_03 4.3.3节 */}
              {timelines.map((timeline) => (
                <TimelineTrackRow
                  key={timeline.id}
                  timeline={timeline}
                  minDate={minDate}
                  dayWidth={dayWidth}
                  zoomLevel={zoomLevel}
                  isSelected={selectedTimeline?.id === timeline.id}
                  readOnly={readOnly}
                  onClick={() => handleTimelineClick(timeline)}
                />
              ))}

              {/* 今天指示线 - REQ_03 4.5.2节 */}
              {todayPosition !== null && (
                <div
                  className="absolute top-0 bottom-0 z-40 pointer-events-none"
                  style={{ left: todayPosition }}
                >
                  {/* 顶部标签 */}
                  <div className="absolute -top-0 left-1/2 -translate-x-1/2 z-50">
                    <div className="flex flex-col items-center">
                      {/* 箭头 */}
                      <div
                        className="w-0 h-0"
                        style={{
                          borderLeft: '6px solid transparent',
                          borderRight: '6px solid transparent',
                          borderTop: '8px solid rgb(239, 68, 68)',
                        }}
                      />
                      {/* 标签 */}
                      <div className="px-2 py-0.5 rounded text-xs font-semibold bg-red-500 text-white whitespace-nowrap shadow-sm">
                        今天 {todayDateString}
                      </div>
                    </div>
                  </div>
                  {/* 垂直红色虚线 - 2px宽度 */}
                  <div
                    className="absolute top-8 bottom-0 w-0.5"
                    style={{
                      left: '50%',
                      transform: 'translateX(-50%)',
                      backgroundColor: 'rgb(239, 68, 68)',
                      backgroundImage: 'linear-gradient(to bottom, rgb(239, 68, 68) 50%, transparent 50%)',
                      backgroundSize: '2px 8px',
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 快捷键提示 */}
      <div className="px-4 py-1.5 text-xs text-muted-foreground border-t border-border/50 hidden lg:block">
        快捷键: T 今天 | ←→ 滚动 | 双击编辑
      </div>

      {/* 添加时间线对话框 */}
      <AddTimelineDialog
        open={addTimelineDialog}
        onClose={() => setAddTimelineDialog(false)}
        onSubmit={handleTimelineCreate}
        projectStartDate={projectRange?.startDate}
        projectEndDate={projectRange?.endDate}
      />

      {/* 编辑时间线对话框 */}
      <EditTimelineDialog
        open={editTimelineDialog}
        onClose={() => {
          setEditTimelineDialog(false);
          setSelectedTimeline(null);
        }}
        onSubmit={handleTimelineUpdate}
        onDelete={handleTimelineDelete}
        timeline={selectedTimeline}
        projectStartDate={projectRange?.startDate}
        projectEndDate={projectRange?.endDate}
      />

      {/* 添加里程碑对话框 */}
      <AddMilestoneDialog
        open={addMilestoneDialog}
        onClose={() => setAddMilestoneDialog(false)}
        onSubmit={handleMilestoneCreate}
        projectStartDate={projectRange?.startDate}
        projectEndDate={projectRange?.endDate}
      />

      {/* 编辑里程碑对话框 */}
      <EditMilestoneDialog
        open={editMilestoneDialog}
        onClose={() => {
          setEditMilestoneDialog(false);
          setSelectedMilestone(null);
        }}
        onSubmit={handleMilestoneUpdate}
        onDelete={handleMilestoneDelete}
        milestone={selectedMilestone}
        projectStartDate={projectRange?.startDate}
        projectEndDate={projectRange?.endDate}
      />

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => !open && handleCancelDelete()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              确认删除{deleteConfirm.type === 'timeline' ? '时间轴' : '里程碑'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除{deleteConfirm.type === 'timeline' ? '时间轴' : '里程碑'} "{deleteConfirm.name}" 吗？
              {deleteConfirm.type === 'timeline' && ' 该时间轴下的所有任务也将被删除。'}
              此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
