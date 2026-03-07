/**
 * WBS 任务分解结构类型定义
 */

// 任务状态
export type WbsTaskStatus = 'not_started' | 'in_progress' | 'completed' | 'delayed' | 'cancelled';

// 任务优先级
export type WbsTaskPriority = 'low' | 'medium' | 'high' | 'urgent';

// WBS 任务接口
export interface WbsTask {
  id: string;
  projectId: string;
  memberId: string;
  title: string;
  description: string;
  status: WbsTaskStatus;
  priority: WbsTaskPriority;
  approvalStatus?: 'pending' | 'approved' | 'rejected'; // 审批状态
  
  // 计划时间
  plannedStartDate: string; // YYYY-MM-DD
  plannedEndDate: string;   // YYYY-MM-DD
  plannedDays: number;
  
  // 实际时间
  actualStartDate?: string;
  actualEndDate?: string;
  actualDays?: number;
  fullTimeRatio?: number; // 全职比(%)

  // WBS层级结构
  parentId?: string;        // 父任务ID
  wbsCode: string;          // WBS编码 (如: 1, 1.1, 1.1.2)
  level: number;            // 层级深度 (0开始)
  subtasks: string[];       // 子任务ID列表
  
  // 进度百分比 (0-100)
  progress: number;
  
  // 前置任务
  predecessor?: string;     // 前置任务ID
  leadLag?: number;         // 提前/落后时间（天数）

  // 前置任务列表（支持多路径依赖）
  predecessors?: Array<{
    taskId: string;         // 前置任务ID
    type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish'; // 依赖类型
    lag?: number;           // 延迟天数（负数为提前）
  }>;
  
  // 任务类型
  taskType?: string;        // 任务类型
  
  // 扩展字段
  order: number;            // 同级排序序号
  isExpanded: boolean;      // 是否展开子任务
  isSingleRestDay?: boolean; // 是否按单休日计算工期（每周工作6天），默认false（双休日）
  isEditing?: boolean;      // 是否处于编辑状态
  isOnCriticalPath?: boolean; // 是否在关键路径上
  hasDateConflict?: boolean;  // 是否有日期冲突
  redmineUrl?: string;      // Redmine链接（仅根任务）
  
  // 时间戳
  createdAt: string;
  updatedAt: string;
}

// WBS 任务编辑表单数据
export interface WbsTaskFormData {
  projectId: string;
  memberId: string;
  title: string;
  description: string;
  status: WbsTaskStatus;
  priority: WbsTaskPriority;
  plannedStartDate: string;
  plannedEndDate: string;
  plannedDays: number;
  progress: number;
  predecessor?: string;
  parentId?: string;
  taskType?: string;
}

// 日期冲突信息
export interface DateConflict {
  taskId: string;
  taskTitle: string;
  conflictType: 'overlap' | 'predecessor_mismatch' | 'parent_child_mismatch';
  conflictWith: string;
  message: string;
}

// 关键路径节点
export interface CriticalPathNode {
  taskId: string;
  wbsCode: string;
  title: string;
  earliestStart: string;
  earliestEnd: string;
  latestStart: string;
  latestEnd: string;
  float: number; // 浮动时间
}

// 任务依赖关系
export interface TaskDependency {
  from: string;    // 前置任务ID
  to: string;      // 后续任务ID
  type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';
}

// WBS 树形结构节点
export interface WbsTreeNode extends WbsTask {
  children: WbsTreeNode[];
  depth: number;
}

// 拖拽排序信息
export interface DragSortInfo {
  taskId: string;
  sourceParentId?: string;
  targetParentId?: string;
  sourceIndex: number;
  targetIndex: number;
}

// 任务统计信息
export interface WbsTaskStats {
  total: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  delayed: number;
  totalPlannedDays: number;
  totalActualDays: number;
  overallProgress: number;
}

// 状态配置
export interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}

// 优先级配置
export interface PriorityConfig {
  label: string;
  color: string;
  bgColor: string;
}

// 延期记录
export interface DelayRecord {
  id: string;
  taskId: string;
  delayDate: string;
  originalEndDate: string;
  newEndDate: string;
  delayDays: number;
  reason: string;
  createdAt: string;
}

// 任务进展记录
export interface TaskProgressRecord {
  id: string;
  taskId: string;
  progressDate: string;
  progressPercent: number;
  description: string;
  attachments?: string[];
  reporter: string;
  createdAt: string;
}

// 计划调整记录
export interface PlanAdjustmentRecord {
  id: string;
  taskId: string;
  adjustmentDate: string;
  adjustmentType: 'start_date' | 'end_date' | 'duration' | 'all';
  before: {
    startDate: string;
    endDate: string;
    days: number;
  };
  after: {
    startDate: string;
    endDate: string;
    days: number;
  };
  reason: string;
  createdAt: string;
  // 审批相关字段
  requester?: string; // 申请人
  requesterRole?: string; // 申请人角色
  approvalStatus?: 'pending' | 'approved' | 'rejected'; // 审批状态
  approver?: string; // 审批人
  approvalDate?: string; // 审批时间
  approvalComment?: string; // 审批意见
}

// 任务创建审批记录
export interface TaskApprovalRecord {
  id: string;
  taskId: string;
  taskTitle: string;
  requester: string; // 申请人ID
  requesterName: string; // 申请人姓名
  requesterRole: string; // 申请人角色
  requestDate: string; // 申请日期
  approvalStatus: 'pending' | 'approved' | 'rejected'; // 审批状态
  approver?: string; // 审批人ID（审批后必填）
  approverName?: string; // 审批人姓名（审批后必填）
  approvalDate?: string; // 审批日期（审批后必填）
  approvalComment?: string; // 审批意见（拒绝时必填）
  createdAt: string;
}

// 待审批记录（严格类型）
export interface PendingApprovalRecord {
  id: string;
  taskId: string;
  taskTitle: string;
  requester: string;
  requesterName: string;
  requesterRole: string;
  requestDate: string;
  approvalStatus: 'pending';
  createdAt: string;
}

// 已审批记录（严格类型）
export interface ProcessedApprovalRecord {
  id: string;
  taskId: string;
  taskTitle: string;
  requester: string;
  requesterName: string;
  requesterRole: string;
  requestDate: string;
  approvalStatus: 'approved' | 'rejected';
  approver: string; // 必填
  approverName: string; // 必填
  approvalDate: string; // 必填
  approvalComment?: string;
  createdAt: string;
}

// 强行刷新记录
export interface ForceRefreshRecord {
  id: string;
  taskId: string;
  taskTitle: string;
  operator: string; // 操作人ID
  operatorName: string; // 操作人姓名
  operatorRole: string; // 操作人角色
  operationDate: string;
  changeDescription: string; // 变更说明
  before: {
    startDate: string;
    endDate: string;
    days: number;
    progress: number;
  };
  after: {
    startDate: string;
    endDate: string;
    days: number;
    progress: number;
  };
  createdAt: string;
}
