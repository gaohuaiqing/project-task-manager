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
 */
interface BackendMember {
  id: number;
  username: string;
  real_name: string;
  role: 'admin' | 'tech_manager' | 'dept_manager' | 'engineer';
  department_id: number | null;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  department_name?: string;
}

/**
 * 将后端成员数据转换为前端格式
 */
function transformMember(backend: BackendMember): Member {
  return {
    id: backend.id,
    name: backend.real_name || backend.username || '未知用户',
    email: backend.email || '',
    departmentId: backend.department_id,
    departmentName: backend.department_name || null,
    position: null, // 后端暂无此字段
    role: backend.role === 'dept_manager' ? 'department_manager' : backend.role,
    status: backend.is_active ? 'active' : 'inactive',
    joinDate: backend.created_at,
    avatar: null,
    saturation: 0, // 后端暂无此字段，默认为 0
    createdAt: backend.created_at,
    updatedAt: backend.updated_at,
  };
}

// ========== 成员管理 ==========

export interface Member {
  id: number;
  name: string;
  email: string;
  departmentId: number | null;
  departmentName: string | null;
  position: string | null;
  role: 'admin' | 'tech_manager' | 'department_manager' | 'engineer';
  status: 'active' | 'inactive';
  joinDate: string | null;
  avatar: string | null;
  saturation: number;
  createdAt: string;
  updatedAt: string;
}

export interface MemberListParams {
  department_id?: number;
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
interface BackendDepartment {
  id: number;
  name: string;
  parent_id: number | null;
  manager_id: number | null;
  created_at: string;
  updated_at: string;
  children?: BackendDepartment[];
  member_count?: number;
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
 */
function transformDepartment(backend: BackendDepartment): Department {
  return {
    id: backend.id,
    name: backend.name,
    parentId: backend.parent_id,
    managerId: backend.manager_id,
    managerName: null, // 后端暂未返回此字段
    memberCount: backend.member_count || 0,
    createdAt: backend.created_at,
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
  const response = await apiClient.post<ApiResponse<{ id: number }>>(`${BASE_PATH}/departments`, data);
  return response.data;
}

export async function updateDepartment(id: number, data: UpdateDepartmentRequest): Promise<void> {
  await apiClient.put<ApiResponse<void>>(`${BASE_PATH}/departments/${id}`, data);
}

export async function deleteDepartment(id: number): Promise<void> {
  await apiClient.delete<ApiResponse<void>>(`${BASE_PATH}/departments/${id}`);
}

// ========== 成员 CRUD ==========

export interface CreateMemberRequest {
  username: string;
  displayName: string;
  email: string;
  departmentId?: number | null;
  position?: string;
  role: 'admin' | 'tech_manager' | 'department_manager' | 'engineer';
}

export interface UpdateMemberRequest {
  displayName?: string;
  email?: string;
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
  // 转换字段名：displayName -> real_name, departmentId -> department_id
  const payload = {
    username: data.username,
    real_name: data.displayName,
    email: data.email,
    department_id: data.departmentId,
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
  // 转换字段名：displayName -> real_name, departmentId -> department_id
  const payload: Record<string, unknown> = {};
  if (data.displayName !== undefined) {
    payload.real_name = data.displayName;
  }
  if (data.email !== undefined) {
    payload.email = data.email;
  }
  if (data.departmentId !== undefined) {
    payload.department_id = data.departmentId;
  }
  if (data.position !== undefined) {
    payload.position = data.position;
  }
  if (data.role !== undefined) {
    // 角色名称映射：前端 department_manager -> 后端 dept_manager
    payload.role = data.role === 'department_manager' ? 'dept_manager' : data.role;
  }
  if (data.status !== undefined) {
    payload.is_active = data.status === 'active';
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
interface BackendCapabilityModel {
  id: string;
  name: string;
  description: string | null;
  dimensions: CapabilityDimension[];
  created_at: string;
  updated_at: string;
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
function transformCapabilityModel(backend: BackendCapabilityModel): CapabilityModel {
  return {
    id: backend.id,
    name: backend.name,
    description: backend.description,
    dimensions: backend.dimensions,
    createdAt: backend.created_at,
    updatedAt: backend.updated_at,
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

export interface TaskTypeMapping {
  id: number;
  task_type: string;
  model_id: string;
  model_name: string;
  priority: number;
}

export interface CreateTaskTypeMappingRequest {
  task_type: string;
  model_id: string;
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

export interface AssigneeRecommendation {
  user_id: number;
  real_name: string;
  department_name: string | null;
  model_name: string;
  overall_score: number;
  match_level: 'excellent' | 'good' | 'fair';
  current_tasks: number;
}

export async function getAssigneeRecommendations(taskType: string): Promise<AssigneeRecommendation[]> {
  const response = await apiClient.get<ApiResponse<AssigneeRecommendation[]>>(
    `${BASE_PATH}/recommend-assignee`,
    { params: { task_type: taskType } }
  );
  return response.data;
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
};
