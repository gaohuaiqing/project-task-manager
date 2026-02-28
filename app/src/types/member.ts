/**
 * 统一成员类型定义
 *
 * 整合组织架构成员和通用成员类型，避免重复定义
 *
 * @module types/member
 */

// 从组织架构导入基础类型
export type {
  Member as OrgMember,
  MemberCapabilities,
} from './organization';

// ==================== 成员状态类型 ====================

/**
 * 成员在线状态
 */
export type MemberOnlineStatus = 'online' | 'offline' | 'busy' | 'away';

/**
 * 成员等级（职级）
 */
export type MemberLevel = `E${number}`; // E5 ~ E16

/**
 * 成员角色类型（组织架构）
 */
export type MemberRole = 'dept_manager' | 'tech_manager' | 'engineer';

// ==================== 统一成员类型 ====================

/**
 * 统一成员接口
 * 整合了组织架构成员和工作状态成员的所有属性
 */
export interface Member {
  // ==================== 基础信息 ====================
  /** 成员 ID */
  id: string;
  /** 成员姓名 */
  name: string;
  /** 员工工号 */
  employeeId: string;

  // ==================== 组织信息 ====================
  /** 成员角色（部门经理/技术经理/工程师） */
  role: MemberRole;
  /** 所属部门 ID */
  departmentId?: string;
  /** 所属部门名称 */
  departmentName?: string;
  /** 所属技术组 ID */
  techGroupId?: string;
  /** 所属技术组名称 */
  techGroupName?: string;
  /** 直属主管 ID */
  directSupervisorId?: string;
  /** 直属主管姓名 */
  directSupervisorName?: string;
  /** 父节点 ID */
  parentId?: string | null;

  // ==================== 工作状态 ====================
  /** 在线状态 */
  onlineStatus: MemberOnlineStatus;
  /** 职级 */
  level: MemberLevel;
  /** 当前任务数量 */
  currentTasks: number;
  /** 工作饱和度 (0-100) */
  saturation: number;
  /** 已完成任务数 */
  completedTasks: number;

  // ==================== 能力信息 ====================
  /** 能力评估 */
  capabilities?: Record<string, number>;
  /** 能力历史记录 */
  capabilityHistory?: CapabilityAssessmentRecord[];

  // ==================== 个性化信息 ====================
  /** 头像 URL */
  avatar?: string;
  /** 个性标签 */
  personality?: string;
  /** 个人简介 */
  bio?: string;

  // ==================== 时间戳 ====================
  /** 创建时间 */
  createdAt: number;
  /** 更新时间 */
  updatedAt: number;
}

/**
 * 能力评估记录
 */
export interface CapabilityAssessmentRecord {
  id: string;
  memberId: string;
  assessorId: string;
  assessorName: string;
  assessmentDate: number;
  capabilities: Record<string, number>;
  overallScore: number;
  comments: string;
  assessmentType: 'initial' | 'periodic' | 'promotion' | 'project';
  previousCapabilities?: Record<string, number>;
}

// ==================== 成员查询参数 ====================

/**
 * 成员查询参数
 */
export interface MemberQueryParams {
  /** 部门 ID 筛选 */
  departmentId?: string;
  /** 技术组 ID 筛选 */
  techGroupId?: string;
  /** 角色筛选 */
  role?: MemberRole;
  /** 在线状态筛选 */
  onlineStatus?: MemberOnlineStatus;
  /** 搜索关键词（姓名或工号） */
  keyword?: string;
  /** 能力维度筛选 */
  capabilityDimension?: string;
  /** 能力值最小值 */
  minCapability?: number;
  /** 排序字段 */
  sortBy?: 'name' | 'employeeId' | 'saturation' | 'completedTasks';
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
  /** 分页偏移 */
  offset?: number;
  /** 分页大小 */
  limit?: number;
}

// ==================== 成员统计信息 ====================

/**
 * 成员统计信息
 */
export interface MemberStatistics {
  /** 总成员数 */
  totalMembers: number;
  /** 在线成员数 */
  onlineMembers: number;
  /** 繁忙成员数 */
  busyMembers: number;
  /** 平均饱和度 */
  averageSaturation: number;
  /** 按角色分组 */
  byRole: Record<MemberRole, number>;
  /** 按部门分组 */
  byDepartment: Record<string, number>;
}

// ==================== 成员表单类型 ====================

/**
 * 成员创建/编辑表单数据
 */
export interface MemberFormData {
  /** 成员 ID（编辑时必填） */
  id?: string;
  /** 姓名 */
  name: string;
  /** 工号 */
  employeeId: string;
  /** 角色 */
  role: MemberRole;
  /** 所属部门 ID */
  departmentId?: string;
  /** 所属技术组 ID */
  techGroupId?: string;
  /** 直属主管 ID */
  directSupervisorId?: string;
  /** 能力评估 */
  capabilities?: Record<string, number>;
}

// ==================== 成员操作结果 ====================

/**
 * 成员操作结果
 */
export interface MemberOperationResult {
  /** 是否成功 */
  success: boolean;
  /** 消息 */
  message: string;
  /** 成员数据（成功时） */
  member?: Member;
  /** 错误码（失败时） */
  errorCode?: string;
}

// ==================== 类型守卫 ====================

/**
 * 检查是否为有效的成员角色
 */
export function isValidMemberRole(value: string): value is MemberRole {
  return ['dept_manager', 'tech_manager', 'engineer'].includes(value);
}

/**
 * 检查是否为有效的在线状态
 */
export function isValidOnlineStatus(value: string): value is MemberOnlineStatus {
  return ['online', 'offline', 'busy', 'away'].includes(value);
}

/**
 * 检查是否为有效的职级
 */
export function isValidMemberLevel(value: string): value is MemberLevel {
  return /^E\d{2}$/.test(value);
}

// ==================== 工具函数 ====================

/**
 * 获取成员角色显示名称
 */
export function getMemberRoleLabel(role: MemberRole): string {
  const labels: Record<MemberRole, string> = {
    dept_manager: '部门经理',
    tech_manager: '技术经理',
    engineer: '工程师',
  };
  return labels[role] || role;
}

/**
 * 获取在线状态显示名称
 */
export function getOnlineStatusLabel(status: MemberOnlineStatus): string {
  const labels: Record<MemberOnlineStatus, string> = {
    online: '在线',
    offline: '离线',
    busy: '忙碌',
    away: '离开',
  };
  return labels[status] || status;
}

/**
 * 获取在线状态颜色类名
 */
export function getOnlineStatusColor(status: MemberOnlineStatus): string {
  const colors: Record<MemberOnlineStatus, string> = {
    online: 'text-green-400',
    offline: 'text-gray-400',
    busy: 'text-red-400',
    away: 'text-yellow-400',
  };
  return colors[status] || 'text-gray-400';
}

/**
 * 计算成员饱和度等级
 */
export function getSaturationLevel(saturation: number): 'low' | 'medium' | 'high' | 'overload' {
  if (saturation < 50) return 'low';
  if (saturation < 75) return 'medium';
  if (saturation < 100) return 'high';
  return 'overload';
}

/**
 * 获取成员显示名称
 */
export function getMemberDisplayName(member: Member): string {
  return member.name || member.employeeId || '未知成员';
}

// ==================== 导出兼容性类型 ====================

/**
 * 向后兼容的 Member 类型别名
 * 用于过渡时期，保持与旧代码的兼容性
 */
export type LegacyMember = Member;

/**
 * 组织架构成员类型（简化版，用于组件展示）
 */
export interface DisplayMember {
  id: string;
  name: string;
  avatar?: string;
  employeeId?: string;
  role?: string;
  department?: string;
  techGroup?: string;
  onlineStatus?: MemberOnlineStatus;
}
