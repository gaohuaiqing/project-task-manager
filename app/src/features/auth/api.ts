import { apiClient } from '@/lib/api';
import type { LoginRequest, LoginResponse, User } from './types';

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
   */
  getCurrentUser: async (): Promise<User> => {
    return apiClient.get('/auth/me');
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
};
