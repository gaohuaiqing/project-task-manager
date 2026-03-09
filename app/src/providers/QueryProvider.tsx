/**
 * React Query Provider 配置
 *
 * 功能：
 * - 服务端状态管理
 * - 自动缓存和重新验证
 * - 请求去重
 * - 后台数据刷新
 *
 * @module providers/QueryProvider
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type ReactNode } from 'react';

interface QueryProviderProps {
  children: ReactNode;
}

/**
 * 创建 QueryClient 实例
 * 配置优化：
 * - staleTime: 5分钟内数据保持新鲜，避免重复请求
 * - gcTime: 30分钟后清理未使用的缓存
 * - retry: 失败重试1次
 * - refetchOnWindowFocus: 禁用窗口焦点自动刷新
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // 数据保持新鲜 5 分钟
        staleTime: 5 * 60 * 1000,
        // 缓存时间 30 分钟
        gcTime: 30 * 60 * 1000,
        // 失败重试 1 次
        retry: 1,
        // 窗口焦点时自动重新验证（禁用以避免不必要的请求）
        refetchOnWindowFocus: false,
        // 组件挂载时不自动重新获取已有数据
        refetchOnMount: false,
        // 重新连接时不自动重新获取
        refetchOnReconnect: false,
      },
      mutations: {
        // 变更失败重试 1 次
        retry: 1,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

/**
 * 获取 QueryClient 单例
 * 在浏览器中使用单例模式避免重复创建
 */
function getQueryClient() {
  if (typeof window === 'undefined') {
    // 服务端：每次创建新实例
    return makeQueryClient();
  } else {
    // 浏览器：使用单例
    if (!browserQueryClient) {
      browserQueryClient = makeQueryClient();
    }
    return browserQueryClient;
  }
}

/**
 * Query Provider 组件
 *
 * 使用方式：
 * ```tsx
 * <QueryProvider>
 *   <App />
 * </QueryProvider>
 * ```
 */
export function QueryProvider({ children }: QueryProviderProps) {
  // NOTE: 避免在 useEffect 中初始化 QueryClient
  // 确保首次渲染时就有可用的 QueryClient
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* 开发环境下显示 React Query Devtools */}
      {import.meta.env.DEV && (
        <ReactQueryDevtools
          initialIsOpen={false}
          position="bottom-right"
        />
      )}
    </QueryClientProvider>
  );
}

/**
 * 导出 QueryClient 实例供外部使用
 * 场景：直接操作缓存、预设数据等
 */
export { getQueryClient as getQueryClientInstance };
