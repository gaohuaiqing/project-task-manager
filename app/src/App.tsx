import { useEffect } from 'react';
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AppProvider } from '@/shared/context/AppContext';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import { MainLayout } from '@/shared/layout/MainLayout';
import { FullPageLoader } from '@/shared/components/LoadingSpinner';
import { wsClient } from '@/lib/api';
import { AuthProvider } from '@/contexts/AuthContext';

// 懒加载页面
const LoginPage = lazy(() => import('@/features/auth'));
const Dashboard = lazy(() => import('@/features/analytics/Dashboard'));
const Projects = lazy(() => import('@/features/projects'));
const Tasks = lazy(() => import('@/features/tasks'));
const Assignment = lazy(() => import('@/features/assignment'));
const Reports = lazy(() => import('@/features/analytics/reports/ReportsPage'));
const Settings = lazy(() => import('@/features/settings'));

// React Query 客户端配置
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 分钟
      gcTime: 10 * 60 * 1000, // 10 分钟
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

/**
 * 应用入口组件
 */
export function App() {
  // 启动 WebSocket 连接
  useEffect(() => {
    wsClient.connect();
    return () => wsClient.disconnect();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppProvider>
          <Toaster position="top-center" richColors />
          <BrowserRouter>
          <Suspense fallback={<FullPageLoader />}>
            <Routes>
              {/* 公开路由 */}
              <Route path="/login" element={<LoginPage />} />

              {/* 受保护路由 */}
              <Route
                element={
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/projects/:id" element={<Projects />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/tasks/:id" element={<Tasks />} />
                <Route path="/assignment" element={<Assignment />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/reports/:tab" element={<Reports />} />
                <Route path="/settings/*" element={<Settings />} />
              </Route>

              {/* 默认重定向 */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        </AppProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
