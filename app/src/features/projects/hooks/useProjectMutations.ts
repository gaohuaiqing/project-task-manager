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
      queryClient.invalidateQueries({ queryKey: queryKeys.project.all() });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.project.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.project.lists() });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.project.all() });
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
    onSuccess: () => {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.project.milestones(projectId) });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.project.milestones(projectId) });
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
