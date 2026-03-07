/**
 * 项目管理模块 - 统一类型定义
 *
 * 设计原则：
 * 1. 与 MySQL 数据库字段映射保持一致（使用 camelCase）
 * 2. id 使用 number 类型（MySQL 自增主键）
 * 3. 所有字段标记可选性
 * 4. 与后端 API 契约对齐
 *
 * @module types/project
 */

// ==================== 枚举类型 ====================

/**
 * 项目类型
 * - product_development: 产品开发类项目
 * - functional_management: 职能管理类项目
 * - material_substitution: 物料改代类项目
 * - troubleshooting: 故障排查类项目
 * - other: 其他项目
 */
export type ProjectType = 'product_development' | 'functional_management' | 'material_substitution' | 'troubleshooting' | 'other';

/**
 * 项目状态
 * - planning: 计划中
 * - in_progress: 进行中
 * - completed: 已完成
 * - delayed: 已延期
 * - archived: 已归档
 */
export type ProjectStatus = 'planning' | 'in_progress' | 'completed' | 'delayed' | 'archived';

/**
 * 项目成员角色
 */
export type ProjectMemberRole = 'owner' | 'manager' | 'member' | 'viewer';

/**
 * 里程碑状态
 */
export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'delayed' | 'cancelled';

// ==================== 常量 ====================

/**
 * 项目类型标签映射
 */
export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  product_development: '产品开发类',
  functional_management: '职能管理类',
  material_substitution: '物料改代类',
  troubleshooting: '故障排查类',
  other: '其他',
};

/**
 * 项目状态标签映射
 */
export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: '计划中',
  in_progress: '进行中',
  completed: '已完成',
  delayed: '已延期',
  archived: '已归档',
};

/**
 * 项目状态颜色映射（用于 UI 渲染）
 */
export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  planning: 'gray',
  in_progress: 'blue',
  completed: 'green',
  delayed: 'red',
  archived: 'slate',
};

/**
 * 项目成员角色标签映射
 */
export const PROJECT_MEMBER_ROLE_LABELS: Record<ProjectMemberRole, string> = {
  owner: '项目负责人',
  manager: '项目经理',
  member: '项目成员',
  viewer: '观察者',
};

// ==================== 核心类型 ====================

/**
 * 项目实体
 *
 * 与数据库表 projects 对应，字段名使用 camelCase
 */
export interface Project {
  /** 主键 ID（MySQL 自增） */
  id: number;
  /** 项目编码/工艺代号 */
  code: string;
  /** 项目名称 */
  name: string;
  /** 项目描述 */
  description?: string;
  /** 项目状态 */
  status: ProjectStatus;
  /** 项目类型 */
  projectType: ProjectType;
  /** 计划开始日期 */
  plannedStartDate?: string;
  /** 计划结束日期 */
  plannedEndDate?: string;
  /** 实际开始日期 */
  actualStartDate?: string;
  /** 实际结束日期 */
  actualEndDate?: string;
  /** 项目进度（0-100） */
  progress: number;
  /** 任务总数 */
  taskCount: number;
  /** 已完成任务数 */
  completedTaskCount: number;
  /** 创建人 ID */
  createdBy?: number;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
  /** 版本号（用于乐观锁） */
  version: number;
}

/**
 * 项目成员
 */
export interface ProjectMember {
  /** 主键 ID */
  id: number;
  /** 项目 ID */
  projectId: number;
  /** 成员 ID */
  memberId: number;
  /** 成员姓名（冗余字段，便于查询） */
  memberName?: string;
  /** 成员角色 */
  role: ProjectMemberRole;
  /** 加入时间 */
  joinedAt: string;
  /** 创建时间 */
  createdAt: string;
}

/**
 * 项目里程碑
 */
export interface ProjectMilestone {
  /** 主键 ID */
  id: number;
  /** 项目 ID */
  projectId: number;
  /** 里程碑名称 */
  name: string;
  /** 里程碑描述 */
  description?: string;
  /** 计划日期 */
  plannedDate: string;
  /** 实际日期 */
  actualDate?: string;
  /** 里程碑状态 */
  status: MilestoneStatus;
  /** 排序顺序 */
  sortOrder: number;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

/**
 * 项目计划（包含时间轴和里程碑）
 */
export interface ProjectPlan {
  /** 计划开始日期 */
  plannedStartDate: string;
  /** 计划结束日期 */
  plannedEndDate: string;
  /** 里程碑列表 */
  milestones: ProjectMilestone[];
}

/**
 * 时间轴事件
 */
export interface TimelineEvent {
  /** 事件 ID */
  id: string;
  /** 事件日期 */
  date: string;
  /** 事件标题 */
  title: string;
  /** 事件描述 */
  description: string;
  /** 事件类型 */
  type: 'milestone' | 'task' | 'note' | 'alert';
}

// ==================== 表单类型 ====================

/**
 * 项目创建/编辑表单数据
 */
export interface ProjectFormData {
  /** 项目 ID（编辑时必填） */
  id?: number;
  /** 项目编码 */
  code: string;
  /** 项目名称 */
  name: string;
  /** 项目描述 */
  description?: string;
  /** 项目类型 */
  projectType: ProjectType;
  /** 计划开始日期 */
  plannedStartDate?: string;
  /** 计划结束日期 */
  plannedEndDate?: string;
  /** 成员 ID 列表 */
  memberIds?: number[];
  /** 里程碑列表 */
  milestones?: Omit<ProjectMilestone, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>[];
  /** WBS任务列表（甘特图数据） */
  wbsTasks?: import('./wbs').WbsTask[];
}

/**
 * 项目成员表单数据
 */
export interface ProjectMemberFormData {
  /** 成员 ID */
  memberId: number;
  /** 成员角色 */
  role: ProjectMemberRole;
}

/**
 * 里程碑表单数据
 */
export interface MilestoneFormData {
  /** 里程碑 ID（编辑时必填） */
  id?: number;
  /** 里程碑名称 */
  name: string;
  /** 里程碑描述 */
  description?: string;
  /** 计划日期 */
  plannedDate: string;
}

// ==================== 过滤/查询类型 ====================

/**
 * 项目列表查询参数
 */
export interface ProjectQueryParams {
  /** 项目状态筛选 */
  status?: ProjectStatus[];
  /** 项目类型筛选 */
  projectType?: ProjectType[];
  /** 搜索关键词（匹配 code 或 name） */
  keyword?: string;
  /** 排序字段 */
  sortBy?: 'createdAt' | 'updatedAt' | 'name' | 'progress' | 'plannedEndDate';
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
  /** 分页偏移量 */
  offset?: number;
  /** 分页大小 */
  limit?: number;
}

/**
 * 项目统计信息
 */
export interface ProjectStatistics {
  /** 项目总数 */
  totalProjects: number;
  /** 进行中的项目数 */
  inProgressProjects: number;
  /** 已完成的项目数 */
  completedProjects: number;
  /** 延期的项目数 */
  delayedProjects: number;
  /** 平均进度 */
  averageProgress: number;
  /** 按状态分组统计 */
  byStatus: Record<ProjectStatus, number>;
  /** 按类型分组统计 */
  byType: Record<ProjectType, number>;
}

/**
 * 项目详情（包含关联数据）
 */
export interface ProjectDetail extends Project {
  /** 项目成员列表 */
  members: ProjectMember[];
  /** 项目里程碑列表 */
  milestones: ProjectMilestone[];
  /** 项目时间轴 */
  timeline: TimelineEvent[];
}

// ==================== API 响应类型 ====================

/**
 * 项目 API 响应包装
 */
export interface ProjectApiResponse<T> {
  /** 是否成功 */
  success: boolean;
  /** 响应数据 */
  data?: T;
  /** 错误消息 */
  message?: string;
  /** 当前版本号（版本冲突时返回） */
  currentVersion?: number;
}

// ==================== 类型守卫 ====================

/**
 * 检查是否为有效的项目类型
 */
export function isValidProjectType(value: string): value is ProjectType {
  return ['product_development', 'functional_management'].includes(value);
}

/**
 * 检查是否为有效的项目状态
 */
export function isValidProjectStatus(value: string): value is ProjectStatus {
  return ['planning', 'in_progress', 'completed', 'delayed', 'archived'].includes(value);
}

/**
 * 检查是否为有效的成员角色
 */
export function isValidMemberRole(value: string): value is ProjectMemberRole {
  return ['owner', 'manager', 'member', 'viewer'].includes(value);
}

// ==================== 工具函数 ====================

/**
 * 格式化项目进度显示
 */
export function formatProjectProgress(progress: number): string {
  return `${Math.round(progress)}%`;
}

/**
 * 计算项目剩余天数
 */
export function calculateRemainingDays(project: Project): number | null {
  if (!project.plannedEndDate) return null;

  const endDate = new Date(project.plannedEndDate);
  const today = new Date();
  const diffTime = endDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * 判断项目是否延期
 */
export function isProjectDelayed(project: Project): boolean {
  if (project.status === 'completed' || project.status === 'delayed') {
    return project.status === 'delayed';
  }

  if (!project.plannedEndDate) return false;

  const endDate = new Date(project.plannedEndDate);
  const today = new Date();

  return today > endDate && project.progress < 100;
}

/**
 * 获取项目下一个里程碑
 */
export function getNextMilestone(milestones: ProjectMilestone[]): ProjectMilestone | null {
  const pendingMilestones = milestones
    .filter(m => m.status === 'pending')
    .sort((a, b) => new Date(a.plannedDate).getTime() - new Date(b.plannedDate).getTime());

  return pendingMilestones[0] || null;
}
