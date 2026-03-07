/**
 * 应用权限管理 Hook
 *
 * 职责：
 * - 根据用户角色计算可访问视图
 * - 权限检查缓存
 * - 视图访问控制
 */

import { useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  canAccessDataScope,
  canPerformTaskOperation,
  canPerformUserManagement,
  canAccessOrganization,
  ROLE_CONFIG
} from '@/types/auth';

const VIEW_TITLES: Record<string, string> = {
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

/**
 * 获取用户可访问的视图列表
 */
function getAccessibleViews(user: any, isAdmin: boolean): string[] {
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

  // 所有角色都可以访问仪表盘和任务管理
  views.push('task-management');

  // 所有角色都可以访问个人信息设置
  views.push('settings', 'settings-profile');

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
    views.push('settings-holidays', 'settings-task-types', 'settings-permissions', 'settings-logs');
  } else if (canAccessDataScope(user, 'department')) {
    // 部门经理可以访问节假日和任务类型设置
    views.push('settings-holidays', 'settings-task-types');
  } else if (user.role === 'tech_manager') {
    // 技术经理可以访问节假日和任务类型设置
    views.push('settings-holidays', 'settings-task-types');
  }

  // 组织及人员设置：工程师不可见，技术经理及以上可以访问
  if (canAccessOrganization(user)) {
    views.push('settings-organization');
  }

  return views;
}

export function useAppPermissions(currentView: string, onViewChange?: (view: string) => void) {
  const { user, isAdmin } = useAuth();

  // 计算可访问视图
  const accessibleViews = useMemo(() => {
    return getAccessibleViews(user, isAdmin);
  }, [user, isAdmin]);

  // 获取当前视图标题
  const currentViewTitle = useMemo(() => {
    return VIEW_TITLES[currentView] || '仪表盘';
  }, [currentView]);

  // 检查当前视图是否可访问
  const canAccessCurrentView = useMemo(() => {
    return accessibleViews.includes(currentView);
  }, [accessibleViews, currentView]);

  // 如果当前视图不可访问，自动切换到 dashboard
  useEffect(() => {
    if (!canAccessCurrentView && onViewChange) {
      onViewChange('dashboard');
    }
  }, [canAccessCurrentView, onViewChange]);

  return {
    accessibleViews,
    currentViewTitle,
    canAccessCurrentView,
    user,
    isAdmin
  };
}
