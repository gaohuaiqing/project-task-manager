/**
 * 成员树形选择器 - 选择状态管理 Hook
 */
import { useCallback, useMemo } from 'react';
import type { TreeNode, SelectionState } from './utils';
import { calculateSelectionState, getAllMemberIds } from './utils';

interface UseTreeSelectionOptions {
  /** 树形数据 */
  treeData: TreeNode[];
  /** 当前选中的成员 ID 列表 */
  value: number[];
  /** 选中状态变更回调 */
  onChange: (ids: number[]) => void;
}

interface UseTreeSelectionReturn {
  /** 切换节点选中状态 */
  toggleNode: (node: TreeNode) => void;
  /** 获取节点的选择状态 */
  getNodeState: (node: TreeNode) => SelectionState;
  /** 当前选中的成员 ID 集合（用于快速查找） */
  selectedIds: Set<number>;
  /** 全选 */
  selectAll: () => void;
  /** 清空选择 */
  clearAll: () => void;
}

/**
 * 树形选择状态管理 Hook
 * 使用稳定引用避免无限循环
 */
export function useTreeSelection({
  treeData,
  value,
  onChange,
}: UseTreeSelectionOptions): UseTreeSelectionReturn {
  // 使用 useMemo 创建 selectedIds，但保持引用稳定
  const selectedIds = useMemo(() => new Set(value), [value]);

  // 预计算所有节点的选择状态，避免在渲染时递归计算
  const nodeStateCache = useMemo(() => {
    const cache = new Map<string, SelectionState>();

    const calculateNodeState = (node: TreeNode): SelectionState => {
      const state = calculateSelectionState(node, selectedIds);
      cache.set(`${node.type}-${node.id}`, state);

      // 递归计算子节点状态
      if (node.children) {
        node.children.forEach(calculateNodeState);
      }

      return state;
    };

    treeData.forEach(calculateNodeState);
    return cache;
  }, [treeData, selectedIds]);

  /**
   * 获取节点的选择状态（使用缓存）
   */
  const getNodeState = useCallback(
    (node: TreeNode): SelectionState => {
      const key = `${node.type}-${node.id}`;
      return nodeStateCache.get(key) || 'unchecked';
    },
    [nodeStateCache]
  );

  /**
   * 切换节点选中状态
   */
  const toggleNode = useCallback(
    (node: TreeNode) => {
      // 成员节点直接处理
      if (node.type === 'member') {
        const isSelected = value.includes(node.id);
        if (isSelected) {
          onChange(value.filter(id => id !== node.id));
        } else {
          onChange([...value, node.id]);
        }
        return;
      }

      // 部门节点：获取所有子成员
      const affectedMemberIds = getAllMemberIds(node);

      // 如果部门下没有成员，不执行任何操作
      if (affectedMemberIds.length === 0) {
        return;
      }

      const currentState = getNodeState(node);
      const isCurrentlySelected = currentState === 'checked';

      if (isCurrentlySelected) {
        // 取消选中：移除这些成员
        const newIds = value.filter(id => !affectedMemberIds.includes(id));
        onChange(newIds);
      } else {
        // 选中：添加这些成员（去重）
        const newIdsSet = new Set([...value, ...affectedMemberIds]);
        onChange(Array.from(newIdsSet));
      }
    },
    [value, onChange, getNodeState]
  );

  /**
   * 全选所有成员
   */
  const selectAll = useCallback(() => {
    const allMemberIds: number[] = [];
    const collectMemberIds = (nodes: TreeNode[]) => {
      nodes.forEach(node => {
        if (node.type === 'member') {
          allMemberIds.push(node.id);
        }
        if (node.children) {
          collectMemberIds(node.children);
        }
      });
    };
    collectMemberIds(treeData);
    onChange(allMemberIds);
  }, [treeData, onChange]);

  /**
   * 清空所有选择
   */
  const clearAll = useCallback(() => {
    onChange([]);
  }, [onChange]);

  return {
    toggleNode,
    getNodeState,
    selectedIds,
    selectAll,
    clearAll,
  };
}
