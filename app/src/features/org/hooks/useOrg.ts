/**
 * 组织架构 React Query Hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getDepartments,
  getDepartmentTree,
  getMembers,
  getMember,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  createMember,
  updateMember,
  deleteMember,
  deactivateMember,
  hardDeleteMember,
  getMemberDeletionCheck,
  resetMemberPassword,
  getCapabilityModels,
  getCapabilityModel,
  createCapabilityModel,
  updateCapabilityModel,
  deleteCapabilityModel,
  getTaskTypeMappings,
  getTaskTypeMapping,
  createTaskTypeMapping,
  updateTaskTypeMapping,
  deleteTaskTypeMapping,
  type MemberListParams,
  type CreateDepartmentRequest,
  type UpdateDepartmentRequest,
  type CreateMemberRequest,
  type UpdateMemberRequest,
  type CreateMemberResponse,
  type CreateCapabilityModelRequest,
  type UpdateCapabilityModelRequest,
  type CreateTaskTypeMappingRequest,
  type UpdateTaskTypeMappingRequest,
} from '@/lib/api/org.api';
import { queryKeys } from '@/lib/api/query-keys';

// ========== 部门查询 ==========

/**
 * 获取部门列表（扁平）
 */
export function useDepartments() {
  return useQuery({
    queryKey: queryKeys.org.departments,
    queryFn: () => getDepartments(),
    staleTime: 5 * 60 * 1000, // 5 分钟
  });
}

/**
 * 获取部门树（嵌套）
 */
export function useDepartmentTree() {
  return useQuery({
    queryKey: queryKeys.org.departmentTree,
    queryFn: () => getDepartmentTree(),
    staleTime: 5 * 60 * 1000,
  });
}

// ========== 成员查询 ==========

/**
 * 获取成员列表
 */
export function useMembers(params: MemberListParams = {}) {
  return useQuery({
    queryKey: queryKeys.org.members(params),
    queryFn: () => getMembers(params),
    staleTime: 2 * 60 * 1000, // 2 分钟
  });
}

/**
 * 获取成员详情
 */
export function useMember(id: number | undefined) {
  return useQuery({
    queryKey: queryKeys.org.member(id!),
    queryFn: () => getMember(id!),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
}

// ========== 部门变更 ==========

/**
 * 创建部门
 */
export function useCreateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDepartmentRequest) => createDepartment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.org.departments });
      queryClient.invalidateQueries({ queryKey: queryKeys.org.departmentTree });
    },
  });
}

/**
 * 更新部门
 */
export function useUpdateDepartment(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateDepartmentRequest) => updateDepartment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.org.department(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.org.departments });
      queryClient.invalidateQueries({ queryKey: queryKeys.org.departmentTree });
    },
  });
}

/**
 * 删除部门
 */
export function useDeleteDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteDepartment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.org.departments });
      queryClient.invalidateQueries({ queryKey: queryKeys.org.departmentTree });
    },
  });
}

// ========== 成员变更 ==========

/**
 * 创建成员
 */
export function useCreateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMemberRequest): Promise<CreateMemberResponse> =>
      createMember(data),
    onSuccess: () => {
      // 使用前缀匹配，失效所有成员相关查询
      queryClient.invalidateQueries({ queryKey: ['org', 'members'] });
    },
  });
}

/**
 * 更新成员
 */
export function useUpdateMember(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateMemberRequest) => updateMember(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.org.member(id) });
      // 使用前缀匹配，失效所有成员相关查询
      queryClient.invalidateQueries({ queryKey: ['org', 'members'] });
      // 失效任务缓存：任务中的 assigneeName 是 JOIN 查询返回的
      queryClient.invalidateQueries({ queryKey: queryKeys.task.all });
    },
  });
}

/**
 * 删除成员
 */
export function useDeleteMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteMember(id),
    onSuccess: () => {
      // 使用前缀匹配，失效所有成员相关查询
      queryClient.invalidateQueries({ queryKey: ['org', 'members'] });
    },
  });
}

/**
 * 获取成员删除检查数据（mutation 形式，用于点击删除按钮时触发）
 */
export function useMemberDeletionCheck() {
  return useMutation({
    mutationFn: (id: number) => getMemberDeletionCheck(id),
  });
}

/**
 * 软删除（停用）成员
 */
export function useDeactivateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deactivateMember(id),
    onSuccess: () => {
      // 使用前缀匹配，失效所有成员相关查询
      queryClient.invalidateQueries({ queryKey: ['org', 'members'] });
    },
  });
}

/**
 * 物理删除成员
 */
export function useHardDeleteMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => hardDeleteMember(id),
    onSuccess: () => {
      // 使用前缀匹配，失效所有成员相关查询
      queryClient.invalidateQueries({ queryKey: ['org', 'members'] });
    },
  });
}

/**
 * 重置成员密码
 */
export function useResetPassword() {
  return useMutation({
    mutationFn: (id: number) => resetMemberPassword(id),
  });
}

// ========== 能力模型查询 ==========

/**
 * 获取能力模型列表
 */
export function useCapabilityModels() {
  return useQuery({
    queryKey: queryKeys.org.capabilityModels,
    queryFn: () => getCapabilityModels(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 获取能力模型详情
 */
export function useCapabilityModel(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.org.capabilityModel(id!),
    queryFn: () => getCapabilityModel(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

// ========== 能力模型变更 ==========

/**
 * 创建能力模型
 */
export function useCreateCapabilityModel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCapabilityModelRequest) => createCapabilityModel(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.org.capabilityModels });
    },
  });
}

/**
 * 更新能力模型
 */
export function useUpdateCapabilityModel(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateCapabilityModelRequest) => updateCapabilityModel(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.org.capabilityModel(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.org.capabilityModels });
    },
  });
}

/**
 * 删除能力模型
 */
export function useDeleteCapabilityModel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCapabilityModel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.org.capabilityModels });
    },
  });
}

// ========== 任务类型映射查询 ==========

/**
 * 获取任务类型映射列表
 */
export function useTaskTypeMappings() {
  return useQuery({
    queryKey: ['org', 'task-type-mappings'],
    queryFn: () => getTaskTypeMappings(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 获取任务类型映射详情
 */
export function useTaskTypeMapping(id: number | undefined) {
  return useQuery({
    queryKey: ['org', 'task-type-mapping', id],
    queryFn: () => getTaskTypeMapping(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

// ========== 任务类型映射变更 ==========

/**
 * 创建任务类型映射
 */
export function useCreateTaskTypeMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTaskTypeMappingRequest) => createTaskTypeMapping(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org', 'task-type-mappings'] });
    },
  });
}

/**
 * 更新任务类型映射
 */
export function useUpdateTaskTypeMapping(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateTaskTypeMappingRequest) => updateTaskTypeMapping(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org', 'task-type-mapping', id] });
      queryClient.invalidateQueries({ queryKey: ['org', 'task-type-mappings'] });
    },
  });
}

/**
 * 删除任务类型映射
 */
export function useDeleteTaskTypeMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteTaskTypeMapping(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org', 'task-type-mappings'] });
    },
  });
}
