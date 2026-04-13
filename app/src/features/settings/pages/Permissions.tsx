/**
 * 权限管理设置页面
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Shield, Check, X } from 'lucide-react';

type UserRole = 'admin' | 'tech_manager' | 'department_manager' | 'engineer';

interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
}

const roleLabels: Record<UserRole, string> = {
  admin: '管理员',
  tech_manager: '技术经理',
  department_manager: '部门经理',
  engineer: '工程师',
};

const roleColors: Record<UserRole, string> = {
  admin: 'bg-red-100 text-red-700',
  tech_manager: 'bg-purple-100 text-purple-700',
  department_manager: 'bg-blue-100 text-blue-700',
  engineer: 'bg-green-100 text-green-700',
};

// 模拟权限数据
const permissions: Permission[] = [
  { id: '1', name: '查看项目', description: '查看项目列表和详情', resource: 'project', action: 'read' },
  { id: '2', name: '创建项目', description: '创建新项目', resource: 'project', action: 'create' },
  { id: '3', name: '编辑项目', description: '编辑项目信息', resource: 'project', action: 'update' },
  { id: '4', name: '删除项目', description: '删除项目', resource: 'project', action: 'delete' },
  { id: '5', name: '查看任务', description: '查看任务列表和详情', resource: 'task', action: 'read' },
  { id: '6', name: '创建任务', description: '创建新任务', resource: 'task', action: 'create' },
  { id: '7', name: '编辑任务', description: '编辑任务信息', resource: 'task', action: 'update' },
  { id: '8', name: '删除任务', description: '删除任务', resource: 'task', action: 'delete' },
  { id: '9', name: '分配任务', description: '将任务分配给成员', resource: 'task', action: 'assign' },
  { id: '10', name: '管理成员', description: '管理团队成员', resource: 'member', action: 'manage' },
  { id: '11', name: '查看报表', description: '查看统计报表', resource: 'report', action: 'read' },
  { id: '12', name: '系统设置', description: '修改系统配置', resource: 'system', action: 'config' },
];

// 默认角色权限
const defaultRolePermissions: Record<UserRole, string[]> = {
  admin: permissions.map((p) => p.id),
  tech_manager: ['1', '2', '3', '5', '6', '7', '8', '9', '10', '11'],
  department_manager: ['1', '2', '3', '5', '6', '7', '9', '10', '11'],
  engineer: ['1', '5', '6', '7'],
};

export function PermissionsSettings() {
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');
  const [rolePermissions, setRolePermissions] = useState<Record<UserRole, string[]>>(defaultRolePermissions);

  const togglePermission = (permissionId: string) => {
    setRolePermissions((prev) => {
      const current = prev[selectedRole] || [];
      const updated = current.includes(permissionId)
        ? current.filter((id) => id !== permissionId)
        : [...current, permissionId];
      return { ...prev, [selectedRole]: updated };
    });
  };

  const handleSave = () => {
    console.log('Save permissions:', rolePermissions);
  };

  const groupedPermissions = permissions.reduce((acc, permission) => {
    const group = acc[permission.resource] || [];
    return {
      ...acc,
      [permission.resource]: [...group, permission],
    };
  }, {} as Record<string, Permission[]>);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            权限管理
          </CardTitle>
          <CardDescription>
            配置不同角色的权限范围
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* 角色选择 */}
          <div className="flex items-center gap-4 mb-6">
            <Label>选择角色</Label>
            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as UserRole)}>
              <SelectTrigger className="w-[200px]" data-testid="permissions-select-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(roleLabels) as UserRole[]).map((role) => (
                  <SelectItem key={role} value={role}>
                    <div className="flex items-center gap-2">
                      <Badge className={roleColors[role]}>
                        {roleLabels[role]}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator className="my-4" />

          {/* 权限列表 */}
          <div className="space-y-6">
            {Object.entries(groupedPermissions).map(([resource, perms]) => (
              <div key={resource}>
                <h4 className="text-sm font-medium mb-3 capitalize">
                  {resource === 'project' ? '项目' :
                   resource === 'task' ? '任务' :
                   resource === 'member' ? '成员' :
                   resource === 'report' ? '报表' :
                   resource === 'system' ? '系统' : resource}
                </h4>
                <div className="space-y-3">
                  {perms.map((permission) => {
                    const isEnabled = rolePermissions[selectedRole]?.includes(permission.id);
                    return (
                      <div
                        key={permission.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{permission.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {permission.description}
                          </p>
                        </div>
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={() => togglePermission(permission.id)}
                          disabled={selectedRole === 'admin'} // 管理员拥有所有权限
                          data-testid="permissions-checkbox-permission"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <Separator className="my-6" />

          {/* 保存按钮 */}
          <div className="flex justify-end">
            <Button onClick={handleSave} data-testid="permissions-btn-save">
              保存配置
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
