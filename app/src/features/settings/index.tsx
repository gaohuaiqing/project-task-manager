import { Routes, Route } from 'react-router-dom';

function ProfilePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">个人设置</h1>
      <p className="text-muted-foreground">个人设置功能开发中...</p>
    </div>
  );
}

function UsersPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">用户管理</h1>
      <p className="text-muted-foreground">用户管理功能开发中...</p>
    </div>
  );
}

function PermissionsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">权限管理</h1>
      <p className="text-muted-foreground">权限管理功能开发中...</p>
    </div>
  );
}

function OrganizationPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">组织架构</h1>
      <p className="text-muted-foreground">组织架构功能开发中...</p>
    </div>
  );
}

function SystemConfigPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">系统配置</h1>
      <p className="text-muted-foreground">系统配置功能开发中...</p>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Routes>
      <Route index element={<ProfilePage />} />
      <Route path="profile" element={<ProfilePage />} />
      <Route path="users" element={<UsersPage />} />
      <Route path="permissions" element={<PermissionsPage />} />
      <Route path="organization" element={<OrganizationPage />} />
      <Route path="system" element={<SystemConfigPage />} />
    </Routes>
  );
}
