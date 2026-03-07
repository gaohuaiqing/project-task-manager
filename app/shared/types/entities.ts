/**
 * 共享实体类型定义 - 前后端通用
 *
 * 此文件包含前后端共享的实体类型定义
 * 确保实体结构在前后端完全一致
 */

import type { EntityId, DbTimestamp, DbDate, AuditFields } from './common.js';
import type {
  UserRole,
  ProjectStatus,
  ProjectType,
  ProjectMemberRole,
  WbsTaskStatus,
  WbsTaskPriority,
  WbsTaskType,
  MilestoneStatus,
  MemberStatus,
} from './enums.js';

/**
 * 用户实体
 */
export interface User extends AuditFields {
  id: EntityId;
  username: string;
  password: string; // 哈希后的密码
  role: UserRole;
  name: string;
}

/**
 * 用户信息（不包含密码）
 */
export type UserInfo = Omit<User, 'password'>;

/**
 * 成员实体
 */
export interface Member extends AuditFields {
  id: EntityId;
  name: string;
  employeeId: string | null;
  department: string | null;
  position: string | null;
  skills: Record<string, unknown> | null; // JSON 字段
  capabilities: Record<string, unknown> | null; // JSON 字段
  status: MemberStatus;
  version: number;
  userId: EntityId | null; // 关联的用户账户ID
}

/**
 * 成员简化信息
 */
export interface MemberSummary {
  id: EntityId;
  name: string;
  employeeId: string | null;
  department: string | null;
  position: string | null;
  status: MemberStatus;
}

/**
 * 项目实体
 */
export interface Project extends AuditFields {
  id: EntityId;
  code: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  projectType: ProjectType;
  plannedStartDate: DbDate | null;
  plannedEndDate: DbDate | null;
  actualStartDate: DbDate | null; // 新增字段
  actualEndDate: DbDate | null; // 新增字段
  progress: number; // 0-100
  taskCount: number;
  completedTaskCount: number;
  createdBy: EntityId | null;
}

/**
 * 项目简化信息
 */
export interface ProjectSummary {
  id: EntityId;
  code: string;
  name: string;
  status: ProjectStatus;
  projectType: ProjectType;
  progress: number;
  plannedStartDate: DbDate | null;
  plannedEndDate: DbDate | null;
}

/**
 * 项目成员关联
 */
export interface ProjectMember extends AuditFields {
  id: EntityId;
  projectId: EntityId;
  memberId: EntityId; // 引用 members.id
  role: ProjectMemberRole;
  joinedAt: DbTimestamp;
  memberName?: string; // 冗余字段，方便查询
  createdBy: EntityId | null;
  deletedAt: DbTimestamp | null;
}

/**
 * 项目成员详情（包含关联信息）
 */
export interface ProjectMemberDetail extends ProjectMember {
  member: MemberSummary;
  user?: UserInfo; // 如果成员有关联的用户账户
}

/**
 * 项目里程碑
 */
export interface ProjectMilestone extends AuditFields {
  id: EntityId;
  projectId: EntityId;
  name: string;
  description: string | null;
  plannedDate: DbDate;
  actualDate: DbDate | null; // 新增字段
  status: MilestoneStatus;
  sortOrder: number; // 新增字段，排序序号
  createdBy: EntityId | null;
  deletedAt: DbTimestamp | null;
}

/**
 * WBS 任务实体
 */
export interface WbsTask extends AuditFields {
  id: EntityId;
  projectId: EntityId;
  parentId: EntityId | null;
  taskCode: string;
  taskName: string;
  description: string | null;
  taskType: WbsTaskType;
  status: WbsTaskStatus;
  priority: number; // 1-5，映射到 WbsTaskPriority
  estimatedHours: number | null;
  actualHours: number | null;
  progress: number; // 0-100
  plannedStartDate: DbDate | null;
  plannedEndDate: DbDate | null;
  actualStartDate: DbDate | null;
  actualEndDate: DbDate | null;
  assigneeId: EntityId | null; // 引用 members.id
  dependencies: Record<string, unknown> | null; // JSON 字段
  tags: string[] | null; // JSON 字段，转换为数组
  attachments: Record<string, unknown> | null; // JSON 字段
  version: number;
  createdBy: EntityId | null;
  // 新增字段（阶段3添加）
  wbsCode?: string; // WBS 编码，如 "1.1.2"
  level?: number; // 层级深度
  subtasks?: EntityId[]; // 子任务ID数组
}

/**
 * WBS 任务简化信息
 */
export interface WbsTaskSummary {
  id: EntityId;
  projectId: EntityId;
  taskCode: string;
  taskName: string;
  status: WbsTaskStatus;
  priority: number;
  progress: number;
  plannedStartDate: DbDate | null;
  plannedEndDate: DbDate | null;
  assigneeId: EntityId | null;
}

/**
 * WBS 任务详情（包含关联信息）
 */
export interface WbsTaskDetail extends WbsTask {
  project: ProjectSummary;
  parent?: WbsTaskSummary;
  assignee?: MemberSummary;
  subtasksList?: WbsTaskSummary[];
  dependenciesList?: WbsTaskSummary[];
}

/**
 * 任务分配历史
 */
export interface TaskAssignment extends AuditFields {
  id: EntityId;
  taskId: EntityId; // 引用 wbs_tasks.id
  assigneeId: EntityId; // 引用 members.id
  assignedBy: EntityId; // 引用 users.id
  assignedAt: DbTimestamp;
  unassignedAt: DbTimestamp | null;
  status: 'active' | 'cancelled' | 'completed';
  notes: string | null;
}

/**
 * 任务分配详情（包含关联信息）
 */
export interface TaskAssignmentDetail extends TaskAssignment {
  task: WbsTaskSummary;
  assignee: MemberSummary;
  assignedByUser: UserInfo;
}

/**
 * 用户会话
 */
export interface Session {
  id: EntityId;
  sessionId: string;
  userId: EntityId;
  deviceId: string;
  deviceInfo: string | null;
  ipAddress: string | null;
  status: 'active' | 'terminated';
  terminationReason: string | null;
  terminationTimestamp: number | null;
  createdAt: number;
  lastAccessed: number;
  expiresAt: number;
}

/**
 * 用户配置
 */
export interface UserConfig {
  id: EntityId;
  userId: EntityId;
  configKey: string;
  configValue: string;
  updatedAt: DbTimestamp;
}

/**
 * 数据变更日志
 */
export interface DataChangeLog {
  id: EntityId;
  changeType: 'create' | 'update' | 'delete';
  entityType: string;
  entityId: EntityId;
  userId: EntityId;
  changeData: string | null; // JSON 字符串
  createdAt: DbTimestamp;
}

/**
 * 审计日志
 */
export interface AuditLog {
  id: string; // UUID
  operationType: string;
  result: 'success' | 'failure' | 'warning';
  userId: EntityId | null;
  username: string | null;
  targetId: EntityId | null;
  targetType: string | null;
  targetName: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  sessionId: string | null;
  serverNode: string | null;
  createdAt: DbTimestamp;
}

/**
 * 节假日
 */
export interface Holiday extends AuditFields {
  id: EntityId;
  holidayDate: DbDate;
  name: string;
  isWorkday: boolean; // 是否为调休工作日
  year: number;
}

/**
 * 全局数据
 */
export interface GlobalData extends AuditFields {
  id: EntityId;
  dataType: string;
  dataId: string;
  dataJson: Record<string, unknown>;
  version: number;
  createdBy: EntityId;
  updatedBy: EntityId;
}

/**
 * 数据变更日志（新的）
 */
export interface DataChangeLogNew {
  id: EntityId;
  dataType: string;
  dataId: string;
  action: 'create' | 'update' | 'delete';
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  changedBy: EntityId;
  changeReason: string | null;
  version: number;
  createdAt: DbTimestamp;
}

/**
 * 数据锁
 */
export interface DataLock {
  id: EntityId;
  dataType: string;
  dataId: string;
  lockedBy: EntityId;
  lockedAt: DbTimestamp;
  expiresAt: DbTimestamp;
  lockReason: string | null;
}

/**
 * 在线用户
 */
export interface OnlineUser {
  sessionId: string;
  userId: EntityId;
  username: string;
  deviceInfo: string | null;
  ipAddress: string | null;
  lastSeen: DbTimestamp;
}

/**
 * 数据版本
 */
export interface DataVersion {
  id: EntityId;
  entityType: string;
  entityId: EntityId;
  version: number;
  changedBy: EntityId;
  changeType: 'create' | 'update' | 'delete';
  changeData: Record<string, unknown> | null;
  changeReason: string | null;
  createdAt: DbTimestamp;
}
