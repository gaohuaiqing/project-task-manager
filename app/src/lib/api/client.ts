import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

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
 * 请求拦截器：添加 CSRF token 和禁用缓存
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
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * 响应拦截器：统一错误处理
 */
apiClient.interceptors.response.use(
  (response) => response.data,
  (error: AxiosError) => {
    // 401 未认证，跳转登录
    if (error.response?.status === 401) {
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    // 构造统一的错误对象
    const apiError = {
      code: (error.response?.data as { code?: string })?.code ?? 'UNKNOWN_ERROR',
      message: (error.response?.data as { message?: string })?.message ?? error.message,
      statusCode: error.response?.status ?? 0,
    };

    return Promise.reject(apiError);
  }
);

export default apiClient;
