/**
 * 成员数据服务
 *
 * 负责成员相关的所有数据操作：
 * - 成员CRUD
 * - 成员查询
 * - 成员组织关系
 */

import { BaseDataService } from './BaseDataService';

export interface Member {
  id: number;
  name: string;
  employee_id?: string;
  department?: string;
  position?: string;
  email?: string;
  phone?: string;
  skills?: string[];
  capabilities?: Record<string, any>;
  status: 'active' | 'inactive';
  version: number;
  created_at: string;
  updated_at: string;
}

/**
 * 成员数据服务类
 */
export class MemberDataService extends BaseDataService<Member> {
  constructor() {
    super();
    console.log('[MemberDataService] 初始化成员数据服务');
  }

  getServiceName(): string {
    return 'MemberDataService';
  }

  getEndpointPrefix(): string {
    return '/members';
  }

  // ==================== 成员 CRUD 操作 ====================

  /**
   * 获取所有成员
   */
  async getMembers(): Promise<Member[]> {
    const cacheKey = 'members_all';
    const cached = this.getListFromCache(cacheKey);
    if (cached) return cached;

    try {
      console.log('[MemberDataService] 从服务器获取成员列表');
      const result = await this.get<Member[]>('/members');
      this.updateListCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('[MemberDataService] 获取成员列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取活跃成员
   */
  async getActiveMembers(): Promise<Member[]> {
    const cacheKey = 'members_active';
    const cached = this.getListFromCache(cacheKey);
    if (cached) return cached;

    try {
      console.log('[MemberDataService] 获取活跃成员');
      const result = await this.get<Member[]>('/members/active');
      this.updateListCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('[MemberDataService] 获取活跃成员失败:', error);
      return [];
    }
  }

  /**
   * 获取单个成员
   */
  async getMember(id: number): Promise<Member | null> {
    const cacheKey = `member_${id}`;
    const cached = this.getSingleFromCache(cacheKey);
    if (cached) return cached;

    try {
      console.log('[MemberDataService] 获取成员:', id);
      const result = await this.get<Member>(`/members/${id}`);
      this.updateSingleCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('[MemberDataService] 获取成员失败:', error);
      return null;
    }
  }

  /**
   * 创建成员
   */
  async createMember(data: Partial<Member>): Promise<Member> {
    try {
      console.log('[MemberDataService] 创建成员:', data);
      const result = await this.post<Member>('/members', data);
      this.clearCache(); // 清除缓存
      return result;
    } catch (error) {
      console.error('[MemberDataService] 创建成员失败:', error);
      throw error;
    }
  }

  /**
   * 更新成员
   */
  async updateMember(id: number, updates: Partial<Member>, expectedVersion?: number): Promise<Member> {
    try {
      console.log('[MemberDataService] 更新成员:', id, updates);
      const result = await this.put<Member>(`/members/${id}`, { ...updates, expectedVersion });
      this.clearCache(); // 清除缓存
      return result;
    } catch (error: any) {
      if (error.message?.includes('版本冲突') || error.message?.includes('409')) {
        this.handleVersionConflict({ memberId: id, updates });
      }
      throw error;
    }
  }

  /**
   * 删除成员
   */
  async deleteMember(id: number): Promise<void> {
    try {
      console.log('[MemberDataService] 删除成员:', id);
      await this.del(`/members/${id}`);
      this.clearCache(); // 清除缓存
    } catch (error) {
      console.error('[MemberDataService] 删除成员失败:', error);
      throw error;
    }
  }

  // ==================== 成员查询操作 ====================

  /**
   * 按部门查询成员
   */
  async getMembersByDepartment(department: string): Promise<Member[]> {
    try {
      console.log('[MemberDataService] 按部门查询成员:', department);
      const result = await this.get<Member[]>(`/members/department/${encodeURIComponent(department)}`);
      return result;
    } catch (error) {
      console.error('[MemberDataService] 按部门查询成员失败:', error);
      return [];
    }
  }

  /**
   * 按技能查询成员
   */
  async getMembersBySkill(skill: string): Promise<Member[]> {
    try {
      console.log('[MemberDataService] 按技能查询成员:', skill);
      const result = await this.get<Member[]>(`/members/skill/${encodeURIComponent(skill)}`);
      return result;
    } catch (error) {
      console.error('[MemberDataService] 按技能查询成员失败:', error);
      return [];
    }
  }

  /**
   * 搜索成员
   */
  async searchMembers(query: string): Promise<Member[]> {
    try {
      console.log('[MemberDataService] 搜索成员:', query);
      const result = await this.get<Member[]>(`/members/search?q=${encodeURIComponent(query)}`);
      return result;
    } catch (error) {
      console.error('[MemberDataService] 搜索成员失败:', error);
      return [];
    }
  }

  // ==================== 批量操作 ====================

  /**
   * 批量更新成员
   */
  async batchUpdateMembers(updates: Array<{ id: number; data: Partial<Member> }>): Promise<Member[]> {
    try {
      console.log('[MemberDataService] 批量更新成员:', updates);
      const result = await this.post<Member[]>('/members/batch', { updates });
      this.clearCache();
      return result;
    } catch (error) {
      console.error('[MemberDataService] 批量更新成员失败:', error);
      throw error;
    }
  }
}

// 导出单例
export const memberDataService = new MemberDataService();
