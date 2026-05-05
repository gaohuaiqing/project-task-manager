import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AppProvider } from '@/shared/context/AppContext';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import { MainLayout } from '@/shared/layout/MainLayout';
import { InlinePageLoader } from '@/shared/components/LoadingSpinner';
import { wsClient } from '@/lib/api';
import { AuthProvider } from '@/contexts/AuthContext';
import { useAuth } from '@/features/auth';
import { queryClient } from '@/shared/utils/query-client';
import { useTaskRealtimeSync } from '@/features/tasks/hooks/useTaskRealtimeSync';

// 懒加载页面
const LoginPage = lazy(() => import('@/features/auth'));
const Dashboard = lazy(() => import('@/features/analytics/Dashboard'));
const Projects = lazy(() => import('@/features/projects'));
const Tasks = lazy(() => import('@/features/tasks'));
const Assignment = lazy(() => import('@/features/assignment'));
const Reports = lazy(() => import('@/features/analytics/reports/ReportsPage'));
const Settings = lazy(() => import('@/features/settings'));

/** 需要管理员/经理角色的路由（工程师不可访问） */
const REPORT_ALLOWED_ROLES = ['admin', 'dept_manager', 'tech_manager'];

/**
 * 基于角色的路由守卫
 * 不满足角色要求时重定向到仪表板
 */
function RoleGuard({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

/**
 * 应用内部组件（在 QueryClientProvider 内部，可使用 React Query hooks）
 */
function AppInner() {
  // 启动 WebSocket 连接
  useEffect(() => {
    wsClient.connect();
    return () => wsClient.disconnect();
  }, []);

  // 启用任务实时数据同步
  useTaskRealtimeSync();

  return (
    <AuthProvider>
      <AppProvider>
        <Toaster position="top-center" richColors />
        <BrowserRouter>
          <Routes>
            <Route
              path="/login"
              element={
                <Suspense fallback={<InlinePageLoader />}>
                  <LoginPage />
                </Suspense>
              }
            />

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
              <Route path="/reports" element={<RoleGuard roles={REPORT_ALLOWED_ROLES}><Reports /></RoleGuard>} />
              <Route path="/reports/:tab" element={<RoleGuard roles={REPORT_ALLOWED_ROLES}><Reports /></RoleGuard>} />
              <Route path="/settings/*" element={<Settings />} />
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
  );
}

/**
 * 应用入口组件
 */
export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppInner />
    </QueryClientProvider>
  );
}

export default App;
