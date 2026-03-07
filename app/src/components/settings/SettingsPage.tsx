/**
 * 设置页面 - 优化版本
 *
 * 功能：
 * 1. 系统设置入口
 * 2. 子组件化拆分
 * 3. Hook 状态管理优化
 *
 * @module components/settings/SettingsPage
 */

import React from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { HolidayManagement } from './HolidayManagement';
import { PermissionManagement } from './PermissionManagement';
import { OrganizationSettings } from '../organization/OrganizationSettings';
import { SystemLogs } from './SystemLogs';
import { ProjectTypeManager } from './ProjectTypeManager';
import { useSettingsNavigation } from '@/hooks/useSettingsNavigation';
import { SettingsProfile } from './SettingsProfile';
import { TaskTypesManager } from './TaskTypesManager';
import { PermissionAlert } from './PermissionAlert';
import { PasswordChangeDialog } from './PasswordChangeDialog';
import { useAuth } from '@/contexts/AuthContext';
import { canAccessOrganization } from '@/types/auth';

export interface SettingsPageProps {
  initialSection?: string;
}

export function SettingsPage({ initialSection = 'settings' }: SettingsPageProps) {
  const {
    user,
    isAdmin,
    updateUserProfile,
    changePassword,
  } = useAuth();

  const { currentSection } = useSettingsNavigation({ initialSection });

  // 密码对话框状态
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = React.useState(false);

  // 任务类型状态
  const [taskTypes, setTaskTypes] = React.useState<Array<{
    value: string;
    label: string;
    color: string;
  }>>([]);

  /**
   * 渲染当前区域内容
   */
  const renderContent = () => {
    switch (currentSection) {
      case 'profile':
        return (
          <SettingsProfile
            key="profile-view"
            user={user}
            isAdmin={isAdmin}
            onUpdateName={(name) => updateUserProfile({ name })}
            onChangePassword={() => setIsPasswordDialogOpen(true)}
          />
        );

      case 'holidays':
        return (
          <div key="holidays-view" className="h-full">
            <HolidayManagement />
          </div>
        );

      case 'task-types':
        return (
          <TaskTypesManager
            key="task-types-view"
            taskTypes={taskTypes}
            onChange={setTaskTypes}
          />
        );

      case 'permissions':
        return (
          <div key="permissions-view" className="h-full">
            {isAdmin ? (
              <PermissionManagement />
            ) : (
              <PermissionAlert message="权限不足，只有管理员可以访问权限配置模块" />
            )}
          </div>
        );

      case 'organization':
        return (
          <div key="organization-view" className="h-full">
            {canAccessOrganization(user) ? (
              <ErrorBoundary
                onError={(error, errorInfo) => {
                  console.error('[SettingsPage] 组织架构错误:', error);
                  console.error('[SettingsPage] 组件堆栈:', errorInfo.componentStack);
                }}
              >
                <OrganizationSettings />
              </ErrorBoundary>
            ) : (
              <PermissionAlert message="权限不足，无法访问组织及人员设置" />
            )}
          </div>
        );

      case 'logs':
        return (
          <div key="logs-view" className="h-full">
            {isAdmin ? (
              <ErrorBoundary
                onError={(error, errorInfo) => {
                  console.error('[SettingsPage] 事件日志错误:', error);
                  console.error('[SettingsPage] 组件堆栈:', errorInfo.componentStack);
                }}
              >
                <SystemLogs />
              </ErrorBoundary>
            ) : (
              <PermissionAlert message="权限不足，无法访问事件日志" />
            )}
          </div>
        );

      case 'project-types':
        return (
          <div key="project-types-view" className="h-full">
            {isAdmin ? (
              <ErrorBoundary
                onError={(error, errorInfo) => {
                  console.error('[SettingsPage] 项目类型管理错误:', error);
                  console.error('[SettingsPage] 组件堆栈:', errorInfo.componentStack);
                }}
              >
                <ProjectTypeManager />
              </ErrorBoundary>
            ) : (
              <PermissionAlert message="权限不足，只有管理员可以管理项目类型" />
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {/* 内容区域 */}
      <div className="flex-1 overflow-auto transition-opacity duration-300 ease-in-out">
        {renderContent()}
      </div>

      {/* 修改密码对话框 */}
      <PasswordChangeDialog
        isOpen={isPasswordDialogOpen}
        onClose={() => setIsPasswordDialogOpen(false)}
        title={isAdmin ? '修改管理员密码' : '修改密码'}
        changePassword={changePassword}
      />
    </>
  );
}

// 使用 React.memo 优化组件渲染
export default React.memo(SettingsPage, (prevProps, nextProps) => {
  return prevProps.initialSection === nextProps.initialSection;
});
