/**
 * API 服务
 * 封装 HTTP 请求
 * 与 apiClient 保持一致的命名转换和认证方式
 */

import axios from 'axios';
import { sanitizeObject } from '@/utils/sanitize';
import { toFrontend } from '@/lib/utils/transform';

// 创建 axios 实例
const client = axios.create({
  baseURL: '/api',
  timeout: 30000,
  withCredentials: true,  // 使用 Cookie 认证，与 apiClient 保持一致
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器
client.interceptors.request.use(
  (config) => {
    // Cookie 认证无需手动添加 token
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器 — snake_case → camelCase 转换 + XSS 防护
client.interceptors.response.use(
  (response) => {
    const data = response.data;
    if (data && typeof data === 'object') {
      // 1. 先转换命名风格：snake_case → camelCase
      const transformed = toFrontend(data);
      // 2. 再进行 XSS 净化，排除密码和令牌等敏感字段
      return sanitizeObject(transformed, { excludeKeys: ['password', 'newPassword', 'confirmPassword', 'token', 'secret'] });
    }
    return data;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Cookie 认证模式下，清除前端状态并跳转登录
      localStorage.removeItem('auth_session');
      localStorage.removeItem('currentUser');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const apiService = {
  // 注意：响应拦截器已将 axios response 转换为数据对象
  // 所以 client.get() 返回的就是转换后的 { success, data } 结构
  // 不需要再访问 .data

  async get<T>(url: string, config?: object): Promise<T> {
    return client.get(url, config);
  },

  async post<T>(url: string, data?: unknown, config?: object): Promise<T> {
    return client.post(url, data, config);
  },

  async put<T>(url: string, data?: unknown, config?: object): Promise<T> {
    return client.put(url, data, config);
  },

  async delete<T>(url: string, config?: object): Promise<T> {
    return client.delete(url, config);
  }
};
