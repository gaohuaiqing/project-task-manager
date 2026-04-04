# 时间线UI模块重构实施计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按照REQ_03第4节规范重构时间线UI组件，实现里程碑三行布局、添加今天按钮、优化统计栏样式。

**Architecture:** 渐进式重构4个组件（MilestoneMarkers、TimelineToolbar、TimelineStatsBar、MultiTimelineView），保持接口兼容，只改UI布局和样式。

**Tech Stack:** React 19, TypeScript, Tailwind CSS, shadcn/ui, Lucide Icons

---

## 文件结构

### 需要修改的文件

| 文件 | 改动类型 | 职责 |
|------|----------|------|
| `app/src/features/projects/components/MilestoneMarkers.tsx` | 重构布局 | 里程碑三行显示 |
| `app/src/features/projects/components/TimelineToolbar.tsx` | 添加功能 | 添加今天按钮 |
| `app/src/features/projects/components/TimelineStatsBar.tsx` | 优化样式 | 增强可读性 |
| `app/src/features/projects/components/MultiTimelineView.tsx` | 调整布局 | 空状态+回调传递 |

### 不修改的文件

| 文件 | 原因 |
|------|------|
| `app/src/types/timeline.ts` | 保持接口兼容 |
| `app/src/utils/ganttGeometry.ts` | 工具函数不变 |
| `app/src/hooks/useTimeline*.ts` | hooks不变 |
| `app/src/features/projects/components/TimelineRuler.tsx` | 已符合规范 |
| `app/src/features/projects/components/TimelineTrack.tsx` | 已符合规范 |
| `app/src/features/projects/components/TimelineTaskBar.tsx` | 已符合规范 |

---

## Chunk 1: MilestoneMarkers 重构

### Task 1: 重构里程碑布局

**Files:**
- Modify: `app/src/features/projects/components/MilestoneMarkers.tsx`

- [ ] **Step 1: 重构MilestoneMarkers组件布局**

将单行布局改为三行布局：名称在横线上、横线+旗帜、日期在横线下。

```tsx
/**
 * 里程碑标记组件
 * 在时间线上方显示里程碑，使用旗帜图标
 *
 * 布局规范 (REQ_03 4.1节):
 * - 名称在横线上方
 * - 横线+旗帜在中间
 * - 日期在横线下方
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
  completionPercentage?: number;
}

interface MilestoneMarkersProps {
  milestones: Milestone[];
  minDate: string;
  dayWidth: number;
  onMilestoneClick?: (milestone: Milestone) => void;
}

// 行高度常量
const MILESTONE_ROW_HEIGHT = 52;
const NAME_LAYER_HEIGHT = 18;
const LINE_LAYER_HEIGHT = 16;
const DATE_LAYER_HEIGHT = 18;

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

  // 获取状态样式
  const getStatusStyle = (milestone: Milestone) => {
    const { status, completionPercentage = 0 } = milestone;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(milestone.targetDate);
    const isOverdue = targetDate < today;

    // 根据完成百分比和日期计算状态
    if (completionPercentage >= 100) {
      return {
        icon: 'text-green-500',
        name: 'text-green-600',
        date: 'text-green-500',
        line: 'bg-green-400',
      };
    }
    if (completionPercentage < 100 && isOverdue) {
      return {
        icon: 'text-red-500',
        name: 'text-red-600',
        date: 'text-red-500',
        line: 'bg-red-400',
      };
    }
    if (completionPercentage > 0 && completionPercentage < 100) {
      return {
        icon: 'text-blue-500',
        name: 'text-blue-600',
        date: 'text-blue-500',
        line: 'bg-blue-400',
      };
    }
    return {
      icon: 'text-gray-400',
      name: 'text-gray-500',
      date: 'text-gray-400',
      line: 'bg-gray-300',
    };
  };

  return (
    <div
      className="relative border-b bg-gray-50"
      style={{ height: MILESTONE_ROW_HEIGHT }}
    >
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
        {/* 横线层 - 在中间 */}
        <div
          className="absolute left-0 right-0 flex items-center"
          style={{ top: NAME_LAYER_HEIGHT, height: LINE_LAYER_HEIGHT }}
        >
          <div className="w-full h-px bg-gray-300" />
        </div>

        {/* 里程碑标记点 */}
        {milestonePositions.map((milestone) => {
          const style = getStatusStyle(milestone);

          return (
            <div
              key={milestone.id}
              className="absolute top-0 bottom-0 cursor-pointer group"
              style={{ left: milestone.position }}
              onClick={() => onMilestoneClick?.(milestone)}
            >
              {/* 名称层 - 在横线上方 */}
              <div
                className={cn(
                  'absolute left-1/2 -translate-x-1/2',
                  'text-[11px] font-medium whitespace-nowrap',
                  'truncate max-w-20',
                  style.name
                )}
                style={{ top: 2, height: NAME_LAYER_HEIGHT }}
              >
                {milestone.name}
              </div>

              {/* 旗帜 - 在横线上 */}
              <div
                className="absolute left-1/2 -translate-x-1/2"
                style={{ top: NAME_LAYER_HEIGHT + 1 }}
              >
                <Flag className={cn('w-3.5 h-3.5', style.icon)} fill="currentColor" />
              </div>

              {/* 日期层 - 在横线下方 */}
              <div
                className={cn(
                  'absolute left-1/2 -translate-x-1/2',
                  'text-[11px] whitespace-nowrap',
                  style.date
                )}
                style={{ top: NAME_LAYER_HEIGHT + LINE_LAYER_HEIGHT + 2 }}
              >
                {milestone.dateLabel}
              </div>

              {/* 垂直虚线 */}
              <div
                className={cn('absolute w-px opacity-50', style.line)}
                style={{
                  left: 0,
                  top: NAME_LAYER_HEIGHT + LINE_LAYER_HEIGHT,
                  height: 8,
                }}
              />

              {/* 悬停提示 */}
              <div className="absolute left-4 top-8 hidden group-hover:block z-50">
                <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-lg">
                  <div className="font-medium">{milestone.name}</div>
                  <div className="text-gray-300 mt-1">目标日期: {milestone.targetDate}</div>
                  {milestone.completionPercentage !== undefined && (
                    <div className="text-gray-400 mt-0.5">
                      完成度: {milestone.completionPercentage}%
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* 空状态 */}
        {milestones.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">
            暂无里程碑
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 验证里程碑布局**

打开项目管理页面，切换到时间线标签，确认：
1. 里程碑名称显示在横线上方
2. 旗帜图标在横线上
3. 日期显示在横线下方
4. 不同状态的里程碑颜色正确

---

## Chunk 2: TimelineToolbar 重构

### Task 2: 添加今天按钮

**Files:**
- Modify: `app/src/features/projects/components/TimelineToolbar.tsx`

- [ ] **Step 1: 修改TimelineToolbar组件，添加今天按钮**

在缩放控制和任务操作之间添加独立的"📍 今天"按钮。

```tsx
/**
 * 时间线工具栏组件
 *
 * @module features/projects/components/TimelineToolbar
 * @description 底部工具栏，提供缩放、添加任务、今天按钮等功能
 */

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  ZoomIn,
  ZoomOut,
  Plus,
  AlignJustify,
  Download,
  Upload,
  MapPin,
} from 'lucide-react';
import type { TimelineZoomLevel } from '@/types/timeline';
import { cn } from '@/lib/utils';

// ============ Props 定义 ============

export interface TimelineToolbarProps {
  /** 当前缩放级别 */
  zoomLevel: TimelineZoomLevel;
  /** 缩放级别标签 */
  zoomLabel: string;
  /** 放大回调 */
  onZoomIn: () => void;
  /** 缩小回调 */
  onZoomOut: () => void;
  /** 设置缩放级别回调 */
  onSetZoom: (level: TimelineZoomLevel) => void;
  /** 添加任务回调 */
  onAddTask: () => void;
  /** 自动排列回调 */
  onAutoArrange?: () => void;
  /** 导出回调 */
  onExport?: () => void;
  /** 导入回调 */
  onImport?: () => void;
  /** 是否只读 */
  readOnly?: boolean;
  /** 跳转到今天回调 */
  onGoToToday?: () => void;
}

// ============ 组件实现 ============

export function TimelineToolbar({
  zoomLevel,
  zoomLabel,
  onZoomIn,
  onZoomOut,
  onSetZoom,
  onAddTask,
  onAutoArrange,
  onExport,
  onImport,
  readOnly = false,
  onGoToToday,
}: TimelineToolbarProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-4 py-2 h-12',
        'bg-white border-t border-gray-200',
        'text-sm'
      )}
    >
      {/* 缩放控制 */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onZoomOut}
          title="缩小 (-)"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>

        <Select
          value={zoomLevel}
          onValueChange={(value) => onSetZoom(value as TimelineZoomLevel)}
        >
          <SelectTrigger className="w-24 h-8">
            <SelectValue>{zoomLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">日视图</SelectItem>
            <SelectItem value="week">周视图</SelectItem>
            <SelectItem value="month">月视图</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="icon"
          onClick={onZoomIn}
          title="放大 (+)"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* 📍 今天按钮 */}
      {onGoToToday && (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={onGoToToday}
            className="gap-1.5 h-8"
            title="定位到今天 (T)"
          >
            <MapPin className="h-4 w-4" />
            今天
          </Button>
          <Separator orientation="vertical" className="h-6" />
        </>
      )}

      {/* 任务操作 */}
      {!readOnly && (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={onAddTask}
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            添加任务
          </Button>

          {onAutoArrange && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onAutoArrange}
              title="自动排列任务"
            >
              <AlignJustify className="h-4 w-4" />
            </Button>
          )}

          <Separator orientation="vertical" className="h-6" />
        </>
      )}

      {/* 导入导出 */}
      <div className="flex items-center gap-1">
        {onExport && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onExport}
            title="导出"
          >
            <Download className="h-4 w-4" />
          </Button>
        )}

        {onImport && !readOnly && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onImport}
            title="导入"
          >
            <Upload className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* 快捷键提示 */}
      <div className="ml-auto text-xs text-muted-foreground">
        <span className="hidden md:inline">
          快捷键: +/- 缩放 | Delete 删除 | Escape 取消 | T 今天
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 验证今天按钮功能**

打开项目管理页面，切换到时间线标签，确认：
1. 工具栏显示"📍 今天"按钮
2. 点击按钮能滚动到今天位置
3. 快捷键T也能跳转到今天

---

## Chunk 3: TimelineStatsBar 优化

### Task 3: 优化统计栏样式

**Files:**
- Modify: `app/src/features/projects/components/TimelineStatsBar.tsx`

- [ ] **Step 1: 修改TimelineStatsBar组件，优化样式**

增强进度条和数字的可读性。

```tsx
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

// ============ 辅助函数 ============

/**
 * 根据进度值获取进度条颜色
 */
function getProgressColor(progress: number): string {
  if (progress >= 100) return 'bg-green-500';
  if (progress >= 70) return 'bg-blue-600';
  if (progress >= 30) return 'bg-blue-500';
  return 'bg-gray-400';
}

/**
 * 根据进度值获取进度文字颜色
 */
function getProgressTextColor(progress: number): string {
  if (progress >= 100) return 'text-green-600';
  if (progress >= 70) return 'text-blue-600';
  return 'text-foreground';
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
        'flex items-center gap-4 px-4 py-2.5',
        'bg-white border-b border-gray-200',
        'text-sm',
        className
      )}
    >
      {/* 时间轴 */}
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">时间轴:</span>
        <span className="font-semibold">{timelineCount}</span>
      </div>

      {/* 分隔符 */}
      <div className="w-px h-5 bg-gray-300" />

      {/* 任务 */}
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">任务:</span>
        <span className="font-semibold">{taskCount}</span>
      </div>

      {/* 分隔符 */}
      <div className="w-px h-5 bg-gray-300" />

      {/* 已完成 */}
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">完成:</span>
        <span className="font-semibold text-green-600">{completedTaskCount}</span>
      </div>

      {/* 分隔符 */}
      <div className="w-px h-5 bg-gray-300" />

      {/* 进度 */}
      <div className="flex items-center gap-2 flex-1">
        <span className="text-muted-foreground">进度:</span>
        <div className="flex-1 max-w-40">
          <div className="relative h-2.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300',
                getProgressColor(progress)
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <span className={cn('font-semibold min-w-10 text-right', getProgressTextColor(progress))}>
          {progress}%
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 验证统计栏样式**

打开项目管理页面，切换到时间线标签，确认：
1. 进度条更粗（10px）
2. 数字更醒目（font-semibold）
3. 进度条颜色根据进度值变化
4. 100%时进度条变绿色

---

## Chunk 4: MultiTimelineView 调整

### Task 4: 添加空状态和传递回调

**Files:**
- Modify: `app/src/features/projects/components/MultiTimelineView.tsx`

- [ ] **Step 1: 修改MultiTimelineView组件**

添加空状态提示和传递onGoToToday回调。

找到 `MultiTimelineView` 组件中的以下部分并修改：

**1. 在Props中添加onGoToToday（如果不存在）:**
```typescript
export interface MultiTimelineViewProps {
  // ... 现有props
  /** 跳转到今天回调 */
  onGoToToday?: () => void;
}
```

**2. 在组件参数中解构onGoToToday:**
```typescript
export function MultiTimelineView({
  projectId,
  timelines,
  tasksByTimeline,
  holidays,
  milestones = [],
  projectRange,
  onTaskChange,
  onTaskCreate,
  onTaskDelete,
  onTaskClick,
  onTaskDoubleClick,
  onMilestoneClick,
  readOnly = false,
  onGoToToday,  // 新增
  className,
}: MultiTimelineViewProps) {
```

**3. 添加滚动到今天的函数:**
```typescript
// ============ 滚动到今天 ============

const handleGoToToday = useCallback(() => {
  if (scrollContainerRef.current && todayPosition !== null) {
    scrollContainerRef.current.scrollLeft = todayPosition - 200;
  }
}, [todayPosition]);
```

**4. 修改TimelineToolbar调用，传递onGoToToday:**
```tsx
{/* 工具栏 */}
<TimelineToolbar
  zoomLevel={zoomLevel}
  zoomLabel={getViewLabel()}
  onZoomIn={zoomIn}
  onZoomOut={zoomOut}
  onSetZoom={setZoom}
  onAddTask={() => {
    if (timelines.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      onTaskCreate?.(timelines[0].id, {
        startDate: today,
        endDate: today,
        title: '新任务',
      });
    }
  }}
  readOnly={readOnly}
  onGoToToday={onGoToToday || handleGoToToday}
/>
```

**5. 在时间轴列表区添加空状态提示:**
```tsx
{/* 时间轴列表区 */}
<div
  className="border-r flex-shrink-0 overflow-y-auto"
  style={{ width: viewState.labelWidth }}
>
  {/* 表头 */}
  <div
    className="h-10 px-3 border-b bg-muted text-sm font-medium"
    style={{ height: RULER_SPECS.height + TRACK_SPECS.height }}
  >
    时间轴
  </div>

  {/* 空状态提示 */}
  {timelines.length === 0 ? (
    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
      <span className="text-sm">暂无时间轴</span>
      <span className="text-xs mt-1">点击"添加任务"按钮创建第一个任务</span>
    </div>
  ) : (
    /* 时间轴标签列表 */
    timelines.map((timeline) => (
      <div
        key={timeline.id}
        className="flex items-center px-3 border-b hover:bg-accent cursor-pointer"
        style={{ height: TRACK_SPECS.height }}
      >
        <span className="truncate text-sm">{timeline.name}</span>
      </div>
    ))
  )}
</div>
```

**6. 在时间线主区域添加空状态提示:**
```tsx
{/* 时间线主区域 */}
<div
  ref={scrollContainerRef}
  className="flex-1 overflow-auto"
  onScroll={handleScroll}
>
  {timelines.length === 0 ? (
    <div className="flex items-center justify-center h-full min-h-64 text-muted-foreground">
      <div className="text-center">
        <div className="text-4xl mb-2">📋</div>
        <div className="text-sm font-medium">暂无时间轴</div>
        <div className="text-xs mt-1">点击下方"添加任务"按钮开始</div>
      </div>
    </div>
  ) : (
    <>
      {/* 时间刻度尺 */}
      <TimelineRuler
        ticks={ticks}
        todayPosition={todayPosition}
        holidays={holidays}
        dayWidth={zoomConfig.dayWidth}
      />

      {/* 里程碑标记行 */}
      {milestones && milestones.length > 0 && (
        <MilestoneMarkers
          milestones={milestones.map(m => ({
            id: m.id,
            name: m.name,
            targetDate: m.targetDate,
            status: m.status as 'pending' | 'achieved' | 'overdue',
          }))}
          minDate={minDate}
          dayWidth={zoomConfig.dayWidth}
          onMilestoneClick={onMilestoneClick}
        />
      )}

      {/* 时间轴轨道 */}
      <div ref={dragContainerRef} className="relative">
        {/* 项目周期背景 */}
        {projectRange && (
          <ProjectRangeBar
            projectStartDate={projectRange.startDate}
            projectEndDate={projectRange.endDate}
            minDate={minDate}
            dayWidth={zoomConfig.dayWidth}
          />
        )}
        {timelines.map((timeline) => (
          <TimelineTrack
            key={timeline.id}
            timeline={timeline}
            tasks={tasksByTimeline[timeline.id] || []}
            minDate={minDate}
            dayWidth={zoomConfig.dayWidth}
            selectedTaskId={selectedTask?.id || null}
            hoveredTaskId={hoveredTask?.id || null}
            isDragging={isDragging}
            dragState={dragState}
            readOnly={readOnly}
            onTaskMouseDown={handleTaskMouseDown}
            onTaskMouseEnter={(task) => setHoveredTask(task)}
            onTaskMouseLeave={() => setHoveredTask(null)}
            onContextMenu={handleContextMenu}
            onDoubleClick={handleTrackDoubleClick}
          />
        ))}
      </div>
    </>
  )}
</div>
```

- [ ] **Step 2: 验证空状态和今天按钮**

1. 打开一个没有时间轴的项目
2. 确认显示空状态提示
3. 创建一个时间轴，确认空状态消失
4. 点击"📍 今天"按钮，确认滚动到今天位置

---

## 验收清单

完成后请验证以下项目：

- [ ] 里程碑名称显示在横线上方
- [ ] 里程碑日期显示在横线下方
- [ ] 里程碑旗帜图标在横线上
- [ ] 工具栏有独立的"📍 今天"按钮
- [ ] 点击今天按钮能滚动到今天位置
- [ ] 快捷键T能跳转到今天
- [ ] 统计栏进度条高度为10px
- [ ] 统计栏数字使用font-semibold
- [ ] 进度100%时进度条变绿色
- [ ] 无时间轴时显示空状态提示
- [ ] 任务管理页面不受影响
- [ ] 设置页面不受影响

---

**计划结束**
