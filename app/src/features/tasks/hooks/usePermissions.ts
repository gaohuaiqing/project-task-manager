/**
 * 任务权限 Hook
 * 提供字段级和按钮级的权限控制
 *
 * 权限规则：
 * 1. 工程师只能创建子任务（在已分配给自己的任务下）
 * 2. 工程师编辑计划字段需要审批
 * 3. 工程师不能编辑负责人字段（属于 TASK_ASSIGN 权限）
 * 4. 工程师不能删除任务
 * 5. 实际开始/实际结束属于非计划字段，工程师可直接填写
 */

import { useMemo } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { WBSTask } from '../types';

// 计划字段（工程师编辑需要审批）
// 注意：使用 camelCase 与前端表单字段名保持一致
const PLAN_FIELDS = [
  'startDate',
  'endDate',
  'duration',
  'predecessorId',
  'lagDays',
] as const;

// 非计划字段（工程师可直接编辑）
// 注意：使用 camelCase 与前端表单字段名保持一致
const NON_PLAN_FIELDS = [
  'description',
  'priority',
  'warningDays',
  'actualStartDate',
  'actualEndDate',
  'fullTimeRatio',
  'redmineLink',
] as const;

// 负责人字段属于 TASK_ASSIGN 权限，工程师不可编辑
const ASSIGN_FIELDS = ['assigneeId'] as const;

type PlanField = typeof PLAN_FIELDS[number];
type NonPlanField = typeof NON_PLAN_FIELDS[number];
type AssignField = typeof ASSIGN_FIELDS[number];

export interface TaskPermissions {
  // 基础操作权限
  canCreate: boolean;          // 是否可以创建任务
  canCreateSubtask: boolean;   // 是否可以创建子任务
  canEdit: boolean;            // 是否可以编辑任务
  canDelete: boolean;          // 是否可以删除任务
  canAssign: boolean;          // 是否可以分配任务（修改负责人）

  // 字段级权限
  canEditPlanFields: boolean;  // 是否可以直接编辑计划字段（无需审批）
  canEditNonPlanFields: boolean; // 是否可以编辑非计划字段
  canEditAssignee: boolean;    // 是否可以编辑负责人

  // 审批相关
  needsApprovalForPlanChanges: boolean; // 编辑计划字段是否需要审批

  // 字段分类
  planFields: readonly PlanField[];
  nonPlanFields: readonly NonPlanField[];
  assignFields: readonly AssignField[];

  // 工具方法
  isPlanField: (field: string) => boolean;
  isNonPlanField: (field: string) => boolean;
  isAssignField: (field: string) => boolean;
  canEditField: (field: string) => boolean;
  needsApprovalForField: (field: string) => boolean;
}

/**
 * 任务权限 Hook
 * @param task 可选的任务对象，用于检查任务级别的权限
 * @param parentTask 可选的父任务对象，用于检查子任务创建权限
 */
/**
 * 计算任务权限（纯函数版本，可在循环中调用）
 * @param user 当前用户
 * @param task 可选的任务对象
 * @param parentTask 可选的父任务对象
 */
export function computeTaskPermissions(
  user: { id: number; role: string } | null,
  task?: WBSTask,
  parentTask?: WBSTask
): TaskPermissions {
  if (!user) {
    return createEmptyPermissions();
  }

  const isAdmin = user.role === 'admin';
  const isTechManager = user.role === 'tech_manager';
  const isDeptManager = user.role === 'dept_manager';
  const isEngineer = user.role === 'engineer';
  const isManager = isAdmin || isTechManager || isDeptManager;

  // ========== 基础操作权限 ==========

  const canCreate = isManager;
  const canCreateSubtask = isManager || (isEngineer && parentTask?.assignee_id === user.id);
  const canEdit = isManager || (isEngineer && task?.assignee_id === user.id);
  const canDelete = isManager;
  const canAssign = isManager;

  // ========== 字段级权限 ==========

  const canEditPlanFields = isManager;
  const canEditNonPlanFields = canEdit;
  const canEditAssignee = canAssign;

  // ========== 审批相关 ==========

  const needsApprovalForPlanChanges = isEngineer;

  // ========== 工具方法 ==========

  const isPlanField = (field: string): boolean => {
    return PLAN_FIELDS.includes(field as PlanField);
  };

  const isNonPlanField = (field: string): boolean => {
    return NON_PLAN_FIELDS.includes(field as NonPlanField);
  };

  const isAssignField = (field: string): boolean => {
    return ASSIGN_FIELDS.includes(field as AssignField);
  };

  const canEditField = (field: string): boolean => {
    if (isAssignField(field)) return canEditAssignee;
    if (isPlanField(field)) return canEditPlanFields;
    if (isNonPlanField(field)) return canEditNonPlanFields;
    return false;
  };

  const needsApprovalForField = (field: string): boolean => {
    if (!needsApprovalForPlanChanges) return false;
    return isPlanField(field);
  };

  return {
    canCreate,
    canCreateSubtask,
    canEdit,
    canDelete,
    canAssign,
    canEditPlanFields,
    canEditNonPlanFields,
    canEditAssignee,
    needsApprovalForPlanChanges,
    planFields: PLAN_FIELDS,
    nonPlanFields: NON_PLAN_FIELDS,
    assignFields: ASSIGN_FIELDS,
    isPlanField,
    isNonPlanField,
    isAssignField,
    canEditField,
    needsApprovalForField,
  };
}

export function useTaskPermissions(task?: WBSTask, parentTask?: WBSTask): TaskPermissions {
  const { user } = useAuth();

  return useMemo(() => {
    return computeTaskPermissions(user, task, parentTask);
  }, [user, task, parentTask]);
}

/**
 * 创建空权限对象（未登录状态）
 */
function createEmptyPermissions(): TaskPermissions {
  return {
    canCreate: false,
    canCreateSubtask: false,
    canEdit: false,
    canDelete: false,
    canAssign: false,
    canEditPlanFields: false,
    canEditNonPlanFields: false,
    canEditAssignee: false,
    needsApprovalForPlanChanges: false,
    planFields: PLAN_FIELDS,
    nonPlanFields: NON_PLAN_FIELDS,
    assignFields: ASSIGN_FIELDS,
    isPlanField: () => false,
    isNonPlanField: () => false,
    isAssignField: () => false,
    canEditField: () => false,
    needsApprovalForField: () => false,
  };
}

export default useTaskPermissions;

// 导出常量供其他模块使用
export { PLAN_FIELDS, NON_PLAN_FIELDS, ASSIGN_FIELDS };
