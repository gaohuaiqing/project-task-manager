/**
 * 共享常量定义
 * 与后端类型保持同步
 */

// ==================== 任务状态 (9种) ====================

export type TaskStatus =
  | 'pending_approval'   // 待审批
  | 'rejected'           // 已驳回
  | 'not_started'        // 未开始
  | 'in_progress'        // 进行中
  | 'early_completed'    // 提前完成
  | 'on_time_completed'  // 按时完成
  | 'delay_warning'      // 延期预警
  | 'delayed'            // 已延期
  | 'overdue_completed'; // 超期完成

export const TASK_STATUS_CONFIG: Record<TaskStatus, {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
}> = {
  pending_approval: {
    label: '待审批',
    color: 'purple',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-700',
  },
  rejected: {
    label: '已驳回',
    color: 'red',
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
  },
  not_started: {
    label: '未开始',
    color: 'gray',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700',
  },
  in_progress: {
    label: '进行中',
    color: 'blue',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
  },
  early_completed: {
    label: '提前完成',
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
  },
  on_time_completed: {
    label: '按时完成',
    color: 'green',
    bgColor: 'bg-green-50',
    textColor: 'text-green-600',
  },
  delay_warning: {
    label: '延期预警',
    color: 'yellow',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-700',
  },
  delayed: {
    label: '已延期',
    color: 'red',
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
  },
  overdue_completed: {
    label: '超期完成',
    color: 'orange',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-700',
  },
};

export const TASK_STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'pending_approval', label: '待审批' },
  { value: 'rejected', label: '已驳回' },
  { value: 'not_started', label: '未开始' },
  { value: 'in_progress', label: '进行中' },
  { value: 'early_completed', label: '提前完成' },
  { value: 'on_time_completed', label: '按时完成' },
  { value: 'delay_warning', label: '延期预警' },
  { value: 'delayed', label: '已延期' },
  { value: 'overdue_completed', label: '超期完成' },
];

// ==================== 任务优先级 ====================

export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';

export const TASK_PRIORITY_CONFIG: Record<TaskPriority, {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
}> = {
  urgent: {
    label: '紧急',
    color: 'red',
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
  },
  high: {
    label: '高',
    color: 'orange',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-700',
  },
  medium: {
    label: '中',
    color: 'blue',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
  },
  low: {
    label: '低',
    color: 'gray',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700',
  },
};

export const TASK_PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'urgent', label: '紧急' },
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
];

// ==================== 任务类型 (13种) ====================

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

export const TASK_TYPE_CONFIG: Record<TaskType, {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
}> = {
  firmware: {
    label: '固件',
    color: 'indigo',
    bgColor: 'bg-indigo-100',
    textColor: 'text-indigo-700',
  },
  board: {
    label: '板卡',
    color: 'teal',
    bgColor: 'bg-teal-100',
    textColor: 'text-teal-700',
  },
  driver: {
    label: '驱动',
    color: 'purple',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-700',
  },
  interface: {
    label: '接口类',
    color: 'cyan',
    bgColor: 'bg-cyan-100',
    textColor: 'text-cyan-700',
  },
  hw_recovery: {
    label: '硬件恢复包',
    color: 'orange',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-700',
  },
  material_import: {
    label: '物料导入',
    color: 'lime',
    bgColor: 'bg-lime-100',
    textColor: 'text-lime-700',
  },
  material_sub: {
    label: '物料改代',
    color: 'amber',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-700',
  },
  sys_design: {
    label: '系统设计',
    color: 'blue',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
  },
  core_risk: {
    label: '核心风险',
    color: 'red',
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
  },
  contact: {
    label: '接口人',
    color: 'pink',
    bgColor: 'bg-pink-100',
    textColor: 'text-pink-700',
  },
  func_task: {
    label: '职能任务',
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
  },
  other: {
    label: '其它',
    color: 'gray',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700',
  },
};

export const TASK_TYPE_OPTIONS: { value: TaskType; label: string }[] = [
  { value: 'firmware', label: '固件' },
  { value: 'board', label: '板卡' },
  { value: 'driver', label: '驱动' },
  { value: 'interface', label: '接口类' },
  { value: 'hw_recovery', label: '硬件恢复包' },
  { value: 'material_import', label: '物料导入' },
  { value: 'material_sub', label: '物料改代' },
  { value: 'sys_design', label: '系统设计' },
  { value: 'core_risk', label: '核心风险' },
  { value: 'contact', label: '接口人' },
  { value: 'func_task', label: '职能任务' },
  { value: 'other', label: '其它' },
];

// ==================== 项目状态 ====================

export type ProjectStatus = 'planning' | 'in_progress' | 'completed' | 'delayed';

export const PROJECT_STATUS_CONFIG: Record<ProjectStatus, {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
}> = {
  planning: {
    label: '计划中',
    color: 'gray',
    bgColor: 'bg-gray-500',
    textColor: 'text-white',
  },
  in_progress: {
    label: '进行中',
    color: 'blue',
    bgColor: 'bg-blue-500',
    textColor: 'text-white',
  },
  completed: {
    label: '已完成',
    color: 'green',
    bgColor: 'bg-green-500',
    textColor: 'text-white',
  },
  delayed: {
    label: '已延期',
    color: 'red',
    bgColor: 'bg-red-500',
    textColor: 'text-white',
  },
};

export const PROJECT_STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'planning', label: '计划中' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'delayed', label: '已延期' },
];

// 项目状态标签映射
export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: '计划中',
  in_progress: '进行中',
  completed: '已完成',
  delayed: '已延期',
};

// ==================== 项目类型 (4种) ====================
// 与数据库实际存储值同步

export type ProjectType =
  | 'product_dev'    // 产品开发
  | 'func_mgmt'      // 职能管理
  | 'material_sub'   // 物料改代
  | 'quality_handle'; // 质量处理

export const PROJECT_TYPE_CONFIG: Record<ProjectType, {
  label: string;
  description: string;
}> = {
  product_dev: {
    label: '产品开发',
    description: '新产品研发项目',
  },
  func_mgmt: {
    label: '职能管理',
    description: '职能部门管理项目',
  },
  material_sub: {
    label: '物料改代',
    description: '物料替代改进项目',
  },
  quality_handle: {
    label: '质量处理',
    description: '质量问题处理项目',
  },
};

export const PROJECT_TYPE_OPTIONS: { value: ProjectType; label: string }[] = [
  { value: 'product_dev', label: '产品开发' },
  { value: 'func_mgmt', label: '职能管理' },
  { value: 'material_sub', label: '物料改代' },
  { value: 'quality_handle', label: '质量处理' },
];

// 项目类型标签映射
export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  product_dev: '产品开发',
  func_mgmt: '职能管理',
  material_sub: '物料改代',
  quality_handle: '质量处理',
};

// ==================== 用户角色 ====================

export type UserRole = 'admin' | 'tech_manager' | 'dept_manager' | 'engineer';

export const USER_ROLE_CONFIG: Record<UserRole, {
  label: string;
  description: string;
  color: string;
  bgColor: string;
  textColor: string;
}> = {
  admin: {
    label: '管理员',
    description: '系统管理员，拥有所有权限',
    color: 'red',
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
  },
  tech_manager: {
    label: '技术经理',
    description: '技术团队负责人',
    color: 'purple',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-700',
  },
  dept_manager: {
    label: '部门经理',
    description: '部门负责人',
    color: 'blue',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
  },
  engineer: {
    label: '工程师',
    description: '技术开发人员',
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
  },
};

export const USER_ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'admin', label: '管理员' },
  { value: 'tech_manager', label: '技术经理' },
  { value: 'dept_manager', label: '部门经理' },
  { value: 'engineer', label: '工程师' },
];

// ==================== 依赖类型 ====================

export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF';

export const DEPENDENCY_TYPE_CONFIG: Record<DependencyType, {
  label: string;
  description: string;
}> = {
  FS: {
    label: '完成-开始',
    description: '前置任务完成后，后置任务才能开始',
  },
  SS: {
    label: '开始-开始',
    description: '前置任务开始后，后置任务才能开始',
  },
  FF: {
    label: '完成-完成',
    description: '前置任务完成后，后置任务才能完成',
  },
  SF: {
    label: '开始-完成',
    description: '前置任务开始后，后置任务才能完成',
  },
};

export const DEPENDENCY_TYPE_OPTIONS: { value: DependencyType; label: string }[] = [
  { value: 'FS', label: '完成-开始 (FS)' },
  { value: 'SS', label: '开始-开始 (SS)' },
  { value: 'FF', label: '完成-完成 (FF)' },
  { value: 'SF', label: '开始-完成 (SF)' },
];

// ==================== 里程碑状态 ====================
// 后端存储状态 (pending/achieved/overdue)
export type MilestoneStatus = 'pending' | 'achieved' | 'overdue';

// 前端显示状态 (根据完成百分比和日期计算)
export type MilestoneDisplayStatus = 'pending' | 'in_progress' | 'completed' | 'delayed';

export const MILESTONE_STATUS_CONFIG: Record<MilestoneDisplayStatus, {
  label: string;
  icon: string;
  bgColor: string;
  textColor: string;
}> = {
  pending: {
    label: '待处理',
    icon: 'Circle',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700',
  },
  in_progress: {
    label: '进行中',
    icon: 'Clock',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
  },
  completed: {
    label: '已达成',
    icon: 'CheckCircle2',
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
  },
  delayed: {
    label: '已逾期',
    icon: 'AlertCircle',
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
  },
};

export const MILESTONE_STATUS_OPTIONS: { value: MilestoneDisplayStatus; label: string }[] = [
  { value: 'pending', label: '待处理' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已达成' },
  { value: 'delayed', label: '已逾期' },
];
