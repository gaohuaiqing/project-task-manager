/**
 * 项目数据服务
 *
 * 负责项目相关的所有数据操作：
 * - 项目CRUD
 * - 项目成员管理
 * - 项目里程碑管理
 * - 项目进度管理
 */

import { BaseDataService, ApiResponse } from './BaseDataService';
import type { Project, ProjectMember, ProjectMilestone, ProjectDetail, ProjectQueryParams, ProjectMemberRole, MilestoneStatus } from '../../types/project';

/**
 * 项目数据服务类
 */
export class ProjectDataService extends BaseDataService<Project> {
  constructor() {
    super();
    console.log('[ProjectDataService] 初始化项目数据服务');
  }

  getServiceName(): string {
    return 'ProjectDataService';
  }

  getEndpointPrefix(): string {
    return '/projects';
  }

  // ==================== 项目 CRUD 操作 ====================

  /**
   * 获取所有项目
   */
  async getProjects(): Promise<Project[]> {
    const cacheKey = 'projects_all';
    const cached = this.getListFromCache(cacheKey);
    if (cached) return cached;

    try {
      console.log('[ProjectDataService] 从服务器获取项目列表');
      const result = await this.get<Project[]>('/projects');
      this.updateListCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('[ProjectDataService] 获取项目列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取单个项目
   */
  async getProject(id: number): Promise<Project | null> {
    const cacheKey = `project_${id}`;
    const cached = this.getSingleFromCache(cacheKey);
    if (cached) return cached;

    try {
      console.log('[ProjectDataService] 获取项目:', id);
      const result = await this.get<Project>(`/projects/${id}`);
      this.updateSingleCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('[ProjectDataService] 获取项目失败:', error);
      return null;
    }
  }

  /**
   * 创建项目
   */
  async createProject(data: Partial<Project>): Promise<Project> {
    try {
      console.log('[ProjectDataService] 创建项目:', data);
      const result = await this.post<Project>('/projects', data);
      this.clearCache(); // 清除缓存
      return result;
    } catch (error) {
      console.error('[ProjectDataService] 创建项目失败:', error);
      throw error;
    }
  }

  /**
   * 更新项目
   */
  async updateProject(id: number, updates: Partial<Project>, expectedVersion?: number): Promise<Project> {
    try {
      console.log('[ProjectDataService] 更新项目:', id, updates);
      const result = await this.put<Project>(`/projects/${id}`, { ...updates, expectedVersion });
      this.clearCache(); // 清除缓存
      return result;
    } catch (error: any) {
      if (error.message?.includes('版本冲突') || error.message?.includes('409')) {
        this.handleVersionConflict({ projectId: id, updates });
      }
      throw error;
    }
  }

  /**
   * 删除项目
   */
  async deleteProject(id: number): Promise<void> {
    try {
      console.log('[ProjectDataService] 删除项目:', id);
      await this.del(`/projects/${id}`);
      this.clearCache(); // 清除缓存
    } catch (error) {
      console.error('[ProjectDataService] 删除项目失败:', error);
      throw error;
    }
  }

  /**
   * 获取项目详情（包含成员和里程碑）
   */
  async getProjectDetail(id: number): Promise<ProjectDetail | null> {
    try {
      console.log('[ProjectDataService] 获取项目详情:', id);
      const result = await this.get<ProjectDetail>(`/projects/${id}/detail`);
      return result;
    } catch (error) {
      console.error('[ProjectDataService] 获取项目详情失败:', error);
      return null;
    }
  }

  /**
   * 查询项目
   */
  async getProjectsByQuery(params: ProjectQueryParams): Promise<Project[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params.code) queryParams.set('code', params.code);
      if (params.name) queryParams.set('name', params.name);
      if (params.projectType) queryParams.set('projectType', params.projectType);
      if (params.status) queryParams.set('status', params.status);
      if (params.sortField) queryParams.set('sortField', params.sortField);
      if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder);
      if (params.offset) queryParams.set('offset', params.offset.toString());
      if (params.limit) queryParams.set('limit', params.limit.toString());

      const queryString = queryParams.toString();
      const result = await this.get<Project[]>(`/projects${queryString ? `?${queryString}` : ''}`);
      return result;
    } catch (error) {
      console.error('[ProjectDataService] 查询项目失败:', error);
      return [];
    }
  }

  // ==================== 项目成员操作 ====================

  /**
   * 获取项目成员
   */
  async getProjectMembers(projectId: number): Promise<ProjectMember[]> {
    const cacheKey = `project_members_${projectId}`;
    const cached = this.getListFromCache(cacheKey);
    if (cached) return cached;

    try {
      console.log('[ProjectDataService] 获取项目成员:', projectId);
      const result = await this.get<ProjectMember[]>(`/projects/${projectId}/members`);
      this.updateListCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('[ProjectDataService] 获取项目成员失败:', error);
      throw error;
    }
  }

  /**
   * 添加项目成员
   */
  async addProjectMember(projectId: number, memberId: number, role: ProjectMemberRole = 'member'): Promise<ProjectMember> {
    try {
      console.log('[ProjectDataService] 添加项目成员:', projectId, memberId, role);
      const result = await this.post<ProjectMember>(`/projects/${projectId}/members`, { memberId, role });
      this.clearCache(`project_members_${projectId}`);
      return result;
    } catch (error) {
      console.error('[ProjectDataService] 添加项目成员失败:', error);
      throw error;
    }
  }

  /**
   * 移除项目成员
   */
  async removeProjectMember(projectId: number, memberId: number): Promise<void> {
    try {
      console.log('[ProjectDataService] 移除项目成员:', projectId, memberId);
      await this.del(`/projects/${projectId}/members/${memberId}`);
      this.clearCache(`project_members_${projectId}`);
    } catch (error) {
      console.error('[ProjectDataService] 移除项目成员失败:', error);
      throw error;
    }
  }

  /**
   * 更新项目成员角色
   */
  async updateProjectMemberRole(projectId: number, memberId: number, role: ProjectMemberRole): Promise<ProjectMember> {
    try {
      console.log('[ProjectDataService] 更新项目成员角色:', projectId, memberId, role);
      const result = await this.put<ProjectMember>(`/projects/${projectId}/members/${memberId}`, { role });
      this.clearCache(`project_members_${projectId}`);
      return result;
    } catch (error) {
      console.error('[ProjectDataService] 更新项目成员角色失败:', error);
      throw error;
    }
  }

  /**
   * 同步项目成员
   */
  async syncProjectMembers(projectId: number, memberIds: string[], role: ProjectMemberRole = 'member'): Promise<ProjectMember[]> {
    try {
      console.log('[ProjectDataService] 同步项目成员:', projectId, memberIds);
      const result = await this.post<ProjectMember[]>(`/projects/${projectId}/members/sync`, { memberIds, role });
      this.clearCache(`project_members_${projectId}`);
      return result;
    } catch (error) {
      console.error('[ProjectDataService] 同步项目成员失败:', error);
      throw error;
    }
  }

  // ==================== 项目里程碑操作 ====================

  /**
   * 获取项目里程碑
   */
  async getProjectMilestones(projectId: number): Promise<ProjectMilestone[]> {
    const cacheKey = `project_milestones_${projectId}`;
    const cached = this.getListFromCache(cacheKey);
    if (cached) return cached;

    try {
      console.log('[ProjectDataService] 获取项目里程碑:', projectId);
      const result = await this.get<ProjectMilestone[]>(`/projects/${projectId}/milestones`);
      this.updateListCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('[ProjectDataService] 获取项目里程碑失败:', error);
      throw error;
    }
  }

  /**
   * 创建项目里程碑
   */
  async createProjectMilestone(projectId: number, milestone: Omit<ProjectMilestone, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>): Promise<ProjectMilestone> {
    try {
      console.log('[ProjectDataService] 创建项目里程碑:', projectId, milestone);
      const result = await this.post<ProjectMilestone>(`/projects/${projectId}/milestones`, milestone);
      this.clearCache(`project_milestones_${projectId}`);
      return result;
    } catch (error) {
      console.error('[ProjectDataService] 创建项目里程碑失败:', error);
      throw error;
    }
  }

  /**
   * 更新项目里程碑
   */
  async updateProjectMilestone(projectId: number, milestoneId: number, data: Partial<ProjectMilestone>): Promise<ProjectMilestone> {
    try {
      console.log('[ProjectDataService] 更新项目里程碑:', projectId, milestoneId, data);
      const result = await this.put<ProjectMilestone>(`/projects/${projectId}/milestones/${milestoneId}`, data);
      this.clearCache(`project_milestones_${projectId}`);
      return result;
    } catch (error) {
      console.error('[ProjectDataService] 更新项目里程碑失败:', error);
      throw error;
    }
  }

  /**
   * 删除项目里程碑
   */
  async deleteProjectMilestone(projectId: number, milestoneId: number): Promise<void> {
    try {
      console.log('[ProjectDataService] 删除项目里程碑:', projectId, milestoneId);
      await this.del(`/projects/${projectId}/milestones/${milestoneId}`);
      this.clearCache(`project_milestones_${projectId}`);
    } catch (error) {
      console.error('[ProjectDataService] 删除项目里程碑失败:', error);
      throw error;
    }
  }

  /**
   * 更新里程碑状态
   */
  async updateMilestoneStatus(projectId: number, milestoneId: number, status: MilestoneStatus): Promise<ProjectMilestone> {
    try {
      console.log('[ProjectDataService] 更新里程碑状态:', projectId, milestoneId, status);
      const result = await this.put<ProjectMilestone>(`/projects/${projectId}/milestones/${milestoneId}/status`, { status });
      this.clearCache(`project_milestones_${projectId}`);
      return result;
    } catch (error) {
      console.error('[ProjectDataService] 更新里程碑状态失败:', error);
      throw error;
    }
  }

  /**
   * 同步项目里程碑
   */
  async syncProjectMilestones(projectId: number, milestones: any[]): Promise<ProjectMilestone[]> {
    try {
      console.log('[ProjectDataService] 同步项目里程碑:', projectId, milestones);
      const result = await this.post<ProjectMilestone[]>(`/projects/${projectId}/milestones/sync`, { milestones });
      this.clearCache(`project_milestones_${projectId}`);
      return result;
    } catch (error) {
      console.error('[ProjectDataService] 同步项目里程碑失败:', error);
      throw error;
    }
  }

  // ==================== 项目进度操作 ====================

  /**
   * 更新项目进度
   */
  async updateProjectProgress(projectId: number): Promise<Project> {
    try {
      console.log('[ProjectDataService] 更新项目进度:', projectId);
      const result = await this.put<Project>(`/projects/${projectId}/progress`, {});
      this.clearCache();
      return result;
    } catch (error) {
      console.error('[ProjectDataService] 更新项目进度失败:', error);
      throw error;
    }
  }

  /**
   * 设置项目进度
   */
  async setProjectProgress(projectId: number, progress: number): Promise<Project> {
    try {
      console.log('[ProjectDataService] 设置项目进度:', projectId, progress);
      const result = await this.put<Project>(`/projects/${projectId}/progress`, { progress });
      this.clearCache();
      return result;
    } catch (error) {
      console.error('[ProjectDataService] 设置项目进度失败:', error);
      throw error;
    }
  }

  // ==================== 批量操作 ====================

  /**
   * 批量更新项目
   */
  async batchUpdateProjects(updates: Array<{ id: number; data: Partial<Project> }>): Promise<Project[]> {
    try {
      console.log('[ProjectDataService] 批量更新项目:', updates);
      const result = await this.post<Project[]>('/projects/batch', { updates });
      this.clearCache();
      return result;
    } catch (error) {
      console.error('[ProjectDataService] 批量更新项目失败:', error);
      throw error;
    }
  }

  /**
   * 批量删除项目
   */
  async batchDeleteProjects(ids: number[]): Promise<void> {
    try {
      console.log('[ProjectDataService] 批量删除项目:', ids);
      await this.post('/projects/batch-delete', { ids });
      this.clearCache();
    } catch (error) {
      console.error('[ProjectDataService] 批量删除项目失败:', error);
      throw error;
    }
  }

  /**
   * 完整项目更新（包含成员和里程碑）
   */
  async updateProjectFull(id: number, data: {
    code?: string;
    name?: string;
    description?: string;
    projectType?: string;
    plannedStartDate?: string;
    plannedEndDate?: string;
    memberIds?: string[];
    milestones?: any[];
  }): Promise<Project> {
    try {
      console.log('[ProjectDataService] 完整更新项目:', id, data);
      const result = await this.put<Project>(`/projects/${id}/full`, data);
      this.clearCache();
      return result;
    } catch (error) {
      console.error('[ProjectDataService] 完整更新项目失败:', error);
      throw error;
    }
  }
}

// 导出单例
export const projectDataService = new ProjectDataService();
