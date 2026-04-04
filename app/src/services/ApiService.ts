/**
 * API 服务
 * 封装 HTTP 请求
 */

import axios from 'axios';

// 创建 axios 实例
const client = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const apiService = {
  async get<T>(url: string, config?: object): Promise<T> {
    const response = await client.get(url, config);
    return response.data;
  },

  async post<T>(url: string, data?: unknown, config?: object): Promise<T> {
    const response = await client.post(url, data, config);
    return response.data;
  },

  async put<T>(url: string, data?: unknown, config?: object): Promise<T> {
    const response = await client.put(url, data, config);
    return response.data;
  },

  async delete<T>(url: string, config?: object): Promise<T> {
    const response = await client.delete(url, config);
    return response.data;
  }
};
