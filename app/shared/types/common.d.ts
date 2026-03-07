/**
 * 共享类型定义 - 前后端通用
 *
 * 此文件包含前后端共享的基础类型定义
 * 确保类型一致性和类型安全
 */
/**
 * 实体ID类型
 *
 * 统一使用 number 类型与数据库对齐
 * 所有表的主键都是 INT 或 BIGINT，TypeScript 中统一使用 number
 */
export type EntityId = number;
/**
 * 实体ID列表类型
 */
export type EntityIdList = EntityId[];
/**
 * 可选的实体ID
 */
export type OptionalEntityId = EntityId | null;
/**
 * 数据库时间戳类型
 */
export type DbTimestamp = string;
/**
 * 数据库日期类型
 */
export type DbDate = string;
/**
 * 分页参数
 */
export interface PaginationParams {
    page: number;
    pageSize: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
/**
 * 分页响应
 */
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}
/**
 * 通用API响应
 */
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: unknown;
    };
    meta?: {
        timestamp: string;
        requestId?: string;
    };
}
/**
 * 查询过滤器
 */
export interface QueryFilter {
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in' | 'is_null' | 'is_not_null';
    value?: unknown;
}
/**
 * 查询参数
 */
export interface QueryParams {
    filters?: QueryFilter[];
    pagination?: PaginationParams;
    search?: string;
    fields?: string[];
}
/**
 * 审计字段
 */
export interface AuditFields {
    id: EntityId;
    createdAt: DbTimestamp;
    updatedAt: DbTimestamp;
    createdBy?: OptionalEntityId;
    updatedBy?: OptionalEntityId;
    deletedAt?: DbTimestamp | null;
}
/**
 * 软删除实体
 */
export interface SoftDeletable {
    deletedAt: DbTimestamp | null;
}
/**
 * 版本控制实体
 */
export interface Versioned {
    version: number;
}
/**
 * 类型守卫：检查是否为有效的 EntityId
 */
export declare function isValidEntityId(value: unknown): value is EntityId;
/**
 * 类型守卫：检查是否为有效的 EntityId 列表
 */
export declare function isValidEntityIdList(value: unknown): value is EntityIdList;
/**
 * 类型转换：将 unknown 转换为 EntityId
 */
export declare function toEntityId(value: unknown): EntityId | null;
/**
 * 类型转换：将 unknown 转换为 EntityId 列表
 */
export declare function toEntityIdList(value: unknown): EntityIdList | null;
//# sourceMappingURL=common.d.ts.map