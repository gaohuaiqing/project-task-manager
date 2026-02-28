/**
 * 组织架构树形组件
 *
 * 职责：
 * 1. 递归渲染三级树形结构
 * 2. 支持展开/收起
 * 3. 支持节点选择
 * 4. 不同层级使用不同图标
 * 5. 每个节点右侧显示操作按钮
 */

import { useState } from 'react';
import { Building2, Users, User, ChevronDown, ChevronRight, Edit3, Trash2, Shield, KeyRound, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Department, TechGroup, Member, OrgTreeNode } from '@/types/organization';
import { useAuth } from '@/contexts/AuthContext';
import { canEditOrganization } from '@/types/auth';

interface OrganizationTreeProps {
  departments: Department[];
  selectedNodeId: string | null;
  onNodeSelect: (nodeId: string, nodeType: 'department' | 'tech_group' | 'member') => void;
  readOnly?: boolean;
  onNodeEdit?: (nodeId: string, nodeType: 'department' | 'tech_group' | 'member') => void;
  onNodeDelete?: (nodeId: string, nodeType: 'department' | 'tech_group' | 'member') => void;
  onNodeResetPassword?: (nodeId: string, employeeId: string, name: string) => void;
}

interface TreeNodeProps {
  node: OrgTreeNode;
  level: number;
  isSelected: boolean;
  selectedNodeId: string | null;
  onSelect: (nodeId: string, nodeType: 'department' | 'tech_group' | 'member') => void;
  readOnly?: boolean;
  onNodeEdit?: (nodeId: string, nodeType: 'department' | 'tech_group' | 'member') => void;
  onNodeDelete?: (nodeId: string, nodeType: 'department' | 'tech_group' | 'member') => void;
  onNodeResetPassword?: (nodeId: string, employeeId: string, name: string) => void;
}

function TreeNode({
  node,
  level,
  isSelected,
  selectedNodeId,
  onSelect,
  readOnly = false,
  onNodeEdit,
  onNodeDelete,
  onNodeResetPassword
}: TreeNodeProps) {
  const { user } = useAuth();
  const canEdit = canEditOrganization(user);
  const [isExpanded, setIsExpanded] = useState(level < 2); // 默认展开前两层

  const nodeType = node.level;
  const children = node.children || [];
  const hasChildren = children.length > 0;

  // 检查是否应该显示操作按钮
  const shouldShowActionButtons = () => {
    if (readOnly || !canEdit) return false;
    return user?.role === 'admin' || user?.role === 'dept_manager';
  };

  // 检查是否显示重置密码按钮（仅成员节点）
  const shouldShowResetPassword = () => {
    if (readOnly || !canEdit) return false;
    if (nodeType === 'member') {
      return user?.role === 'admin' || user?.role === 'dept_manager';
    }
    return false;
  };

  // 获取节点图标
  const getNodeIcon = () => {
    switch (nodeType) {
      case 'department':
        return <Building2 className="w-4 h-4 text-amber-400" />;
      case 'tech_group':
        return <Users className="w-4 h-4 text-blue-400" />;
      case 'member':
        const member = node as Member;
        if (member.role === 'dept_manager') {
          return <Shield className="w-4 h-4 text-amber-400" />;
        }
        if (member.role === 'tech_manager') {
          return <Shield className="w-4 h-4 text-blue-400" />;
        }
        return <User className="w-4 h-4 text-slate-400" />;
    }
    return <User className="w-4 h-4 text-slate-400" />;
  };

  // 获取节点背景色
  const getNodeBgColor = () => {
    switch (nodeType) {
      case 'department':
        return isSelected ? 'bg-amber-500/20 border-amber-500/50' : 'hover:bg-slate-700/50';
      case 'tech_group':
        return isSelected ? 'bg-blue-500/20 border-blue-500/50' : 'hover:bg-slate-700/50';
      case 'member':
        return isSelected ? 'bg-slate-700 border-slate-600' : 'hover:bg-slate-700/50';
    }
    return 'hover:bg-slate-700/50';
  };

  // 计算部门或技术组的人数
  const getMemberCount = (): number => {
    if (nodeType === 'department') {
      const dept = node as Department;
      let count = 0;
      dept.children?.forEach(child => {
        if (child.level === 'tech_group') {
          count += (child as TechGroup).children?.length || 0;
        } else if (child.level === 'member') {
          count += 1;
        }
      });
      return count;
    } else if (nodeType === 'tech_group') {
      const group = node as TechGroup;
      return group.children?.length || 0;
    }
    return 0;
  };

  // 获取节点标签
  const getNodeLabel = () => {
    switch (nodeType) {
      case 'department':
      case 'tech_group':
        const name = (node as Department | TechGroup).name;
        const count = getMemberCount();
        return count > 0 ? `${name}（${count}人）` : name;
      case 'member':
        const member = node as Member;
        return `${member.name}（${member.employeeId}）`;
    }
    return '';
  };

  // 获取角色标签
  const getRoleLabel = () => {
    if (nodeType === 'member') {
      const member = node as Member;
      if (member.role === 'dept_manager') return '部门经理';
      if (member.role === 'tech_manager') return '技术经理';
      if (member.role === 'engineer') return '工程师';
    }
    return null;
  };

  // 获取增加按钮文本
  const getAddButtonText = () => {
    if (nodeType === 'department') return '增加技术组';
    if (nodeType === 'tech_group') return '增加成员';
    return null;
  };

  const handleClick = () => {
    onSelect(node.id, nodeType);
  };

  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onNodeEdit) {
      onNodeEdit(node.id, nodeType);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onNodeDelete) {
      onNodeDelete(node.id, nodeType);
    }
  };

  const handleResetPassword = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onNodeResetPassword && nodeType === 'member') {
      const member = node as Member;
      onNodeResetPassword(member.id, member.employeeId, member.name);
    }
  };

  return (
    <div className="select-none">
      {/* 节点行 */}
      <div
        className={cn(
          'flex items-center gap-2 py-1 px-3 rounded-lg border border-transparent transition-all group',
          getNodeBgColor()
        )}
        style={{ paddingLeft: `${level * 20 + 12}px` }}
      >
        {/* 展开/收起按钮 */}
        {hasChildren ? (
          <button
            onClick={handleExpand}
            className="p-0.5 hover:bg-slate-600 rounded transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3 text-slate-400" />
            ) : (
              <ChevronRight className="w-3 h-3 text-slate-400" />
            )}
          </button>
        ) : (
          <div className="w-4" />
        )}

        {/* 节点图标和名称 */}
        <div onClick={handleClick} className="cursor-pointer flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {getNodeIcon()}
            <span className="text-sm text-white truncate">
              {getNodeLabel()}
            </span>
            {/* 角色标签 */}
            {getRoleLabel() && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                {getRoleLabel()}
              </span>
            )}
          </div>
        </div>

        {/* 操作按钮 */}
        {shouldShowActionButtons() && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onNodeEdit && (
              <button
                onClick={handleEdit}
                className="p-1 hover:bg-slate-600 rounded transition-colors"
                title="编辑"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-400 hover:text-white" />
              </button>
            )}
            {onNodeDelete && (
              <button
                onClick={handleDelete}
                className="p-1 hover:bg-slate-600 rounded transition-colors"
                title="删除"
              >
                <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-red-400" />
              </button>
            )}
          </div>
        )}

        {/* 重置密码按钮（仅成员） */}
        {shouldShowResetPassword() && onNodeResetPassword && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleResetPassword}
              className="p-1 hover:bg-slate-600 rounded transition-colors"
              title="重置密码"
            >
              <KeyRound className="w-3.5 h-3.5 text-slate-400 hover:text-amber-400" />
            </button>
          </div>
        )}
      </div>

      {/* 子节点 */}
      {hasChildren && isExpanded && (
        <div className="space-y-0">
          {children.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              isSelected={selectedNodeId === child.id}
              selectedNodeId={selectedNodeId}
              onSelect={onSelect}
              readOnly={readOnly}
              onNodeEdit={onNodeEdit}
              onNodeDelete={onNodeDelete}
              onNodeResetPassword={onNodeResetPassword}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function OrganizationTree({
  departments,
  selectedNodeId,
  onNodeSelect,
  readOnly = false,
  onNodeEdit,
  onNodeDelete,
  onNodeResetPassword
}: OrganizationTreeProps) {
  return (
    <div className="space-y-0">
      {departments.map(dept => (
        <TreeNode
          key={dept.id}
          node={dept}
          level={0}
          isSelected={selectedNodeId === dept.id}
          selectedNodeId={selectedNodeId}
          onSelect={onNodeSelect}
          readOnly={readOnly}
          onNodeEdit={onNodeEdit}
          onNodeDelete={onNodeDelete}
          onNodeResetPassword={onNodeResetPassword}
        />
      ))}
    </div>
  );
}
