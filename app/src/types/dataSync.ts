/**
 * 数据同步相关类型统一导出
 */

// 操作队列相关类型
export * from './operation';

// 数据指纹相关类型
export * from './dataFingerprint';

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
 * 数据变更记录
 */
export interface ChangeRecord {
  /** 键名 */
  key: string;
  /** 操作类型 */
  operation: 'create' | 'update' | 'delete';
  /** 数据 */
  data: any;
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
 * WebSocket 消息基础接口
 */
export interface WebSocketMessage<T = any> {
  type: WebSocketMessageType;
  data: T;
  timestamp?: number;
}

/**
 * 数据操作请求消息
 */
export interface DataOperationRequestMessage extends WebSocketMessage {
  type: 'data_operation';
  data: {
    operationId: string;
    operationType: 'create' | 'update' | 'delete';
    dataType: string;
    dataId: string;
    data: any;
    expectedVersion?: number;
  };
}

/**
 * 数据操作响应消息
 */
export interface DataOperationResponseMessage extends WebSocketMessage {
  type: 'data_operation_response';
  data: {
    operationId: string;
    success: boolean;
    data?: any;
    conflict?: boolean;
    version?: number;
    message?: string;
  };
}
