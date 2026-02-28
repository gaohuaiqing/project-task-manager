/**
 * 批量权限设置组件
 * 从 PermissionManagement.tsx 拆分出来
 */

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Users } from 'lucide-react';
import { ROLE_CONFIG } from '@/types/auth';
import type { UserRole, PermissionLevel } from '@/types/auth';

const permissionLevelConfig = {
  none: { label: '禁止访问', color: 'text-red-400', bgColor: 'bg-red-500/20' },
  read: { label: '只读权限', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  write: { label: '读写权限', color: 'text-green-400', bgColor: 'bg-green-500/20' },
  full: { label: '完全控制', color: 'text-purple-400', bgColor: 'bg-purple-500/20' }
};

interface PermissionBulkSettingsProps {
  onBulkSetPermission: (role: UserRole, level: PermissionLevel) => void;
}

export function PermissionBulkSettings({ onBulkSetPermission }: PermissionBulkSettingsProps) {
  return (
    <div className="bg-slate-800 p-4 rounded-lg space-y-4">
      <h3 className="text-white font-medium flex items-center gap-2">
        <Users className="w-4 h-4 text-blue-400" />
        批量权限设置
      </h3>
      <div className="grid grid-cols-4 gap-4">
        {Object.entries(ROLE_CONFIG).map(([role, config]) => (
          <div key={role} className="space-y-2">
            <Label className="text-white flex items-center gap-1">
              <User className="w-3 h-3 text-blue-400" />
              {config.label}
            </Label>
            <Select
              onValueChange={(value) => onBulkSetPermission(role as UserRole, value as PermissionLevel)}
            >
              <SelectTrigger className="w-full bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="设置权限级别" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {Object.entries(permissionLevelConfig).map(([level, config]) => (
                  <SelectItem key={level} value={level}>
                    <span className={config.color}>{config.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
}
