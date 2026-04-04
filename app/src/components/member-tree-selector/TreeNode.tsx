/**
 * 成员树形选择器 - 树节点组件
 */
import { memo, useCallback } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { ChevronRight, ChevronDown, Building2, User } from 'lucide-react';
import type { TreeNode as TreeNodeType, SelectionState } from './utils';

interface TreeNodeProps {
  /** 树节点数据 */
  node: TreeNodeType;
  /** 层级深度（用于缩进） */
  level: number;
  /** 已展开的节点 ID 集合 */
  expandedIds: Set<number>;
  /** 切换展开状态 */
  onToggleExpand: (id: number) => void;
  /** 节点选择状态 */
  selectionState: SelectionState;
  /** 切换选中状态 */
  onToggleSelect: (node: TreeNodeType) => void;
  /** 搜索关键词（用于高亮） */
  searchQuery: string;
  /** 获取节点选择状态的函数（用于子节点） */
  getNodeState: (node: TreeNodeType) => SelectionState;
}

/**
 * 高亮匹配文本
 */
function highlightText(text: string, searchQuery: string): React.ReactNode {
  if (!searchQuery.trim()) {
    return text;
  }

  const lowerText = text.toLowerCase();
  const lowerQuery = searchQuery.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);

  if (index === -1) {
    return text;
  }

  const before = text.slice(0, index);
  const match = text.slice(index, index + searchQuery.length);
  const after = text.slice(index + searchQuery.length);

  return (
    <>
      {before}
      <span className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">{match}</span>
      {after}
    </>
  );
}

/**
 * 单个树节点组件
 */
function TreeNodeComponent({
  node,
  level,
  expandedIds,
  onToggleExpand,
  selectionState,
  onToggleSelect,
  searchQuery,
  getNodeState,
}: TreeNodeProps) {
  const isDepartment = node.type === 'department';
  const isExpanded = expandedIds.has(node.id);
  const hasChildren = node.children && node.children.length > 0;

  // 检查部门是否有成员（用于禁用空部门的复选框）
  const hasMembers = isDepartment ? (node.memberCount ?? 0) > 0 : true;

  // 复选框状态
  const checkboxChecked = selectionState === 'checked';
  const checkboxIndeterminate = selectionState === 'indeterminate';

  // 处理展开/折叠
  const handleToggleExpand = useCallback(() => {
    if (hasChildren) {
      onToggleExpand(node.id);
    }
  }, [hasChildren, onToggleExpand, node.id]);

  // 处理选中切换
  const handleToggleSelect = useCallback(() => {
    onToggleSelect(node);
  }, [onToggleSelect, node]);

  // 处理名称点击（部门展开/折叠）
  const handleNameClick = useCallback(() => {
    if (isDepartment && hasChildren) {
      onToggleExpand(node.id);
    }
  }, [isDepartment, hasChildren, onToggleExpand, node.id]);

  return (
    <div className="select-none">
      {/* 节点行 */}
      <div
        className={cn(
          'flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer',
          'hover:bg-accent transition-colors',
          level > 0 && 'ml-4'
        )}
      >
        {/* 展开/折叠按钮（仅部门节点） */}
        {isDepartment ? (
          <button
            type="button"
            onClick={handleToggleExpand}
            className={cn(
              'flex-shrink-0 p-0.5 rounded hover:bg-accent-foreground/10',
              !hasChildren && 'invisible'
            )}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        ) : (
          <span className="w-5 inline-block" />
        )}

        {/* 复选框 */}
        <Checkbox
          checked={checkboxIndeterminate ? 'indeterminate' : checkboxChecked}
          onCheckedChange={handleToggleSelect}
          className="flex-shrink-0"
          disabled={!hasMembers}
        />

        {/* 图标 */}
        {isDepartment ? (
          <Building2 className="h-4 w-4 text-blue-500 flex-shrink-0" />
        ) : (
          <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        )}

        {/* 名称 */}
        <span
          className="flex-1 text-sm truncate"
          onClick={handleNameClick}
        >
          {highlightText(node.name, searchQuery)}
        </span>

        {/* 部门成员数 */}
        {isDepartment && node.memberCount !== undefined && node.memberCount > 0 && (
          <span className="text-xs text-muted-foreground">
            ({node.memberCount})
          </span>
        )}

        {/* 成员职位 */}
        {!isDepartment && node.position && (
          <span className="text-xs text-muted-foreground truncate max-w-24">
            {highlightText(node.position, searchQuery)}
          </span>
        )}
      </div>

      {/* 子节点（展开时渲染） */}
      {isDepartment && isExpanded && hasChildren && (
        <div>
          {node.children!.map(child => (
            <TreeNode
              key={`${child.type}-${child.id}`}
              node={child}
              level={level + 1}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              selectionState={getNodeState(child)}
              onToggleSelect={onToggleSelect}
              searchQuery={searchQuery}
              getNodeState={getNodeState}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 树节点组件
 * 使用 memo 避免不必要的重渲染（默认浅比较）
 */
export const TreeNode = memo(TreeNodeComponent);
