/**
 * 权限配置编辑器组件
 * 从 PermissionManagement.tsx 拆分出来
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit3, Trash2 } from 'lucide-react';
import type { PermissionConfigItem, UserRole, PermissionLevel } from '@/types/auth';

const permissionLevelConfig = {
  none: { label: '禁止访问', color: 'text-red-400', bgColor: 'bg-red-500/20' },
  read: { label: '只读权限', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  write: { label: '读写权限', color: 'text-green-400', bgColor: 'bg-green-500/20' },
  full: { label: '完全控制', color: 'text-purple-400', bgColor: 'bg-purple-500/20' }
};

interface PermissionConfigEditorProps {
  items: PermissionConfigItem[];
  rolePermissions: Record<UserRole, Partial<Record<string, PermissionLevel>>>;
  selectedModule: string;
  onRolePermissionChange: (role: UserRole, permission: string, level: PermissionLevel) => void;
  onOpenEditDialog: (item: PermissionConfigItem) => void;
  onDeleteItem: (item: PermissionConfigItem) => void;
}

export function PermissionConfigEditor({
  items,
  rolePermissions,
  selectedModule,
  onRolePermissionChange,
  onOpenEditDialog,
  onDeleteItem
}: PermissionConfigEditorProps) {
  const filteredItems = selectedModule === 'all'
    ? items
    : items.filter(item => item.module === selectedModule);

  return (
    <div className="overflow-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-800">
            <th className="text-left p-3 text-white">权限项</th>
            <th className="text-left p-3 text-white">模块</th>
            <th className="text-left p-3 text-white">技术经理</th>
            <th className="text-left p-3 text-white">部门经理</th>
            <th className="text-left p-3 text-white">工程师</th>
            <th className="text-left p-3 text-white">操作</th>
          </tr>
        </thead>
        <tbody>
          {filteredItems.map((item) => (
            <tr key={item.id} className="border-slate-700 hover:bg-slate-800/50">
              <td className="p-3 font-medium text-white">
                <div>
                  {item.name}
                  <p className="text-xs text-slate-400 mt-1">{item.description}</p>
                </div>
              </td>
              <td className="p-3">
                <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                  {item.module}
                </Badge>
              </td>
              <td className="p-3">
                <Select
                  value={rolePermissions.tech_manager?.[item.permission] || 'none'}
                  onValueChange={(value) => onRolePermissionChange('tech_manager', item.permission, value as PermissionLevel)}
                >
                  <SelectTrigger className="w-28 bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="选择" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {Object.entries(permissionLevelConfig).map(([level, config]) => (
                      <SelectItem key={level} value={level}>
                        <span className={config.color}>{config.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              <td className="p-3">
                <Select
                  value={rolePermissions.dept_manager?.[item.permission] || 'none'}
                  onValueChange={(value) => onRolePermissionChange('dept_manager', item.permission, value as PermissionLevel)}
                >
                  <SelectTrigger className="w-28 bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="选择" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {Object.entries(permissionLevelConfig).map(([level, config]) => (
                      <SelectItem key={level} value={level}>
                        <span className={config.color}>{config.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              <td className="p-3">
                <Select
                  value={rolePermissions.engineer?.[item.permission] || 'none'}
                  onValueChange={(value) => onRolePermissionChange('engineer', item.permission, value as PermissionLevel)}
                >
                  <SelectTrigger className="w-28 bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="选择" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {Object.entries(permissionLevelConfig).map(([level, config]) => (
                      <SelectItem key={level} value={level}>
                        <span className={config.color}>{config.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              <td className="p-3">
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20"
                    onClick={() => onOpenEditDialog(item)}
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                    onClick={() => onDeleteItem(item)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {filteredItems.length === 0 && (
        <div className="text-center py-8 text-slate-400">
          暂无权限项
        </div>
      )}
    </div>
  );
}
