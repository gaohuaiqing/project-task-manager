/**
 * Zod验证工具函数
 *
 * 提供便捷的验证函数和错误处理
 */

import type { z } from 'zod';
import {
  EntityIdSchema,
  OptionalEntityIdSchema,
  DbDateSchema,
  OptionalDbDateSchema,
  DbTimestampSchema,
  UserSchema,
  UserInfoSchema,
  MemberSchema,
  ProjectSchema,
  ProjectMemberSchema,
  ProjectMilestoneSchema,
  WbsTaskSchema,
  TaskAssignmentSchema,
  SessionSchema,
  HolidaySchema,
  PaginationParamsSchema,
  QueryParamsSchema,
  ApiErrorResponseSchema,
} from './schemas.js';

/**
 * 验证错误类
 */
export class ValidationError extends Error {
  public readonly errors: z.ZodError;

  constructor(errors: z.ZodError) {
    super('数据验证失败');
    this.name = 'ValidationError';
    this.errors = errors;
  }

  /**
   * 获取格式化的错误信息
   */
  getFormattedErrors(): Array<{ path: string[]; message: string }> {
    return this.errors.errors.map(err => ({
      path: err.path.map(String),
      message: err.message,
    }));
  }

  /**
   * 获取第一个错误信息
   */
  getFirstError(): string {
    return this.errors.errors[0]?.message || '未知验证错误';
  }
}

/**
 * 验证函数
 */

/**
 * 验证EntityId
 */
export function validateEntityId(value: unknown): number {
  return EntityIdSchema.parse(value);
}

/**
 * 安全验证EntityId（返回null而不是抛出异常）
 */
export function safeValidateEntityId(value: unknown): number | null {
  const result = EntityIdSchema.safeParse(value);
  return result.success ? result.data : null;
}

/**
 * 验证可选的EntityId
 */
export function validateOptionalEntityId(value: unknown): number | null {
  return OptionalEntityIdSchema.parse(value);
}

/**
 * 验证数据库日期
 */
export function validateDbDate(value: unknown): string {
  return DbDateSchema.parse(value);
}

/**
 * 验证可选的数据库日期
 */
export function validateOptionalDbDate(value: unknown): string | null {
  return OptionalDbDateSchema.parse(value);
}

/**
 * 验证时间戳
 */
export function validateTimestamp(value: unknown): string {
  return DbTimestampSchema.parse(value);
}

/**
 * 验证用户数据
 */
export function validateUser(data: unknown) {
  return UserSchema.parse(data);
}

/**
 * 安全验证用户数据
 */
export function safeValidateUser(data: unknown) {
  return UserSchema.safeParse(data);
}

/**
 * 验证用户信息数据（不含密码）
 */
export function validateUserInfo(data: unknown) {
  return UserInfoSchema.parse(data);
}

/**
 * 验证成员数据
 */
export function validateMember(data: unknown) {
  return MemberSchema.parse(data);
}

/**
 * 安全验证成员数据
 */
export function safeValidateMember(data: unknown) {
  return MemberSchema.safeParse(data);
}

/**
 * 验证项目数据
 */
export function validateProject(data: unknown) {
  return ProjectSchema.parse(data);
}

/**
 * 安全验证项目数据
 */
export function safeValidateProject(data: unknown) {
  return ProjectSchema.safeParse(data);
}

/**
 * 验证项目成员数据
 */
export function validateProjectMember(data: unknown) {
  return ProjectMemberSchema.parse(data);
}

/**
 * 验证项目里程碑数据
 */
export function validateProjectMilestone(data: unknown) {
  return ProjectMilestoneSchema.parse(data);
}

/**
 * 验证WBS任务数据
 */
export function validateWbsTask(data: unknown) {
  return WbsTaskSchema.parse(data);
}

/**
 * 安全验证WBS任务数据
 */
export function safeValidateWbsTask(data: unknown) {
  return WbsTaskSchema.safeParse(data);
}

/**
 * 验证任务分配数据
 */
export function validateTaskAssignment(data: unknown) {
  return TaskAssignmentSchema.parse(data);
}

/**
 * 验证会话数据
 */
export function validateSession(data: unknown) {
  return SessionSchema.parse(data);
}

/**
 * 验证节假日数据
 */
export function validateHoliday(data: unknown) {
  return HolidaySchema.parse(data);
}

/**
 * 验证分页参数
 */
export function validatePaginationParams(data: unknown) {
  return PaginationParamsSchema.parse(data);
}

/**
 * 验证查询参数
 */
export function validateQueryParams(data: unknown) {
  return QueryParamsSchema.parse(data);
}

/**
 * 验证API错误响应
 */
export function validateApiErrorResponse(data: unknown) {
  return ApiErrorResponseSchema.parse(data);
}

/**
 * 通用验证函数
 */

/**
 * 使用指定schema验证数据
 */
export function validateWithSchema<T>(schema: z.ZodType<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * 使用指定schema安全验证数据
 */
export function safeValidateWithSchema<T>(schema: z.ZodType<T>, data: unknown): z.SafeParseSuccess<T> | z.SafeParseError<z.ZodError> {
  return schema.safeParse(data);
}

/**
 * 验证并转换数据（使用transform）
 */
export function validateAndTransform<T, U = T>(
  schema: z.ZodType<T, z.ZodDef, U>,
  data: unknown
): T {
  return schema.parse(data);
}

/**
 * 批量验证数据
 */
export function validateBatch<T>(schema: z.ZodType<T>, dataArray: unknown[]): T[] {
  return dataArray.map(data => schema.parse(data));
}

/**
 * 批量安全验证数据
 */
export function safeValidateBatch<T>(schema: z.ZodType<T>, dataArray: unknown[]): Array<{
  success: boolean;
  data?: T;
  error?: z.ZodError;
  index: number;
}> {
  return dataArray.map((data, index) => {
    const result = schema.safeParse(data);
    if (result.success) {
      return {
        success: true,
        data: result.data,
        index,
      };
    } else {
      return {
        success: false,
        error: result.error,
        index,
      };
    }
  });
}

/**
 * 部分验证（仅验证指定字段）
 */
export function validatePartial<T extends z.ZodType>(
  schema: T,
  data: unknown
): z.infer<z.ZodOptional<z.infer<T>>> {
  return schema.partial().parse(data);
}

/**
 * 创建验证中间件（用于Express）
 */
export function createValidationMiddleware<T>(schema: z.ZodType<T>, target: 'body' | 'query' | 'params' = 'body') {
  return (req: any, res: any, next: any) => {
    try {
      const data = req[target];
      const validated = schema.parse(data);
      req[target] = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = new ValidationError(error);
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: validationError.getFirstError(),
            details: validationError.getFormattedErrors(),
          },
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '数据验证失败',
          },
        });
      }
    }
  };
}

/**
 * 创建异步验证中间件
 */
export function createAsyncValidationMiddleware<T>(
  schema: z.ZodType<T>,
  validator: (data: any) => Promise<any>,
  target: 'body' | 'query' | 'params' = 'body'
) {
  return async (req: any, res: any, next: any) => {
    try {
      const data = req[target];
      const validated = schema.parse(data);
      const result = await validator(validated);
      req[target] = result;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = new ValidationError(error);
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: validationError.getFirstError(),
            details: validationError.getFormattedErrors(),
          },
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error instanceof Error ? error.message : '数据验证失败',
          },
        });
      }
    }
  };
}

/**
 * 前端表单验证Hook辅助函数
 */
export function createFormValidator<T>(schema: z.ZodType<T>) {
  return {
    validate: (data: unknown): { success: true; data: T } | { success: false; errors: z.ZodError['errors'] } => {
      const result = schema.safeParse(data);
      if (result.success) {
        return {
          success: true,
          data: result.data,
        };
      } else {
        return {
          success: false,
          errors: result.error.errors,
        };
      }
    },
    validateField: <K extends keyof T>(field: K, value: unknown): { success: true; data: T[K] } | { success: false; error: z.ZodError['errors'][0] } => {
      const fieldSchema = schema.shape[K] as z.ZodTypeAny;
      const result = fieldSchema.safeParse(value);
      if (result.success) {
        return {
          success: true,
          data: result.data,
        };
      } else {
        return {
          success: false,
          error: result.error.errors[0],
        };
      }
    },
  };
}

/**
 * 数据转换工具
 */

/**
 * 将unknown转换为EntityId（带验证）
 */
export function toEntityId(value: unknown): number {
  return validateEntityId(value);
}

/**
 * 将unknown转换为可选EntityId（带验证）
 */
export function toOptionalEntityId(value: unknown): number | null {
  return validateOptionalEntityId(value);
}

/**
 * 将unknown转换为DbDate（带验证）
 */
export function toDbDate(value: unknown): string {
  return validateDbDate(value);
}

/**
 * 将unknown转换为可选DbDate（带验证）
 */
export function toOptionalDbDate(value: unknown): string | null {
  return validateOptionalDbDate(value);
}

/**
 * 将Date转换为DbDate
 */
export function dateToDbDate(date: Date): string {
  const iso = date.toISOString();
  return iso.split('T')[0];
}

/**
 * 将DbDate转换为Date
 */
export function dbDateToDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00.000Z');
}
