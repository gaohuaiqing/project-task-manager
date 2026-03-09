import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import type { User, UserRole } from '@/types/auth';
import bcrypt from 'bcryptjs';
import {
  emitUserRegistered,
  emitUserUpdated,
  emitUserDeleted,
  initCrossTabSync
} from '@/utils/syncEvents';
import { validateEmployeeId } from '@/utils/employeeValidation';
import { validatePasswordStrength, validateStrongPassword } from '@/utils/passwordValidation';
import { getDeviceId } from '@/utils/deviceId';
import { useNotification } from '@/hooks/useNotification';
import { frontendLogger } from '@/services/FrontendLogger';
import {
  createSession,
  setCurrentSession,
  terminateSession,
  getActiveSession
} from '@/utils/sessionManager';
import { initAuthTabSync, syncLoginState, syncLogoutState, onAuthTabSync } from '@/utils/crossTabSync';
import { apiService } from '@/services/ApiService';
import { wsService } from '@/services/WebSocketService';

const SESSION_STORAGE_KEY = 'auth_session';
const SESSION_TIMEOUT = 28800000; // 8小时会话超时
const USE_BACKEND = true; // 设置为true时使用后端服务，false时使用本地存储

interface AuthSession {
  userId: string;
  username: string;
  sessionId: string;
  createdAt: number;
  lastAccessed: number;
  deviceId: string;
}

interface AuthContextType {
  user: User | null;
  // ✅ isAdmin 改为计算值（基于 user.role === 'admin'）
  get isAdmin(): boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  /** @deprecated 请使用 login() 代替，本函数将在未来版本中移除 */
  adminLogin: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUserRole: (role: UserRole) => void;
  updateUserProfile: (updates: Partial<User>) => void;
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  register: (username: string, password: string, name: string, role: UserRole) => Promise<{ success: boolean; message: string }>;
  getAllUsers: () => Array<{ username: string; role: UserRole; name: string }>;
  adminUpdateUser: (username: string, updates: Partial<{ role: UserRole; name: string; newUsername: string }>) => Promise<boolean>;
  adminResetPassword: (username: string, newPassword: string) => Promise<boolean>;
  adminDeleteUser: (username: string) => Promise<boolean>;
  adminCreateUser: (name: string, role: UserRole, employeeId?: string) => Promise<{ success: boolean; message: string; username?: string; tempPassword?: string }>;
  validateEmployeeId: (employeeId: string, excludeCurrentId?: string) => { valid: boolean; message: string };
  isEmployeeIdExists: (employeeId: string) => boolean;
  isBackendConnected: boolean;

  // 新增：会话安全相关方法
  validateSession: () => Promise<boolean>;
  forceLogoutAllDevices: () => Promise<void>;
  getSessionInfo: () => AuthSession | null;
  extendSession: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USERS_STORAGE_KEY = 'app_users';
const CURRENT_USER_KEY = 'currentUser';
const ADMIN_KEY = 'isAdmin';

// ================================================================
// 优化：使用缓存减少 localStorage 读取次数
// ================================================================

const authStorageCache = new Map<string, string | null>();

/**
 * 优化的 localStorage.getItem，使用缓存减少重复读取
 */
function getCachedItem(key: string): string | null {
  if (authStorageCache.has(key)) {
    return authStorageCache.get(key)!;
  }
  const value = localStorage.getItem(key);
  authStorageCache.set(key, value);
  return value;
}

/**
 * 清除缓存（在写入后调用）
 */
function invalidateCache(key?: string): void {
  if (key) {
    authStorageCache.delete(key);
  } else {
    authStorageCache.clear();
  }
}

/**
 * 生成不可预测的会话ID
 * 使用 crypto.randomUUID() 确保会话ID的随机性和不可预测性
 * 防止会话固定攻击 (Session Fixation Attack)
 */
const generateSecureSessionId = (): string => {
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
};

// 默认密码（明文，用于初始化时哈希）
// 管理员凭据（用于 adminLogin 函数）
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin123'
};

const DEFAULT_PASSWORDS = {
  admin: 'admin123',
  tech_manager: '123456',
  dept_manager: '123456',
  engineer: '123456'
};

// 存储bcrypt哈希后的密码（与后端数据库保持一致）
const DEFAULT_PASSWORD_HASHES: Record<string, string> = {
  admin: '$2b$10$UlqvBIzHlnAJpb5wT1Aa9.fgLC.SKKjyCPiIMpIRNXDc0Bjx65RTS', // admin123
  tech_manager: '$2b$10$2zeE2Hvm.EcN4bqPMCp5mOWzpXj9.1ePC4TLbKVAXWY/73T2dqD76', // 123456
  dept_manager: '$2b$10$3cHjTFjWuCnf/B6meAj4AO1P5NnG0AeLTyEsxAhKTi7DwdEMOQ7lm', // 123456
  engineer: '$2b$10$MnqujUKF6iTtt2WxOD0ujOQVWF0jRxHii2bhuuCDlXdWMVv7aMeCu' // 123456
};

interface UserData {
  password: string;
  role: UserRole;
  name: string;
}

const getStoredUsers = (): Record<string, UserData> => {
  const stored = localStorage.getItem(USERS_STORAGE_KEY);
  if (stored) {
    try {
      const users = JSON.parse(stored);
      // 确保至少有默认用户（使用哈希密码）
      const defaultUsers: Record<string, UserData> = {
        'admin': { password: DEFAULT_PASSWORD_HASHES['admin'], role: 'admin' as UserRole, name: '系统管理员' },
        'tech_manager': { password: DEFAULT_PASSWORD_HASHES['tech_manager'], role: 'tech_manager' as UserRole, name: '技术经理' },
        'dept_manager': { password: DEFAULT_PASSWORD_HASHES['dept_manager'], role: 'dept_manager' as UserRole, name: '部门经理' },
        'engineer': { password: DEFAULT_PASSWORD_HASHES['engineer'], role: 'engineer' as UserRole, name: '工程师' },
      };
      // 合并默认用户（防止旧数据缺少用户）
      const merged = { ...defaultUsers, ...users };
      if (Object.keys(users).length < Object.keys(defaultUsers).length) {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(merged));
        console.log('[AuthContext] 更新用户列表，添加缺失用户');
      }
      return merged;
    } catch (error) {
      console.error('[AuthContext] 解析用户数据失败:', error);
      localStorage.removeItem(USERS_STORAGE_KEY);
    }
  }
  const defaultUsers: Record<string, UserData> = {
    'admin': { password: DEFAULT_PASSWORD_HASHES['admin'], role: 'admin' as UserRole, name: '系统管理员' },
    'tech_manager': { password: DEFAULT_PASSWORD_HASHES['tech_manager'], role: 'tech_manager' as UserRole, name: '技术经理' },
    'dept_manager': { password: DEFAULT_PASSWORD_HASHES['dept_manager'], role: 'dept_manager' as UserRole, name: '部门经理' },
    'engineer': { password: DEFAULT_PASSWORD_HASHES['engineer'], role: 'engineer' as UserRole, name: '工程师' },
  };
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(defaultUsers));
  console.log('[AuthContext] 初始化默认用户:', Object.keys(defaultUsers));
  return defaultUsers;
};

const saveUsers = (users: Record<string, UserData>) => {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
};

const getInitialAuthState = () => {
  // 优化：使用缓存的 getItem 减少读取次数
  const savedUser = getCachedItem(CURRENT_USER_KEY);
  const savedIsAdmin = getCachedItem(ADMIN_KEY);
  const savedSession = getCachedItem(SESSION_STORAGE_KEY);

  if (savedUser && savedSession) {
    try {
      const sessionData = JSON.parse(savedSession);
      const currentTime = Date.now();

      if (currentTime - sessionData.lastAccessed < SESSION_TIMEOUT) {
        return {
          user: JSON.parse(savedUser),
          isAdmin: savedIsAdmin === 'true',
          session: sessionData
        };
      } else {
        const username = sessionData.username;
        // 清理所有会话相关的 key
        localStorage.removeItem(CURRENT_USER_KEY);
        localStorage.removeItem(ADMIN_KEY);
        localStorage.removeItem(SESSION_STORAGE_KEY);
        localStorage.removeItem(`auth_session_${username}`);
        localStorage.removeItem(`active_session_${username}`);
        localStorage.removeItem(`cross_browser_session_${username}`);
        // 清除缓存
        invalidateCache(CURRENT_USER_KEY);
        invalidateCache(ADMIN_KEY);
        invalidateCache(SESSION_STORAGE_KEY);
        return {
          user: null,
          isAdmin: false,
          session: null
        };
      }
    } catch {
      localStorage.removeItem(CURRENT_USER_KEY);
      localStorage.removeItem(ADMIN_KEY);
      localStorage.removeItem(SESSION_STORAGE_KEY);
      // 清除缓存
      invalidateCache(CURRENT_USER_KEY);
      invalidateCache(ADMIN_KEY);
      invalidateCache(SESSION_STORAGE_KEY);
      return {
        user: null,
        isAdmin: false,
        session: null
      };
    }
  }

  if (savedIsAdmin === 'true') {
    return {
      user: null,
      isAdmin: true,
      session: null
    };
  }

  return {
    user: null,
    isAdmin: false,
    session: null
  };
};

export function AuthProvider({ children }: { children: ReactNode }) {
  console.log('[AuthProvider] 初始化');

  // 确保用户数据在初始化时被创建
  getStoredUsers();

  const initialState = getInitialAuthState();
  console.log('[AuthProvider] 初始状态:', initialState);
  const [user, setUser] = useState<User | null>(initialState.user);
  // ✅ 关键修改：isAdmin 改为计算值（基于 user.role === 'admin'）
  const isAdmin = useMemo(() => user?.role === 'admin', [user]);
  const [session, setSession] = useState<AuthSession | null>(initialState.session);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const { warning, error, success } = useNotification();

  const logout = useCallback(() => {
    // 记录登出日志到前端日志服务
    if (user) {
      frontendLogger.logAuth('用户登出', user.id, user.name);
    }

    if (session) {
      localStorage.removeItem(`active_session_${session.username}`);
      localStorage.removeItem(`cross_browser_session_${session.username}`);
    }
    localStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(ADMIN_KEY);

    setUser(null);
    setSession(null);
    // 不再需要独立的 isAdmin 状态
  }, [user, session]);

  useEffect(() => {
    const cleanup1 = initCrossTabSync();
    const cleanup2 = initAuthTabSync();

    const unsubscribe = onAuthTabSync((event) => {
      if (event.type === 'session_terminated' && event.sourceDeviceId !== getDeviceId()) {
        logout();
      }
    });

    const handleForceLogout = (e: StorageEvent) => {
      if (e.key === 'force_logout' && e.newValue) {
        try {
          const logoutData = JSON.parse(e.newValue);
          if (logoutData.sourceDeviceId !== getDeviceId()) {
            logout();
          }
        } catch (error) {
          console.error('[AuthProvider] Failed to handle force logout event:', error);
        }
      }
    };

    window.addEventListener('storage', handleForceLogout);

    return () => {
      cleanup1();
      cleanup2();
      window.removeEventListener('storage', handleForceLogout);
    };
  }, [logout]);

  useEffect(() => {
    if (!USE_BACKEND) return;

    let consecutiveFailures = 0;
    const MAX_SILENT_FAILURES = 3;

    const checkBackendConnection = async () => {
      try {
        await apiService.healthCheck();
        setIsBackendConnected(true);
        consecutiveFailures = 0;
      } catch {
        consecutiveFailures++;
        if (consecutiveFailures > MAX_SILENT_FAILURES) {
          console.warn('[AuthProvider] 后端服务不可用，请确保后端服务已启动');
        }
        setIsBackendConnected(false);
      }
    };

    checkBackendConnection();
    const interval = setInterval(checkBackendConnection, 60000);

    // ✅ 确保清理函数在依赖项变化时被调用
    return () => {
      clearInterval(interval);
    };
  }, [USE_BACKEND]); // 明确依赖项

  useEffect(() => {
    if (!USE_BACKEND || !session || !user) return;

    const connectWebSocket = async () => {
      try {
        await wsService.connect(session.sessionId, user.username);
        setIsBackendConnected(true);
      } catch (error) {
        console.error('[AuthProvider] WebSocket连接失败:', error);
        setIsBackendConnected(false);
      }
    };

    connectWebSocket();

    const unsubscribe = wsService.onMessage((message) => {
      if (message.type === 'session_terminated') {
        warning('会话终止', message.data.message);
        logout();
      }
      // data_sync 消息类型已移除（原 DataSyncService）
    });

    return () => {
      unsubscribe();
      wsService.disconnect();
    };
  }, [session?.sessionId, user?.username, logout]);

  // ================================================================
  // 登录认证函数
  // ================================================================

  const login = async (username: string, password: string): Promise<boolean> => {
    console.log('[AuthProvider] login 开始, username:', username);

    try {
      // 性能优化：优先使用后端验证，移除前端bcrypt验证（避免双重计算）
      // 后端已经做了完整的密码验证，前端只需要处理结果
      const deviceId = getDeviceId();

      // 注意：不再检查后端活动会话，允许多个浏览器同时登录
      // 只检查本地活动会话（同一浏览器的其他标签页）
      const activeSession = getActiveSession(username);
      if (activeSession && activeSession.deviceId !== deviceId) {
        const currentTime = Date.now();
        const sessionAge = currentTime - activeSession.lastAccessed;
        if (sessionAge < SESSION_TIMEOUT) {
          console.warn('[AuthProvider] 检测到同一浏览器的其他会话');
          return false;
        }
      }

      // 清理所有旧会话数据（无论是否同一设备）
      terminateSession(username);

      let session: AuthSession;
      let userData: UserData | undefined;

      // 尝试连接后端服务
      if (USE_BACKEND) {
        try {
          const response = await fetch('http://localhost:3001/api/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              username,
              password,
              ip: 'local',
              deviceId,
              sourceDeviceInfo: navigator.userAgent
            })
          });

          const result = await response.json();

          if (result.success) {
            // 后端登录成功
            setIsBackendConnected(true);
            console.log('[AuthProvider] 后端登录成功');

            // 生成新的会话ID以防止会话固定攻击
            const newSessionId = generateSecureSessionId();

            // 从本地获取用户角色和名称（后端返回的session中有role）
            const users = getStoredUsers();
            userData = users[username];

            session = {
              userId: `user_${Date.now()}`,
              username,
              sessionId: newSessionId,
              createdAt: result.session.createdAt,
              lastAccessed: result.session.createdAt,
              deviceId
            };
          } else {
            // 后端返回验证失败（密码错误、用户不存在等）
            console.warn('[AuthProvider] 后端验证失败:', result.message);
            error(result.message || '用户名或密码错误');
            return false;
          }
        } catch (error) {
          // 网络错误或后端服务不可用
          console.error('[AuthProvider] 后端连接失败:', error);

          // 降级方案：尝试本地验证
          const users = getStoredUsers();
          userData = users[username];

          if (!userData) {
            error('用户不存在');
            return false;
          }

          // 本地密码验证
          if (!await bcrypt.compare(password, userData.password)) {
            error('用户名或密码错误');
            return false;
          }

          console.warn('[AuthProvider] 后端不可用，使用本地会话');
          session = createSession(`user_${Date.now()}`, username);
          session.deviceId = deviceId;
        }
      } else {
        // 离线模式：使用本地验证
        const users = getStoredUsers();
        userData = users[username];

        if (!userData) {
          error('用户不存在');
          return false;
        }

        if (!await bcrypt.compare(password, userData.password)) {
          error('用户名或密码错误');
          return false;
        }

        session = createSession(`user_${Date.now()}`, username);
        session.deviceId = deviceId;
      }

      // 清除旧的会话数据，但保留用户列表
      localStorage.removeItem(CURRENT_USER_KEY);
      localStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem(ADMIN_KEY);

      setCurrentSession(session);
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));

      if (!userData) {
        const users = getStoredUsers();
        userData = users[username];
      }

      const loginUser: User = {
        id: session.userId,
        username,
        role: userData?.role || 'engineer',
        name: userData?.name || username,
      };

      // ✅ 保存用户信息到 localStorage，确保刷新页面后可以恢复登录状态
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(loginUser));

      setUser(loginUser);
      setSession(session);
      // isAdmin 会自动基于 user.role 计算

      syncLoginState(loginUser, session);

      // 记录登录日志（异步，不阻塞）
      void frontendLogger.logAuth('用户登录成功', loginUser.id, loginUser.name);

      console.log('[AuthProvider] 登录完成');

      return true;
    } catch (err) {
      // 后端连接失败或其他错误
      console.error('[AuthProvider] 登录异常:', err);

      if (err instanceof TypeError && err.message.includes('fetch')) {
        error('无法连接到服务器，请检查网络连接或启动后端服务');
      } else {
        error('登录失败，请重试');
      }
      return false;
    }
  };

  // ================================================================
  // 管理员登录函数（废弃，保留向后兼容）
  // ================================================================

  const adminLogin = async (username: string, password: string): Promise<boolean> => {
    console.warn('[AuthProvider] adminLogin 已废弃，请使用 login() 代替');
    return await login(username, password);
  };

  // ================================================================
  // 用户管理函数
  // ================================================================

  const updateUserRole = (role: UserRole) => {
    if (user && !isAdmin) {
      const updatedUser = { ...user, role };
      setUser(updatedUser);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));

      const users = getStoredUsers();
      if (users[user.username]) {
        users[user.username].role = role;
        saveUsers(users);
        emitUserUpdated(user.username, { role });
      }
    }
  };

  const updateUserProfile = (updates: Partial<User>) => {
    if (user && !isAdmin) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));

      const users = getStoredUsers();
      if (users[user.username] && updates.name) {
        users[user.username].name = updates.name;
        saveUsers(users);
        emitUserUpdated(user.username, { name: updates.name });
      }
    }
  };

  const changePassword = async (oldPassword: string, newPassword: string): Promise<boolean> => {
    if (!user) return false;

    if (!isAdmin) {
      const users = getStoredUsers();
      const userData = users[user.username];

      // 使用 bcrypt.compare 验证旧密码，使用 bcrypt.hash 加密新密码
      if (userData && await bcrypt.compare(oldPassword, userData.password)) {
        users[user.username].password = await bcrypt.hash(newPassword, 10);
        saveUsers(users);
        return true;
      }
      return false;
    }

    // 管理员密码也应该使用哈希比较和存储
    if (await bcrypt.compare(oldPassword, DEFAULT_PASSWORD_HASHES['admin'])) {
      const users = getStoredUsers();
      users['admin'].password = await bcrypt.hash(newPassword, 10);
      saveUsers(users);
      return true;
    }
    return false;
  };

  const register = async (
    username: string,
    password: string,
    name: string,
    role: UserRole
  ): Promise<{ success: boolean; message: string }> => {
    const users = getStoredUsers();

    const validation = validateEmployeeId(username);
    if (!validation.valid) {
      return { success: false, message: validation.message };
    }

    // 使用强密码验证策略
    const passwordValidation = validateStrongPassword(password);
    if (!passwordValidation.valid) {
      return { success: false, message: passwordValidation.message };
    }

    if (!name.trim()) {
      return { success: false, message: '请输入姓名' };
    }

    users[username] = {
      password: await bcrypt.hash(password, 10),
      role,
      name: name.trim(),
    };

    saveUsers(users);

    emitUserRegistered(username, name.trim(), role);

    return { success: true, message: '注册成功' };
  };

  const getAllUsers = () => {
    const users = getStoredUsers();
    return Object.entries(users).map(([username, data]) => ({
      username,
      role: data.role,
      name: data.name,
    }));
  };

  const adminUpdateUser = async (username: string, updates: Partial<{ role: UserRole; name: string; newUsername: string }>) => {
    if (!isAdmin) return false;

    const users = getStoredUsers();
    if (!users[username]) return false;

    if (updates.role) {
      users[username].role = updates.role;
    }
    if (updates.name) {
      users[username].name = updates.name;
    }

    saveUsers(users);
    emitUserUpdated(username, { role: updates.role, name: updates.name });

    return true;
  };

  const adminResetPassword = async (username: string, newPassword: string): Promise<boolean> => {
    if (!isAdmin) return false;

    const users = getStoredUsers();
    if (!users[username]) return false;

    if (newPassword.length < 6) return false;

    users[username].password = await bcrypt.hash(newPassword, 10);
    saveUsers(users);
    return true;
  };

  const adminDeleteUser = async (username: string): Promise<boolean> => {
    if (!isAdmin) return false;

    if (username === 'admin') return false;

    const users = getStoredUsers();
    if (!users[username]) return false;

    delete users[username];
    saveUsers(users);

    emitUserDeleted(username);

    return true;
  };

  const adminCreateUser = async (
    name: string,
    role: UserRole,
    employeeId?: string
  ): Promise<{ success: boolean; message: string; username?: string; tempPassword?: string }> => {
    if (!isAdmin) {
      return { success: false, message: '无权限' };
    }

    if (!name.trim()) {
      return { success: false, message: '请输入姓名' };
    }

    const username = employeeId || name;

    const validation = validateEmployeeId(username);
    if (!validation.valid) {
      return { success: false, message: validation.message };
    }

    const tempPassword = Math.random().toString(36).substring(2, 10);

    const newUser: UserData = {
      password: await bcrypt.hash(tempPassword, 10),
      role,
      name: name.trim(),
    };

    const users = getStoredUsers();
    users[username] = newUser;
    saveUsers(users);

    emitUserRegistered(username, name.trim(), role);

    return {
      success: true,
      message: '用户创建成功',
      username,
      tempPassword,
    };
  };

  const validateEmployeeIdFn = (employeeId: string, excludeCurrentId?: string) => {
    return validateEmployeeId(employeeId, excludeCurrentId);
  };

  const isEmployeeIdExistsFn = (employeeId: string) => {
    const users = getStoredUsers();
    return !!users[employeeId.trim()];
  };

  // ================================================================
  // 会话安全相关函数
  // ================================================================

  const validateSession = async (): Promise<boolean> => {
    if (!session || !user) {
      return false;
    }

    try {
      // 检查会话是否超时
      const currentTime = Date.now();
      if (currentTime - session.lastAccessed > SESSION_TIMEOUT) {
        console.warn('[AuthProvider] 会话已超时');
        logout();
        return false;
      }

      // 如果使用后端，验证服务器会话状态
      if (USE_BACKEND && session.sessionId) {
        try {
          const response = await fetch(`http://localhost:3001/api/session/status/${session.sessionId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });

          if (!response.ok) {
            console.warn('[AuthProvider] 服务器会话无效');
            logout();
            return false;
          }

          const result = await response.json();
          if (!result.valid || result.status === 'terminated') {
            console.warn('[AuthProvider] 服务器会话已终止');
            logout();
            return false;
          }
        } catch (error) {
          console.error('[AuthProvider] 验证服务器会话失败:', error);
          // 网络错误时不强制登出，使用本地缓存
        }
      }

      return true;
    } catch (error) {
      console.error('[AuthProvider] 验证会话失败:', error);
      logout();
      return false;
    }
  };

  const forceLogoutAllDevices = async (): Promise<void> => {
    if (!user || !session) {
      return;
    }

    try {
      // 通知所有设备登出
      localStorage.setItem('force_logout', JSON.stringify({
        username: user.username,
        timestamp: Date.now(),
        reason: 'admin_logout_all',
        sourceDeviceId: session.deviceId
      }));

      // 如果使用后端，通知服务器终止所有会话
      if (USE_BACKEND && session.sessionId) {
        try {
          await fetch(`http://localhost:3001/api/sessions/${user.username}/terminate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              reason: 'admin_logout_all',
              deviceId: session.deviceId
            })
          });
        } catch (error) {
          console.error('[AuthProvider] 终止服务器会话失败:', error);
        }
      }

      // 稍微延迟后登出当前设备
      setTimeout(() => {
        logout();
      }, 500);
    } catch (error) {
      console.error('[AuthProvider] 强制登出所有设备失败:', error);
    }
  };

  const getSessionInfo = (): AuthSession | null => {
    return session;
  };

  const extendSession = (): void => {
    if (!session) {
      return;
    }

    const now = Date.now();
    const extendedSession = {
      ...session,
      lastAccessed: now
    };

    setSession(extendedSession);
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(extendedSession));

    if (session.username) {
      localStorage.setItem(`active_session_${session.username}`, JSON.stringify(extendedSession));
    }

    console.log('[AuthProvider] 会话已延长');
  };

  // ✅ 优化：使用 useMemo 缓存 user 对象，稳定引用
  const memoizedUser = useMemo(() => user, [user?.id, user?.role, user?.name]);

  // ✅ 优化：使用 useMemo 缓存 Context value，防止不必要的重渲染
  const authContextValue = useMemo(() => ({
    user: memoizedUser,
    get isAdmin() {
      // ✅ 计算值：基于 user.role === 'admin'
      return memoizedUser?.role === 'admin';
    },
    isAuthenticated: !!memoizedUser,
    login,
    adminLogin, // 标记为废弃但保留向后兼容
    logout,
    updateUserRole,
    updateUserProfile,
    changePassword,
    register,
    getAllUsers,
    adminUpdateUser,
    adminResetPassword,
    adminDeleteUser,
    adminCreateUser,
    validateEmployeeId: validateEmployeeIdFn,
    isEmployeeIdExists: isEmployeeIdExistsFn,
    isBackendConnected,
    validateSession,
    forceLogoutAllDevices,
    getSessionInfo,
    extendSession,
  }), [
    memoizedUser,
    login,
    adminLogin,
    logout,
    updateUserRole,
    updateUserProfile,
    changePassword,
    register,
    getAllUsers,
    adminUpdateUser,
    adminResetPassword,
    adminDeleteUser,
    adminCreateUser,
    validateEmployeeIdFn,
    isEmployeeIdExistsFn,
    isBackendConnected,
    validateSession,
    forceLogoutAllDevices,
    getSessionInfo,
    extendSession
  ]);

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
