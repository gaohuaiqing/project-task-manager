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
import type { WbsTask } from '../types/wbs';
import { generateWbsCode } from '@/utils/wbsCalculator';
import { TaskDependencyService } from '@/services/TaskDependencyService';

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

  // WBS 任务操作
  addWbsTask: (task: Omit<WbsTask, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateWbsTask: (taskId: string, data: Partial<WbsTask>) => void;
  deleteWbsTask: (taskId: string) => void;
  moveWbsTask: (taskId: string, newParentId: string | null, newIndex?: number) => void;
  batchUpdateWbsTasks: (tasks: WbsTask[]) => void;

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
  wbsTasks: [],
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
      wbsTasks: project.wbsTasks || [],
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

  // ==================== WBS 任务操作 ====================

  const addWbsTask = useCallback((task: Omit<WbsTask, 'id' | 'createdAt' | 'updatedAt'>) => {
    const currentTasks = formData.wbsTasks || [];

    // 生成WBS编码
    const siblingTasks = task.parentId
      ? currentTasks.filter(t => t.parentId === task.parentId)
      : currentTasks.filter(t => !t.parentId);
    const wbsCode = generateWbsCode(
      task.parentId ? currentTasks.find(t => t.id === task.parentId)?.wbsCode : undefined,
      siblingTasks.length
    );

    const newTask: WbsTask = {
      ...task,
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      wbsCode,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 更新父任务的子任务列表
    const updatedTasks = [...currentTasks];
    if (task.parentId) {
      const parentIndex = updatedTasks.findIndex(t => t.id === task.parentId);
      if (parentIndex !== -1) {
        updatedTasks[parentIndex] = {
          ...updatedTasks[parentIndex],
          subtasks: [...(updatedTasks[parentIndex].subtasks || []), newTask.id],
        };
      }
    }

    updatedTasks.push(newTask);
    setFieldValue('wbsTasks', updatedTasks);
  }, [formData.wbsTasks, setFieldValue]);

  const updateWbsTask = useCallback((taskId: string, data: Partial<WbsTask>) => {
    const currentTasks = formData.wbsTasks || [];
    const updatedTasks = currentTasks.map(task =>
      task.id === taskId
        ? { ...task, ...data, updatedAt: new Date().toISOString() }
        : task
    );
    setFieldValue('wbsTasks', updatedTasks);
  }, [formData.wbsTasks, setFieldValue]);

  const deleteWbsTask = useCallback((taskId: string) => {
    const currentTasks = formData.wbsTasks || [];
    const taskToDelete = currentTasks.find(t => t.id === taskId);

    if (!taskToDelete) return;

    // 收集要删除的任务ID（包括所有子任务）
    const toDelete = new Set<string>([taskId]);
    const collectChildren = (parentId: string) => {
      currentTasks.forEach(task => {
        if (task.parentId === parentId) {
          toDelete.add(task.id);
          collectChildren(task.id);
        }
      });
    };
    collectChildren(taskId);

    // 删除任务并更新父任务的子任务列表
    const updatedTasks = currentTasks
      .filter(task => !toDelete.has(task.id))
      .map(task => {
        if (task.subtasks?.includes(taskId)) {
          return {
            ...task,
            subtasks: task.subtasks.filter(id => id !== taskId),
          };
        }
        return task;
      });

    setFieldValue('wbsTasks', updatedTasks);
  }, [formData.wbsTasks, setFieldValue]);

  const moveWbsTask = useCallback((taskId: string, newParentId: string | null, newIndex?: number) => {
    const currentTasks = formData.wbsTasks || [];
    const taskToMove = currentTasks.find(t => t.id === taskId);

    if (!taskToMove) return;

    // 验证移动是否会导致循环依赖
    if (newParentId) {
      let currentId = newParentId;
      while (currentId) {
        if (currentId === taskId) {
          console.error('无法移动：会导致循环依赖');
          return;
        }
        const parent = currentTasks.find(t => t.id === currentId);
        currentId = parent?.parentId || null;
      }
    }

    // 更新原父任务的子任务列表
    const updatedTasks = currentTasks.map(task => {
      if (task.id === taskToMove.parentId) {
        return {
          ...task,
          subtasks: task.subtasks?.filter(id => id !== taskId) || [],
        };
      }
      return task;
    });

    // 更新目标任务
    const taskIndex = updatedTasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
      // 计算新的WBS编码
      const siblings = newParentId
        ? updatedTasks.filter(t => t.parentId === newParentId)
        : updatedTasks.filter(t => !t.parentId);
      const insertIndex = newIndex !== undefined ? newIndex : siblings.length;
      const wbsCode = generateWbsCode(
        newParentId ? updatedTasks.find(t => t.id === newParentId)?.wbsCode : undefined,
        insertIndex
      );

      updatedTasks[taskIndex] = {
        ...updatedTasks[taskIndex],
        parentId: newParentId || undefined,
        wbsCode,
        level: newParentId
          ? (updatedTasks.find(t => t.id === newParentId)?.level || 0) + 1
          : 0,
      };

      // 更新新父任务的子任务列表
      if (newParentId) {
        const newParentIndex = updatedTasks.findIndex(t => t.id === newParentId);
        if (newParentIndex !== -1) {
          const subtasks = [...(updatedTasks[newParentIndex].subtasks || [])];
          if (newIndex !== undefined) {
            subtasks.splice(newIndex, 0, taskId);
          } else {
            subtasks.push(taskId);
          }
          updatedTasks[newParentIndex] = {
            ...updatedTasks[newParentIndex],
            subtasks,
          };
        }
      }
    }

    setFieldValue('wbsTasks', updatedTasks);
  }, [formData.wbsTasks, setFieldValue]);

  const batchUpdateWbsTasks = useCallback((tasks: WbsTask[]) => {
    setFieldValue('wbsTasks', tasks);
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

    // WBS 任务操作
    addWbsTask,
    updateWbsTask,
    deleteWbsTask,
    moveWbsTask,
    batchUpdateWbsTasks,

    // 工具方法
    getFormDataForSubmit,
    hasChanges,
  };
}

// ==================== 辅助 Hook ====================

/**
 * 项目表单验证规则 Hook
 * 根据项目类型返回不同的验证规则
 *
 * 注意：根据 UI 设计文档更新，计划日期字段改为可选，不再强制要求
 */
export function useProjectFormValidationRules(projectType: ProjectType): FormValidationOptions {
  return {
    requireDates: false, // 日期字段改为可选
    requireMilestones: projectType === 'product_development',
  };
}

/**
 * 监听项目类型变化，自动调整表单验证规则
 *
 * 注意：根据 UI 设计文档更新，计划日期字段改为可选，不再强制要求
 */
export function useProjectTypeValidation(formData: ProjectFormData) {
  const validationRules = useProjectFormValidationRules(formData.projectType || 'product_development');

  useEffect(() => {
    // 当项目类型切换时，清除不需要的字段的验证错误
    // 日期字段已改为可选，不需要清除验证错误
  }, [formData.projectType]);

  return validationRules;
}
