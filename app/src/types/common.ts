/**
 * 通用类型定义
 */

/**
 * 分页响应类型
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 通用 API 响应类型
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * 通用列表查询参数
 */
export interface ListQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 通用实体类型
 */
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 用户基本信息
 */
export interface UserBasic {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatar?: string;
}

/**
 * 部门基本信息
 */
export interface DepartmentBasic {
  id: string;
  name: string;
  parentId?: string;
}
