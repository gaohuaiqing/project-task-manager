/**
 * 成员树形选择器 - 工具函数
 */
import type { Member, Department } from '@/lib/api/org.api';

/**
 * 树节点类型
 */
export interface TreeNode {
  id: number;
  type: 'department' | 'member';
  name: string;
  children?: TreeNode[];
  // 部门特有
  memberCount?: number;
  // 成员特有
  position?: string;
  departmentId?: number | null;
  // 用于排序
  role?: Member['role'];
}

/**
 * 管理人员角色集合
 * 复用自 Organization.tsx
 */
const MANAGER_ROLES: Set<Member['role']> = new Set(['admin', 'tech_manager', 'department_manager']);

/**
 * 判断是否为管理人员
 */
function isManager(role: Member['role']): boolean {
  return MANAGER_ROLES.has(role);
}

/**
 * 选择状态
 */
export type SelectionState = 'checked' | 'unchecked' | 'indeterminate';

/**
 * 构建部门树结构
 * 复用自 Organization.tsx 的 buildDepartmentTree 逻辑
 */
export function buildDepartmentTree(departments: Department[]): Department[] {
  const map = new Map<number, Department>();
  const roots: Department[] = [];

  // 初始化映射
  departments.forEach(dept => {
    map.set(dept.id, { ...dept, children: [] });
  });

  // 构建树结构
  departments.forEach(dept => {
    const node = map.get(dept.id)!;
    if (dept.parentId === null) {
      roots.push(node);
    } else {
      const parent = map.get(dept.parentId);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(node);
      }
    }
  });

  return roots;
}

/**
 * 构建部门-成员树
 * 将成员按部门分组，构建包含部门和成员的树结构
 */
export function buildDepartmentMemberTree(
  departments: Department[],
  members: Member[]
): TreeNode[] {
  // 构建部门树
  const departmentTree = buildDepartmentTree(departments);

  // 按部门分组成员（只包含活跃成员）
  const membersByDept = new Map<number | null, Member[]>();
  members
    .filter(member => member.status === 'active')
    .forEach(member => {
      const deptId = member.departmentId;
      if (!membersByDept.has(deptId)) {
        membersByDept.set(deptId, []);
      }
      membersByDept.get(deptId)!.push(member);
    });

  /**
   * 计算部门及其子部门的总成员数
   */
  const calculateMemberCount = (dept: Department): number => {
    const directMembers = membersByDept.get(dept.id)?.length || 0;
    const childCount = (dept.children || []).reduce(
      (sum, child) => sum + calculateMemberCount(child),
      0
    );
    return directMembers + childCount;
  };

  /**
   * 递归构建树节点
   */
  const buildNode = (dept: Department): TreeNode => {
    // 获取当前部门的直接成员
    const directMembers = membersByDept.get(dept.id) || [];

    // 构建子部门节点
    const childDeptNodes: TreeNode[] = (dept.children || []).map(buildNode);

    // 按角色排序：管理人员在前（与组织架构页面保持一致）
    const sortedMembers = [...directMembers].sort((a, b) => {
      const aIsManager = isManager(a.role) ? 0 : 1;
      const bIsManager = isManager(b.role) ? 0 : 1;
      return aIsManager - bIsManager;
    });

    // 构建成员节点
    const memberNodes: TreeNode[] = sortedMembers.map(member => ({
      id: member.id,
      type: 'member' as const,
      name: member.name,
      position: member.position || undefined,
      departmentId: member.departmentId,
      role: member.role,
    }));

    // 计算总成员数
    const totalCount = calculateMemberCount(dept);

    return {
      id: dept.id,
      type: 'department',
      name: dept.name,
      memberCount: totalCount,
      // 与组织架构页面保持一致：先显示成员（管理人员在前），再显示子部门
      children: [...memberNodes, ...childDeptNodes],
    };
  };

  // 构建根节点
  const rootNodes: TreeNode[] = departmentTree.map(buildNode);

  // 处理无部门的成员
  const unassignedMembers = membersByDept.get(null) || [];
  if (unassignedMembers.length > 0) {
    // 按角色排序：管理人员在前
    const sortedUnassignedMembers = [...unassignedMembers].sort((a, b) => {
      const aIsManager = isManager(a.role) ? 0 : 1;
      const bIsManager = isManager(b.role) ? 0 : 1;
      return aIsManager - bIsManager;
    });

    rootNodes.push({
      id: -1, // 特殊 ID 表示未分配部门
      type: 'department',
      name: '未分配部门',
      memberCount: unassignedMembers.length,
      children: sortedUnassignedMembers.map(member => ({
        id: member.id,
        type: 'member' as const,
        name: member.name,
        position: member.position || undefined,
        departmentId: null,
        role: member.role,
      })),
    });
  }

  return rootNodes;
}

/**
 * 获取节点下所有成员 ID（递归）
 */
export function getAllMemberIds(node: TreeNode): number[] {
  const ids: number[] = [];

  if (node.type === 'member') {
    ids.push(node.id);
  }

  if (node.children) {
    node.children.forEach(child => {
      ids.push(...getAllMemberIds(child));
    });
  }

  return ids;
}

/**
 * 计算节点的选择状态
 * @param node 当前节点
 * @param selectedIds 已选中的成员 ID 集合
 */
export function calculateSelectionState(
  node: TreeNode,
  selectedIds: Set<number>
): SelectionState {
  // 成员节点：直接检查是否选中
  if (node.type === 'member') {
    return selectedIds.has(node.id) ? 'checked' : 'unchecked';
  }

  // 部门节点：计算所有子成员的选中状态
  const allMemberIds = getAllMemberIds(node);

  if (allMemberIds.length === 0) {
    return 'unchecked';
  }

  const selectedCount = allMemberIds.filter(id => selectedIds.has(id)).length;

  if (selectedCount === 0) {
    return 'unchecked';
  }

  if (selectedCount === allMemberIds.length) {
    return 'checked';
  }

  return 'indeterminate';
}

/**
 * 递归过滤树节点（搜索）
 * @param nodes 树节点列表
 * @param query 搜索关键词
 * @returns 过滤后的树节点（保留匹配路径）
 */
export function filterTree(nodes: TreeNode[], query: string): TreeNode[] {
  if (!query.trim()) {
    return nodes;
  }

  const lowerQuery = query.toLowerCase();

  function filterNode(node: TreeNode): TreeNode | null {
    // 检查当前节点是否匹配
    const nameMatch = node.name.toLowerCase().includes(lowerQuery);
    const positionMatch = node.position?.toLowerCase().includes(lowerQuery);

    // 递归过滤子节点
    const filteredChildren = node.children
      ?.map(filterNode)
      .filter((n): n is TreeNode => n !== null) || [];

    // 如果当前节点匹配或有匹配的子节点，则保留
    if (nameMatch || positionMatch || filteredChildren.length > 0) {
      return {
        ...node,
        children: filteredChildren,
      };
    }

    return null;
  }

  return nodes.map(filterNode).filter((n): n is TreeNode => n !== null);
}

/**
 * 获取所有匹配节点的 ID（用于自动展开）
 * @param nodes 树节点列表
 * @param query 搜索关键词
 * @returns 需要展开的部门 ID 集合
 */
export function getExpandedIdsForSearch(
  nodes: TreeNode[],
  query: string
): Set<number> {
  const expandedIds = new Set<number>();

  if (!query.trim()) {
    return expandedIds;
  }

  const lowerQuery = query.toLowerCase();

  function collectExpandedIds(node: TreeNode): boolean {
    // 检查当前节点是否匹配
    const nameMatch = node.name.toLowerCase().includes(lowerQuery);
    const positionMatch = node.position?.toLowerCase().includes(lowerQuery);

    // 检查子节点
    let hasMatchInChildren = false;
    if (node.children) {
      for (const child of node.children) {
        if (collectExpandedIds(child)) {
          hasMatchInChildren = true;
        }
      }
    }

    // 如果子节点匹配，则当前部门需要展开
    if (hasMatchInChildren && node.type === 'department') {
      expandedIds.add(node.id);
    }

    return nameMatch || positionMatch || hasMatchInChildren;
  }

  nodes.forEach(collectExpandedIds);
  return expandedIds;
}

/**
 * 获取所有部门 ID（用于全部展开）
 */
export function getAllDepartmentIds(nodes: TreeNode[]): number[] {
  const ids: number[] = [];

  function collect(node: TreeNode) {
    if (node.type === 'department') {
      ids.push(node.id);
      if (node.children) {
        node.children.forEach(collect);
      }
    }
  }

  nodes.forEach(collect);
  return ids;
}

/**
 * 根据成员 ID 列表获取需要展开的部门 ID
 */
export function getExpandedIdsForMemberIds(
  nodes: TreeNode[],
  memberIds: Set<number>
): Set<number> {
  const expandedIds = new Set<number>();

  function checkNode(node: TreeNode): boolean {
    if (node.type === 'member') {
      return memberIds.has(node.id);
    }

    if (node.children) {
      const hasSelectedChild = node.children.some(child => checkNode(child));
      if (hasSelectedChild) {
        expandedIds.add(node.id);
      }
      return hasSelectedChild;
    }

    return false;
  }

  nodes.forEach(checkNode);
  return expandedIds;
}

/**
 * 格式化选中成员显示文本
 */
export function formatSelectedMembers(
  selectedIds: number[],
  members: Member[]
): string {
  if (selectedIds.length === 0) {
    return '选择项目成员';
  }

  const selectedMembers = members.filter(m => selectedIds.includes(m.id));

  if (selectedMembers.length === 0) {
    return '选择项目成员';
  }

  if (selectedMembers.length <= 3) {
    return selectedMembers.map(m => m.name).join('、');
  }

  return `${selectedMembers.slice(0, 3).map(m => m.name).join('、')} 等${selectedMembers.length}人`;
}
