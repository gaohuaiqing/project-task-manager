/**
 * 操作队列相关类型定义（改进版 - 类型安全）
 */

import type { Project, Member, WbsTask } from './index.js';

/**
 * 操作类型
 */
export type OperationType = 'create' | 'update' | 'delete';

/**
 * 操作状态
 */
export type OperationStatus = 'pending' | 'sent' | 'acknowledged' | 'conflict' | 'failed';

/**
 * 数据类型映射
 * 定义每个数据类型对应的实体类型
 */
export interface DataTypeMap {
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
 * 数据类型键
 */
export type DataTypeKey = keyof DataTypeMap;

/**
 * 操作队列中的操作项（泛型版本）
 */
export interface Operation<T = unknown, K extends DataTypeKey = DataTypeKey> {
  /** 唯一标识符 */
  id: string;
  /** 操作类型 */
  type: OperationType;
  /** 数据类型（如：projects, members, wbsTasks） */
  dataType: K;
  /** 数据ID */
  dataId: string;
  /** 操作数据 */
  data: T;
  /** 期望版本号（用于乐观锁） */
  expectedVersion?: number;
  /** 时间戳 */
  timestamp: number;
  /** 操作状态 */
  status: OperationStatus;
  /** 重试次数 */
  retryCount: number;
}

/**
 * 类型安全的操作项
 * 使用 DataTypeMap 自动推断数据类型
 */
export type TypedOperation<K extends DataTypeKey> = Operation<DataTypeMap[K], K>;

/**
 * 操作请求（不含自动生成的字段）
 */
export type OperationRequest<T = unknown> = Omit<Operation<T>, 'id' | 'timestamp' | 'status' | 'retryCount'>;

/**
 * 操作结果（泛型版本）
 */
export interface OperationResult<T = unknown> {
  /** 是否成功 */
  success: boolean;
  /** 返回的数据 */
  data?: T;
  /** 是否冲突 */
  conflict?: boolean;
  /** 新版本号 */
  version?: number;
  /** 消息 */
  message?: string;
}

/**
 * 类型安全的操作结果
 */
export type TypedOperationResult<K extends DataTypeKey> = OperationResult<DataTypeMap[K]>;

/**
 * 操作队列统计信息
 */
export interface OperationQueueStats {
  /** 总操作数 */
  total: number;
  /** 待发送操作数 */
  pending: number;
  /** 已发送操作数 */
  sent: number;
  /** 已确认操作数 */
  acknowledged: number;
  /** 冲突操作数 */
  conflict: number;
  /** 失败操作数 */
  failed: number;
}

/**
 * 操作队列配置
 */
export interface OperationQueueConfig {
  /** 最大队列大小（防止内存泄漏） */
  maxQueueSize: number;
  /** 最大重试次数 */
  maxRetryCount: number;
  /** 重试延迟（毫秒） */
  retryDelay: number;
  /** 已确认操作删除延迟（毫秒） */
  acknowledgedDeleteDelay: number;
}

/**
 * 默认操作队列配置
 */
export const DEFAULT_OPERATION_QUEUE_CONFIG: OperationQueueConfig = {
  maxQueueSize: 1000,        // 最大1000个操作，防止内存溢出
  maxRetryCount: 3,
  retryDelay: 5000,
  acknowledgedDeleteDelay: 60000
} as const;

/**
 * 类型守卫：检查是否为有效的数据类型
 */
export function isValidDataType(value: string): value is DataTypeKey {
  return ['project', 'projects', 'member', 'members', 'wbsTask', 'wbsTasks', 'task', 'tasks'].includes(value);
}

/**
 * 类型守卫：检查是否为有效的操作类型
 */
export function isValidOperationType(value: string): value is OperationType {
  return ['create', 'update', 'delete'].includes(value);
}

/**
 * 类型守卫：检查是否为有效的操作状态
 */
export function isValidOperationStatus(value: string): value is OperationStatus {
  return ['pending', 'sent', 'acknowledged', 'conflict', 'failed'].includes(value);
}

/**
 * 创建类型安全的操作
 */
export function createTypedOperation<K extends DataTypeKey>(
  type: OperationType,
  dataType: K,
  dataId: string,
  data: DataTypeMap[K],
  expectedVersion?: number
): TypedOperation<K> {
  return {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    dataType,
    dataId,
    data,
    expectedVersion,
    timestamp: Date.now(),
    status: 'pending',
    retryCount: 0,
  } as TypedOperation<K>;
}

/**
 * 断言守卫：检查操作数据类型
 */
export function assertOperationData<K extends DataTypeKey>(
  operation: Operation,
  dataType: K
): asserts operation is TypedOperation<K> {
  if (operation.dataType !== dataType) {
    throw new Error(`Expected data type "${dataType}", got "${operation.dataType}"`);
  }
}

/**
 * 运行时类型验证：验证操作结构
 */
export function isValidOperation(value: unknown): value is Operation {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const op = value as Record<string, unknown>;

  return (
    typeof op.id === 'string' &&
    isValidOperationType(op.type) &&
    typeof op.dataType === 'string' &&
    typeof op.dataId === 'string' &&
    typeof op.timestamp === 'number' &&
    isValidOperationStatus(op.status) &&
    typeof op.retryCount === 'number'
  );
}
