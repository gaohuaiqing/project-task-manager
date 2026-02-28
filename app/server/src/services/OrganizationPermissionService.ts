/**
 * 组织架构权限服务
 * 从组织架构树 (global_data) 读取用户权限信息
 * 替代原有的关系型表权限系统
 */

import { databaseService } from './DatabaseService.js';
import { LRUCacheWithTTL, cacheCleanupManager } from '../utils/LRUCache.js';

// ================================================================
// 类型定义
// ================================================================

export interface OrgMember {
  id: string;
  name: string;
  employeeId: string;
  role: 'dept_manager' | 'tech_manager' | 'engineer';
  level: 'member';
  parentId: string;
  capabilities?: Record<string, number>;
}

export interface OrgTechGroup {
  id: string;
  name: string;
  level: 'tech_group';
  parentId: string;
  memberIds: string[];
  children?: OrgMember[];
}

export interface OrgDepartment {
  id: string;
  name: string;
  level: 'department';
  children: Array<OrgTechGroup | OrgMember>;
}

export interface OrganizationStructure {
  version: number;
  departments: OrgDepartment[];
  lastUpdated: number;
  lastUpdatedBy: string;
}

export interface UserPermission {
  userId: number;
  username: string;
  role: 'admin' | 'dept_manager' | 'tech_manager' | 'engineer';
  primaryDepartment: {
    id: string;
    name: string;
  } | null;
  departments: Array<{
    id: string;
    name: string;
  }>;
  techGroups: Array<{
    id: string;
    name: string;
  }>;
  memberInfo: OrgMember | null;
  _cachedAt: number;
}

// ================================================================
// 组织架构权限服务类
// ================================================================

export class OrganizationPermissionService {
  private permissionCache: LRUCacheWithTTL<number, UserPermission>;
  private orgCache: OrganizationStructure | null = null;
  private orgCacheExpiry: number = 0;
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10分钟缓存
  private readonly ORG_CACHE_TTL = 5 * 60 * 1000; // 组织架构缓存5分钟

  constructor() {
    this.permissionCache = new LRUCacheWithTTL(2000, this.CACHE_TTL);
    cacheCleanupManager.registerCleanup('org-permission-cache', this.permissionCache, 60000);
  }

  /**
   * 获取完整组织架构（带缓存）
   */
  private async getOrganization(): Promise<OrganizationStructure> {
    if (this.orgCache && Date.now() < this.orgCacheExpiry) {
      return this.orgCache;
    }

    const [rows] = await databaseService.query(
      `SELECT data_json FROM global_data
       WHERE data_type = 'organization_units' AND data_id = 'default'`
    ) as any[];

    if (!rows || rows.length === 0) {
      throw new Error('组织架构数据不存在');
    }

    this.orgCache = rows[0].data_json;
    this.orgCacheExpiry = Date.now() + this.ORG_CACHE_TTL;

    return this.orgCache;
  }

  /**
   * 根据工号查找成员
   */
  private findMemberByEmployeeId(org: OrganizationStructure, employeeId: string): OrgMember | null {
    for (const dept of org.departments) {
      for (const child of dept.children) {
        if (child.level === 'member') {
          const member = child as OrgMember;
          if (member.employeeId === employeeId) {
            return member;
          }
        } else if (child.level === 'tech_group' && child.children) {
          for (const member of child.children) {
            if (member.employeeId === employeeId) {
              return member;
            }
          }
        }
      }
    }
    return null;
  }

  /**
   * 获取成员所属部门和技术组
   */
  private getMemberContext(org: OrganizationStructure, member: OrgMember): {
    department: { id: string; name: string } | null;
    techGroup: { id: string; name: string } | null;
  } {
    for (const dept of org.departments) {
      // 检查是否直接在部门下（作为部门经理）
      if (member.parentId === dept.id) {
        return {
          department: { id: dept.id, name: dept.name },
          techGroup: null
        };
      }

      // 检查是否在技术组下
      for (const child of dept.children) {
        if (child.level === 'tech_group' && member.parentId === child.id) {
          return {
            department: { id: dept.id, name: dept.name },
            techGroup: { id: child.id, name: child.name }
          };
        }
      }
    }

    return { department: null, techGroup: null };
  }

  /**
   * 获取用户权限信息
   */
  async getUserPermissions(userId: number, username: string, userRole: string): Promise<UserPermission> {
    // 检查缓存
    const cached = this.permissionCache.get(userId);
    if (cached && Date.now() - cached._cachedAt < this.CACHE_TTL) {
      return cached;
    }

    // admin 用户直接返回
    if (userRole === 'admin') {
      const adminPermission: UserPermission = {
        userId,
        username,
        role: 'admin',
        primaryDepartment: null,
        departments: [],
        techGroups: [],
        memberInfo: null,
        _cachedAt: Date.now()
      };
      this.permissionCache.set(userId, adminPermission);
      return adminPermission;
    }

    // 获取组织架构
    const org = await this.getOrganization();

    // 查找用户对应的成员（通过 users 表的 name 字段与成员 name 匹配）
    // 或者通过 employeeId 匹配
    let memberInfo: OrgMember | null = null;

    // 首先尝试通过 users 表获取 employeeId
    const [userRows] = await databaseService.query(
      'SELECT employee_id FROM users WHERE id = ?',
      [userId]
    ) as any[];

    if (userRows && userRows.length > 0 && userRows[0].employee_id) {
      memberInfo = this.findMemberByEmployeeId(org, userRows[0].employee_id);
    }

    // 如果没找到，尝试通过 name 匹配
    if (!memberInfo) {
      for (const dept of org.departments) {
        for (const child of dept.children) {
          if (child.level === 'member' && child.name === username) {
            memberInfo = child as OrgMember;
            break;
          } else if (child.level === 'tech_group' && child.children) {
            for (const member of child.children) {
              if (member.name === username) {
                memberInfo = member;
                break;
              }
            }
          }
          if (memberInfo) break;
        }
        if (memberInfo) break;
      }
    }

    if (memberInfo) {
      const context = this.getMemberContext(org, memberInfo);

      const permission: UserPermission = {
        userId,
        username,
        role: memberInfo.role,
        primaryDepartment: context.department,
        departments: context.department ? [context.department] : [],
        techGroups: context.techGroup ? [context.techGroup] : [],
        memberInfo,
        _cachedAt: Date.now()
      };

      this.permissionCache.set(userId, permission);
      return permission;
    }

    // 用户不是成员，返回基础权限
    const basicPermission: UserPermission = {
      userId,
      username,
      role: userRole as any,
      primaryDepartment: null,
      departments: [],
      techGroups: [],
      memberInfo: null,
      _cachedAt: Date.now()
    };

    this.permissionCache.set(userId, basicPermission);
    return basicPermission;
  }

  /**
   * 清除缓存
   */
  clearCache(userId?: number): void {
    if (userId) {
      this.permissionCache.delete(userId);
    } else {
      this.permissionCache.clear();
      this.orgCache = null;
      this.orgCacheExpiry = 0;
    }
  }
}

// 导出单例
export const organizationPermissionService = new OrganizationPermissionService();
