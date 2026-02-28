/**
 * 项目表单管理 Hook
 *
 * 职责：
 * 1. 项目表单状态管理
 * 2. 表单验证
 * 3. 成员选择逻辑
 * 4. 里程碑管理逻辑
 * 5. 表单重置/提交方法
 *
 * @module hooks/useProjectForm
 */

import { useState, useCallback, useEffect } from 'react';
import type {
  Project,
  ProjectFormData,
  ProjectType,
  ProjectMilestone,
  ProjectMemberRole
} from '../types/project';

// ==================== 表单验证规则 ====================

interface ValidationErrors {
  code?: string;
  name?: string;
  projectType?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  members?: string;
  milestones?: string;
}

interface FormValidationOptions {
  requireDates?: boolean;      // 产品开发类项目必须填写日期
  requireMilestones?: boolean; // 产品开发类项目必须至少一个里程碑
}

// ==================== Hook 返回类型 ====================

interface UseProjectFormReturn {
  // 表单数据
  formData: ProjectFormData;
  validationErrors: ValidationErrors;
  isDirty: boolean;
  isValid: boolean;

  // 操作方法
  setFormData: (data: ProjectFormData | ((prev: ProjectFormData) => ProjectFormData)) => void;
  setFieldValue: <K extends keyof ProjectFormData>(field: K, value: ProjectFormData[K]) => void;
  validateField: <K extends keyof ProjectFormData>(field: K) => string | undefined;
  validate: (options?: FormValidationOptions) => boolean;
  resetForm: () => void;
  loadFromProject: (project: Project) => void;

  // 成员操作
  toggleMember: (memberId: number) => void;
  setMemberRole: (memberId: number, role: ProjectMemberRole) => void;
  clearMembers: () => void;

  // 里程碑操作
  addMilestone: () => void;
  updateMilestone: (index: number, data: Partial<ProjectMilestone>) => void;
  removeMilestone: (index: number) => void;
  clearMilestones: () => void;

  // 工具方法
  getFormDataForSubmit: () => ProjectFormData;
  hasChanges: (project: Project) => boolean;
}

// ==================== 初始表单数据 ====================

const createInitialFormData = (): ProjectFormData => ({
  code: '',
  name: '',
  description: '',
  projectType: 'product_development',
  plannedStartDate: '',
  plannedEndDate: '',
  memberIds: [],
  milestones: [],
});

// ==================== 主 Hook ====================

/**
 * 项目表单管理 Hook
 */
export function useProjectForm(): UseProjectFormReturn {
  // ==================== 表单状态 ====================

  const [formData, setFormDataState] = useState<ProjectFormData>(createInitialFormData());
  const [initialFormData, setInitialFormData] = useState<ProjectFormData>(createInitialFormData());
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isDirty, setIsDirty] = useState(false);

  // ==================== 表单更新 ====================

  const setFormData = useCallback((data: ProjectFormData | ((prev: ProjectFormData) => ProjectFormData)) => {
    setFormDataState(prev => {
      const newData = typeof data === 'function' ? data(prev) : data;
      setIsDirty(JSON.stringify(newData) !== JSON.stringify(initialFormData));
      return newData;
    });
  }, [initialFormData]);

  const setFieldValue = useCallback(<K extends keyof ProjectFormData>(field: K, value: ProjectFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // 清除该字段的验证错误
    if (validationErrors[field as keyof ValidationErrors]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field as keyof ValidationErrors];
        return newErrors;
      });
    }
  }, [validationErrors, setFormData]);

  // ==================== 表单验证 ====================

  const validateField = useCallback(<K extends keyof ProjectFormData>(field: K): string | undefined => {
    const value = formData[field];
    const errors: string[] = [];

    switch (field) {
      case 'code':
        if (!value || (typeof value === 'string' && !value.trim())) {
          errors.push('项目编码不能为空');
        } else if (typeof value === 'string' && value.length > 50) {
          errors.push('项目编码不能超过50个字符');
        }
        break;

      case 'name':
        if (!value || (typeof value === 'string' && !value.trim())) {
          errors.push('项目名称不能为空');
        } else if (typeof value === 'string' && value.length > 100) {
          errors.push('项目名称不能超过100个字符');
        }
        break;

      case 'projectType':
        if (!value) {
          errors.push('请选择项目类型');
        }
        break;

      case 'plannedStartDate':
      case 'plannedEndDate':
        // 这些字段在特定条件下才必填
        break;

      case 'memberIds':
        if (!value || value.length === 0) {
          errors.push('请至少选择一个项目成员');
        }
        break;

      case 'milestones':
        if (!value || value.length === 0) {
          errors.push('请至少添加一个里程碑');
        }
        break;
    }

    const errorMessage = errors[0];
    if (errorMessage) {
      setValidationErrors(prev => ({ ...prev, [field]: errorMessage }));
    } else {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }

    return errorMessage;
  }, [formData]);

  const validate = useCallback((options: FormValidationOptions = {}): boolean => {
    const errors: ValidationErrors = {};
    const { requireDates = false, requireMilestones = false } = options;

    // 必填字段验证
    if (!formData.code?.trim()) {
      errors.code = '项目编码不能为空';
    }

    if (!formData.name?.trim()) {
      errors.name = '项目名称不能为空';
    }

    if (!formData.projectType) {
      errors.projectType = '请选择项目类型';
    }

    // 产品开发类项目的额外验证
    if (formData.projectType === 'product_development') {
      if (requireDates) {
        if (!formData.plannedStartDate) {
          errors.plannedStartDate = '请选择计划开始日期';
        }
        if (!formData.plannedEndDate) {
          errors.plannedEndDate = '请选择计划结束日期';
        }
        // 日期逻辑验证
        if (formData.plannedStartDate && formData.plannedEndDate) {
          const startDate = new Date(formData.plannedStartDate);
          const endDate = new Date(formData.plannedEndDate);
          if (startDate >= endDate) {
            errors.plannedEndDate = '结束日期必须晚于开始日期';
          }
        }
      }

      if (requireMilestones && (!formData.milestones || formData.milestones.length === 0)) {
        errors.milestones = '产品开发类项目至少需要一个里程碑';
      }
    }

    // 成员验证
    if (!formData.memberIds || formData.memberIds.length === 0) {
      errors.members = '请至少选择一个项目成员';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  // ==================== 表单有效性 ====================

  const isValid = Object.keys(validationErrors).length === 0;

  // ==================== 表单重置 ====================

  const resetForm = useCallback(() => {
    const newData = createInitialFormData();
    setFormDataState(newData);
    setInitialFormData(newData);
    setValidationErrors({});
    setIsDirty(false);
  }, []);

  // ==================== 从项目加载数据 ====================

  const loadFromProject = useCallback((project: Project) => {
    // 首先设置基础项目数据
    const data: ProjectFormData = {
      id: project.id,
      code: project.code,
      name: project.name,
      description: project.description,
      projectType: project.projectType,
      plannedStartDate: project.plannedStartDate || '',
      plannedEndDate: project.plannedEndDate || '',
      memberIds: project.memberIds || [],
      milestones: project.milestones || [],
    };

    setFormDataState(data);
    setInitialFormData(data);  // 设置初始数据用于isDirty比较
    setIsDirty(false);
    setValidationErrors({});
  }, []);

  // ==================== 成员操作 ====================

  const toggleMember = useCallback((memberId: number) => {
    const currentIds = formData.memberIds || [];
    const newIds = currentIds.includes(memberId)
      ? currentIds.filter(id => id !== memberId)
      : [...currentIds, memberId];
    setFieldValue('memberIds', newIds);
  }, [formData.memberIds, setFieldValue]);

  const setMemberRole = useCallback((memberId: number, role: ProjectMemberRole) => {
    const currentMembers = formData.memberIds || [];
    if (!currentMembers.includes(memberId)) return;
    setFieldValue('memberIds', currentMembers);
  }, [formData.memberIds, setFieldValue]);

  const clearMembers = useCallback(() => {
    setFieldValue('memberIds', []);
  }, [setFieldValue]);

  // ==================== 里程碑操作 ====================

  const addMilestone = useCallback(() => {
    const currentMilestones = formData.milestones || [];
    const newMilestone: Omit<ProjectMilestone, 'id' | 'projectId' | 'createdAt' | 'updatedAt'> = {
      name: '',
      description: '',
      plannedDate: '',
      status: 'pending',
      sortOrder: currentMilestones.length,
    };
    setFieldValue('milestones', [...currentMilestones, newMilestone]);
  }, [formData.milestones, setFieldValue]);

  const updateMilestone = useCallback((index: number, data: Partial<ProjectMilestone>) => {
    const currentMilestones = formData.milestones || [];
    const newMilestones = currentMilestones.map((m, i) => 
      i === index ? { ...m, ...data } : m
    );
    setFieldValue('milestones', newMilestones);
  }, [formData.milestones, setFieldValue]);

  const removeMilestone = useCallback((index: number) => {
    const currentMilestones = formData.milestones || [];
    const newMilestones = currentMilestones.filter((_, i) => i !== index)
      .map((m, i) => ({ ...m, sortOrder: i }));
    setFieldValue('milestones', newMilestones);
  }, [formData.milestones, setFieldValue]);

  const clearMilestones = useCallback(() => {
    setFieldValue('milestones', []);
  }, [setFieldValue]);

  // ==================== 工具方法 ====================

  const getFormDataForSubmit = useCallback((): ProjectFormData => {
    return {
      ...formData,
      memberIds: formData.memberIds || [],
      milestones: (formData.milestones || []).map((m, i) => ({ ...m, sortOrder: i })),
    };
  }, [formData]);

  const hasChanges = useCallback((project: Project): boolean => {
    return (
      formData.code !== project.code ||
      formData.name !== project.name ||
      formData.description !== project.description ||
      formData.projectType !== project.projectType ||
      formData.plannedStartDate !== project.plannedStartDate ||
      formData.plannedEndDate !== project.plannedEndDate
    );
  }, [formData]);

  // ==================== 返回 ====================

  return {
    // 表单数据
    formData,
    validationErrors,
    isDirty,
    isValid,

    // 操作方法
    setFormData,
    setFieldValue,
    validateField,
    validate,
    resetForm,
    loadFromProject,

    // 成员操作
    toggleMember,
    setMemberRole,
    clearMembers,

    // 里程碑操作
    addMilestone,
    updateMilestone,
    removeMilestone,
    clearMilestones,

    // 工具方法
    getFormDataForSubmit,
    hasChanges,
  };
}

// ==================== 辅助 Hook ====================

/**
 * 项目表单验证规则 Hook
 * 根据项目类型返回不同的验证规则
 */
export function useProjectFormValidationRules(projectType: ProjectType): FormValidationOptions {
  return {
    requireDates: projectType === 'product_development',
    requireMilestones: projectType === 'product_development',
  };
}

/**
 * 监听项目类型变化，自动调整表单验证规则
 */
export function useProjectTypeValidation(formData: ProjectFormData) {
  const validationRules = useProjectFormValidationRules(formData.projectType || 'product_development');

  useEffect(() => {
    // 当项目类型切换时，清除不需要的字段的验证错误
    if (formData.projectType === 'functional_management') {
      // 职能管理类项目不需要日期和里程碑
      // 可以在这里清除相关验证错误
    }
  }, [formData.projectType]);

  return validationRules;
}
