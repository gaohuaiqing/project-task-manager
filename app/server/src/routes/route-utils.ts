/**
 * 路由工具函数
 *
 * 提取重复的辅助函数，便于维护
 *
 * @author AI Assistant
 * @since 2026-03-17
 */

import type { Request } from 'express';
import { AuthorizationError, ValidationError } from '../errors/index.js';

/** 获取当前用户ID */
export function getCurrentUserId(req: Request): number {
  const userId = (req as Request & { userId?: number }).userId;
  if (!userId) {
    throw new AuthorizationError('请先登录');
  }
  return userId;
}

/** 验证非空字符串 */
export function validateNotEmpty(value: unknown, fieldName: string): string {
  if (!value || typeof value !== 'string' || value.trim() === '') {
    throw new ValidationError(`请填写${fieldName}`);
  }
  return value.trim();
}

/** 计算延期天数 */
export function calculateDelayDays(endDate: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0);
  const diffMs = today.getTime() - endDate.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

/** 验证项目ID */
export function validateProjectId(value: unknown): number {
  if (!value) {
    throw new ValidationError('请提供项目ID');
  }
  const id = Number(value);
  if (isNaN(id) || id <= 0) {
    throw new ValidationError('项目ID格式无效');
  }
  return id;
}

/** 构建WHERE条件 */
export function buildWhereCondition(projectId: unknown): { clause: string; params: (number | string)[] } {
  if (projectId) {
    return { clause: 'WHERE project_id = ?', params: [Number(projectId)] };
  }
  return { clause: '', params: [] };
}

/** 格式化图表数据 - 通用转换器 */
export function formatChartData<T extends Record<string, unknown>>(
  item: T,
  labelKey: keyof T,
  valueKey: keyof T = 'count' as keyof T
): { name: string; value: number } {
  const label = item[labelKey];
  const value = item[valueKey];
  return {
    name: String(label ?? ''),
    value: Number(value ?? 0)
  };
}
