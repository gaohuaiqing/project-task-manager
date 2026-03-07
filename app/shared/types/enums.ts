/**
 * 共享枚举类型定义 - 前后端通用
 *
 * 此文件包含前后端共享的枚举类型
 * 确保枚举值在前后端完全一致
 */

/**
 * 用户角色
 */
export type UserRole =
  | 'admin'           // 系统管理员
  | 'tech_manager'    // 技术经理
  | 'dept_manager'    // 部门经理
  | 'engineer';       // 工程师

/**
 * 用户角色列表
 */
export const USER_ROLES: readonly UserRole[] = ['admin', 'tech_manager', 'dept_manager', 'engineer'] as const;

/**
 * 用户角色显示名称
 */
export const USER_ROLE_NAMES: Record<UserRole, string> = {
  admin: '系统管理员',
  tech_manager: '技术经理',
  dept_manager: '部门经理',
  engineer: '工程师',
} as const;

/**
 * 项目状态
 */
export type ProjectStatus =
  | 'planning'        // 计划中
  | 'in_progress'     // 进行中
  | 'completed'       // 已完成
  | 'delayed'         // 已延期
  | 'archived';       // 已归档

/**
 * 项目状态列表
 */
export const PROJECT_STATUSES: readonly ProjectStatus[] = ['planning', 'in_progress', 'completed', 'delayed', 'archived'] as const;

/**
 * 项目状态显示名称
 */
export const PROJECT_STATUS_NAMES: Record<ProjectStatus, string> = {
  planning: '计划中',
  in_progress: '进行中',
  completed: '已完成',
  delayed: '已延期',
  archived: '已归档',
} as const;

/**
 * 项目类型
 */
export type ProjectType =
  | 'product_development'      // 产品研发
  | 'functional_management';   // 职能管理

/**
 * 项目类型列表
 */
export const PROJECT_TYPES: readonly ProjectType[] = ['product_development', 'functional_management'] as const;

/**
 * 项目类型显示名称
 */
export const PROJECT_TYPE_NAMES: Record<ProjectType, string> = {
  product_development: '产品研发',
  functional_management: '职能管理',
} as const;

/**
 * 项目成员角色
 */
export type ProjectMemberRole =
  | 'owner'      // 所有者
  | 'manager'    // 管理者
  | 'member'     // 成员
  | 'viewer';    // 查看者

/**
 * 项目成员角色列表
 */
export const PROJECT_MEMBER_ROLES: readonly ProjectMemberRole[] = ['owner', 'manager', 'member', 'viewer'] as const;

/**
 * 项目成员角色显示名称
 */
export const PROJECT_MEMBER_ROLE_NAMES: Record<ProjectMemberRole, string> = {
  owner: '所有者',
  manager: '管理者',
  member: '成员',
  viewer: '查看者',
} as const;

/**
 * WBS 任务状态
 *
 * 注意：数据库使用 'pending'，前端使用 'not_started'
 * 此类型统一使用数据库值 'pending'，前端需要适配
 */
export type WbsTaskStatus =
  | 'pending'       // 待开始（前端显示为"未开始"）
  | 'in_progress'   // 进行中
  | 'completed'     // 已完成
  | 'delayed'       // 已延期
  | 'cancelled';    // 已取消

/**
 * WBS 任务状态列表
 */
export const WBS_TASK_STATUSES: readonly WbsTaskStatus[] = ['pending', 'in_progress', 'completed', 'delayed', 'cancelled'] as const;

/**
 * WBS 任务状态显示名称
 */
export const WBS_TASK_STATUS_NAMES: Record<WbsTaskStatus, string> = {
  pending: '未开始',
  in_progress: '进行中',
  completed: '已完成',
  delayed: '已延期',
  cancelled: '已取消',
} as const;

/**
 * WBS 任务状态前端适配
 * 前端旧的 'not_started' 状态映射到 'pending'
 */
export const WBS_TASK_STATUS_FRONTEND_MAP: Record<string, WbsTaskStatus> = {
  not_started: 'pending',
  pending: 'pending',
  in_progress: 'in_progress',
  completed: 'completed',
  delayed: 'delayed',
  cancelled: 'cancelled',
} as const;

/**
 * WBS 任务优先级
 */
export type WbsTaskPriority =
  | 'low'        // 低
  | 'medium'     // 中
  | 'high'       // 高
  | 'urgent';    // 紧急

/**
 * WBS 任务优先级列表
 */
export const WBS_TASK_PRIORITIES: readonly WbsTaskPriority[] = ['low', 'medium', 'high', 'urgent'] as const;

/**
 * WBS 任务优先级显示名称
 */
export const WBS_TASK_PRIORITY_NAMES: Record<WbsTaskPriority, string> = {
  low: '低',
  medium: '中',
  high: '高',
  urgent: '紧急',
} as const;

/**
 * WBS 任务优先级数值映射
 */
export const WBS_TASK_PRIORITY_VALUES: Record<WbsTaskPriority, number> = {
  low: 1,
  medium: 2,
  high: 3,
  urgent: 4,
} as const;

/**
 * 里程碑状态
 */
export type MilestoneStatus =
  | 'pending'       // 待开始
  | 'in_progress'   // 进行中
  | 'completed'     // 已完成
  | 'delayed'       // 已延期
  | 'cancelled';    // 已取消

/**
 * 里程碑状态列表
 */
export const MILESTONE_STATUSES: readonly MilestoneStatus[] = ['pending', 'in_progress', 'completed', 'delayed', 'cancelled'] as const;

/**
 * 里程碑状态显示名称
 */
export const MILESTONE_STATUS_NAMES: Record<MilestoneStatus, string> = {
  pending: '待开始',
  in_progress: '进行中',
  completed: '已完成',
  delayed: '已延期',
  cancelled: '已取消',
} as const;

/**
 * WBS 任务类型
 */
export type WbsTaskType =
  | 'milestone'    // 里程碑
  | 'phase'        // 阶段
  | 'task'         // 任务
  | 'deliverable'; // 交付物

/**
 * WBS 任务类型列表
 */
export const WBS_TASK_TYPES: readonly WbsTaskType[] = ['milestone', 'phase', 'task', 'deliverable'] as const;

/**
 * WBS 任务类型显示名称
 */
export const WBS_TASK_TYPE_NAMES: Record<WbsTaskType, string> = {
  milestone: '里程碑',
  phase: '阶段',
  task: '任务',
  deliverable: '交付物',
} as const;

/**
 * 成员状态
 */
export type MemberStatus =
  | 'active'     // 活跃
  | 'inactive';  // 非活跃

/**
 * 成员状态列表
 */
export const MEMBER_STATUSES: readonly MemberStatus[] = ['active', 'inactive'] as const;

/**
 * 成员状态显示名称
 */
export const MEMBER_STATUS_NAMES: Record<MemberStatus, string> = {
  active: '活跃',
  inactive: '非活跃',
} as const;

/**
 * 操作类型
 */
export type OperationType =
  | 'create'    // 创建
  | 'update'    // 更新
  | 'delete';   // 删除

/**
 * 操作类型列表
 */
export const OPERATION_TYPES: readonly OperationType[] = ['create', 'update', 'delete'] as const;

/**
 * 操作状态
 */
export type OperationStatus =
  | 'pending'       // 待处理
  | 'sent'          // 已发送
  | 'acknowledged'  // 已确认
  | 'conflict'      // 冲突
  | 'failed';       // 失败

/**
 * 操作状态列表
 */
export const OPERATION_STATUSES: readonly OperationStatus[] = ['pending', 'sent', 'acknowledged', 'conflict', 'failed'] as const;

/**
 * 审批状态
 */
export type ApprovalStatus =
  | 'pending'    // 待审批
  | 'approved'   // 已批准
  | 'rejected';  // 已拒绝

/**
 * 审批状态列表
 */
export const APPROVAL_STATUSES: readonly ApprovalStatus[] = ['pending', 'approved', 'rejected'] as const;

/**
 * 审批状态显示名称
 */
export const APPROVAL_STATUS_NAMES: Record<ApprovalStatus, string> = {
  pending: '待审批',
  approved: '已批准',
  rejected: '已拒绝',
} as const;

/**
 * 依赖关系类型
 */
export type DependencyType =
  | 'finish_to_start'   // 完成后开始 (FS)
  | 'start_to_start'    // 开始后开始 (SS)
  | 'finish_to_finish'  // 完成后完成 (FF)
  | 'start_to_finish';  // 开始后完成 (SF)

/**
 * 依赖关系类型列表
 */
export const DEPENDENCY_TYPES: readonly DependencyType[] = ['finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish'] as const;

/**
 * 依赖关系类型显示名称
 */
export const DEPENDENCY_TYPE_NAMES: Record<DependencyType, string> = {
  finish_to_start: '完成-开始',
  start_to_start: '开始-开始',
  finish_to_finish: '完成-完成',
  start_to_finish: '开始-完成',
} as const;

/**
 * 任务分配状态
 */
export type TaskAssignmentStatus =
  | 'active'      // 活跃
  | 'cancelled'   // 已取消
  | 'completed';  // 已完成

/**
 * 任务分配状态列表
 */
export const TASK_ASSIGNMENT_STATUSES: readonly TaskAssignmentStatus[] = ['active', 'cancelled', 'completed'] as const;

/**
 * 会话状态
 */
export type SessionStatus =
  | 'active'      // 活跃
  | 'terminated'; // 已终止

/**
 * 会话状态列表
 */
export const SESSION_STATUSES: readonly SessionStatus[] = ['active', 'terminated'] as const;

/**
 * WebSocket 消息类型
 */
export type WebSocketMessageType =
  | 'auth'                      // 认证
  | 'auth_success'              // 认证成功
  | 'data_update'               // 数据更新
  | 'data_sync'                 // 数据同步
  | 'data_operation'            // 数据操作
  | 'data_operation_response'   // 数据操作响应
  | 'global_data_update'        // 全局数据更新
  | 'global_data_updated'       // 全局数据已更新
  | 'heartbeat'                 // 心跳
  | 'heartbeat_ack'             // 心跳确认
  | 'ping'                      // Ping
  | 'request_sync'              // 请求同步
  | 'sync_response'             // 同步响应
  | 'session_terminated'        // 会话终止
  | 'error'                     // 错误
  | 'data_conflict';            // 数据冲突

/**
 * 数据访问范围
 */
export type DataAccessScope =
  | 'personal'     // 个人
  | 'department'   // 部门
  | 'all';         // 全部

/**
 * 数据访问范围列表
 */
export const DATA_ACCESS_SCOPES: readonly DataAccessScope[] = ['personal', 'department', 'all'] as const;

/**
 * 权限级别
 */
export type PermissionLevel =
  | 'none'    // 无权限
  | 'read'    // 只读
  | 'write'   // 读写
  | 'full';   // 完全控制

/**
 * 权限级别列表
 */
export const PERMISSION_LEVELS: readonly PermissionLevel[] = ['none', 'read', 'write', 'full'] as const;

/**
 * 权限级别显示名称
 */
export const PERMISSION_LEVEL_NAMES: Record<PermissionLevel, string> = {
  none: '无权限',
  read: '只读',
  write: '读写',
  full: '完全控制',
} as const;

/**
 * 组织节点类型
 */
export type OrgNodeType =
  | 'department'   // 部门
  | 'tech_group'   // 技术组
  | 'member';      // 成员

/**
 * 组织节点类型列表
 */
export const ORG_NODE_TYPES: readonly OrgNodeType[] = ['department', 'tech_group', 'member'] as const;

/**
 * 组织节点类型显示名称
 */
export const ORG_NODE_TYPE_NAMES: Record<OrgNodeType, string> = {
  department: '部门',
  tech_group: '技术组',
  member: '成员',
} as const;
