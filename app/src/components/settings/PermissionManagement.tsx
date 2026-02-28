/**
 * 权限配置管理组件（重构版）
 * 使用拆分的子组件，移除 localStorage 依赖
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Plus, Save, AlertCircle, Check, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole, OperationPermission, PermissionLevel, PermissionConfigItem, PermissionConfig, PermissionHistoryRecord } from '@/types/auth';
import { apiService } from '@/services/ApiService';
import { PermissionBulkSettings } from './permission/PermissionBulkSettings';
import { PermissionHistoryDialog } from './permission/PermissionHistoryDialog';
import { PermissionImportExport } from './permission/PermissionImportExport';
import { PermissionConfigEditor } from './permission/PermissionConfigEditor';
import { useDialog } from '@/hooks/useDialog';

// 默认权限配置项（与原组件保持一致）
const defaultPermissionItems: PermissionConfigItem[] = [
  {
    id: 'manage_users',
    name: '用户管理',
    description: '管理系统用户，包括创建、编辑、删除用户',
    module: '用户管理',
    permission: 'manage_users',
    defaultLevels: {
      admin: 'full',
      tech_manager: 'none',
      dept_manager: 'none',
      engineer: 'none'
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'assign_user_role',
    name: '分配角色',
    description: '为用户分配角色权限',
    module: '用户管理',
    permission: 'assign_user_role',
    defaultLevels: {
      admin: 'full',
      tech_manager: 'none',
      dept_manager: 'none',
      engineer: 'none'
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'reset_user_password',
    name: '重置密码',
    description: '重置用户密码',
    module: '用户管理',
    permission: 'reset_user_password',
    defaultLevels: {
      admin: 'full',
      tech_manager: 'none',
      dept_manager: 'none',
      engineer: 'none'
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'update_org_structure',
    name: '更新组织结构',
    description: '更新公司组织结构',
    module: '组织结构',
    permission: 'update_org_structure',
    defaultLevels: {
      admin: 'full',
      tech_manager: 'none',
      dept_manager: 'write',
      engineer: 'none'
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'create_project',
    name: '创建项目',
    description: '创建新的项目',
    module: '项目管理',
    permission: 'create_project',
    defaultLevels: {
      admin: 'full',
      tech_manager: 'none',
      dept_manager: 'write',
      engineer: 'none'
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'update_project',
    name: '更新项目',
    description: '更新项目信息',
    module: '项目管理',
    permission: 'update_project',
    defaultLevels: {
      admin: 'full',
      tech_manager: 'write',
      dept_manager: 'write',
      engineer: 'none'
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'delete_project',
    name: '删除项目',
    description: '删除项目',
    module: '项目管理',
    permission: 'delete_project',
    defaultLevels: {
      admin: 'full',
      tech_manager: 'none',
      dept_manager: 'write',
      engineer: 'none'
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'create_task',
    name: '创建任务',
    description: '创建新的任务',
    module: '任务管理',
    permission: 'create_task',
    defaultLevels: {
      admin: 'full',
      tech_manager: 'write',
      dept_manager: 'none',
      engineer: 'none'
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'edit_task',
    name: '编辑任务',
    description: '编辑任务信息',
    module: '任务管理',
    permission: 'edit_task',
    defaultLevels: {
      admin: 'full',
      tech_manager: 'write',
      dept_manager: 'none',
      engineer: 'none'
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'delete_task',
    name: '删除任务',
    description: '删除任务',
    module: '任务管理',
    permission: 'delete_task',
    defaultLevels: {
      admin: 'full',
      tech_manager: 'write',
      dept_manager: 'none',
      engineer: 'none'
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'approve_task_plan',
    name: '审批任务计划',
    description: '审批任务计划',
    module: '任务管理',
    permission: 'approve_task_plan',
    defaultLevels: {
      admin: 'full',
      tech_manager: 'write',
      dept_manager: 'none',
      engineer: 'none'
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'force_refresh_task_plan',
    name: '强制刷新任务计划',
    description: '强制刷新任务计划',
    module: '任务管理',
    permission: 'force_refresh_task_plan',
    defaultLevels: {
      admin: 'full',
      tech_manager: 'write',
      dept_manager: 'write',
      engineer: 'none'
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'manage_holidays',
    name: '假期管理',
    description: '管理系统假期设置',
    module: '系统设置',
    permission: 'manage_holidays',
    defaultLevels: {
      admin: 'full',
      tech_manager: 'none',
      dept_manager: 'none',
      engineer: 'none'
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'manage_task_types',
    name: '任务类型设置',
    description: '管理系统任务类型',
    module: '系统设置',
    permission: 'manage_task_types',
    defaultLevels: {
      admin: 'full',
      tech_manager: 'none',
      dept_manager: 'none',
      engineer: 'none'
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'manage_permissions',
    name: '权限配置',
    description: '管理系统权限配置',
    module: '系统设置',
    permission: 'manage_permissions',
    defaultLevels: {
      admin: 'full',
      tech_manager: 'none',
      dept_manager: 'none',
      engineer: 'none'
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
];

export function PermissionManagement() {
  const { user, isAdmin } = useAuth();
  const dialog = useDialog();

  const [permissionConfig, setPermissionConfig] = useState<PermissionConfig>({
    items: defaultPermissionItems,
    rolePermissions: {
      admin: {},
      tech_manager: {},
      dept_manager: {},
      engineer: {}
    },
    version: 1,
    lastUpdated: Date.now(),
    lastUpdatedBy: 'system'
  });
  const [history, setHistory] = useState<PermissionHistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');
  const [selectedModule, setSelectedModule] = useState('all');

  // 加载数据
  useEffect(() => {
    loadPermissionData();
  }, []);

  const loadPermissionData = async () => {
    setIsLoading(true);
    try {
      const [configResponse, historyResponse] = await Promise.all([
        apiService.getPermissionConfig(),
        apiService.getPermissionHistory()
      ]);
      setPermissionConfig(configResponse.data);
      setHistory(historyResponse.data);
    } catch (err) {
      setError('加载权限配置失败');
      console.error('Failed to load permission data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 保存配置
  const handleSaveConfig = async () => {
    if (!isAdmin) return;
    setIsSaving(true);
    try {
      const response = await apiService.savePermissionConfig(permissionConfig);
      if (response.success) {
        setPermissionConfig(response.data);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        const updatedHistory = await apiService.getPermissionHistory();
        setHistory(updatedHistory.data);
      }
    } catch (err) {
      setError('保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  // 更新角色权限
  const handleRolePermissionChange = (role: UserRole, permission: string, level: PermissionLevel) => {
    if (!isAdmin) return;
    setPermissionConfig(prev => ({
      ...prev,
      rolePermissions: {
        ...prev.rolePermissions,
        [role]: {
          ...prev.rolePermissions[role],
          [permission]: level
        }
      }
    }));
  };

  // 批量设置权限
  const handleBulkSetPermission = (role: UserRole, level: PermissionLevel) => {
    if (!isAdmin) return;
    const updatedRolePermissions: Record<string, Record<string, string>> = {
      ...permissionConfig.rolePermissions,
      [role]: {}
    };
    permissionConfig.items.forEach(item => {
      updatedRolePermissions[role][item.permission] = level;
    });
    setPermissionConfig(prev => ({
      ...prev,
      rolePermissions: updatedRolePermissions
    }));
  };

  // 删除权限项
  const handleDeleteItem = async (item: PermissionConfigItem) => {
    if (!isAdmin) return;
    const confirmed = await dialog.confirm(`确定要删除权限项 "${item.name}" 吗？`);
    if (!confirmed) return;

    setIsSaving(true);
    try {
      const response = await apiService.deletePermissionItem(item.id);
      if (response.success) {
        setPermissionConfig(response.data);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        const updatedHistory = await apiService.getPermissionHistory();
        setHistory(updatedHistory.data);
      }
    } catch (err) {
      setError('删除失败');
    } finally {
      setIsSaving(false);
    }
  };

  // 导入配置
  const handleImportConfig = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) return;
    const file = event.target.files?.[0];
    if (!file) return;

    setIsSaving(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const importedConfig = JSON.parse(e.target?.result as string);
        const response = await apiService.savePermissionConfig(importedConfig);
        if (response.success) {
          setPermissionConfig(response.data);
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 3000);
        }
      } catch (err) {
        setError('导入失败');
      } finally {
        setIsSaving(false);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  // 获取所有模块
  const modules = ['all', ...Array.from(new Set(permissionConfig.items.map(item => item.module)))];

  return (
    <Card className="bg-card border-border h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            权限配置管理
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
              onClick={() => {/* TODO: 实现历史对话框 */}}
            >
              历史记录
            </Button>
            <PermissionImportExport
              permissionConfig={permissionConfig}
              onImport={handleImportConfig}
            />
            <Button
              size="sm"
              className="bg-primary hover:bg-secondary text-white"
              onClick={() => {/* TODO: 实现添加对话框 */}}
            >
              <Plus className="w-4 h-4 mr-2" />
              添加权限
            </Button>
          </div>
        </div>
        <CardDescription className="text-slate-400">
          管理系统中各角色的权限配置，仅管理员可操作
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 加载状态 */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
            <span className="ml-2 text-slate-400">加载权限配置中...</span>
          </div>
        )}

        {/* 状态提示 */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-200 p-3 rounded">
            <AlertCircle className="h-4 w-4 inline mr-2" />
            {error}
          </div>
        )}
        {saveSuccess && (
          <div className="bg-green-900/30 border border-green-700 text-green-200 p-3 rounded">
            <Check className="h-4 w-4 inline mr-2" />
            保存成功！
          </div>
        )}

        {/* 过滤和批量操作 */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Label className="text-white">模块筛选：</Label>
            <Select value={selectedModule} onValueChange={setSelectedModule}>
              <SelectTrigger className="w-40 bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="选择模块" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {modules.map(module => (
                  <SelectItem key={module} value={module}>
                    {module === 'all' ? '全部模块' : module}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1"></div>
          <Button
            className="bg-primary hover:bg-secondary text-white"
            onClick={handleSaveConfig}
            disabled={isSaving || !isAdmin}
          >
            {isSaving ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {isSaving ? '保存中...' : '保存配置'}
          </Button>
        </div>

        {/* 批量权限设置 */}
        <PermissionBulkSettings onBulkSetPermission={handleBulkSetPermission} />

        {/* 权限配置表格 */}
        <PermissionConfigEditor
          items={permissionConfig.items}
          rolePermissions={permissionConfig.rolePermissions}
          selectedModule={selectedModule}
          onRolePermissionChange={handleRolePermissionChange}
          onOpenEditDialog={() => {/* TODO */}}
          onDeleteItem={handleDeleteItem}
        />
      </CardContent>
    </Card>
  );
}
