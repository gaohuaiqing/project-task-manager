/**
 * 测试任务数据
 */

import type { TaskData } from '../types/test-types';

/**
 * 生成随机任务数据
 */
export function generateTaskData(overrides?: Partial<TaskData>): TaskData {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);

  return {
    description: `E2E测试任务_${random}`,
    priority: 'medium',
    status: 'not_started',
    approvalStatus: 'approved',
    ...overrides
  };
}

/**
 * 基础任务模板
 */
export const BASIC_TASK_TEMPLATE: TaskData = {
  description: '基础测试任务',
  priority: 'medium',
  status: 'not_started'
};

/**
 * 高优先级任务模板
 */
export const HIGH_PRIORITY_TASK_TEMPLATE: TaskData = {
  description: '高优先级紧急任务',
  priority: 'high',
  status: 'not_started'
};

/**
 * 需要审批的任务模板（工程师创建）
 */
export const PENDING_APPROVAL_TASK_TEMPLATE: TaskData = {
  description: '待审批的任务',
  priority: 'medium',
  status: 'not_started',
  approvalStatus: 'pending'
};

/**
 * 预定义测试任务集合
 */
export const TEST_TASKS = {
  basic: generateTaskData({
    description: '基础功能测试任务',
    priority: 'medium'
  }),
  highPriority: generateTaskData({
    description: '高优先级任务',
    priority: 'high'
  }),
  lowPriority: generateTaskData({
    description: '低优先级任务',
    priority: 'low'
  }),
  inProgress: generateTaskData({
    description: '进行中的任务',
    status: 'in_progress'
  }),
  completed: generateTaskData({
    description: '已完成的任务',
    status: 'completed'
  }),
  pendingApproval: generateTaskData({
    description: '待审批的任务',
    approvalStatus: 'pending'
  })
};

/**
 * 任务状态枚举
 */
export const TASK_STATUSES = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed'
} as const;

/**
 * 任务优先级枚举
 */
export const TASK_PRIORITIES = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
} as const;

/**
 * 审批状态枚举
 */
export const APPROVAL_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
} as const;
