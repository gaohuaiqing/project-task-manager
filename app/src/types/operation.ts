/**
 * 操作队列相关类型定义
 */

/**
 * 操作类型
 */
export type OperationType = 'create' | 'update' | 'delete';

/**
 * 操作状态
 */
export type OperationStatus = 'pending' | 'sent' | 'acknowledged' | 'conflict' | 'failed';

/**
 * 操作队列中的操作项
 */
export interface Operation {
  /** 唯一标识符 */
  id: string;
  /** 操作类型 */
  type: OperationType;
  /** 数据类型（如：projects, members, wbsTasks） */
  dataType: string;
  /** 数据ID */
  dataId: string;
  /** 操作数据 */
  data: any;
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
 * 操作请求（不含自动生成的字段）
 */
export type OperationRequest = Omit<Operation, 'id' | 'timestamp' | 'status' | 'retryCount'>;

/**
 * 操作结果
 */
export interface OperationResult {
  /** 是否成功 */
  success: boolean;
  /** 返回的数据 */
  data?: any;
  /** 是否冲突 */
  conflict?: boolean;
  /** 新版本号 */
  version?: number;
  /** 消息 */
  message?: string;
}

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
