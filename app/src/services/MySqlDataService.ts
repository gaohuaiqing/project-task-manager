/**
 * MySQL 主存储数据服务
 *
 * 设计原则：
 * 1. 所有数据修改通过API发送到后端MySQL
 * 2. 前端只做展示和临时缓存（60秒TTL）
 * 3. 使用WebSocket实时接收服务器推送的数据变更
 * 4. 支持乐观锁和版本冲突处理
 * 5. 使用统一的项目类型定义（types/project.ts）
 */

import { apiService } from './ApiService';
import { wsService } from './WebSocketService';
import { CACHE_TTL, CACHE_KEY_PREFIX, generateCacheKey, createCacheEntry, isCacheEntryValid, updateCacheEntryAccess } from './CacheConfig';
import { eventService, emitDataChanged } from './EventService';
import { memberService } from './MemberService';
import { requestDedup } from '@/utils/RequestDeduplication';
import type {
  Project,
  ProjectMember,
  ProjectMilestone,
  ProjectDetail,
  ProjectQueryParams,
  ProjectApiResponse,
  ProjectMemberRole,
  MilestoneStatus
} from '../types/project';

// ==================== 类型重新导出 ====================
// 导出项目类型供外部使用
export type {
  Project,
  ProjectMember,
  ProjectMilestone,
  ProjectDetail,
  ProjectQueryParams,
  ProjectApiResponse,
  ProjectMemberRole,
  MilestoneStatus
};

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

export interface WbsTask {
  id: number;
  project_id: number;
  parent_id?: number;
  task_code: string;
  task_name: string;
  description?: string;
  task_type: 'milestone' | 'phase' | 'task' | 'deliverable';
  status: 'pending' | 'in_progress' | 'completed' | 'delayed' | 'cancelled';
  priority: number;
  estimated_hours?: number;
  actual_hours?: number;
  progress: number;
  planned_start_date?: string;
  planned_end_date?: string;
  actual_start_date?: string;
  actual_end_date?: string;
  full_time_ratio?: number;
  assignee_id?: number;
  assignee_name?: string;
  dependencies?: number[];
  tags?: string[];
  attachments?: any[];
  version: number;
  created_at: string;
  updated_at: string;

  // 审批状态
  approval_status?: 'pending' | 'approved' | 'rejected';
}

export interface TaskAssignment {
  id: number;
  task_id: number;
  assignee_id: number;
  assignee_name?: string;
  assigned_by: number;
  assigned_by_name?: string;
  assigned_at: string;
  unassigned_at?: string;
  status: 'active' | 'cancelled' | 'completed';
  notes?: string;
}

export interface Holiday {
  id: number;
  holiday_date: string;
  name: string;
  is_workday: boolean;
  year: number;
}

// ==================== 请求/响应类型 ====================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  currentVersion?: number; // 版本冲突时返回当前版本号
}

export interface VersionConflictError extends Error {
  currentVersion: number;
  latestData: any;
}

// ==================== 主服务类 ====================

class MySqlDataService {
  // 内存缓存
  private cache: Map<string, CacheEntry<any>> = new Map();
  // 监听器集合
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  // 是否已初始化WebSocket监听
  private wsInitialized = false;

  constructor() {
    this.initWebSocket();
  }

  // 获取当前会话ID
  private getSessionId(): string | null {
    // 首先尝试从 auth_session 获取（AuthContext 的主要存储位置）
    const authSessionData = localStorage.getItem('auth_session');
    if (authSessionData) {
      try {
        const session = JSON.parse(authSessionData);
        if (session.sessionId) {
          console.log('[MySqlDataService] 从 auth_session 获取会话ID:', session.sessionId);
          return session.sessionId;
        }
      } catch (error) {
        console.error('[MySqlDataService] 解析 auth_session 失败:', error);
      }
    }

    // 降级方案：从 active_session_ 开头的键获取
    const activeUserKey = Object.keys(localStorage).find(key => key.startsWith('active_session_'));
    if (activeUserKey) {
      try {
        const sessionData = localStorage.getItem(activeUserKey);
        if (sessionData) {
          const session = JSON.parse(sessionData);
          if (session.sessionId) {
            console.log('[MySqlDataService] 从 active_session_ 获取会话ID:', session.sessionId);
            return session.sessionId;
          }
        }
      } catch (error) {
        console.error('[MySqlDataService] 解析 active_session_ 失败:', error);
      }
    }

    // 未找到会话ID
    console.warn('[MySqlDataService] 未找到会话ID，当前 localStorage keys:', Object.keys(localStorage));
    return null;
  }

  // 获取带有认证的请求头
  private getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    const sessionId = this.getSessionId();
    if (sessionId) {
      (headers as any)['x-session-id'] = sessionId;
    }
    return headers;
  }

  // ==================== 项目操作 ====================

  /**
   * 获取所有项目
   * 性能优化: 添加性能监控
   */
  async getProjects(): Promise<Project[]> {
    const perfMark = `getProjects_${Date.now()}`;
    performance.mark(`${perfMark}_start`);

    const cached = this.getFromCache<Project[]>('projects');
    if (cached) {
      performance.mark(`${perfMark}_cache_hit`);
      performance.measure(perfMark, `${perfMark}_start`, `${perfMark}_cache_hit`);
      const duration = performance.getEntriesByName(perfMark)[0]?.duration || 0;
      console.log(`[Perf] 项目列表缓存命中: ${duration.toFixed(2)}ms`);
      return cached.data;
    }

    try {
      performance.mark(`${perfMark}_fetch_start`);
      const response = await fetch('http://localhost:3001/api/projects', {
        headers: this.getAuthHeaders()
      });
      performance.mark(`${perfMark}_fetch_end`);

      const result: ApiResponse<Project[]> = await response.json();

      if (result.success && result.data) {
        performance.mark(`${perfMark}_cache_set`);
        this.setCache('projects', result.data);
        console.log(`[Perf] 项目列表加载完成: ${result.data.length} 个项目`);

        performance.measure(perfMark, `${perfMark}_start`, `${perfMark}_cache_set`);
        const totalDuration = performance.getEntriesByName(perfMark)[0]?.duration || 0;
        const fetchDuration = performance.getEntriesByName(`${perfMark}_fetch`)[0]?.duration || 0;

        console.log(`[Perf] 总耗时: ${totalDuration.toFixed(2)}ms (网络: ${fetchDuration.toFixed(2)}ms)`);

        // 清理性能标记
        performance.clearMarks(perfMark);
        performance.clearMeasures(perfMark);

        return result.data;
      }

      return [];
    } catch (error) {
      console.error('[MySqlDataService] 获取项目列表失败:', error);
      // 返回缓存数据（如果有）
      const cached = this.getFromCache<Project[]>('projects');
      return cached?.data || [];
    }
  }

  /**
   * 获取初始数据（优化版本 + 分页 + 请求去重）
   * 性能优化: 使用专用的 /api/initial-data 端点一次性获取所有数据
   * 支持分页: firstLoad 只获取前 20 条数据
   * 请求去重: 防止短时间内重复请求
   */
  async getInitialData(options: { page?: number; pageSize?: number } = {}): Promise<{
    projects: Project[];
    members: Member[];
    tasks?: WbsTask[];
    pagination?: any;
  }> {
    const perfMark = `getInitialData_${Date.now()}`;
    performance.mark(`${perfMark}_start`);

    const { page = 1, pageSize = 20 } = options;
    const cacheKey = `initial-data:${page}:${pageSize}`;

    // 使用请求去重
    return requestDedup.fetch(
      cacheKey,
      async () => {
        try {
          performance.mark(`${perfMark}_fetch_start`);

          // 使用优化的初始数据端点（带分页）
          const url = new URL('http://localhost:3001/api/initial-data');
          if (page > 1 || pageSize !== 20) {
            url.searchParams.set('page', page.toString());
            url.searchParams.set('pageSize', pageSize.toString());
          }

          const response = await fetch(url.toString(), {
            method: 'GET',
            headers: this.getAuthHeaders()
          });

          performance.mark(`${perfMark}_fetch_end`);
          const result: any = await response.json();

          if (result.success && result.data) {
            const projects = result.data.projects || [];
            const members = result.data.members || [];
            const tasks = result.data.tasks || [];

            // 更新缓存
            this.setCache('projects', projects);
            this.setCache('members', members);
            if (tasks.length > 0) {
              this.setCache('wbs_tasks', tasks);
            }

            performance.mark(`${perfMark}_complete`);
            performance.measure(perfMark, `${perfMark}_start`, `${perfMark}_complete`);

            const totalDuration = performance.getEntriesByName(perfMark)[0]?.duration || 0;
            const fetchDuration = performance.getEntriesByName(`${perfMark}_fetch`)[0]?.duration || 0;

            const isCached = result.meta?.cached || false;
            const cacheIndicator = isCached ? '🎯 缓存命中' : '💾 数据库查询';

            console.log(`[Perf] 🚀 初始数据加载完成 (${cacheIndicator}):`);
            console.log(`[Perf] - 项目: ${projects.length} 个`);
            console.log(`[Perf] - 成员: ${members.length} 个`);
            console.log(`[Perf] - 任务: ${tasks.length} 个`);
            console.log(`[Perf] - 总耗时: ${totalDuration.toFixed(2)}ms (网络: ${fetchDuration.toFixed(2)}ms)`);

            if (result.meta?.pagination) {
              console.log(`[Perf] - 分页: 第 ${result.meta.pagination.page} 页, 每页 ${result.meta.pagination.pageSize} 条`);
              console.log(`[Perf] - 总数: 项目 ${result.meta.pagination.totals.projects}, 成员 ${result.meta.pagination.totals.members}, 任务 ${result.meta.pagination.totals.tasks}`);
            }

            // 清理性能标记
            performance.clearMarks(perfMark);
            performance.clearMeasures(perfMark);

            return {
              projects,
              members,
              tasks,
              pagination: result.meta?.pagination
            };
          }

          // 降级到单独查询
          console.warn('[MySqlDataService] 初始数据查询失败，降级到单独查询');
          const projects = await this.getProjects();
          return { projects, members: [], tasks: [] };
        } catch (error) {
          console.error('[MySqlDataService] 获取初始数据失败:', error);
          // 降级到单独查询
          const projects = await this.getProjects();
          return { projects, members: [], tasks: [] };
        }
      },
      {
        cache: true,    // 使用缓存
        retry: 2,       // 失败重试 2 次
        retryDelay: 1000
      }
    );
  }

  /**
   * 获取单个项目
   */
  async getProject(id: number): Promise<Project | null> {
    try {
      const response = await fetch(`http://localhost:3001/api/projects/${id}`, {
        headers: this.getAuthHeaders()
      });
      const result: ApiResponse<Project> = await response.json();

      if (result.success && result.data) {
        return result.data;
      }

      return null;
    } catch (error) {
      console.error('[MySqlDataService] 获取项目失败:', error);
      return null;
    }
  }

  /**
   * 创建项目
   */
  async createProject(data: Partial<Project>): Promise<Project> {
    try {
      const response = await fetch('http://localhost:3001/api/projects', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data)
      });

      const result: ApiResponse<Project> = await response.json();

      if (result.success && result.data) {
        this.invalidateCache('projects');
        return result.data;
      }

      throw new Error(result.message || '创建项目失败');
    } catch (error) {
      console.error('[MySqlDataService] 创建项目失败:', error);
      throw error;
    }
  }

  /**
   * 更新项目（带版本控制）
   */
  async updateProject(id: number, updates: Partial<Project>, expectedVersion?: number): Promise<Project> {
    try {
      const response = await fetch(`http://localhost:3001/api/projects/${id}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ ...updates, expectedVersion })
      });

      const result: ApiResponse<Project> = await response.json();

      if (result.success && result.data) {
        this.invalidateCache('projects');
        return result.data;
      }

      // 版本冲突
      if (response.status === 409) {
        const error = new Error('版本冲突，数据已被其他用户修改') as VersionConflictError;
        error.currentVersion = result.currentVersion || 0;
        error.latestData = result.data;
        throw error;
      }

      throw new Error(result.message || '更新项目失败');
    } catch (error) {
      console.error('[MySqlDataService] 更新项目失败:', error);
      throw error;
    }
  }

  /**
   * 删除项目
   */
  async deleteProject(id: number): Promise<void> {
    try {
      const response = await fetch(`http://localhost:3001/api/projects/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      const result: ApiResponse<void> = await response.json();

      if (result.success) {
        this.invalidateCache('projects');
        this.invalidateCache('wbs_tasks');
        return;
      }

      throw new Error(result.message || '删除项目失败');
    } catch (error) {
      console.error('[MySqlDataService] 删除项目失败:', error);
      throw error;
    }
  }

  /**
   * 获取项目详情（包含成员和里程碑）
   */
  async getProjectDetail(id: number): Promise<ProjectDetail | null> {
    try {
      const response = await fetch(`http://localhost:3001/api/projects/${id}/detail`, {
        headers: this.getAuthHeaders()
      });
      const result: ApiResponse<ProjectDetail> = await response.json();

      if (result.success && result.data) {
        return result.data;
      }

      return null;
    } catch (error) {
      console.error('[MySqlDataService] 获取项目详情失败:', error);
      return null;
    }
  }

  /**
   * 按查询参数获取项目列表
   */
  async getProjectsByQuery(params: ProjectQueryParams): Promise<Project[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params.status?.length) queryParams.set('status', params.status.join(','));
      if (params.projectType?.length) queryParams.set('projectType', params.projectType.join(','));
      if (params.keyword) queryParams.set('keyword', params.keyword);
      if (params.sortBy) queryParams.set('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder);
      if (params.offset) queryParams.set('offset', params.offset.toString());
      if (params.limit) queryParams.set('limit', params.limit.toString());

      const url = `http://localhost:3001/api/projects${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const response = await fetch(url, {
        headers: this.getAuthHeaders()
      });
      const result: ApiResponse<Project[]> = await response.json();

      if (result.success && result.data) {
        return result.data;
      }

      return [];
    } catch (error) {
      console.error('[MySqlDataService] 查询项目列表失败:', error);
      return [];
    }
  }

  // ==================== 项目成员操作 ====================

  /**
   * 获取项目成员列表
   */
  async getProjectMembers(projectId: number): Promise<ProjectMember[]> {
    const cacheKey = `project_members_${projectId}`;
    const cached = this.getFromCache<ProjectMember[]>(cacheKey);
    if (cached) {
      return cached.data;
    }

    try {
      const response = await fetch(`http://localhost:3001/api/projects/${projectId}/members`, {
        headers: this.getAuthHeaders()
      });
      const result: ApiResponse<ProjectMember[]> = await response.json();

      if (result.success && result.data) {
        this.setCache(cacheKey, result.data);
        return result.data;
      }

      return [];
    } catch (error) {
      console.error('[MySqlDataService] 获取项目成员失败:', error);
      const cached = this.getFromCache<ProjectMember[]>(cacheKey);
      return cached?.data || [];
    }
  }

  /**
   * 添加项目成员
   */
  async addProjectMember(
    projectId: number,
    memberId: number,
    role: ProjectMemberRole = 'member'
  ): Promise<ProjectMember> {
    try {
      const response = await fetch(`http://localhost:3001/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ memberId, role })
      });

      const result: ApiResponse<ProjectMember> = await response.json();

      if (result.success && result.data) {
        this.invalidateCache(`project_members_${projectId}`);
        return result.data;
      }

      throw new Error(result.message || '添加项目成员失败');
    } catch (error) {
      console.error('[MySqlDataService] 添加项目成员失败:', error);
      throw error;
    }
  }

  /**
   * 移除项目成员
   */
  async removeProjectMember(projectId: number, memberId: number): Promise<void> {
    try {
      const response = await fetch(
        `http://localhost:3001/api/projects/${projectId}/members/${memberId}`,
        {
          method: 'DELETE',
          headers: this.getAuthHeaders()
        }
      );

      const result: ApiResponse<void> = await response.json();

      if (result.success) {
        this.invalidateCache(`project_members_${projectId}`);
        return;
      }

      throw new Error(result.message || '移除项目成员失败');
    } catch (error) {
      console.error('[MySqlDataService] 移除项目成员失败:', error);
      throw error;
    }
  }

  /**
   * 更新项目成员角色
   */
  async updateProjectMemberRole(
    projectId: number,
    memberId: number,
    role: ProjectMemberRole
  ): Promise<ProjectMember> {
    try {
      const response = await fetch(
        `http://localhost:3001/api/projects/${projectId}/members/${memberId}`,
        {
          method: 'PUT',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({ role })
        }
      );

      const result: ApiResponse<ProjectMember> = await response.json();

      if (result.success && result.data) {
        this.invalidateCache(`project_members_${projectId}`);
        return result.data;
      }

      throw new Error(result.message || '更新项目成员角色失败');
    } catch (error) {
      console.error('[MySqlDataService] 更新项目成员角色失败:', error);
      throw error;
    }
  }

  // ==================== 项目里程碑操作 ====================

  /**
   * 获取项目里程碑列表
   */
  async getProjectMilestones(projectId: number): Promise<ProjectMilestone[]> {
    const cacheKey = `project_milestones_${projectId}`;
    const cached = this.getFromCache<ProjectMilestone[]>(cacheKey);
    if (cached) {
      return cached.data;
    }

    try {
      const response = await fetch(`http://localhost:3001/api/projects/${projectId}/milestones`, {
        headers: this.getAuthHeaders()
      });
      const result: ApiResponse<ProjectMilestone[]> = await response.json();

      if (result.success && result.data) {
        this.setCache(cacheKey, result.data);
        return result.data;
      }

      return [];
    } catch (error) {
      console.error('[MySqlDataService] 获取项目里程碑失败:', error);
      const cached = this.getFromCache<ProjectMilestone[]>(cacheKey);
      return cached?.data || [];
    }
  }

  /**
   * 创建项目里程碑
   */
  async createProjectMilestone(
    projectId: number,
    milestone: Omit<ProjectMilestone, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>
  ): Promise<ProjectMilestone> {
    try {
      const response = await fetch(`http://localhost:3001/api/projects/${projectId}/milestones`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(milestone)
      });

      const result: ApiResponse<ProjectMilestone> = await response.json();

      if (result.success && result.data) {
        this.invalidateCache(`project_milestones_${projectId}`);
        return result.data;
      }

      throw new Error(result.message || '创建项目里程碑失败');
    } catch (error) {
      console.error('[MySqlDataService] 创建项目里程碑失败:', error);
      throw error;
    }
  }

  /**
   * 更新项目里程碑
   */
  async updateProjectMilestone(
    projectId: number,
    milestoneId: number,
    updates: Partial<ProjectMilestone>
  ): Promise<ProjectMilestone> {
    try {
      const response = await fetch(
        `http://localhost:3001/api/projects/${projectId}/milestones/${milestoneId}`,
        {
          method: 'PUT',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(updates)
        }
      );

      const result: ApiResponse<ProjectMilestone> = await response.json();

      if (result.success && result.data) {
        this.invalidateCache(`project_milestones_${projectId}`);
        return result.data;
      }

      throw new Error(result.message || '更新项目里程碑失败');
    } catch (error) {
      console.error('[MySqlDataService] 更新项目里程碑失败:', error);
      throw error;
    }
  }

  /**
   * 删除项目里程碑
   */
  async deleteProjectMilestone(projectId: number, milestoneId: number): Promise<void> {
    try {
      const response = await fetch(
        `http://localhost:3001/api/projects/${projectId}/milestones/${milestoneId}`,
        {
          method: 'DELETE',
          headers: this.getAuthHeaders()
        }
      );

      const result: ApiResponse<void> = await response.json();

      if (result.success) {
        this.invalidateCache(`project_milestones_${projectId}`);
        return;
      }

      throw new Error(result.message || '删除项目里程碑失败');
    } catch (error) {
      console.error('[MySqlDataService] 删除项目里程碑失败:', error);
      throw error;
    }
  }

  /**
   * 更新里程碑状态
   */
  async updateMilestoneStatus(
    projectId: number,
    milestoneId: number,
    status: MilestoneStatus
  ): Promise<ProjectMilestone> {
    return this.updateProjectMilestone(projectId, milestoneId, { status });
  }

  // ==================== 项目进度操作 ====================

  /**
   * 更新项目进度（根据任务完成情况自动计算）
   */
  async updateProjectProgress(projectId: number): Promise<Project> {
    try {
      const response = await fetch(`http://localhost:3001/api/projects/${projectId}/progress`, {
        method: 'PUT',
        headers: this.getAuthHeaders()
      });

      const result: ApiResponse<Project> = await response.json();

      if (result.success && result.data) {
        this.invalidateCache('projects');
        return result.data;
      }

      throw new Error(result.message || '更新项目进度失败');
    } catch (error) {
      console.error('[MySqlDataService] 更新项目进度失败:', error);
      throw error;
    }
  }

  /**
   * 手动设置项目进度
   */
  async setProjectProgress(projectId: number, progress: number): Promise<Project> {
    if (progress < 0 || progress > 100) {
      throw new Error('进度值必须在 0-100 之间');
    }

    return this.updateProject(projectId, { progress });
  }

  /**
   * 批量更新项目（包含成员和里程碑）
   * 这是一个事务性操作，要么全部成功，要么全部失败
   */
  async updateProjectFull(
    projectId: number,
    data: {
      code?: string;
      name?: string;
      description?: string;
      projectType?: string;
      plannedStartDate?: string;
      plannedEndDate?: string;
      memberIds?: number[];
      milestones?: Array<{
        id?: number;
        name: string;
        description?: string;
        plannedDate: string;
        status?: string;
      }>;
    }
  ): Promise<Project> {
    try {
      console.log('[MySqlDataService] 开始批量更新项目', { projectId, data });

      // 添加超时保护（30秒）
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('网络请求超时（30秒）')), 30000)
      );

      // 使用 Promise.race 防止请求卡住
      const fetchPromise = fetch(`http://localhost:3001/api/projects/${projectId}/full`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data)
      });

      const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;

      console.log('[MySqlDataService] 收到响应', { status: response.status, ok: response.ok });

      const result: ApiResponse<Project> = await response.json();

      if (result.success && result.data) {
        this.invalidateCache('projects');
        this.invalidateCache(`project_members_${projectId}`);
        this.invalidateCache(`project_milestones_${projectId}`);
        console.log('[MySqlDataService] 批量更新项目成功');
        return result.data;
      }

      throw new Error(result.message || '更新项目失败');
    } catch (error) {
      console.error('[MySqlDataService] 批量更新项目失败:', error);
      throw error;
    }
  }

  /**
   * 批量同步项目成员（先删除旧的，再添加新的）
   * 这是一个原子性操作
   */
  async syncProjectMembers(
    projectId: number,
    memberIds: number[],
    role: ProjectMemberRole = 'member'
  ): Promise<ProjectMember[]> {
    try {
      const response = await fetch(`http://localhost:3001/api/projects/${projectId}/members/sync`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ memberIds, role })
      });

      const result: ApiResponse<ProjectMember[]> = await response.json();

      if (result.success && result.data) {
        this.invalidateCache(`project_members_${projectId}`);
        return result.data;
      }

      throw new Error(result.message || '同步项目成员失败');
    } catch (error) {
      console.error('[MySqlDataService] 同步项目成员失败:', error);
      throw error;
    }
  }

  /**
   * 批量同步项目里程碑
   */
  async syncProjectMilestones(
    projectId: number,
    milestones: Array<{
      id?: number;
      name: string;
      description?: string;
      plannedDate: string;
      status?: string;
    }>
  ): Promise<ProjectMilestone[]> {
    try {
      const response = await fetch(`http://localhost:3001/api/projects/${projectId}/milestones/sync`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ milestones })
      });

      const result: ApiResponse<ProjectMilestone[]> = await response.json();

      if (result.success && result.data) {
        this.invalidateCache(`project_milestones_${projectId}`);
        return result.data;
      }

      throw new Error(result.message || '同步项目里程碑失败');
    } catch (error) {
      console.error('[MySqlDataService] 同步项目里程碑失败:', error);
      throw error;
    }
  }

  // ==================== 成员操作 ====================
  // 注意：members 表已于 2026-02-24 删除
  // 现在从组织架构树获取成员数据，使用 memberService

  /**
   * 获取所有成员 (从组织架构树)
   */
  async getMembers(): Promise<Member[]> {
    try {
      const members = await memberService.getAllMembers();

      // 转换为旧 Member 类型格式以保持兼容性
      const legacyMembers: Member[] = members.map(m => ({
        id: parseInt(m.id) || 0,
        name: m.name,
        employee_id: m.employeeId,
        department: m.departmentName,
        position: m.role,
        email: m.email,
        phone: m.phone,
        skills: m.skills,
        capabilities: m.capabilities,
        status: 'active' as const
      }));

      console.log(`[MySqlDataService] 从组织架构获取成员列表: ${legacyMembers.length} 个成员`);
      return legacyMembers;
    } catch (error) {
      console.error('[MySqlDataService] 获取成员列表失败:', error);
      return [];
    }
  }

  /**
   * 创建成员 (已禁用 - 请使用组织架构管理)
   */
  async createMember(data: Partial<Member>): Promise<Member> {
    throw new Error('成员管理已迁移到组织架构系统，请使用组织架构管理功能添加成员');
  }

  /**
   * 更新成员 (已禁用 - 请使用组织架构管理)
   */
  async updateMember(id: number, updates: Partial<Member>, expectedVersion?: number): Promise<Member> {
    throw new Error('成员管理已迁移到组织架构系统，请使用组织架构管理功能编辑成员');
  }

  /**
   * 删除成员 (已禁用 - 请使用组织架构管理)
   */
  async deleteMember(id: number): Promise<void> {
    throw new Error('成员管理已迁移到组织架构系统，请使用组织架构管理功能删除成员');
  }

  // ==================== WBS任务操作 ====================

  /**
   * 获取WBS任务列表
   */
  async getWbsTasks(projectId?: number): Promise<WbsTask[]> {
    const cacheKey = projectId ? `wbs_tasks_${projectId}` : 'wbs_tasks';
    const cached = this.getFromCache<WbsTask[]>(cacheKey);
    if (cached) {
      console.log('[MySqlDataService] 从缓存获取WBS任务列表');
      return cached.data;
    }

    try {
      const url = projectId
        ? `http://localhost:3001/api/wbs-tasks?project_id=${projectId}`
        : 'http://localhost:3001/api/wbs-tasks';

      const response = await fetch(url, {
        headers: this.getAuthHeaders()
      });
      const result: ApiResponse<WbsTask[]> = await response.json();

      if (result.success && result.data) {
        this.setCache(cacheKey, result.data);
        console.log('[MySqlDataService] 从服务器获取WBS任务列表:', result.data.length, '个任务');
        return result.data;
      }

      return [];
    } catch (error) {
      console.error('[MySqlDataService] 获取WBS任务列表失败:', error);
      const cached = this.getFromCache<WbsTask[]>(cacheKey);
      return cached?.data || [];
    }
  }

  /**
   * 创建WBS任务
   */
  async createWbsTask(data: Partial<WbsTask>): Promise<WbsTask> {
    try {
      const response = await fetch('http://localhost:3001/api/wbs-tasks', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data)
      });

      const result: ApiResponse<WbsTask> = await response.json();

      if (result.success && result.data) {
        this.invalidateCache('wbs_tasks');
        if (data.project_id) {
          this.invalidateCache(`wbs_tasks_${data.project_id}`);
        }
        return result.data;
      }

      throw new Error(result.message || '创建WBS任务失败');
    } catch (error) {
      console.error('[MySqlDataService] 创建WBS任务失败:', error);
      throw error;
    }
  }

  /**
   * 更新WBS任务（带版本控制）
   */
  async updateWbsTask(id: number, updates: Partial<WbsTask>, expectedVersion?: number): Promise<WbsTask> {
    try {
      const response = await fetch(`http://localhost:3001/api/wbs-tasks/${id}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ ...updates, expectedVersion })
      });

      const result: ApiResponse<WbsTask> = await response.json();

      if (result.success && result.data) {
        this.invalidateCache('wbs_tasks');
        if (result.data.project_id) {
          this.invalidateCache(`wbs_tasks_${result.data.project_id}`);
        }
        return result.data;
      }

      // 版本冲突
      if (response.status === 409) {
        const error = new Error('版本冲突，数据已被其他用户修改') as VersionConflictError;
        error.currentVersion = result.currentVersion || 0;
        error.latestData = result.data;
        throw error;
      }

      throw new Error(result.message || '更新WBS任务失败');
    } catch (error) {
      console.error('[MySqlDataService] 更新WBS任务失败:', error);
      throw error;
    }
  }

  /**
   * 删除WBS任务
   */
  async deleteWbsTask(id: number): Promise<void> {
    try {
      const response = await fetch(`http://localhost:3001/api/wbs-tasks/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      const result: ApiResponse<void> = await response.json();

      if (result.success) {
        this.invalidateCache('wbs_tasks');
        return;
      }

      throw new Error(result.message || '删除WBS任务失败');
    } catch (error) {
      console.error('[MySqlDataService] 删除WBS任务失败:', error);
      throw error;
    }
  }

  /**
   * 批量更新任务进度
   */
  async batchUpdateTaskProgress(updates: Array<{ id: number; progress: number; expectedVersion?: number }>): Promise<void> {
    try {
      const response = await fetch('http://localhost:3001/api/wbs-tasks/batch-progress', {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ updates })
      });

      const result: ApiResponse<void> = await response.json();

      if (result.success) {
        this.invalidateCache('wbs_tasks');
        return;
      }

      throw new Error(result.message || '批量更新任务进度失败');
    } catch (error) {
      console.error('[MySqlDataService] 批量更新任务进度失败:', error);
      throw error;
    }
  }

  // ==================== 任务分配操作 ====================

  /**
   * 分配任务
   */
  async assignTask(taskId: number, assigneeId: number, notes?: string): Promise<TaskAssignment> {
    try {
      const response = await fetch('http://localhost:3001/api/task-assignments', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ task_id: taskId, assignee_id: assigneeId, notes })
      });

      const result: ApiResponse<TaskAssignment> = await response.json();

      if (result.success && result.data) {
        this.invalidateCache('wbs_tasks');
        return result.data;
      }

      throw new Error(result.message || '分配任务失败');
    } catch (error) {
      console.error('[MySqlDataService] 分配任务失败:', error);
      throw error;
    }
  }

  /**
   * 取消任务分配
   */
  async unassignTask(taskId: number, assignmentId: number): Promise<void> {
    try {
      const response = await fetch(`http://localhost:3001/api/task-assignments/${assignmentId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      const result: ApiResponse<void> = await response.json();

      if (result.success) {
        this.invalidateCache('wbs_tasks');
        return;
      }

      throw new Error(result.message || '取消任务分配失败');
    } catch (error) {
      console.error('[MySqlDataService] 取消任务分配失败:', error);
      throw error;
    }
  }

  /**
   * 获取任务分配历史
   */
  async getTaskAssignments(taskId: number): Promise<TaskAssignment[]> {
    try {
      const response = await fetch(`http://localhost:3001/api/task-assignments?task_id=${taskId}`, {
        headers: this.getAuthHeaders()
      });
      const result: ApiResponse<TaskAssignment[]> = await response.json();

      if (result.success && result.data) {
        return result.data;
      }

      return [];
    } catch (error) {
      console.error('[MySqlDataService] 获取任务分配历史失败:', error);
      return [];
    }
  }

  // ==================== 节假日操作 ====================

  /**
   * 获取节假日列表
   */
  async getHolidays(year?: number): Promise<Holiday[]> {
    const cacheKey = year ? `holidays_${year}` : 'holidays';
    const cached = this.getFromCache<Holiday[]>(cacheKey);
    if (cached) {
      return cached.data;
    }

    try {
      const url = year
        ? `http://localhost:3001/api/holidays?year=${year}`
        : 'http://localhost:3001/api/holidays';

      const response = await fetch(url, {
        headers: this.getAuthHeaders()
      });
      const result: ApiResponse<Holiday[]> = await response.json();

      if (result.success && result.data) {
        this.setCache(cacheKey, result.data);
        return result.data;
      }

      return [];
    } catch (error) {
      console.error('[MySqlDataService] 获取节假日列表失败:', error);
      const cached = this.getFromCache<Holiday[]>(cacheKey);
      return cached?.data || [];
    }
  }

  // ==================== 版本历史 ====================

  /**
   * 获取数据版本历史
   */
  async getVersionHistory(entityType: string, entityId: number, limit: number = 10): Promise<any[]> {
    try {
      const response = await fetch(
        `http://localhost:3001/api/versions/${entityType}/${entityId}?limit=${limit}`,
        { headers: this.getAuthHeaders() }
      );
      const result: ApiResponse<any[]> = await response.json();

      if (result.success && result.data) {
        return result.data;
      }

      return [];
    } catch (error) {
      console.error('[MySqlDataService] 获取版本历史失败:', error);
      return [];
    }
  }

  // ==================== WebSocket 实时更新 ====================

  /**
   * 初始化WebSocket监听
   */
  private initWebSocket() {
    if (this.wsInitialized) return;

    wsService.onMessage((message) => {
      switch (message.type) {
        case 'global_data_updated':
          this.handleDataUpdated(message.data);
          break;
        case 'data_conflict':
          this.handleVersionConflict(message.data);
          break;
      }
    });

    this.wsInitialized = true;
    console.log('[MySqlDataService] WebSocket监听已初始化');
  }

  /**
   * 处理数据更新（增量更新缓存）
   */
  private handleDataUpdated(data: {
    dataType: string;
    operation: 'create' | 'update' | 'delete';
    record: any;
  }) {
    const { dataType, operation, record } = data;

    // 增量更新缓存
    this.updateCacheIncremental(dataType, operation, record);

    // 通知内部监听器
    this.notifyListeners(dataType, { operation, record });

    // 使用统一事件服务派发事件
    emitDataChanged({
      dataType: dataType as any,
      operation,
      record,
    });

    console.log(`[MySqlDataService] 收到数据更新: ${dataType} - ${operation}`);
  }

  /**
   * 处理版本冲突
   */
  private handleVersionConflict(data: {
    entityType: string;
    entityId: number;
    currentVersion: number;
    latestData: any;
  }) {
    // 使用统一事件服务派发版本冲突事件
    eventService.emitDataChanged({
      dataType: 'version_conflict' as any,
      operation: 'update',
      record: data,
    }, false); // 不广播到其他标签页

    console.warn('[MySqlDataService] 版本冲突:', data);
  }

  // ==================== 缓存管理 ====================

  /**
   * 从缓存获取数据
   */
  private getFromCache<T>(key: string): ReturnType<typeof isCacheEntryValid> extends true ? any : null {
    const cached = this.cache.get(key);
    if (cached && isCacheEntryValid(cached)) {
      return updateCacheEntryAccess(cached);
    }
    // 缓存过期或无效，删除
    if (cached) {
      this.cache.delete(key);
    }
    return null;
  }

  /**
   * 设置缓存
   */
  private setCache<T>(key: string, data: T, ttl?: number): void {
    const entry = createCacheEntry(data, ttl || CACHE_TTL.MEDIUM);
    this.cache.set(key, entry);
  }

  /**
   * 增量更新缓存
   */
  private updateCacheIncremental(
    dataType: string,
    operation: 'create' | 'update' | 'delete',
    record: any
  ): void {
    const cached = this.cache.get(dataType);
    if (!cached) return;

    const data = cached.data as any[];
    const index = data.findIndex((item: any) => item.id === record.id);

    switch (operation) {
      case 'create':
        if (index === -1) {
          data.push(record);
        }
        break;
      case 'update':
        if (index !== -1) {
          data[index] = record;
        } else {
          data.push(record);
        }
        break;
      case 'delete':
        if (index !== -1) {
          data.splice(index, 1);
        }
        break;
    }

    // 更新缓存时间戳和访问信息
    updateCacheEntryAccess(cached);
  }

  /**
   * 使缓存失效
   */
  private invalidateCache(key: string): void {
    this.cache.delete(key);
    console.log(`[MySqlDataService] 缓存已失效: ${key}`);
  }

  /**
   * 清除所有缓存
   */
  clearCache(): void {
    this.cache.clear();
    console.log('[MySqlDataService] 所有缓存已清除');
  }

  // ==================== 事件监听 ====================

  /**
   * 订阅数据更新
   */
  on(dataType: string, callback: (data: { operation: string; record: any }) => void): () => void {
    if (!this.listeners.has(dataType)) {
      this.listeners.set(dataType, new Set());
    }

    this.listeners.get(dataType)!.add(callback);

    // 返回取消订阅函数
    return () => {
      const listeners = this.listeners.get(dataType);
      if (listeners) {
        listeners.delete(callback);
      }
    };
  }

  /**
   * 通知监听器
   */
  private notifyListeners(dataType: string, data: { operation: string; record: any }): void {
    const listeners = this.listeners.get(dataType);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[MySqlDataService] 监听器回调错误 (${dataType}):`, error);
        }
      });
    }
  }

  // ==================== 刷新数据 ====================

  /**
   * 从服务器刷新所有数据
   */
  async refreshAll(): Promise<void> {
    this.clearCache();
    await Promise.all([
      this.getProjects(),
      this.getMembers(),
      this.getWbsTasks()
    ]);
    console.log('[MySqlDataService] 所有数据已从服务器刷新');
  }

  /**
   * 获取缓存状态
   */
  getCacheStatus(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * 检查缓存是否有效
   */
  isCacheValid(key: string): boolean {
    const cached = this.cache.get(key);
    if (!cached) return false;
    return Date.now() - cached.timestamp < CACHE_TTL;
  }
}

// 导出单例
export const mySqlDataService = new MySqlDataService();
// 类型已在文件开头通过 export interface 导出，无需重复导出
