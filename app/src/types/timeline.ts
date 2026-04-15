/**
 * 时间线模块类型定义
 *
 * @module types/timeline
 * @description 定义时间线相关的所有类型、接口和常量
 */

// ============ 缩放相关 ============

/** 缩放级别 */
export type TimelineZoomLevel = 'day' | 'week' | 'month';

/** 缩放配置 */
export interface ZoomConfig {
  level: TimelineZoomLevel;
  dayWidth: number;
  zoomValue: number;
}

/** 预设缩放配置 */
export const TIMELINE_ZOOM_CONFIGS: Record<TimelineZoomLevel, { dayWidth: number; label: string }> = {
  day: { dayWidth: 36, label: '日视图' },
  week: { dayWidth: 25, label: '周视图' },
  month: { dayWidth: 8, label: '月视图' },
};

// ============ 时间轴相关 ============

/** 时间轴类型 */
export type TimelineType = 'tech_stack' | 'team' | 'phase' | 'custom';

/** 时间轴状态 */
export type TimelineStatus = 'not_started' | 'in_progress' | 'completed' | 'delayed';

/** 时间轴 */
export interface Timeline {
  id: string;
  projectId: string;
  name: string;
  startDate: string;
  endDate: string;
  type: TimelineType | null;
  visible: boolean;
  sortOrder: number;
  progress: number;
  status: TimelineStatus;
  createdAt: string;
  updatedAt: string;
}

/** 创建时间轴请求 */
export interface CreateTimelineRequest {
  name: string;
  startDate: string;
  endDate: string;
  type?: TimelineType;
}

/** 更新时间轴请求 */
export interface UpdateTimelineRequest {
  name?: string;
  startDate?: string;
  endDate?: string;
  type?: TimelineType;
  visible?: boolean;
  sortOrder?: number;
  progress?: number;
  status?: TimelineStatus;
}

// ============ 轨道相关 ============

/** 轨道配置 */
export interface TrackConfig {
  trackHeight: number;        // 轨道高度 44px
  taskBarHeight: number;      // 任务条高度 28px
  taskBarGap: number;          // 任务条间距 8px
  labelWidth: number;          // 左侧标签宽度 180px
  labelMinWidth: number;       // 最小宽度 100px
  labelMaxWidth: number;       // 最大宽度 300px
}

/** 默认轨道配置 */
export const DEFAULT_TRACK_CONFIG: TrackConfig = {
  trackHeight: 44,
  taskBarHeight: 28,
  taskBarGap: 8,
  labelWidth: 180,
  labelMinWidth: 100,
  labelMaxWidth: 300,
};

// ============ 时间刻度尺相关 ============

/** 刻度配置 */
export interface TickConfig {
  rulerHeight: number;         // 刻度尺高度 40px
  tickColor: string;           // 刻度线颜色
  todayLineColor: string;      // 今天指示线颜色
  todayBgColor: string;         // 今天背景颜色
  weekendBorderStyle: string;  // 周末边框样式
}

/** 默认刻度配置 */
export const DEFAULT_TICK_CONFIG: TickConfig = {
  rulerHeight: 40,
  tickColor: 'gray-300',
  todayLineColor: 'red-500',
  todayBgColor: 'blue-100/50',
  weekendBorderStyle: 'dashed',
};

// ============ 键盘快捷键相关 ============

/** 快捷键配置 */
export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  action: string;
  description: string;
}

/** 快捷键列表 */
export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  { key: 'Escape', action: 'cancel', description: '取消选中' },
  { key: '+', action: 'zoomIn', description: '放大时间线' },
  { key: '=', action: 'zoomIn', description: '放大时间线' },
  { key: '-', action: 'zoomOut', description: '缩小时间线' },
  { key: '_', action: 'zoomOut', description: '缩小时间线' },
  { key: 'ArrowLeft', action: 'scrollLeft', description: '向左滚动' },
  { key: 'ArrowRight', action: 'scrollRight', description: '向右滚动' },
  { key: 'Home', action: 'scrollToStart', description: '滚动到开始' },
  { key: 'End', action: 'scrollToEnd', description: '滚动到结束' },
  { key: 't', action: 'scrollToToday', description: '滚动到今天' },
  { key: 'T', action: 'scrollToToday', description: '滚动到今天' },
];

// ============ 里程碑相关 ============

/** 里程碑状态 */
export type MilestoneBackendStatus = 'pending' | 'achieved' | 'overdue';

/** 里程碑 */
export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  targetDate: string;
  completionPercentage?: number;
  isCompleted?: boolean;
  status: MilestoneBackendStatus;
  createdAt?: string;
}

// ============ 节假日相关 ============

/** 节假日类型 */
export type HolidayType = 'legal' | 'company' | 'workday';

/** 节假日 */
export interface Holiday {
  date: string;
  name: string;
  type: HolidayType;
}

// ============ 统计信息相关 ============

/** 时间线统计信息 */
export interface TimelineStats {
  timelineCount: number;
  progress: number;
}
