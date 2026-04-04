/**
 * 智能分配模块类型定义
 * 与后端 org/types.ts 保持一致
 */

// ========== 核心类型（与后端一致）==========

/**
 * 维度分数
 */
export interface DimensionScore {
  dimension_name: string;
  score: number; // 0-100
}

/**
 * 能力维度配置
 */
export interface CapabilityDimensionConfig {
  name: string;
  weight: number; // 0-100
  description?: string;
}

/**
 * 能力模型
 */
export interface CapabilityModel {
  id: string;
  name: string;
  description: string | null;
  dimensions: CapabilityDimensionConfig[];
  createdAt: string;
  updatedAt: string;
}

/**
 * 成员能力评定
 */
export interface MemberCapabilityAssessment {
  id: string;
  user_id: number;
  model_id: string;
  model_name: string;
  association_label: string | null;
  dimension_scores: DimensionScore[];
  overall_score: number; // 加权平均分 0-100
  evaluated_at: string;
  evaluated_by: number;
  notes: string | null;
}

/**
 * 成员能力档案
 */
export interface MemberCapabilityProfile {
  memberId: number;
  memberName: string;
  departmentId: number | null;
  departmentName: string | null;
  capabilities: MemberCapabilityAssessment[];
  overallScore: number;
  lastAssessmentDate: string | null;
}

// ========== API 请求类型 ==========

/**
 * 能力矩阵查询参数
 */
export interface CapabilityMatrixParams {
  departmentId?: number;
  dimensions?: string[];
  minScore?: number;
  maxScore?: number;
}

/**
 * 能力评估请求
 */
export interface CapabilityAssessmentRequest {
  userId: number;
  modelId: string;
  associationLabel?: string;
  dimensionScores: DimensionScore[];
  notes?: string;
}

// ========== 智能分配类型 ==========

/**
 * 任务技能要求
 */
export interface TaskSkillRequirement {
  dimensionName: string;
  minScore: number; // 最低要求分数 0-100
  weight: number; // 权重 0-1
}

/**
 * 候选人评分
 */
export interface CandidateScore {
  memberId: number;
  memberName: string;
  memberGender: 'male' | 'female' | 'other' | null;
  departmentName: string | null;
  score: number; // 0-100
  modelName: string;
  matchLevel: 'excellent' | 'good' | 'fair';
  currentTasks: number;
}

/**
 * 分配建议
 */
export interface AssignmentSuggestion {
  taskId: string;
  taskName: string;
  candidates: CandidateScore[];
  recommendedCandidate: CandidateScore | null;
  reasoning: string;
}

// ========== 能力发展计划 ==========

/**
 * 能力发展计划
 */
export interface CapabilityDevelopmentPlan {
  id: string;
  memberId: number;
  memberName: string;
  targetCapabilities: {
    modelId: string;
    modelName: string;
    targetScores: DimensionScore[];
  }[];
  targetDate: string;
  actions: DevelopmentAction[];
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

/**
 * 发展行动
 */
export interface DevelopmentAction {
  id: string;
  dimensionName: string;
  action: string;
  resources: string[];
  deadline: string;
  status: 'pending' | 'in_progress' | 'completed';
  completedAt?: string;
  notes?: string;
}

// ========== 能力等级 ==========

/**
 * 能力等级配置
 */
export interface CapabilityLevel {
  min: number;
  max: number;
  label: string;
  color: string;
  description: string;
}

/**
 * 能力等级配置
 */
export const CAPABILITY_LEVELS_CONFIG: Record<string, CapabilityLevel> = {
  expert: {
    min: 90,
    max: 100,
    label: '专家',
    color: 'emerald',
    description: '能够独立解决复杂问题，指导他人，推动技术创新',
  },
  proficient: {
    min: 75,
    max: 89,
    label: '熟练',
    color: 'blue',
    description: '能够独立完成复杂任务，具备问题分析和解决能力',
  },
  competent: {
    min: 60,
    max: 74,
    label: '胜任',
    color: 'cyan',
    description: '能够独立完成常规任务，需要少量指导',
  },
  developing: {
    min: 40,
    max: 59,
    label: '发展中',
    color: 'yellow',
    description: '需要指导完成任务，正在积极学习和提升',
  },
  beginner: {
    min: 0,
    max: 39,
    label: '入门',
    color: 'orange',
    description: '刚开始接触该领域，需要大量指导和支持',
  },
};

/**
 * 获取能力等级
 */
export function getCapabilityLevel(score: number): CapabilityLevel {
  for (const level of Object.values(CAPABILITY_LEVELS_CONFIG)) {
    if (score >= level.min && score <= level.max) {
      return level;
    }
  }
  return CAPABILITY_LEVELS_CONFIG.beginner;
}

/**
 * 获取匹配等级
 */
export function getMatchLevel(score: number): 'excellent' | 'good' | 'fair' {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  return 'fair';
}

// ========== 兼容旧类型（已弃用，保留向后兼容）==========

/**
 * @deprecated 使用 string 类型代替
 * 旧的能力维度枚举，仅用于向后兼容
 */
export type LegacyCapabilityDimension =
  | 'boardDev'
  | 'firmwareDev'
  | 'componentImport'
  | 'systemDesign'
  | 'driverInterface';

/**
 * @deprecated 使用 CapabilityDimensionConfig 代替
 */
export const CAPABILITY_DIMENSIONS_CONFIG: Record<LegacyCapabilityDimension, {
  name: string;
  description: string;
}> = {
  boardDev: {
    name: '板卡开发',
    description: '硬件板卡设计、原理图绘制、PCB布局能力',
  },
  firmwareDev: {
    name: '固件开发',
    description: '嵌入式软件、驱动程序、底层代码开发能力',
  },
  componentImport: {
    name: '外购部件导入',
    description: '供应商管理、部件选型、导入验证能力',
  },
  systemDesign: {
    name: '系统设计',
    description: '系统架构设计、方案规划、技术决策能力',
  },
  driverInterface: {
    name: '驱动接口类',
    description: '接口设计、协议开发、系统集成能力',
  },
};

// ========== 默认任务类型-能力模型映射 ==========

/**
 * 任务类型映射
 */
export const TASK_TYPE_MODEL_MAPPING: Record<string, string[]> = {
  firmware: ['嵌入式开发能力'],
  board: ['嵌入式开发能力'],
  driver: ['嵌入式开发能力'],
  interface: ['系统设计能力'],
  system_design: ['系统设计能力'],
  general: ['通用能力'],
};
