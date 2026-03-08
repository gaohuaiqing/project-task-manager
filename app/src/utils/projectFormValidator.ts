/**
 * 项目表单验证增强模块
 *
 * 功能：
 * 1. 实时验证反馈（防抖处理）
 * 2. 更友好的错误提示信息
 * 3. 字段级别的验证状态指示
 * 4. 日期范围验证增强
 * 5. 里程碑日期验证
 *
 * @module utils/projectFormValidator
 */

import type { ProjectType, ProjectFormData, ProjectMilestone } from '@/types/project';
import { ProjectTypeManager } from './projectTypeManager';

// ==================== 类型定义 ====================

/**
 * 验证结果
 */
export interface ValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 错误信息 */
  error?: string;
  /** 警告信息（非致命错误） */
  warning?: string;
}

/**
 * 字段验证状态
 */
export interface FieldValidationStatus {
  /** 字段名 */
  field: string;
  /** 验证状态 */
  status: 'idle' | 'validating' | 'valid' | 'invalid';
  /** 错误信息 */
  error?: string;
  /** 警告信息 */
  warning?: string;
  /** 是否已修改 */
  touched: boolean;
}

/**
 * 表单验证状态
 */
export interface FormValidationStatus {
  /** 各字段验证状态 */
  fields: Record<string, FieldValidationStatus>;
  /** 整体是否有效 */
  isValid: boolean;
  /** 是否有警告 */
  hasWarnings: boolean;
  /** 是否有任何字段被修改 */
  isTouched: boolean;
}

// ==================== 验证规则 ====================

/**
 * 项目编码验证规则
 */
export function validateProjectCode(code: string): ValidationResult {
  if (!code || !code.trim()) {
    return { valid: false, error: '项目编码不能为空' };
  }

  const trimmedCode = code.trim();

  if (trimmedCode.length > 50) {
    return { valid: false, error: '项目编码不能超过50个字符' };
  }

  // 检查格式：建议使用 PRD-YYYY-XXX 或 MGT-YYYY-XXX 格式
  const formatPattern = /^[A-Z]{2,4}-\d{4}-\d{3}$/;
  if (!formatPattern.test(trimmedCode)) {
    return {
      valid: true,
      warning: '建议使用 PRD-YYYY-XXX 或 MGT-YYYY-XXX 格式（例如：PRD-2024-001）',
    };
  }

  return { valid: true };
}

/**
 * 项目名称验证规则
 */
export function validateProjectName(name: string): ValidationResult {
  if (!name || !name.trim()) {
    return { valid: false, error: '项目名称不能为空' };
  }

  const trimmedName = name.trim();

  if (trimmedName.length > 100) {
    return { valid: false, error: '项目名称不能超过100个字符' };
  }

  if (trimmedName.length < 2) {
    return { valid: false, error: '项目名称至少需要2个字符' };
  }

  return { valid: true };
}

/**
 * 项目描述验证规则
 */
export function validateProjectDescription(description: string): ValidationResult {
  if (!description) {
    return { valid: true }; // 描述是可选的
  }

  const trimmedDescription = description.trim();

  if (trimmedDescription.length > 500) {
    return { valid: false, error: '项目描述不能超过500个字符' };
  }

  return { valid: true };
}

/**
 * 项目成员验证规则
 */
export function validateProjectMembers(memberIds: string[]): ValidationResult {
  if (!memberIds || memberIds.length === 0) {
    return { valid: false, error: '请至少选择一个项目成员' };
  }

  if (memberIds.length > 50) {
    return { valid: false, error: '项目成员数量不能超过50人' };
  }

  if (memberIds.length < 1) {
    return { valid: false, error: '项目至少需要1名成员' };
  }

  return { valid: true };
}

/**
 * 计划开始日期验证规则
 */
export function validatePlannedStartDate(
  date: string,
  projectType: ProjectType,
  formData?: Partial<ProjectFormData>
): ValidationResult {
  const formConfig = ProjectTypeManager.getFormConfig(projectType);
  const config = formConfig.fields.plannedStartDate;

  // 检查是否必填
  if (config.required && (!date || !date.trim())) {
    return { valid: false, error: '请选择计划开始日期' };
  }

  if (!date) {
    return { valid: true };
  }

  // 验证日期格式
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    return { valid: false, error: '日期格式不正确' };
  }

  // 检查日期不能早于今天
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const inputDate = new Date(date);
  inputDate.setHours(0, 0, 0, 0);

  if (inputDate < today) {
    return {
      valid: true,
      warning: '开始日期早于今天，请确认是否正确',
    };
  }

  // 检查开始日期是否晚于结束日期
  if (formData?.plannedEndDate) {
    const endDate = new Date(formData.plannedEndDate);
    if (inputDate > endDate) {
      return {
        valid: false,
        error: '开始日期不能晚于结束日期',
      };
    }
  }

  return { valid: true };
}

/**
 * 计划结束日期验证规则
 */
export function validatePlannedEndDate(
  date: string,
  projectType: ProjectType,
  formData?: Partial<ProjectFormData>
): ValidationResult {
  const formConfig = ProjectTypeManager.getFormConfig(projectType);
  const config = formConfig.fields.plannedEndDate;

  // 检查是否必填
  if (config.required && (!date || !date.trim())) {
    return { valid: false, error: '请选择计划结束日期' };
  }

  if (!date) {
    return { valid: true };
  }

  // 验证日期格式
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    return { valid: false, error: '日期格式不正确' };
  }

  // 检查结束日期必须晚于开始日期
  if (formData?.plannedStartDate) {
    const startDate = new Date(formData.plannedStartDate);
    const endDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    if (endDate <= startDate) {
      return { valid: false, error: '结束日期必须晚于开始日期' };
    }

    // 检查项目周期是否合理
    const dayDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (dayDiff > 365 * 2) {
      return {
        valid: true,
        warning: '项目周期超过2年，建议分期实施',
      };
    }

    if (dayDiff < 7) {
      return {
        valid: true,
        warning: '项目周期少于7天，请确认是否合理',
      };
    }
  }

  return { valid: true };
}

/**
 * 里程碑验证规则
 */
export function validateMilestones(
  milestones: Array<Omit<ProjectMilestone, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>>,
  projectType: ProjectType,
  plannedStartDate?: string,
  plannedEndDate?: string
): ValidationResult {
  const formConfig = ProjectTypeManager.getFormConfig(projectType);
  const config = formConfig.fields.milestones;

  // 检查是否必填
  if (config.required && (!milestones || milestones.length === 0)) {
    return { valid: false, error: `${ProjectTypeManager.getTypeLabel(projectType)}至少需要一个里程碑` };
  }

  if (!milestones || milestones.length === 0) {
    return { valid: true };
  }

  // 验证每个里程碑
  for (let i = 0; i < milestones.length; i++) {
    const milestone = milestones[i];

    // 验证名称
    if (!milestone.name || !milestone.name.trim()) {
      return { valid: false, error: `第 ${i + 1} 个里程碑名称不能为空` };
    }

    // 验证日期
    if (!milestone.plannedDate) {
      return { valid: false, error: `第 ${i + 1} 个里程碑必须设置计划日期` };
    }

    const milestoneDate = new Date(milestone.plannedDate);
    if (isNaN(milestoneDate.getTime())) {
      return { valid: false, error: `第 ${i + 1} 个里程碑日期格式不正确` };
    }

    // 检查里程碑日期是否在项目周期内
    if (plannedStartDate && plannedEndDate) {
      const startDate = new Date(plannedStartDate);
      const endDate = new Date(plannedEndDate);

      if (milestoneDate < startDate || milestoneDate > endDate) {
        return {
          valid: false,
          error: `第 ${i + 1} 个里程碑日期必须在项目周期内`,
        };
      }
    }
  }

  // 检查里程碑日期顺序
  const sortedMilestones = [...milestones].sort((a, b) =>
    new Date(a.plannedDate).getTime() - new Date(b.plannedDate).getTime()
  );

  for (let i = 1; i < sortedMilestones.length; i++) {
    const prevDate = new Date(sortedMilestones[i - 1].plannedDate);
    const currDate = new Date(sortedMilestones[i].plannedDate);

    if (currDate <= prevDate) {
      return {
        valid: false,
        error: '里程碑日期必须按时间顺序排列',
      };
    }
  }

  // 里程碑数量建议
  if (milestones.length > 20) {
    return {
      valid: true,
      warning: '里程碑数量较多（超过20个），建议合并或精简',
    };
  }

  return { valid: true };
}

/**
 * 完整表单验证
 */
export function validateProjectForm(
  formData: ProjectFormData,
  options?: {
    /** 只验证指定字段 */
    fields?: (keyof ProjectFormData)[];
    /** 是否包含警告 */
    includeWarnings?: boolean;
  }
): { valid: boolean; errors: Record<string, string>; warnings: Record<string, string> } {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};
  const fieldsToValidate = options?.fields || Object.keys(formData) as (keyof ProjectFormData)[];

  const projectType = formData.projectType || 'product_development';

  // 验证项目编码
  if (fieldsToValidate.includes('code')) {
    const result = validateProjectCode(formData.code);
    if (!result.valid) errors.code = result.error!;
    else if (result.warning && options?.includeWarnings) warnings.code = result.warning;
  }

  // 验证项目名称
  if (fieldsToValidate.includes('name')) {
    const result = validateProjectName(formData.name);
    if (!result.valid) errors.name = result.error!;
    else if (result.warning && options?.includeWarnings) warnings.name = result.warning;
  }

  // 验证项目描述
  if (fieldsToValidate.includes('description')) {
    const result = validateProjectDescription(formData.description || '');
    if (!result.valid) errors.description = result.error!;
    else if (result.warning && options?.includeWarnings) warnings.description = result.warning;
  }

  // 验证项目成员
  if (fieldsToValidate.includes('memberIds')) {
    const result = validateProjectMembers(formData.memberIds || []);
    if (!result.valid) errors.members = result.error!;
    else if (result.warning && options?.includeWarnings) warnings.members = result.warning;
  }

  // 验证计划开始日期
  if (fieldsToValidate.includes('plannedStartDate')) {
    const result = validatePlannedStartDate(
      formData.plannedStartDate || '',
      projectType,
      formData
    );
    if (!result.valid) errors.plannedStartDate = result.error!;
    else if (result.warning && options?.includeWarnings) warnings.plannedStartDate = result.warning;
  }

  // 验证计划结束日期
  if (fieldsToValidate.includes('plannedEndDate')) {
    const result = validatePlannedEndDate(
      formData.plannedEndDate || '',
      projectType,
      formData
    );
    if (!result.valid) errors.plannedEndDate = result.error!;
    else if (result.warning && options?.includeWarnings) warnings.plannedEndDate = result.warning;
  }

  // 验证里程碑
  if (fieldsToValidate.includes('milestones')) {
    const result = validateMilestones(
      formData.milestones || [],
      projectType,
      formData.plannedStartDate,
      formData.plannedEndDate
    );
    if (!result.valid) errors.milestones = result.error!;
    else if (result.warning && options?.includeWarnings) warnings.milestones = result.warning;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    warnings,
  };
}

// ==================== 防抖验证 ====================

/**
 * 创建防抖验证函数
 */
export function createDebouncedValidator<T>(
  validator: (value: T) => ValidationResult,
  delay: number = 300
): (value: T) => Promise<ValidationResult> {
  let timeoutId: NodeJS.Timeout | null = null;

  return (value: T): Promise<ValidationResult> => {
    return new Promise((resolve) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        resolve(validator(value));
      }, delay);
    });
  };
}

// ==================== 字段验证状态管理 ====================

/**
 * 创建字段验证状态
 */
export function createFieldStatus(): FieldValidationStatus {
  return {
    field: '',
    status: 'idle',
    error: undefined,
    warning: undefined,
    touched: false,
  };
}

/**
 * 更新字段验证状态
 */
export function updateFieldStatus(
  current: FieldValidationStatus,
  result: ValidationResult,
  touched?: boolean
): FieldValidationStatus {
  return {
    ...current,
    status: result.valid ? 'valid' : 'invalid',
    error: result.error,
    warning: result.warning,
    touched: touched ?? current.touched,
  };
}

/**
 * 获取字段状态样式类名
 */
export function getFieldStatusClassName(
  status: FieldValidationStatus['status'],
  hasError: boolean
): string {
  if (hasError) return 'border-red-500 focus:border-red-500';
  if (status === 'valid') return 'border-green-500/50 focus:border-green-500';
  return '';
}

export default {
  validateProjectCode,
  validateProjectName,
  validateProjectDescription,
  validateProjectMembers,
  validatePlannedStartDate,
  validatePlannedEndDate,
  validateMilestones,
  validateProjectForm,
  createDebouncedValidator,
};
