/**
 * 成员树形选择器 - 主组件
 * 支持按组织架构树形结构选择成员
 */
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  ChevronDown,
  Search,
  X,
  ChevronRight,
} from 'lucide-react';
import { useDepartments, useMembers } from '@/features/org/hooks/useOrg';
import { TreeNode } from './TreeNode';
import { useTreeSelection } from './useTreeSelection';
import {
  buildDepartmentMemberTree,
  filterTree,
  getExpandedIdsForSearch,
  getAllDepartmentIds,
  getExpandedIdsForMemberIds,
  formatSelectedMembers,
  type TreeNode as TreeNodeType,
} from './utils';

export interface MemberTreeSelectorProps {
  /** 当前选中的成员 ID 列表 */
  value: number[];
  /** 选中状态变更回调 */
  onChange: (ids: number[]) => void;
  /** 是否禁用 */
  disabled?: boolean;
  /** 弹出层宽度 */
  width?: number | string;
  /** 占位符文本 */
  placeholder?: string;
}

/**
 * 成员树形选择器组件
 */
export function MemberTreeSelector({
  value,
  onChange,
  disabled = false,
  width = 400,
  placeholder = '选择项目成员',
}: MemberTreeSelectorProps) {
  // Popover 状态
  const [open, setOpen] = useState(false);

  // 搜索状态
  const [searchQuery, setSearchQuery] = useState('');

  // 展开状态（使用 ref 避免不必要的重渲染）
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const expandedIdsRef = useRef<Set<number>>(new Set());
  expandedIdsRef.current = expandedIds;

  // 获取部门数据
  const { data: departments = [], isLoading: deptLoading } = useDepartments();

  // 获取成员数据（只获取活跃成员，排除内置用户如 admin）
  const { data: membersData, isLoading: membersLoading } = useMembers({
    status: 'active',
    pageSize: 1000,
  });
  // 过滤掉内置用户（如 admin），admin 默认是所有项目成员，拥有最高权限
  const members = (membersData?.items || []).filter(m => !m.isBuiltin);

  const isLoading = deptLoading || membersLoading;

  // 构建树形数据（按组织架构排序：先子部门，后成员）
  const treeData = useMemo(() => {
    return buildDepartmentMemberTree(departments, members);
  }, [departments, members]);

  // 过滤后的树数据
  const filteredTreeData = useMemo(() => {
    return filterTree(treeData, searchQuery);
  }, [treeData, searchQuery]);

  // 使用选择状态 Hook
  const { toggleNode, getNodeState, selectAll, clearAll } = useTreeSelection({
    treeData,
    value,
    onChange,
  });

  // 初始化展开状态：展开包含已选成员的部门（只在打开时执行一次）
  useEffect(() => {
    if (open && value.length > 0) {
      const initialExpandedIds = getExpandedIdsForMemberIds(
        treeData,
        new Set(value)
      );
      setExpandedIds(prev => {
        // 合并已有的展开状态
        return new Set([...prev, ...initialExpandedIds]);
      });
    }
  }, [open]); // 只依赖 open，避免 value 变化时重复计算

  // 搜索时自动展开匹配路径
  useEffect(() => {
    if (searchQuery.trim()) {
      const searchExpandedIds = getExpandedIdsForSearch(
        treeData,
        searchQuery
      );
      setExpandedIds(prev => new Set([...prev, ...searchExpandedIds]));
    }
  }, [searchQuery, treeData]);

  // 切换展开状态
  const handleToggleExpand = useCallback((id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // 全部展开
  const handleExpandAll = useCallback(() => {
    const allDeptIds = getAllDepartmentIds(treeData);
    setExpandedIds(new Set(allDeptIds));
  }, [treeData]);

  // 全部折叠
  const handleCollapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  // 清除搜索
  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  // 获取触发按钮显示文本
  const displayText = useMemo(() => {
    return formatSelectedMembers(value, members);
  }, [value, members]);

  // 移除单个成员
  const handleRemoveMember = useCallback(
    (memberId: number, e: React.MouseEvent) => {
      e.stopPropagation();
      onChange(value.filter(id => id !== memberId));
    },
    [value, onChange]
  );

  // 选中的成员列表（用于 Badge 显示）
  const selectedMembers = useMemo(() => {
    return members.filter(m => value.includes(m.id));
  }, [members, value]);

  return (
    <div className="space-y-2">
      {/* 主选择器 */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled || isLoading}
            className="w-full justify-between font-normal h-auto min-h-10 py-2"
            style={{ maxWidth: width }}
          >
            <span className="flex items-center gap-2 truncate">
              <Users className="h-4 w-4 flex-shrink-0" />
              {isLoading ? (
                <span className="text-muted-foreground">加载中...</span>
              ) : (
                displayText
              )}
            </span>
            <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0 ml-2" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="p-0"
          align="start"
          style={{ width: typeof width === 'number' ? `${width}px` : width }}
        >
          {/* 搜索栏 */}
          <div className="flex items-center gap-2 p-2 border-b">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索部门或成员..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 h-8"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                >
                  <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
            {/* 展开/折叠控制 */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleExpandAll}
                title="全部展开"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleCollapseAll}
                title="全部折叠"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* 树容器 - 使用 overscroll-contain 防止滚动穿透 */}
          <div
            className="h-[300px] overflow-y-auto overscroll-contain"
            onWheel={e => e.stopPropagation()}
          >
            {isLoading ? (
              // 加载骨架屏
              <div className="p-2 space-y-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            ) : filteredTreeData.length === 0 ? (
              // 无结果
              <div className="p-4 text-center text-sm text-muted-foreground">
                {searchQuery ? '没有找到匹配的部门或成员' : '暂无可选成员'}
              </div>
            ) : (
              // 树节点列表
              <div className="p-2">
                {filteredTreeData.map(node => (
                  <TreeNode
                    key={`${node.type}-${node.id}`}
                    node={node}
                    level={0}
                    expandedIds={expandedIds}
                    onToggleExpand={handleToggleExpand}
                    selectionState={getNodeState(node)}
                    onToggleSelect={toggleNode}
                    searchQuery={searchQuery}
                    getNodeState={getNodeState}
                  />
                ))}
              </div>
            )}
          </div>

          {/* 底部操作栏 */}
          <div className="flex items-center justify-between p-2 border-t text-sm">
            <span className="text-muted-foreground">
              已选 {value.length} 人
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAll}
                disabled={value.length === members.length}
              >
                全选
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                disabled={value.length === 0}
              >
                清空
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => setOpen(false)}
              >
                确定
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* 已选成员标签 */}
      {selectedMembers.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedMembers.map(member => (
            <Badge
              key={member.id}
              variant="secondary"
              className="gap-1 pr-1"
            >
              {member.name}
              <button
                type="button"
                onClick={e => handleRemoveMember(member.id, e)}
                className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export default MemberTreeSelector;
