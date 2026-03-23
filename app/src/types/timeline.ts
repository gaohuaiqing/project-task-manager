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
  day: { dayWidth: 60, label: '日视图' },
  week: { dayWidth: 25, label: '周视图' },
  month: { dayWidth: 8, label: '月视图' },
};

// ============ 任务状态相关 ============

/** 时间线任务状态 (5种简化状态) */
export type TimelineTaskStatus =
  | 'not_started'   // 未开始
  | 'in_progress'   // 进行中
  | 'completed'     // 已完成
  | 'delayed'       // 已延期
  | 'cancelled';    // 已取消

/** 任务优先级 */
export type TimelineTaskPriority = 'urgent' | 'high' | 'medium' | 'low';

/** 任务来源类型 */
export type TimelineTaskSourceType = 'wbs' | 'manual';

/** WBS 状态到时间线状态映射 */
export const WBS_TO_TIMELINE_STATUS_MAP: Record<string, TimelineTaskStatus> = {
  // 未开始类
  'pending_approval': 'not_started',
  'rejected': 'not_started',
  'not_started': 'not_started',
  // 进行中
  'in_progress': 'in_progress',
  // 已完成类
  'early_completed': 'completed',
  'on_time_completed': 'completed',
  'overdue_completed': 'completed',
  // 已延期类
  'delay_warning': 'delayed',
  'delayed': 'delayed',
};

// ============ 任务条相关 ============

/** 时间线任务 */
export interface TimelineTask {
  id: string;
  timelineId: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  status: TimelineTaskStatus;
  priority: TimelineTaskPriority;
  progress: number;
  assigneeId: number | null;
  sourceType: TimelineTaskSourceType | null;
  sourceId: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/** 创建任务请求 */
export interface CreateTimelineTaskRequest {
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  priority?: TimelineTaskPriority;
  assigneeId?: number;
  sourceType?: TimelineTaskSourceType;
  sourceId?: string;
}

/** 更新任务请求 */
export interface UpdateTimelineTaskRequest {
  title?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status?: TimelineTaskStatus;
  priority?: TimelineTaskPriority;
  progress?: number;
  assigneeId?: number;
}

// ============ 时间轴相关 ============

/** 时间轴类型 */
export type TimelineType = 'tech_stack' | 'team' | 'phase' | 'custom';

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
  createdAt: string;
  updatedAt: string;
  // 关联的任务
  tasks?: TimelineTask[];
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
}

// ============ 拖拽相关 ============

/** 拖拽操作类型 */
export type DragOperation = 'move' | 'resize_start' | 'resize_end';

/** 拖拽状态 */
export interface DragState {
  isDragging: boolean;
  taskId: string | null;
  operation: DragOperation | null;
  startX: number;
  currentX: number;
  originalTask: {
    id: string;
    startDate: string;
    endDate: string;
    duration: number;
  } | null;
}

/** 创建初始拖拽状态 */
export const createInitialDragState = (): DragState => ({
  isDragging: false,
  taskId: null,
  operation: null,
  startX: 0,
  currentX: 0,
  originalTask: null,
});

/** 拖拽结果 */
export interface DragResult {
  valid: boolean;
  startDate: string;
  endDate: string;
  duration: number;
  offsetX: number;
}

/** 拖拽预览 */
export interface DragPreview {
  x: number;
  width: number;
  startDate: string;
  endDate: string;
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

// ============ 任务条样式相关 ============

/** 任务条样式配置 */
export interface TaskBarStyleConfig {
  defaultHeight: number;        // 默认高度 28px
  minWidth: number;             // 最小宽度 40px
  milestoneWidth: number;       // 里程碑宽度 12px
  borderRadius: number;         // 圆角 6px
  opacity: {
    normal: number;           // 正常透明度 1
    dragging: number;          // 拖拽时透明度 0.7
  };
}

/** 默认任务条样式 */
export const DEFAULT_TASK_BAR_STYLE: TaskBarStyleConfig = {
  defaultHeight: 28,
  minWidth: 40,
  milestoneWidth: 12,
  borderRadius: 6,
  opacity: {
    normal: 1,
    dragging: 0.7,
  },
};

/** 状态颜色映射 */
export const TASK_STATUS_COLORS: Record<TimelineTaskStatus, { bg: string; text: string }> = {
  not_started: { bg: 'bg-gray-400', text: 'text-white' },
  in_progress: { bg: 'bg-blue-500', text: 'text-white' },
  completed: { bg: 'bg-green-500', text: 'text-white' },
  delayed: { bg: 'bg-red-500', text: 'text-white' },
  cancelled: { bg: 'bg-slate-400', text: 'text-gray-600' },
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
  { key: 'Delete', action: 'delete', description: '删除选中任务' },
  { key: 'Backspace', action: 'delete', description: '删除选中任务' },
  { key: 'Escape', action: 'cancel', description: '取消拖拽/取消选中' },
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
  { key: 'Insert', action: 'addTask', description: '添加任务' },
];

// ============ 右键菜单相关 ============

/** 右键菜单项 */
export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  divider?: boolean;
  onClick?: () => void;
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
  taskCount: number;
  completedTaskCount: number;
  progress: number;
}

// ============ 视图状态相关 ============

/** 时间线视图状态 */
export interface TimelineViewState {
  zoomLevel: TimelineZoomLevel;
  selectedTaskId: string | null;
  hoveredTaskId: string | null;
  dragState: DragState;
  contextMenu: {
    visible: boolean;
    x: number;
    y: number;
    taskId: string | null;
  };
  labelWidth: number;
  scrollLeft: number;
  scrollTop: number;
}

/** 默认视图状态 */
export const DEFAULT_VIEW_STATE: TimelineViewState = {
  zoomLevel: 'week',
  selectedTaskId: null,
  hoveredTaskId: null,
  dragState: createInitialDragState(),
  contextMenu: {
    visible: false,
    x: 0,
    y: 0,
    taskId: null,
  },
  labelWidth: 180,
  scrollLeft: 0,
  scrollTop: 0,
};
