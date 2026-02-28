import { logRegisterSync, logUpdateSync, logDeleteSync, logManualSync, setSyncing } from './syncLogger';
import type { UserRole } from '@/types/auth';

// 同步事件类型
export type SyncEventType = 
  | 'user_registered'
  | 'user_updated' 
  | 'user_deleted'
  | 'manual_sync_requested'
  | 'sync_completed'
  | 'sync_failed'
  | 'data_updated'
  | 'cross_browser_sync';

// 数据更新事件数据接口
export interface DataUpdatedEventData {
  key: string;
  timestamp: number;
  version: number;
  data?: any;
}

// 同步事件数据
export interface SyncEventData {
  type: SyncEventType;
  timestamp: number;
  employeeId?: string;
  name?: string;
  role?: UserRole;
  updates?: Record<string, unknown>;
  error?: string;
  syncedCount?: number;
  data?: DataUpdatedEventData;
}

// 同步事件监听器类型
export type SyncEventListener = (event: SyncEventData) => void;

// 存储键
const SYNC_EVENT_KEY = 'sync_event_channel';
const LAST_SYNC_KEY = 'last_sync_timestamp';

// 监听器集合
const listeners: Set<SyncEventListener> = new Set();

// 生成唯一事件ID
const generateEventId = (): string => {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// 触发同步事件
export const emitSyncEvent = (eventData: Omit<SyncEventData, 'timestamp'>): void => {
  const event: SyncEventData = {
    ...eventData,
    timestamp: Date.now(),
  };
  
  // 存储到 localStorage 以跨标签页通信
  const eventPayload = {
    id: generateEventId(),
    ...event,
  };
  
  try {
    localStorage.setItem(SYNC_EVENT_KEY, JSON.stringify(eventPayload));
    // 立即移除，避免影响后续事件
    setTimeout(() => {
      localStorage.removeItem(SYNC_EVENT_KEY);
    }, 100);
  } catch (error) {
    console.error('[SyncEvents] Failed to emit event:', error);
  }
  
  // 通知所有监听器
  listeners.forEach(listener => {
    try {
      listener(event);
    } catch (error) {
      console.error('[SyncEvents] Listener error:', error);
    }
  });
  
  // 根据事件类型记录日志
  switch (event.type) {
    case 'user_registered':
      if (event.employeeId && event.name) {
        logRegisterSync(event.employeeId, event.name, !event.error, event.error);
      }
      break;
    case 'user_updated':
      if (event.employeeId) {
        logUpdateSync(event.employeeId, event.updates || {}, !event.error, event.error);
      }
      break;
    case 'user_deleted':
      if (event.employeeId && event.name) {
        logDeleteSync(event.employeeId, event.name, !event.error, event.error);
      }
      break;
    case 'manual_sync_requested':
      // 手动同步请求不记录日志，等待完成
      break;
    case 'sync_completed':
      logManualSync(true, event.syncedCount || 0);
      setSyncing(false);
      break;
    case 'sync_failed':
      logManualSync(false, 0, event.error);
      setSyncing(false);
      break;
  }
};

// 添加事件监听器
export const addSyncListener = (listener: SyncEventListener): () => void => {
  listeners.add(listener);
  
  // 返回取消订阅函数
  return () => {
    listeners.delete(listener);
  };
};

// 移除事件监听器
export const removeSyncListener = (listener: SyncEventListener): void => {
  listeners.delete(listener);
};

// 监听跨标签页同步事件
export const initCrossTabSync = (): () => void => {
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === SYNC_EVENT_KEY && e.newValue) {
      try {
        const event = JSON.parse(e.newValue) as SyncEventData & { id: string };
        // 通知所有监听器
        listeners.forEach(listener => {
          try {
            listener(event);
          } catch (error) {
            console.error('[SyncEvents] Cross-tab listener error:', error);
          }
        });
      } catch (error) {
        console.error('[SyncEvents] Failed to parse event:', error);
      }
    }
  };
  
  window.addEventListener('storage', handleStorageChange);
  
  // 返回清理函数
  return () => {
    window.removeEventListener('storage', handleStorageChange);
  };
};

// 记录用户注册事件
export const emitUserRegistered = (
  employeeId: string,
  name: string,
  role: UserRole,
  error?: string
): void => {
  emitSyncEvent({
    type: 'user_registered',
    employeeId,
    name,
    role,
    error,
  });
};

// 记录用户更新事件
export const emitUserUpdated = (
  employeeId: string,
  updates: Record<string, unknown>,
  error?: string
): void => {
  emitSyncEvent({
    type: 'user_updated',
    employeeId,
    updates,
    error,
  });
};

// 记录用户删除事件
export const emitUserDeleted = (
  employeeId: string,
  name: string,
  error?: string
): void => {
  emitSyncEvent({
    type: 'user_deleted',
    employeeId,
    name,
    error,
  });
};

// 请求手动同步
export const emitManualSyncRequest = (): void => {
  setSyncing(true);
  emitSyncEvent({
    type: 'manual_sync_requested',
  });
};

// 同步完成
export const emitSyncCompleted = (syncedCount: number): void => {
  emitSyncEvent({
    type: 'sync_completed',
    syncedCount,
  });
  localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
};

// 同步失败
export const emitSyncFailed = (error: string): void => {
  emitSyncEvent({
    type: 'sync_failed',
    error,
  });
};

// 获取最后同步时间
export const getLastSyncTimestamp = (): number | null => {
  const stored = localStorage.getItem(LAST_SYNC_KEY);
  return stored ? parseInt(stored, 10) : null;
};

// 检查是否需要同步（超过5分钟）
export const shouldSync = (): boolean => {
  const lastSync = getLastSyncTimestamp();
  if (!lastSync) return true;
  
  const fiveMinutes = 5 * 60 * 1000;
  return Date.now() - lastSync > fiveMinutes;
};

// 自动同步检查（用于页面加载时）
export const checkAndTriggerAutoSync = (callback?: () => void): void => {
  if (shouldSync()) {
    console.log('[SyncEvents] Auto sync triggered due to time threshold');
    emitManualSyncRequest();
    if (callback) {
      callback();
    }
  }
};

// 触发数据更新事件
export const emitDataUpdated = (data: DataUpdatedEventData): void => {
  emitSyncEvent({
    type: 'data_updated',
    data,
  });
};

// 触发跨浏览器同步事件
export const emitCrossBrowserSync = (data: any): void => {
  emitSyncEvent({
    type: 'cross_browser_sync',
    data: {
      key: 'cross_browser',
      timestamp: Date.now(),
      version: 1,
      data,
    },
  });
};
