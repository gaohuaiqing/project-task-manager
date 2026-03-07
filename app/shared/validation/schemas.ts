/**
 * Zod Schema定义 - 运行时类型验证
 *
 * 使用zod库定义所有实体的schema
 * 提供运行时类型验证和数据转换
 */

import { z } from 'zod';

/**
 * 基础schema
 */

/**
 * EntityId schema
 */
export const EntityIdSchema = z.number({
  required_error: 'ID是必需的',
  invalid_type_error: 'ID必须是数字',
}).int().positive();

export type EntityId = z.infer<typeof EntityIdSchema>;

/**
 * 可选的EntityId schema
 */
export const OptionalEntityIdSchema = EntityIdSchema.nullable();

export type OptionalEntityId = z.infer<typeof OptionalEntityIdSchema>;

/**
 * 数据库日期字符串 schema (YYYY-MM-DD)
 */
export const DbDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  message: '日期格式必须为 YYYY-MM-DD',
});

export type DbDate = z.infer<typeof DbDateSchema>;

/**
 * 可选的数据库日期字符串 schema
 */
export const OptionalDbDateSchema = DbDateSchema.nullable();

export type OptionalDbDate = z.infer<typeof OptionalDbDateSchema>;

/**
 * 数据库时间戳 schema (ISO 8601)
 */
export const DbTimestampSchema = z.string().datetime({
  message: '时间戳格式必须为 ISO 8601',
});

export type DbTimestamp = z.infer<typeof DbTimestampSchema>;

/**
 * 审计字段 schema
 */
export const AuditFieldsSchema = z.object({
  id: EntityIdSchema,
  createdAt: DbTimestampSchema,
  updatedAt: DbTimestampSchema,
  createdBy: OptionalEntityIdSchema,
  updatedBy: OptionalEntityIdSchema,
  deletedAt: DbTimestampSchema.nullable(),
});

export type AuditFields = z.infer<typeof AuditFieldsSchema>;

/**
 * 实体schema
 */

/**
 * User schema
 */
export const UserSchema = z.object({
  id: EntityIdSchema,
  username: z.string().min(1).max(50),
  password: z.string().min(1), // 哈希后的密码
  role: z.enum(['admin', 'tech_manager', 'dept_manager', 'engineer']),
  name: z.string().min(1).max(100),
  ...AuditFieldsSchema.shape,
});

export type User = z.infer<typeof UserSchema>;

/**
 * User info schema (不含密码)
 */
export const UserInfoSchema = UserSchema.omit({ password: true });

export type UserInfo = z.infer<typeof UserInfoSchema>;

/**
 * Member schema
 */
export const MemberSchema = z.object({
  id: EntityIdSchema,
  name: z.string().min(1).max(100),
  employeeId: z.string().max(50).nullable(),
  department: z.string().max(100).nullable(),
  position: z.string().max(100).nullable(),
  skills: z.record(z.unknown()).nullable(),
  capabilities: z.record(z.unknown()).nullable(),
  status: z.enum(['active', 'inactive']),
  version: z.number().int().positive(),
  userId: OptionalEntityIdSchema,
  ...AuditFieldsSchema.shape,
});

export type Member = z.infer<typeof MemberSchema>;

/**
 * Member summary schema
 */
export const MemberSummarySchema = z.object({
  id: EntityIdSchema,
  name: z.string().min(1).max(100),
  employeeId: z.string().max(50).nullable(),
  department: z.string().max(100).nullable(),
  position: z.string().max(100).nullable(),
  status: z.enum(['active', 'inactive']),
});

export type MemberSummary = z.infer<typeof MemberSummarySchema>;

/**
 * Project schema
 */
export const ProjectSchema = z.object({
  id: EntityIdSchema,
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  description: z.string().max(1000).nullable(),
  status: z.enum(['planning', 'in_progress', 'completed', 'delayed', 'archived']),
  projectType: z.enum(['product_development', 'functional_management']),
  plannedStartDate: OptionalDbDateSchema,
  plannedEndDate: OptionalDbDateSchema,
  actualStartDate: OptionalDbDateSchema,
  actualEndDate: OptionalDbDateSchema,
  progress: z.number().min(0).max(100),
  taskCount: z.number().int().min(0),
  completedTaskCount: z.number().int().min(0),
  createdBy: OptionalEntityIdSchema,
  ...AuditFieldsSchema.shape,
});

export type Project = z.infer<typeof ProjectSchema>;

/**
 * Project summary schema
 */
export const ProjectSummarySchema = z.object({
  id: EntityIdSchema,
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  status: z.enum(['planning', 'in_progress', 'completed', 'delayed', 'archived']),
  projectType: z.enum(['product_development', 'functional_management']),
  progress: z.number().min(0).max(100),
  plannedStartDate: OptionalDbDateSchema,
  plannedEndDate: OptionalDbDateSchema,
});

export type ProjectSummary = z.infer<typeof ProjectSummarySchema>;

/**
 * Project member schema
 */
export const ProjectMemberSchema = z.object({
  id: EntityIdSchema,
  projectId: EntityIdSchema,
  memberId: EntityIdSchema,
  role: z.enum(['owner', 'manager', 'member', 'viewer']),
  joinedAt: DbTimestampSchema,
  memberName: z.string().max(100).nullable(),
  createdBy: OptionalEntityIdSchema,
  ...AuditFieldsSchema.shape,
});

export type ProjectMember = z.infer<typeof ProjectMemberSchema>;

/**
 * Project milestone schema
 */
export const ProjectMilestoneSchema = z.object({
  id: EntityIdSchema,
  projectId: EntityIdSchema,
  name: z.string().min(1).max(200),
  description: z.string().max(1000).nullable(),
  plannedDate: DbDateSchema,
  actualDate: OptionalDbDateSchema,
  status: z.enum(['pending', 'in_progress', 'completed', 'delayed', 'cancelled']),
  sortOrder: z.number().int().min(0),
  createdBy: OptionalEntityIdSchema,
  ...AuditFieldsSchema.shape,
});

export type ProjectMilestone = z.infer<typeof ProjectMilestoneSchema>;

/**
 * WBS Task schema
 */
export const WbsTaskSchema = z.object({
  id: EntityIdSchema,
  projectId: EntityIdSchema,
  parentId: OptionalEntityIdSchema,
  taskCode: z.string().min(1).max(50),
  taskName: z.string().min(1).max(200),
  description: z.string().max(2000).nullable(),
  taskType: z.enum(['milestone', 'phase', 'task', 'deliverable']),
  status: z.enum(['pending', 'in_progress', 'completed', 'delayed', 'cancelled']),
  priority: z.number().int().min(1).max(5),
  estimatedHours: z.number().nonnegative().nullable(),
  actualHours: z.number().nonnegative().nullable(),
  progress: z.number().min(0).max(100),
  plannedStartDate: OptionalDbDateSchema,
  plannedEndDate: OptionalDbDateSchema,
  actualStartDate: OptionalDbDateSchema,
  actualEndDate: OptionalDbDateSchema,
  assigneeId: OptionalEntityIdSchema,
  dependencies: z.record(z.unknown()).nullable(),
  tags: z.array(z.string()).nullable(),
  attachments: z.record(z.unknown()).nullable(),
  version: z.number().int().positive(),
  createdBy: OptionalEntityIdSchema,
  ...AuditFieldsSchema.shape,
}).and(
  z.object({
    // 新增字段（可选）
    wbsCode: z.string().max(50).optional(),
    level: z.number().int().positive().optional(),
    subtasks: z.array(EntityIdSchema).optional(),
  })
);

export type WbsTask = z.infer<typeof WbsTaskSchema>;

/**
 * WBS Task summary schema
 */
export const WbsTaskSummarySchema = z.object({
  id: EntityIdSchema,
  projectId: EntityIdSchema,
  taskCode: z.string().min(1).max(50),
  taskName: z.string().min(1).max(200),
  status: z.enum(['pending', 'in_progress', 'completed', 'delayed', 'cancelled']),
  priority: z.number().int().min(1).max(5),
  progress: z.number().min(0).max(100),
  plannedStartDate: OptionalDbDateSchema,
  plannedEndDate: OptionalDbDateSchema,
  assigneeId: OptionalEntityIdSchema,
});

export type WbsTaskSummary = z.infer<typeof WbsTaskSummarySchema>;

/**
 * Task assignment schema
 */
export const TaskAssignmentSchema = z.object({
  id: EntityIdSchema,
  taskId: EntityIdSchema,
  assigneeId: EntityIdSchema,
  assignedBy: EntityIdSchema,
  assignedAt: DbTimestampSchema,
  unassignedAt: DbTimestampSchema.nullable(),
  status: z.enum(['active', 'cancelled', 'completed']),
  notes: z.string().max(500).nullable(),
  ...AuditFieldsSchema.shape,
});

export type TaskAssignment = z.infer<typeof TaskAssignmentSchema>;

/**
 * Session schema
 */
export const SessionSchema = z.object({
  id: EntityIdSchema,
  sessionId: z.string().min(1),
  userId: EntityIdSchema,
  deviceId: z.string().min(1),
  deviceInfo: z.string().max(500).nullable(),
  ipAddress: z.string().ip().nullable(),
  status: z.enum(['active', 'terminated']),
  terminationReason: z.string().max(255).nullable(),
  terminationTimestamp: z.number().nonnegative().nullable(),
  createdAt: z.number().nonnegative(),
  lastAccessed: z.number().nonnegative(),
  expiresAt: z.number().nonnegative(),
});

export type Session = z.infer<typeof SessionSchema>;

/**
 * Holiday schema
 */
export const HolidaySchema = z.object({
  id: EntityIdSchema,
  holidayDate: DbDateSchema,
  name: z.string().min(1).max(100),
  isWorkday: z.boolean(),
  year: z.number().int().positive(),
  ...AuditFieldsSchema.shape,
});

export type Holiday = z.infer<typeof HolidaySchema>;

/**
 * API Request/Response schemas
 */

/**
 * 分页参数 schema
 */
export const PaginationParamsSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type PaginationParams = z.infer<typeof PaginationParamsSchema>;

/**
 * 分页响应 schema
 */
export function createPaginatedResponseSchema<T extends z.ZodType>(itemSchema: T) {
  return z.object({
    data: z.array(itemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
  });
}

/**
 * API响应 schema
 */
export function createApiResponseSchema<T extends z.ZodType>(dataSchema: T) {
  return z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.unknown().optional(),
    }).optional(),
    meta: z.object({
      timestamp: z.string().datetime(),
      requestId: z.string().optional(),
    }).optional(),
  });
}

/**
 * API错误响应 schema
 */
export const ApiErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;

/**
 * 查询过滤器 schema
 */
export const QueryFilterSchema = z.object({
  field: z.string(),
  operator: z.enum(['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'like', 'in', 'is_null', 'is_not_null']),
  value: z.unknown().optional(),
});

export type QueryFilter = z.infer<typeof QueryFilterSchema>;

/**
 * 查询参数 schema
 */
export const QueryParamsSchema = z.object({
  filters: z.array(QueryFilterSchema).optional(),
  pagination: PaginationParamsSchema.optional(),
  search: z.string().optional(),
  fields: z.array(z.string()).optional(),
});

export type QueryParams = z.infer<typeof QueryParamsSchema>;
