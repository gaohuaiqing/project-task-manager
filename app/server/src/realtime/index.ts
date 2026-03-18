/**
 * 实时同步服务 - 导出入口
 *
 * 使用示例：
 * ```typescript
 * import { webSocketService, messageBroker, broadcastService } from './realtime/index.js';
 *
 * // 初始化WebSocket服务
 * webSocketService.initialize(httpServer);
 *
 * // 广播数据变更
 * await broadcastService.broadcastProjectChange(projectId, 'update', projectData, userId, username);
 *
 * // 订阅消息
 * await messageBroker.subscribe('data:projects', (message) => {
 *   console.log('收到项目变更消息', message);
 * });
 * ```
 */

// 导出WebSocket服务
export { WebSocketService, webSocketService } from './WebSocketService.js';

// 导出消息代理
export { MessageBroker, messageBroker } from './MessageBroker.js';

// 导出广播服务
export { BroadcastService, broadcastService } from './BroadcastService.js';

// 导出类型定义
export {
  MessageType,
  DataChangeType,
  CHANNELS,
  type WebSocketMessage,
  type WebSocketClient,
  type DataChangePayload,
  type SubscriptionConfig,
  type BroadcastOptions,
  type RedisPubMessage,
  type MessageStats
} from './types.js';

// 默认导出广播服务
export { default } from './BroadcastService.js';
