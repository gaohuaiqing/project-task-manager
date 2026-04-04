/**
 * 设置页面 - 8个Tab导航
 * 根据用户角色动态显示/隐藏Tab
 */
import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/features/auth';
import { ProfileSettings } from './pages/Profile';
import { UsersSettings } from './pages/Users';
import { PermissionsSettings } from './pages/Permissions';
import { OrganizationSettings } from './pages/Organization';
import { TaskTypesSettings } from './pages/TaskTypes';
import { CapabilityModelsSettings } from './pages/CapabilityModels';
import { HolidaysSettings } from './pages/Holidays';
import { AuditLogsSettings } from './pages/AuditLogs';

// Tab配置
const ALL_TABS = [
  { value: 'profile', label: '个人资料', path: '/settings/profile' },
  { value: 'users', label: '用户管理', path: '/settings/users' },
  { value: 'organization', label: '组织管理', path: '/settings/organization' },
  { value: 'permissions', label: '权限管理', path: '/settings/permissions' },
  { value: 'task-types', label: '任务类型', path: '/settings/task-types' },
  { value: 'capability-models', label: '能力模型', path: '/settings/capability-models' },
  { value: 'holidays', label: '节假日', path: '/settings/holidays' },
  { value: 'audit-logs', label: '系统日志', path: '/settings/audit-logs' },
] as const;

// 角色可见性配置（根据需求文档 REQ_01 L187-198）
const TAB_VISIBILITY: Record<string, string[]> = {
  'profile': ['admin', 'dept_manager', 'tech_manager', 'engineer'],
  'users': ['admin'],
  'organization': ['admin', 'dept_manager'],
  'permissions': ['admin'],
  'task-types': ['admin', 'dept_manager'],
  'capability-models': ['admin', 'dept_manager'],
  'holidays': ['admin', 'dept_manager'],
  'audit-logs': ['admin', 'dept_manager'],
};

export default function SettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // 根据用户角色过滤可见的Tab
  const visibleTabs = useMemo(() => {
    if (!user?.role) return ALL_TABS.filter(t => t.value === 'profile');

    return ALL_TABS.filter(tab => {
      const allowedRoles = TAB_VISIBILITY[tab.value] || [];
      return allowedRoles.includes(user.role);
    });
  }, [user?.role]);

  // 根据URL路径确定当前Tab
  const getCurrentTab = () => {
    const path = location.pathname;
    const tab = visibleTabs.find((t) => path.endsWith(t.value));
    return tab?.value || 'profile';
  };

  const [activeTab, setActiveTab] = useState(getCurrentTab());

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const tab = visibleTabs.find((t) => t.value === value);
    if (tab) {
      navigate(tab.path);
    }
  };

  // 动态计算 TabList 的 grid 列数
  const gridCols = useMemo(() => {
    const count = visibleTabs.length;
    if (count <= 4) return `grid-cols-${count}`;
    if (count <= 6) return 'grid-cols-3 lg:grid-cols-6';
    return 'grid-cols-4 lg:grid-cols-8';
  }, [visibleTabs.length]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold">系统设置</h1>
        <p className="text-muted-foreground">管理系统配置和用户权限</p>
      </div>

      {/* Tab导航 */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className={`grid ${gridCols} w-full`}>
          {visibleTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* 只渲染当前激活的Tab，避免不必要的组件渲染 */}
        {activeTab === 'profile' && visibleTabs.some(t => t.value === 'profile') && (
          <TabsContent value="profile">
            <ProfileSettings />
          </TabsContent>
        )}

        {activeTab === 'users' && visibleTabs.some(t => t.value === 'users') && (
          <TabsContent value="users">
            <UsersSettings />
          </TabsContent>
        )}

        {activeTab === 'organization' && visibleTabs.some(t => t.value === 'organization') && (
          <TabsContent value="organization">
            <OrganizationSettings />
          </TabsContent>
        )}

        {activeTab === 'permissions' && visibleTabs.some(t => t.value === 'permissions') && (
          <TabsContent value="permissions">
            <PermissionsSettings />
          </TabsContent>
        )}

        {activeTab === 'task-types' && visibleTabs.some(t => t.value === 'task-types') && (
          <TabsContent value="task-types">
            <TaskTypesSettings />
          </TabsContent>
        )}

        {activeTab === 'capability-models' && visibleTabs.some(t => t.value === 'capability-models') && (
          <TabsContent value="capability-models">
            <CapabilityModelsSettings />
          </TabsContent>
        )}

        {activeTab === 'holidays' && visibleTabs.some(t => t.value === 'holidays') && (
          <TabsContent value="holidays">
            <HolidaysSettings />
          </TabsContent>
        )}

        {activeTab === 'audit-logs' && visibleTabs.some(t => t.value === 'audit-logs') && (
          <TabsContent value="audit-logs">
            <AuditLogsSettings />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

// 导出子页面组件
export { ProfileSettings } from './pages/Profile';
export { UsersSettings } from './pages/Users';
export { PermissionsSettings } from './pages/Permissions';
export { OrganizationSettings } from './pages/Organization';
export { TaskTypesSettings } from './pages/TaskTypes';
export { CapabilityModelsSettings } from './pages/CapabilityModels';
export { HolidaysSettings } from './pages/Holidays';
export { AuditLogsSettings } from './pages/AuditLogs';
