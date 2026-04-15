/**
 * 任务管理模块类型定义
 * 与后端 app/server/src/modules/task/types.ts 保持同步
 */

// ============ 枚举类型 ============

/** 任务状态 - 9种完整状态 */
export type TaskStatus =
  | 'pending_approval'   // 待审批
  | 'rejected'           // 已驳回
  | 'not_started'        // 未开始
  | 'in_progress'        // 进行中
  | 'early_completed'    // 提前完成
  | 'on_time_completed'  // 按时完成
  | 'delay_warning'      // 延期预警
  | 'delayed'            // 已延迟
  | 'overdue_completed'; // 超期完成

/** 任务类型 - 13种 */
export type TaskType =
  | 'firmware'         // 固件
  | 'board'            // 单板
  | 'driver'           // 驱动
  | 'interface'        // 接口
  | 'hw_recovery'      // 硬件恢复
  | 'material_import'  // 物料导入
  | 'material_sub'     // 物料替换
  | 'sys_design'       // 系统设计
  | 'core_risk'        // 核心风险
  | 'contact'          // 联系/沟通
  | 'func_task'        // 功能任务
  | 'other';           // 其他

/** 任务优先级 */
export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';

/** 依赖类型 */
export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF';

// ============ 状态标签映射 ============

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending_approval: '待审批',
  rejected: '已驳回',
  not_started: '未开始',
  in_progress: '进行中',
  early_completed: '提前完成',
  on_time_completed: '按时完成',
  delay_warning: '延期预警',
  delayed: '已延迟',
  overdue_completed: '超期完成',
};

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  firmware: '固件',
  board: '板卡',
  driver: '驱动',
  interface: '接口类',
  hw_recovery: '硬件恢复包',
  material_import: '物料导入',
  material_sub: '物料改代',
  sys_design: '系统设计',
  core_risk: '核心风险',
  contact: '接口人',
  func_task: '职能任务',
  other: '其它',
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  urgent: '紧急',
  high: '高',
  medium: '中',
  low: '低',
};

export const DEPENDENCY_TYPE_LABELS: Record<DependencyType, string> = {
  FS: '完成-开始 (FS)',
  SS: '开始-开始 (SS)',
  FF: '完成-完成 (FF)',
  SF: '开始-完成 (SF)',
};

export const DEPENDENCY_TYPE_DESCRIPTIONS: Record<DependencyType, string> = {
  FS: '前置任务完成后，后续任务才能开始',
  SS: '前置任务开始后，后续任务才能开始',
  FF: '前置任务完成后，后续任务才能完成',
  SF: '前置任务开始后，后续任务才能完成',
};

// ============ 实体类型 ============

/** 待审批变更数据结构 */
export interface PendingChangeData {
  /** 变更字段 */
  changes: Array<{ field: string; oldValue: unknown; newValue: unknown }>;
  /** 变更原因 */
  reason: string;
  /** 提交时间 */
  submittedAt: string;
  /** 提交人ID */
  submittedBy: number;
}

/** WBS任务 - 完整24列数据结构 */
export interface WBSTask {
  id: string;
  projectId: string;
  parentId: string | null;
  wbsCode: string;
  wbsLevel: number;
  description: string;
  status: TaskStatus;
  taskType: TaskType;
  priority: TaskPriority;
  assigneeId: number | null;
  assigneeName?: string;
  projectName?: string;

  // 日期相关
  startDate: string | null;       // 计划开始日期
  endDate: string | null;         // 计划结束日期
  duration: number | null;        // 计划工期（工作日）
  isSixDayWeek: boolean;          // 是否六天工作制
  plannedDuration: number | null; // 原计划工期
  warningDays: number;            // 预警天数

  // 实际日期
  actualStartDate: string | null;
  actualEndDate: string | null;
  actualDuration: number | null;  // 实际工期
  actualCycle: number | null;     // 实际周期（日历日）

  // 依赖关系
  predecessorId: string | null;   // 前置任务ID
  dependencyType: DependencyType;  // 依赖类型
  lagDays: number | null;         // 提前/落后天数（负数为提前）

  // 统计字段
  fullTimeRatio: number;          // 全职比 (0-1)
  delayCount: number;             // 延期次数
  planChangeCount: number;        // 计划调整次数
  progressRecordCount: number;    // 进展记录数

  // 待审批数据
  pendingChanges: PendingChangeData | null;  // 待审批的变更数据
  pendingChangeType: string | null;          // 待审批变更类型

  // 其他
  redmineLink: string | null;     // Redmine链接
  tags: string | null;

  // 元数据
  version: number;
  createdAt: string;
  updatedAt: string;
}

/** WBS任务列表项（带子任务） */
export interface WBSTaskListItem extends WBSTask {
  children?: WBSTaskListItem[];
  /** 实时计算的状态（用于显示，优先于数据库中的 status） */
  computedStatus?: TaskStatus;
}

/** 兼容旧代码的别名 */
export type Task = WBSTask;
export type TaskWithChildren = WBSTaskListItem;

// ============ 进度记录 ============

export interface ProgressRecord {
  id: string;
  taskId: string;
  content: string;
  createdBy: number;
  creatorName: string;
  createdAt: string;
}

// ============ 任务依赖 ============

export interface TaskDependency {
  id: string;
  taskId: string;
  predecessorId: string;
  dependencyType: DependencyType;
  lagDays: number;
  createdAt: string;
}

// ============ 统计类型 ============

export interface TaskStats {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  delayed: number;
  avgProgress: number;
}

// ============ 请求/响应类型 ============

/** 任务查询参数 */
export interface TaskQueryParams {
  projectId?: string | string[];     // 支持多选
  status?: TaskStatus | TaskStatus[];  // 支持多选
  taskType?: TaskType | TaskType[];    // 支持多选
  priority?: TaskPriority | TaskPriority[];  // 支持多选
  assigneeId?: number | number[];      // 支持多选
  parentId?: string | null;
  search?: string;
  page?: number;
  pageSize?: number;
}

/** 创建任务请求 */
export interface CreateTaskRequest {
  projectId: string;
  parentId?: string | null;
  wbsLevel: number;
  description: string;
  taskType?: TaskType;
  priority?: TaskPriority;
  assigneeId?: number | null;
  startDate?: string | null;
  duration?: number | null;
  isSixDayWeek?: boolean;
  warningDays?: number;
  predecessorId?: string | null;
  dependencyType?: DependencyType;
  lagDays?: number | null;
  redmineLink?: string | null;
  fullTimeRatio?: number;
}

/** 更新任务请求 */
export interface UpdateTaskRequest {
  description?: string;
  taskType?: TaskType;
  priority?: TaskPriority;
  assigneeId?: number | null;
  startDate?: string | null;
  duration?: number | null;
  isSixDayWeek?: boolean;
  warningDays?: number;
  predecessorId?: string | null;
  dependencyType?: DependencyType;
  lagDays?: number | null;
  actualStartDate?: string | null;
  actualEndDate?: string | null;
  redmineLink?: string | null;
  fullTimeRatio?: number;
  status?: TaskStatus;
  /** 变更原因（工程师修改计划字段时必填） */
  reason?: string;
  version: number;
}

/** 任务列表响应 */
export interface TaskListResponse {
  items: WBSTaskListItem[];
  total: number;
  page: number;
  pageSize: number;
}

// ============ 字段映射工具 ============

/** 后端字段名 -> 前端字段名 */
const FIELD_MAP_TO_FRONTEND: Record<string, string> = {
  project_id: 'projectId',
  parent_id: 'parentId',
  wbs_code: 'wbsCode',
  wbs_level: 'wbsLevel',
  task_type: 'taskType',
  assignee_id: 'assigneeId',
  assignee_name: 'assigneeName',
  project_name: 'projectName',
  start_date: 'startDate',
  end_date: 'endDate',
  is_six_day_week: 'isSixDayWeek',
  planned_duration: 'plannedDuration',
  warning_days: 'warningDays',
  actual_start_date: 'actualStartDate',
  actual_end_date: 'actualEndDate',
  actual_duration: 'actualDuration',
  actual_cycle: 'actualCycle',
  predecessor_id: 'predecessorId',
  dependency_type: 'dependencyType',
  lag_days: 'lagDays',
  full_time_ratio: 'fullTimeRatio',
  delay_count: 'delayCount',
  plan_change_count: 'planChangeCount',
  progress_record_count: 'progressRecordCount',
  redmine_link: 'redmineLink',
  pending_changes: 'pendingChanges',
  pending_change_type: 'pendingChangeType',
  created_at: 'createdAt',
  updated_at: 'updatedAt',
};

/** 前端字段名 -> 后端字段名 */
const FIELD_MAP_TO_BACKEND: Record<string, string> = {
  projectId: 'project_id',
  parentId: 'parent_id',
  wbsCode: 'wbs_code',
  wbsLevel: 'wbs_level',
  taskType: 'task_type',
  assigneeId: 'assignee_id',
  assigneeName: 'assignee_name',
  projectName: 'project_name',
  startDate: 'start_date',
  endDate: 'end_date',
  isSixDayWeek: 'is_six_day_week',
  plannedDuration: 'planned_duration',
  warningDays: 'warning_days',
  actualStartDate: 'actual_start_date',
  actualEndDate: 'actual_end_date',
  actualDuration: 'actual_duration',
  actualCycle: 'actual_cycle',
  predecessorId: 'predecessor_id',
  dependencyType: 'dependency_type',
  lagDays: 'lag_days',
  fullTimeRatio: 'full_time_ratio',
  delayCount: 'delay_count',
  planChangeCount: 'plan_change_count',
  progressRecordCount: 'progress_record_count',
  redmineLink: 'redmine_link',
  pendingChanges: 'pending_changes',
  pendingChangeType: 'pending_change_type',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

/**
 * 将后端响应转换为前端格式
 */
export function mapTaskToFrontend<T extends Record<string, unknown>>(data: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    const frontendKey = FIELD_MAP_TO_FRONTEND[key] || key;
    // 处理日期类型
    if (value instanceof Date) {
      result[frontendKey] = value.toISOString();
    } else {
      result[frontendKey] = value;
    }
  }
  return result as T;
}

/**
 * 将前端数据转换为后端格式
 */
export function mapTaskToBackend<T extends Record<string, unknown>>(data: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    const backendKey = FIELD_MAP_TO_BACKEND[key] || key;
    result[backendKey] = value;
  }
  return result as T;
}

/**
 * 批量转换任务列表
 */
export function mapTasksToFrontend<T extends Record<string, unknown>>(items: T[]): T[] {
  return items.map(mapTaskToFrontend);
}
