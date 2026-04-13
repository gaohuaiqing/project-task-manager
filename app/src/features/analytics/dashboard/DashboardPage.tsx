/**
 * 仪表板主页面
 * 根据用户角色显示不同的仪表板视图
 *
 * @module analytics/dashboard/DashboardPage
 * @see REQ_07_INDEX.md §2 模块定位
 */

import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
// 使用新版本角色仪表板（支持 Mock 数据）
import { AdminDashboard, DeptManagerDashboard, TechManagerDashboard, EngineerDashboard } from './roles';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import type { AlertData, TodoTask } from './types';

export interface DashboardPageProps {
  /** 可选的项目ID筛选 */
  projectId?: string;
}

/**
 * 仪表板主页面
 * 自动根据用户角色渲染对应的仪表板
 */
export function DashboardPage({ projectId }: DashboardPageProps) {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  // 处理预警操作按钮点击（查看详情）
  const handleAlertActionClick = (alert: AlertData) => {
    if (alert.actionPath) {
      navigate(alert.actionPath);
    }
  };

  // 处理任务更新按钮点击（导航到任务管理页面并选中任务）
  const handleUpdateTask = (task: TodoTask) => {
    // 导航到任务管理页面，带上任务ID作为查询参数
    navigate(`/tasks?taskId=${task.id}&action=edit`);
  };

  // 如果正在加载，显示加载状态
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // 如果用户未登录，显示加载状态
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // 根据用户角色渲染对应的仪表板
  const role = user?.role;

  switch (role) {
    case 'admin':
      return (
        <div data-testid="dashboard-container">
          <AdminDashboard
            projectId={projectId}
            onAlertActionClick={handleAlertActionClick}
          />
        </div>
      );
    case 'dept_manager':
      return (
        <div data-testid="dashboard-container">
          <DeptManagerDashboard
            projectId={projectId}
            onAlertActionClick={handleAlertActionClick}
          />
        </div>
      );
    case 'tech_manager':
      return (
        <div data-testid="dashboard-container">
          <TechManagerDashboard
            projectId={projectId}
            onAlertActionClick={handleAlertActionClick}
          />
        </div>
      );
    case 'engineer':
    default:
      return (
        <div data-testid="dashboard-container">
          <EngineerDashboard
            projectId={projectId}
            onAlertActionClick={handleAlertActionClick}
            onUpdateTask={handleUpdateTask}
          />
        </div>
      );
  }
}

export default DashboardPage;
