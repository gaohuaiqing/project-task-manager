/**
 * 智能分配模块类型定义
 */

// 能力维度
export type CapabilityDimension =
  | 'boardDev'
  | 'firmwareDev'
  | 'componentImport'
  | 'systemDesign'
  | 'driverInterface';

// 能力等级
export interface CapabilityLevel {
  min: number;
  max: number;
  label: string;
  color: string;
  description: string;
}

// 成员能力评分
export interface MemberCapability {
  dimension: CapabilityDimension;
  score: number; // 1-10
  level: string; // 入门/发展中/胜任/熟练/专家
}

// 成员能力档案
export interface MemberCapabilityProfile {
  memberId: number;
  memberName: string;
  capabilities: Record<CapabilityDimension, number>;
  overallScore: number;
  lastAssessmentDate: string | null;
}

// 任务技能要求
export interface TaskSkillRequirement {
  dimension: CapabilityDimension;
  minScore: number; // 最低要求分数
  weight: number; // 权重 0-1
}

// 分配建议
export interface AssignmentSuggestion {
  taskId: string;
  taskName: string;
  candidates: CandidateScore[];
  recommendedCandidate: CandidateScore;
  reasoning: string;
}

// 候选人评分
export interface CandidateScore {
  memberId: number;
  memberName: string;
  score: number; // 0-100
  skillMatch: number; // 技能匹配度
  availability: number; // 可用性
  experience: number; // 经验相关性
  currentLoad: number; // 当前负载
  breakdown: {
    skillMatchDetails: string[];
    availabilityDetails: string;
    experienceDetails: string;
    loadDetails: string;
  };
}

// 能力评估请求
export interface CapabilityAssessmentRequest {
  memberId: number;
  capabilities: Record<CapabilityDimension, number>;
  comments?: string;
  assessmentType: 'initial' | 'periodic' | 'promotion' | 'project';
}

// 能力矩阵查询参数
export interface CapabilityMatrixParams {
  departmentId?: number;
  dimensions?: CapabilityDimension[];
  minScore?: number;
  maxScore?: number;
}

// 能力发展计划
export interface CapabilityDevelopmentPlan {
  id: string;
  memberId: number;
  memberName: string;
  targetCapabilities: Partial<Record<CapabilityDimension, number>>;
  targetDate: string;
  actions: DevelopmentAction[];
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

// 发展行动
export interface DevelopmentAction {
  id: string;
  dimension: CapabilityDimension;
  action: string;
  resources: string[];
  deadline: string;
  status: 'pending' | 'in_progress' | 'completed';
  completedAt?: string;
  notes?: string;
}

// 维度配置
export const CAPABILITY_DIMENSIONS_CONFIG: Record<CapabilityDimension, {
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

// 能力等级配置
export const CAPABILITY_LEVELS_CONFIG: Record<string, CapabilityLevel> = {
  expert: { min: 9, max: 10, label: '专家', color: 'emerald', description: '能够独立解决复杂问题，指导他人，推动技术创新' },
  proficient: { min: 7, max: 8, label: '熟练', color: 'blue', description: '能够独立完成复杂任务，具备问题分析和解决能力' },
  competent: { min: 5, max: 6, label: '胜任', color: 'cyan', description: '能够独立完成常规任务，需要少量指导' },
  developing: { min: 3, max: 4, label: '发展中', color: 'yellow', description: '需要指导完成任务。正在积极学习和提升' },
  beginner: { min: 1, max: 2, label: '入门', color: 'orange', description: '刚开始接触该领域。需要大量指导和支持' },
};

// 获取能力等级
export function getCapabilityLevel(score: number): CapabilityLevel {
  for (const [key, level] of Object.entries(CAPABILITY_LEVELS_CONFIG)) {
    if (score >= level.min && score <= level.max) {
      return { ...level, label: level.label };
    }
  }
  return CAPABILITY_LEVELS_CONFIG.beginner;
}
