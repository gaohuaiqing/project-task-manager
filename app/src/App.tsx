/**
 * 主应用组件 - 简化版
 *
 * 职责：
 * - 应用入口和错误边界
 * - 路由和认证控制
 * - 整体布局组织
 *
 * 架构：
 * - 数据管理 → useAppData Hook
 * - 权限控制 → useAppPermissions Hook
 * - 统计详情 → StatsDetailDialog 组件
 */

import { useState, useCallback, lazy, Suspense, useMemo } from 'react';
import React from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { LoginPage } from '@/components/auth/LoginPage';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { SaturationChart } from '@/components/dashboard/SaturationChart';
import { ProjectOverview } from '@/components/dashboard/ProjectOverview';
import { TaskStats } from '@/components/dashboard/TaskStats';
import { TaskAlerts } from '@/components/dashboard/TaskAlerts';
import { StatsDetailDialog, type StatsData } from '@/components/dashboard/StatsDetailDialog';
import { ProjectListSkeleton } from '@/components/projects/ProjectListSkeleton';
import { VersionConflictDialog, useVersionConflict } from '@/components/shared/VersionConflictDialog';
import { CheckSquare, FolderKanban, Users, TrendingUp, Shield } from 'lucide-react';
import { useAppData } from '@/hooks/useAppData';
import { useAppPermissions } from '@/hooks/useAppPermissions';
import type { Notification } from '@/types';
import {
  canAccessDataScope,
  canPerformTaskOperation,
  ROLE_CONFIG
} from '@/types/auth';

// ================================================================
// 懒加载组件
// ================================================================
const ProjectManager = lazy(() => import('@/components/projects/ProjectManagerOptimized'));
const SmartAssignment = lazy(() => import('@/components/task-assignment/SmartAssignment')
  .then(m => ({ default: m.SmartAssignment })));
const TaskManagement = lazy(() => import('@/components/task-management/TaskManagement')
  .then(m => ({ default: m.TaskManagement })));
const SettingsPage = lazy(() => import('@/components/settings/SettingsPage')
  .then(m => ({ default: m.SettingsPage })));
const EngineerDashboard = lazy(() => import('@/components/dashboard/EngineerDashboard')
  .then(m => ({ default: m.EngineerDashboard })));
const DesignSystemDemo = lazy(() => import('@/components/apple-design/DesignSystemDemo')
  .then(m => ({ default: m.DesignSystemDemo })));
const AppleDesignShowcase = lazy(() => import('@/components/apple-design/AppleDesignShowcase')
  .then(m => ({ default: m.AppleDesignShowcase })));

// ================================================================
// UI 组件
// ================================================================

/** 加载状态组件 */
const ComponentLoader = () => (
  <div className="flex items-center justify-center min-h-[40vh]">
    <div className="text-center space-y-4">
      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
      <p className="text-sm text-muted-foreground">加载中...</p>
    </div>
  </div>
);

/** 无权限提示组件 */
const NoPermissionView = React.memo(({ user }: { user?: any }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
    <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
      <Shield className="w-10 h-10 text-muted-foreground" />
    </div>
    <h3 className="text-xl font-semibold text-foreground mb-2">无访问权限</h3>
    <p className="text-muted-foreground max-w-md">
      您当前的身份（{user ? ROLE_CONFIG[user.role].label : '未知'}）没有权限访问此页面。
      请联系管理员获取相应权限。
    </p>
  </div>
));

// ================================================================
// 主应用组件
// ================================================================

function ProtectedApp() {
  const { user, isAdmin, logout } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedStatsCard, setSelectedStatsCard] = useState<StatsData | null>(null);

  // 使用自定义 Hooks 管理数据和权限
  const { members, projects, tasks, isLoading, lastUpdate, refresh } = useAppData();
  const { accessibleViews, currentViewTitle, canAccessCurrentView } = useAppPermissions(
    currentView,
    setCurrentView
  );

  // 版本冲突处理
  const { open: conflictOpen, conflict, closeDialog: closeConflictDialog } = useVersionConflict();

  // 处理版本冲突解决
  const handleConflictResolve = useCallback(async (
    resolution: 'use_server' | 'use_local' | 'merge',
    mergedData?: any
  ) => {
    if (!conflict) return;
    console.log('[App] 解决版本冲突:', resolution, conflict);
    await refresh();
  }, [conflict, refresh]);

  // 统计卡片点击处理
  const handleStatsCardClick = useCallback((title: string, data: any) => {
    setSelectedStatsCard({ title, data });
    setIsDetailDialogOpen(true);
  }, []);

  // 计算统计数据（使用 useMemo 优化性能）
  const totalTasks = useMemo(() => tasks.length, [tasks.length]);
  const inProgressProjects = useMemo(
    () => projects.filter((p: any) => p.status === 'in_progress').length,
    [projects]
  );
  const avgSaturation = useMemo(
    () => members.length > 0
      ? Math.round(members.reduce((acc: number, m: any) => acc + (m.saturation || 0), 0) / members.length)
      : 0,
    [members]
  );

  // 事件处理函数
  const handleTotalTasksClick = useCallback(() => {
    handleStatsCardClick('总任务数', {
      total: totalTasks,
      breakdown: {
        completed: tasks.filter(t => t.status === 'completed').length,
        inProgress: tasks.filter(t => t.status === 'in_progress').length,
        pending: tasks.filter(t => t.status === 'pending').length
      },
      tasks: tasks.slice(0, 5)
    });
  }, [totalTasks, tasks, handleStatsCardClick]);

  const handleInProgressProjectsClick = useCallback(() => {
    handleStatsCardClick('进行中项目', {
      total: inProgressProjects,
      projects: projects.filter(p => p.status === 'in_progress').slice(0, 5)
    });
  }, [inProgressProjects, projects, handleStatsCardClick]);

  const handleTeamMembersClick = useCallback(() => {
    handleStatsCardClick('团队成员', {
      total: members.length,
      breakdown: {
        engineers: members.filter(m => m.role === 'engineer').length,
        techManagers: members.filter(m => m.role === 'tech_manager').length,
        departmentManagers: members.filter(m => m.role === 'department_manager').length,
        admins: members.filter(m => m.role === 'admin').length
      },
      members: members.slice(0, 5)
    });
  }, [members, handleStatsCardClick]);

  const handleAvgSaturationClick = useCallback(() => {
    handleStatsCardClick('平均饱和度', {
      average: avgSaturation,
      breakdown: members
        .map(m => ({ name: m.name, saturation: m.saturation || 0 }))
        .sort((a, b) => b.saturation - a.saturation)
    });
  }, [avgSaturation, members, handleStatsCardClick]);

  const handleMarkAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const handleClearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // 渲染内容
  const renderContent = () => {
    if (!canAccessCurrentView) {
      return <NoPermissionView user={user} />;
    }

    switch (currentView) {
      case 'dashboard':
        // 工程师显示专属仪表盘
        if (user?.role === 'engineer') {
          const member = members.find(m => m.id === user.id);
          return member ? (
            <Suspense fallback={<ComponentLoader />}>
              <EngineerDashboard
                member={member}
                projects={projects}
                allTasks={tasks}
                onNavigateToTask={() => setCurrentView('task-management')}
              />
            </Suspense>
          ) : null;
        }
        // 管理员仪表盘
        return (
          <div className="space-y-6 animate-fade-in">
            {user?.role === 'tech_manager' && <TaskAlerts tasks={tasks} members={members} />}
            <TaskStats tasks={tasks} />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard
                title="总任务数"
                value={totalTasks}
                change={12}
                changeLabel="较上周"
                icon={<CheckSquare className="w-6 h-6" />}
                accentColor="#60a5fa"
                delay={0}
                onClick={handleTotalTasksClick}
              />
              <StatsCard
                title="进行中项目"
                value={inProgressProjects}
                suffix="个"
                change={-5}
                changeLabel="较上周"
                icon={<FolderKanban className="w-6 h-6" />}
                accentColor="#4ade80"
                delay={100}
                onClick={handleInProgressProjectsClick}
              />
              <StatsCard
                title="团队成员"
                value={members.length}
                suffix="人"
                icon={<Users className="w-6 h-6" />}
                accentColor="#a78bfa"
                delay={200}
                onClick={handleTeamMembersClick}
              />
              <StatsCard
                title="平均饱和度"
                value={avgSaturation}
                suffix="%"
                change={8}
                changeLabel="较上周"
                icon={<TrendingUp className="w-6 h-6" />}
                accentColor="#fb923c"
                delay={300}
                onClick={handleAvgSaturationClick}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SaturationChart members={members} />
              <ProjectOverview projects={projects} members={members} />
            </div>
          </div>
        );

      case 'projects':
        return (isAdmin || canAccessDataScope(user, 'department')) ? (
          <Suspense fallback={<ComponentLoader />}><ProjectManager /></Suspense>
        ) : <NoPermissionView user={user} />;

      case 'task-assignment':
        return canPerformTaskOperation(user, 'create') ? (
          <Suspense fallback={<ComponentLoader />}><SmartAssignment members={members} /></Suspense>
        ) : <NoPermissionView user={user} />;

      case 'task-management':
        return (
          <Suspense fallback={<ComponentLoader />}>
            <TaskManagement members={members} projects={projects} tasks={tasks} />
          </Suspense>
        );

      case 'settings':
      case 'settings-profile':
      case 'settings-holidays':
      case 'settings-task-types':
      case 'settings-permissions':
      case 'settings-organization':
      case 'settings-logs':
        return (
          <Suspense fallback={<ComponentLoader />}>
            <SettingsPage initialSection={currentView} />
          </Suspense>
        );

      case 'design-system':
        return (
          <Suspense fallback={<ComponentLoader />}>
            <DesignSystemDemo />
          </Suspense>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 侧边栏 */}
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        accessibleViews={accessibleViews}
      />

      {/* 顶部导航 */}
      <Header
        title={currentViewTitle}
        notifications={notifications}
        onMarkAllRead={handleMarkAllRead}
        onClearNotifications={handleClearNotifications}
        sidebarCollapsed={sidebarCollapsed}
        onLogout={logout}
      />

      {/* 主内容区 */}
      <main className={`mt-16 min-h-[calc(100vh-4rem)] transition-all duration-300 ${sidebarCollapsed ? 'pl-16' : 'pl-64'}`}>
        <div className="p-6">
          {isLoading ? (
            <ProjectListSkeleton count={5} animated={true} />
          ) : (
            renderContent()
          )}
        </div>
      </main>

      {/* 版本冲突对话框 */}
      {conflict && (
        <VersionConflictDialog
          open={conflictOpen}
          onClose={closeConflictDialog}
          conflict={conflict}
          onResolve={handleConflictResolve}
        />
      )}

      {/* 统计详情对话框 */}
      <StatsDetailDialog
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
        statsData={selectedStatsCard}
      />
    </div>
  );
}

/** 应用内容组件 */
function AppContent() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <ProtectedApp />;
}

/** 应用入口 */
function App() {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('[App] 全局错误:', error);
        console.error('[App] 组件堆栈:', errorInfo.componentStack);
      }}
    >
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
