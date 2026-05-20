import { apiClient } from '@/lib/api';
import type { LoginRequest, LoginResponse, User, Permission } from './types';

/**
 * 认证 API 响应包装类型
 */
interface ApiResponse<T> {
  success: boolean;
  data: T;
}

/**
 * /auth/me 返回的数据结构
 */
interface MeResponse {
  user: User;
  sessionId: string;
  permissions: Permission[];
}

/**
 * 会话信息类型
 */
export interface SessionInfo {
  id: string;
  ipAddress: string | null;
  ipGroup: string | null;
  userAgent: string | null;
  createdAt: number;
  lastAccessed: number;
  expiresAt: number;
  isCurrent: boolean;
}

/**
 * 认证 API
 */
export const authApi = {
  /**
   * 登录
   */
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    return apiClient.post('/auth/login', data);
  },

  /**
   * 登出
   */
  logout: async (): Promise<void> => {
    return apiClient.post('/auth/logout');
  },

  /**
   * 获取当前用户
   * 注意：后端返回 { success: true, data: { user, sessionId, permissions } }
   * apiClient 拦截器返回 response.data，即整个包装对象
   * 这里需要提取 data.user 并附加 permissions
   */
  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get<ApiResponse<MeResponse>>('/auth/me');
    // response 已经是 { success: true, data: { user, sessionId, permissions } }
    const userData = response.data.user;
    // 将 permissions 附加到 user 对象上，供 useAuth 使用
    return {
      ...userData,
      permissions: response.data.permissions,
    };
  },

  /**
   * 修改密码
   */
  changePassword: async (data: {
    oldPassword: string;
    newPassword: string;
  }): Promise<void> => {
    return apiClient.put('/auth/password', data);
  },

  /**
   * 获取当前用户的所有会话
   */
  getSessions: async (): Promise<SessionInfo[]> => {
    const response = await apiClient.get<ApiResponse<SessionInfo[]>>('/auth/sessions');
    return response.data;
  },

  /**
   * 终止指定会话
   */
  terminateSession: async (sessionId: string): Promise<void> => {
    return apiClient.delete(`/auth/sessions/${sessionId}`);
  },

  /**
   * 终止其他所有会话
   */
  terminateOtherSessions: async (): Promise<{ terminatedCount: number }> => {
    const response = await apiClient.post<ApiResponse<{ terminatedCount: number }>>('/auth/sessions/terminate-others');
    return response.data;
  },
};
