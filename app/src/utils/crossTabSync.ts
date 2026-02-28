/**
 * 认证相关的跨标签页同步工具 (Auth Cross-Tab Sync)
 *
 * ========================================
 * 与 syncEvents.ts 的区别
 * ========================================
 *
 * 本文件 (crossTabSync.ts)：
 * - 函数名：initAuthTabSync()
 * - 作用：监听会话状态事件（登录、登出、会话终止）
 * - 事件：session_terminated, login_state, logout_state
 * - 用途：同一浏览器内的单点登录
 *
 * syncEvents.ts：
 * - 函数名：initCrossTabSync()
 * - 作用：监听用户数据变更事件（注册、更新、删除）
 * - 事件：user_registered, user_updated, user_deleted
 * - 用途：同一浏览器内的用户数据同步
 *
 * ========================================
 * 重要说明：作用域限制
 * ========================================
 *
 * ⚠️ 本文件使用 localStorage + StorageEvent 机制
 *
 * 作用范围：
 * ✅ 同一浏览器的不同标签页/窗口之间
 * ❌ 不同浏览器之间（Chrome ↔ Firefox 不支持）
 * ❌ 不同设备之间（电脑A ↔ 电脑B 不支持）
 *
 * ========================================
 * 真正的跨浏览器/跨设备同步
 * ========================================
 *
 * 跨浏览器、跨设备的实时同步由以下机制实现：
 * - 后端WebSocket服务器作为唯一数据源
 * - 服务器实时广播数据变更给所有连接的客户端
 * - 位置: server/src/index.ts (broadcastToAll函数)
 * - 延迟: <100ms
 *
 * ========================================
 */

import type { User } from '@/types/auth';
import { getDeviceId } from './deviceId';

// 会话接口
interface AuthSession {
  userId: string;
  username: string;
  sessionId: string;
  createdAt: number;
  lastAccessed: number;
  deviceId: string;
}

// 跨标签页同步事件类型
type CrossTabSyncEvent =
  | 'login_state'
  | 'logout_state'
  | 'session_terminated'
  | 'data_updated';

// 事件数据接口
interface SyncEventData {
  type: CrossTabSyncEvent;
  timestamp: number;
  user?: User;
  session?: AuthSession;
  message?: string;
  data?: any;
  sourceDeviceId?: string;
}

// 存储键
const SYNC_EVENT_KEY = 'cross_tab_sync_event';
const SESSION_TERMINATED_KEY = 'session_terminated';

// 监听器集合
const listeners = new Set<(event: SyncEventData) => void>();

/**
 * 触发跨标签页同步事件
 *
 * 机制：通过 localStorage + StorageEvent 实现同一浏览器的不同标签页之间的通信
 *
 * 注意：这不会影响其他浏览器或其他设备上的会话
 */
const emitCrossTabEvent = (eventData: Omit<SyncEventData, 'timestamp'>): void => {
  const event: SyncEventData = {
    ...eventData,
    timestamp: Date.now(),
  };

  // 存储到 localStorage 以触发 StorageEvent
  // StorageEvent 会在同一浏览器的其他标签页中触发
  try {
    localStorage.setItem(SYNC_EVENT_KEY, JSON.stringify(event));
    // 立即移除，避免影响后续事件
    setTimeout(() => {
      localStorage.removeItem(SYNC_EVENT_KEY);
    }, 100);
  } catch (error) {
    console.error('[CrossTabSync] Failed to emit event:', error);
  }

  // 通知当前页面的所有监听器
  listeners.forEach(listener => {
    try {
      listener(event);
    } catch (error) {
      console.error('[CrossTabSync] Listener error:', error);
    }
  });
};

/**
 * 触发会话终止事件
 *
 * 用于同一浏览器内：当用户新开标签页登录时，终止该浏览器的其他标签页会话
 *
 * 注意：这只会终止同一浏览器的其他标签页，不会影响其他浏览器或设备
 */
const emitSessionTerminatedEvent = (user: any, session: any): void => {
  // 发送明确的会话终止事件
  emitCrossTabEvent({
    type: 'session_terminated',
    message: '同一浏览器检测到新登录，当前标签页会话已终止',
    user,
    session,
    sourceDeviceId: session.deviceId,
  });

  // 额外发送一个强制登出事件，确保同一浏览器的所有标签页都能接收到
  try {
    localStorage.setItem('force_logout', JSON.stringify({
      userId: user.id,
      username: user.username,
      timestamp: Date.now(),
      sourceDeviceId: session.deviceId
    }));
    setTimeout(() => {
      localStorage.removeItem('force_logout');
    }, 100);
  } catch (error) {
    console.error('[CrossTabSync] Failed to emit force logout event:', error);
  }
};

/**
 * 初始化认证相关的跨标签页同步监听
 *
 * 监听 localStorage 的 storage 事件，接收来自同一浏览器其他标签页的会话消息
 *
 * 与 syncEvents.ts 的 initCrossTabSync 的区别：
 * - syncEvents.ts：监听用户数据变更（注册、更新、删除）
 * - crossTabSync.ts：监听会话状态（登录、登出、会话终止）
 */
const initAuthTabSync = (): (() => void) => {
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === SYNC_EVENT_KEY && e.newValue) {
      try {
        const event = JSON.parse(e.newValue) as SyncEventData;

        // 过滤掉自己发送的事件（通过设备ID判断）
        if (event.sourceDeviceId === getDeviceId()) {
          return;
        }

        // 处理会话终止事件
        if (event.type === 'session_terminated') {
          // 存储会话终止通知
          localStorage.setItem(SESSION_TERMINATED_KEY, JSON.stringify({
            message: event.message || '同一浏览器检测到新登录，当前标签页会话已终止',
            timestamp: Date.now()
          }));

          // 通知当前页面的监听器
          listeners.forEach(listener => {
            try {
              listener(event);
            } catch (error) {
              console.error('[CrossTabSync] Listener error:', error);
            }
          });
        } else {
          // 通知其他事件
          listeners.forEach(listener => {
            try {
              listener(event);
            } catch (error) {
              console.error('[CrossTabSync] Listener error:', error);
            }
          });
        }
      } catch (error) {
        console.error('[CrossTabSync] Failed to parse event:', error);
      }
    } else if (e.key === 'force_logout' && e.newValue) {
      // 处理强制登出事件
      try {
        const logoutData = JSON.parse(e.newValue);

        // 过滤掉自己发送的事件
        if (logoutData.sourceDeviceId === getDeviceId()) {
          return;
        }

        // 存储会话终止通知
        localStorage.setItem(SESSION_TERMINATED_KEY, JSON.stringify({
          message: '同一浏览器检测到新登录，当前标签页会话已终止',
          timestamp: Date.now()
        }));

        // 通知当前页面的监听器
        listeners.forEach(listener => {
          try {
            listener({
              type: 'session_terminated',
              timestamp: Date.now(),
              message: '同一浏览器检测到新登录，当前标签页会话已终止',
              sourceDeviceId: logoutData.sourceDeviceId
            });
          } catch (error) {
            console.error('[CrossTabSync] Listener error:', error);
          }
        });
      } catch (error) {
        console.error('[CrossTabSync] Failed to parse force logout event:', error);
      }
    }
  };

  // 添加存储事件监听器
  window.addEventListener('storage', handleStorageChange);

  // 检查是否有会话终止通知
  const checkSessionTerminated = () => {
    const terminatedData = localStorage.getItem(SESSION_TERMINATED_KEY);
    if (terminatedData) {
      try {
        const data = JSON.parse(terminatedData);
        localStorage.removeItem(SESSION_TERMINATED_KEY);
      } catch (error) {
        console.error('[CrossTabSync] Failed to parse session terminated data:', error);
      }
    }
  };

  // 初始化时检查会话终止状态
  checkSessionTerminated();

  // 定期检查会话终止状态（增加可靠性）
  const interval = setInterval(checkSessionTerminated, 500);

  // 返回清理函数
  return () => {
    window.removeEventListener('storage', handleStorageChange);
    clearInterval(interval);
  };
};

/**
 * 同步登录状态到同一浏览器的其他标签页
 *
 * 效果：同一浏览器的新登录会终止该浏览器的其他标签页会话
 */
const syncLoginState = (user: User, session: AuthSession): void => {
  // 通知同一浏览器的其他标签页会话已被终止
  emitSessionTerminatedEvent(user, session);

  // 发送登录状态
  emitCrossTabEvent({
    type: 'login_state',
    user,
    session,
    sourceDeviceId: session.deviceId,
  });

  // 额外触发一个存储事件
  try {
    localStorage.setItem('force_session_check', JSON.stringify({
      timestamp: Date.now(),
      userId: user.id,
      message: 'Session terminated due to new login in same browser',
      sourceDeviceId: session.deviceId
    }));
    setTimeout(() => {
      localStorage.removeItem('force_session_check');
    }, 100);
  } catch (error) {
    console.error('[CrossTabSync] Failed to force session check:', error);
  }
};

/**
 * 同步登出状态到同一浏览器的其他标签页
 */
const syncLogoutState = (): void => {
  emitCrossTabEvent({
    type: 'logout_state',
  });
};

/**
 * 注册认证相关的跨标签页同步监听器
 */
const onAuthTabSync = (callback: (event: SyncEventData) => void): (() => void) => {
  listeners.add(callback);

  // 返回取消订阅函数
  return () => {
    listeners.delete(callback);
  };
};

/**
 * 发送数据更新通知
 *
 * 注意：这只是通知机制，实际数据同步由 WebSocket 负责
 */
const syncDataUpdated = (data: any): void => {
  emitCrossTabEvent({
    type: 'data_updated',
    data,
  });
};

// 保留原有API以兼容旧代码，但添加废弃警告
const saveData = (key: string, data: any): void => {
  console.warn('[CrossTabSync] saveData is deprecated. Use the primary data sync mechanism via WebSocket.');
  try {
    localStorage.setItem(`cross_tab_${key}`, JSON.stringify(data));
    syncDataUpdated({
      key,
      data,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('[CrossTabSync] Failed to save data:', error);
  }
};

const getData = (key: string): any => {
  console.warn('[CrossTabSync] getData is deprecated. Use the primary data sync mechanism via WebSocket.');
  try {
    const data = localStorage.getItem(`cross_tab_${key}`);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('[CrossTabSync] Failed to get data:', error);
  }
  return null;
};

// 导出所有函数
export {
  // 新的 API 名称（推荐使用）
  initAuthTabSync,
  onAuthTabSync,
  syncLoginState,
  syncLogoutState,
  syncDataUpdated,
  emitSessionTerminatedEvent,
  saveData,
  getData,

  // 兼容旧 API 名称（已废弃）
  initAuthTabSync as initCrossBrowserSync,
  onAuthTabSync as onCrossBrowserSync,
};
