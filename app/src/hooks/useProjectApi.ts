/**
 * 项目 API 调用 Hook
 *
 * 职责：
 * 1. 调用 MySqlDataService 的项目相关方法
 * 2. 加载状态管理（loading, error, success）
 * 3. 错误处理和通知
 * 4. 数据刷新逻辑
 * 5. 实时更新监听
 *
 * @module hooks/useProjectApi
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { mySqlDataService } from '../services/MySqlDataService';
import type {
  Project,
  ProjectDetail,
  ProjectFormData,
  ProjectMember,
  ProjectMilestone,
  ProjectQueryParams,
  ProjectMemberRole,
  MilestoneStatus
} from '../types/project';

// ==================== 状态类型 ====================

type LoadingState = 'idle' | 'loading' | 'success' | 'error';

interface ApiState<T> {
  data: T | null;
  status: LoadingState;
  error: string | null;
}

// ==================== Hook 返回类型 ====================

interface UseProjectApiReturn {
  // 项目列表
  projects: Project[];
  projectsLoading: boolean;
  projectsError: string | null;
  fetchProjects: () => Promise<void>;
  refreshProjects: () => Promise<void>;

  // 单个项目
  project: Project | null;
  projectLoading: boolean;
  projectError: string | null;
  fetchProject: (id: number) => Promise<void>;
  clearProject: () => void;

  // 项目详情
  projectDetail: ProjectDetail | null;
  projectDetailLoading: boolean;
  fetchProjectDetail: (id: number) => Promise<void>;

  // 项目成员
  projectMembers: ProjectMember[];
  membersLoading: boolean;
  fetchProjectMembers: (projectId: number) => Promise<void>;

  // 项目里程碑
  projectMilestones: ProjectMilestone[];
  milestonesLoading: boolean;
  fetchProjectMilestones: (projectId: number) => Promise<void>;

  // CRUD 操作
  createProject: (data: ProjectFormData) => Promise<Project | null>;
  updateProject: (id: number, data: Partial<Project>) => Promise<Project | null>;
  deleteProject: (id: number) => Promise<boolean>;

  // 成员操作
  addProjectMember: (projectId: number, memberId: number, role?: ProjectMemberRole) => Promise<ProjectMember | null>;
  removeProjectMember: (projectId: number, memberId: number) => Promise<boolean>;
  updateProjectMemberRole: (projectId: number, memberId: number, role: ProjectMemberRole) => Promise<ProjectMember | null>;

  // 里程碑操作
  createProjectMilestone: (projectId: number, milestone: Omit<ProjectMilestone, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>) => Promise<ProjectMilestone | null>;
  updateProjectMilestone: (projectId: number, milestoneId: number, data: Partial<ProjectMilestone>) => Promise<ProjectMilestone | null>;
  deleteProjectMilestone: (projectId: number, milestoneId: number) => Promise<boolean>;
  updateMilestoneStatus: (projectId: number, milestoneId: number, status: MilestoneStatus) => Promise<ProjectMilestone | null>;

  // 进度操作
  updateProjectProgress: (projectId: number) => Promise<Project | null>;
  setProjectProgress: (projectId: number, progress: number) => Promise<Project | null>;

  // 查询操作
  queryProjects: (params: ProjectQueryParams) => Promise<Project[]>;

  // 批量操作
  batchDeleteProjects: (ids: number[]) => Promise<boolean>;

  // 完整项目更新
  updateProjectFull: (id: number, data: {
    code?: string;
    name?: string;
    description?: string;
    projectType?: string;
    plannedStartDate?: string;
    plannedEndDate?: string;
    memberIds?: number[];
    milestones?: any[];
  }) => Promise<Project | null>;
  syncProjectMembers: (projectId: number, memberIds: number[], role?: ProjectMemberRole) => Promise<ProjectMember[]>;
  syncProjectMilestones: (projectId: number, milestones: any[]) => Promise<ProjectMilestone[]>;

  // 状态重置
  clearErrors: () => void;
  clearAll: () => void;
}

// ==================== 主 Hook ====================

/**
 * 项目 API 调用 Hook
 */
export function useProjectApi(): UseProjectApiReturn {
  // ==================== 项目列表状态 ====================

  const [projectsState, setProjectsState] = useState<ApiState<Project[]>>({
    data: null,
    status: 'idle',
    error: null,
  });

  // ==================== 单个项目状态 ====================

  const [projectState, setProjectState] = useState<ApiState<Project>>({
    data: null,
    status: 'idle',
    error: null,
  });

  // ==================== 项目详情状态 ====================

  const [projectDetailState, setProjectDetailState] = useState<ApiState<ProjectDetail>>({
    data: null,
    status: 'idle',
    error: null,
  });

  // ==================== 项目成员状态 ====================

  const [projectMembersState, setProjectMembersState] = useState<ApiState<ProjectMember[]>>({
    data: null,
    status: 'idle',
    error: null,
  });

  // ==================== 项目里程碑状态 ====================

  const [projectMilestonesState, setProjectMilestonesState] = useState<ApiState<ProjectMilestone[]>>({
    data: null,
    status: 'idle',
    error: null,
  });

  // ==================== WebSocket 监听器引用 ====================

  const unsubscribeRef = useRef<(() => void) | null>(null);

  // ==================== 更新状态辅助函数 ====================

  const setLoading = (setter: React.Dispatch<React.SetStateAction<ApiState<any>>>) => {
    setter(prev => ({ ...prev, status: 'loading', error: null }));
  };

  const setSuccess = <T>(setter: React.Dispatch<React.SetStateAction<ApiState<T>>>, data: T) => {
    setter({ data, status: 'success', error: null });
  };

  const setError = <T>(setter: React.Dispatch<React.SetStateAction<ApiState<T>>>, error: string) => {
    setter(prev => ({ ...prev, status: 'error', error }));
  };

  // ==================== 项目列表操作 ====================

  const fetchProjects = useCallback(async () => {
    const hookPerfMark = `fetchProjects_hook_${Date.now()}`;
    performance.mark(`${hookPerfMark}_start`);

    setLoading(setProjectsState);
    try {
      const data = await mySqlDataService.getProjects();
      performance.mark(`${hookPerfMark}_success`);
      setSuccess(setProjectsState, data);

      performance.measure(hookPerfMark, `${hookPerfMark}_start`, `${hookPerfMark}_success`);
      const duration = performance.getEntriesByName(hookPerfMark)[0]?.duration || 0;
      console.log(`[Perf] useProjectApi.fetchProjects 完成: ${duration.toFixed(2)}ms`);
    } catch (error) {
      performance.mark(`${hookPerfMark}_error`);
      const errorMessage = error instanceof Error ? error.message : '获取项目列表失败';
      setError(setProjectsState, errorMessage);
      console.error('[useProjectApi] 获取项目列表失败:', error);
    } finally {
      // 清理性能标记
      performance.clearMarks(hookPerfMark);
      performance.clearMeasures(hookPerfMark);
    }
  }, []);

  const refreshProjects = useCallback(async () => {
    await fetchProjects();
  }, [fetchProjects]);

  // ==================== 单个项目操作 ====================

  const fetchProject = useCallback(async (id: number) => {
    setLoading(setProjectState);
    try {
      const data = await mySqlDataService.getProject(id);
      if (data) {
        setSuccess(setProjectState, data);
      } else {
        setError(setProjectState, `项目 ID ${id} 不存在`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取项目失败';
      setError(setProjectState, errorMessage);
      console.error('[useProjectApi] 获取项目失败:', error);
    }
  }, []);

  const clearProject = useCallback(() => {
    setProjectState({ data: null, status: 'idle', error: null });
  }, []);

  // ==================== 项目详情操作 ====================

  const fetchProjectDetail = useCallback(async (id: number) => {
    setLoading(setProjectDetailState);
    try {
      const data = await mySqlDataService.getProjectDetail(id);
      if (data) {
        setSuccess(setProjectDetailState, data);
      } else {
        setError(setProjectDetailState, `项目详情 ID ${id} 不存在`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取项目详情失败';
      setError(setProjectDetailState, errorMessage);
      console.error('[useProjectApi] 获取项目详情失败:', error);
    }
  }, []);

  // ==================== 项目成员操作 ====================

  const fetchProjectMembers = useCallback(async (projectId: number) => {
    setLoading(setProjectMembersState);
    try {
      const data = await mySqlDataService.getProjectMembers(projectId);
      setSuccess(setProjectMembersState, data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取项目成员失败';
      setError(setProjectMembersState, errorMessage);
      console.error('[useProjectApi] 获取项目成员失败:', error);
    }
  }, []);

  // ==================== 项目里程碑操作 ====================

  const fetchProjectMilestones = useCallback(async (projectId: number) => {
    setLoading(setProjectMilestonesState);
    try {
      const data = await mySqlDataService.getProjectMilestones(projectId);
      setSuccess(setProjectMilestonesState, data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取项目里程碑失败';
      setError(setProjectMilestonesState, errorMessage);
      console.error('[useProjectApi] 获取项目里程碑失败:', error);
    }
  }, []);

  // ==================== CRUD 操作 ====================

  const createProject = useCallback(async (data: ProjectFormData): Promise<Project | null> => {
    try {
      const project = await mySqlDataService.createProject(data as any);
      // 刷新项目列表
      await fetchProjects();
      return project;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '创建项目失败';
      console.error('[useProjectApi] 创建项目失败:', error);
      throw new Error(errorMessage);
    }
  }, [fetchProjects]);

  const updateProject = useCallback(async (id: number, updates: Partial<Project>): Promise<Project | null> => {
    try {
      const project = await mySqlDataService.updateProject(id, updates);
      // 刷新项目列表
      await fetchProjects();
      // 如果当前正在查看该项目，也刷新它
      if (projectState.data?.id === id) {
        setSuccess(setProjectState, project);
      }
      return project;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '更新项目失败';
      console.error('[useProjectApi] 更新项目失败:', error);
      throw new Error(errorMessage);
    }
  }, [fetchProjects, projectState.data]);

  const deleteProject = useCallback(async (id: number): Promise<boolean> => {
    try {
      await mySqlDataService.deleteProject(id);
      // 刷新项目列表
      await fetchProjects();
      // 如果当前正在查看该项目，清除它
      if (projectState.data?.id === id) {
        clearProject();
      }
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '删除项目失败';
      console.error('[useProjectApi] 删除项目失败:', error);
      throw new Error(errorMessage);
    }
  }, [fetchProjects, projectState.data, clearProject]);

  // ==================== 成员操作 ====================

  const addProjectMember = useCallback(async (
    projectId: number,
    memberId: number,
    role: ProjectMemberRole = 'member'
  ): Promise<ProjectMember | null> => {
    try {
      const member = await mySqlDataService.addProjectMember(projectId, memberId, role);
      // 刷新成员列表
      await fetchProjectMembers(projectId);
      return member;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '添加项目成员失败';
      console.error('[useProjectApi] 添加项目成员失败:', error);
      throw new Error(errorMessage);
    }
  }, [fetchProjectMembers]);

  const removeProjectMember = useCallback(async (
    projectId: number,
    memberId: number
  ): Promise<boolean> => {
    try {
      await mySqlDataService.removeProjectMember(projectId, memberId);
      // 刷新成员列表
      await fetchProjectMembers(projectId);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '移除项目成员失败';
      console.error('[useProjectApi] 移除项目成员失败:', error);
      throw new Error(errorMessage);
    }
  }, [fetchProjectMembers]);

  const updateProjectMemberRole = useCallback(async (
    projectId: number,
    memberId: number,
    role: ProjectMemberRole
  ): Promise<ProjectMember | null> => {
    try {
      const member = await mySqlDataService.updateProjectMemberRole(projectId, memberId, role);
      // 刷新成员列表
      await fetchProjectMembers(projectId);
      return member;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '更新项目成员角色失败';
      console.error('[useProjectApi] 更新项目成员角色失败:', error);
      throw new Error(errorMessage);
    }
  }, [fetchProjectMembers]);

  // ==================== 里程碑操作 ====================

  const createProjectMilestone = useCallback(async (
    projectId: number,
    milestone: Omit<ProjectMilestone, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>
  ): Promise<ProjectMilestone | null> => {
    try {
      const newMilestone = await mySqlDataService.createProjectMilestone(projectId, milestone);
      // 刷新里程碑列表
      await fetchProjectMilestones(projectId);
      return newMilestone;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '创建项目里程碑失败';
      console.error('[useProjectApi] 创建项目里程碑失败:', error);
      throw new Error(errorMessage);
    }
  }, [fetchProjectMilestones]);

  const updateProjectMilestone = useCallback(async (
    projectId: number,
    milestoneId: number,
    data: Partial<ProjectMilestone>
  ): Promise<ProjectMilestone | null> => {
    try {
      const milestone = await mySqlDataService.updateProjectMilestone(projectId, milestoneId, data);
      // 刷新里程碑列表
      await fetchProjectMilestones(projectId);
      return milestone;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '更新项目里程碑失败';
      console.error('[useProjectApi] 更新项目里程碑失败:', error);
      throw new Error(errorMessage);
    }
  }, [fetchProjectMilestones]);

  const deleteProjectMilestone = useCallback(async (
    projectId: number,
    milestoneId: number
  ): Promise<boolean> => {
    try {
      await mySqlDataService.deleteProjectMilestone(projectId, milestoneId);
      // 刷新里程碑列表
      await fetchProjectMilestones(projectId);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '删除项目里程碑失败';
      console.error('[useProjectApi] 删除项目里程碑失败:', error);
      throw new Error(errorMessage);
    }
  }, [fetchProjectMilestones]);

  const updateMilestoneStatus = useCallback(async (
    projectId: number,
    milestoneId: number,
    status: MilestoneStatus
  ): Promise<ProjectMilestone | null> => {
    try {
      const milestone = await mySqlDataService.updateMilestoneStatus(projectId, milestoneId, status);
      // 刷新里程碑列表
      await fetchProjectMilestones(projectId);
      return milestone;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '更新里程碑状态失败';
      console.error('[useProjectApi] 更新里程碑状态失败:', error);
      throw new Error(errorMessage);
    }
  }, [fetchProjectMilestones]);

  // ==================== 进度操作 ====================

  const updateProjectProgress = useCallback(async (projectId: number): Promise<Project | null> => {
    try {
      const project = await mySqlDataService.updateProjectProgress(projectId);
      // 刷新项目列表
      await fetchProjects();
      // 如果当前正在查看该项目，也刷新它
      if (projectState.data?.id === projectId) {
        setSuccess(setProjectState, project);
      }
      return project;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '更新项目进度失败';
      console.error('[useProjectApi] 更新项目进度失败:', error);
      throw new Error(errorMessage);
    }
  }, [fetchProjects, projectState.data]);

  const setProjectProgress = useCallback(async (projectId: number, progress: number): Promise<Project | null> => {
    try {
      const project = await mySqlDataService.setProjectProgress(projectId, progress);
      // 刷新项目列表
      await fetchProjects();
      // 如果当前正在查看该项目，也刷新它
      if (projectState.data?.id === projectId) {
        setSuccess(setProjectState, project);
      }
      return project;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '设置项目进度失败';
      console.error('[useProjectApi] 设置项目进度失败:', error);
      throw new Error(errorMessage);
    }
  }, [fetchProjects, projectState.data]);

  // ==================== 查询操作 ====================

  const queryProjects = useCallback(async (params: ProjectQueryParams): Promise<Project[]> => {
    try {
      return await mySqlDataService.getProjectsByQuery(params);
    } catch (error) {
      console.error('[useProjectApi] 查询项目失败:', error);
      return [];
    }
  }, []);

  // ==================== 批量操作 ====================

  const batchDeleteProjects = useCallback(async (ids: number[]): Promise<boolean> => {
    try {
      // 并行删除所有项目
      await Promise.all(ids.map(id => mySqlDataService.deleteProject(id)));
      // 刷新项目列表
      await fetchProjects();
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '批量删除项目失败';
      console.error('[useProjectApi] 批量删除项目失败:', error);
      throw new Error(errorMessage);
    }
  }, [fetchProjects]);

  // ==================== 完整项目更新 ====================

  const updateProjectFull = useCallback(async (
    id: number,
    data: {
      code?: string;
      name?: string;
      description?: string;
      projectType?: string;
      plannedStartDate?: string;
      plannedEndDate?: string;
      memberIds?: number[];
      milestones?: any[];
    }
  ): Promise<Project | null> => {
    try {
      const project = await mySqlDataService.updateProjectFull(id, data);
      // 刷新项目列表
      await fetchProjects();
      // 如果当前正在查看该项目，也刷新它
      if (projectState.data?.id === id) {
        setSuccess(setProjectState, project);
      }
      return project;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '批量更新项目失败';
      console.error('[useProjectApi] 批量更新项目失败:', error);
      throw new Error(errorMessage);
    }
  }, [fetchProjects, projectState.data]);

  const syncProjectMembers = useCallback(async (
    projectId: number,
    memberIds: number[],
    role: ProjectMemberRole = 'member'
  ): Promise<ProjectMember[]> => {
    try {
      const members = await mySqlDataService.syncProjectMembers(projectId, memberIds, role);
      // 刷新成员列表
      await fetchProjectMembers(projectId);
      return members;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '同步项目成员失败';
      console.error('[useProjectApi] 同步项目成员失败:', error);
      throw new Error(errorMessage);
    }
  }, [fetchProjectMembers]);

  const syncProjectMilestones = useCallback(async (
    projectId: number,
    milestones: any[]
  ): Promise<ProjectMilestone[]> => {
    try {
      const newMilestones = await mySqlDataService.syncProjectMilestones(projectId, milestones);
      // 刷新里程碑列表
      await fetchProjectMilestones(projectId);
      return newMilestones;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '同步项目里程碑失败';
      console.error('[useProjectApi] 同步项目里程碑失败:', error);
      throw new Error(errorMessage);
    }
  }, [fetchProjectMilestones]);

  // ==================== 状态重置 ====================

  const clearErrors = useCallback(() => {
    if (projectsState.error) setProjectsState(prev => ({ ...prev, error: null }));
    if (projectState.error) setProjectState(prev => ({ ...prev, error: null }));
    if (projectDetailState.error) setProjectDetailState(prev => ({ ...prev, error: null }));
    if (projectMembersState.error) setProjectMembersState(prev => ({ ...prev, error: null }));
    if (projectMilestonesState.error) setProjectMilestonesState(prev => ({ ...prev, error: null }));
  }, [projectsState.error, projectState.error, projectDetailState.error, projectMembersState.error, projectMilestonesState.error]);

  const clearAll = useCallback(() => {
    setProjectsState({ data: null, status: 'idle', error: null });
    setProjectState({ data: null, status: 'idle', error: null });
    setProjectDetailState({ data: null, status: 'idle', error: null });
    setProjectMembersState({ data: null, status: 'idle', error: null });
    setProjectMilestonesState({ data: null, status: 'idle', error: null });
  }, []);

  // ==================== 实时更新监听（修复版）====================

  // ✅ 使用 ref 存储最新状态，避免依赖项变化导致重建
  const currentProjectIdRef = useRef(projectState.data?.id);

  // 更新 ref 当状态变化时
  useEffect(() => {
    currentProjectIdRef.current = projectState.data?.id;
  }, [projectState.data?.id]);

  useEffect(() => {
    // 订阅项目数据更新
    const unsubscribe = mySqlDataService.on('projects', ({ operation, record }) => {
      console.log('[useProjectApi] 收到项目更新:', operation, record);

      // 自动刷新项目列表
      fetchProjects().catch(console.error);

      // 如果当前正在查看该项目，也刷新它（使用 ref 避免依赖项）
      if (currentProjectIdRef.current === record.id) {
        fetchProject(record.id).catch(console.error);
      }
    });

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [fetchProjects, fetchProject]); // ✅ 只依赖函数引用，不依赖状态

  // ==================== 返回 ====================
  // 注意：初始加载逻辑已移除，使用 React Query 的 useProjects hook 代替
  // React Query 会自动管理数据加载和缓存

  return {
    // 项目列表
    projects: projectsState.data || [],
    projectsLoading: projectsState.status === 'loading',
    projectsError: projectsState.error,
    fetchProjects,
    refreshProjects,

    // 单个项目
    project: projectState.data,
    projectLoading: projectState.status === 'loading',
    projectError: projectState.error,
    fetchProject,
    clearProject,

    // 项目详情
    projectDetail: projectDetailState.data,
    projectDetailLoading: projectDetailState.status === 'loading',
    fetchProjectDetail,

    // 项目成员
    projectMembers: projectMembersState.data || [],
    membersLoading: projectMembersState.status === 'loading',
    fetchProjectMembers,

    // 项目里程碑
    projectMilestones: projectMilestonesState.data || [],
    milestonesLoading: projectMilestonesState.status === 'loading',
    fetchProjectMilestones,

    // CRUD 操作
    createProject,
    updateProject,
    deleteProject,

    // 成员操作
    addProjectMember,
    removeProjectMember,
    updateProjectMemberRole,

    // 里程碑操作
    createProjectMilestone,
    updateProjectMilestone,
    deleteProjectMilestone,
    updateMilestoneStatus,

    // 进度操作
    updateProjectProgress,
    setProjectProgress,

    // 查询操作
    queryProjects,

    // 批量操作
    batchDeleteProjects,

    // 完整项目更新
    updateProjectFull,
    syncProjectMembers,
    syncProjectMilestones,

    // 状态重置
    clearErrors,
    clearAll,
  };
}

// ==================== 辅助 Hook ====================

/**
 * 单个项目 API Hook
 * 只处理单个项目的操作，适用于项目详情页
 */
export function useSingleProject(projectId: number | null) {
  const api = useProjectApi();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (projectId) {
      setIsLoading(true);
      Promise.all([
        api.fetchProject(projectId),
        api.fetchProjectMembers(projectId),
        api.fetchProjectMilestones(projectId),
      ]).finally(() => {
        setIsLoading(false);
      });
    }
  }, [projectId, api]);

  return {
    ...api,
    isLoading,
  };
}
