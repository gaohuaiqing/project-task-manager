/**
 * 后端类型定义（改进版 - 与共享类型对齐）
 *
 * 此文件包含后端特有的类型定义
 * 共享类型请使用 @/shared/types
 */

import type {
  EntityId,
  UserRole,
  WebSocketMessage,
  WebSocketMessageType,
} from '../../../shared/types/index.js';

/**
 * 会话信息
 */
export interface Session {
  sessionId: string;
  username: string;
  ip: string;
  deviceId?: string;
  createdAt: number;
  lastAccessed: number;
  expiresAt: number;
  status: 'active' | 'terminated';
  terminationReason?: string;
  terminationTimestamp?: number;
  sourceDeviceInfo?: string;
  /** 用户ID */
  userId: EntityId;
  /** 用户角色 */
  role: UserRole;
}

/**
 * 用户信息（与共享类型对齐）
 */
export interface User {
  id: EntityId;  // 修改为 number 类型
  username: string;
  name: string;
  role: UserRole;
  techGroupId?: EntityId | null;  // 修改为 EntityId
}

/**
 * 客户端消息（类型安全版本）
 */
export interface ClientMessage<T = unknown> {
  type: ClientMessageType;
  data: T;
}

/**
 * 客户端消息类型
 */
export type ClientMessageType =
  | 'auth'
  | 'data_update'
  | 'global_data_update'
  | 'data_operation'
  | 'heartbeat'
  | 'request_sync'
  | 'task_assign'
  | 'fetch_changes'
  | 'wbs_move_node';

/**
 * 服务器消息（类型安全版本）
 */
export interface ServerMessage<T = unknown> {
  type: ServerMessageType;
  data: T;
}

/**
 * 服务器消息类型
 */
export type ServerMessageType =
  | 'auth_success'
  | 'data_update_ack'
  | 'global_data_updated'
  | 'sync_response'
  | 'session_terminated'
  | 'heartbeat_ack'
  | 'ping'
  | 'error'
  | 'data_conflict'
  | 'data_operation_response'
  | 'wbs_node_changed';

/**
 * 数据操作请求（泛型版本）
 */
export interface DataOperationRequest<T = unknown> {
  operationId: string;
  operationType: 'create' | 'update' | 'delete';
  dataType: string;
  dataId: string;
  data: T;
  expectedVersion?: number;
}

/**
 * 数据操作响应（泛型版本）
 */
export interface DataOperationResponse<T = unknown> {
  operationId: string;
  success: boolean;
  data?: T;
  conflict?: boolean;
  version?: number;
  message?: string;
}

/**
 * 同步数据（泛型版本）
 */
export interface SyncData<T = unknown> {
  dataType: string;
  data: T;
  timestamp: number;
  sourceSessionId?: string;
}

/**
 * 会话终止数据
 */
export interface SessionTerminatedData {
  message: string;
  reason: 'new_login' | 'timeout' | 'ip_changed' | 'user_logout';
}

/**
 * 数据更新消息（泛型版本）
 */
export interface DataUpdateMessage<T = unknown> {
  dataType: 'projects' | 'tasks' | 'wbsTasks' | 'members' | 'notifications' | 'tech_groups' | 'settings';
  data: T;
}

/**
 * 认证消息
 */
export interface AuthMessage {
  sessionId: string;
  username: string;
  userId: EntityId;
  role: UserRole;
}

/**
 * 心跳消息
 */
export interface HeartbeatMessage {
  timestamp: number;
}

/**
 * 错误消息
 */
export interface ErrorMessage {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * 类型守卫：检查是否为有效的客户端消息
 */
export function isValidClientMessage(value: unknown): value is ClientMessage {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const message = value as Record<string, unknown>;

  const validTypes: ClientMessageType[] = [
    'auth',
    'data_update',
    'global_data_update',
    'data_operation',
    'heartbeat',
    'request_sync',
    'task_assign',
    'fetch_changes',
    'wbs_move_node',
  ];

  return (
    validTypes.includes(message.type as ClientMessageType) &&
    'data' in message
  );
}

/**
 * 类型守卫：检查是否为有效的服务器消息
 */
export function isValidServerMessage(value: unknown): value is ServerMessage {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const message = value as Record<string, unknown>;

  const validTypes: ServerMessageType[] = [
    'auth_success',
    'data_update_ack',
    'global_data_updated',
    'sync_response',
    'session_terminated',
    'heartbeat_ack',
    'ping',
    'error',
    'data_conflict',
    'data_operation_response',
    'wbs_node_changed',
  ];

  return (
    validTypes.includes(message.type as ServerMessageType) &&
    'data' in message
  );
}

/**
 * 创建客户端消息
 */
export function createClientMessage<T>(
  type: ClientMessageType,
  data: T
): ClientMessage<T> {
  return { type, data };
}

/**
 * 创建服务器消息
 */
export function createServerMessage<T>(
  type: ServerMessageType,
  data: T
): ServerMessage<T> {
  return { type, data };
}

/**
 * 创建数据操作请求
 */
export function createDataOperationRequest<T>(
  operationId: string,
  operationType: 'create' | 'update' | 'delete',
  dataType: string,
  dataId: string,
  data: T,
  expectedVersion?: number
): DataOperationRequest<T> {
  return {
    operationId,
    operationType,
    dataType,
    dataId,
    data,
    expectedVersion,
  };
}

/**
 * 创建数据操作响应
 */
export function createDataOperationResponse<T>(
  operationId: string,
  success: boolean,
  data?: T,
  conflict?: boolean,
  version?: number,
  message?: string
): DataOperationResponse<T> {
  return {
    operationId,
    success,
    data,
    conflict,
    version,
    message,
  };
}
