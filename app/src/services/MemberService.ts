/**
 * 统一成员服务
 *
 * 职责：
 * 1. 统一成员数据的加载和缓存
 * 2. 提供成员查询和过滤功能
 * 3. 避免组件中重复的数据加载逻辑
 *
 * @module services/MemberService
 */

import { eventService, onDataChanged } from './EventService';
import { createCacheEntry, isCacheEntryValid, updateCacheEntryAccess, CACHE_TTL } from './CacheConfig';
import type { Member, MemberQueryParams, MemberStatistics, DisplayMember } from '../types/member';
import type { OrgMember } from '../types/organization';
import { getOrganizationSync, getAllMembersAsync as getOrgAllMembersAsync } from '../utils/organizationManager';

// ==================== 缓存管理 ====================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expireTime: number;
  accessCount: number;
  lastAccessTime: number;
}

// 成员缓存（60秒 TTL）
const MEMBERS_CACHE_KEY = 'members_list';
const MEMBERS_CACHE_TTL = CACHE_TTL.MEDIUM;

// ==================== 主服务类 ====================

class MemberService {
  private membersCache: CacheEntry<Member[]> | null = null;
  private displayMembersCache: CacheEntry<DisplayMember[]> | null = null;
  private initialized = false;
  private unsubscribe: (() => void) | null = null;

  /**
   * 初始化服务
   */
  initialize() {
    if (this.initialized) return;

    // 订阅组织架构变更事件，自动刷新成员缓存
    this.unsubscribe = onDataChanged('organization_units', () => {
      this.invalidateCache();
      console.log('[MemberService] 组织架构变更，成员缓存已失效');
    });

    this.initialized = true;
    console.log('[MemberService] 成员服务已初始化');
  }

  /**
   * 销毁服务
   */
  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.invalidateCache();
    this.initialized = false;
  }

  /**
   * 获取所有成员
   * @param forceRefresh 是否强制刷新缓存
   */
  async getAllMembers(forceRefresh: boolean = false): Promise<Member[]> {
    // 检查缓存
    if (!forceRefresh && this.membersCache && isCacheEntryValid(this.membersCache)) {
      return updateCacheEntryAccess(this.membersCache).data;
    }

    try {
      // 从组织架构加载成员
      const orgMembers = await getOrgAllMembersAsync();

      // 转换为统一的 Member 类型
      const members = this.convertOrgMembersToMembers(orgMembers);

      // 更新缓存
      this.membersCache = createCacheEntry(members, MEMBERS_CACHE_TTL);

      console.log(`[MemberService] 加载成员列表: ${members.length} 人`);
      return members;
    } catch (error) {
      console.error('[MemberService] 获取成员列表失败:', error);

      // 返回缓存数据（如果有）
      if (this.membersCache) {
        return this.membersCache.data;
      }

      return [];
    }
  }

  /**
   * 获取用于展示的成员列表（轻量级）
   */
  async getDisplayMembers(forceRefresh: boolean = false): Promise<DisplayMember[]> {
    // 检查缓存
    if (!forceRefresh && this.displayMembersCache && isCacheEntryValid(this.displayMembersCache)) {
      return updateCacheEntryAccess(this.displayMembersCache).data;
    }

    try {
      const members = await this.getAllMembers(forceRefresh);

      // 转换为 DisplayMember
      const displayMembers: DisplayMember[] = members.map(member => ({
        id: member.id,
        name: member.name,
        avatar: member.avatar,
        employeeId: member.employeeId,
        role: member.role,
        department: member.departmentName,
        techGroup: member.techGroupName,
        onlineStatus: member.onlineStatus,
      }));

      // 更新缓存
      this.displayMembersCache = createCacheEntry(displayMembers, MEMBERS_CACHE_TTL);

      return displayMembers;
    } catch (error) {
      console.error('[MemberService] 获取展示成员列表失败:', error);
      return [];
    }
  }

  /**
   * 根据 ID 获取成员
   */
  async getMemberById(id: string): Promise<Member | null> {
    const members = await this.getAllMembers();
    return members.find(m => m.id === id) || null;
  }

  /**
   * 根据工号获取成员
   */
  async getMemberByEmployeeId(employeeId: string): Promise<Member | null> {
    const members = await this.getAllMembers();
    return members.find(m => m.employeeId === employeeId) || null;
  }

  /**
   * 查询成员（支持筛选和搜索）
   */
  async queryMembers(params: MemberQueryParams): Promise<Member[]> {
    let members = await this.getAllMembers();

    // 部门筛选
    if (params.departmentId) {
      members = members.filter(m => m.departmentId === params.departmentId);
    }

    // 技术组筛选
    if (params.techGroupId) {
      members = members.filter(m => m.techGroupId === params.techGroupId);
    }

    // 角色筛选
    if (params.role) {
      members = members.filter(m => m.role === params.role);
    }

    // 在线状态筛选
    if (params.onlineStatus) {
      members = members.filter(m => m.onlineStatus === params.onlineStatus);
    }

    // 关键词搜索
    if (params.keyword) {
      const keyword = params.keyword.toLowerCase();
      members = members.filter(m =>
        m.name.toLowerCase().includes(keyword) ||
        m.employeeId.toLowerCase().includes(keyword)
      );
    }

    // 能力筛选
    if (params.capabilityDimension && params.minCapability !== undefined) {
      members = members.filter(m =>
        m.capabilities &&
        (m.capabilities[params.capabilityDimension!] || 0) >= params.minCapability!
      );
    }

    // 排序
    if (params.sortBy) {
      members.sort((a, b) => {
        let compareValue = 0;
        switch (params.sortBy) {
          case 'name':
            compareValue = a.name.localeCompare(b.name, 'zh-CN');
            break;
          case 'employeeId':
            compareValue = a.employeeId.localeCompare(b.employeeId);
            break;
          case 'saturation':
            compareValue = a.saturation - b.saturation;
            break;
          case 'completedTasks':
            compareValue = a.completedTasks - b.completedTasks;
            break;
        }
        return params.sortOrder === 'asc' ? compareValue : -compareValue;
      });
    }

    // 分页
    if (params.offset !== undefined || params.limit !== undefined) {
      const start = params.offset || 0;
      const end = params.limit !== undefined ? start + params.limit : undefined;
      members = members.slice(start, end);
    }

    return members;
  }

  /**
   * 获取成员统计信息
   */
  async getStatistics(): Promise<MemberStatistics> {
    const members = await this.getAllMembers();

    const stats: MemberStatistics = {
      totalMembers: members.length,
      onlineMembers: members.filter(m => m.onlineStatus === 'online').length,
      busyMembers: members.filter(m => m.onlineStatus === 'busy').length,
      averageSaturation: 0,
      byRole: {
        dept_manager: 0,
        tech_manager: 0,
        engineer: 0,
      },
      byDepartment: {},
    };

    // 计算平均饱和度
    if (members.length > 0) {
      const totalSaturation = members.reduce((sum, m) => sum + m.saturation, 0);
      stats.averageSaturation = Math.round(totalSaturation / members.length);
    }

    // 按角色统计
    members.forEach(m => {
      stats.byRole[m.role]++;
    });

    // 按部门统计
    members.forEach(m => {
      if (m.departmentName) {
        stats.byDepartment[m.departmentName] = (stats.byDepartment[m.departmentName] || 0) + 1;
      }
    });

    return stats;
  }

  /**
   * 获取成员映射表（ID -> Member）
   */
  async getMembersMap(): Promise<Map<string, Member>> {
    const members = await this.getAllMembers();
    const map = new Map<string, Member>();
    members.forEach(m => map.set(m.id, m));
    return map;
  }

  /**
   * 获取展示成员映射表（ID -> DisplayMember）
   */
  async getDisplayMembersMap(): Promise<Map<string, DisplayMember>> {
    const displayMembers = await this.getDisplayMembers();
    const map = new Map<string, DisplayMember>();
    displayMembers.forEach(m => map.set(m.id, m));
    return map;
  }

  /**
   * 使缓存失效
   */
  invalidateCache() {
    this.membersCache = null;
    this.displayMembersCache = null;
    console.log('[MemberService] 缓存已失效');
  }

  /**
   * 清理资源
   */
  cleanup() {
    this.destroy();
  }

  /**
   * 转换组织架构成员为统一成员类型
   */
  private convertOrgMembersToMembers(orgMembers: OrgMember[]): Member[] {
    const org = getOrganizationSync();
    const memberMap = new Map<string, OrgMember>();

    // 建立成员映射
    orgMembers.forEach(m => memberMap.set(m.id, m));

    return orgMembers.map(orgMember => {
      // 查找所属部门和部门名称
      let departmentId: string | undefined;
      let departmentName: string | undefined;
      let techGroupId: string | undefined;
      let techGroupName: string | undefined;

      if (org) {
        // 查找成员所属的技术组
        for (const dept of org.departments) {
          for (const child of dept.children) {
            if (child.level === 'tech_group') {
              const techGroup = child as any;
              if (techGroup.memberIds && techGroup.memberIds.includes(orgMember.id)) {
                techGroupId = techGroup.id;
                techGroupName = techGroup.name;
                departmentId = dept.id;
                departmentName = dept.name;
                break;
              }
            }
            if (techGroupId) break;
          }
          if (techGroupId) break;
        }
      }

      return {
        ...orgMember,
        employeeId: orgMember.employeeId || '',
        role: orgMember.role || 'engineer',
        departmentId,
        departmentName,
        techGroupId,
        techGroupName,
        // 只在值未定义时使用默认值
        onlineStatus: orgMember.onlineStatus ?? 'offline',
        level: orgMember.level ?? 'E5',
        currentTasks: orgMember.currentTasks ?? 0,
        saturation: orgMember.saturation ?? 0,
        completedTasks: orgMember.completedTasks ?? 0,
        capabilities: orgMember.capabilities || {},
        createdAt: orgMember.createdAt || Date.now(),
        updatedAt: orgMember.updatedAt || Date.now(),
      };
    });
  }
}

// ==================== 导出单例 ====================

export const memberService = new MemberService();

// 自动初始化
if (typeof window !== 'undefined') {
  memberService.initialize();
}

// ==================== 便捷导出 ====================

/**
 * 获取所有成员的便捷函数
 */
export async function getAllMembers(forceRefresh?: boolean): Promise<Member[]> {
  return memberService.getAllMembers(forceRefresh);
}

/**
 * 获取展示成员列表的便捷函数
 */
export async function getDisplayMembers(forceRefresh?: boolean): Promise<DisplayMember[]> {
  return memberService.getDisplayMembers(forceRefresh);
}

/**
 * 根据 ID 获取成员的便捷函数
 */
export async function getMemberById(id: string): Promise<Member | null> {
  return memberService.getMemberById(id);
}

/**
 * 根据工号获取成员的便捷函数
 */
export async function getMemberByEmployeeId(employeeId: string): Promise<Member | null> {
  return memberService.getMemberByEmployeeId(employeeId);
}

/**
 * 获取成员映射表的便捷函数
 */
export async function getMembersMap(): Promise<Map<string, Member>> {
  return memberService.getMembersMap();
}

/**
 * 获取展示成员映射表的便捷函数
 */
export async function getDisplayMembersMap(): Promise<Map<string, DisplayMember>> {
  return memberService.getDisplayMembersMap();
}
