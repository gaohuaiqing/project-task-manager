/**
 * 共享常量定义
 */

// ==================== 任务状态 ====================

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'delayed';

export const TASK_STATUS_CONFIG: Record<TaskStatus, {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
}> = {
  pending: {
    label: '待处理',
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
  completed: {
    label: '已完成',
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
  },
  delayed: {
    label: '已延期',
    color: 'red',
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
  },
};

export const TASK_STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'pending', label: '待处理' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'delayed', label: '已延期' },
];

// ==================== 任务优先级 ====================

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export const TASK_PRIORITY_CONFIG: Record<TaskPriority, {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
}> = {
  low: {
    label: '低',
    color: 'gray',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700',
  },
  medium: {
    label: '中',
    color: 'blue',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
  },
  high: {
    label: '高',
    color: 'orange',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-700',
  },
  urgent: {
    label: '紧急',
    color: 'red',
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
  },
};

export const TASK_PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
  { value: 'urgent', label: '紧急' },
];

// ==================== 任务类型 ====================

export type TaskType = 'frontend' | 'backend' | 'test' | 'design' | 'other';

export const TASK_TYPE_CONFIG: Record<TaskType, {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
}> = {
  frontend: {
    label: '前端',
    color: 'cyan',
    bgColor: 'bg-cyan-100',
    textColor: 'text-cyan-700',
  },
  backend: {
    label: '后端',
    color: 'purple',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-700',
  },
  test: {
    label: '测试',
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
  },
  design: {
    label: '设计',
    color: 'pink',
    bgColor: 'bg-pink-100',
    textColor: 'text-pink-700',
  },
  other: {
    label: '其他',
    color: 'gray',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700',
  },
};

export const TASK_TYPE_OPTIONS: { value: TaskType; label: string }[] = [
  { value: 'frontend', label: '前端' },
  { value: 'backend', label: '后端' },
  { value: 'test', label: '测试' },
  { value: 'design', label: '设计' },
  { value: 'other', label: '其他' },
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

// ==================== 项目类型 ====================

export type ProjectType = 'product_development' | 'functional_management';

export const PROJECT_TYPE_CONFIG: Record<ProjectType, {
  label: string;
  description: string;
}> = {
  product_development: {
    label: '产品开发',
    description: '面向产品的研发项目',
  },
  functional_management: {
    label: '职能管理',
    description: '部门日常运营管理',
  },
};

export const PROJECT_TYPE_OPTIONS: { value: ProjectType; label: string }[] = [
  { value: 'product_development', label: '产品开发' },
  { value: 'functional_management', label: '职能管理' },
];

// ==================== 用户角色 ====================

export type UserRole = 'admin' | 'tech_manager' | 'department_manager' | 'engineer';

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
  department_manager: {
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
  { value: 'department_manager', label: '部门经理' },
  { value: 'engineer', label: '工程师' },
];
