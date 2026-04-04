# 时间线设计合规性修复实施计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复项目管理模块时间线组件，使其完全符合 REQ_03 设计文档规范

**Architecture:** 前端组件级修复，不涉及后端 API 变更。主要修改任务条样式、里程碑显示、工具栏功能、右键菜单和统计栏文案。

**Tech Stack:** React 19, TypeScript, Tailwind CSS, lucide-react (图标库)

**参考文档:** `docs/requirements/modules/REQ_03_project.md` 第4节

---

## 文件结构

| 文件 | 操作 | 职责 |
|------|------|------|
| `app/src/features/projects/components/TimelineTaskBar.tsx` | 修改 | 任务条组件 - 修复状态颜色 |
| `app/src/features/projects/components/MilestoneMarkers.tsx` | 修改 | 里程碑标记组件 - 旗帜图标+名称日期显示 |
| `app/src/features/projects/components/TimelineToolbar.tsx` | 修改 | 工具栏组件 - 添加"今天"按钮 |
| `app/src/features/projects/components/TimelineRuler.tsx` | 修改 | 时间刻度尺 - 添加月份刻度层 |
| `app/src/features/projects/components/TimelineStatsBar.tsx` | 修改 | 统计信息栏 - 调整文案 |
| `app/src/features/projects/components/MultiTimelineView.tsx` | 修改 | 主容器 - 左侧标签拖动+右键菜单状态切换 |
| `app/src/features/projects/components/TimelineContextMenu.tsx` | 修改 | 右键菜单 - 添加切换状态功能 |

---

## Chunk 1: 任务条状态颜色修复

### Task 1.1: 修复 TimelineTaskBar 状态颜色

**Files:**
- Modify: `app/src/features/projects/components/TimelineTaskBar.tsx:14-40`

- [ ] **Step 1: 更新 STATUS_COLORS 常量，使用纯色背景**

将浅色背景改为纯色背景，符合 REQ_03 第 4.5 节规范：

```typescript
// app/src/features/projects/components/TimelineTaskBar.tsx
// 替换第 14-40 行

const STATUS_COLORS: Record<TimelineTaskStatus, { bg: string; text: string; border: string }> = {
  not_started: {
    bg: 'bg-gray-400',      // 纯灰色
    text: 'text-white',
    border: 'border-gray-500',
  },
  in_progress: {
    bg: 'bg-blue-500',      // 纯蓝色
    text: 'text-white',
    border: 'border-blue-600',
  },
  completed: {
    bg: 'bg-green-500',     // 纯绿色
    text: 'text-white',
    border: 'border-green-600',
  },
  delayed: {
    bg: 'bg-red-500',       // 纯红色
    text: 'text-white',
    border: 'border-red-600',
  },
  cancelled: {
    bg: 'bg-slate-400 opacity-60',  // 暗灰色 + 60% 透明度
    text: 'text-gray-600',
    border: 'border-slate-300',
  },
};
```

- [ ] **Step 2: 修改进度条背景样式**

进度条背景应使用半透明白色，而非当前的颜色：

```typescript
// 在 TimelineTaskBar 组件内，约第 138-149 行
// 替换进度条背景部分

{/* 进度条背景 */}
{!isMilestone && task.progress > 0 && (
  <div
    className={cn(
      'absolute inset-0 rounded-md overflow-hidden',
    )}
  >
    <div
      className="h-full bg-white/30"  // 白色半透明
      style={{ width: `${task.progress}%` }}
    />
  </div>
)}
```

- [ ] **Step 3: 验证修改**

启动前端开发服务器，打开项目时间线页面，确认任务条颜色为纯色。

```bash
cd app && npm run dev
```

检查项：
- [ ] 未开始任务显示灰色 (bg-gray-400)
- [ ] 进行中任务显示蓝色 (bg-blue-500)
- [ ] 已完成任务显示绿色 (bg-green-500)
- [ ] 已延期任务显示红色 (bg-red-500)
- [ ] 已取消任务显示暗灰色 60% 透明度

- [ ] **Step 4: 提交**

```bash
git add app/src/features/projects/components/TimelineTaskBar.tsx
git commit -m "fix(timeline): 修复任务条状态颜色为纯色背景，符合REQ_03规范"
```

---

### Task 1.2: 优化里程碑任务条显示

**Files:**
- Modify: `app/src/features/projects/components/TimelineTaskBar.tsx:98-226`

- [ ] **Step 1: 修改里程碑显示格式**

里程碑（单日任务）应显示 "1天 | {date}" 格式：

```typescript
// 在 TimelineTaskBar 组件内，修改里程碑相关代码
// 约第 98-102 行

// 是否是里程碑（单日任务）
const isMilestone = useMemo(() => {
  return task.startDate === task.endDate;
}, [task.startDate, task.endDate]);

// 格式化日期显示
const milestoneDateLabel = useMemo(() => {
  if (!isMilestone) return '';
  const date = new Date(task.startDate);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}, [isMilestone, task.startDate]);
```

- [ ] **Step 2: 更新里程碑标记显示**

```typescript
// 替换约第 215-225 行的里程碑标记部分

{/* 里程碑标记 */}
{isMilestone && (
  <div
    className={cn(
      'absolute inset-0 flex flex-col items-center justify-center',
      'text-white text-xs font-medium'
    )}
  >
    {/* 白色圆点 */}
    <div className="w-2 h-2 bg-white rounded-full mb-0.5" />
    {/* 日期显示 */}
    <span className="text-[10px] opacity-90">1天</span>
  </div>
)}
```

- [ ] **Step 3: 更新悬停提示，显示完整日期**

```typescript
// 替换约第 197-213 行的悬停提示部分

{/* 悬停提示 */}
{isHovered && (
  <div
    className={cn(
      'absolute -top-12 left-1/2 -translate-x-1/2',
      'px-3 py-2 rounded-lg',
      'bg-gray-900 text-white',
      'shadow-lg',
      'pointer-events-none',
      'z-50'
    )}
  >
    <div className="font-medium text-sm">{task.title}</div>
    <div className="text-gray-300 text-xs mt-1">
      {isMilestone
        ? milestoneDateLabel
        : `${task.startDate} ~ ${task.endDate}`
      }
    </div>
    {task.progress > 0 && (
      <div className="text-gray-400 text-xs mt-0.5">
        进度: {task.progress}%
      </div>
    )}
  </div>
)}
```

- [ ] **Step 4: 验证修改**

```bash
cd app && npm run dev
```

检查项：
- [ ] 单日任务显示为圆形里程碑
- [ ] 里程碑内显示白色圆点
- [ ] 里程碑显示 "1天" 文字
- [ ] 悬停时显示完整信息

- [ ] **Step 5: 提交**

```bash
git add app/src/features/projects/components/TimelineTaskBar.tsx
git commit -m "fix(timeline): 优化里程碑任务条显示，添加白色圆点和日期格式"
```

---

## Chunk 2: 里程碑标记组件重构

### Task 2.1: 重构 MilestoneMarkers 组件

**Files:**
- Modify: `app/src/features/projects/components/MilestoneMarkers.tsx`

- [ ] **Step 1: 引入旗帜图标**

```typescript
// 在文件顶部添加导入
import { Flag } from 'lucide-react';
```

- [ ] **Step 2: 重写组件，使用旗帜图标并显示名称和日期**

完整替换 `MilestoneMarkers.tsx` 内容：

```typescript
/**
 * 里程碑标记组件
 * 在时间线上方显示里程碑，使用旗帜图标
 *
 * @module features/projects/components/MilestoneMarkers
 * @description 符合 REQ_03 第 4.1 节界面布局设计
 */

import { useMemo } from 'react';
import { Flag } from 'lucide-react';
import { RULER_SPECS, TRACK_SPECS } from '@/utils/ganttGeometry';
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
      const position = daysDiff * dayWidth + dayWidth / 2; // 居中显示

      // 格式化日期显示
      const dateLabel = `${targetDate.getMonth() + 1}/${targetDate.getDate()}`;

      return {
        ...milestone,
        position,
        dateLabel,
      };
    });
  }, [milestones, minDate, dayWidth]);

  // 根据状态获取颜色
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
    <div
      className="relative border-b bg-gray-50"
      style={{ height: 48 }} // 留出名称和日期的空间
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
                <Flag
                  className={cn('w-4 h-4', style.icon)}
                  fill="currentColor"
                />
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

              {/* 垂直虚线（延伸到下方轨道） */}
              <div
                className={cn(
                  'absolute top-10 w-px h-6',
                  'opacity-50',
                  style.line
                )}
                style={{ left: 0 }}
              />

              {/* 悬停提示 */}
              <div className="absolute left-4 top-8 hidden group-hover:block z-50">
                <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-lg">
                  <div className="font-medium">{milestone.name}</div>
                  <div className="text-gray-300 mt-1">
                    目标日期: {milestone.targetDate}
                  </div>
                  <div className="text-gray-400 mt-0.5">
                    状态: {milestone.status === 'achieved' ? '已达成' : milestone.status === 'overdue' ? '已逾期' : '待处理'}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* 如果没有里程碑 */}
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

- [ ] **Step 2: 验证修改**

```bash
cd app && npm run dev
```

检查项：
- [ ] 里程碑使用旗帜图标 (🚩) 而非菱形
- [ ] 名称显示在横线上方
- [ ] 日期显示在横线下方
- [ ] 不同状态显示不同颜色
- [ ] 悬停显示详细信息

- [ ] **Step 3: 提交**

```bash
git add app/src/features/projects/components/MilestoneMarkers.tsx
git commit -m "feat(timeline): 重构里程碑标记组件，使用旗帜图标并显示名称日期"
```

---

## Chunk 3: 工具栏添加"今天"按钮

### Task 3.1: 修改 TimelineToolbar 组件

**Files:**
- Modify: `app/src/features/projects/components/TimelineToolbar.tsx`

- [ ] **Step 1: 添加"今天"按钮 Props**

```typescript
// 修改 Props 接口，添加 onGoToToday 回调
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
  /** 跳转到今天回调 */
  onGoToToday?: () => void;
  /** 自动排列回调 */
  onAutoArrange?: () => void;
  /** 导出回调 */
  onExport?: () => void;
  /** 导入回调 */
  onImport?: () => void;
  /** 是否只读 */
  readOnly?: boolean;
}
```

- [ ] **Step 2: 引入 MapPin 图标并添加按钮**

完整更新 `TimelineToolbar.tsx`：

```typescript
/**
 * 时间线工具栏组件
 *
 * @module features/projects/components/TimelineToolbar
 * @description 底部工具栏，提供缩放、添加任务、跳转今天等功能
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
  /** 跳转到今天回调 */
  onGoToToday?: () => void;
  /** 自动排列回调 */
  onAutoArrange?: () => void;
  /** 导出回调 */
  onExport?: () => void;
  /** 导入回调 */
  onImport?: () => void;
  /** 是否只读 */
  readOnly?: boolean;
}

// ============ 组件实现 ============

export function TimelineToolbar({
  zoomLevel,
  zoomLabel,
  onZoomIn,
  onZoomOut,
  onSetZoom,
  onAddTask,
  onGoToToday,
  onAutoArrange,
  onExport,
  onImport,
  readOnly = false,
}: TimelineToolbarProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-4 py-2',
        'bg-white border-t border-gray-200',
        'text-sm',
        'h-12' // 固定高度 48px
      )}
    >
      {/* 缩放控制 */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onZoomOut}
          title="缩小 (-)"
          className="h-8 w-8"
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
          className="h-8 w-8"
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
            className="gap-1.5 h-8"
          >
            <Plus className="h-4 w-4" />
            添加任务
          </Button>

          {onAutoArrange && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onAutoArrange}
              className="gap-1.5 h-8"
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
            className="gap-1.5 h-8"
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
            className="gap-1.5 h-8"
            title="导入"
          >
            <Upload className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* 快捷键提示 */}
      <div className="ml-auto text-xs text-muted-foreground">
        <span className="hidden md:inline">
          快捷键: +/- 缩放 | T 今天 | Delete 删除 | Escape 取消
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 在 MultiTimelineView 中传递 onGoToToday**

```typescript
// 在 MultiTimelineView.tsx 的 TimelineToolbar 调用处添加 onGoToToday prop
// 约第 555-572 行

{/* 工具栏 */}
<TimelineToolbar
  zoomLevel={zoomLevel}
  zoomLabel={getViewLabel()}
  onZoomIn={zoomIn}
  onZoomOut={zoomOut}
  onSetZoom={setZoom}
  onGoToToday={() => {
    if (scrollContainerRef.current && todayPosition !== null) {
      scrollContainerRef.current.scrollLeft = todayPosition - 100;
    }
  }}
  onAddTask={() => {
    // ... 现有代码
  }}
  readOnly={readOnly}
/>
```

- [ ] **Step 4: 验证修改**

```bash
cd app && npm run dev
```

检查项：
- [ ] 工具栏高度固定为 48px
- [ ] "📍 今天" 按钮独立显示
- [ ] 点击按钮跳转到今天位置
- [ ] 按钮有 tooltip 提示 "定位到今天 (T)"

- [ ] **Step 5: 提交**

```bash
git add app/src/features/projects/components/TimelineToolbar.tsx
git add app/src/features/projects/components/MultiTimelineView.tsx
git commit -m "feat(timeline): 工具栏添加'📍今天'独立按钮，符合REQ_03规范"
```

---

## Chunk 4: 右键菜单添加"切换状态"功能

### Task 4.1: 修改右键菜单组件

**Files:**
- Modify: `app/src/features/projects/components/TimelineContextMenu.tsx`
- Modify: `app/src/features/projects/components/MultiTimelineView.tsx`

- [ ] **Step 1: 添加状态切换菜单项**

在 `MultiTimelineView.tsx` 的 `contextMenuItems` 中添加切换状态功能：

```typescript
// 在 MultiTimelineView.tsx 中，约第 371-423 行
// 添加状态循环切换菜单项

const contextMenuItems: ContextMenuItem[] = useMemo(
  () => [
    {
      id: 'edit',
      label: '编辑',
      icon: '✏️',
      shortcut: 'Enter',
      onClick: () => {
        if (contextMenu.taskId) {
          const task = Object.values(tasksByTimeline)
            .flat()
            .find((t) => t.id === contextMenu.taskId);
          if (task) {
            onTaskDoubleClick?.(task);
          }
        }
        handleCloseContextMenu();
      },
    },
    { id: 'divider1', label: '', divider: true },
    {
      id: 'toggle-status',
      label: '切换状态',
      icon: '🔄',
      shortcut: 'S',
      onClick: () => {
        if (contextMenu.taskId && contextMenu.timelineId) {
          const task = tasksByTimeline[contextMenu.timelineId]?.find(
            (t) => t.id === contextMenu.taskId
          );
          if (task && onTaskChange) {
            // 循环切换状态: not_started -> in_progress -> completed -> delayed -> not_started
            const statusOrder: TimelineTaskStatus[] = [
              'not_started',
              'in_progress',
              'completed',
              'delayed',
            ];
            const currentIndex = statusOrder.indexOf(task.status as TimelineTaskStatus);
            const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];

            onTaskChange(contextMenu.timelineId, contextMenu.taskId, {
              startDate: task.startDate,
              endDate: task.endDate,
              status: nextStatus,
            } as any);
          }
        }
        handleCloseContextMenu();
      },
    },
    {
      id: 'copy',
      label: '复制',
      icon: '📋',
      onClick: () => {
        // ... 现有代码
      },
    },
    {
      id: 'delete',
      label: '删除',
      icon: '🗑️',
      shortcut: 'Delete',
      danger: true,
      onClick: () => {
        // ... 现有代码
      },
    },
  ],
  [contextMenu, tasksByTimeline, onTaskDoubleClick, onTaskCreate, onTaskDelete, onTaskChange]
);
```

- [ ] **Step 2: 更新 ContextMenuItem 类型以支持 icon**

```typescript
// 在 types/timeline.ts 中更新 ContextMenuItem 接口
// 约第 299-309 行

/** 右键菜单项 */
export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string;  // emoji 图标
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  divider?: boolean;
  onClick?: () => void;
}
```

- [ ] **Step 3: 更新 TimelineContextMenu 组件显示图标**

```typescript
// 在 TimelineContextMenu.tsx 中更新菜单项渲染
// 添加图标显示

{items.map((item, index) => {
  if (item.divider) {
    return (
      <div
        key={`divider-${index}`}
        className="h-px bg-gray-200 my-1"
      />
    );
  }

  return (
    <button
      key={item.id}
      className={cn(
        'w-full px-3 py-2 text-left text-sm',
        'flex items-center gap-2',
        'hover:bg-gray-100',
        'transition-colors',
        item.disabled && 'opacity-50 cursor-not-allowed',
        item.danger && 'text-red-600 hover:bg-red-50'
      )}
      onClick={item.onClick}
      disabled={item.disabled}
    >
      {/* 图标 */}
      {item.icon && (
        <span className="w-5 text-center">{item.icon}</span>
      )}
      {/* 标签 */}
      <span className="flex-1">{item.label}</span>
      {/* 快捷键 */}
      {item.shortcut && (
        <span className="text-xs text-gray-400">{item.shortcut}</span>
      )}
    </button>
  );
})}
```

- [ ] **Step 4: 验证修改**

```bash
cd app && npm run dev
```

检查项：
- [ ] 右键菜单显示图标 (✏️📋🗑️🔄)
- [ ] "切换状态" 菜单项存在
- [ ] 点击切换状态后任务状态循环变化
- [ ] 危险操作显示红色

- [ ] **Step 5: 提交**

```bash
git add app/src/features/projects/components/TimelineContextMenu.tsx
git add app/src/features/projects/components/MultiTimelineView.tsx
git add app/src/types/timeline.ts
git commit -m "feat(timeline): 右键菜单添加'切换状态'功能和图标显示"
```

---

## Chunk 5: 统计栏文案调整

### Task 5.1: 修改 TimelineStatsBar 文案

**Files:**
- Modify: `app/src/features/projects/components/TimelineStatsBar.tsx`

- [ ] **Step 1: 更新文案格式**

```typescript
// 修改 TimelineStatsBar.tsx
// 约第 43-77 行

return (
  <div
    className={cn(
      'flex items-center gap-6 px-4 py-2',
      'bg-white border-b',
      'text-sm',
      className
    )}
  >
    {/* 时间轴 */}
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">时间轴:</span>
      <span className="font-medium">{timelineCount}</span>
    </div>

    {/* 分隔符 */}
    <div className="w-px h-4 bg-gray-200" />

    {/* 任务 */}
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">任务:</span>
      <span className="font-medium">{taskCount}</span>
    </div>

    {/* 分隔符 */}
    <div className="w-px h-4 bg-gray-200" />

    {/* 完成 */}
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
```

- [ ] **Step 2: 验证修改**

检查项：
- [ ] 文案格式为 "时间轴: {n}" 而非 "时间轴数: {n}"
- [ ] 文案格式为 "任务: {n}" 而非 "任务数: {n}"

- [ ] **Step 3: 提交**

```bash
git add app/src/features/projects/components/TimelineStatsBar.tsx
git commit -m "fix(timeline): 调整统计栏文案格式，符合REQ_03规范"
```

---

## Chunk 6: 左侧标签宽度可拖动功能

### Task 6.1: 实现标签宽度拖动调整

**Files:**
- Modify: `app/src/features/projects/components/MultiTimelineView.tsx`

- [ ] **Step 1: 添加拖动状态和处理函数**

```typescript
// 在 MultiTimelineView 组件内添加

/** 标签宽度拖动状态 */
const [isDraggingLabel, setIsDraggingLabel] = useState(false);
const [labelDragStartX, setLabelDragStartX] = useState(0);
const [labelDragStartWidth, setLabelDragStartWidth] = useState(viewState.labelWidth);

/** 开始拖动标签宽度 */
const handleLabelDragStart = useCallback((e: React.MouseEvent) => {
  e.preventDefault();
  setIsDraggingLabel(true);
  setLabelDragStartX(e.clientX);
  setLabelDragStartWidth(viewState.labelWidth);
}, [viewState.labelWidth]);

/** 处理标签宽度拖动 */
useEffect(() => {
  if (!isDraggingLabel) return;

  const handleMouseMove = (e: MouseEvent) => {
    const deltaX = e.clientX - labelDragStartX;
    const newWidth = Math.max(
      TRACK_SPECS.minLabelWidth,
      Math.min(TRACK_SPECS.maxLabelWidth, labelDragStartWidth + deltaX)
    );
    setViewState((prev) => ({ ...prev, labelWidth: newWidth }));
  };

  const handleMouseUp = () => {
    setIsDraggingLabel(false);
  };

  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);

  return () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };
}, [isDraggingLabel, labelDragStartX, labelDragStartWidth]);
```

- [ ] **Step 2: 添加拖动手柄元素**

```typescript
// 在左侧标签区域添加拖动边框
// 约第 468-489 行

{/* 时间轴列表区 */}
<div
  className="border-r flex-shrink-0 overflow-y-auto relative"
  style={{ width: viewState.labelWidth }}
>
  {/* 表头 */}
  <div
    className="h-10 px-3 border-b bg-muted text-sm font-medium"
    style={{ height: RULER_SPECS.height + TRACK_SPECS.height }}
  >
    时间轴
  </div>

  {/* 时间轴标签列表 */}
  {timelines.map((timeline) => (
    <div
      key={timeline.id}
      className="flex items-center px-3 border-b hover:bg-accent cursor-pointer"
      style={{ height: TRACK_SPECS.height }}
    >
      <span className="truncate text-sm">{timeline.name}</span>
    </div>
  ))}

  {/* 拖动手柄 */}
  <div
    className={cn(
      'absolute top-0 right-0 bottom-0 w-1',
      'cursor-col-resize',
      'hover:bg-blue-400',
      'transition-colors',
      isDraggingLabel && 'bg-blue-500'
    )}
    onMouseDown={handleLabelDragStart}
  />
</div>
```

- [ ] **Step 3: 同步更新 MilestoneMarkers 和 TimelineTrack 的标签宽度**

需要将硬编码的 180px 改为使用 viewState.labelWidth：

```typescript
// 在 MilestoneMarkers.tsx 中
// 替换 style={{ width: 180 }} 为接收 labelWidth prop

// 在 TimelineTrack 相关渲染中也需要使用 viewState.labelWidth
```

- [ ] **Step 4: 验证修改**

检查项：
- [ ] 左侧标签区域右侧边框可拖动
- [ ] 拖动时光标变为 col-resize
- [ ] 宽度限制在 100-300px 范围内
- [ ] 拖动时手柄高亮显示

- [ ] **Step 5: 提交**

```bash
git add app/src/features/projects/components/MultiTimelineView.tsx
git add app/src/features/projects/components/MilestoneMarkers.tsx
git commit -m "feat(timeline): 实现左侧标签宽度可拖动调整功能"
```

---

## Chunk 7: 月份刻度层（可选增强）

### Task 7.1: 添加月份刻度层

**Files:**
- Modify: `app/src/features/projects/components/TimelineRuler.tsx`
- Modify: `app/src/features/projects/components/MultiTimelineView.tsx`

- [ ] **Step 1: 在 TimelineRuler 中添加月份刻度行**

```typescript
// 修改 TimelineRuler.tsx，添加月份刻度显示
// 在 Props 中添加 showMonthRuler 选项

export interface TimelineRulerProps {
  // ... 现有 props
  showMonthRuler?: boolean;
}

// 在组件内计算月份刻度
const monthTicks = useMemo(() => {
  if (!showMonthRuler) return [];

  const months: Array<{ label: string; position: number; width: number }> = [];
  const start = new Date(minDate);
  const end = new Date(maxDate);

  let currentMonth = new Date(start.getFullYear(), start.getMonth(), 1);

  while (currentMonth <= end) {
    const monthStart = new Date(currentMonth);
    const daysFromTimelineStart = Math.floor(
      (monthStart.getTime() - new Date(minDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    // 计算下个月第一天
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    const monthEnd = new Date(nextMonth.getTime() - 1);
    const daysFromTimelineEnd = Math.floor(
      (monthEnd.getTime() - new Date(minDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    months.push({
      label: `${currentMonth.getFullYear()}/${currentMonth.getMonth() + 1}`,
      position: daysFromTimelineStart * dayWidth,
      width: (daysFromTimelineEnd - daysFromTimelineStart + 1) * dayWidth,
    });

    currentMonth = nextMonth;
  }

  return months;
}, [minDate, maxDate, dayWidth, showMonthRuler]);

// 渲染月份刻度
{showMonthRuler && (
  <div className="relative bg-gray-50 border-b" style={{ height: 24 }}>
    {monthTicks.map((month, i) => (
      <div
        key={i}
        className="absolute top-0 bottom-0 flex items-center justify-center text-xs font-medium text-gray-600 border-l border-gray-200"
        style={{ left: month.position, width: month.width }}
      >
        {month.label}
      </div>
    ))}
  </div>
)}
```

- [ ] **Step 2: 在 MultiTimelineView 中启用月份刻度**

```typescript
// 在 TimelineRuler 调用处添加 showMonthRuler prop
<TimelineRuler
  ticks={ticks}
  todayPosition={todayPosition}
  holidays={holidays}
  dayWidth={zoomConfig.dayWidth}
  showMonthRuler={true}
/>
```

- [ ] **Step 3: 验证修改**

检查项：
- [ ] 日期刻度上方显示月份刻度行
- [ ] 月份格式为 "YYYY/M"
- [ ] 月份区域宽度正确

- [ ] **Step 4: 提交**

```bash
git add app/src/features/projects/components/TimelineRuler.tsx
git add app/src/features/projects/components/MultiTimelineView.tsx
git commit -m "feat(timeline): 添加月份刻度层显示"
```

---

## 验收清单

完成所有任务后，运行以下验证：

### 功能验收

- [ ] 任务条颜色为纯色（灰/蓝/绿/红/暗灰）
- [ ] 里程碑使用旗帜图标
- [ ] 里程碑显示名称和日期
- [ ] 工具栏有独立的"📍今天"按钮
- [ ] 右键菜单有"切换状态"选项
- [ ] 右键菜单显示图标
- [ ] 统计栏文案格式正确
- [ ] 左侧标签宽度可拖动
- [ ] 月份刻度层显示

### 代码质量

- [ ] TypeScript 无类型错误
- [ ] ESLint 无警告
- [ ] 所有组件有适当的 JSDoc 注释

### 提交历史

```bash
git log --oneline -10
```

应包含以下提交：
1. `fix(timeline): 修复任务条状态颜色为纯色背景`
2. `fix(timeline): 优化里程碑任务条显示`
3. `feat(timeline): 重构里程碑标记组件`
4. `feat(timeline): 工具栏添加'📍今天'按钮`
5. `feat(timeline): 右键菜单添加'切换状态'功能`
6. `fix(timeline): 调整统计栏文案格式`
7. `feat(timeline): 实现左侧标签宽度可拖动`
8. `feat(timeline): 添加月份刻度层显示`

---

**计划完成时间预估:** 2-3 小时

**依赖:** 无外部依赖，所有修改在前端组件层

**风险:** 低 - 主要是 UI 样式调整，不涉及业务逻辑变更
