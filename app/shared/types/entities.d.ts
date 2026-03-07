/**
 * 共享实体类型定义 - 前后端通用
 *
 * 此文件包含前后端共享的实体类型定义
 * 确保实体结构在前后端完全一致
 */
import type { EntityId, DbTimestamp, DbDate, AuditFields } from './common.js';
import type { UserRole, ProjectStatus, ProjectType, ProjectMemberRole, WbsTaskStatus, WbsTaskType, MilestoneStatus, MemberStatus } from './enums.js';
/**
 * 用户实体
 */
export interface User extends AuditFields {
    id: EntityId;
    username: string;
    password: string;
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
    skills: Record<string, unknown> | null;
    capabilities: Record<string, unknown> | null;
    status: MemberStatus;
    version: number;
    userId: EntityId | null;
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
    actualStartDate: DbDate | null;
    actualEndDate: DbDate | null;
    progress: number;
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
    memberId: EntityId;
    role: ProjectMemberRole;
    joinedAt: DbTimestamp;
    memberName?: string;
    createdBy: EntityId | null;
    deletedAt: DbTimestamp | null;
}
/**
 * 项目成员详情（包含关联信息）
 */
export interface ProjectMemberDetail extends ProjectMember {
    member: MemberSummary;
    user?: UserInfo;
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
    actualDate: DbDate | null;
    status: MilestoneStatus;
    sortOrder: number;
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
    priority: number;
    estimatedHours: number | null;
    actualHours: number | null;
    progress: number;
    plannedStartDate: DbDate | null;
    plannedEndDate: DbDate | null;
    actualStartDate: DbDate | null;
    actualEndDate: DbDate | null;
    assigneeId: EntityId | null;
    dependencies: Record<string, unknown> | null;
    tags: string[] | null;
    attachments: Record<string, unknown> | null;
    version: number;
    createdBy: EntityId | null;
    wbsCode?: string;
    level?: number;
    subtasks?: EntityId[];
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
    taskId: EntityId;
    assigneeId: EntityId;
    assignedBy: EntityId;
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
    changeData: string | null;
    createdAt: DbTimestamp;
}
/**
 * 审计日志
 */
export interface AuditLog {
    id: string;
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
    isWorkday: boolean;
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
//# sourceMappingURL=entities.d.ts.map