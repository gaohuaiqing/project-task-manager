/**
 * 多时间轴编辑器核心类型定义
 *
 * 设计原则：
 * 1. 支持多条时间轴并行显示
 * 2. 每条时间轴独立管理任务
 * 3. 与现有里程碑和WBS任务兼容
 * 4. 提供强大的拖拽交互能力
 *
 * @module types/timeline
 */

import type { TimeRange } from '@/utils/ganttGeometry';

// ==================== 枚举类型 ====================

/**
 * 任务状态
 */
export type TimelineTaskStatus = 'not_started' | 'in_progress' | 'completed' | 'delayed' | 'cancelled';

/**
 * 任务优先级
 */
export type TimelineTaskPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * 缩放级别
 */
export type TimelineZoomLevel = 'day' | 'week' | 'month';

/**
 * 拖拽操作类型
 */
export type DragOperation = 'move' | 'resizeStart' | 'resizeEnd';

// ==================== 常量 ====================

/**
 * 任务状态标签映射
 */
export const TIMELINE_TASK_STATUS_LABELS: Record<TimelineTaskStatus, string> = {
  not_started: '未开始',
  in_progress: '进行中',
  completed: '已完成',
  delayed: '已延期',
  cancelled: '已取消',
};

/**
 * 任务状态颜色映射
 */
export const TIMELINE_TASK_STATUS_COLORS: Record<TimelineTaskStatus, string> = {
  not_started: 'gray',
  in_progress: 'blue',
  completed: 'green',
  delayed: 'red',
  cancelled: 'slate',
};

/**
 * 缩放级别配置
 */
export const TIMELINE_ZOOM_CONFIGS: Record<TimelineZoomLevel, { dayWidth: number; label: string }> = {
  day: { dayWidth: 60, label: '日' },
  week: { dayWidth: 25, label: '周' },
  month: { dayWidth: 8, label: '月' },
};

// ==================== 核心类型 ====================

/**
 * 时间轴任务
 *
 * 统一的时间轴任务表示，可以来自里程碑或WBS任务
 */
export interface TimelineTask {
  /** 任务唯一标识 */
  id: string;
  /** 任务标题 */
  title: string;
  /** 任务描述 */
  description?: string;
  /** 开始日期 */
  startDate: string;
  /** 结束日期 */
  endDate: string;
  /** 任务状态 */
  status: TimelineTaskStatus;
  /** 任务优先级 */
  priority?: TimelineTaskPriority;
  /** 进度百分比 (0-100) */
  progress?: number;
  /** 负责人ID */
  assigneeId?: string;
  /** 负责人姓名 */
  assigneeName?: string;
  /** 任务标签（用于分类和显示） */
  tags?: string[];
  /** 原始数据类型（用于数据转换） */
  sourceType?: 'milestone' | 'wbs' | 'custom';
  /** 原始数据ID */
  sourceId?: number | string;
  /** 排序顺序 */
  sortOrder?: number;
}

/**
 * 时间轴配置
 *
 * 定义单条时间轴的属性
 */
export interface TimelineConfig {
  /** 时间轴唯一标识 */
  id: string;
  /** 时间轴名称 */
  name: string;
  /** 时间轴图标 */
  icon?: string;
  /** 时间轴颜色（用于视觉区分） */
  color?: string;
  /** 时间轴类型（用于预设） */
  type?: 'tech_stack' | 'team' | 'phase' | 'custom';
  /** 是否可见 */
  visible?: boolean;
  /** 是否可编辑 */
  editable?: boolean;
  /** 排序顺序 */
  sortOrder?: number;
}

/**
 * 时间轴
 *
 * 包含配置和任务的时间轴
 */
export interface Timeline {
  /** 时间轴配置 */
  config: TimelineConfig;
  /** 任务列表 */
  tasks: TimelineTask[];
}

/**
 * 时间轴统计信息
 */
export interface TimelineStats {
  /** 时间轴总数 */
  timelineCount: number;
  /** 任务总数 */
  totalTasks: number;
  /** 已完成任务数 */
  completedTasks: number;
  /** 进行中任务数 */
  inProgressTasks: number;
  /** 延期任务数 */
  delayedTasks: number;
  /** 整体进度 (0-100) */
  overallProgress: number;
  /** 最早开始日期 */
  earliestDate?: string;
  /** 最晚结束日期 */
  latestDate?: string;
}

/**
 * 缩放配置
 */
export interface ZoomConfig {
  /** 当前缩放级别 */
  level: TimelineZoomLevel;
  /** 每天的像素宽度 */
  dayWidth: number;
  /** 缩放值 (0-100) */
  zoomValue: number;
}

/**
 * 拖拽状态
 */
export interface DragState {
  /** 是否正在拖拽 */
  isDragging: boolean;
  /** 拖拽操作类型 */
  operation: DragOperation | null;
  /** 被拖拽的任务 */
  task: TimelineTask | null;
  /** 拖拽开始时的X坐标 */
  startX: number;
  /** 拖拽开始时的任务数据 */
  originalTask: TimelineTask | null;
  /** 当前X坐标 */
  currentX: number;
}

/**
 * 时间轴视图配置
 */
export interface TimelineViewConfig {
  /** 时间范围 */
  timeRange: TimeRange;
  /** 缩放配置 */
  zoom: ZoomConfig;
  /** 是否显示周末 */
  showWeekends: boolean;
  /** 是否显示网格线 */
  showGridLines: boolean;
  /** 容器宽度 */
  containerWidth: number;
  /** 容器高度 */
  containerHeight: number;
}

// ==================== 导出 TimeRange 以便其他模块使用 ====================
export type { TimeRange };

// ==================== 编辑器状态 ====================

/**
 * 时间轴编辑器状态
 */
export interface TimelineEditorState {
  /** 时间轴列表 */
  timelines: Timeline[];
  /** 统计信息 */
  stats: TimelineStats;
  /** 视图配置 */
  viewConfig: TimelineViewConfig;
  /** 拖拽状态 */
  dragState: DragState;
  /** 选中的任务 */
  selectedTask: TimelineTask | null;
  /** 悬停的任务 */
  hoveredTask: TimelineTask | null;
  /** 右键菜单状态 */
  contextMenu: {
    visible: boolean;
    x: number;
    y: number;
    task: TimelineTask | null;
  };
}

// ==================== 表单类型 ====================

/**
 * 时间轴表单数据
 */
export interface TimelineFormData {
  /** 时间轴ID（编辑时必填） */
  id?: string;
  /** 时间轴名称 */
  name: string;
  /** 时间轴图标 */
  icon?: string;
  /** 时间轴颜色 */
  color?: string;
}

/**
 * 任务表单数据
 */
export interface TimelineTaskFormData {
  /** 任务ID（编辑时必填） */
  id?: string;
  /** 任务标题 */
  title: string;
  /** 任务描述 */
  description?: string;
  /** 开始日期 */
  startDate: string;
  /** 结束日期 */
  endDate: string;
  /** 任务状态 */
  status: TimelineTaskStatus;
  /** 任务优先级 */
  priority?: TimelineTaskPriority;
  /** 进度百分比 */
  progress?: number;
  /** 负责人ID */
  assigneeId?: string;
}

// ==================== 类型守卫 ====================

/**
 * 检查是否为有效的任务状态
 */
export function isValidTaskStatus(value: string): value is TimelineTaskStatus {
  return ['not_started', 'in_progress', 'completed', 'delayed', 'cancelled'].includes(value);
}

/**
 * 检查是否为有效的缩放级别
 */
export function isValidZoomLevel(value: string): value is TimelineZoomLevel {
  return ['day', 'week', 'month'].includes(value);
}
