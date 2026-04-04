/**
 * 组织架构模块 API（包含能力模型）
 */
import apiClient from './client';
import type { ApiResponse } from '@/types/api';
import type {
  MemberCapabilityProfile,
  CapabilityMatrixParams,
  CapabilityAssessmentRequest,
  AssignmentSuggestion,
  CapabilityDevelopmentPlan,
  DimensionScore,
} from '@/features/assignment/types';

const BASE_PATH = '/org';

// ========== 字段映射工具 ==========

/**
 * 后端成员数据结构
 * 注：axios 拦截器已将 snake_case 转换为 camelCase
 */
interface BackendMember {
  id: number;
  username: string;
  realName: string;  // 拦截器已转换 real_name -> realName
  role: 'admin' | 'tech_manager' | 'dept_manager' | 'engineer';
  gender: 'male' | 'female' | 'other' | null;
  departmentId: number | null;  // 拦截器已转换 department_id -> departmentId
  email: string | null;
  phone: string | null;
  isActive: boolean;  // 拦截器已转换 is_active -> isActive
  isBuiltin: boolean;  // 拦截器已转换 is_builtin -> isBuiltin
  deletedAt: string | null;  // 拦截器已转换 deleted_at -> deletedAt
  deletedBy: number | null;  // 拦截器已转换 deleted_by -> deletedBy
  createdAt: string;  // 拦截器已转换 created_at -> createdAt
  updatedAt: string;  // 拦截器已转换 updated_at -> updatedAt
  departmentName?: string;  // 拦截器已转换 department_name -> departmentName
}

/**
 * 将后端成员数据转换为前端格式
 * 注：axios 拦截器已将 snake_case 转换为 camelCase
 */
function transformMember(backend: BackendMember): Member {
  return {
    id: backend.id,
    username: backend.username, // 工号
    name: backend.realName || backend.username || '未知用户',
    email: backend.email || '',
    phone: backend.phone || null,
    gender: backend.gender,
    departmentId: backend.departmentId,
    departmentName: backend.departmentName || null,
    position: null, // 后端暂无此字段
    role: backend.role === 'dept_manager' ? 'department_manager' : backend.role,
    status: backend.isActive ? 'active' : 'inactive',
    isBuiltin: backend.isBuiltin || false,
    deletedAt: backend.deletedAt,
    deletedBy: backend.deletedBy,
    joinDate: backend.createdAt,
    avatar: null,
    saturation: 0, // 后端暂无此字段，默认为 0
    createdAt: backend.createdAt,
    updatedAt: backend.updatedAt,
  };
}

// ========== 成员管理 ==========

export interface Member {
  id: number;
  username: string; // 工号
  name: string;
  email: string;
  phone: string | null;
  gender: 'male' | 'female' | 'other' | null;
  departmentId: number | null;
  departmentName: string | null;
  position: string | null;
  role: 'admin' | 'tech_manager' | 'department_manager' | 'engineer';
  status: 'active' | 'inactive';
  isBuiltin: boolean;
  deletedAt: string | null;
  deletedBy: number | null;
  joinDate: string | null;
  avatar: string | null;
  saturation: number;
  createdAt: string;
  updatedAt: string;
}

export interface MemberListParams {
  departmentId?: number;  // 请求拦截器会自动转换为 department_id
  role?: Member['role'];
  status?: Member['status'];
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function getMembers(params: MemberListParams = {}): Promise<{
  items: Member[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const response = await apiClient.get<ApiResponse<{
    items: BackendMember[];
    total: number;
    page: number;
    pageSize: number;
  }>>(`${BASE_PATH}/members`, { params });

  // axios 拦截器已返回 response.data，所以这里直接使用 response
  const data = response.data;
  return {
    items: data.items.map(transformMember),
    total: data.total,
    page: data.page,
    pageSize: data.pageSize,
  };
}

export async function getMember(id: number): Promise<Member> {
  const response = await apiClient.get<ApiResponse<BackendMember>>(`${BASE_PATH}/members/${id}`);
  // axios 拦截器已返回 response.data，所以这里直接使用 response
  return transformMember(response.data);
}

// ========== 部门管理 ==========

/**
 * 后端部门数据结构（蛇形命名）
 */
/**
 * 后端部门数据结构
 * 注：axios 拦截器已将 snake_case 转换为 camelCase
 */
interface BackendDepartment {
  id: number;
  name: string;
  parentId: number | null;  // 拦截器已转换 parent_id -> parentId
  managerId: number | null;  // 拦截器已转换 manager_id -> managerId
  createdAt: string;  // 拦截器已转换 created_at -> createdAt
  updatedAt: string;  // 拦截器已转换 updated_at -> updatedAt
  children?: BackendDepartment[];
  memberCount?: number;  // 拦截器已转换 member_count -> memberCount
}

export interface Department {
  id: number;
  name: string;
  parentId: number | null;
  managerId: number | null;
  managerName: string | null;
  memberCount: number;
  createdAt: string;
  children?: Department[];
}

/**
 * 将后端部门数据转换为前端格式（递归处理children）
 * 注：axios 拦截器已将 snake_case 转换为 camelCase
 */
function transformDepartment(backend: BackendDepartment): Department {
  return {
    id: backend.id,
    name: backend.name,
    parentId: backend.parentId,
    managerId: backend.managerId,
    managerName: null, // 后端暂未返回此字段
    memberCount: backend.memberCount || 0,
    createdAt: backend.createdAt,
    children: backend.children?.map(transformDepartment) || [],
  };
}

/**
 * 将嵌套的部门树扁平化为列表（清除children，由前端buildDepartmentTree重建）
 */
function flattenDepartments(departments: Department[]): Department[] {
  const result: Department[] = [];

  function flatten(list: Department[]) {
    for (const dept of list) {
      const { children, ...deptWithoutChildren } = dept;
      result.push(deptWithoutChildren as Department);
      if (children && children.length > 0) {
        flatten(children);
      }
    }
  }

  flatten(departments);
  return result;
}

export async function getDepartments(): Promise<Department[]> {
  const response = await apiClient.get<{ success: boolean; data: BackendDepartment[] }>(`${BASE_PATH}/departments`);
  const nested = response.data.map(transformDepartment);
  // 扁平化列表，保留 parentId，让 buildDepartmentTree 重建树结构
  return flattenDepartments(nested);
}

export async function getDepartmentTree(): Promise<Department[]> {
  const response = await apiClient.get<{ success: boolean; data: BackendDepartment[] }>(`${BASE_PATH}/departments`);
  const nested = response.data.map(transformDepartment);
  // 扁平化列表，保留 parentId，让 buildDepartmentTree 重建树结构
  return flattenDepartments(nested);
}

// ========== 部门 CRUD ==========

export interface CreateDepartmentRequest {
  name: string;
  parentId?: number | null;
  managerId?: number | null;
  description?: string;
}

export interface UpdateDepartmentRequest {
  name?: string;
  parentId?: number | null;
  managerId?: number | null;
  description?: string;
}

export async function createDepartment(data: CreateDepartmentRequest): Promise<{ id: number }> {
  // 拦截器会自动转换 camelCase -> snake_case
  const payload = {
    name: data.name,
    parentId: data.parentId ?? null,    // 拦截器会转换为 parent_id
    managerId: data.managerId ?? null,  // 拦截器会转换为 manager_id
    description: data.description,
  };
  const response = await apiClient.post<ApiResponse<{ id: number }>>(`${BASE_PATH}/departments`, payload);
  return response.data;
}

export async function updateDepartment(id: number, data: UpdateDepartmentRequest): Promise<void> {
  // 拦截器会自动转换 camelCase -> snake_case
  const payload: Record<string, unknown> = {};
  if (data.name !== undefined) {
    payload.name = data.name;
  }
  if (data.parentId !== undefined) {
    payload.parentId = data.parentId;  // 拦截器会转换为 parent_id
  }
  if (data.managerId !== undefined) {
    payload.managerId = data.managerId;  // 拦截器会转换为 manager_id
  }
  if (data.description !== undefined) {
    payload.description = data.description;
  }
  await apiClient.put<ApiResponse<void>>(`${BASE_PATH}/departments/${id}`, payload);
}

export async function deleteDepartment(id: number): Promise<{ deletedDepartments: number; deletedMembers: number }> {
  const response = await apiClient.delete<ApiResponse<{ deletedDepartments: number; deletedMembers: number }>>(`${BASE_PATH}/departments/${id}`);
  return response.data;
}

// ========== 成员 CRUD ==========

export interface CreateMemberRequest {
  username: string;
  displayName: string;
  email: string;
  phone?: string;
  gender?: 'male' | 'female' | 'other';
  departmentId?: number | null;
  position?: string;
  role: 'admin' | 'tech_manager' | 'department_manager' | 'engineer';
}

export interface UpdateMemberRequest {
  displayName?: string;
  email?: string;
  phone?: string;
  gender?: 'male' | 'female' | 'other';
  departmentId?: number | null;
  position?: string;
  role?: 'admin' | 'tech_manager' | 'department_manager' | 'engineer';
  status?: 'active' | 'inactive';
}

export interface CreateMemberResponse {
  id: number;
  initialPassword: string;
}

export async function createMember(data: CreateMemberRequest): Promise<{ id: number; initialPassword: string }> {
  // 语义映射：displayName -> realName（拦截器会转换为 real_name）
  // 其他字段拦截器会自动转换 camelCase -> snake_case
  const payload = {
    username: data.username,
    realName: data.displayName,  // 拦截器会转换为 real_name
    email: data.email,
    phone: data.phone,
    gender: data.gender,
    departmentId: data.departmentId,  // 拦截器会转换为 department_id
    position: data.position,
    role: data.role,
  };
  const response = await apiClient.post<ApiResponse<{ id: number; initialPassword: string }>>(
    `${BASE_PATH}/members`,
    payload
  );
  return response.data;
}

export async function updateMember(id: number, data: UpdateMemberRequest): Promise<void> {
  // 构建请求体，拦截器会自动转换 camelCase -> snake_case
  const payload: Record<string, unknown> = {};
  if (data.displayName !== undefined) {
    payload.realName = data.displayName;  // 拦截器会转换为 real_name
  }
  if (data.email !== undefined) {
    payload.email = data.email;
  }
  if (data.phone !== undefined) {
    payload.phone = data.phone;
  }
  if (data.gender !== undefined) {
    payload.gender = data.gender;
  }
  if (data.departmentId !== undefined) {
    payload.departmentId = data.departmentId;  // 拦截器会转换为 department_id
  }
  if (data.position !== undefined) {
    payload.position = data.position;
  }
  if (data.role !== undefined) {
    // 角色名称映射：前端 department_manager -> 后端 dept_manager
    payload.role = data.role === 'department_manager' ? 'dept_manager' : data.role;
  }
  if (data.status !== undefined) {
    payload.isActive = data.status === 'active';  // 拦截器会转换为 is_active
  }
  await apiClient.put<ApiResponse<void>>(`${BASE_PATH}/members/${id}`, payload);
}

export async function deleteMember(id: number): Promise<void> {
  await apiClient.delete<ApiResponse<void>>(`${BASE_PATH}/members/${id}`);
}

// ========== 成员删除检查 ==========

export interface MemberDeletionCheck {
  canDelete: boolean;
  canDeactivate: boolean;
  warnings: string[];
  blockingReasons: string[];
  stats: {
    projects: number;
    tasks: number;
    approvals: number;
    capabilityRecords: number;
  };
  managedDepts?: { id: number; name: string }[];
}

/**
 * 获取成员删除检查数据
 */
export async function getMemberDeletionCheck(id: number): Promise<MemberDeletionCheck> {
  const response = await apiClient.get<ApiResponse<MemberDeletionCheck>>(
    `${BASE_PATH}/members/${id}/deletion-check`
  );
  return response.data;
}

/**
 * 软删除（停用）成员
 */
export async function deactivateMember(id: number): Promise<void> {
  await apiClient.put<ApiResponse<void>>(`${BASE_PATH}/members/${id}/deactivate`);
}

/**
 * 物理删除成员
 */
export async function hardDeleteMember(id: number): Promise<void> {
  await apiClient.delete<ApiResponse<void>>(`${BASE_PATH}/members/${id}?permanent=true`);
}

/**
 * 重置成员密码
 */
export async function resetMemberPassword(id: number): Promise<{ newPassword: string }> {
  const response = await apiClient.post<ApiResponse<{ newPassword: string }>>(
    `/auth/users/${id}/reset-password`
  );
  return response.data;
}

// ========== 能力模型 ==========

export async function getMemberCapabilities(memberId: number): Promise<MemberCapabilityProfile> {
  const response = await apiClient.get<ApiResponse<MemberCapabilityProfile>>(
    `${BASE_PATH}/members/${memberId}/capabilities`
  );
  return response.data;
}

export async function getCapabilityMatrix(params: CapabilityMatrixParams = {}): Promise<MemberCapabilityProfile[]> {
  const response = await apiClient.post<ApiResponse<MemberCapabilityProfile[]>>(
    `${BASE_PATH}/capabilities/matrix`,
    params
  );
  return response.data;
}

export async function submitCapabilityAssessment(data: CapabilityAssessmentRequest): Promise<{ id: string }> {
  const response = await apiClient.post<ApiResponse<{ id: string }>>(
    `${BASE_PATH}/capabilities/assess`,
    data
  );
  return response.data;
}

export async function getCapabilityHistory(memberId: number): Promise<any[]> {
  const response = await apiClient.get<ApiResponse<any[]>>(
    `${BASE_PATH}/members/${memberId}/capabilities/history`
  );
  return response.data;
}

// ========== 智能分配 ==========

export async function getAssignmentSuggestions(params: {
  taskId: string;
  dimensions?: DimensionScore[];
  minScore?: number;
}): Promise<AssignmentSuggestion> {
  const response = await apiClient.post<ApiResponse<AssignmentSuggestion>>(
    `${BASE_PATH}/assignment/suggest`,
    params
  );
  return response.data;
}

export async function batchAssignmentSuggestions(params: {
  taskIds: string[];
}): Promise<AssignmentSuggestion[]> {
  const response = await apiClient.post<ApiResponse<AssignmentSuggestion[]>>(
    `${BASE_PATH}/assignment/suggest-batch`,
    params
  );
  return response.data;
}

// ========== 能力发展计划 ==========

export async function getDevelopmentPlans(memberId: number): Promise<CapabilityDevelopmentPlan[]> {
  const response = await apiClient.get<ApiResponse<CapabilityDevelopmentPlan[]>>(
    `${BASE_PATH}/members/${memberId}/development-plans`
  );
  return response.data;
}

export async function createDevelopmentPlan(data: {
  memberId: number;
  targetCapabilities: Record<string, number>; // 维度名称 -> 目标分数
  targetDate: string;
  actions: any[];
}): Promise<{ id: string }> {
  const response = await apiClient.post<ApiResponse<{ id: string }>>(
    `${BASE_PATH}/development-plans`,
    data
  );
  return response.data;
}

// ========== 能力模型 CRUD ==========

/**
 * 后端能力模型数据结构（蛇形命名）
 */
/**
 * 后端能力模型数据结构
 * 注：axios 拦截器已将 snake_case 转换为 camelCase
 */
interface BackendCapabilityModel {
  id: string;
  name: string;
  description: string | null;
  dimensions: CapabilityDimension[];
  createdAt: string;  // 拦截器已转换 created_at -> createdAt
  updatedAt: string;  // 拦截器已转换 updated_at -> updatedAt
}

export interface CapabilityModel {
  id: string;
  name: string;
  description: string | null;
  dimensions: CapabilityDimension[];
  createdAt: string;
  updatedAt: string;
}

export interface CapabilityDimension {
  name: string;
  weight: number;
  description?: string;
}

export interface CreateCapabilityModelRequest {
  name: string;
  description?: string;
  dimensions: CapabilityDimension[];
}

export interface UpdateCapabilityModelRequest {
  name?: string;
  description?: string;
  dimensions?: CapabilityDimension[];
}

/**
 * 将后端能力模型数据转换为前端格式
 */
/**
 * 将后端能力模型数据转换为前端格式
 * 注：axios 拦截器已将 snake_case 转换为 camelCase
 */
function transformCapabilityModel(backend: BackendCapabilityModel): CapabilityModel {
  return {
    id: backend.id,
    name: backend.name,
    description: backend.description,
    dimensions: backend.dimensions,
    createdAt: backend.createdAt,
    updatedAt: backend.updatedAt,
  };
}

export async function getCapabilityModels(): Promise<CapabilityModel[]> {
  const response = await apiClient.get<ApiResponse<BackendCapabilityModel[]>>(`${BASE_PATH}/capability-models`);
  return response.data.map(transformCapabilityModel);
}

export async function getCapabilityModel(id: string): Promise<CapabilityModel> {
  const response = await apiClient.get<ApiResponse<CapabilityModel>>(`${BASE_PATH}/capability-models/${id}`);
  return response.data;
}

export async function createCapabilityModel(data: CreateCapabilityModelRequest): Promise<{ id: string }> {
  const response = await apiClient.post<ApiResponse<{ id: string }>>(`${BASE_PATH}/capability-models`, data);
  return response.data;
}

export async function updateCapabilityModel(id: string, data: UpdateCapabilityModelRequest): Promise<void> {
  await apiClient.put<ApiResponse<void>>(`${BASE_PATH}/capability-models/${id}`, data);
}

export async function deleteCapabilityModel(id: string): Promise<void> {
  await apiClient.delete<ApiResponse<void>>(`${BASE_PATH}/capability-models/${id}`);
}

// ========== 任务类型映射 CRUD ==========
// 注：axios 拦截器已将 snake_case 转换为 camelCase

export interface TaskTypeMapping {
  id: number;
  taskType: string;  // 拦截器已转换 task_type -> taskType
  modelId: string;  // 拦截器已转换 model_id -> modelId
  modelName: string;  // 拦截器已转换 model_name -> modelName
  priority: number;
}

export interface CreateTaskTypeMappingRequest {
  taskType: string;
  modelId: string;
  priority: number;
}

export interface UpdateTaskTypeMappingRequest {
  task_type?: string;
  model_id?: string;
  priority?: number;
}

export async function getTaskTypeMappings(): Promise<TaskTypeMapping[]> {
  const response = await apiClient.get<ApiResponse<TaskTypeMapping[]>>(`${BASE_PATH}/task-type-mappings`);
  return response.data;
}

export async function getTaskTypeMapping(id: number): Promise<TaskTypeMapping> {
  const response = await apiClient.get<ApiResponse<TaskTypeMapping>>(`${BASE_PATH}/task-type-mappings/${id}`);
  return response.data;
}

export async function createTaskTypeMapping(data: CreateTaskTypeMappingRequest): Promise<{ id: number }> {
  const response = await apiClient.post<ApiResponse<{ id: number }>>(`${BASE_PATH}/task-type-mappings`, data);
  return response.data;
}

export async function updateTaskTypeMapping(id: number, data: UpdateTaskTypeMappingRequest): Promise<void> {
  await apiClient.put<ApiResponse<void>>(`${BASE_PATH}/task-type-mappings/${id}`, data);
}

export async function deleteTaskTypeMapping(id: number): Promise<void> {
  await apiClient.delete<ApiResponse<void>>(`${BASE_PATH}/task-type-mappings/${id}`);
}

// ========== 智能推荐 ==========
// 注：响应拦截器会自动转换 snake_case -> camelCase

export interface AssigneeRecommendation {
  userId: number;
  realName: string;
  gender: 'male' | 'female' | 'other' | null;
  departmentName: string | null;
  modelName: string;
  overallScore: number;
  matchLevel: 'excellent' | 'good' | 'fair';
  currentTasks: number;
}

export async function getAssigneeRecommendations(taskType: string): Promise<AssigneeRecommendation[]> {
  const response = await apiClient.get<ApiResponse<AssigneeRecommendation[]>>(
    `${BASE_PATH}/recommend-assignee`,
    { params: { taskType } }
  );
  return response.data ?? [];
}

// ========== 导入导出功能 ==========

/**
 * 下载组织架构导入模板
 */
export async function downloadOrganizationTemplate(): Promise<void> {
  const blob = await apiClient.get(`${BASE_PATH}/export/template/organization`, {
    responseType: 'blob',
  });
  // 注意：由于 axios 拦截器返回 response.data，所以这里 blob 已经是 Blob 类型
  const url = window.URL.createObjectURL(blob as Blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'organization_template.xlsx');
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

/**
 * 导出组织架构数据
 */
export async function exportOrganization(): Promise<void> {
  const blob = await apiClient.get(`${BASE_PATH}/export/organization`, {
    responseType: 'blob',
  });
  // 注意：由于 axios 拦截器返回 response.data，所以这里 blob 已经是 Blob 类型
  const url = window.URL.createObjectURL(blob as Blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `organization_${new Date().toISOString().split('T')[0]}.xlsx`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

/**
 * 导入组织架构数据
 */
export async function importOrganization(file: File): Promise<{
  success: boolean;
  message: string;
  departments: number;
  members: number;
}> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post<ApiResponse<{
    message: string;
    departments: number;
    members: number;
  }>>(`${BASE_PATH}/import/organization`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return {
    success: true,
    ...response.data,
  };
}

export const orgApi = {
  // 部门管理
  getDepartments,
  getDepartmentTree,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  // 成员管理
  getMembers,
  getMember,
  createMember,
  updateMember,
  deleteMember,
  deactivateMember,
  hardDeleteMember,
  getMemberDeletionCheck,
  resetMemberPassword,
  // 能力模型 CRUD
  getCapabilityModels,
  getCapabilityModel,
  createCapabilityModel,
  updateCapabilityModel,
  deleteCapabilityModel,
  // 任务类型映射 CRUD
  getTaskTypeMappings,
  getTaskTypeMapping,
  createTaskTypeMapping,
  updateTaskTypeMapping,
  deleteTaskTypeMapping,
  // 成员能力
  getMemberCapabilities,
  getCapabilityMatrix,
  submitCapabilityAssessment,
  getCapabilityHistory,
  // 智能分配
  getAssignmentSuggestions,
  batchAssignmentSuggestions,
  // 智能推荐
  getAssigneeRecommendations,
  // 发展计划
  getDevelopmentPlans,
  createDevelopmentPlan,
  // 导入导出
  downloadOrganizationTemplate,
  exportOrganization,
  importOrganization,
};
