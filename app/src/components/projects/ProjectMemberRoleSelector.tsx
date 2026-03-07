/**
 * 项目成员角色选择器组件
 *
 * 功能：
 * 1. 为项目成员分配角色
 * 2. 显示角色权限说明
 * 3. 验证角色数量限制
 * 4. 至少需要一个负责人的验证
 *
 * @module components/projects/ProjectMemberRoleSelector
 */

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  Crown,
  Briefcase,
  User,
  Eye,
  ChevronDown,
  Info,
  AlertCircle,
} from 'lucide-react';
import type { ProjectMemberRole } from '@/types/project';
import {
  MEMBER_ROLE_CONFIGS,
  getRoleAssignmentSuggestion,
  hasProjectOwner,
  validateRoleCount,
} from '@/utils/projectTypeManager';

// ==================== 类型定义 ====================

export interface MemberWithRole {
  id: number;
  name: string;
  avatar?: string;
  department?: string;
  role: ProjectMemberRole;
}

export interface ProjectMemberRoleSelectorProps {
  /** 已选择的成员列表（带角色） */
  members: MemberWithRole[];
  /** 成员角色变更回调 */
  onRoleChange: (memberId: number, role: ProjectMemberRole) => void;
  /** 成员移除回调 */
  onMemberRemove?: (memberId: number) => void;
  /** 是否只读模式 */
  readonly?: boolean;
  /** 是否显示角色说明 */
  showRoleDescriptions?: boolean;
  /** 自定义类名 */
  className?: string;
}

// ==================== 角色图标映射 ====================

const ROLE_ICONS: Record<ProjectMemberRole, React.ComponentType<{ className?: string }>> = {
  owner: Crown,
  manager: Briefcase,
  member: User,
  viewer: Eye,
};

// ==================== 角色选择器组件 ====================

interface RoleSelectorProps {
  /** 成员ID */
  memberId: number;
  /** 当前角色 */
  currentRole: ProjectMemberRole;
  /** 角色变更回调 */
  onRoleChange: (memberId: number, role: ProjectMemberRole) => void;
  /** 是否禁用 */
  disabled?: boolean;
}

/**
 * 角色选择器（下拉菜单）
 */
function RoleSelector({ memberId, currentRole, onRoleChange, disabled }: RoleSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const currentConfig = MEMBER_ROLE_CONFIGS[currentRole];
  const CurrentIcon = ROLE_ICONS[currentRole];

  const handleRoleSelect = (role: ProjectMemberRole) => {
    onRoleChange(memberId, role);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* 角色按钮 */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors",
          disabled && "cursor-not-allowed opacity-50",
          currentRole === 'owner' && "bg-amber-500/20 text-amber-400 border border-amber-500/30",
          currentRole === 'manager' && "bg-blue-500/20 text-blue-400 border border-blue-500/30",
          currentRole === 'member' && "bg-green-500/20 text-green-400 border border-green-500/30",
          currentRole === 'viewer' && "bg-slate-500/20 text-slate-400 border border-slate-500/30",
          !disabled && "hover:bg-opacity-30"
        )}
      >
        <CurrentIcon className="w-3.5 h-3.5" />
        <span>{currentConfig.label}</span>
        {!disabled && (
          <ChevronDown className={cn(
            "w-3 h-3 transition-transform",
            isOpen && "rotate-180"
          )} />
        )}
      </button>

      {/* 下拉菜单 */}
      {isOpen && !disabled && (
        <>
          {/* 遮罩层 */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* 菜单内容 */}
          <div className="absolute z-20 top-full left-0 mt-1 min-w-[140px] bg-card border border-border rounded-md shadow-lg py-1 animate-in fade-in-0 zoom-in-95">
            {(Object.keys(MEMBER_ROLE_CONFIGS) as ProjectMemberRole[]).map((role) => {
              const config = MEMBER_ROLE_CONFIGS[role];
              const RoleIcon = ROLE_ICONS[role];

              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => handleRoleSelect(role)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors",
                    "hover:bg-muted",
                    currentRole === role && "bg-muted/50"
                  )}
                >
                  <RoleIcon className={cn(
                    "w-4 h-4 flex-shrink-0",
                    role === 'owner' && "text-amber-400",
                    role === 'manager' && "text-blue-400",
                    role === 'member' && "text-green-400",
                    role === 'viewer' && "text-slate-400"
                  )} />
                  <div className="flex-1">
                    <div className={cn(
                      "font-medium",
                      currentRole === role ? "text-white" : "text-muted-foreground"
                    )}>
                      {config.label}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {config.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ==================== 成员角色卡片组件 ====================

interface MemberRoleCardProps {
  /** 成员信息 */
  member: MemberWithRole;
  /** 当前所有成员（用于验证角色数量） */
  allMembers: MemberWithRole[];
  /** 角色变更回调 */
  onRoleChange: (memberId: number, role: ProjectMemberRole) => void;
  /** 成员移除回调 */
  onMemberRemove?: (memberId: number) => void;
  /** 是否只读模式 */
  readonly?: boolean;
}

/**
 * 成员角色卡片
 */
function MemberRoleCard({
  member,
  allMembers,
  onRoleChange,
  onMemberRemove,
  readonly = false,
}: MemberRoleCardProps) {
  const [showRoleError, setShowRoleError] = useState(false);
  const roleConfig = MEMBER_ROLE_CONFIGS[member.role];
  const RoleIcon = ROLE_ICONS[member.role];

  // 验证角色分配
  const handleRoleChange = (newRole: ProjectMemberRole) => {
    const validation = validateRoleCount(
      allMembers.filter(m => m.id !== member.id),
      newRole
    );

    if (!validation.valid) {
      setShowRoleError(true);
      setTimeout(() => setShowRoleError(false), 3000);
      return;
    }

    onRoleChange(member.id, newRole);
  };

  return (
    <div className={cn(
      "flex items-center gap-3 p-2 rounded-lg border border-border bg-card transition-colors",
      !readonly && "hover:border-muted-foreground/50"
    )}>
      {/* 头像 */}
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0",
        member.role === 'owner' && "bg-amber-500/20 text-amber-400 border border-amber-500/30",
        member.role === 'manager' && "bg-blue-500/20 text-blue-400 border border-blue-500/30",
        member.role === 'member' && "bg-green-500/20 text-green-400 border border-green-500/30",
        member.role === 'viewer' && "bg-slate-500/20 text-slate-400 border border-slate-500/30"
      )}>
        {member.avatar ? (
          <img src={member.avatar} alt={member.name} className="w-full h-full rounded-full object-cover" />
        ) : (
          member.name.charAt(0).toUpperCase()
        )}
      </div>

      {/* 成员信息 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white truncate">{member.name}</span>
          <RoleIcon className={cn(
            "w-3.5 h-3.5 flex-shrink-0",
            member.role === 'owner' && "text-amber-400",
            member.role === 'manager' && "text-blue-400",
            member.role === 'member' && "text-green-400",
            member.role === 'viewer' && "text-slate-400"
          )} />
        </div>
        {member.department && (
          <div className="text-xs text-muted-foreground truncate">{member.department}</div>
        )}
      </div>

      {/* 角色选择器 */}
      <RoleSelector
        memberId={member.id}
        currentRole={member.role}
        onRoleChange={handleRoleChange}
        disabled={readonly}
      />

      {/* 角色错误提示 */}
      {showRoleError && (
        <div className="absolute z-30 bottom-full left-0 mb-2 px-2 py-1 bg-red-500 text-white text-xs rounded whitespace-nowrap">
          角色数量已达上限
        </div>
      )}

      {/* 删除按钮 */}
      {!readonly && onMemberRemove && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onMemberRemove(member.id)}
          className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400 flex-shrink-0"
        >
          ×
        </Button>
      )}
    </div>
  );
}

// ==================== 主组件 ====================

/**
 * 项目成员角色选择器组件
 */
export function ProjectMemberRoleSelector({
  members,
  onRoleChange,
  onMemberRemove,
  readonly = false,
  showRoleDescriptions = true,
  className,
}: ProjectMemberRoleSelectorProps) {
  const [showRoleGuide, setShowRoleGuide] = useState(false);

  // 角色统计
  const roleStats = useMemo(() => {
    const stats: Record<ProjectMemberRole, number> = {
      owner: 0,
      manager: 0,
      member: 0,
      viewer: 0,
    };

    members.forEach(m => {
      stats[m.role]++;
    });

    return stats;
  }, [members]);

  // 验证状态
  const hasOwner = hasProjectOwner(members);
  const roleSuggestion = getRoleAssignmentSuggestion(members.length);

  return (
    <div className={cn("space-y-3", className)}>
      {/* 头部统计 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label>已选成员 ({members.length}人)</Label>
          {!hasOwner && members.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              <AlertCircle className="w-3 h-3 mr-1" />
              需要指定负责人
            </Badge>
          )}
        </div>

        {/* 角色说明按钮 */}
        {showRoleDescriptions && (
          <button
            type="button"
            onClick={() => setShowRoleGuide(!showRoleGuide)}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            <Info className="w-3.5 h-3.5" />
            角色说明
          </button>
        )}
      </div>

      {/* 角色说明 */}
      {showRoleGuide && showRoleDescriptions && (
        <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-2">
          <h4 className="text-xs font-medium text-white">角色权限说明</h4>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(MEMBER_ROLE_CONFIGS) as ProjectMemberRole[]).map((role) => {
              const config = MEMBER_ROLE_CONFIGS[role];
              const RoleIcon = ROLE_ICONS[role];
              const count = roleStats[role];
              const suggestion = roleSuggestion[role];

              return (
                <div key={role} className="flex items-start gap-2">
                  <RoleIcon className={cn(
                    "w-4 h-4 flex-shrink-0 mt-0.5",
                    role === 'owner' && "text-amber-400",
                    role === 'manager' && "text-blue-400",
                    role === 'member' && "text-green-400",
                    role === 'viewer' && "text-slate-400"
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-white">{config.label}</span>
                      {count > 0 && (
                        <Badge variant="outline" className="text-[10px] px-1 h-4">
                          {count}
                        </Badge>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground line-clamp-2">
                      {config.description}
                      {suggestion > 0 && count < suggestion && ` (建议${suggestion}人)`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 成员列表 */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {members.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
            暂未选择成员
          </div>
        ) : (
          members.map(member => (
            <MemberRoleCard
              key={member.id}
              member={member}
              allMembers={members}
              onRoleChange={onRoleChange}
              onMemberRemove={onMemberRemove}
              readonly={readonly}
            />
          ))
        )}
      </div>

      {/* 角色分配建议 */}
      {members.length > 0 && !readonly && (
        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">
            💡 建议：负责人{suggestion => suggestion.owner > 0 ? `${suggestion.owner}人` : ''}、
            项目经理{roleSuggestion.manager > 0 ? `${roleSuggestion.manager}人` : '1人'}
            {members.length >= 3 && `、项目成员${roleSuggestion.member}人`}
          </p>
        </div>
      )}
    </div>
  );
}

export default ProjectMemberRoleSelector;
