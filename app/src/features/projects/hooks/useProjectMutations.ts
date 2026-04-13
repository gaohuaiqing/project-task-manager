/**
 * 项目变更 Hook
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectApi } from '@/lib/api/project.api';
import { queryKeys } from '@/lib/api/query-keys';
import type {
  CreateProjectRequest,
  UpdateProjectRequest,
} from '../types';

/**
 * 创建项目
 */
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProjectRequest) => projectApi.createProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.project.all });
    },
  });
}

/**
 * 更新项目
 */
export function useUpdateProject(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateProjectRequest) => projectApi.updateProject(id, data),
    onSuccess: () => {
      // 使用 project.all 失效所有项目相关查询（包括带参数的列表查询）
      queryClient.invalidateQueries({ queryKey: queryKeys.project.all });
      // 失效任务缓存：任务中的 projectName 是 JOIN 查询返回的
      queryClient.invalidateQueries({ queryKey: queryKeys.task.all });
    },
  });
}

/**
 * 删除项目
 */
export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => projectApi.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.project.all });
    },
  });
}

/**
 * 创建里程碑
 */
export function useCreateMilestone(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof projectApi.createMilestone>[1]) =>
      projectApi.createMilestone(projectId, data),
    onSuccess: async () => {
      // 强制重新获取项目详情
      await queryClient.refetchQueries({ queryKey: queryKeys.project.detail(projectId) });
      // 失效所有项目列表查询（包括带参数的），并强制重新获取活跃查询
      await queryClient.invalidateQueries({
        queryKey: queryKeys.project.all,
        refetchType: 'active',
      });
      // 失效里程碑缓存
      queryClient.invalidateQueries({ queryKey: queryKeys.project.milestones(projectId) });
    },
  });
}

/**
 * 更新里程碑
 */
export function useUpdateMilestone(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof projectApi.updateMilestone>[1] }) =>
      projectApi.updateMilestone(id, data),
    onSuccess: async (_, variables) => {
      // 乐观更新：直接更新缓存数据，立即刷新 UI
      queryClient.setQueryData(
        queryKeys.project.milestones(projectId),
        (old: any[]) => {
          if (!old) return old;
          return old.map(m =>
            m.id === variables.id
              ? { ...m, ...variables.data }
              : m
          );
        }
      );
      // 强制重新获取项目详情
      await queryClient.refetchQueries({ queryKey: queryKeys.project.detail(projectId) });
      // 失效所有项目列表查询（包括带参数的），并强制重新获取活跃查询
      await queryClient.invalidateQueries({
        queryKey: queryKeys.project.all,
        refetchType: 'active',
      });
      // 失效里程碑缓存
      queryClient.invalidateQueries({
        queryKey: queryKeys.project.milestones(projectId),
      });
    },
  });
}

/**
 * 删除里程碑
 */
export function useDeleteMilestone(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => projectApi.deleteMilestone(id),
    onSuccess: async (_, deletedId) => {
      // 乐观更新：立即从缓存中移除已删除的里程碑
      queryClient.setQueryData(
        queryKeys.project.milestones(projectId),
        (old: any[]) => {
          if (!old) return old;
          return old.filter(m => m.id !== deletedId);
        }
      );
      // 强制重新获取项目详情
      await queryClient.refetchQueries({ queryKey: queryKeys.project.detail(projectId) });
      // 失效所有项目列表查询（包括带参数的），并强制重新获取活跃查询
      await queryClient.invalidateQueries({
        queryKey: queryKeys.project.all,
        refetchType: 'active',
      });
      // 失效里程碑缓存
      queryClient.invalidateQueries({
        queryKey: queryKeys.project.milestones(projectId),
      });
    },
  });
}

/**
 * 添加项目成员
 */
export function useAddProjectMember(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { userId: number; role: string }) =>
      projectApi.addProjectMember(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.project.members(projectId) });
    },
  });
}

/**
 * 移除项目成员
 */
export function useRemoveProjectMember(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: number) => projectApi.removeProjectMember(projectId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.project.members(projectId) });
    },
  });
}

// ============ 时间线 Mutations ============

/**
 * 创建时间线
 */
export function useCreateTimeline(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof projectApi.createTimeline>[1]) =>
      projectApi.createTimeline(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.project.timelines(projectId) });
    },
  });
}

/**
 * 更新时间线
 */
export function useUpdateTimeline(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof projectApi.updateTimeline>[1] }) =>
      projectApi.updateTimeline(id, data),
    onSuccess: (_, variables) => {
      // 乐观更新：直接更新缓存数据，立即刷新 UI
      queryClient.setQueryData(
        queryKeys.project.timelines(projectId),
        (old: any[]) => {
          if (!old) return old;
          return old.map(t =>
            t.id === variables.id
              ? { ...t, ...variables.data }
              : t
          );
        }
      );
      // 同时触发重新获取，确保数据一致性
      queryClient.invalidateQueries({
        queryKey: queryKeys.project.timelines(projectId),
        refetchType: 'active'
      });
    },
  });
}

/**
 * 删除时间线
 */
export function useDeleteTimeline(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => projectApi.deleteTimeline(id),
    onSuccess: (_, deletedId) => {
      // 乐观更新：立即从缓存中移除已删除的时间线
      queryClient.setQueryData(
        queryKeys.project.timelines(projectId),
        (old: any[]) => {
          if (!old) return old;
          return old.filter(t => t.id !== deletedId);
        }
      );
      // 同时触发重新获取，确保数据一致性
      queryClient.invalidateQueries({
        queryKey: queryKeys.project.timelines(projectId),
        refetchType: 'active'
      });
    },
  });
}
