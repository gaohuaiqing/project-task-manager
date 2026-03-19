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
  CapabilityDimension,
} from '@/features/assignment/types';

const BASE_PATH = '/api/org';

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
  const response = await apiClient.get<ApiResponse<any>>(`${BASE_PATH}/members`, { params });
  return response.data.data;
}

export async function getMember(id: number): Promise<Member> {
  const response = await apiClient.get<ApiResponse<Member>>(`${BASE_PATH}/members/${id}`);
  return response.data.data;
}

// ========== 部门管理 ==========

export interface Department {
  id: number;
  name: string;
  parentId: number | null;
  managerId: number | null;
  managerName: string | null;
  memberCount: number;
  createdAt: string;
}

export async function getDepartments(): Promise<Department[]> {
  const response = await apiClient.get<ApiResponse<Department[]>>(`${BASE_PATH}/departments`);
  return response.data.data;
}

export async function getDepartmentTree(): Promise<Department[]> {
  const response = await apiClient.get<ApiResponse<Department[]>>(`${BASE_PATH}/departments/tree`);
  return response.data.data;
}

// ========== 能力模型 ==========

export async function getMemberCapabilities(memberId: number): Promise<MemberCapabilityProfile> {
  const response = await apiClient.get<ApiResponse<MemberCapabilityProfile>>(
    `${BASE_PATH}/members/${memberId}/capabilities`
  );
  return response.data.data;
}

export async function getCapabilityMatrix(params: CapabilityMatrixParams = {}): Promise<MemberCapabilityProfile[]> {
  const response = await apiClient.post<ApiResponse<MemberCapabilityProfile[]>>(
    `${BASE_PATH}/capabilities/matrix`,
    params
  );
  return response.data.data;
}

export async function submitCapabilityAssessment(data: CapabilityAssessmentRequest): Promise<{ id: string }> {
  const response = await apiClient.post<ApiResponse<{ id: string }>>(
    `${BASE_PATH}/capabilities/assess`,
    data
  );
  return response.data.data;
}

export async function getCapabilityHistory(memberId: number): Promise<any[]> {
  const response = await apiClient.get<ApiResponse<any[]>>(
    `${BASE_PATH}/members/${memberId}/capabilities/history`
  );
  return response.data.data;
}

// ========== 智能分配 ==========

export async function getAssignmentSuggestions(params: {
  taskId: string;
  dimensions?: CapabilityDimension[];
  minScore?: number;
}): Promise<AssignmentSuggestion> {
  const response = await apiClient.post<ApiResponse<AssignmentSuggestion>>(
    `${BASE_PATH}/assignment/suggest`,
    params
  );
  return response.data.data;
}

export async function batchAssignmentSuggestions(params: {
  taskIds: string[];
}): Promise<AssignmentSuggestion[]> {
  const response = await apiClient.post<ApiResponse<AssignmentSuggestion[]>>(
    `${BASE_PATH}/assignment/suggest-batch`,
    params
  );
  return response.data.data;
}

// ========== 能力发展计划 ==========

export async function getDevelopmentPlans(memberId: number): Promise<CapabilityDevelopmentPlan[]> {
  const response = await apiClient.get<ApiResponse<CapabilityDevelopmentPlan[]>>(
    `${BASE_PATH}/members/${memberId}/development-plans`
  );
  return response.data.data;
}

export async function createDevelopmentPlan(data: {
  memberId: number;
  targetCapabilities: Partial<Record<CapabilityDimension, number>>;
  targetDate: string;
  actions: any[];
}): Promise<{ id: string }> {
  const response = await apiClient.post<ApiResponse<{ id: string }>>(
    `${BASE_PATH}/development-plans`,
    data
  );
  return response.data.data;
}

export const orgApi = {
  getMembers,
  getMember,
  getDepartments,
  getDepartmentTree,
  getMemberCapabilities,
  getCapabilityMatrix,
  submitCapabilityAssessment,
  getCapabilityHistory,
  getAssignmentSuggestions,
  batchAssignmentSuggestions,
  getDevelopmentPlans,
  createDevelopmentPlan,
};
