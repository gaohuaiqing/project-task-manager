/**
 * 分析模块共享标签常量
 * 统一管理仪表板和报表分析的中文标签映射
 *
 * @module analytics/shared/constants/labels
 */

// ============ 状态标签 ============

/** 任务状态标签映射 */
export const STATUS_LABELS: Record<string, string> = {
  not_started: '未开始',
  in_progress: '进行中',
  delay_warning: '延期预警',
  delayed: '已延期',
  early_completed: '提前完成',
  on_time_completed: '按时完成',
  overdue_completed: '超期完成',
} as const;

/** 任务状态分组标签映射 */
export const STATUS_GROUP_LABELS: Record<string, string> = {
  pending: '待处理',
  in_progress: '进行中',
  completed: '已完成',
  delayed: '已延期',
} as const;

/** 延期类型标签映射 */
export const DELAY_TYPE_LABELS: Record<string, string> = {
  delay_warning: '延期预警',
  delayed: '已延期',
  overdue_completed: '超期完成',
} as const;

// ============ 优先级标签 ============

/** 任务优先级标签映射 */
export const PRIORITY_LABELS: Record<string, string> = {
  urgent: '紧急',
  high: '高',
  medium: '中',
  low: '低',
} as const;

// ============ 风险等级标签 ============

/** 风险等级标签映射 */
export const RISK_LABELS: Record<string, string> = {
  high: '高风险',
  medium: '中风险',
  low: '低风险',
} as const;

// ============ 活跃度标签 ============

/** 活跃度标签映射 */
export const ACTIVITY_LABELS: Record<string, string> = {
  high: '高活跃',
  medium: '中等活跃',
  low: '低活跃',
} as const;

// ============ 用户角色标签 ============

/** 用户角色标签映射 */
export const ROLE_LABELS: Record<string, string> = {
  admin: '管理员',
  dept_manager: '部门经理',
  tech_manager: '技术经理',
  engineer: '工程师',
} as const;

// ============ 时间维度标签 ============

/** 时间维度标签映射 */
export const TIME_DIMENSION_LABELS: Record<string, string> = {
  day: '按天',
  week: '按周',
  month: '按月',
  quarter: '按季度',
  year: '按年',
} as const;

// ============ 数据范围标签 ============

/** 数据范围标签映射 */
export const DATA_SCOPE_LABELS = {
  projects: {
    all: '所有项目',
    dept_projects: '部门项目',
    group_projects: '小组项目',
    my_projects: '我的项目',
  },
  users: {
    all: '所有成员',
    dept_members: '部门成员',
    group_members: '小组成员',
    self: '仅自己',
  },
  departments: {
    all: '所有部门',
    own_dept: '本部门',
    own_group: '本小组',
    none: '无',
  },
} as const;

// ============ 任务类型标签与元数据 ============

/** 任务类型分组 */
export const TASK_TYPE_GROUPS = {
  hardware: { label: '硬件开发', description: '硬件相关的开发任务' },
  material: { label: '物料管理', description: '物料导入与改代相关任务' },
  design: { label: '设计管理', description: '系统设计与风险管理任务' },
  general: { label: '综合职能', description: '协调、职能与其他任务' },
} as const;

/** 任务类型标签映射 */
export const TASK_TYPE_LABELS: Record<string, string> = {
  firmware: '固件',
  board: '板卡',
  driver: '驱动',
  interface: '接口类',
  hw_recovery: '硬件恢复包',
  material_import: '物料导入',
  material_sub: '物料改代',
  sys_design: '系统设计',
  core_risk: '核心风险',
  coordinator: '接口人',
  functional: '职能任务',
  other: '其它',
} as const;

/** 任务类型描述映射 */
export const TASK_TYPE_DESCRIPTIONS: Record<string, string> = {
  firmware: '嵌入式固件开发、调试与维护',
  board: 'PCB板卡设计、原理图、Layout',
  driver: '底层驱动程序开发与适配',
  interface: '模块间接口开发与联调',
  hw_recovery: '硬件异常恢复方案与实施',
  material_import: '新物料导入验证与流程',
  material_sub: '物料替代方案验证与切换',
  sys_design: '系统架构与方案设计',
  core_risk: '核心技术风险攻关',
  coordinator: '跨组/跨部门接口协调',
  functional: '职能部门常规任务',
  other: '其他类型任务',
} as const;

/** 任务类型所属分组 */
export const TASK_TYPE_GROUP_MAP: Record<string, keyof typeof TASK_TYPE_GROUPS> = {
  firmware: 'hardware',
  board: 'hardware',
  driver: 'hardware',
  interface: 'hardware',
  hw_recovery: 'hardware',
  material_import: 'material',
  material_sub: 'material',
  sys_design: 'design',
  core_risk: 'design',
  coordinator: 'general',
  functional: 'general',
  other: 'general',
} as const;
