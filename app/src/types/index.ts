// 能力维度定义
export const CAPABILITY_DIMENSIONS = {
  boardDev: { name: '板卡开发', description: '硬件板卡设计、原理图绘制、PCB布局能力' },
  firmwareDev: { name: '固件开发', description: '嵌入式软件、驱动程序、底层代码开发能力' },
  componentImport: { name: '外购部件导入', description: '供应商管理、部件选型、导入验证能力' },
  systemDesign: { name: '系统设计', description: '系统架构设计、方案规划、技术决策能力' },
  driverInterface: { name: '驱动接口类', description: '接口设计、协议开发、系统集成能力' },
} as const;

// 能力等级定义
export const CAPABILITY_LEVELS = {
  expert: { min: 9, max: 10, label: '专家', color: 'emerald', description: '能够独立解决复杂问题，指导他人，推动技术创新' },
  proficient: { min: 7, max: 8, label: '熟练', color: 'blue', description: '能够独立完成复杂任务，具备问题分析和解决能力' },
  competent: { min: 5, max: 6, label: '胜任', color: 'cyan', description: '能够独立完成常规任务，需要少量指导' },
  developing: { min: 3, max: 4, label: '发展中', color: 'yellow', description: '需要指导完成任务，正在积极学习和提升' },
  beginner: { min: 1, max: 2, label: '入门', color: 'orange', description: '刚开始接触该领域，需要大量指导和支持' },
} as const;

// 人员能力维度
export interface MemberCapabilities {
  boardDev: number;      // 板卡开发
  firmwareDev: number;   // 固件开发
  componentImport: number; // 外购部件导入
  systemDesign: number;  // 系统设计
  driverInterface: number; // 驱动接口类
}

// 能力评估记录
export interface CapabilityAssessmentRecord {
  id: string;
  memberId: string;
  assessorId: string;
  assessorName: string;
  assessmentDate: number;
  capabilities: MemberCapabilities;
  overallScore: number;
  comments: string;
  assessmentType: 'initial' | 'periodic' | 'promotion' | 'project';
  previousCapabilities?: MemberCapabilities;
  changes?: Record<keyof MemberCapabilities, { from: number; to: number; reason: string }>;
}

// 能力评估标准
export interface CapabilityAssessmentCriteria {
  dimension: keyof MemberCapabilities;
  level: number;
  criteria: string[];
  examples: string[];
}

// 能力发展计划
export interface CapabilityDevelopmentPlan {
  id: string;
  memberId: string;
  targetCapabilities: Partial<MemberCapabilities>;
  targetDate: number;
  actions: CapabilityDevelopmentAction[];
  status: 'active' | 'completed' | 'cancelled';
  createdAt: number;
  updatedAt: number;
}

// 能力发展行动项
export interface CapabilityDevelopmentAction {
  id: string;
  dimension: keyof MemberCapabilities;
  action: string;
  resources: string[];
  deadline: number;
  status: 'pending' | 'in_progress' | 'completed';
  completedAt?: number;
  notes?: string;
}

// 人员数据 - 统一从 member.ts 导入
export type { Member, MemberOnlineStatus, MemberRole } from './member';
// 向后兼容导出
export type { Member as OrgMember } from './organization';

// ==================== 新版本项目类型（来自 @/types/project） ====================
// 使用 number 类型 ID，与数据库对齐
export type {
  ProjectType,
  ProjectStatus,
  ProjectMember,
  ProjectMemberRole,
  ProjectMilestone,
  MilestoneStatus,
  ProjectPlan,
  TimelineEvent,
  ProjectFormData,
  ProjectQueryParams,
  ProjectStatistics,
  ProjectDetail,
  ProjectApiResponse
} from './project';

// 新版本 Project（数字 ID）
export type { Project as ProjectNew } from './project';

// 常量重新导出
export {
  PROJECT_TYPE_LABELS,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
  PROJECT_MEMBER_ROLE_LABELS
} from './project';

// ==================== 旧版本项目类型（向后兼容） ====================
// 使用 string 类型 ID，保持现有组件兼容性

// 项目类型定义（旧版，与 project.ts 同步）
export type ProjectType_Legacy = 'product_development' | 'functional_management';

// 项目数据（旧版 - 字符串 ID）
export interface Project {
  id: string;
  code: string;
  name: string;
  description: string;
  progress: number;
  status: 'planning' | 'in_progress' | 'completed' | 'delayed';
  members: string[];
  deadline: string;
  startDate: string;
  taskCount: number;
  completedTaskCount: number;
  timeline: TimelineEvent[];
  projectType: ProjectType_Legacy;
  projectPlan?: ProjectPlan_Legacy;
}

export interface ProjectPlan_Legacy {
  plannedStartDate: string;
  plannedEndDate: string;
  milestones: ProjectMilestone_Legacy[];
  resourceAllocations?: any[];
}

export interface ProjectMilestone_Legacy {
  id: string;
  name: string;
  plannedDate: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'delayed';
}

// 任务数据
export interface Task {
  id: string;
  title: string;
  type: 'frontend' | 'backend' | 'test' | 'design' | 'other';
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
  estimatedHours: number;
  deadline: string;
  priority: 'low' | 'medium' | 'high';
  requiredSkills: string[];
  assignee?: string; // member ID
  status: 'pending' | 'in_progress' | 'completed';
  projectId: string;
  description?: string;
  createdAt: string;
}

// 推荐候选人
export interface Candidate {
  member: Member;
  score: number; // 0-100
  reasons: string[];
  skillMatch: number;
  availability: number;
  experience: number;
  loadFactor: number;
}

// 任务表单数据
export interface TaskFormData {
  title: string;
  type: 'frontend' | 'backend' | 'test' | 'design' | 'other';
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
  estimatedHours: number;
  deadline: string;
  priority: 'low' | 'medium' | 'high';
  requiredSkills: string[];
  description: string;
}

// 通知数据
export interface Notification {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
}

// 导航项
export interface NavItem {
  id: string;
  label: string;
  icon: string;
}
