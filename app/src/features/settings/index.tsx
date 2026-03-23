/**
 * 设置页面 - 8个Tab导航
 */
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProfileSettings } from './pages/Profile';
import { UsersSettings } from './pages/Users';
import { PermissionsSettings } from './pages/Permissions';
import { OrganizationSettings } from './pages/Organization';
import { TaskTypesSettings } from './pages/TaskTypes';
import { CapabilityModelsSettings } from './pages/CapabilityModels';
import { HolidaysSettings } from './pages/Holidays';
import { AuditLogsSettings } from './pages/AuditLogs';

// Tab配置
const TABS = [
  { value: 'profile', label: '个人资料', path: '/settings/profile' },
  { value: 'users', label: '用户管理', path: '/settings/users' },
  { value: 'organization', label: '组织管理', path: '/settings/organization' },
  { value: 'permissions', label: '权限管理', path: '/settings/permissions' },
  { value: 'task-types', label: '任务类型', path: '/settings/task-types' },
  { value: 'capability-models', label: '能力模型', path: '/settings/capability-models' },
  { value: 'holidays', label: '节假日', path: '/settings/holidays' },
  { value: 'audit-logs', label: '系统日志', path: '/settings/audit-logs' },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // 根据URL路径确定当前Tab
  const getCurrentTab = () => {
    const path = location.pathname;
    const tab = TABS.find((t) => path.endsWith(t.value));
    return tab?.value || 'profile';
  };

  const [activeTab, setActiveTab] = useState(getCurrentTab());

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const tab = TABS.find((t) => t.value === value);
    if (tab) {
      navigate(tab.path);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold">系统设置</h1>
        <p className="text-muted-foreground">管理系统配置和用户权限</p>
      </div>

      {/* Tab导航 */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid grid-cols-4 lg:grid-cols-8 w-full">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="profile">
          <ProfileSettings />
        </TabsContent>

        <TabsContent value="users">
          <UsersSettings />
        </TabsContent>

        <TabsContent value="organization">
          <OrganizationSettings />
        </TabsContent>

        <TabsContent value="permissions">
          <PermissionsSettings />
        </TabsContent>

        <TabsContent value="task-types">
          <TaskTypesSettings />
        </TabsContent>

        <TabsContent value="capability-models">
          <CapabilityModelsSettings />
        </TabsContent>

        <TabsContent value="holidays">
          <HolidaysSettings />
        </TabsContent>

        <TabsContent value="audit-logs">
          <AuditLogsSettings />
        </TabsContent>
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
