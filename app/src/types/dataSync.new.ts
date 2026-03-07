/**
 * 数据同步相关类型（改进版 - 类型安全）
 */

// 操作队列相关类型
export * from './operation.new.js';

// 数据指纹相关类型
export * from './dataFingerprint.new.js';

/**
 * 数据同步配置
 */
export interface DataSyncConfig {
  /** 同步间隔（毫秒） */
  syncInterval: number;
  /** 冲突解决策略 */
  conflictResolution: 'lastWriteWins' | 'manual';
  /** 是否启用增量同步 */
  enableIncrementalSync: boolean;
  /** 是否启用只读缓存模式 */
  readOnlyCache: boolean;
}

/**
 * 默认数据同步配置
 */
export const DEFAULT_DATA_SYNC_CONFIG: DataSyncConfig = {
  syncInterval: 5000,
  conflictResolution: 'lastWriteWins',
  enableIncrementalSync: true,
  readOnlyCache: true
} as const;

/**
 * 数据同步状态
 */
export interface DataSyncStatus {
  /** 最后同步时间 */
  lastSync: number;
  /** 待处理变更数 */
  pendingChanges: number;
  /** 设备ID */
  deviceId: string;
  /** 版本号 */
  version: number;
  /** 是否正在同步 */
  isSyncing: boolean;
  /** 同步错误 */
  syncError?: string;
}

/**
 * 数据变更记录（泛型版本）
 */
export interface ChangeRecord<T = unknown> {
  /** 键名 */
  key: string;
  /** 操作类型 */
  operation: 'create' | 'update' | 'delete';
  /** 数据 */
  data: T;
  /** 时间戳 */
  timestamp: number;
  /** 版本号 */
  version: number;
}

/**
 * WebSocket 消息类型
 */
export type WebSocketMessageType =
  | 'auth'
  | 'auth_success'
  | 'data_update'
  | 'data_sync'
  | 'data_operation'
  | 'data_operation_response'
  | 'global_data_update'
  | 'global_data_updated'
  | 'heartbeat'
  | 'heartbeat_ack'
  | 'ping'
  | 'request_sync'
  | 'sync_response'
  | 'session_terminated'
  | 'error'
  | 'data_conflict';

/**
 * WebSocket 消息基础接口（泛型版本）
 */
export interface WebSocketMessage<T = unknown> {
  type: WebSocketMessageType;
  data: T;
  timestamp?: number;
}

/**
 * 类型守卫：检查是否为有效的 WebSocket 消息
 */
export function isValidWebSocketMessage(value: unknown): value is WebSocketMessage {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const message = value as Record<string, unknown>;

  const validTypes: WebSocketMessageType[] = [
    'auth',
    'auth_success',
    'data_update',
    'data_sync',
    'data_operation',
    'data_operation_response',
    'global_data_update',
    'global_data_updated',
    'heartbeat',
    'heartbeat_ack',
    'ping',
    'request_sync',
    'sync_response',
    'session_terminated',
    'error',
    'data_conflict',
  ];

  return (
    validTypes.includes(message.type as WebSocketMessageType) &&
    'data' in message &&
    (message.timestamp === undefined || typeof message.timestamp === 'number')
  );
}

/**
 * 创建 WebSocket 消息
 */
export function createWebSocketMessage<T>(
  type: WebSocketMessageType,
  data: T,
  timestamp?: number
): WebSocketMessage<T> {
  const message: WebSocketMessage<T> = {
    type,
    data,
  };

  if (timestamp !== undefined) {
    message.timestamp = timestamp;
  }

  return message;
}

/**
 * 数据操作请求消息（泛型版本）
 */
export interface DataOperationRequestMessage<T = unknown> extends WebSocketMessage<{
  operationId: string;
  operationType: 'create' | 'update' | 'delete';
  dataType: string;
  dataId: string;
  data: T;
  expectedVersion?: number;
}> {
  type: 'data_operation';
}

/**
 * 数据操作响应消息（泛型版本）
 */
export interface DataOperationResponseMessage<T = unknown> extends WebSocketMessage<{
  operationId: string;
  success: boolean;
  data?: T;
  conflict?: boolean;
  version?: number;
  message?: string;
}> {
  type: 'data_operation_response';
}

/**
 * 类型守卫：检查是否为数据操作请求消息
 */
export function isDataOperationRequestMessage(value: unknown): value is DataOperationRequestMessage {
  if (!isValidWebSocketMessage(value)) {
    return false;
  }

  const message = value as WebSocketMessage;
  return message.type === 'data_operation';
}

/**
 * 类型守卫：检查是否为数据操作响应消息
 */
export function isDataOperationResponseMessage(value: unknown): value is DataOperationResponseMessage {
  if (!isValidWebSocketMessage(value)) {
    return false;
  }

  const message = value as WebSocketMessage;
  return message.type === 'data_operation_response';
}

/**
 * 创建数据操作请求消息
 */
export function createDataOperationRequestMessage<T>(
  operationId: string,
  operationType: 'create' | 'update' | 'delete',
  dataType: string,
  dataId: string,
  data: T,
  expectedVersion?: number
): DataOperationRequestMessage<T> {
  return createWebSocketMessage('data_operation', {
    operationId,
    operationType,
    dataType,
    dataId,
    data,
    expectedVersion,
  }) as DataOperationRequestMessage<T>;
}

/**
 * 创建数据操作响应消息
 */
export function createDataOperationResponseMessage<T>(
  operationId: string,
  success: boolean,
  data?: T,
  conflict?: boolean,
  version?: number,
  message?: string
): DataOperationResponseMessage<T> {
  return createWebSocketMessage('data_operation_response', {
    operationId,
    success,
    data,
    conflict,
    version,
    message,
  }) as DataOperationResponseMessage<T>;
}
