/**
 * 会话管理器
 *
 * 职责：
 * 1. 统一管理用户会话的创建、验证、销毁
 * 2. 后端数据库为主数据源（支持真正的跨设备/跨浏览器）
 * 3. 内存缓存为辅助（仅性能优化，无持久化）
 * 4. 支持 WebSocket 实时会话推送
 *
 * 架构说明：
 * - 会话数据存储在后端数据库（MySQL）
 * - 前端仅内存缓存当前会话（刷新后重新验证）
 * - 跨设备/跨浏览器同步通过后端 + WebSocket 实现
 */

import { getDeviceId } from './deviceId';

// ================================================================
// 类型定义
// ================================================================

export interface AuthSession {
  /** 用户ID */
  userId: string;
  /** 用户名 */
  username: string;
  /** 会话ID */
  sessionId: string;
  /** 创建时间 */
  createdAt: number;
  /** 最后访问时间 */
  lastAccessed: number;
  /** 设备ID */
  deviceId: string;
  /** 用户角色 */
  role?: string;
  /** 是否管理员 */
  isAdmin?: boolean;
}

export interface SessionValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 会话数据 */
  session?: AuthSession;
  /** 错误信息 */
  error?: string;
}

// ================================================================
// 常量定义
// ================================================================

/** 后端 API 基础地址 */
const API_BASE = 'http://localhost:3001/api';

/** 会话超时时间（1小时） */
const SESSION_TIMEOUT = 60 * 60 * 1000;

/** 内存缓存的会话（无持久化） */
let currentSession: AuthSession | null = null;

/** 心跳间隔（30秒） */
const HEARTBEAT_INTERVAL = 30 * 1000;

/** 心跳定时器 */
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

// ================================================================
// 工具函数
// ================================================================

/**
 * 生成不可预测的会话ID
 * 使用 crypto.randomUUID() 确保会话ID的随机性和不可预测性
 * 防止会话固定攻击 (Session Fixation Attack)
 */
function generateSessionId(): string {
  // 优先使用 crypto.randomUUID() (浏览器现代API)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // 降级方案：使用更可靠的随机数生成
  const array = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    // 最后的降级方案：Math.random (不推荐，但保证可用性)
    for (let i = 0; i < 16; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  // 转换为十六进制字符串
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * 检查会话是否有效（未超时）
 */
function isSessionValid(session: AuthSession): boolean {
  const currentTime = Date.now();
  return currentTime - session.lastAccessed < SESSION_TIMEOUT;
}

// ================================================================
// 后端 API 调用
// ================================================================

/**
 * 从后端创建会话
 */
async function createSessionOnBackend(userId: string, username: string): Promise<AuthSession> {
  const deviceId = getDeviceId();
  const session: AuthSession = {
    userId,
    username,
    sessionId: generateSessionId(),
    createdAt: Date.now(),
    lastAccessed: Date.now(),
    deviceId
  };

  try {
    const response = await fetch(`${API_BASE}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session)
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        console.log('[SessionManager] 会话已创建到后端:', session.sessionId);
        return session;
      }
    }
  } catch (error) {
    console.warn('[SessionManager] 后端创建会话失败，使用本地会话:', error);
  }

  // 降级：返回本地会话（无后端支持时）
  return session;
}

/**
 * 从后端验证会话
 */
async function validateSessionOnBackend(sessionId: string): Promise<SessionValidationResult> {
  try {
    const response = await fetch(`${API_BASE}/sessions/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success && result.data) {
        return { valid: true, session: result.data };
      }
    }
  } catch (error) {
    console.warn('[SessionManager] 后端验证会话失败:', error);
  }

  return { valid: false, error: '会话验证失败' };
}

/**
 * 向后端发送心跳（延长会话）
 */
async function sendHeartbeat(sessionId: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/sessions/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    });

    if (response.ok) {
      const result = await response.json();
      return result.success === true;
    }
  } catch (error) {
    console.warn('[SessionManager] 发送心跳失败:', error);
  }

  return false;
}

/**
 * 从后端终止会话
 */
async function terminateSessionOnBackend(sessionId: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/sessions/terminate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        console.log('[SessionManager] 会话已从后端终止:', sessionId);
        return true;
      }
    }
  } catch (error) {
    console.warn('[SessionManager] 后端终止会话失败:', error);
  }

  return false;
}

/**
 * 从后端终止用户的所有会话
 */
async function terminateAllUserSessionsOnBackend(username: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/sessions/terminate-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });

    if (response.ok) {
      const result = await response.json();
      return result.success === true;
    }
  } catch (error) {
    console.warn('[SessionManager] 后端终止所有会话失败:', error);
  }

  return false;
}

// ================================================================
// 会话管理函数
// ================================================================

/**
 * 创建新会话
 */
export async function createSession(userId: string, username: string): Promise<AuthSession> {
  // 创建并保存到后端
  const session = await createSessionOnBackend(userId, username);

  // 内存缓存
  currentSession = session;

  // 启动心跳
  startHeartbeat();

  console.log('[SessionManager] 会话已创建:', session.username);
  return session;
}

/**
 * 获取当前会话（从内存缓存）
 */
export function getCurrentSession(): AuthSession | null {
  return currentSession;
}

/**
 * 设置当前会话（用于恢复登录状态）
 */
export function setCurrentSession(session: AuthSession): void {
  currentSession = session;
  startHeartbeat();
}

/**
 * 验证会话（检查后端 + 本地超时）
 */
export async function validateSession(session?: AuthSession): Promise<SessionValidationResult> {
  const sessionToCheck = session || currentSession;

  if (!sessionToCheck) {
    return { valid: false, error: '无会话' };
  }

  // 检查本地超时
  if (!isSessionValid(sessionToCheck)) {
    return { valid: false, error: '会话已超时' };
  }

  // 检查后端会话状态
  const backendResult = await validateSessionOnBackend(sessionToCheck.sessionId);

  if (backendResult.valid && backendResult.session) {
    // 更新内存缓存
    currentSession = backendResult.session;
    return backendResult;
  }

  return { valid: false, error: backendResult.error || '会话无效' };
}

/**
 * 更新会话最后访问时间
 */
export async function updateSessionLastAccessed(): Promise<void> {
  if (!currentSession) {
    return;
  }

  currentSession.lastAccessed = Date.now();

  // 异步发送心跳到后端
  sendHeartbeat(currentSession.sessionId).catch(err => {
    console.warn('[SessionManager] 心跳发送失败:', err);
  });
}

/**
 * 终止当前会话
 */
export async function terminateSession(): Promise<void> {
  if (!currentSession) {
    return;
  }

  // 停止心跳
  stopHeartbeat();

  // 通知后端终止会话
  await terminateSessionOnBackend(currentSession.sessionId);

  // 清除内存缓存
  currentSession = null;

  console.log('[SessionManager] 会话已终止');
}

/**
 * 终止用户的所有会话（包括其他设备）
 */
export async function terminateAllUserSessions(username: string): Promise<boolean> {
  // 通知后端终止所有会话
  const success = await terminateAllUserSessionsOnBackend(username);

  // 清除本地会话
  if (currentSession && currentSession.username === username) {
    stopHeartbeat();
    currentSession = null;
  }

  return success;
}

/**
 * 检查是否在其他设备有活动会话
 */
export async function hasOtherDeviceSession(): Promise<boolean> {
  if (!currentSession) {
    return false;
  }

  const currentDeviceId = getDeviceId();

  try {
    const response = await fetch(`${API_BASE}/sessions/active-devices?username=${currentSession.username}`);
    if (response.ok) {
      const result = await response.json();
      if (result.success && result.data) {
        // 检查是否有其他设备的活动会话
        return result.data.some((s: AuthSession) => s.deviceId !== currentDeviceId);
      }
    }
  } catch (error) {
    console.warn('[SessionManager] 检查其他设备会话失败:', error);
  }

  return false;
}

/**
 * 清除当前会话（用于登出）
 */
export function clearCurrentSession(): void {
  stopHeartbeat();
  currentSession = null;
}

/**
 * 刷新会话（重新验证）
 */
export async function refreshSession(): Promise<SessionValidationResult> {
  return await validateSession(currentSession || undefined);
}

// ================================================================
// 心跳机制
// ================================================================

/**
 * 启动心跳
 */
function startHeartbeat(): void {
  // 先停止已有的心跳
  stopHeartbeat();

  // 定时发送心跳
  heartbeatTimer = setInterval(async () => {
    if (currentSession) {
      await updateSessionLastAccessed();
    }
  }, HEARTBEAT_INTERVAL);

  console.log('[SessionManager] 心跳已启动');
}

/**
 * 停止心跳
 */
function stopHeartbeat(): void {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
    console.log('[SessionManager] 心跳已停止');
  }
}

// ================================================================
// 兼容旧代码的函数（将逐步废弃）
// ================================================================

/**
 * @deprecated 使用 validateSession 替代
 */
export function getSession(username: string): AuthSession | null {
  return currentSession?.username === username ? currentSession : null;
}

/**
 * @deprecated 使用 getCurrentSession 替代
 */
export function getActiveSession(username: string): AuthSession | null {
  return currentSession?.username === username ? currentSession : null;
}

/**
 * @deprecated localStorage 不能跨浏览器，这是误导性命名
 */
export function getCrossBrowserSession(username: string): AuthSession | null {
  // 直接返回内存缓存
  return currentSession?.username === username ? currentSession : null;
}

/**
 * @deprecated 使用 hasOtherDeviceSession 替代
 */
export function hasOtherBrowserSession(): Promise<boolean> {
  return hasOtherDeviceSession();
}

// ================================================================
// 初始化
// ================================================================

/**
 * 页面卸载时清理
 */
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    // 停止心跳
    stopHeartbeat();
  });

  // 页面隐藏时停止心跳，显示时重启
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopHeartbeat();
    } else if (currentSession) {
      startHeartbeat();
      // 页面重新显示时刷新会话
      refreshSession().catch(err => {
        console.warn('[SessionManager] 页面恢复时刷新会话失败:', err);
      });
    }
  });
}
