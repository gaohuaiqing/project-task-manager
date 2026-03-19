/**
 * 设置页面
 */
import { Routes, Route } from 'react-router-dom';
import { ProfileSettings } from './pages/Profile';
import { UsersSettings } from './pages/Users';
import { PermissionsSettings } from './pages/Permissions';
import { OrganizationSettings } from './pages/Organization';
import { SystemConfigSettings } from './pages/SystemConfig';

export default function SettingsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">系统设置</h1>
        <p className="text-muted-foreground">管理系统配置和用户权限</p>
      </div>

      <Routes>
        <Route index element={<ProfileSettings />} />
        <Route path="profile" element={<ProfileSettings />} />
        <Route path="users" element={<UsersSettings />} />
        <Route path="permissions" element={<PermissionsSettings />} />
        <Route path="organization" element={<OrganizationSettings />} />
        <Route path="system" element={<SystemConfigSettings />} />
      </Routes>
    </div>
  );
}

// 导出子页面组件
export { ProfileSettings } from './pages/Profile';
export { UsersSettings } from './pages/Users';
export { PermissionsSettings } from './pages/Permissions';
export { OrganizationSettings } from './pages/Organization';
export { SystemConfigSettings } from './pages/SystemConfig';
