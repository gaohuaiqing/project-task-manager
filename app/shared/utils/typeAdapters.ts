/**
 * 类型转换适配器
 *
 * 提供前后端类型转换工具，处理类型不一致问题
 */

import type {
  EntityId,
  DbDate,
  DbTimestamp,
} from '../types/index.js';
import type {
  WbsTaskStatus,
  WbsTaskPriority,
  ProjectStatus,
} from '../types/enums.js';

/**
 * 前端 WBS 任务状态到后端的映射
 */
const FRONTEND_WBS_STATUS_TO_BACKEND: Record<string, WbsTaskStatus> = {
  not_started: 'pending',
  pending: 'pending',
  in_progress: 'in_progress',
  completed: 'completed',
  delayed: 'delayed',
  cancelled: 'cancelled',
};

/**
 * 后端 WBS 任务状态到前端的映射
 */
const BACKEND_WBS_STATUS_TO_FRONTEND: Record<WbsTaskStatus, string> = {
  pending: 'not_started',
  in_progress: 'in_progress',
  completed: 'completed',
  delayed: 'delayed',
  cancelled: 'cancelled',
};

/**
 * 前端 WBS 任务优先级到后端的映射
 */
const FRONTEND_WBS_PRIORITY_TO_BACKEND: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
  urgent: 4,
};

/**
 * 后端 WBS 任务优先级到前端的映射
 */
const BACKEND_WBS_PRIORITY_TO_FRONTEND: Record<number, string> = {
  1: 'low',
  2: 'medium',
  3: 'high',
  4: 'urgent',
};

/**
 * 转换前端 WBS 任务状态到后端
 */
export function frontendWbsStatusToBackend(status: string): WbsTaskStatus {
  return FRONTEND_WBS_STATUS_TO_BACKEND[status] || 'pending';
}

/**
 * 转换后端 WBS 任务状态到前端
 */
export function backendWbsStatusToFrontend(status: WbsTaskStatus): string {
  return BACKEND_WBS_STATUS_TO_FRONTEND[status] || 'not_started';
}

/**
 * 批量转换后端 WBS 任务状态到前端
 */
export function backendWbsStatusListToFrontend(statuses: WbsTaskStatus[]): string[] {
  return statuses.map(backendWbsStatusToFrontend);
}

/**
 * 批量转换前端 WBS 任务状态到后端
 */
export function frontendWbsStatusListToBackend(statuses: string[]): WbsTaskStatus[] {
  return statuses.map(frontendWbsStatusToBackend);
}

/**
 * 转换前端 WBS 任务优先级到后端
 */
export function frontendWbsPriorityToBackend(priority: string): number {
  return FRONTEND_WBS_PRIORITY_TO_BACKEND[priority] ?? 2; // 默认为 medium
}

/**
 * 转换后端 WBS 任务优先级到前端
 */
export function backendWbsPriorityToFrontend(priority: number): string {
  return BACKEND_WBS_PRIORITY_TO_FRONTEND[priority] || 'medium';
}

/**
 * ID 类型转换：string | number -> number
 */
export function toEntityId(value: string | number | null | undefined): EntityId | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'number') {
    return Number.isInteger(value) && value > 0 ? value : null;
  }
  const num = Number(value);
  return Number.isInteger(num) && num > 0 ? num : null;
}

/**
 * ID 列表类型转换：(string | number)[] -> number[]
 */
export function toEntityIdList(values: (string | number | null | undefined)[] | null | undefined): EntityId[] {
  if (!values || !Array.isArray(values)) {
    return [];
  }
  const result: EntityId[] = [];
  for (const value of values) {
    const id = toEntityId(value);
    if (id !== null) {
      result.push(id);
    }
  }
  return result;
}

/**
 * 日期字符串转换：确保格式为 YYYY-MM-DD
 */
export function toDbDate(date: string | Date | null | undefined): DbDate | null {
  if (!date) {
    return null;
  }
  if (typeof date === 'string') {
    // 验证格式
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    // 尝试解析
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
    return null;
  }
  // Date 对象
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }
  return null;
}

/**
 * 时间戳转换：确保格式为 ISO 8601
 */
export function toDbTimestamp(timestamp: string | Date | null | undefined): DbTimestamp | null {
  if (!timestamp) {
    return null;
  }
  if (typeof timestamp === 'string') {
    // 验证是否为有效的 ISO 8601 格式
    const parsed = new Date(timestamp);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
    return null;
  }
  // Date 对象
  if (!isNaN(timestamp.getTime())) {
    return timestamp.toISOString();
  }
  return null;
}

/**
 * JSON 字段转换：安全解析 JSON 字符串
 */
export function parseJsonField<T>(value: string | null | undefined): T | null {
  if (!value) {
    return null;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

/**
 * JSON 字段转换：安全序列化对象为 JSON 字符串
 */
export function stringifyJsonField(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

/**
 * 数据库记录到实体转换（通用）
 */
export function dbRecordToEntity<T extends Record<string, unknown>>(
  record: Record<string, unknown>,
  fieldMapping: Record<string, (value: unknown) => unknown> = {}
): T {
  const result: Record<string, unknown> = {};

  for (const [key, rawValue] of Object.entries(record)) {
    // 应用字段转换函数
    const converter = fieldMapping[key];
    const value = converter ? converter(rawValue) : rawValue;
    result[key] = value;
  }

  return result as T;
}

/**
 * 实体到数据库记录转换（通用）
 */
export function entityToDbRecord(
  entity: Record<string, unknown>,
  fieldMapping: Record<string, (value: unknown) => unknown> = {}
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(entity)) {
    // 应用字段转换函数
    const converter = fieldMapping[key];
    const convertedValue = converter ? converter(value) : value;
    result[key] = convertedValue;
  }

  return result;
}

/**
 * WBS 任务字段映射：数据库 -> 前端
 */
export const WBS_TASK_DB_TO_FRONTEND_MAPPING = {
  id: toEntityId,
  projectId: toEntityId,
  parentId: toEntityId,
  assigneeId: toEntityId,
  status: (value: unknown) => backendWbsStatusToFrontend(value as WbsTaskStatus),
  priority: (value: unknown) => backendWbsPriorityToFrontend(value as number),
  plannedStartDate: toDbDate,
  plannedEndDate: toDbDate,
  actualStartDate: toDbDate,
  actualEndDate: toDbDate,
  dependencies: (value: unknown) => parseJsonField(value as string | null),
  tags: (value: unknown) => parseJsonField<string[]>(value as string | null),
  attachments: (value: unknown) => parseJsonField(value as string | null),
  createdAt: toDbTimestamp,
  updatedAt: toDbTimestamp,
} as const;

/**
 * WBS 任务字段映射：前端 -> 数据库
 */
export const WBS_TASK_FRONTEND_TO_DB_MAPPING = {
  status: (value: unknown) => frontendWbsStatusToBackend(value as string),
  priority: (value: unknown) => frontendWbsPriorityToBackend(value as string),
  plannedStartDate: toDbDate,
  plannedEndDate: toDbDate,
  actualStartDate: toDbDate,
  actualEndDate: toDbDate,
  dependencies: stringifyJsonField,
  tags: stringifyJsonField,
  attachments: stringifyJsonField,
} as const;

/**
 * 项目字段映射：数据库 -> 前端
 */
export const PROJECT_DB_TO_FRONTEND_MAPPING = {
  id: toEntityId,
  createdBy: toEntityId,
  plannedStartDate: toDbDate,
  plannedEndDate: toDbDate,
  actualStartDate: toDbDate,
  actualEndDate: toDbDate,
  createdAt: toDbTimestamp,
  updatedAt: toDbTimestamp,
} as const;

/**
 * 成员字段映射：数据库 -> 前端
 */
export const MEMBER_DB_TO_FRONTEND_MAPPING = {
  id: toEntityId,
  userId: toEntityId,
  createdBy: toEntityId,
  skills: (value: unknown) => parseJsonField(value as string | null),
  capabilities: (value: unknown) => parseJsonField(value as string | null),
  createdAt: toDbTimestamp,
  updatedAt: toDbTimestamp,
} as const;

/**
 * 类型守卫：检查是否为有效的实体ID
 */
export function isValidEntityId(value: unknown): value is EntityId {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

/**
 * 类型守卫：检查是否为有效的日期字符串
 */
export function isValidDateString(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/**
 * 类型守卫：检查是否为有效的时间戳字符串
 */
export function isValidTimestampString(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }
  const date = new Date(value);
  return !isNaN(date.getTime());
}
