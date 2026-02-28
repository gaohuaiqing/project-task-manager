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
  /** 用户ID（优化版本新增） */
  userId?: number;
  /** 用户角色（优化版本新增） */
  role?: string;
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  techGroupId?: string;
}

export type UserRole = 'admin' | 'dept_manager' | 'tech_manager' | 'engineer';

export interface ClientMessage {
  type: 'auth' | 'data_update' | 'global_data_update' | 'data_operation' | 'heartbeat' | 'request_sync' | 'task_assign' | 'fetch_changes' | 'wbs_move_node';
  data: any;
}

export interface ServerMessage {
  type: 'auth_success' | 'data_sync' | 'data_update_ack' | 'global_data_updated' | 'sync_response' | 'session_terminated' | 'heartbeat_ack' | 'ping' | 'error' | 'data_conflict' | 'data_operation_response' | 'wbs_node_changed';
  data: any;
}

/**
 * 数据操作请求
 */
export interface DataOperationRequest {
  operationId: string;
  operationType: 'create' | 'update' | 'delete';
  dataType: string;
  dataId: string;
  data: any;
  expectedVersion?: number;
}

/**
 * 数据操作响应
 */
export interface DataOperationResponse {
  operationId: string;
  success: boolean;
  data?: any;
  conflict?: boolean;
  version?: number;
  message?: string;
}

export interface SyncData {
  dataType: string;
  data: any;
  timestamp: number;
  sourceSessionId?: string;
}

export interface SessionTerminatedData {
  message: string;
  reason: 'new_login' | 'timeout' | 'ip_changed' | 'user_logout';
}

export interface DataUpdateMessage {
  dataType: 'projects' | 'tasks' | 'wbsTasks' | 'members' | 'notifications' | 'tech_groups' | 'settings';
  data: any;
}

export interface AuthMessage {
  sessionId: string;
  username: string;
}

export interface HeartbeatMessage {
  timestamp: number;
}
