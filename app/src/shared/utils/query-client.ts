/**
 * 共享 QueryClient 实例
 *
 * 将 QueryClient 从 App.tsx 中提取出来，供路由预取等模块直接引用，
 * 而不需要通过 React Context 获取。
 *
 * @module shared/utils/query-client
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 分钟
      gcTime: 10 * 60 * 1000,   // 10 分钟
      retry: 1,
      refetchOnWindowFocus: false,
      // 网络状态变化时自动重新获取
      refetchOnReconnect: true,
      // 组件卸载时取消进行中的请求，避免无效响应竞争
      networkMode: 'online',
    },
    mutations: {
      retry: 0,
    },
  },
});
