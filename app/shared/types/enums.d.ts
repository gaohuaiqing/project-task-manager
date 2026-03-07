/**
 * 共享枚举类型定义 - 前后端通用
 *
 * 此文件包含前后端共享的枚举类型
 * 确保枚举值在前后端完全一致
 */
/**
 * 用户角色
 */
export type UserRole = 'admin' | 'tech_manager' | 'dept_manager' | 'engineer';
/**
 * 用户角色列表
 */
export declare const USER_ROLES: readonly UserRole[];
/**
 * 用户角色显示名称
 */
export declare const USER_ROLE_NAMES: Record<UserRole, string>;
/**
 * 项目状态
 */
export type ProjectStatus = 'planning' | 'in_progress' | 'completed' | 'delayed' | 'archived';
/**
 * 项目状态列表
 */
export declare const PROJECT_STATUSES: readonly ProjectStatus[];
/**
 * 项目状态显示名称
 */
export declare const PROJECT_STATUS_NAMES: Record<ProjectStatus, string>;
/**
 * 项目类型
 */
export type ProjectType = 'product_development' | 'functional_management';
/**
 * 项目类型列表
 */
export declare const PROJECT_TYPES: readonly ProjectType[];
/**
 * 项目类型显示名称
 */
export declare const PROJECT_TYPE_NAMES: Record<ProjectType, string>;
/**
 * 项目成员角色
 */
export type ProjectMemberRole = 'owner' | 'manager' | 'member' | 'viewer';
/**
 * 项目成员角色列表
 */
export declare const PROJECT_MEMBER_ROLES: readonly ProjectMemberRole[];
/**
 * 项目成员角色显示名称
 */
export declare const PROJECT_MEMBER_ROLE_NAMES: Record<ProjectMemberRole, string>;
/**
 * WBS 任务状态
 *
 * 注意：数据库使用 'pending'，前端使用 'not_started'
 * 此类型统一使用数据库值 'pending'，前端需要适配
 */
export type WbsTaskStatus = 'pending' | 'in_progress' | 'completed' | 'delayed' | 'cancelled';
/**
 * WBS 任务状态列表
 */
export declare const WBS_TASK_STATUSES: readonly WbsTaskStatus[];
/**
 * WBS 任务状态显示名称
 */
export declare const WBS_TASK_STATUS_NAMES: Record<WbsTaskStatus, string>;
/**
 * WBS 任务状态前端适配
 * 前端旧的 'not_started' 状态映射到 'pending'
 */
export declare const WBS_TASK_STATUS_FRONTEND_MAP: Record<string, WbsTaskStatus>;
/**
 * WBS 任务优先级
 */
export type WbsTaskPriority = 'low' | 'medium' | 'high' | 'urgent';
/**
 * WBS 任务优先级列表
 */
export declare const WBS_TASK_PRIORITIES: readonly WbsTaskPriority[];
/**
 * WBS 任务优先级显示名称
 */
export declare const WBS_TASK_PRIORITY_NAMES: Record<WbsTaskPriority, string>;
/**
 * WBS 任务优先级数值映射
 */
export declare const WBS_TASK_PRIORITY_VALUES: Record<WbsTaskPriority, number>;
/**
 * 里程碑状态
 */
export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'delayed' | 'cancelled';
/**
 * 里程碑状态列表
 */
export declare const MILESTONE_STATUSES: readonly MilestoneStatus[];
/**
 * 里程碑状态显示名称
 */
export declare const MILESTONE_STATUS_NAMES: Record<MilestoneStatus, string>;
/**
 * WBS 任务类型
 */
export type WbsTaskType = 'milestone' | 'phase' | 'task' | 'deliverable';
/**
 * WBS 任务类型列表
 */
export declare const WBS_TASK_TYPES: readonly WbsTaskType[];
/**
 * WBS 任务类型显示名称
 */
export declare const WBS_TASK_TYPE_NAMES: Record<WbsTaskType, string>;
/**
 * 成员状态
 */
export type MemberStatus = 'active' | 'inactive';
/**
 * 成员状态列表
 */
export declare const MEMBER_STATUSES: readonly MemberStatus[];
/**
 * 成员状态显示名称
 */
export declare const MEMBER_STATUS_NAMES: Record<MemberStatus, string>;
/**
 * 操作类型
 */
export type OperationType = 'create' | 'update' | 'delete';
/**
 * 操作类型列表
 */
export declare const OPERATION_TYPES: readonly OperationType[];
/**
 * 操作状态
 */
export type OperationStatus = 'pending' | 'sent' | 'acknowledged' | 'conflict' | 'failed';
/**
 * 操作状态列表
 */
export declare const OPERATION_STATUSES: readonly OperationStatus[];
/**
 * 审批状态
 */
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
/**
 * 审批状态列表
 */
export declare const APPROVAL_STATUSES: readonly ApprovalStatus[];
/**
 * 审批状态显示名称
 */
export declare const APPROVAL_STATUS_NAMES: Record<ApprovalStatus, string>;
/**
 * 依赖关系类型
 */
export type DependencyType = 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';
/**
 * 依赖关系类型列表
 */
export declare const DEPENDENCY_TYPES: readonly DependencyType[];
/**
 * 依赖关系类型显示名称
 */
export declare const DEPENDENCY_TYPE_NAMES: Record<DependencyType, string>;
/**
 * 任务分配状态
 */
export type TaskAssignmentStatus = 'active' | 'cancelled' | 'completed';
/**
 * 任务分配状态列表
 */
export declare const TASK_ASSIGNMENT_STATUSES: readonly TaskAssignmentStatus[];
/**
 * 会话状态
 */
export type SessionStatus = 'active' | 'terminated';
/**
 * 会话状态列表
 */
export declare const SESSION_STATUSES: readonly SessionStatus[];
/**
 * WebSocket 消息类型
 */
export type WebSocketMessageType = 'auth' | 'auth_success' | 'data_update' | 'data_sync' | 'data_operation' | 'data_operation_response' | 'global_data_update' | 'global_data_updated' | 'heartbeat' | 'heartbeat_ack' | 'ping' | 'request_sync' | 'sync_response' | 'session_terminated' | 'error' | 'data_conflict';
/**
 * 数据访问范围
 */
export type DataAccessScope = 'personal' | 'department' | 'all';
/**
 * 数据访问范围列表
 */
export declare const DATA_ACCESS_SCOPES: readonly DataAccessScope[];
/**
 * 权限级别
 */
export type PermissionLevel = 'none' | 'read' | 'write' | 'full';
/**
 * 权限级别列表
 */
export declare const PERMISSION_LEVELS: readonly PermissionLevel[];
/**
 * 权限级别显示名称
 */
export declare const PERMISSION_LEVEL_NAMES: Record<PermissionLevel, string>;
/**
 * 组织节点类型
 */
export type OrgNodeType = 'department' | 'tech_group' | 'member';
/**
 * 组织节点类型列表
 */
export declare const ORG_NODE_TYPES: readonly OrgNodeType[];
/**
 * 组织节点类型显示名称
 */
export declare const ORG_NODE_TYPE_NAMES: Record<OrgNodeType, string>;
//# sourceMappingURL=enums.d.ts.map