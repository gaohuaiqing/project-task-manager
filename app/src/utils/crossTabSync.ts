/**
 * 跨标签页认证同步工具
 * 用于在不同浏览器标签页之间同步认证状态
 */

import type { User } from '@/types/auth';

interface AuthSyncEvent {
  type: 'login' | 'logout' | 'session_update';
  data?: {
    user?: User;
    session?: {
      userId: string;
      username: string;
      sessionId: string;
    };
  };
  timestamp: number;
}

type AuthSyncCallback = (event: AuthSyncEvent) => void;

const STORAGE_KEY = 'auth:sync';

/**
 * 同步登录状态到其他标签页
 */
export function syncLoginState(user: User, session: { userId: string; username: string; sessionId: string }): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      type: 'login',
      data: { user, session },
      timestamp: Date.now()
    }));
  } catch {
    // 忽略存储错误
  }
}

/**
 * 同步登出状态到其他标签页
 */
export function syncLogoutState(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      type: 'logout',
      timestamp: Date.now()
    }));
  } catch {
    // 忽略存储错误
  }
}

/**
 * 初始化认证标签页同步
 * @returns 清理函数
 */
export function initAuthTabSync(): () => void {
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;

    // 其他标签页可以在这里处理认证状态变更
    // 当前为空实现
  };

  window.addEventListener('storage', handleStorageChange);

  return () => {
    window.removeEventListener('storage', handleStorageChange);
  };
}

/**
 * 订阅认证同步事件
 * @param callback 事件回调函数
 * @returns 取消订阅函数
 */
export function onAuthTabSync(callback: AuthSyncCallback): () => void {
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY || !e.newValue) return;

    try {
      const event = JSON.parse(e.newValue) as AuthSyncEvent;
      callback(event);
    } catch {
      // 忽略解析错误
    }
  };

  window.addEventListener('storage', handleStorageChange);

  return () => {
    window.removeEventListener('storage', handleStorageChange);
  };
}
