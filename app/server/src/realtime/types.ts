/**
 * 实时同步服务类型定义
 */

/**
 * 消息类型枚举
 */
export enum MessageType {
  // 数据变更
  DATA_CHANGE = 'data_change',
  PROJECT_CHANGE = 'project_change',
  MEMBER_CHANGE = 'member_change',
  TASK_CHANGE = 'task_change',

  // 会话相关
  SESSION_TERMINATED = 'session_terminated',
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',

  // 系统通知
  SYSTEM_NOTIFICATION = 'system_notification',
  BROADCAST = 'broadcast',

  // 连接相关
  PING = 'ping',
  PONG = 'pong',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected'
}

/**
 * 数据变更类型
 */
export enum DataChangeType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete'
}

/**
 * WebSocket消息接口
 */
export interface WebSocketMessage {
  type: MessageType;
  payload: any;
  timestamp: number;
  fromUserId?: number;
  fromUsername?: string;
}

/**
 * 数据变更消息载荷
 */
export interface DataChangePayload {
  entityType: 'project' | 'member' | 'task' | 'user';
  entityId: number;
  changeType: DataChangeType;
  data?: any;
  version?: number;
}

/**
 * WebSocket客户端接口
 */
export interface WebSocketClient {
  id: string;
  ws: any;
  userId?: number;
  username?: string;
  sessionId?: string;
  connectedAt: number;
  lastPing: number;
  subscriptions: Set<string>;
}

/**
 * 消息频道配置
 */
export const CHANNELS = {
  PROJECTS: 'data:projects',
  MEMBERS: 'data:members',
  TASKS: 'data:tasks',
  USERS: 'data:users',
  SESSIONS: 'auth:sessions',
  NOTIFICATIONS: 'system:notifications',
  ALL: 'data:*',
  BROADCAST: 'system:broadcast'
} as const;

/**
 * 订阅配置
 */
export interface SubscriptionConfig {
  channels: string[];
  filter?: (message: WebSocketMessage) => boolean;
  onMessage?: (message: WebSocketMessage) => void | Promise<void>;
}

/**
 * 广播选项
 */
export interface BroadcastOptions {
  excludeSelf?: boolean;
  channels?: string[];
  filter?: (client: WebSocketClient) => boolean;
}

/**
 * Redis Pub/Sub 消息格式
 */
export interface RedisPubMessage {
  type: MessageType;
  payload: any;
  timestamp: number;
  fromUserId?: number;
  fromUsername?: string;
  sourceNodeId?: string; // 发送消息的服务器节点ID
}

/**
 * 消息统计
 */
export interface MessageStats {
  messagesReceived: number;
  messagesSent: number;
  broadcastsSent: number;
  errors: number;
  connectedClients: number;
}
