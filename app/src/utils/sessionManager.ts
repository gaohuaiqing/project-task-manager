/**
 * 会话管理工具
 * 用于管理用户会话的创建、获取和终止
 */

import type { User } from '@/types/auth';

const SESSION_KEY = 'auth_session';

interface SessionData {
  userId: string;
  username: string;
  sessionId: string;
  createdAt: number;
  lastAccessed: number;
}

/**
 * 创建新会话
 */
export function createSession(user: User): string {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  const sessionData: SessionData = {
    userId: user.id,
    username: user.username,
    sessionId,
    createdAt: Date.now(),
    lastAccessed: Date.now()
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
  return sessionId;
}

/**
 * 设置当前会话
 */
export function setCurrentSession(sessionId: string): void {
  const sessionStr = localStorage.getItem(SESSION_KEY);
  if (sessionStr) {
    try {
      const session = JSON.parse(sessionStr) as SessionData;
      session.sessionId = sessionId;
      session.lastAccessed = Date.now();
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      // 忽略解析错误
    }
  }
}

/**
 * 终止会话
 */
export function terminateSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

/**
 * 获取活动会话
 */
export function getActiveSession(): SessionData | null {
  const sessionStr = localStorage.getItem(SESSION_KEY);
  if (!sessionStr) return null;

  try {
    const session = JSON.parse(sessionStr) as SessionData;
    const SESSION_TIMEOUT = 8 * 60 * 60 * 1000;
    if (Date.now() - session.lastAccessed > SESSION_TIMEOUT) {
      terminateSession();
      return null;
    }
    session.lastAccessed = Date.now();
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  } catch {
    return null;
  }
}
