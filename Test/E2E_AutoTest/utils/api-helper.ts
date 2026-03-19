/**
 * API 请求辅助工具
 */
import { APIRequestContext } from '@playwright/test';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api';

export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  ok: boolean;
}

export class ApiHelper {
  private request: APIRequestContext;
  private authToken: string | null = null;
  private cookies: Record<string, string> = {};

  constructor(request: APIRequestContext) {
    this.request = request;
  }

  /**
   * 登录获取认证状态
   */
  async login(username: string, password: string): Promise<ApiResponse> {
    const response = await this.request.post(`${API_BASE_URL}/auth/login`, {
      data: { username, password },
    });

    const data = await response.json();
    
    if (response.ok()) {
      // 保存认证信息
      this.authToken = data.token || null;
      // 从响应头获取 cookie
      const setCookie = response.headers()['set-cookie'];
      if (setCookie) {
        // 解析 cookie
        setCookie.split(';').forEach((cookie: string) => {
          const [name, value] = cookie.trim().split('=');
          if (name && value) {
            this.cookies[name] = value;
          }
        });
      }
    }

    return {
      data,
      status: response.status(),
      ok: response.ok(),
    };
  }

  /**
   * 获取请求头
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    return headers;
  }

  /**
   * GET 请求
   */
  async get<T = unknown>(endpoint: string, params?: Record<string, string | number>): Promise<ApiResponse<T>> {
    let url = `${API_BASE_URL}${endpoint}`;
    if (params) {
      const queryString = new URLSearchParams(
        Object.entries(params).map(([k, v]) => [k, String(v)])
      ).toString();
      url += `?${queryString}`;
    }

    const response = await this.request.get(url, {
      headers: this.getHeaders(),
    });

    let data: T;
    try {
      data = await response.json();
    } catch {
      data = {} as T;
    }

    return {
      data,
      status: response.status(),
      ok: response.ok(),
    };
  }

  /**
   * POST 请求
   */
  async post<T = unknown>(endpoint: string, body: object): Promise<ApiResponse<T>> {
    const response = await this.request.post(`${API_BASE_URL}${endpoint}`, {
      headers: this.getHeaders(),
      data: body,
    });

    let data: T;
    try {
      data = await response.json();
    } catch {
      data = {} as T;
    }

    return {
      data,
      status: response.status(),
      ok: response.ok(),
    };
  }

  /**
   * PUT 请求
   */
  async put<T = unknown>(endpoint: string, body: object): Promise<ApiResponse<T>> {
    const response = await this.request.put(`${API_BASE_URL}${endpoint}`, {
      headers: this.getHeaders(),
      data: body,
    });

    let data: T;
    try {
      data = await response.json();
    } catch {
      data = {} as T;
    }

    return {
      data,
      status: response.status(),
      ok: response.ok(),
    };
  }

  /**
   * DELETE 请求
   */
  async delete(endpoint: string): Promise<ApiResponse> {
    const response = await this.request.delete(`${API_BASE_URL}${endpoint}`, {
      headers: this.getHeaders(),
    });

    let data;
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    return {
      data,
      status: response.status(),
      ok: response.ok(),
    };
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.request.get(`${API_BASE_URL}/health`, {
        timeout: 5000,
      });
      return response.ok();
    } catch {
      return false;
    }
  }

  /**
   * 重置认证状态
   */
  resetAuth(): void {
    this.authToken = null;
    this.cookies = {};
  }
}
