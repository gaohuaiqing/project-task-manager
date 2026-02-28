import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import React from 'react';

// 立即输出调试信息
console.log('[App.tsx] 文件已加载');
console.log('[App.tsx] 当前时间:', new Date().toISOString());

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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { CheckSquare, FolderKanban, Users, TrendingUp, FileText, Calendar, Tag, Shield, RefreshCw } from 'lucide-react';
import { mySqlDataService } from '@/services/MySqlDataService';
import { dataService } from '@/services/DataService';
import { VersionConflictDialog, useVersionConflict } from '@/components/shared/VersionConflictDialog';
import type { Notification } from '@/types';
import { canAccessDataScope, canPerformTaskOperation, canPerformUserManagement, canPerformProjectOperation, canAccessOrganization, ROLE_CONFIG } from '@/types/auth';

// 代码分割：使用 React.lazy 懒加载大型组件
const ProjectManager = lazy(() => import('@/components/projects/ProjectManager').then(m => ({ default: m.ProjectManager })));
const SmartAssignment = lazy(() => import('@/components/task-assignment/SmartAssignment').then(m => ({ default: m.SmartAssignment })));
const TaskManagement = lazy(() => import('@/components/task-management/TaskManagement').then(m => ({ default: m.TaskManagement })));
const SettingsPage = lazy(() => import('@/components/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
const EngineerDashboard = lazy(() => import('@/components/dashboard/EngineerDashboard').then(m => ({ default: m.EngineerDashboard })));

// 组件预加载映射
const componentPreloaders: Record<string, () => Promise<void>> = {
  'projects': () => import('@/components/projects/ProjectManager'),
  'task-assignment': () => import('@/components/task-assignment/SmartAssignment'),
  'task-management': () => import('@/components/task-management/TaskManagement'),
  'settings': () => import('@/components/settings/SettingsPage'),
  'settings-profile': () => import('@/components/settings/SettingsPage'),
  'settings-holidays': () => import('@/components/settings/SettingsPage'),
  'settings-task-types': () => import('@/components/settings/SettingsPage'),
  'settings-permissions': () => import('@/components/settings/SettingsPage'),
  'settings-organization': () => import('@/components/settings/SettingsPage'),
  'settings-logs': () => import('@/components/settings/SettingsPage'),
  'dashboard': () => import('@/components/dashboard/EngineerDashboard'),
};

// 预加载组件函数
const preloadComponent = (viewName: string) => {
  const preloader = componentPreloaders[viewName];
  if (preloader) {
    console.log(`[App] 预加载组件: ${viewName}`);
    preloader().catch(err => console.warn(`[App] 预加载失败: ${viewName}`, err));
  }
};

// 加载状态组件
const ComponentLoader = () => (
  <div className="flex items-center justify-center min-h-[40vh]">
    <div className="text-center space-y-4">
      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
      <p className="text-sm text-muted-foreground">加载中...</p>
    </div>
  </div>
);

// 无权限提示组件（移到组件外部，避免每次重新创建）
const NoPermissionView = React.memo(({ user }: { user?: any }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
    <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center mb-4">
      <Shield className="w-10 h-10 text-slate-500" />
    </div>
    <h3 className="text-xl font-semibold text-white mb-2">无访问权限</h3>
    <p className="text-slate-400 max-w-md">
      您当前的身份（{user ? ROLE_CONFIG[user.role].label : '未知'}）没有权限访问此页面。
      请联系管理员获取相应权限。
    </p>
  </div>
));

// 受保护的应用内容组件
function ProtectedApp() {
  const { user, isAdmin, logout } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pageTitle, setPageTitle] = useState('仪表盘');
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedStatsCard, setSelectedStatsCard] = useState<{
    title: string;
    data: any;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // 数据状态（初始为空数组，通过MySQL服务加载）
  const [dynamicMembers, setDynamicMembers] = useState<any[]>([]);
  const [dynamicProjects, setDynamicProjects] = useState<any[]>([]);
  const [wbsTasks, setWbsTasks] = useState<any[]>([]);

  // 版本冲突处理
  const { open: conflictOpen, conflict, closeDialog: closeConflictDialog } = useVersionConflict();

  // 初始化数据加载 - 防止内存泄漏
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setIsLoading(true);
        console.log('[App] 从MySQL加载数据...');

        // 直接从MySQL专门表加载（统一数据源）
        const [projects, members, tasks] = await Promise.all([
          mySqlDataService.getProjects(),
          mySqlDataService.getMembers(),
          mySqlDataService.getWbsTasks()
        ]);

        // 只在组件仍然挂载时更新状态
        if (isMounted) {
          setDynamicMembers(members);
          setDynamicProjects(projects);
          setWbsTasks(tasks);
          setLastUpdate(new Date());

          console.log('[App] 数据加载完成:', {
            members: members.length,
            projects: projects.length,
            tasks: tasks.length
          });

          // 派发组织架构加载完成事件，通知其他组件
          if (members.length > 0) {
            console.log('[App] 派发 organization-changed 事件');
            window.dispatchEvent(new CustomEvent('organization-changed', {
              detail: { members, source: 'initial-load' }
            }));
          }
        }
      } catch (error) {
        console.error('[App] 数据加载失败:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    // 清理函数：防止组件卸载后更新状态
    return () => {
      isMounted = false;
    };
  }, []); // 仅在组件挂载时加载一次

  // 监听数据变更事件（来自ProjectManager等组件） - 静默刷新，不显示加载状态
  useEffect(() => {
    const handleDataChanged = async (event: CustomEvent) => {
      const { type, source } = event.detail;
      console.log('[App] 收到数据变更事件:', type, '来源:', source);

      try {
        // 根据数据类型刷新相应数据（静默刷新，不显示加载状态）
        if (type === 'projects' || type === 'all') {
          const projects = await mySqlDataService.getProjects();
          setDynamicProjects(projects);
          console.log('[App] 已刷新项目数据，数量:', projects.length);
        }
        if (type === 'members' || type === 'all') {
          const members = await mySqlDataService.getMembers();
          setDynamicMembers(members);
          console.log('[App] 派发 organization-changed 事件（数据刷新）');
          window.dispatchEvent(new CustomEvent('organization-changed', {
            detail: { members, source: 'data-refresh' }
          }));
        }
        if (type === 'tasks' || type === 'all') {
          const tasks = await mySqlDataService.getWbsTasks();
          setWbsTasks(tasks);
        }
        setLastUpdate(new Date());
      } catch (error) {
        console.error('[App] 刷新数据失败:', error);
      }
    };

    // 添加事件监听器
    window.addEventListener('data-changed', handleDataChanged as EventListener);

    // 清理函数
    return () => {
      window.removeEventListener('data-changed', handleDataChanged as EventListener);
    };
  }, []);

  // 监听实时数据更新（WebSocket推送）
  useEffect(() => {
    const unsubscribeMembers = mySqlDataService.on('members', ({ operation, record }) => {
      console.log('[App] 收到成员更新:', operation, record);
      setDynamicMembers(prev => {
        switch (operation) {
          case 'create':
            return [...prev, record];
          case 'update':
            return prev.map(m => m.id === record.id ? record : m);
          case 'delete':
            return prev.filter(m => m.id !== record.id);
          default:
            return prev;
        }
      });
      setLastUpdate(new Date());
    });

    const unsubscribeProjects = mySqlDataService.on('projects', ({ operation, record }) => {
      console.log('[App] 收到项目更新:', operation, record);
      setDynamicProjects(prev => {
        switch (operation) {
          case 'create':
            return [...prev, record];
          case 'update':
            return prev.map(p => p.id === record.id ? record : p);
          case 'delete':
            return prev.filter(p => p.id !== record.id);
          default:
            return prev;
        }
      });
      setLastUpdate(new Date());
    });

    const unsubscribeTasks = mySqlDataService.on('wbs_tasks', ({ operation, record }) => {
      console.log('[App] 收到任务更新:', operation, record);
      setWbsTasks(prev => {
        switch (operation) {
          case 'create':
            return [...prev, record];
          case 'update':
            return prev.map(t => t.id === record.id ? record : t);
          case 'delete':
            return prev.filter(t => t.id !== record.id);
          default:
            return prev;
        }
      });
      setLastUpdate(new Date());
    });

    return () => {
      unsubscribeMembers();
      unsubscribeProjects();
      unsubscribeTasks();
    };
  }, []);

  // 手动刷新数据
  const handleManualRefresh = useCallback(async () => {
    try {
      setIsLoading(true);
      await mySqlDataService.refreshAll();

      const [members, projects, tasks] = await Promise.all([
        mySqlDataService.getMembers(),
        mySqlDataService.getProjects(),
        mySqlDataService.getWbsTasks()
      ]);

      setDynamicMembers(members);
      setDynamicProjects(projects);
      setWbsTasks(tasks);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('[App] 刷新数据失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 处理版本冲突解决
  const handleConflictResolve = useCallback(async (
    resolution: 'use_server' | 'use_local' | 'merge',
    mergedData?: any
  ) => {
    if (!conflict) return;

    console.log('[App] 解决版本冲突:', resolution, conflict);

    // 根据解决方案重新加载数据
    await handleManualRefresh();
  }, [conflict, handleManualRefresh]);

  // 计算统计数据（使用useMemo缓存）
  const totalTasks = useMemo(() => wbsTasks.length, [wbsTasks]);
  const inProgressProjects = useMemo(() => {
    return dynamicProjects.filter((p: any) => p.status === 'in_progress').length;
  }, [dynamicProjects]);
  const avgSaturation = useMemo(() => {
    if (dynamicMembers.length === 0) return 0;
    const totalSaturation = dynamicMembers.reduce((acc: number, m: any) => acc + (m.saturation || 0), 0);
    return Math.round(totalSaturation / dynamicMembers.length);
  }, [dynamicMembers]);



  // 根据用户角色过滤可访问的视图（使用useMemo缓存）
  const accessibleViews = useMemo(() => {
    // 管理员可以访问所有视图
    if (isAdmin) {
      return [
        'dashboard',
        'task-management',
        'projects',
        'task-assignment',
        'settings',
        'settings-profile',
        'settings-holidays',
        'settings-task-types',
        'settings-permissions',
        'settings-organization',
        'settings-logs'
      ];
    }
    
    if (!user) return ['dashboard'];
    const views = ['dashboard'];
    
    // 仪表盘：所有角色都可以访问
    views.push('dashboard');
    
    // 任务管理：所有角色都可以访问（但数据范围不同）
    views.push('task-management');
    
    // 设置：所有角色都可以访问个人信息
    views.push('settings');
    views.push('settings-profile');
    
    // 项目管理：工程师完全隐藏，部门经理及以上可以访问
    if (user.role !== 'engineer' && canAccessDataScope(user, 'department')) {
      views.push('projects');
    }
    
    // 智能任务分配：需要任务创建权限（技术经理及以上）
    if (canPerformTaskOperation(user, 'create')) {
      views.push('task-assignment');
    }
    
    // 高级设置：根据权限控制
    if (canPerformUserManagement(user, 'assign_role')) {
      // 管理员可以访问所有高级设置
      views.push('settings-holidays');
      views.push('settings-task-types');
      views.push('settings-permissions');
      views.push('settings-logs');
    } else if (canAccessDataScope(user, 'department')) {
      // 部门经理可以访问节假日和任务类型设置
      views.push('settings-holidays');
      views.push('settings-task-types');
    } else if (user.role === 'tech_manager') {
      // 技术经理可以访问节假日和任务类型设置
      views.push('settings-holidays');
      views.push('settings-task-types');
    }

    // 组织及人员设置：工程师不可见，技术经理及以上可以访问
    if (canAccessOrganization(user)) {
      views.push('settings-organization');
    }

    return views;
  }, [user]);

  // 如果当前视图不可访问，切换到dashboard
  useEffect(() => {
    if (!accessibleViews.includes(currentView)) {
      setCurrentView('dashboard');
    }
  }, [user, accessibleViews, currentView]);

  useEffect(() => {
    const titles: Record<string, string> = {
      'dashboard': '仪表盘',
      'projects': '项目管理',
      'task-assignment': '任务分配',
      'task-management': '任务管理',
      'settings': '系统维护',
      'settings-profile': '个人信息',
      'settings-holidays': '节假日设置',
      'settings-task-types': '任务类型设置',
      'settings-permissions': '权限配置',
      'settings-organization': '组织及人员设置',
      'settings-logs': '事件日志'
    };
    setPageTitle(titles[currentView] || '仪表盘');
  }, [currentView]);

  // 组件预加载：当用户在当前视图时，预加载其他常用视图
  useEffect(() => {
    // 定义常用视图的预加载优先级
    const preloadMap: Record<string, string[]> = {
      'dashboard': ['task-management', 'projects'],
      'projects': ['task-management', 'task-assignment'],
      'task-management': ['projects', 'dashboard'],
      'task-assignment': ['projects', 'task-management'],
      'settings': ['settings-organization', 'settings-permissions'],
      'settings-profile': ['settings-organization'],
    };

    const viewsToPreload = preloadMap[currentView] || [];

    // 延迟预加载，避免影响当前视图的渲染
    const timer = setTimeout(() => {
      viewsToPreload.forEach(view => {
        // 只预加载用户有权限访问的视图
        if (accessibleViews.includes(view)) {
          preloadComponent(view);
        }
      });
    }, 500); // 500ms 延迟

    return () => clearTimeout(timer);
  }, [currentView, accessibleViews]);



  // 事件处理函数（使用useCallback缓存）
  const handleStatsCardClick = useCallback((title: string, data: any) => {
    setSelectedStatsCard({ title, data });
    setIsDetailDialogOpen(true);
  }, []);

  const handleTotalTasksClick = useCallback(() => {
    handleStatsCardClick('总任务数', {
      total: totalTasks,
      breakdown: {
        completed: wbsTasks.filter(t => t.status === 'completed').length,
        inProgress: wbsTasks.filter(t => t.status === 'in_progress').length,
        pending: wbsTasks.filter(t => t.status === 'pending').length
      },
      tasks: wbsTasks.slice(0, 5) // 显示前5个任务
    });
  }, [totalTasks, wbsTasks, handleStatsCardClick]);

  const handleInProgressProjectsClick = useCallback(() => {
    handleStatsCardClick('进行中项目', {
      total: inProgressProjects,
      projects: dynamicProjects.filter(p => p.status === 'in_progress').slice(0, 5)
    });
  }, [inProgressProjects, dynamicProjects, handleStatsCardClick]);

  const handleTeamMembersClick = useCallback(() => {
    handleStatsCardClick('团队成员', {
      total: dynamicMembers.length,
      breakdown: {
        engineers: dynamicMembers.filter(m => m.role === 'engineer').length,
        techManagers: dynamicMembers.filter(m => m.role === 'tech_manager').length,
        departmentManagers: dynamicMembers.filter(m => m.role === 'department_manager').length,
        admins: dynamicMembers.filter(m => m.role === 'admin').length
      },
      members: dynamicMembers.slice(0, 5)
    });
  }, [dynamicMembers, handleStatsCardClick]);

  const handleAvgSaturationClick = useCallback(() => {
    handleStatsCardClick('平均饱和度', {
      average: avgSaturation,
      breakdown: dynamicMembers.map(m => ({
        name: m.name,
        saturation: m.saturation || 0
      })).sort((a, b) => b.saturation - a.saturation)
    });
  }, [avgSaturation, dynamicMembers, handleStatsCardClick]);

  const handleMarkAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const handleClearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // 渲染内容函数（使用useCallback缓存） - 添加Suspense支持懒加载
  const renderContent = useCallback(() => {
    // 检查是否有权限访问当前视图
    if (!accessibleViews.includes(currentView)) {
      return <NoPermissionView />;
    }

    switch (currentView) {
      case 'dashboard':
        if (user?.role === 'engineer') {
          const member = dynamicMembers.find(m => m.id === user.id);
          return member ? (
            <Suspense fallback={<ComponentLoader />}>
              <EngineerDashboard
                member={member}
                projects={dynamicProjects}
                allTasks={wbsTasks}
                onNavigateToTask={(taskId) => {
                  setCurrentView('task-management');
                }}
              />
            </Suspense>
          ) : null;
        }
        return (
          <div className="space-y-6 animate-fade-in">
            {/* 任务提醒 - 仅技术经理可见 */}
            {user?.role === 'tech_manager' && (
              <TaskAlerts tasks={wbsTasks} members={dynamicMembers} />
            )}

            {/* 任务统计 - 放在最上方 */}
            <TaskStats tasks={wbsTasks} />

            {/* 关键指标卡片 */}
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
                value={dynamicMembers.length}
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

            {/* 饱和度图表和项目概览 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SaturationChart members={dynamicMembers} />
              <ProjectOverview projects={dynamicProjects} members={dynamicMembers} />
            </div>
          </div>
        );

      case 'projects':
        return (isAdmin || canAccessDataScope(user, 'department')) ? (
          <Suspense fallback={<ComponentLoader />}>
            <ProjectManager />
          </Suspense>
        ) : <NoPermissionView />;

      case 'task-assignment':
        return canPerformTaskOperation(user, 'create') ? (
          <Suspense fallback={<ComponentLoader />}>
            <SmartAssignment members={dynamicMembers} />
          </Suspense>
        ) : <NoPermissionView />;

      case 'task-management':
        return (
          <Suspense fallback={<ComponentLoader />}>
            <TaskManagement members={dynamicMembers} projects={dynamicProjects} tasks={wbsTasks} />
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

      default:
        return null;
    }
  }, [accessibleViews, currentView, user, dynamicMembers, dynamicProjects, wbsTasks, totalTasks, inProgressProjects, avgSaturation, handleTotalTasksClick, handleInProgressProjectsClick, handleTeamMembersClick, handleAvgSaturationClick, isAdmin]);

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
        title={pageTitle}
        notifications={notifications}
        onMarkAllRead={handleMarkAllRead}
        onClearNotifications={handleClearNotifications}
        sidebarCollapsed={sidebarCollapsed}
        onLogout={logout}
      />

      {/* 主内容区 */}
      <main
        className={`
          pt-16 min-h-screen transition-all duration-300
          ${sidebarCollapsed ? 'pl-16' : 'pl-64'}
        `}
      >
        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mb-4"></div>
                <p className="text-muted-foreground">加载中...</p>
              </div>
            </div>
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

      {/* 统计卡片详情对话框 */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="bg-card/95 backdrop-blur-sm border-border max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              {selectedStatsCard?.title}详情
            </DialogTitle>
            <DialogClose className="text-muted-foreground hover:text-white" />
          </DialogHeader>
          {selectedStatsCard && (
            <div className="space-y-6 pt-4">
              {selectedStatsCard.title === '总任务数' && (
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-white">{selectedStatsCard.data.total}</p>
                    <p className="text-sm text-muted-foreground">总任务数</p>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-white">任务状态分布</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">已完成</span>
                        <span className="text-sm font-semibold text-white">{selectedStatsCard.data.breakdown?.completed ?? 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">进行中</span>
                        <span className="text-sm font-semibold text-white">{selectedStatsCard.data.breakdown?.inProgress ?? 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">待处理</span>
                        <span className="text-sm font-semibold text-white">{selectedStatsCard.data.breakdown?.pending ?? 0}</span>
                      </div>
                    </div>
                    {(selectedStatsCard.data.tasks?.length ?? 0) > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-sm font-medium text-white">最近任务</h3>
                        <div className="space-y-2">
                          {selectedStatsCard.data.tasks.map((task: any, index: number) => (
                            <div key={task.id} className="p-3 bg-secondary/30 rounded-lg">
                              <p className="text-sm font-medium text-white truncate">{task.title}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                状态: {task.status === 'completed' ? '已完成' : task.status === 'in_progress' ? '进行中' : '待处理'}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedStatsCard.title === '进行中项目' && (
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-white">{selectedStatsCard.data.total}</p>
                    <p className="text-sm text-muted-foreground">进行中项目数</p>
                  </div>
                  {selectedStatsCard.data.projects.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-white">进行中项目</h3>
                      <div className="space-y-2">
                        {selectedStatsCard.data.projects.map((project: any, index: number) => (
                          <div key={project.id} className="p-3 bg-secondary/30 rounded-lg">
                            <p className="text-sm font-medium text-white truncate">{project.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              开始日期: {project.startDate} | 截止日期: {project.deadline}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selectedStatsCard.title === '团队成员' && (
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-white">{selectedStatsCard.data.total}</p>
                    <p className="text-sm text-muted-foreground">团队成员数</p>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-white">角色分布</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">工程师</span>
                        <span className="text-sm font-semibold text-white">{selectedStatsCard.data.breakdown?.engineers ?? 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">技术经理</span>
                        <span className="text-sm font-semibold text-white">{selectedStatsCard.data.breakdown?.techManagers ?? 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">部门经理</span>
                        <span className="text-sm font-semibold text-white">{selectedStatsCard.data.breakdown?.departmentManagers ?? 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">管理员</span>
                        <span className="text-sm font-semibold text-white">{selectedStatsCard.data.breakdown?.admins ?? 0}</span>
                      </div>
                    </div>
                    {selectedStatsCard.data.members && selectedStatsCard.data.members.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-sm font-medium text-white">团队成员</h3>
                        <div className="space-y-2">
                          {selectedStatsCard.data.members.map((member: any, index: number) => (
                            <div key={member.id} className="p-3 bg-secondary/30 rounded-lg">
                              <p className="text-sm font-medium text-white">{member.name}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                角色: {member.role === 'engineer' ? '工程师' : member.role === 'tech_manager' ? '技术经理' : member.role === 'department_manager' ? '部门经理' : '管理员'}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedStatsCard.title === '平均饱和度' && (
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-white">{selectedStatsCard.data.average}%</p>
                    <p className="text-sm text-muted-foreground">平均饱和度</p>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-white">成员饱和度</h3>
                    <div className="space-y-2">
                      {selectedStatsCard.data.breakdown?.map?.((member: any, index: number) => (
                        <div key={index} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">{member.name}</span>
                            <span className="text-sm font-semibold text-white">{member.saturation}%</span>
                          </div>
                          <div className="h-2 bg-secondary rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                              style={{ width: `${member.saturation}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 主应用组件
function AppContent() {
  const { isAuthenticated, user } = useAuth();

  console.log('[AppContent] 渲染, isAuthenticated:', isAuthenticated, 'user:', user);

  // 未登录显示登录页面
  if (!isAuthenticated) {
    console.log('[AppContent] 显示登录页面');
    return <LoginPage />;
  }

  // 已登录显示受保护的应用内容
  console.log('[AppContent] 显示受保护的应用');
  return <ProtectedApp />;
}

function App() {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('[App] 全局错误:', error);
        console.error('[App] 组件堆栈:', errorInfo.componentStack);

        // 发送错误到监控服务（可选）
        if (import.meta.env.PROD) {
          // 生产环境：发送到错误监控服务
          // sendErrorToMonitoring(error, errorInfo);
        }
      }}
    >
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
