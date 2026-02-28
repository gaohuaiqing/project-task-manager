/**
 * 统一事件服务
 *
 * 设计原则：
 * 1. 以 WebSocket 作为主要实时更新通道
 * 2. CustomEvent 仅用于跨标签页同步（storage 事件）
 * 3. 统一事件类型定义和负载结构
 * 4. 类型安全的事件监听器
 *
 * @module services/EventService
 */

import { wsService } from './WebSocketService';

// ==================== 事件类型定义 ====================

/**
 * 数据变更事件类型
 */
export type DataChangeEventType =
  | 'projects'
  | 'project_members'
  | 'project_milestones'
  | 'wbs_tasks'
  | 'members'
  | 'organization_units'
  | 'permissions'
  | 'system_logs'
  | 'all';

/**
 * 数据变更操作类型
 */
export type DataChangeOperation = 'create' | 'update' | 'delete' | 'batch';

/**
 * 数据变更事件负载
 */
export interface DataChangeEventPayload {
  /** 数据类型 */
  dataType: DataChangeEventType;
  /** 操作类型 */
  operation: DataChangeOperation;
  /** 变更的数据记录 */
  record?: any;
  /** 批量变更时的记录列表 */
  records?: any[];
  /** 项目 ID（用于项目相关事件） */
  projectId?: number;
  /** 版本号（用于冲突检测） */
  version?: number;
  /** 时间戳 */
  timestamp: number;
  /** 事件源标识 */
  source: 'server' | 'local' | 'websocket';
}

/**
 * 版本冲突事件负载
 */
export interface VersionConflictPayload {
  /** 实体类型 */
  entityType: string;
  /** 实体 ID */
  entityId: number;
  /** 当前版本号 */
  currentVersion: number;
  /** 最新数据 */
  latestData: any;
  /** 时间戳 */
  timestamp: number;
}

/**
 * WebSocket 消息类型
 */
export type WebSocketMessageType =
  | 'data_changed'
  | 'version_conflict'
  | 'notification'
  | 'user_joined'
  | 'user_left'
  | 'ping';

/**
 * WebSocket 消息结构
 */
export interface WebSocketMessage<T = any> {
  /** 消息类型 */
  type: WebSocketMessageType;
  /** 消息负载 */
  data: T;
  /** 时间戳 */
  timestamp: number;
  /** 消息 ID（用于去重） */
  messageId?: string;
}

// ==================== 事件监听器类型 ====================

/**
 * 数据变更事件监听器
 */
export type DataChangeListener = (payload: DataChangeEventPayload) => void;

/**
 * 版本冲突事件监听器
 */
export type VersionConflictListener = (payload: VersionConflictPayload) => void;

/**
 * 通用事件监听器
 */
export type EventListener<T = any> = (data: T) => void;

// ==================== 事件服务类 ====================

class EventService {
  // 事件监听器映射
  private listeners: Map<string, Set<EventListener>> = new Map();

  // WebSocket 消息处理器映射
  private wsMessageHandlers: Map<WebSocketMessageType, Set<EventListener>> = new Map();

  // 是否已初始化
  private initialized = false;

  // 本地事件计数器（用于生成事件 ID）
  private localEventId = 0;

  /**
   * 初始化事件服务
   */
  initialize() {
    if (this.initialized) return;

    // 初始化 WebSocket 消息监听
    this.initWebSocketListeners();

    // 初始化跨标签页同步监听
    this.initCrossTabSync();

    this.initialized = true;
    console.log('[EventService] 事件服务已初始化');
  }

  /**
   * 初始化 WebSocket 消息监听
   */
  private initWebSocketListeners() {
    wsService.onMessage((message: WebSocketMessage) => {
      this.handleWebSocketMessage(message);
    });
  }

  /**
   * 初始化跨标签页同步
   */
  private initCrossTabSync() {
    // 监听 storage 事件（仅用于跨标签页同步）
    window.addEventListener('storage', (e) => {
      if (e.key && e.key.startsWith('sync_event_') && e.newValue) {
        try {
          const syncData = JSON.parse(e.newValue);
          // 只处理来自其他标签页的事件（通过 isNewValue 判断）
          this.handleCrossTabEvent(syncData);
        } catch (error) {
          console.error('[EventService] 解析跨标签页事件失败:', error);
        }
      }
    });
  }

  /**
   * 处理 WebSocket 消息
   */
  private handleWebSocketMessage(message: WebSocketMessage) {
    const { type, data } = message;

    switch (type) {
      case 'data_changed':
        this.handleDataChanged(data as DataChangeEventPayload);
        break;

      case 'version_conflict':
        this.handleVersionConflict(data as VersionConflictPayload);
        break;

      default:
        // 触发通用的 WebSocket 消息监听器
        this.triggerWsMessageListeners(type, data);
    }
  }

  /**
   * 处理数据变更事件
   */
  private handleDataChanged(payload: DataChangeEventPayload) {
    console.log('[EventService] 收到数据变更事件:', payload.dataType, payload.operation);

    // 触发特定数据类型的监听器
    const eventType = `data_changed:${payload.dataType}`;
    this.trigger(eventType, payload);

    // 触发所有数据变更的监听器
    this.trigger('data_changed', payload);

    // 触发传统的事件（向后兼容）
    this.dispatchEventForCompatibility(payload);
  }

  /**
   * 处理版本冲突事件
   */
  private handleVersionConflict(payload: VersionConflictPayload) {
    console.warn('[EventService] 收到版本冲突事件:', payload);

    // 触发版本冲突监听器
    this.trigger('version_conflict', payload);

    // 触发传统的 CustomEvent（向后兼容）
    window.dispatchEvent(new CustomEvent('versionConflict', {
      detail: payload
    }));
  }

  /**
   * 触发 WebSocket 消息监听器
   */
  private triggerWsMessageListeners(type: WebSocketMessageType, data: any) {
    const handlers = this.wsMessageHandlers.get(type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`[EventService] WebSocket 消息处理器错误 (${type}):`, error);
        }
      });
    }
  }

  /**
   * 处理跨标签页事件
   */
  private handleCrossTabEvent(syncData: { type: string; data: any; sourceTabId: string }) {
    // 忽略来自当前标签页的事件
    const currentTabId = this.getTabId();
    if (syncData.sourceTabId === currentTabId) return;

    const { type, data } = syncData;
    this.trigger(type, data);
  }

  /**
   * 触发事件
   */
  private trigger(eventType: string, data: any) {
    const handlers = this.listeners.get(eventType);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`[EventService] 事件处理器错误 (${eventType}):`, error);
        }
      });
    }
  }

  /**
   * 派发兼容性事件（向后兼容旧代码）
   */
  private dispatchEventForCompatibility(payload: DataChangeEventPayload) {
    // 兼容旧的 data-changed 事件
    window.dispatchEvent(new CustomEvent('data-changed', {
      detail: {
        type: payload.dataType,
        source: payload.source,
        operation: payload.operation,
      }
    }));

    // 兼容旧的 organization-changed 事件
    if (payload.dataType === 'organization_units') {
      window.dispatchEvent(new CustomEvent('organization-changed', {
        detail: payload
      }));
    }
  }

  /**
   * 获取或生成标签页 ID
   */
  private getTabId(): string {
    let tabId = sessionStorage.getItem('tab_id');
    if (!tabId) {
      tabId = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      sessionStorage.setItem('tab_id', tabId);
    }
    return tabId;
  }

  // ==================== 公共 API ====================

  /**
   * 订阅数据变更事件
   * @param dataType 数据类型，或 'all' 订阅所有变更
   * @param listener 事件监听器
   * @returns 取消订阅函数
   */
  onDataChanged(
    dataType: DataChangeEventType | 'all',
    listener: DataChangeListener
  ): () => void {
    const eventType = dataType === 'all' ? 'data_changed' : `data_changed:${dataType}`;
    return this.on(eventType, listener);
  }

  /**
   * 订阅版本冲突事件
   */
  onVersionConflict(listener: VersionConflictListener): () => void {
    return this.on('version_conflict', listener);
  }

  /**
   * 订阅 WebSocket 消息
   */
  onWebSocketMessage<T = any>(
    messageType: WebSocketMessageType,
    listener: EventListener<T>
  ): () => void {
    if (!this.wsMessageHandlers.has(messageType)) {
      this.wsMessageHandlers.set(messageType, new Set());
    }
    this.wsMessageHandlers.get(messageType)!.add(listener);

    // 返回取消订阅函数
    return () => {
      const handlers = this.wsMessageHandlers.get(messageType);
      if (handlers) {
        handlers.delete(listener);
      }
    };
  }

  /**
   * 订阅通用事件
   * @param eventType 事件类型
   * @param listener 事件监听器
   * @returns 取消订阅函数
   */
  on(eventType: string, listener: EventListener): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener);

    // 返回取消订阅函数
    return () => {
      this.off(eventType, listener);
    };
  }

  /**
   * 取消订阅事件
   */
  off(eventType: string, listener: EventListener): void {
    const handlers = this.listeners.get(eventType);
    if (handlers) {
      handlers.delete(listener);
      // 如果没有监听器了，删除该事件类型
      if (handlers.size === 0) {
        this.listeners.delete(eventType);
      }
    }
  }

  /**
   * 本地派发数据变更事件（用于本地操作后的通知）
   * @param payload 事件负载
   * @param broadcastToOtherTabs 是否广播到其他标签页
   */
  emitDataChanged(
    payload: Omit<DataChangeEventPayload, 'timestamp' | 'source'>,
    broadcastToOtherTabs: boolean = true
  ) {
    const fullPayload: DataChangeEventPayload = {
      ...payload,
      timestamp: Date.now(),
      source: 'local',
    };

    // 本地触发
    this.handleDataChanged(fullPayload);

    // 广播到其他标签页
    if (broadcastToOtherTabs) {
      this.broadcastToOtherTabs('data_changed', fullPayload);
    }
  }

  /**
   * 广播事件到其他标签页（通过 localStorage）
   */
  private broadcastToOtherTabs(type: string, data: any) {
    const syncKey = `sync_event_${Date.now()}_${this.localEventId++}`;
    const syncData = {
      type,
      data,
      sourceTabId: this.getTabId(),
    };

    try {
      localStorage.setItem(syncKey, JSON.stringify(syncData));
      // 立即删除以触发 storage 事件
      localStorage.removeItem(syncKey);
    } catch (error) {
      console.error('[EventService] 广播到其他标签页失败:', error);
    }
  }

  /**
   * 清除所有监听器
   */
  clearAllListeners(): void {
    this.listeners.clear();
    this.wsMessageHandlers.clear();
    console.log('[EventService] 所有事件监听器已清除');
  }

  /**
   * 获取当前监听器状态
   */
  getListenerStats(): {
    eventListeners: number;
    wsMessageHandlers: number;
    eventTypes: string[];
    wsMessageTypes: string[];
  } {
    return {
      eventListeners: Array.from(this.listeners.values()).reduce((sum, set) => sum + set.size, 0),
      wsMessageHandlers: Array.from(this.wsMessageHandlers.values()).reduce((sum, set) => sum + set.size, 0),
      eventTypes: Array.from(this.listeners.keys()),
      wsMessageTypes: Array.from(this.wsMessageHandlers.keys()),
    };
  }
}

// ==================== 导出单例 ====================

export const eventService = new EventService();

// 自动初始化
if (typeof window !== 'undefined') {
  eventService.initialize();
}

// ==================== 便捷导出 ====================

/**
 * 订阅数据变更事件的便捷函数
 */
export function onDataChanged(
  dataType: DataChangeEventType | 'all',
  listener: DataChangeListener
): () => void {
  return eventService.onDataChanged(dataType, listener);
}

/**
 * 订阅项目数据变更的便捷函数
 */
export function onProjectsChanged(listener: DataChangeListener): () => void {
  return eventService.onDataChanged('projects', listener);
}

/**
 * 订阅任务数据变更的便捷函数
 */
export function onTasksChanged(listener: DataChangeListener): () => void {
  return eventService.onDataChanged('wbs_tasks', listener);
}

/**
 * 订阅组织架构变更的便捷函数
 */
export function onOrganizationChanged(listener: DataChangeListener): () => void {
  return eventService.onDataChanged('organization_units', listener);
}

/**
 * 派发数据变更事件的便捷函数
 */
export function emitDataChanged(
  payload: Omit<DataChangeEventPayload, 'timestamp' | 'source'>
): void {
  eventService.emitDataChanged(payload);
}
