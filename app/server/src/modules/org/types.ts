// app/server/src/modules/org/types.ts

// ============ 部门相关 ============

export interface Department {
  id: number;
  name: string;
  parent_id: number | null;
  manager_id: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface DepartmentTreeNode extends Department {
  children: DepartmentTreeNode[];
  member_count: number;
  manager_name?: string;
}

export interface CreateDepartmentRequest {
  name: string;
  parent_id?: number | null;
  manager_id?: number | null;
}

export interface UpdateDepartmentRequest {
  name?: string;
  parent_id?: number | null;
  manager_id?: number | null;
}

// ============ 成员相关 ============

export type GenderType = 'male' | 'female' | 'other';

export interface Member {
  id: number;
  username: string;
  real_name: string;
  role: 'admin' | 'tech_manager' | 'dept_manager' | 'engineer';
  gender: GenderType | null;
  department_id: number | null;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  is_builtin: boolean;
  deleted_at: Date | null;
  deleted_by: number | null;
  created_at: Date;
  updated_at: Date;
  department_name?: string;
}

export interface CreateMemberRequest {
  username: string;
  real_name: string;
  role: Member['role'];
  gender?: GenderType;
  department_id: number;
  email?: string;
  phone?: string;
}

export interface UpdateMemberRequest {
  real_name?: string;
  role?: Member['role'];
  gender?: GenderType;
  department_id?: number | null;
  email?: string;
  phone?: string;
  is_active?: boolean;
}

export interface MemberQueryOptions {
  department_id?: number;
  role?: Member['role'];
  is_active?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
  excludeBuiltin?: boolean;
}

export interface MemberListResponse {
  items: Member[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============ 能力模型相关 ============

export interface CapabilityDimension {
  name: string;
  weight: number; // 0-100，所有维度权重之和必须为100
}

export interface CapabilityModel {
  id: string;
  name: string;
  description: string | null;
  dimensions: CapabilityDimension[];
  created_at: Date;
  updated_at: Date;
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

// ============ 成员能力评定相关 ============

export interface DimensionScore {
  dimension_name: string;
  score: number; // 0-100
}

export interface MemberCapability {
  id: string;
  user_id: number;
  model_id: string;
  model_name: string;
  association_label: string | null;
  dimension_scores: DimensionScore[];
  overall_score: number;
  evaluated_at: Date;
  evaluated_by: number;
  notes: string | null;
}

export interface CreateMemberCapabilityRequest {
  model_id: string;
  association_label?: string;
  dimension_scores: DimensionScore[];
  notes?: string;
}

export interface UpdateMemberCapabilityRequest {
  association_label?: string;
  dimension_scores?: DimensionScore[];
  notes?: string;
}

// ============ 智能推荐相关 ============

export interface AssigneeRecommendation {
  user_id: number;
  real_name: string;
  gender: GenderType | null;
  department_name: string;
  model_name: string;
  overall_score: number;
  match_level: 'excellent' | 'good' | 'fair';
  current_tasks: number;
}

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
