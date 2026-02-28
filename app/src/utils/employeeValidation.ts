/**
 * 工号验证工具
 * 从组织架构中获取成员工号，不再使用 localStorage
 */

import type { UserRole } from '@/types/auth';
import { getAllMembers } from './organizationManager';

// 工号验证结果
export interface EmployeeIdValidationResult {
  valid: boolean;
  message: string;
}

const RESERVED_IDS = ['admin', 'root', 'system', 'test', 'guest'];

// 获取所有已使用的工号（从组织架构）
const getUsedEmployeeIds = (): Set<string> => {
  try {
    const members = getAllMembers();
    return new Set(members.map(m => m.employeeId));
  } catch (error) {
    console.error('[EmployeeValidation] 获取成员列表失败:', error);
    return new Set();
  }
};

// 缓存已使用的工号（5秒缓存）
let cachedEmployeeIds: Set<string> | null = null;
let cacheTime = 0;
const CACHE_DURATION = 5000;

const getCachedEmployeeIds = (): Set<string> => {
  const now = Date.now();
  if (!cachedEmployeeIds || (now - cacheTime) > CACHE_DURATION) {
    cachedEmployeeIds = getUsedEmployeeIds();
    cacheTime = now;
  }
  return cachedEmployeeIds;
};

// 清除缓存（用于数据更新后）
export const clearEmployeeIdCache = (): void => {
  cachedEmployeeIds = null;
  cacheTime = 0;
};

// 验证工号格式
export const validateEmployeeIdFormat = (employeeId: string): EmployeeIdValidationResult => {
  // 去除前后空格
  const id = employeeId.trim();

  // 不能为空
  if (!id) {
    return { valid: false, message: '工号不能为空' };
  }

  // 长度检查（3-20位）
  if (id.length < 3) {
    return { valid: false, message: '工号至少需要3个字符' };
  }
  if (id.length > 20) {
    return { valid: false, message: '工号不能超过20个字符' };
  }

  // 必须以数字开头
  if (!/^[0-9]/.test(id)) {
    return { valid: false, message: '工号必须以数字开头' };
  }

  // 后续可包含字母、数字、下划线和连字符
  const validPattern = /^[0-9][a-zA-Z0-9_-]*$/;
  if (!validPattern.test(id)) {
    return { valid: false, message: '工号只能包含数字、字母、下划线和连字符' };
  }

  // 检查保留关键字
  const lowerId = id.toLowerCase();
  if (RESERVED_IDS.includes(lowerId)) {
    return { valid: false, message: '该工号为系统保留，不能使用' };
  }

  return { valid: true, message: '' };
};

// 检查工号是否已存在
export const isEmployeeIdExists = (employeeId: string, excludeCurrentId?: string): boolean => {
  const usedIds = getCachedEmployeeIds();
  const id = employeeId.trim();

  // 如果要排除当前工号（编辑时使用）
  if (excludeCurrentId && id === excludeCurrentId.trim()) {
    return false;
  }

  return usedIds.has(id);
};

// 完整验证工号（格式+唯一性）
export const validateEmployeeId = (
  employeeId: string,
  excludeCurrentId?: string
): EmployeeIdValidationResult => {
  // 先验证格式
  const formatResult = validateEmployeeIdFormat(employeeId);
  if (!formatResult.valid) {
    return formatResult;
  }

  // 再验证唯一性
  if (isEmployeeIdExists(employeeId, excludeCurrentId)) {
    return { valid: false, message: '该工号已被使用' };
  }

  return { valid: true, message: '' };
};

// 生成建议工号（基于姓名）
export const generateSuggestedEmployeeId = (name: string): string => {
  // 移除空格并转为小写
  const baseName = name.trim().toLowerCase().replace(/\s+/g, '_');

  // 如果基础名称可用，直接返回
  if (!isEmployeeIdExists(baseName) && validateEmployeeIdFormat(baseName).valid) {
    return baseName;
  }

  // 添加数字前缀（因为必须以数字开头）
  let counter = 1;
  let suggestedId = `${counter}_${baseName}`;

  while (isEmployeeIdExists(suggestedId) && counter < 1000) {
    counter++;
    suggestedId = `${counter}_${baseName}`;
  }

  return suggestedId;
};

// 批量验证工号列表（用于导入时检查重复）
export interface DuplicateCheckResult {
  hasDuplicates: boolean;
  duplicates: string[];
  existingIds: string[];
}

export const checkDuplicateEmployeeIds = (employeeIds: string[]): DuplicateCheckResult => {
  const seen = new Set<string>();
  const duplicates: string[] = [];
  const existingIds: string[] = [];
  const usedIds = getCachedEmployeeIds();

  for (const id of employeeIds) {
    const trimmedId = id.trim();

    // 检查列表内重复
    if (seen.has(trimmedId)) {
      if (!duplicates.includes(trimmedId)) {
        duplicates.push(trimmedId);
      }
    } else {
      seen.add(trimmedId);
    }

    // 检查是否已存在于系统中
    if (usedIds.has(trimmedId)) {
      existingIds.push(trimmedId);
    }
  }

  return {
    hasDuplicates: duplicates.length > 0 || existingIds.length > 0,
    duplicates,
    existingIds,
  };
};

// 获取所有已使用的工号
export const getAllEmployeeIds = (): string[] => {
  const usedIds = getCachedEmployeeIds();
  return Array.from(usedIds);
};

// 验证工号变更是否允许
export const canChangeEmployeeId = (
  oldId: string,
  newId: string
): { allowed: boolean; message: string } => {
  // 如果工号没有变化，允许
  if (oldId.trim() === newId.trim()) {
    return { allowed: true, message: '' };
  }

  // 验证新工号
  const validation = validateEmployeeId(newId, oldId);
  if (!validation.valid) {
    return { allowed: false, message: validation.message };
  }

  return { allowed: true, message: '' };
};
