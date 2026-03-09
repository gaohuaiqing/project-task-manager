/**
 * 项目相关 React Query Hooks
 *
 * 功能：
 * - 使用 React Query 管理项目数据状态
 * - 自动缓存和重新验证
 * - 请求去重
 * - 乐观更新
 *
 * @module hooks/useProjectQueries
 */

import { useQuery, useMutation, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { mySqlDataService } from '@/services/MySqlDataService';
import type {
  Project,
  ProjectFormData,
  ProjectDetail,
  ProjectMember,
  ProjectMilestone,
  ProjectQueryParams,
  ProjectMemberRole,
  MilestoneStatus
} from '@/types/project';

// ==================== Query Keys ====================

/**
 * Query Keys 工厂
 * 统一管理所有项目相关的查询键
 */
export const projectKeys = {
  // 所有项目
  all: ['projects'] as const,
  // 项目列表
  lists: () => [...projectKeys.all, 'list'] as const,
  // 带查询参数的列表
  list: (params: ProjectQueryParams) => [...projectKeys.lists(), params] as const,
  // 单个项目
  detail: (id: number) => [...projectKeys.all, id] as const,
  // 项目详情（包含成员和里程碑）
  fullDetail: (id: number) => [...projectKeys.all, id, 'full'] as const,
  // 项目成员
  members: (projectId: number) => [...projectKeys.all, projectId, 'members'] as const,
  // 项目里程碑
  milestones: (projectId: number) => [...projectKeys.all, projectId, 'milestones'] as const,
};

// ==================== Queries ====================

/**
 * 获取项目列表（自动缓存、去重）
 *
 * @example
 * ```tsx
 * const { data: projects, isLoading, error } = useProjects();
 * ```
 */
export function useProjects(): UseQueryResult<Project[], Error> {
  return useQuery({
    queryKey: projectKeys.lists(),
    queryFn: async () => {
      return await mySqlDataService.getProjects();
    },
    staleTime: 5 * 60 * 1000, // 5分钟内不重新请求
  });
}

/**
 * 获取单个项目
 *
 * @param id - 项目ID
 * @example
 * ```tsx
 * const { data: project, isLoading } = useProject(123);
 * ```
 */
export function useProject(id: number | null): UseQueryResult<Project | null, Error> {
  return useQuery({
    queryKey: projectKeys.detail(id || 0),
    queryFn: async () => {
      if (!id) return null;
      return await mySqlDataService.getProject(id);
    },
    enabled: !!id, // 只在有 id 时才查询
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 获取项目详情（包含成员和里程碑）
 *
 * @param id - 项目ID
 */
export function useProjectDetail(id: number | null): UseQueryResult<ProjectDetail | null, Error> {
  return useQuery({
    queryKey: projectKeys.fullDetail(id || 0),
    queryFn: async () => {
      if (!id) return null;
      return await mySqlDataService.getProjectDetail(id);
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 获取项目成员
 *
 * @param projectId - 项目ID
 */
export function useProjectMembers(projectId: number | null): UseQueryResult<ProjectMember[], Error> {
  return useQuery({
    queryKey: projectKeys.members(projectId || 0),
    queryFn: async () => {
      if (!projectId) return [];
      return await mySqlDataService.getProjectMembers(projectId);
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 获取项目里程碑
 *
 * @param projectId - 项目ID
 */
export function useProjectMilestones(projectId: number | null): UseQueryResult<ProjectMilestone[], Error> {
  return useQuery({
    queryKey: projectKeys.milestones(projectId || 0),
    queryFn: async () => {
      if (!projectId) return [];
      return await mySqlDataService.getProjectMilestones(projectId);
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 查询项目（带参数）
 *
 * @param params - 查询参数
 */
export function useProjectsQuery(params: ProjectQueryParams): UseQueryResult<Project[], Error> {
  return useQuery({
    queryKey: projectKeys.list(params),
    queryFn: async () => {
      return await mySqlDataService.getProjectsByQuery(params);
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ==================== Mutations ====================

/**
 * 创建项目
 *
 * @example
 * ```tsx
 * const createProject = useCreateProject();
 * await createProject.mutateAsync(projectData);
 * ```
 */
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ProjectFormData) => {
      return await mySqlDataService.createProject(data);
    },
    onSuccess: () => {
      // 成功后自动刷新项目列表
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

/**
 * 更新项目
 *
 * @example
 * ```tsx
 * const updateProject = useUpdateProject();
 * await updateProject.mutateAsync({ id: 123, data: { name: '新名称' } });
 * ```
 */
export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Project> }) => {
      return await mySqlDataService.updateProject(id, data);
    },
    onSuccess: (_, variables) => {
      // 刷新项目列表和单个项目缓存
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.id) });
    },
  });
}

/**
 * 删除项目
 *
 * @example
 * ```tsx
 * const deleteProject = useDeleteProject();
 * await deleteProject.mutateAsync(123);
 * ```
 */
export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      return await mySqlDataService.deleteProject(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

// ==================== 成员操作 Mutations ====================

/**
 * 添加项目成员
 */
export function useAddProjectMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, memberId, role }: {
      projectId: number;
      memberId: number;
      role?: ProjectMemberRole;
    }) => {
      return await mySqlDataService.addProjectMember(projectId, memberId, role);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.members(variables.projectId) });
    },
  });
}

/**
 * 移除项目成员
 */
export function useRemoveProjectMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, memberId }: {
      projectId: number;
      memberId: number;
    }) => {
      return await mySqlDataService.removeProjectMember(projectId, memberId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.members(variables.projectId) });
    },
  });
}

/**
 * 更新项目成员角色
 */
export function useUpdateProjectMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, memberId, role }: {
      projectId: number;
      memberId: number;
      role: ProjectMemberRole;
    }) => {
      return await mySqlDataService.updateProjectMemberRole(projectId, memberId, role);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.members(variables.projectId) });
    },
  });
}

// ==================== 里程碑操作 Mutations ====================

/**
 * 创建项目里程碑
 */
export function useCreateProjectMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, milestone }: {
      projectId: number;
      milestone: Omit<ProjectMilestone, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>;
    }) => {
      return await mySqlDataService.createProjectMilestone(projectId, milestone);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.milestones(variables.projectId) });
    },
  });
}

/**
 * 更新项目里程碑
 */
export function useUpdateProjectMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, milestoneId, data }: {
      projectId: number;
      milestoneId: number;
      data: Partial<ProjectMilestone>;
    }) => {
      return await mySqlDataService.updateProjectMilestone(projectId, milestoneId, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.milestones(variables.projectId) });
    },
  });
}

/**
 * 删除项目里程碑
 */
export function useDeleteProjectMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, milestoneId }: {
      projectId: number;
      milestoneId: number;
    }) => {
      return await mySqlDataService.deleteProjectMilestone(projectId, milestoneId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.milestones(variables.projectId) });
    },
  });
}

/**
 * 更新里程碑状态
 */
export function useUpdateMilestoneStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, milestoneId, status }: {
      projectId: number;
      milestoneId: number;
      status: MilestoneStatus;
    }) => {
      return await mySqlDataService.updateMilestoneStatus(projectId, milestoneId, status);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.milestones(variables.projectId) });
    },
  });
}

// ==================== 进度操作 Mutations ====================

/**
 * 更新项目进度（自动计算）
 */
export function useUpdateProjectProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: number) => {
      return await mySqlDataService.updateProjectProgress(projectId);
    },
    onSuccess: (_, projectId) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
  });
}

/**
 * 设置项目进度（手动设置）
 */
export function useSetProjectProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, progress }: {
      projectId: number;
      progress: number;
    }) => {
      return await mySqlDataService.setProjectProgress(projectId, progress);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.projectId) });
    },
  });
}

// ==================== 完整项目更新 Mutation ====================

/**
 * 完整项目更新（包含成员和里程碑）
 */
export function useUpdateProjectFull() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: {
      id: number;
      data: {
        code?: string;
        name?: string;
        description?: string;
        projectType?: string;
        plannedStartDate?: string;
        plannedEndDate?: string;
        memberIds?: number[];
        milestones?: any[];
      };
    }) => {
      return await mySqlDataService.updateProjectFull(id, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.id) });
    },
  });
}

/**
 * 同步项目成员
 */
export function useSyncProjectMembers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, memberIds, role }: {
      projectId: number;
      memberIds: number[];
      role?: ProjectMemberRole;
    }) => {
      return await mySqlDataService.syncProjectMembers(projectId, memberIds, role);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.members(variables.projectId) });
    },
  });
}

/**
 * 同步项目里程碑
 */
export function useSyncProjectMilestones() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, milestones }: {
      projectId: number;
      milestones: any[];
    }) => {
      return await mySqlDataService.syncProjectMilestones(projectId, milestones);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.milestones(variables.projectId) });
    },
  });
}

// ==================== 批量操作 Mutations ====================

/**
 * 批量删除项目
 */
export function useBatchDeleteProjects() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map(id => mySqlDataService.deleteProject(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}
