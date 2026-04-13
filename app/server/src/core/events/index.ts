/**
 * 事件总线 - 模块间通信
 * 用于任务模块和工作流模块之间的解耦通信
 */

import { EventEmitter } from 'events';

// ========== 事件类型定义 ==========

export enum TaskEventType {
  /** 计划变更请求（工程师修改计划需要审批） */
  PLAN_CHANGE_REQUESTED = 'plan_change_requested',
  /** 计划变更审批通过 */
  PLAN_CHANGE_APPROVED = 'plan_change_approved',
  /** 任务更新（触发级联更新） */
  TASK_UPDATED = 'task_updated',
}

// ========== 事件载荷类型 ==========

export interface TaskPlanChangeRequestedEvent {
  /** 任务ID */
  taskId: string;
  /** 操作用户ID */
  userId: number;
  /** 变更字段列表 */
  changes: Array<{ field: string; oldValue: unknown; newValue: unknown }>;
  /** 变更原因 */
  reason: string;
}

export interface TaskPlanChangeApprovedEvent {
  /** 审批记录ID */
  planChangeId: string;
  /** 任务ID */
  taskId: string;
  /** 审批人ID */
  approverId: number;
  /** 批准的变更 */
  changes: Array<{ field: string; value: unknown }>;
  /** 变更是否已应用（避免重复处理） */
  alreadyApplied?: boolean;
}

export interface TaskUpdatedEvent {
  /** 任务ID */
  taskId: string;
  /** 变更内容 */
  changes: Record<string, unknown>;
  /** 是否触发级联更新 */
  cascadeUpdate?: boolean;
  /** 级联深度（防止无限递归） */
  cascadeDepth?: number;
}

// ========== 事件总线 ==========

/**
 * 任务事件总线
 * 用于任务模块与工作流模块之间的松耦合通信
 */
export const taskEvents = new EventEmitter();

// 设置最大监听器数量，避免内存泄漏警告
taskEvents.setMaxListeners(20);

// ========== 事件发布辅助函数 ==========

/**
 * 发布计划变更请求事件
 */
export function emitPlanChangeRequested(event: TaskPlanChangeRequestedEvent): void {
  taskEvents.emit(TaskEventType.PLAN_CHANGE_REQUESTED, event);
}

/**
 * 发布计划变更审批通过事件
 */
export function emitPlanChangeApproved(event: TaskPlanChangeApprovedEvent): void {
  taskEvents.emit(TaskEventType.PLAN_CHANGE_APPROVED, event);
}

/**
 * 发布任务更新事件
 */
export function emitTaskUpdated(event: TaskUpdatedEvent): void {
  taskEvents.emit(TaskEventType.TASK_UPDATED, event);
}
