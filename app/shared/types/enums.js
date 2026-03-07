/**
 * 共享枚举类型定义 - 前后端通用
 *
 * 此文件包含前后端共享的枚举类型
 * 确保枚举值在前后端完全一致
 */
/**
 * 用户角色列表
 */
export const USER_ROLES = ['admin', 'tech_manager', 'dept_manager', 'engineer'];
/**
 * 用户角色显示名称
 */
export const USER_ROLE_NAMES = {
    admin: '系统管理员',
    tech_manager: '技术经理',
    dept_manager: '部门经理',
    engineer: '工程师',
};
/**
 * 项目状态列表
 */
export const PROJECT_STATUSES = ['planning', 'in_progress', 'completed', 'delayed', 'archived'];
/**
 * 项目状态显示名称
 */
export const PROJECT_STATUS_NAMES = {
    planning: '计划中',
    in_progress: '进行中',
    completed: '已完成',
    delayed: '已延期',
    archived: '已归档',
};
/**
 * 项目类型列表
 */
export const PROJECT_TYPES = ['product_development', 'functional_management'];
/**
 * 项目类型显示名称
 */
export const PROJECT_TYPE_NAMES = {
    product_development: '产品研发',
    functional_management: '职能管理',
};
/**
 * 项目成员角色列表
 */
export const PROJECT_MEMBER_ROLES = ['owner', 'manager', 'member', 'viewer'];
/**
 * 项目成员角色显示名称
 */
export const PROJECT_MEMBER_ROLE_NAMES = {
    owner: '所有者',
    manager: '管理者',
    member: '成员',
    viewer: '查看者',
};
/**
 * WBS 任务状态列表
 */
export const WBS_TASK_STATUSES = ['pending', 'in_progress', 'completed', 'delayed', 'cancelled'];
/**
 * WBS 任务状态显示名称
 */
export const WBS_TASK_STATUS_NAMES = {
    pending: '未开始',
    in_progress: '进行中',
    completed: '已完成',
    delayed: '已延期',
    cancelled: '已取消',
};
/**
 * WBS 任务状态前端适配
 * 前端旧的 'not_started' 状态映射到 'pending'
 */
export const WBS_TASK_STATUS_FRONTEND_MAP = {
    not_started: 'pending',
    pending: 'pending',
    in_progress: 'in_progress',
    completed: 'completed',
    delayed: 'delayed',
    cancelled: 'cancelled',
};
/**
 * WBS 任务优先级列表
 */
export const WBS_TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
/**
 * WBS 任务优先级显示名称
 */
export const WBS_TASK_PRIORITY_NAMES = {
    low: '低',
    medium: '中',
    high: '高',
    urgent: '紧急',
};
/**
 * WBS 任务优先级数值映射
 */
export const WBS_TASK_PRIORITY_VALUES = {
    low: 1,
    medium: 2,
    high: 3,
    urgent: 4,
};
/**
 * 里程碑状态列表
 */
export const MILESTONE_STATUSES = ['pending', 'in_progress', 'completed', 'delayed', 'cancelled'];
/**
 * 里程碑状态显示名称
 */
export const MILESTONE_STATUS_NAMES = {
    pending: '待开始',
    in_progress: '进行中',
    completed: '已完成',
    delayed: '已延期',
    cancelled: '已取消',
};
/**
 * WBS 任务类型列表
 */
export const WBS_TASK_TYPES = ['milestone', 'phase', 'task', 'deliverable'];
/**
 * WBS 任务类型显示名称
 */
export const WBS_TASK_TYPE_NAMES = {
    milestone: '里程碑',
    phase: '阶段',
    task: '任务',
    deliverable: '交付物',
};
/**
 * 成员状态列表
 */
export const MEMBER_STATUSES = ['active', 'inactive'];
/**
 * 成员状态显示名称
 */
export const MEMBER_STATUS_NAMES = {
    active: '活跃',
    inactive: '非活跃',
};
/**
 * 操作类型列表
 */
export const OPERATION_TYPES = ['create', 'update', 'delete'];
/**
 * 操作状态列表
 */
export const OPERATION_STATUSES = ['pending', 'sent', 'acknowledged', 'conflict', 'failed'];
/**
 * 审批状态列表
 */
export const APPROVAL_STATUSES = ['pending', 'approved', 'rejected'];
/**
 * 审批状态显示名称
 */
export const APPROVAL_STATUS_NAMES = {
    pending: '待审批',
    approved: '已批准',
    rejected: '已拒绝',
};
/**
 * 依赖关系类型列表
 */
export const DEPENDENCY_TYPES = ['finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish'];
/**
 * 依赖关系类型显示名称
 */
export const DEPENDENCY_TYPE_NAMES = {
    finish_to_start: '完成-开始',
    start_to_start: '开始-开始',
    finish_to_finish: '完成-完成',
    start_to_finish: '开始-完成',
};
/**
 * 任务分配状态列表
 */
export const TASK_ASSIGNMENT_STATUSES = ['active', 'cancelled', 'completed'];
/**
 * 会话状态列表
 */
export const SESSION_STATUSES = ['active', 'terminated'];
/**
 * 数据访问范围列表
 */
export const DATA_ACCESS_SCOPES = ['personal', 'department', 'all'];
/**
 * 权限级别列表
 */
export const PERMISSION_LEVELS = ['none', 'read', 'write', 'full'];
/**
 * 权限级别显示名称
 */
export const PERMISSION_LEVEL_NAMES = {
    none: '无权限',
    read: '只读',
    write: '读写',
    full: '完全控制',
};
/**
 * 组织节点类型列表
 */
export const ORG_NODE_TYPES = ['department', 'tech_group', 'member'];
/**
 * 组织节点类型显示名称
 */
export const ORG_NODE_TYPE_NAMES = {
    department: '部门',
    tech_group: '技术组',
    member: '成员',
};
//# sourceMappingURL=enums.js.map