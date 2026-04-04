import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { toFrontend, toBackend } from '@/lib/utils/transform';
import { sanitizeObject } from '@/utils/sanitize';

/**
 * API 客户端配置
 * 使用 Cookie 进行会话认证
 */
export const apiClient = axios.create({
  baseURL: '/api',
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  // 接受 304 (Not Modified) 作为成功响应
  validateStatus: (status) => (status >= 200 && status < 300) || status === 304,
});

/**
 * CSRF Token 缓存
 * Token 在页面生命周期内不变，首次读取后缓存
 */
let cachedCsrfToken: string | null | undefined = undefined;

/**
 * 获取 CSRF Token（带缓存）
 */
function getCsrfToken(): string | null {
  if (cachedCsrfToken !== undefined) {
    return cachedCsrfToken;
  }
  const metaTag = document.querySelector('meta[name="csrf-token"]');
  cachedCsrfToken = metaTag?.getAttribute('content') ?? null;
  return cachedCsrfToken;
}

/**
 * 请求拦截器：添加 CSRF token、禁用缓存、转换命名风格
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const csrfToken = getCsrfToken();
    if (csrfToken && config.headers) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
    // 禁用浏览器缓存，避免 304 响应
    if (config.headers) {
      config.headers['Cache-Control'] = 'no-cache';
      config.headers['Pragma'] = 'no-cache';
    }
    // 转换请求体：camelCase -> snake_case
    if (config.data && typeof config.data === 'object' && !(config.data instanceof FormData)) {
      config.data = toBackend(config.data);
    }
    // 转换查询参数：camelCase -> snake_case
    if (config.params && typeof config.params === 'object') {
      config.params = toBackend(config.params);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * 响应拦截器：自动转换命名风格、净化数据、统一错误处理
 */
apiClient.interceptors.response.use(
  (response) => {
    // 转换响应数据：snake_case -> camelCase
    const data = response.data;
    if (data && typeof data === 'object') {
      // 先转换命名风格，再净化数据防止XSS
      const transformed = toFrontend(data);
      // 对非密码相关的数据进行XSS净化
      return sanitizeObject(transformed, { excludeKeys: ['password', 'newPassword', 'confirmPassword', 'token', 'secret'] });
    }
    return data;
  },
  (error: AxiosError) => {
    // 401 未认证，清除登录状态并跳转登录
    if (error.response?.status === 401) {
      // 清除前端的登录标记
      localStorage.removeItem('auth_session');
      localStorage.removeItem('currentUser');

      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    // 构造统一的错误对象
    // 后端返回格式: { success: false, error: { code, message } }
    const errorData = error.response?.data as { error?: { code?: string; message?: string }; message?: string };
    const apiError = {
      code: errorData?.error?.code ?? 'UNKNOWN_ERROR',
      message: errorData?.error?.message ?? errorData?.message ?? error.message,
      statusCode: error.response?.status ?? 0,
    };

    return Promise.reject(apiError);
  }
);

export default apiClient;
