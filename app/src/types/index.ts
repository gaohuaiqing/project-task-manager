/**
 * 全局类型导出
 */

// 通用类型
export type {
  PaginatedResponse,
  ApiResponse,
  ListQueryParams,
  BaseEntity,
  UserBasic,
  DepartmentBasic,
} from './common';

// API 类型
export type {
  ApiError,
  ValidationError,
  ApiErrorResponse,
} from './api';

export { HttpStatus, ErrorCode } from './api';
