// app/server/src/modules/collab/types.ts

// ============ 版本历史相关 ============

export interface DataVersion {
  id: string;
  table_name: string;
  record_id: string;
  version: number;
  data: string; // JSON string
  changed_by: number;
  created_at: Date;
  // 关联信息
  changer_name?: string;
}

// ============ 在线状态相关 ============

export type OnlineStatus = 'online' | 'away' | 'offline';

export interface OnlineUser {
  user_id: number;
  status: OnlineStatus;
  last_activity: Date;
  // 关联信息
  real_name?: string;
  username?: string;
}

// ============ WebSocket消息相关 ============

export type MessageType = 'data_update' | 'notification' | 'user_status' | 'ping' | 'pong';

export interface WebSocketMessage {
  type: MessageType;
  payload: unknown;
  timestamp: Date;
  node_id?: string;
}

export interface DataUpdatePayload {
  table_name: string;
  operation: 'create' | 'update' | 'delete';
  record_id: string;
  data?: unknown;
}

// ============ 附件相关 ============

export interface Attachment {
  id: string;
  task_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string | null;
  uploaded_by: number;
  created_at: Date;
  // 关联信息
  uploader_name?: string;
}

export interface UploadAttachmentRequest {
  task_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type?: string;
}

// ============ 批量操作相关 ============

export interface BatchQueryRequest {
  projects?: string[];
  members?: number[];
  tasks?: string[];
}

export interface BatchQueryResponse {
  projects?: unknown[];
  members?: unknown[];
  tasks?: unknown[];
}

// ============ 缓存状态相关 ============

export interface CacheStatus {
  type: 'redis' | 'memory';
  connected: boolean;
  keys: number;
  memory_usage?: string;
}
