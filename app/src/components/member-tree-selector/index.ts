/**
 * 成员树形选择器组件
 * 导出入口
 */

export { MemberTreeSelector, type MemberTreeSelectorProps } from './MemberTreeSelector';
export { TreeNode } from './TreeNode';
export { useTreeSelection } from './useTreeSelection';
export {
  buildDepartmentMemberTree,
  buildDepartmentTree,
  filterTree,
  getExpandedIdsForSearch,
  getAllDepartmentIds,
  getExpandedIdsForMemberIds,
  formatSelectedMembers,
  getAllMemberIds,
  calculateSelectionState,
  type TreeNode as TreeNodeType,
  type SelectionState,
} from './utils';

// 默认导出主组件
export { MemberTreeSelector as default } from './MemberTreeSelector';
