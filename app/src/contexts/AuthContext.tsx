import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
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
import { dataSyncService } from '@/services/DataSyncService';
import { getDeviceId } from '@/utils/deviceId';
// 认证相关的跨标签页同步（注意：仅限同一浏览器的不同标签页之间）
// 真正的跨浏览器/跨设备同步由后端WebSocket实现
import { initAuthTabSync, syncLoginState, syncLogoutState, onAuthTabSync } from '@/utils/crossTabSync';
import {
  createSession,
  setCurrentSession,
  terminateSession,
  getActiveSession
} from '@/utils/sessionManager';
import { wsService } from '@/services/WebSocketService';
import { apiService } from '@/services/ApiService';
import { useNotification } from '@/hooks/useNotification';
import { frontendLogger } from '@/services/FrontendLogger';

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
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<boolean>;
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

// 存储bcrypt哈希后的密码
const DEFAULT_PASSWORD_HASHES: Record<string, string> = {
  admin: '$2b$10$w2x2kLPai7bc.HLqX7EtqeSBVEWWr2crpObcDAuYHpD.6tiRLzkwi', // admin123
  tech_manager: '$2b$10$TZNd9iEddcDHN2CumzCRKeAwy7.FnbPo7fd1d//of5nWan/37c0mW', // 123456
  dept_manager: '$2b$10$//YWkdwdmUgWL.yl7VTReOHpRkiw3/Po01UMW0N8lu9S6sd2ubZ6W', // 123456
  engineer: '$2b$10$FALWqb/e475k9ukXpvXN6Oj8McJXgWNDB8DhvyZ5HuwCgSJVKFw8q' // 123456
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
  const savedUser = localStorage.getItem(CURRENT_USER_KEY);
  const savedIsAdmin = localStorage.getItem(ADMIN_KEY);
  const savedSession = localStorage.getItem(SESSION_STORAGE_KEY);
  
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
  const [isAdmin, setIsAdmin] = useState(initialState.isAdmin);
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

    setUser(null);
    setSession(null);
    setIsAdmin(false);
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.removeItem(ADMIN_KEY);

    syncLogoutState();

    dataSyncService.stopSync();

    if (USE_BACKEND) {
      wsService.disconnect();
      if (session?.sessionId) {
        apiService.logout(session.sessionId).catch(console.error);
      }
    }
  }, [session, user]);

  useEffect(() => {
    if (session) {
      const currentTime = Date.now();
      const updatedSession = {
        ...session,
        lastAccessed: currentTime
      };
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updatedSession));
      localStorage.setItem(`active_session_${session.username}`, JSON.stringify(updatedSession));
      localStorage.setItem(`cross_browser_session_${session.username}`, JSON.stringify(updatedSession));
    }
  }, [session]);

  useEffect(() => {
    const cleanup1 = initCrossTabSync();  // 来自 syncEvents.ts - 用户数据变更
    const cleanup2 = initAuthTabSync();   // 来自 crossTabSync.ts - 会话状态

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
            warning('会话终止', '同一浏览器检测到新登录，当前标签页会话已被终止');
            logout();
          }
        } catch (error) {
          console.error('[AuthContext] Failed to handle force logout event:', error);
        }
      }
    };

    window.addEventListener('storage', handleForceLogout);

    return () => {
      cleanup1();
      cleanup2();
      unsubscribe();
      window.removeEventListener('storage', handleForceLogout);
    };
  }, [logout, warning]);

  useEffect(() => {
    if (!USE_BACKEND) return;

    let consecutiveFailures = 0;
    const MAX_SILENT_FAILURES = 3; // 前几次失败静默处理，避免启动时大量日志

    const checkBackendConnection = async () => {
      try {
        await apiService.healthCheck();
        setIsBackendConnected(true);
        consecutiveFailures = 0; // 重置失败计数
      } catch {
        consecutiveFailures++;
        // 只有在连续失败超过阈值后才显示日志
        if (consecutiveFailures > MAX_SILENT_FAILURES) {
          // 每隔一段时间才输出一次日志，避免刷屏
          if (consecutiveFailures % 10 === 0) {
            console.warn('[AuthContext] 后端服务不可用，请确保后端服务已启动');
          }
        }
        setIsBackendConnected(false);
      }
    };

    checkBackendConnection();
    const interval = setInterval(checkBackendConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!USE_BACKEND || !session || !user) return;

    const connectWebSocket = async () => {
      try {
        await wsService.connect(session.sessionId, user.username);
        setIsBackendConnected(true);
      } catch (error) {
        console.error('[AuthContext] WebSocket连接失败:', error);
        setIsBackendConnected(false);
      }
    };

    connectWebSocket();

    const unsubscribe = wsService.onMessage((message) => {
      if (message.type === 'session_terminated') {
        warning('会话终止', message.data.message);
        logout();
      } else if (message.type === 'data_sync') {
        const { dataType, data } = message.data;
        localStorage.setItem(dataType, JSON.stringify(data));
      }
    });

    return () => {
      unsubscribe();
      wsService.disconnect();
    };
  }, [session?.sessionId, user?.username, logout, warning]);

  const login = async (username: string, password: string): Promise<boolean> => {
    // 移除敏感日志输出，只保留必要的信息
    const users = getStoredUsers();
    const userData = users[username];

    if (userData && await bcrypt.compare(password, userData.password)) {

      const deviceId = getDeviceId();

      // 注意：不再检查后端活动会话，允许多个浏览器同时登录
      // 只检查本地活动会话（同一浏览器的其他标签页）
      const activeSession = getActiveSession(username);
      if (activeSession && activeSession.deviceId !== deviceId) {
        const currentTime = Date.now();
        const sessionAge = currentTime - activeSession.lastAccessed;
        if (sessionAge < SESSION_TIMEOUT) {
          // 移除敏感日志输出
          return false;
        }
      }

      // 清理所有旧会话数据（无论是否同一设备）
      terminateSession(username);

      let session: AuthSession;

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
            // 生成新的会话ID以防止会话固定攻击
            const newSessionId = generateSecureSessionId();
            session = {
              userId: `user_${Date.now()}`,
              username,
              sessionId: newSessionId,
              createdAt: result.session.createdAt,
              lastAccessed: result.session.createdAt,
              deviceId
            };
          } else {
            // 后端登录失败，使用本地会话
            session = createSession(`user_${Date.now()}`, username);
            session.deviceId = deviceId;
          }
        } catch (error) {
          // 后端登录失败，使用本地会话
          session = createSession(`user_${Date.now()}`, username);
          session.deviceId = deviceId;
        }
      } else {
        // 使用本地会话
        session = createSession(`user_${Date.now()}`, username);
        session.deviceId = deviceId;
      }

      // 清除旧的会话数据，但保留用户列表
      localStorage.removeItem(CURRENT_USER_KEY);
      localStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem(ADMIN_KEY);

      setCurrentSession(session);
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));

      const user: User = {
        id: session.userId,
        username,
        role: userData.role,
        name: userData.name,
      };

      setUser(user);
      setSession(session);
      setIsAdmin(false);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
      localStorage.removeItem(ADMIN_KEY);

      // 新增：从服务器刷新数据（仅当使用后端时）
      if (USE_BACKEND) {
        try {
          await dataSyncService.refreshFromServer();
        } catch (error) {
          // 刷新失败不影响登录流程
        }
      }

      syncLoginState(user, session);

      // 记录登录日志到前端日志服务
      await frontendLogger.logAuth('用户登录成功', user.id, user.name);
      frontendLogger.setUser(user.id, user.name);
      frontendLogger.setSessionId(session.sessionId);

      dataSyncService.startSync();
      return true;
    }
    return false;
  };

  const adminLogin = async (username: string, password: string): Promise<boolean> => {
    // 使用 bcrypt.compare 验证管理员密码，而不是明文比较
    if (username === ADMIN_CREDENTIALS.username && await bcrypt.compare(password, DEFAULT_PASSWORD_HASHES['admin'])) {
      const deviceId = getDeviceId();

      // 注意：不再检查后端活动会话，允许多个浏览器同时登录
      // 只检查本地活动会话（同一浏览器的其他标签页）
      const activeSession = getActiveSession(username);
      if (activeSession && activeSession.deviceId !== deviceId) {
        const currentTime = Date.now();
        const sessionAge = currentTime - activeSession.lastAccessed;
        if (sessionAge < SESSION_TIMEOUT) {
          console.warn('[AuthContext] 检测到管理员账号在不同设备的有效活动会话，拒绝登录');
          console.warn('[AuthContext] 当前设备ID:', deviceId);
          console.warn('[AuthContext] 活动会话设备ID:', activeSession.deviceId);
          console.warn('[AuthContext] 会话存活时间:', Math.floor(sessionAge / 1000), '秒');
          return false;
        } else {
          // 会话已超时，清理并继续登录
          console.log('[AuthContext] 检测到不同设备的超时会话，清理后继续登录');
        }
      }

      // 清理所有旧会话数据（无论是否同一设备）
      terminateSession(username);

      let session: AuthSession;

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
            // 生成新的会话ID以防止会话固定攻击
            const newSessionId = generateSecureSessionId();
            session = {
              userId: `admin_${Date.now()}`,
              username,
              sessionId: newSessionId,
              createdAt: result.session.createdAt,
              lastAccessed: result.session.createdAt,
              deviceId
            };
          } else {
            // 后端登录失败，使用本地会话
            session = createSession(`admin_${Date.now()}`, username);
            session.deviceId = deviceId;
          }
        } catch (error) {
          console.error('后端登录失败:', error);
          // 后端登录失败，使用本地会话
          session = createSession(`admin_${Date.now()}`, username);
          session.deviceId = deviceId;
        }
      } else {
        // 使用本地会话
        session = createSession(`admin_${Date.now()}`, username);
        session.deviceId = deviceId;
      }

      setCurrentSession(session);
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));

      const adminUser: User = {
        id: session.userId,
        username: 'admin',
        role: 'admin',
        name: '系统管理员',
      };

      setUser(adminUser);
      setSession(session);
      setIsAdmin(true);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(adminUser));
      localStorage.setItem(ADMIN_KEY, 'true');

      // 新增：从服务器刷新数据（仅当使用后端时）
      if (USE_BACKEND) {
        try {
          await dataSyncService.refreshFromServer();
        } catch (error) {
          console.error('[AuthContext] 刷新数据失败:', error);
        }
      }

      syncLoginState(adminUser, session);

      // 记录管理员登录日志到前端日志服务
      await frontendLogger.logAuth('管理员登录成功', adminUser.id, adminUser.name);
      frontendLogger.setUser(adminUser.id, adminUser.name);
      frontendLogger.setSessionId(session.sessionId);

      dataSyncService.startSync();
      return true;
    }
    return false;
  };

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
      // 更新管理员密码哈希
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

  const adminUpdateUser = async (username: string, updates: Partial<{ role: UserRole; name: string; newUsername: string }>): Promise<boolean> => {
    if (!isAdmin) return false;

    const users = getStoredUsers();
    if (!users[username]) return false;

    const oldUsername = username;
    let newUsername = username;

    if (updates.newUsername && updates.newUsername !== username) {
      const validation = validateEmployeeId(updates.newUsername, username);
      if (!validation.valid) {
        return false;
      }

      users[updates.newUsername] = { ...users[username] };
      delete users[username];
      username = updates.newUsername;
      newUsername = updates.newUsername;
    }

    if (updates.role) {
      users[username].role = updates.role;
    }
    if (updates.name) {
      users[username].name = updates.name;
    }

    saveUsers(users);

    emitUserUpdated(newUsername, {
      ...(updates.name && { name: updates.name }),
      ...(updates.role && { role: updates.role }),
      ...(updates.newUsername && { oldUsername, newUsername: updates.newUsername }),
    });

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
    
    const userName = users[username].name;
    
    delete users[username];
    saveUsers(users);
    
    emitUserDeleted(username, userName);
    
    return true;
  };

  const adminCreateUser = async (
    name: string,
    role: UserRole,
    employeeId?: string
  ): Promise<{ success: boolean; message: string; username?: string; tempPassword?: string }> => {
    if (!isAdmin) return { success: false, message: '无权限' };
    
    if (!name.trim()) {
      return { success: false, message: '请输入姓名' };
    }
    
    const users = getStoredUsers();
    let username: string;
    
    if (employeeId && employeeId.trim()) {
      username = employeeId.trim();
      if (users[username]) {
        return { success: false, message: '该工号已被使用' };
      }
    } else {
      const baseUsername = name.trim().toLowerCase().replace(/\s+/g, '_');
      username = baseUsername;
      let counter = 1;
      
      while (users[username]) {
        username = `${baseUsername}_${counter}`;
        counter++;
      }
    }
    
    const tempPassword = Math.random().toString(36).substring(2, 10);

    const newUser: UserData = {
      password: await bcrypt.hash(tempPassword, 10),
      role,
      name: name.trim(),
    };

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

  /**
   * 验证会话有效性
   */
  const validateSession = async (): Promise<boolean> => {
    if (!session || !user) {
      return false;
    }

    try {
      // 检查会话是否超时
      const currentTime = Date.now();
      if (currentTime - session.lastAccessed > SESSION_TIMEOUT) {
        console.warn('[AuthContext] 会话已超时');
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
            console.warn('[AuthContext] 服务器会话无效');
            logout();
            return false;
          }

          const result = await response.json();
          if (!result.valid || result.status === 'terminated') {
            console.warn('[AuthContext] 服务器会话已终止');
            logout();
            return false;
          }
        } catch (error) {
          console.error('[AuthContext] 验证服务器会话失败:', error);
          // 网络错误时不强制登出，使用本地缓存
        }
      }

      return true;
    } catch (error) {
      console.error('[AuthContext] 验证会话失败:', error);
      return false;
    }
  };

  /**
   * 强制登出所有设备
   */
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
              sessionId: session.sessionId
            })
          });
        } catch (error) {
          console.error('[AuthContext] 终止服务器会话失败:', error);
        }
      }

      // 稍微延迟后登出当前设备
      setTimeout(() => {
        logout();
      }, 500);
    } catch (error) {
      console.error('[AuthContext] 强制登出所有设备失败:', error);
    }
  };

  /**
   * 获取会话信息
   */
  const getSessionInfo = (): AuthSession | null => {
    return session;
  };

  /**
   * 延长会话有效期
   */
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

    console.log('[AuthContext] 会话已延长');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAdmin,
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
        validateEmployeeId: validateEmployeeIdFn,
        isEmployeeIdExists: isEmployeeIdExistsFn,
        isBackendConnected,
        validateSession,
        forceLogoutAllDevices,
        getSessionInfo,
        extendSession,
      }}
    >
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
