/**
 * 项目成员选择器组件
 *
 * 功能：
 * - 从组织架构中选择项目成员
 * - 树形展示部门 -> 技术组 -> 成员
 * - 支持展开/收起节点
 * - 显示成员数量统计
 * - 支持复选框多选
 *
 * @module components/projects/ProjectMemberSelector
 */

import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Building2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OrganizationStructure, OrgTreeNode } from '@/types/organization';

interface ProjectMemberSelectorProps {
  /** 组织架构数据 */
  organization: OrganizationStructure | null;
  /** 已选中的成员 ID 列表 */
  selectedMembers: string[];
  /** 成员选择切换回调 */
  onMemberToggle: (memberId: string) => void;
  /** 是否显示成员数量统计 */
  showMemberCount?: boolean;
  /** 是否只读（禁用选择） */
  readonly?: boolean;
  /** 自定义类名 */
  className?: string;
}

interface TreeNodeData {
  node: OrgTreeNode;
  level: number;
}

/**
 * 获取节点下的成员数量
 */
function getNodeMemberCount(node: OrgTreeNode): number {
  if (node.level === 'member') return 1;
  let count = 0;
  if (node.children) {
    for (const child of node.children) {
      count += getNodeMemberCount(child);
    }
  }
  return count;
}

/**
 * 获取节点选中状态（用于部门/技术组）
 */
function getNodeSelectedState(
  node: OrgTreeNode,
  selectedMembers: Set<string>
): 'all' | 'partial' | 'none' {
  if (node.level === 'member') {
    return selectedMembers.has(node.id) ? 'all' : 'none';
  }

  if (!node.children || node.children.length === 0) {
    return 'none';
  }

  const childStates = node.children.map(child => getNodeSelectedState(child, selectedMembers));
  const allSelected = childStates.every(state => state === 'all');
  const someSelected = childStates.some(state => state === 'all' || state === 'partial');

  if (allSelected) return 'all';
  if (someSelected) return 'partial';
  return 'none';
}

/**
 * 项目成员选择器组件
 */
export function ProjectMemberSelector({
  organization,
  selectedMembers,
  onMemberToggle,
  showMemberCount = true,
  readonly = false,
  className,
}: ProjectMemberSelectorProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // 将 selectedMembers 转换为 Set 以提高查找性能
  const selectedMembersSet = useMemo(() => new Set(selectedMembers), [selectedMembers]);

  // 切换节点展开/收起
  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  // 检查节点是否展开
  const isExpanded = (nodeId: string) => expandedNodes.has(nodeId);

  // 展开/收起所有节点
  const expandAll = () => {
    const allIds = new Set<string>();
    const collectIds = (node: OrgTreeNode) => {
      if (node.children && node.children.length > 0) {
        allIds.add(node.id);
        node.children.forEach(child => collectIds(child));
      }
    };
    organization?.departments.forEach(dept => collectIds(dept));
    setExpandedNodes(allIds);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  // 渲染树节点
  const renderNode = (node: OrgTreeNode, level: number): React.ReactNode => {
    const isMember = node.level === 'member';
    const isSelected = isMember && selectedMembersSet.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const memberCount = showMemberCount ? getNodeMemberCount(node) : 0;

    return (
      <div key={node.id}>
        {/* 节点行 */}
        <div
          className={cn(
            "flex items-center gap-2 py-1.5 px-2 hover:bg-muted/30 transition-colors rounded",
            isSelected && "bg-primary/20",
            readonly && "cursor-not-allowed opacity-60"
          )}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
        >
          {/* 展开/收起按钮 */}
          {hasChildren ? (
            <button
              type="button"
              onClick={() => !readonly && toggleNode(node.id)}
              className={cn(
                "p-0.5 hover:bg-slate-600 rounded transition-colors",
                readonly ? "cursor-not-allowed opacity-50" : "cursor-pointer"
              )}
              disabled={readonly}
            >
              {isExpanded(node.id) ? (
                <ChevronDown className="w-3 h-3 text-slate-400" />
              ) : (
                <ChevronRight className="w-3 h-3 text-slate-400" />
              )}
            </button>
          ) : (
            <div className="w-4" />
          )}

          {/* 复选框（仅成员节点） */}
          {isMember && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                if (!readonly) onMemberToggle(node.id);
              }}
              disabled={readonly}
              className={cn(
                "w-4 h-4 rounded border-border bg-background text-primary focus:ring-primary focus:ring-offset-0",
                readonly ? "cursor-not-allowed opacity-50" : "cursor-pointer"
              )}
            />
          )}

          {/* 节点图标 */}
          <div className={cn(
            "w-4 h-4 flex items-center justify-center",
            node.level === 'department' && "text-amber-400",
            node.level === 'tech_group' && "text-blue-400",
            node.level === 'member' && "text-slate-400"
          )}>
            {node.level === 'department' && <Building2 className="w-4 h-4" />}
            {node.level === 'tech_group' && <Users className="w-4 h-4" />}
            {node.level === 'member' && <Users className="w-3.5 h-3.5" />}
          </div>

          {/* 节点名称 */}
          <span className={cn(
            "text-sm truncate flex-1",
            isMember ? "text-white" : "text-muted-foreground"
          )}>
            {node.name}
          </span>

          {/* 成员数量统计（部门/技术组） */}
          {!isMember && showMemberCount && memberCount > 0 && (
            <span className="text-xs text-muted-foreground">
              ({memberCount}人)
            </span>
          )}

          {/* 选中状态指示（部门/技术组） */}
          {!isMember && (
            <div className="flex items-center gap-1">
              {getNodeSelectedState(node, selectedMembersSet) === 'all' && (
                <div className="w-2 h-2 rounded-full bg-green-500" />
              )}
              {getNodeSelectedState(node, selectedMembersSet) === 'partial' && (
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
              )}
            </div>
          )}
        </div>

        {/* 子节点 */}
        {hasChildren && isExpanded(node.id) && node.children?.map(child => renderNode(child, level + 1))}
      </div>
    );
  };

  if (!organization) {
    return (
      <div className={cn("p-4 text-center text-muted-foreground text-sm", className)}>
        暂无组织架构数据
      </div>
    );
  }

  const departments = organization.departments || [];

  return (
    <div className={cn("py-2", className)}>
      {/* 工具栏 */}
      {!readonly && departments.length > 0 && (
        <div className="flex items-center gap-2 px-2 pb-2 mb-2 border-b border-border">
          <span className="text-xs text-muted-foreground">
            已选择 {selectedMembers.length} 人
          </span>
          <div className="flex-1" />
          <button
            type="button"
            onClick={expandAll}
            className="text-xs text-primary hover:underline"
          >
            全部展开
          </button>
          <span className="text-xs text-muted-foreground">/</span>
          <button
            type="button"
            onClick={collapseAll}
            className="text-xs text-primary hover:underline"
          >
            全部收起
          </button>
        </div>
      )}

      {/* 树形结构 */}
      {departments.map(dept => renderNode(dept, 0))}
    </div>
  );
}

/**
 * 成员选择结果展示
 */
export interface SelectedMembersDisplayProps {
  /** 已选中的成员 ID 列表 */
  selectedMembers: string[];
  /** 成员信息映射 */
  membersMap: Map<string, { name: string; avatar?: string; department?: string }>;
  /** 移除成员回调 */
  onRemove?: (memberId: string) => void;
  /** 最大显示数量 */
  maxDisplay?: number;
}

/**
 * 已选成员展示组件
 */
export function SelectedMembersDisplay({
  selectedMembers,
  membersMap,
  onRemove,
  maxDisplay = 10,
}: SelectedMembersDisplayProps) {
  const displayMembers = selectedMembers.slice(0, maxDisplay);
  const remainingCount = selectedMembers.length - maxDisplay;

  if (selectedMembers.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        暂未选择成员
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {displayMembers.map((memberId) => {
        const member = membersMap.get(memberId);
        if (!member) return null;

        return (
          <div
            key={memberId}
            className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded-md text-sm"
          >
            <span className="text-white">{member.name}</span>
            {member.department && (
              <span className="text-xs text-muted-foreground">({member.department})</span>
            )}
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(memberId)}
                className="ml-1 text-muted-foreground hover:text-white"
              >
                ×
              </button>
            )}
          </div>
        );
      })}
      {remainingCount > 0 && (
        <div className="flex items-center px-2 py-1 bg-muted rounded-md text-sm text-muted-foreground">
          +{remainingCount} 人
        </div>
      )}
    </div>
  );
}
