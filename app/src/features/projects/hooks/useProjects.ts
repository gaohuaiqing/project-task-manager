/**
 * 项目列表 Hook
 */
import { useQuery } from '@tanstack/react-query';
import { projectApi } from '@/lib/api/project.api';
import { queryKeys } from '@/lib/api/query-keys';
import type { ProjectQueryParams } from '../types';

/**
 * 获取项目列表
 */
export function useProjects(params: ProjectQueryParams = {}) {
  return useQuery({
    queryKey: queryKeys.project.list(params),
    queryFn: () => projectApi.getProjects(params),
    staleTime: 2 * 60 * 1000, // 2 分钟
  });
}

/**
 * 获取项目详情
 */
export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.project.detail(id!),
    queryFn: () => projectApi.getProject(id!),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * 获取项目统计
 */
export function useProjectStats(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.project.stats(id!),
    queryFn: () => projectApi.getProjectStats(id!),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * 获取项目里程碑
 */
export function useProjectMilestones(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.project.milestones(projectId!),
    queryFn: () => projectApi.getMilestones(projectId!),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * 获取项目时间线
 */
export function useProjectTimelines(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.project.timelines(projectId!),
    queryFn: () => projectApi.getTimelines(projectId!),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * 获取项目成员
 */
export function useProjectMembers(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.project.members(projectId!),
    queryFn: () => projectApi.getProjectMembers(projectId!),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
  });
}
