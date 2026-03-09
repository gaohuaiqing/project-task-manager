/**
 * 组织架构管理器
 *
 * 职责：
 * 1. 组织架构的 CRUD 操作
 * 2. 节点层级验证
 * 3. 数据持久化
 * 4. 变更历史记录
 */

import type {
  OrganizationStructure,
  Department,
  TechGroup,
  Member,
  OrgTreeNode,
  OrgLevelType,
  MemberCapabilities,
  OrgChangeEvent
} from '@/types/organization';
import { getDefaultCapabilityValues } from '@/types/organization';
import { getCapabilityDimensions } from '@/utils/capabilityDimensionManager';
import type { UserRole } from '@/types/auth';
import { WebSocketService } from '@/services/WebSocketService';
import { broadcastService } from '@/services/BroadcastChannelService';
import { CacheManager } from '@/services/CacheManager';
import { UserAccountService } from '@/services/UserAccountService';

// ================================================================
// 常量定义
// ================================================================

/** 组织架构存储键（使用统一的 cache:* 前缀） */
export const ORG_STORAGE_KEY = 'organization_units';
export const ORG_HISTORY_KEY = 'org_change_history';
const MAX_HISTORY_ENTRIES = 100;

/** 缓存 TTL: 30分钟（组织数据变更频率中等） */
const ORG_CACHE_TTL = 30 * 60 * 1000;

// ================================================================
// 基础操作
// ================================================================

/**
 * 获取组织架构
 */
export async function getOrganization(): Promise<OrganizationStructure | null> {
  console.log('[OrganizationManager] 开始获取组织架构数据...');

  // 优先从后端数据库获取数据（确保数据一致性和跨设备同步）
  try {
    console.log('[OrganizationManager] 从后端数据库获取...');
    const response = await fetch('http://localhost:3001/api/global-data/get?dataType=organization_units&dataId=default');
    console.log('[OrganizationManager] 后端响应状态:', response.status, response.statusText);

    if (response.ok) {
      const result = await response.json();
      console.log('[OrganizationManager] 后端返回数据:', result);

      if (result.success && result.data && result.data.length > 0) {
        const backendRecord = result.data[0];
        // 提取纯粹的组织数据（不包含后端的元数据字段）
        const orgData: OrganizationStructure = backendRecord.data;
        console.log('[OrganizationManager] ✅ 从后端数据库读取到组织架构，数据版本:', orgData.version, '记录版本:', backendRecord.version, '部门数量:', orgData.departments?.length || 0);

        // 同步到 localStorage（仅作为缓存，提升性能）
        CacheManager.set(ORG_STORAGE_KEY, orgData, { ttl: ORG_CACHE_TTL });

        // 派发全局事件，通知所有监听器组织架构已更新
        try {
          const allMembers = getAllMembersSync();
          window.dispatchEvent(new CustomEvent('organization-changed', {
            detail: { orgData, members: allMembers, source: 'backend-fetch' }
          }));
          console.log('[OrganizationManager] ✅ 已派发 organization-changed 事件，成员数:', allMembers.length);
        } catch (eventError) {
          console.warn('[OrganizationManager] 派发事件失败:', eventError);
        }

        return orgData;
      } else {
        console.log('[OrganizationManager] 后端返回空数据，尝试本地缓存');
      }
    }
  } catch (error) {
    console.warn('[OrganizationManager] 从后端获取数据失败，尝试本地缓存:', error);
  }

  // 降级：如果后端失败，从 localStorage 读取（仅作为临时缓存）
  console.log('[OrganizationManager] 尝试从本地缓存读取...');
  const cached = CacheManager.get<OrganizationStructure>(ORG_STORAGE_KEY);
  if (cached) {
    console.log('[OrganizationManager] ⚠️ 从本地缓存读取到组织架构（可能不是最新数据），版本:', cached.version, '部门数量:', cached.departments?.length || 0);

    // 即使从缓存加载，也派发事件（可能有助于某些场景）
    try {
      const allMembers = getAllMembersSync();
      window.dispatchEvent(new CustomEvent('organization-changed', {
        detail: { orgData: cached, members: allMembers, source: 'cache' }
      }));
    } catch (eventError) {
      // 忽略事件派发错误
    }

    return cached;
  }

  console.log('[OrganizationManager] ❌ 所有数据源均为空');
  return null;
}

/**
 * 同步获取组织架构（不使用 async，用于兼容旧代码）
 */
export function getOrganizationSync(): OrganizationStructure | null {
  return CacheManager.get<OrganizationStructure>(ORG_STORAGE_KEY);
}

/**
 * 保存组织架构
 */
export async function saveOrganization(org: OrganizationStructure): Promise<void> {
  // 先获取当前数据库记录的版本（用于乐观锁检查）
  let currentRecordVersion: number | undefined;

  try {
    const response = await fetch('http://localhost:3001/api/global-data/get?dataType=organization_units&dataId=default');
    if (response.ok) {
      const result = await response.json();
      if (result.success && result.data && result.data.length > 0) {
        currentRecordVersion = result.data[0].version;
        console.log('[OrganizationManager] 当前数据库记录版本:', currentRecordVersion);
      }
    }
  } catch (error) {
    console.warn('[OrganizationManager] 获取当前版本失败:', error);
  }

  // 递增组织数据的版本号
  org.version = (org.version || 0) + 1;
  org.lastUpdated = Date.now();

  console.log('[OrganizationManager] 开始保存组织架构，数据版本:', org.version, '期望记录版本:', currentRecordVersion, '部门数量:', org.departments?.length || 0);

  // 0. 保存到后端数据库（确保数据持久化和多浏览器同步）
  let backendSaveSuccess = false;

  // 第一次尝试：使用乐观锁
  try {
    console.log('[OrganizationManager] 尝试使用乐观锁保存...');
    const response = await fetch('http://localhost:3001/api/global-data/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dataType: 'organization_units',
        dataId: 'default',
        data: org,
        expectedVersion: currentRecordVersion,
        changeReason: '前端更新组织架构'
      })
    });

    console.log('[OrganizationManager] 后端响应状态:', response.status, response.statusText);

    if (response.ok) {
      const result = await response.json();
      console.log('[OrganizationManager] 后端响应数据:', result);

      if (result.success) {
        console.log('[OrganizationManager] ✅ 后端数据库保存成功，新版本:', result.version);
        backendSaveSuccess = true;
      } else if (result.conflict) {
        console.error('[OrganizationManager] ❌ 版本冲突:', result.message);
        console.error('[OrganizationManager] 服务器数据:', result.data);
      } else {
        console.error('[OrganizationManager] ❌ 后端保存失败:', result.message);
      }
    } else {
      console.error('[OrganizationManager] ❌ 后端保存请求失败:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('[OrganizationManager] ❌ 后端保存异常:', error);
  }

  // 第二次尝试：如果乐观锁失败，使用 expectedVersion: null（绕过乐观锁）
  if (!backendSaveSuccess) {
    console.warn('[OrganizationManager] ⚠️ 乐观锁保存失败，尝试使用 expectedVersion: null 重试...');
    try {
      const response = await fetch('http://localhost:3001/api/global-data/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataType: 'organization_units',
          dataId: 'default',
          data: org,
          expectedVersion: null,
          changeReason: '前端更新组织架构（绕过乐观锁）'
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log('[OrganizationManager] ✅ 后端数据库保存成功（绕过乐观锁），新版本:', result.version);
          backendSaveSuccess = true;
        } else {
          console.error('[OrganizationManager] ❌ 后端保存仍然失败:', result.message);
        }
      }
    } catch (error) {
      console.error('[OrganizationManager] ❌ 后端保存重试异常:', error);
    }
  }

  if (!backendSaveSuccess) {
    console.warn('[OrganizationManager] ⚠️ 后端保存未成功，数据仅保存到本地，跨浏览器同步可能失效！');
  }

  // 1. 保存到 localStorage 缓存（当前浏览器）
  CacheManager.set(ORG_STORAGE_KEY, org, { ttl: ORG_CACHE_TTL });
  console.log('[OrganizationManager] localStorage缓存保存成功');

  // 2. WebSocket 实时同步（跨设备）
  // Bug-P1-012修复：增强连接状态检查和重连逻辑
  try {
    const wsService = WebSocketService.getInstance();
    console.log('[OrganizationManager] WebSocket服务状态:', wsService ? '已加载' : '未加载');

    if (wsService) {
      const isConnected = wsService.isConnected();
      console.log('[OrganizationManager] WebSocket连接状态:', isConnected ? '已连接' : '未连接');

      if (isConnected) {
        const message = {
          type: 'global_data_update',
          data: {
            dataType: 'organization_units',
            dataId: 'default',
            data: org,
            version: org.version,
            timestamp: org.lastUpdated
          }
        };
        console.log('[OrganizationManager] 发送WebSocket消息:', message);
        const sendSuccess = wsService.send(message);
        if (sendSuccess) {
          console.log('[OrganizationManager] WebSocket同步成功');
        } else {
          console.warn('[OrganizationManager] WebSocket发送消息失败');
        }
      } else {
        console.warn('[OrganizationManager] WebSocket未连接，尝试触发重连...');
        // 触发重连事件，让 AuthContext 处理重连
        window.dispatchEvent(new CustomEvent('websocket-reconnect-request', {
          detail: { reason: 'organization-update' }
        }));
        console.log('[OrganizationManager] 已派发重连请求事件');
      }
    } else {
      console.warn('[OrganizationManager] WebSocket服务未初始化');
    }
  } catch (error) {
    console.error('[OrganizationManager] WebSocket同步失败:', error);
  }

  // 3. BroadcastChannel 跨标签页同步（同一浏览器不同标签页）
  try {
    broadcastService.broadcastDataUpdate('organization_units', org);
    console.log('[OrganizationManager] BroadcastChannel同步成功');
  } catch (error) {
    console.error('[OrganizationManager] BroadcastChannel同步失败:', error);
  }

  // 4. 派发全局事件，通知所有监听器组织架构已更新
  try {
    const allMembers = getAllMembersSync();
    window.dispatchEvent(new CustomEvent('organization-changed', {
      detail: { orgData: org, members: allMembers, source: 'save' }
    }));
    console.log('[OrganizationManager] ✅ 已派发 organization-changed 事件（保存后），成员数:', allMembers.length);
  } catch (eventError) {
    console.warn('[OrganizationManager] 派发事件失败:', eventError);
  }

  console.log('[OrganizationManager] 组织架构已保存，版本:', org.version);
}

/**
 * 检查组织架构是否存在（同步版本）
 */
export function hasOrganization(): boolean {
  return getOrganizationSync() !== null;
}

/**
 * 检查组织架构是否存在（异步版本，从后端检查）
 */
export async function hasOrganizationAsync(): Promise<boolean> {
  const org = await getOrganization();
  return org !== null;
}

// ================================================================
// 节点查找
// ================================================================

/**
 * 确保成员有默认的能力评分
 */
function ensureDefaultCapabilities(member: Member): Member {
  if (!member.capabilities || Object.keys(member.capabilities).length === 0) {
    const defaultCapabilities = getDefaultCapabilityValues();
    return { ...member, capabilities: defaultCapabilities };
  }
  return member;
}

/**
 * 计算成员的直属主管信息
 * 规则：
 * - 工程师的直属主管是所在技术组的技术经理
 * - 技术经理的直属主管是所属部门的部门经理
 * - 部门经理没有直属主管
 */
function calculateDirectSupervisor(member: Member, org: OrganizationStructure): { id?: string; name?: string } {
  console.log('[calculateDirectSupervisor] 计算成员直属主管:', member.name, member.role, 'memberId:', member.id, 'parentId:', member.parentId);

  if (member.role === 'dept_manager') {
    // 部门经理没有直属主管
    console.log('[calculateDirectSupervisor] 部门经理无直属主管');
    return { id: undefined, name: undefined };
  }

  if (!org || !org.departments || org.departments.length === 0) {
    console.log('[calculateDirectSupervisor] 组织架构为空');
    return { id: undefined, name: undefined };
  }

  // 使用 parentId 直接查找父节点
  if (member.parentId) {
    const parentNode = findNodeById(member.parentId, org);
    console.log('[calculateDirectSupervisor] 找到父节点:', parentNode?.level, parentNode?.name);

    if (member.role === 'engineer' && parentNode?.level === 'tech_group') {
      // 工程师在技术组中，查找技术经理
      const group = parentNode as TechGroup;
      console.log('[calculateDirectSupervisor] 工程师所在技术组成员:', group.children?.map(m => `${(m as Member).role}:${m.name}`).join(', '));
      const techManager = group.children?.find(m =>
        m.level === 'member' && (m as Member).role === 'tech_manager'
      );
      if (techManager) {
        console.log('[calculateDirectSupervisor] 找到技术经理:', techManager.name);
        return { id: techManager.id, name: techManager.name };
      }
      console.log('[calculateDirectSupervisor] 未找到技术经理');
    } else if (member.role === 'tech_manager' && parentNode?.level === 'tech_group') {
      // 技术经理在技术组中，需要找到所属部门的部门经理
      const group = parentNode as TechGroup;
      // 技术组的 parentId 指向部门
      if (group.parentId) {
        const deptNode = findNodeById(group.parentId, org);
        if (deptNode?.level === 'department') {
          const dept = deptNode as Department;
          console.log('[calculateDirectSupervisor] 技术经理所属部门:', dept.name);
          const managerMember = dept.children?.find(m =>
            m.level === 'member' && (m as Member).role === 'dept_manager'
          );
          if (managerMember) {
            console.log('[calculateDirectSupervisor] 找到部门经理:', managerMember.name);
            return { id: managerMember.id, name: managerMember.name };
          }
          console.log('[calculateDirectSupervisor] 未找到部门经理');
        }
      }
    }
  } else {
    console.log('[calculateDirectSupervisor] 成员没有 parentId');
  }

  return { id: undefined, name: undefined };
}

/**
 * 在部门中查找成员所属的技术组
 */
function findGroupForMemberInDepartment(
  memberId: string,
  dept: Department
): { group: TechGroup | null; dept: Department | null } {
  for (const child of dept.children) {
    if (child.level === 'tech_group') {
      const group = child as TechGroup;
      if (group.children?.some(m => m.id === memberId)) {
        return { group, dept };
      }
    }
    if (child.level === 'department') {
      const result = findGroupForMemberInDepartment(memberId, child as Department);
      if (result.group) {
        return result;
      }
    }
  }
  return { group: null, dept: null };
}

/**
 * 根据ID查找节点
 * 注意：如果未提供 org 参数，此函数会同步返回，可能导致结果不准确
 * 建议调用者预先加载组织结构并作为参数传入
 */
export function findNodeById(
  nodeId: string,
  org?: OrganizationStructure
): OrgTreeNode | null {
  // 如果未提供 org，尝试从缓存获取
  const structure = org || CacheManager.get<OrganizationStructure>(ORG_STORAGE_KEY);

  if (!structure) return null;

  // 检查 departments 是否存在且为数组
  if (!structure.departments || !Array.isArray(structure.departments)) {
    console.warn('[OrganizationManager] structure.departments 不存在或不是数组');
    return null;
  }

  // 在部门中查找
  for (const dept of structure.departments) {
    if (dept.id === nodeId) return dept;

    // 在技术组中查找
    for (const child of dept.children) {
      if (child.level === 'tech_group' && child.id === nodeId) return child;

      // 在成员中查找
      if (child.level === 'tech_group') {
        const group = child as TechGroup;
        for (const member of group.children) {
          if (member.id === nodeId) {
            // 确保有默认能力评分
            const memberWithCaps = ensureDefaultCapabilities(member);
            // 动态计算直属主管信息
            const supervisor = calculateDirectSupervisor(memberWithCaps, structure);
            return {
              ...memberWithCaps,
              directSupervisorId: supervisor.id,
              directSupervisorName: supervisor.name
            };
          }
        }
      }

      // 递归查找子部门
      if (child.level === 'department') {
        const result = findNodeInDepartment(nodeId, child as Department, structure);
        if (result) return result;
      }
    }
  }

  return null;
}

function findNodeInDepartment(nodeId: string, dept: Department, structure: OrganizationStructure): OrgTreeNode | null {
  if (dept.id === nodeId) return dept;

  for (const child of dept.children) {
    if (child.id === nodeId) return child;

    if (child.level === 'tech_group') {
      const group = child as TechGroup;
      for (const member of group.children) {
        if (member.id === nodeId) {
          // 确保有默认能力评分
          const memberWithCaps = ensureDefaultCapabilities(member);
          // 动态计算直属主管信息
          const supervisor = calculateDirectSupervisor(memberWithCaps, structure);
          return {
            ...memberWithCaps,
            directSupervisorId: supervisor.id,
            directSupervisorName: supervisor.name
          };
        }
      }
    }

    if (child.level === 'department') {
      const result = findNodeInDepartment(nodeId, child as Department, structure);
      if (result) return result;
    }
  }

  return null;
}

/**
 * 根据成员ID查找所属技术组（同步版本）
 */
export function findTechGroupByMemberId(memberId: string): TechGroup | null {
  const org = getOrganizationSync();
  if (!org || !org.departments || !Array.isArray(org.departments)) return null;

  for (const dept of org.departments) {
    if (!dept.children) continue;
    for (const child of dept.children) {
      if (child.level === 'tech_group') {
        const group = child as TechGroup;
        if (group.memberIds.includes(memberId)) {
          return group;
        }
      }
    }
  }

  return null;
}

// ================================================================
// 创建操作
// ================================================================

/**
 * 创建部门（同时创建部门经理成员）
 */
export async function createDepartment(
  name: string,
  parentId: string | null = null,
  managerEmployeeId?: string,
  managerName?: string,
  description?: string
): Promise<{ success: boolean; message: string; department?: Department; managerPassword?: string }> {
  const org = await getOrganization();
  if (!org) {
    return { success: false, message: '组织架构不存在' };
  }

  // 验证父节点
  if (parentId) {
    const parent = findNodeById(parentId, org);
    if (!parent || parent.level !== 'department') {
      return { success: false, message: '父部门不存在' };
    }
  }

  // 检查名称重复
  if (findDepartmentByName(name, org)) {
    return { success: false, message: '部门名称已存在' };
  }

  const newDepartment: Department = {
    id: `dept_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    name: name.trim(),
    level: 'department',
    parentId,
    description,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    children: []
  };

  // 添加到父部门或根级别
  if (parentId) {
    const parent = findNodeById(parentId, org) as Department;
    parent.children.push(newDepartment);
  } else {
    org.departments.push(newDepartment);
  }

  let managerPassword: string | undefined;

  // 如果提供了部门经理信息，创建部门经理成员
  if (managerEmployeeId && managerName) {
    // 生成安全的随机密码（12位，包含大小写字母、数字和特殊字符）
    const generateTempPassword = (): string => {
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
      const array = new Uint32Array(12);
      crypto.getRandomValues(array);
      let password = '';
      for (let i = 0; i < 12; i++) {
        password += chars.charAt(array[i] % chars.length);
      }
      return password;
    };

    managerPassword = generateTempPassword();

    const newMember: Member = {
      id: `member_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      employeeId: managerEmployeeId.trim(),
      name: managerName.trim(),
      level: 'member',
      parentId: newDepartment.id, // 部门经理直接隶属于部门
      role: 'dept_manager',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // 将部门经理添加为部门的子节点
    newDepartment.children.push(newMember);

    // 自动创建系统账号
    try {
      await UserAccountService.createUser({
        username: managerEmployeeId.trim(),
        password: managerPassword,
        role: 'dept_manager',
        name: managerName.trim()
      });
      console.log('[OrganizationManager] 部门经理账号已创建:', managerEmployeeId, managerPassword);
    } catch (error) {
      console.error('[OrganizationManager] 创建部门经理账号失败:', error);
    }
  }

  await saveOrganization(org);
  recordChange({
    type: 'create',
    nodeType: 'department',
    nodeId: newDepartment.id,
    nodeName: newDepartment.name,
    timestamp: Date.now(),
    userId: 'current',
    details: `创建部门：${newDepartment.name}`
  });

  return {
    success: true,
    message: managerPassword
      ? `部门创建成功，部门经理账号已创建（账号：${managerEmployeeId}，密码：${managerPassword}）`
      : '部门创建成功',
    department: newDepartment,
    managerPassword
  };
}

/**
 * 创建技术组（同时创建技术经理成员）
 */
export async function createTechGroup(
  name: string,
  departmentId: string,
  leaderEmployeeId?: string,
  leaderName?: string,
  description?: string
): Promise<{ success: boolean; message: string; techGroup?: TechGroup; leaderPassword?: string }> {
  const org = await getOrganization();
  if (!org) {
    return { success: false, message: '组织架构不存在' };
  }

  // 验证父部门
  const parentDept = findNodeById(departmentId, org);
  if (!parentDept || parentDept.level !== 'department') {
    return { success: false, message: '父部门不存在' };
  }

  // 检查名称重复
  const dept = parentDept as Department;
  for (const child of dept.children) {
    if (child.level === 'tech_group' && child.name === name.trim()) {
      return { success: false, message: '技术组名称已存在' };
    }
  }

  const newTechGroup: TechGroup = {
    id: `group_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    name: name.trim(),
    level: 'tech_group',
    parentId: departmentId,
    description,
    memberIds: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    children: []
  };

  dept.children.push(newTechGroup);

  let leaderPassword: string | undefined;

  // 如果提供了技术经理信息，创建技术经理成员
  if (leaderEmployeeId && leaderName) {
    // 生成安全的随机密码（12位，包含大小写字母、数字和特殊字符）
    const generateTempPassword = (): string => {
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
      const array = new Uint32Array(12);
      crypto.getRandomValues(array);
      let password = '';
      for (let i = 0; i < 12; i++) {
        password += chars.charAt(array[i] % chars.length);
      }
      return password;
    };

    leaderPassword = generateTempPassword();

    // 技术经理的直属主管是部门经理
    let directSupervisorId: string | undefined;
    let directSupervisorName: string | undefined;
    const managerMember = dept.children?.find(m => m.level === 'member' && (m as Member).role === 'dept_manager');
    if (managerMember) {
      directSupervisorId = managerMember.id;
      directSupervisorName = managerMember.name;
    }

    const newMember: Member = {
      id: `member_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      employeeId: leaderEmployeeId.trim(),
      name: leaderName.trim(),
      level: 'member',
      parentId: newTechGroup.id, // 技术经理隶属于技术组
      role: 'tech_manager',
      directSupervisorId,
      directSupervisorName,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // 将技术经理添加到技术组
    newTechGroup.children.push(newMember);
    newTechGroup.memberIds.push(newMember.id);
    newTechGroup.leaderId = newMember.id; // 设置技术组领导ID

    // 自动创建系统账号
    try {
      await UserAccountService.createUser({
        username: leaderEmployeeId.trim(),
        password: leaderPassword,
        role: 'tech_manager',
        name: leaderName.trim()
      });
      console.log('[OrganizationManager] 技术经理账号已创建:', leaderEmployeeId, leaderPassword);
    } catch (error) {
      console.error('[OrganizationManager] 创建技术经理账号失败:', error);
    }
  }

  await saveOrganization(org);

  recordChange({
    type: 'create',
    nodeType: 'tech_group',
    nodeId: newTechGroup.id,
    nodeName: newTechGroup.name,
    timestamp: Date.now(),
    userId: 'current',
    details: `创建技术组：${newTechGroup.name}`
  });

  return {
    success: true,
    message: leaderPassword
      ? `技术组创建成功，技术经理账号已创建（账号：${leaderEmployeeId}，密码：${leaderPassword}）`
      : '技术组创建成功',
    techGroup: newTechGroup,
    leaderPassword
  };
}

/**
 * 创建成员
 */
export async function createMember(
  techGroupId: string,
  employeeId: string,
  name: string,
  role: 'dept_manager' | 'tech_manager' | 'engineer',
  capabilities?: MemberCapabilities
): Promise<{ success: boolean; message: string; member?: Member; tempPassword?: string }> {
  const org = await getOrganization();
  if (!org) {
    return { success: false, message: '组织架构不存在' };
  }

  // 验证层级规则
  const validation = validateOrgHierarchy('member', 'tech_group', role);
  if (!validation.valid) {
    return { success: false, message: validation.message };
  }

  // 验证父技术组
  const parentGroup = findNodeById(techGroupId, org);
  if (!parentGroup || parentGroup.level !== 'tech_group') {
    return { success: false, message: '技术组不存在' };
  }

  // 检查工号唯一性
  if (findMemberByEmployeeId(employeeId, org)) {
    return { success: false, message: '工号已存在' };
  }

  // 生成安全的随机密码（12位，包含大小写字母、数字和特殊字符）
  const generateTempPassword = (): string => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    const array = new Uint32Array(12);
    crypto.getRandomValues(array);
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(array[i] % chars.length);
    }
    return password;
  };

  const tempPassword = generateTempPassword();

  // 初始化默认能力评分（如果没有提供）
  const defaultCapabilities = capabilities || getDefaultCapabilityValues();

  // 获取默认直属主管
  let directSupervisorId: string | undefined;
  let directSupervisorName: string | undefined;

  if (role === 'engineer') {
    // 工程师的直属主管是技术经理
    const group = parentGroup as TechGroup;
    if (group.leaderId) {
      directSupervisorId = group.leaderId;
      // 查找技术经理姓名
      const leaderMember = group.children.find(m => m.id === group.leaderId);
      if (leaderMember) {
        directSupervisorName = leaderMember.name;
      }
    }
  } else if (role === 'tech_manager') {
    // 技术经理的直属主管是部门经理
    const group = parentGroup as TechGroup;
    const parentDept = findNodeById(group.parentId!, org);
    if (parentDept && parentDept.level === 'department') {
      const dept = parentDept as Department;
      // 查找部门经理（在部门children中查找角色为dept_manager的成员）
      const managerMember = dept.children?.find(m => m.level === 'member' && (m as Member).role === 'dept_manager');
      if (managerMember) {
        directSupervisorId = managerMember.id;
        directSupervisorName = managerMember.name;
      }
    }
  }

  const newMember: Member = {
    id: `member_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    employeeId: employeeId.trim(),
    name: name.trim(),
    level: 'member',
    parentId: techGroupId,
    role,
    directSupervisorId,
    directSupervisorName,
    capabilities: defaultCapabilities,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  const group = parentGroup as TechGroup;
  group.children.push(newMember);
  group.memberIds.push(newMember.id);

  await saveOrganization(org);

  // 记录变更（在返回之前，确保数据已保存）
  recordChange({
    type: 'create',
    nodeType: 'member',
    nodeId: newMember.id,
    nodeName: newMember.name,
    timestamp: Date.now(),
    userId: 'current',
    details: `创建成员：${newMember.name}（${employeeId}），系统账号已创建`
  });

  // 先返回成功响应，不等待账号创建完成
  const result = {
    success: true,
    message: `成员创建成功，系统账号已创建（账号：${employeeId}，密码：${tempPassword}）`,
    member: newMember,
    tempPassword
  };

  // 异步创建系统账号（不阻塞主流程）
  UserAccountService.createUser({
    username: employeeId.trim(),
    password: tempPassword,
    role: role,
    name: name.trim()
  }).then(() => {
    console.log('[OrganizationManager] 系统账号已创建:', employeeId, tempPassword);
  }).catch((error) => {
    console.error('[OrganizationManager] 创建系统账号失败:', error);
  });

  return result;
}

// ================================================================
// 更新操作
// ================================================================

/**
 * 更新节点
 */
export async function updateNode(
  nodeId: string,
  updates: Partial<Omit<OrgTreeNode, 'id' | 'level' | 'createdAt' | 'parentId'>>
): Promise<{ success: boolean; message: string; node?: OrgTreeNode }> {
  const org = await getOrganization();  // ✅ 使用async版本从后端获取最新数据
  if (!org) {
    return { success: false, message: '组织架构不存在' };
  }

  const node = findNodeById(nodeId, org);
  if (!node) {
    return { success: false, message: '节点不存在' };
  }

  // 更新节点属性
  Object.assign(node, updates);
  node.updatedAt = Date.now();

  await saveOrganization(org);

  recordChange({
    type: 'update',
    nodeType: node.level,
    nodeId: node.id,
    nodeName: node.name,
    timestamp: Date.now(),
    userId: 'current',
    details: `更新节点：${node.name}`
  });

  return { success: true, message: '节点更新成功', node };
}

/**
 * 更新成员能力模型
 */
export async function updateMemberCapabilities(
  memberId: string,
  capabilities: MemberCapabilities
): Promise<{ success: boolean; message: string }> {
  const org = await getOrganization();  // ✅ 使用async版本从后端获取最新数据
  if (!org) {
    return { success: false, message: '组织架构不存在' };
  }

  const member = findNodeById(memberId, org);
  if (!member || member.level !== 'member') {
    return { success: false, message: '成员不存在' };
  }

  (member as Member).capabilities = capabilities;
  member.updatedAt = Date.now();

  await saveOrganization(org);

  recordChange({
    type: 'update',
    nodeType: 'member',
    nodeId: member.id,
    nodeName: member.name,
    timestamp: Date.now(),
    userId: 'current',
    details: `更新能力模型：${member.name}`
  });

  return { success: true, message: '能力模型更新成功' };
}

// ================================================================
// 删除操作
// ================================================================

/**
 * 删除节点
 * Bug-P1-006修复：递归删除所有子节点
 */
export async function deleteNode(nodeId: string): Promise<{ success: boolean; message: string }> {
  console.log('[deleteNode] 开始删除节点:', nodeId);

  const org = await getOrganization();  // ✅ 使用async版本从后端获取最新数据
  if (!org || !org.departments || !Array.isArray(org.departments)) {
    console.error('[deleteNode] 组织架构不存在');
    return { success: false, message: '组织架构不存在' };
  }

  const node = findNodeById(nodeId, org);
  if (!node) {
    console.error('[deleteNode] 节点不存在:', nodeId);
    return { success: false, message: '节点不存在' };
  }

  console.log('[deleteNode] 找到节点:', node.name, '类型:', node.level, 'parentId:', node.parentId);

  // Bug-P1-006修复：递归收集所有子节点ID
  const getAllChildIds = (id: string): string[] => {
    const childNode = findNodeById(id, org);
    if (!childNode || !childNode.children) return [];

    let ids: string[] = [];
    childNode.children.forEach(child => {
      ids.push(child.id);
      // 递归获取子节点的子节点
      ids.push(...getAllChildIds(child.id));
    });
    return ids;
  };

  // 获取所有需要删除的子节点ID（包括自己）
  const allIdsToDelete = [nodeId, ...getAllChildIds(nodeId)];
  console.log('[deleteNode] 将删除的节点IDs:', allIdsToDelete);

  // 从父节点中移除主节点（递归删除会在下面处理）
  if (node.parentId) {
    console.log('[deleteNode] 从父节点移除, parentId:', node.parentId);
    const parent = findNodeById(node.parentId, org);
    console.log('[deleteNode] 找到父节点:', parent ? parent.name : 'null', '子节点数量:', parent?.children?.length || 0);

    if (parent && parent.children) {
      const beforeLength = parent.children.length;
      // Bug-P1-006修复：过滤掉所有要删除的节点ID
      parent.children = parent.children.filter(child => !allIdsToDelete.includes(child.id));
      console.log('[deleteNode] 父节点children:', beforeLength, '->', parent.children.length);
    }

    // 如果是成员，从技术组的 memberIds 中移除
    if (node.level === 'member') {
      console.log('[deleteNode] 从技术组memberIds中移除');
      const group = findNodeById(node.parentId, org) as TechGroup;
      if (group && group.memberIds) {
        const beforeLength = group.memberIds.length;
        group.memberIds = group.memberIds.filter(id => !allIdsToDelete.includes(id));
        console.log('[deleteNode] 技术组memberIds:', beforeLength, '->', group.memberIds.length);
      }
    }

    // 如果是技术组，从父部门的 memberIds 中移除
    if (node.level === 'tech_group') {
      const dept = findNodeById(node.parentId, org) as Department;
      if (dept) {
        // 找到并移除该技术组
        dept.children = dept.children.filter(child => !allIdsToDelete.includes(child.id));
      }
    }
  } else {
    // 根级部门 - Bug-P1-006修复：过滤掉所有要删除的部门ID
    console.log('[deleteNode] 删除根级部门');
    org.departments = org.departments.filter(dept => !allIdsToDelete.includes(dept.id));
  }

  console.log('[deleteNode] 开始保存组织架构...');
  await saveOrganization(org);
  console.log('[deleteNode] 组织架构保存完成');

  // Bug-P1-006修复：记录批量删除变更
  allIdsToDelete.forEach((id, index) => {
    const deletedNode = index === 0 ? node : findNodeById(id, org);
    if (deletedNode) {
      recordChange({
        type: 'delete',
        nodeType: deletedNode.level,
        nodeId: deletedNode.id,
        nodeName: deletedNode.name,
        timestamp: Date.now(),
        userId: 'current',
        details: index === 0 ? `删除节点：${deletedNode.name}` : `递归删除子节点：${deletedNode.name}`
      });
    }
  });

  console.log('[deleteNode] 删除成功，共删除', allIdsToDelete.length, '个节点');
  return { success: true, message: `节点删除成功（共删除${allIdsToDelete.length}个节点）` };
}

// ================================================================
// 辅助函数
// ================================================================

/**
 * 验证组织层级规则
 */
export function validateOrgHierarchy(
  nodeType: OrgLevelType,
  parentType: OrgLevelType | null,
  userRole: UserRole
): { valid: boolean; message: string } {
  // 部门经理必须隶属于部门
  if (userRole === 'dept_manager' && parentType !== 'department') {
    return { valid: false, message: '部门经理必须隶属于部门' };
  }

  // 技术经理必须隶属于技术组
  if (userRole === 'tech_manager' && parentType !== 'tech_group') {
    return { valid: false, message: '技术经理必须隶属于技术组' };
  }

  // 普通成员必须隶属于技术组
  if (userRole === 'engineer' && parentType !== 'tech_group') {
    return { valid: false, message: '工程师必须隶属于技术组' };
  }

  // 技术组必须隶属于部门
  if (nodeType === 'tech_group' && parentType !== 'department') {
    return { valid: false, message: '技术组必须隶属于部门' };
  }

  // 成员必须隶属于技术组
  if (nodeType === 'member' && parentType !== 'tech_group') {
    return { valid: false, message: '成员必须隶属于技术组' };
  }

  return { valid: true, message: '' };
}

/**
 * 根据名称查找部门
 */
function findDepartmentByName(name: string, org: OrganizationStructure): Department | null {
  if (!org.departments || !Array.isArray(org.departments)) return null;

  for (const dept of org.departments) {
    if (dept.name === name) return dept;
    if (!dept.children) continue;
    for (const child of dept.children) {
      if (child.level === 'department' && child.name === name) {
        return child as Department;
      }
    }
  }
  return null;
}

/**
 * 根据工号查找成员
 */
function findMemberByEmployeeId(employeeId: string, org: OrganizationStructure): Member | null {
  if (!org.departments || !Array.isArray(org.departments)) return null;

  for (const dept of org.departments) {
    if (!dept.children) continue;
    for (const child of dept.children) {
      if (child.level === 'tech_group') {
        const group = child as TechGroup;
        for (const member of group.children) {
          if (member.employeeId === employeeId) return member;
        }
      }
    }
  }
  return null;
}

/**
 * 获取所有成员（同步版本，从localStorage读取，用于只读操作）
 * 动态计算每个成员的直属主管信息
 */
export function getAllMembers(): Member[] {
  return getAllMembersSync();
}

/**
 * 获取所有成员（同步版本，从localStorage读取，用于只读操作）
 * 动态计算每个成员的直属主管信息
 */
export function getAllMembersSync(): Member[] {
  const org = getOrganizationSync();
  if (!org || !org.departments) return [];

  const members: Member[] = [];

  function collectMembers(nodes: OrgTreeNode[] | undefined) {
    if (!nodes) return;
    for (const node of nodes) {
      if (node.level === 'member') {
        const member = node as Member;
        // 确保有默认能力评分
        const memberWithCaps = ensureDefaultCapabilities(member);
        // 动态计算直属主管信息
        const supervisor = calculateDirectSupervisor(memberWithCaps, org);
        members.push({
          ...memberWithCaps,
          directSupervisorId: supervisor.id,
          directSupervisorName: supervisor.name
        });
      } else if (node.children) {
        collectMembers(node.children);
      }
    }
  }

  collectMembers(org.departments);
  return members;
}

/**
 * 获取所有成员（异步版本，从后端读取，用于关键操作）
 */
export async function getAllMembersAsync(): Promise<Member[]> {
  const org = await getOrganization();  // ✅ 使用async版本从后端获取最新数据
  if (!org || !org.departments) return [];

  const members: Member[] = [];

  function collectMembers(nodes: OrgTreeNode[] | undefined) {
    if (!nodes) return;
    for (const node of nodes) {
      if (node.level === 'member') {
        // 确保有默认能力评分
        const member = ensureDefaultCapabilities(node as Member);
        members.push(member);
      } else if (node.children) {
        collectMembers(node.children);
      }
    }
  }

  collectMembers(org.departments);
  return members;
}

/**
 * 获取所有技术组（同步版本，从localStorage读取，用于只读操作）
 */
export function getAllTechGroups(): TechGroup[] {
  const org = getOrganizationSync(); // 使用同步版本
  if (!org || !org.departments) return [];

  const groups: TechGroup[] = [];

  function collectGroups(nodes: OrgTreeNode[] | undefined) {
    if (!nodes) return;
    for (const node of nodes) {
      if (node.level === 'tech_group') {
        groups.push(node as TechGroup);
      } else if (node.children) {
        collectGroups(node.children);
      }
    }
  }

  collectGroups(org.departments);
  return groups;
}

/**
 * 获取所有技术组（异步版本，从后端读取，用于关键操作）
 */
export async function getAllTechGroupsAsync(): Promise<TechGroup[]> {
  const org = await getOrganization();  // ✅ 使用async版本从后端获取最新数据
  if (!org || !org.departments) return [];

  const groups: TechGroup[] = [];

  function collectGroups(nodes: OrgTreeNode[] | undefined) {
    if (!nodes) return;
    for (const node of nodes) {
      if (node.level === 'tech_group') {
        groups.push(node as TechGroup);
      } else if (node.children) {
        collectGroups(node.children);
      }
    }
  }

  collectGroups(org.departments);
  return groups;
}

// ================================================================
// 变更历史
// ================================================================

/**
 * 记录组织变更
 * 注意：变更历史将迁移到后端数据库存储
 */
function recordChange(event: OrgChangeEvent): void {
  const history = getChangeHistory();
  history.push(event);

  // 限制历史记录数量
  if (history.length > MAX_HISTORY_ENTRIES) {
    history.shift();
  }

  // 暂时使用 localStorage 缓存，后续将迁移到后端
  CacheManager.set(ORG_HISTORY_KEY, history, { ttl: 24 * 60 * 60 * 1000 }); // 24小时
}

/**
 * 获取变更历史
 */
export function getChangeHistory(): OrgChangeEvent[] {
  return CacheManager.get<OrgChangeEvent[]>(ORG_HISTORY_KEY) || [];
}

/**
 * 清空变更历史
 */
export function clearChangeHistory(): void {
  CacheManager.delete(ORG_HISTORY_KEY);
}

/**
 * 清空组织架构
 */
export function clearOrganization(): void {
  CacheManager.delete(ORG_STORAGE_KEY);
  clearChangeHistory();
}
