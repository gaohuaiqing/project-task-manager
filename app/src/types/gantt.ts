/**
 * 甘特图组件类型定义
 *
 * 定义甘特图视图配置、任务条渲染信息、拖拽操作等核心类型
 */

import type { WbsTask } from './wbs';

/**
 * 时间轴缩放级别
 */
export type ViewScale = 'day' | 'week' | 'month';

/**
 * 甘特图视图配置
 */
export interface GanttViewConfig {
  /** 缩放级别 */
  viewScale: ViewScale;
  /** 每天的像素宽度 */
  dayWidth: number;
  /** 是否显示周末 */
  showWeekends: boolean;
  /** 是否吸附到网格 */
  snapToGrid: boolean;
  /** 行高（像素） */
  rowHeight: number;
  /** 是否显示关键路径 */
  showCriticalPath: boolean;
  /** 是否显示依赖关系 */
  showDependencies: boolean;
}

/**
 * 时间轴缩放配置
 */
export interface TimelineScale {
  /** 每天的像素宽度 */
  dayWidth: number;
  /** 是否显示所有日期 */
  showAllDates: boolean;
  /** 刻度间隔（天数） */
  tickInterval: number;
  /** 日期格式 */
  dateFormat: string;
}

/**
 * 任务条渲染位置信息
 */
export interface TaskBarRenderInfo {
  /** 任务ID */
  taskId: string;
  /** 左侧位置（像素） */
  left: number;
  /** 宽度（像素） */
  width: number;
  /** 顶部位置（像素） */
  top: number;
  /** 高度（像素） */
  height: number;
  /** 行索引 */
  row: number;
  /** 层级深度 */
  depth: number;
  /** 是否可见（考虑父节点折叠状态） */
  visible: boolean;
}

/**
 * 拖拽操作类型
 */
export type DragOperationType = 'move' | 'resize_start' | 'resize_end';

/**
 * 甘特图拖拽操作状态
 */
export interface GanttDragOperation {
  /** 任务ID */
  taskId: string;
  /** 操作类型 */
  operation: DragOperationType;
  /** 鼠标起始X坐标 */
  startX: number;
  /** 原始任务数据（用于取消操作） */
  originalTask: WbsTask;
  /** 当前拖拽的X坐标 */
  currentX?: number;
  /** 拖拽开始时的任务数据 */
  startTaskData: {
    startDate: string;
    endDate: string;
    plannedDays: number;
  };
}

/**
 * 右键菜单项
 */
export interface ContextMenuItem {
  /** 菜单项唯一标识 */
  action: string;
  /** 显示文本 */
  label: string;
  /** 图标名称（Lucide） */
  icon?: string;
  /** 是否为危险操作 */
  danger?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
  /** 快捷键提示 */
  shortcut?: string;
}

/**
 * 右键菜单状态
 */
export interface GanttContextMenuState {
  /** 是否可见 */
  visible: boolean;
  /** X坐标（像素） */
  x: number;
  /** Y坐标（像素） */
  y: number;
  /** 目标任务ID */
  taskId: string | null;
}

/**
 * 时间范围
 */
export interface TimeRange {
  /** 开始日期（YYYY-MM-DD） */
  startDate: string;
  /** 结束日期（YYYY-MM-DD） */
  endDate: string;
  /** 总天数 */
  totalDays: number;
}

/**
 * 依赖关系渲染信息
 */
export interface DependencyRenderInfo {
  /** 源任务ID */
  fromTaskId: string;
  /** 目标任务ID */
  toTaskId: string;
  /** 依赖类型 */
  type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';
  /** 延迟天数 */
  lag?: number;
  /** 起点坐标 */
  startPoint: { x: number; y: number };
  /** 终点坐标 */
  endPoint: { x: number; y: number };
  /** 控制点1（贝塞尔曲线） */
  controlPoint1: { x: number; y: number };
  /** 控制点2（贝塞尔曲线） */
  controlPoint2: { x: number; y: number };
}

/**
 * 甘特图导出配置
 */
export interface GanttExportConfig {
  /** 导出格式 */
  format: 'png' | 'svg' | 'pdf';
  /** 导出质量（1-100） */
  quality?: number;
  /** 是否包含图例 */
  includeLegend?: boolean;
  /** 是否包含时间轴 */
  includeTimeline?: boolean;
  /** 文件名（不含扩展名） */
  filename?: string;
}

/**
 * 甘特图统计信息
 */
export interface GanttStatistics {
  /** 总任务数 */
  totalTasks: number;
  /** 已完成任务数 */
  completedTasks: number;
  /** 进行中任务数 */
  inProgressTasks: number;
  /** 未开始任务数 */
  notStartedTasks: number;
  /** 关键路径任务数 */
  criticalPathTasks: number;
  /** 平均进度百分比 */
  averageProgress: number;
  /** 项目总工期（工作日） */
  totalDuration: number;
  /** 预计结束日期 */
  estimatedEndDate: string;
}
