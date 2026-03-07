/**
 * 类型守卫工具函数
 *
 * 提供运行时类型检查和类型断言工具
 */

import type { EntityId } from '../../shared/types/index.js';
import type { Project, Member, WbsTask } from '../types/index.js';

/**
 * 实体类型映射
 */
export interface EntityTypeMap {
  project: Project;
  projects: Project;
  member: Member;
  members: Member;
  wbsTask: WbsTask;
  wbsTasks: WbsTask;
  task: WbsTask;
  tasks: WbsTask;
}

/**
 * 实体类型键
 */
export type EntityTypeKey = keyof EntityTypeMap;

/**
 * 检查是否为有效的 EntityId
 */
export function isEntityId(value: unknown): value is EntityId {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

/**
 * 检查是否为有效的实体类型
 */
export function isEntityTypeKey(value: string): value is EntityTypeKey {
  return ['project', 'projects', 'member', 'members', 'wbsTask', 'wbsTasks', 'task', 'tasks'].includes(value);
}

/**
 * 检查是否为有效的日期字符串 (YYYY-MM-DD)
 */
export function isDateString(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/**
 * 检查是否为有效的时间戳字符串 (ISO 8601)
 */
export function isTimestampString(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }
  const date = new Date(value);
  return !isNaN(date.getTime());
}

/**
 * 检查是否为有效的数组
 */
export function isArray<T>(value: unknown, guard?: (item: unknown) => item is T): value is T[] {
  if (!Array.isArray(value)) {
    return false;
  }
  if (guard) {
    return value.every(guard);
  }
  return true;
}

/**
 * 检查是否为有效的对象（非 null，非数组）
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * 检查是否为有效的字符串
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * 检查是否为有效的数字
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * 检查是否为有效的正整数
 */
export function isPositiveInteger(value: unknown): value is number {
  return isNumber(value) && Number.isInteger(value) && value > 0;
}

/**
 * 检查是否为 0-100 之间的数字（用于进度百分比）
 */
export function isPercentage(value: unknown): value is number {
  return isNumber(value) && value >= 0 && value <= 100;
}

/**
 * 检查是否为有效的枚举值
 */
export function isEnumValue<T extends string>(value: unknown, enumValues: readonly T[]): value is T {
  return typeof value === 'string' && enumValues.includes(value as T);
}

/**
 * 类型断言：断言值不为 null/undefined
 */
export function assertNonNull<T>(value: T | null | undefined, message?: string): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message || `Expected non-null value, got ${value}`);
  }
}

/**
 * 类型断言：断言值为指定类型
 */
export function assertType<T>(
  value: unknown,
  guard: (value: unknown) => value is T,
  message?: string
): asserts value is T {
  if (!guard(value)) {
    throw new Error(message || `Type assertion failed`);
  }
}

/**
 * 安全的类型转换
 */
export function safeCast<T>(
  value: unknown,
  guard: (value: unknown) => value is T,
  defaultValue?: T
): T | undefined {
  if (guard(value)) {
    return value;
  }
  return defaultValue;
}

/**
 * 批量类型检查
 */
export function validateObject<T extends Record<string, unknown>>(
  value: unknown,
  schema: Record<keyof T, (val: unknown) => boolean>
): value is T {
  if (!isObject(value)) {
    return false;
  }

  for (const [key, validator] of Object.entries(schema)) {
    if (!validator(value[key])) {
      return false;
    }
  }

  return true;
}

/**
 * 创建项目对象验证器
 */
export function createProjectValidator() {
  return {
    id: (val: unknown) => val === null || val === undefined || isEntityId(val),
    code: isNonEmptyString,
    name: isNonEmptyString,
    description: (val: unknown) => val === null || val === undefined || typeof val === 'string',
    status: (val: unknown) => isEnumValue(val, ['planning', 'in_progress', 'completed', 'delayed', 'archived'] as const),
    projectType: (val: unknown) => isEnumValue(val, ['product_development', 'functional_management'] as const),
    progress: (val: unknown) => isNumber(val) && val >= 0 && val <= 100,
    plannedStartDate: (val: unknown) => val === null || val === undefined || isDateString(val),
    plannedEndDate: (val: unknown) => val === null || val === undefined || isDateString(val),
  } as const;
}

/**
 * 创建成员对象验证器
 */
export function createMemberValidator() {
  return {
    id: (val: unknown) => val === null || val === undefined || isEntityId(val),
    name: isNonEmptyString,
    employeeId: (val: unknown) => val === null || val === undefined || typeof val === 'string',
    department: (val: unknown) => val === null || val === undefined || typeof val === 'string',
    position: (val: unknown) => val === null || val === undefined || typeof val === 'string',
    status: (val: unknown) => isEnumValue(val, ['active', 'inactive'] as const),
  } as const;
}

/**
 * 创建 WBS 任务对象验证器
 */
export function createWbsTaskValidator() {
  return {
    id: (val: unknown) => val === null || val === undefined || isEntityId(val),
    projectId: isEntityId,
    taskCode: isNonEmptyString,
    taskName: isNonEmptyString,
    description: (val: unknown) => val === null || val === undefined || typeof val === 'string',
    status: (val: unknown) => isEnumValue(val, ['pending', 'in_progress', 'completed', 'delayed', 'cancelled'] as const),
    priority: (val: unknown) => isNumber(val) && val >= 1 && val <= 5,
    progress: isPercentage,
    plannedStartDate: (val: unknown) => val === null || val === undefined || isDateString(val),
    plannedEndDate: (val: unknown) => val === null || val === undefined || isDateString(val),
  } as const;
}

/**
 * 深度合并对象
 */
export function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key of Object.keys(source) as Array<keyof T>) {
    const sourceValue = source[key];
    const targetValue = result[key];

    if (isObject(sourceValue) && isObject(targetValue)) {
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>
      ) as T[keyof T];
    } else {
      result[key] = sourceValue as T[keyof T];
    }
  }

  return result;
}

/**
 * 深度克隆对象
 */
export function deepClone<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(item => deepClone(item)) as T;
  }

  const cloned = {} as T;
  for (const key of Object.keys(value) as Array<keyof T>) {
    cloned[key] = deepClone(value[key]);
  }

  return cloned;
}
