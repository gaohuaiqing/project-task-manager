/**
 * 项目类型管理器 (动态配置版)
 *
 * 职责：
 * 1. 从后端API获取项目类型配置
 * 2. 提供项目类型特定的验证规则
 * 3. 控制表单字段显示/隐藏逻辑
 * 4. 生成类型特定的提示信息
 *
 * @module utils/projectTypeManager
 */

import type { ProjectType, ProjectMemberRole } from '@/types/project';
import { getProjectTypes, type ProjectTypeConfig } from '@/services/ProjectTypeService';

// ==================== 类型定义 ====================

/**
 * 项目类型元数据配置（动态）
 */
export interface DynamicProjectTypeConfig {
  /** 类型ID */
  id: number;
  /** 类型编码 */
  type: ProjectType;
  /** 显示名称 */
  label: string;
  /** 简短描述 */
  description: string;
  /** 详细说明 */
  detail: string;
  /** 图标名称（lucide-react） */
  icon: string;
  /** 主题颜色 */
  color: string;
  /** 是否需要日期计划 */
  requiresDates: boolean;
  /** 是否需要里程碑 */
  requiresMilestones: boolean;
  /** 是否需要成员（所有类型都需要） */
  requiresMembers: boolean;
  /** 表单字段可见性配置 */
  fieldVisibility: {
    plannedStartDate?: boolean;
    plannedEndDate?: boolean;
    milestones?: boolean;
  };
  /** 提示信息列表 */
  hints: string[];
  /** 示例项目编码前缀 */
  codePrefix: string;
}

/**
 * 表单字段配置
 */
export interface FieldConfig {
  /** 字段是否可见 */
  visible: boolean;
  /** 字段是否必填 */
  required: boolean;
  /** 字段标签 */
  label: string;
  /** 字段占位符 */
  placeholder: string;
}

/**
 * 项目类型特定的表单配置
 */
export interface ProjectTypeFormConfig {
  /** 类型配置 */
  typeConfig: DynamicProjectTypeConfig;
  /** 表单字段配置 */
  fields: Record<string, FieldConfig>;
  /** 验证规则 */
  validation: {
    requireDates: boolean;
    requireMilestones: boolean;
    dateRangeValidation: boolean;
    milestoneDateInRange: boolean;
  };
}

// ==================== 项目类型管理器类 ====================

/**
 * 项目类型管理器（动态配置版）
 */
export class ProjectTypeManager {
  /** 缓存的项目类型配置 */
  private static cache: DynamicProjectTypeConfig[] | null = null;
  /** 缓存过期时间（5分钟） */
  private static cacheExpiry: number = 5 * 60 * 1000;
  /** 缓存时间戳 */
  private static cacheTime: number = 0;

  /**
   * 清除缓存
   */
  static clearCache(): void {
    this.cache = null;
    this.cacheTime = 0;
  }

  /**
   * 从后端获取项目类型配置
   */
  private static async fetchTypes(): Promise<DynamicProjectTypeConfig[]> {
    try {
      const types = await getProjectTypes();

      return types.map((type): DynamicProjectTypeConfig => ({
        id: type.id,
        type: type.code as ProjectType,
        label: type.name,
        description: type.description,
        detail: type.detail,
        icon: type.icon,
        color: type.color,
        requiresDates: type.requiresDates,
        requiresMilestones: type.requiresMilestones,
        requiresMembers: type.requiresMembers,
        fieldVisibility: type.fieldVisibility || {},
        hints: type.hints || [],
        codePrefix: type.codePrefix,
      }));
    } catch (error) {
      console.error('获取项目类型失败:', error);
      // 返回默认类型配置
      return this.getDefaultTypes();
    }
  }

  /**
   * 获取默认项目类型（降级方案）
   */
  private static getDefaultTypes(): DynamicProjectTypeConfig[] {
    return [
      {
        id: 1,
        type: 'product_development',
        label: '产品开发类',
        description: '产品开发类项目需要明确时间计划和关键里程碑',
        detail: '适用于新产品研发、技术升级、系统集成等有明确交付目标和时间要求的项目',
        icon: 'Rocket',
        color: 'blue',
        requiresDates: true,
        requiresMilestones: true,
        requiresMembers: true,
        fieldVisibility: {
          plannedStartDate: true,
          plannedEndDate: true,
          milestones: true,
        },
        hints: [
          '必须填写计划开始和结束时间',
          '必须添加至少一个关键里程碑',
          '里程碑将用于跟踪项目进度',
        ],
        codePrefix: 'PRD',
      },
      {
        id: 2,
        type: 'functional_management',
        label: '职能管理类',
        description: '职能管理类项目以团队建设和日常管理为主',
        detail: '适用于部门建设、团队培养、流程优化、日常运营等持续性管理工作',
        icon: 'Users',
        color: 'purple',
        requiresDates: false,
        requiresMilestones: false,
        requiresMembers: true,
        fieldVisibility: {
          plannedStartDate: false,
          plannedEndDate: false,
          milestones: false,
        },
        hints: [
          '时间计划为可选项',
          '不需要添加里程碑',
          '重点关注团队成员配置',
        ],
        codePrefix: 'MGT',
      },
      {
        id: 3,
        type: 'material_substitution',
        label: '物料改代类',
        description: '物料改代类项目涉及原材料或零部件的替代和变更',
        detail: '适用于原材料替代、零部件升级、供应链优化等涉及物料变更的项目',
        icon: 'RefreshCw',
        color: 'green',
        requiresDates: true,
        requiresMilestones: true,
        requiresMembers: true,
        fieldVisibility: {
          plannedStartDate: true,
          plannedEndDate: true,
          milestones: true,
        },
        hints: [
          '需要明确改代时间节点',
          '关注供应链影响',
          '需要测试验证里程碑',
        ],
        codePrefix: 'MAT',
      },
      {
        id: 4,
        type: 'troubleshooting',
        label: '故障排查类',
        description: '故障排查类项目专注于问题诊断和解决',
        detail: '适用于产品故障分析、系统问题排查、质量问题解决等紧急响应项目',
        icon: 'AlertTriangle',
        color: 'red',
        requiresDates: true,
        requiresMilestones: true,
        requiresMembers: true,
        fieldVisibility: {
          plannedStartDate: true,
          plannedEndDate: true,
          milestones: true,
        },
        hints: [
          '需要快速响应时间',
          '明确问题解决里程碑',
          '关注根因分析和预防措施',
        ],
        codePrefix: 'TRO',
      },
      {
        id: 5,
        type: 'other',
        label: '其他',
        description: '其他类型的项目',
        detail: '适用于不属于上述类别的其他项目类型',
        icon: 'Info',
        color: 'gray',
        requiresDates: false,
        requiresMilestones: false,
        requiresMembers: true,
        fieldVisibility: {
          plannedStartDate: false,
          plannedEndDate: false,
          milestones: false,
        },
        hints: [
          '根据项目具体情况设置时间计划',
          '灵活配置项目成员',
          '关注项目独特需求',
        ],
        codePrefix: 'OTH',
      },
    ];
  }

  /**
   * 获取所有项目类型配置
   */
  static async getAllConfigs(): Promise<DynamicProjectTypeConfig[]> {
    const now = Date.now();

    // 检查缓存是否有效
    if (this.cache && (now - this.cacheTime) < this.cacheExpiry) {
      return this.cache;
    }

    // 从后端获取配置
    this.cache = await this.fetchTypes();
    this.cacheTime = now;

    return this.cache;
  }

  /**
   * 根据编码获取项目类型配置
   */
  static async getConfig(type: ProjectType): Promise<DynamicProjectTypeConfig> {
    const configs = await this.getAllConfigs();
    const config = configs.find(c => c.type === type);

    if (!config) {
      // 返回默认配置
      return this.getDefaultTypes()[0];
    }

    return config;
  }

  /**
   * 获取项目类型的表单配置
   */
  static async getFormConfig(type: ProjectType): Promise<ProjectTypeFormConfig> {
    const typeConfig = await this.getConfig(type);

    // 合并字段配置
    const fields: Record<string, FieldConfig> = {
      code: {
        visible: true,
        required: true,
        label: '项目编码/工艺代号',
        placeholder: '例如：PRJ-2024-001',
      },
      name: {
        visible: true,
        required: true,
        label: '项目名称',
        placeholder: '输入项目名称',
      },
      description: {
        visible: true,
        required: false,
        label: '项目描述',
        placeholder: '简要描述项目的目标和范围...',
      },
      projectType: {
        visible: true,
        required: true,
        label: '项目类型',
        placeholder: '',
      },
      memberIds: {
        visible: true,
        required: true,
        label: '项目成员',
        placeholder: '选择项目成员',
      },
    };

    // 添加日期字段配置
    if (typeConfig.fieldVisibility.plannedStartDate !== false) {
      fields.plannedStartDate = {
        visible: typeConfig.fieldVisibility.plannedStartDate,
        required: typeConfig.requiresDates,
        label: '计划开始日期',
        placeholder: '选择开始日期',
      };
    }

    if (typeConfig.fieldVisibility.plannedEndDate !== false) {
      fields.plannedEndDate = {
        visible: typeConfig.fieldVisibility.plannedEndDate,
        required: typeConfig.requiresDates,
        label: '计划结束日期',
        placeholder: '选择结束日期',
      };
    }

    if (typeConfig.fieldVisibility.milestones !== false) {
      fields.milestones = {
        visible: typeConfig.fieldVisibility.milestones,
        required: typeConfig.requiresMilestones,
        label: '关键里程碑',
        placeholder: '添加项目里程碑',
      };
    }

    return {
      typeConfig,
      fields,
      validation: {
        requireDates: typeConfig.requiresDates,
        requireMilestones: typeConfig.requiresMilestones,
        dateRangeValidation: typeConfig.requiresDates,
        milestoneDateInRange: typeConfig.requiresMilestones,
      },
    };
  }

  /**
   * 检查字段是否可见
   */
  static async isFieldVisible(type: ProjectType, fieldName: string): Promise<boolean> {
    const formConfig = await this.getFormConfig(type);
    return formConfig.fields[fieldName]?.visible ?? false;
  }

  /**
   * 检查字段是否必填
   */
  static async isFieldRequired(type: ProjectType, fieldName: string): Promise<boolean> {
    const formConfig = await this.getFormConfig(type);
    return formConfig.fields[fieldName]?.required ?? false;
  }

  /**
   * 获取字段配置
   */
  static async getFieldConfig(type: ProjectType, fieldName: string): Promise<FieldConfig | undefined> {
    const formConfig = await this.getFormConfig(type);
    return formConfig.fields[fieldName];
  }

  /**
   * 获取项目类型提示信息
   */
  static async getTypeHints(type: ProjectType): Promise<string[]> {
    const config = await this.getConfig(type);
    return config.hints;
  }

  /**
   * 获取项目类型描述
   */
  static async getTypeDescription(type: ProjectType): Promise<string> {
    const config = await this.getConfig(type);
    return config.description;
  }

  /**
   * 获取项目类型图标名称
   */
  static async getTypeIcon(type: ProjectType): Promise<string> {
    const config = await this.getConfig(type);
    return config.icon;
  }

  /**
   * 获取项目类型颜色
   */
  static async getTypeColor(type: ProjectType): Promise<string> {
    const config = await this.getConfig(type);
    return config.color;
  }

  /**
   * 获取项目类型标签
   */
  static async getTypeLabel(type: ProjectType): Promise<string> {
    const config = await this.getConfig(type);
    return config.label;
  }

  /**
   * 获取项目编码前缀建议
   */
  static async getCodePrefix(type: ProjectType): Promise<string> {
    const config = await this.getConfig(type);
    return config.codePrefix;
  }

  /**
   * 生成项目编码建议
   */
  static async generateCodeSuggestion(type: ProjectType, year?: number): Promise<string> {
    const prefix = await this.getCodePrefix(type);
    const currentYear = year ?? new Date().getFullYear();
    return `${prefix}-${currentYear}-001`;
  }

  /**
   * 检查项目类型切换时是否需要清理数据
   */
  static async needsDataCleanup(oldType: ProjectType, newType: ProjectType): Promise<{
    needsCleanup: boolean;
    fieldsToClear: string[];
    warningMessage?: string;
  }> {
    const oldConfig = await this.getConfig(oldType);
    const newConfig = await this.getConfig(newType);

    // 检查哪些字段在新类型中不可见
    const fieldsToClear: string[] = [];

    if (oldConfig.fieldVisibility.plannedStartDate && !newConfig.fieldVisibility.plannedStartDate) {
      fieldsToClear.push('plannedStartDate', 'plannedEndDate');
    }

    if (oldConfig.fieldVisibility.milestones && !newConfig.fieldVisibility.milestones) {
      fieldsToClear.push('milestones');
    }

    const needsCleanup = fieldsToClear.length > 0;

    return {
      needsCleanup,
      fieldsToClear,
      warningMessage: needsCleanup
        ? `切换到${newConfig.label}将清除以下数据：${fieldsToClear.join('、')}`
        : undefined,
    };
  }

  /**
   * 获取项目类型切换的清理数据
   */
  static async getCleanupDataForTypeChange(
    oldType: ProjectType,
    newType: ProjectType,
    currentData: Record<string, any>
  ): Promise<Record<string, any>> {
    const { fieldsToClear } = await this.needsDataCleanup(oldType, newType);
    const cleanedData: Record<string, any> = { ...currentData };

    fieldsToClear.forEach(field => {
      delete cleanedData[field];
    });

    return cleanedData;
  }

  /**
   * 刷新项目类型缓存
   */
  static async refresh(): Promise<void> {
    this.clearCache();
    await this.getAllConfigs();
  }
}

// ==================== 工具函数 ====================

/**
 * 获取项目类型配置（便捷方法）
 */
export async function getProjectTypeConfig(type: ProjectType): Promise<DynamicProjectTypeConfig> {
  return ProjectTypeManager.getConfig(type);
}

/**
 * 获取项目类型表单配置（便捷方法）
 */
export async function getProjectTypeFormConfig(type: ProjectType): Promise<ProjectTypeFormConfig> {
  return ProjectTypeManager.getFormConfig(type);
}

/**
 * 检查字段是否可见（便捷方法）
 */
export async function isFieldVisible(type: ProjectType, fieldName: string): Promise<boolean> {
  return ProjectTypeManager.isFieldVisible(type, fieldName);
}

/**
 * 检查字段是否必填（便捷方法）
 */
export async function isFieldRequired(type: ProjectType, fieldName: string): Promise<boolean> {
  return ProjectTypeManager.isFieldRequired(type, fieldName);
}

/**
 * 获取项目类型提示（便捷方法）
 */
export async function getProjectTypeHints(type: ProjectType): Promise<string[]> {
  return ProjectTypeManager.getTypeHints(type);
}

/**
 * 获取项目类型描述（便捷方法）
 */
export async function getProjectTypeDescription(type: ProjectType): Promise<string> {
  return ProjectTypeManager.getTypeDescription(type);
}

/**
 * 生成项目编码建议（便捷方法）
 */
export async function generateProjectCode(type: ProjectType, year?: number): Promise<string> {
  return ProjectTypeManager.generateCodeSuggestion(type, year);
}

/**
 * 获取所有项目类型（便捷方法）
 */
export async function getAllProjectTypes(): Promise<DynamicProjectTypeConfig[]> {
  return ProjectTypeManager.getAllConfigs();
}

export default ProjectTypeManager;
