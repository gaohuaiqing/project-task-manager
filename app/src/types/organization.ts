/**
 * 组织架构类型定义
 *
 * 支持三级组织结构：部门 → 技术组 → 成员
 */

// 组织层级类型
export type OrgLevelType = 'department' | 'tech_group' | 'member';

// 能力维度定义
export interface CapabilityDimension {
  key: string;           // 维度键（如 boardDev）
  name: string;          // 维度名称（如 板卡开发）
  description: string;   // 维度描述
  color: string;         // 显示颜色
}

// 能力模型组（包含多个能力维度，应用于特定技术组）
export interface CapabilityModel {
  id: string;                    // 模型组唯一ID
  name: string;                  // 模型组名称（如"前端开发能力模型"）
  description: string;           // 模型组描述
  dimensions: CapabilityDimension[];  // 该模型组包含的能力维度
  techGroupIds: string[];        // 应用到的技术组ID列表
  isDefault: boolean;            // 是否为默认模型
  createdAt: number;
  updatedAt: number;
}

// 能力模型（动态，支持自定义维度）
export interface MemberCapabilities {
  [key: string]: number; // 动态键值对
}

// 默认能力维度
export const DEFAULT_CAPABILITY_DIMENSIONS: CapabilityDimension[] = [
  { key: 'boardDev', name: '板卡开发', description: '硬件板卡设计、原理图绘制、PCB布局能力', color: '#3b82f6' },
  { key: 'firmwareDev', name: '固件开发', description: '嵌入式软件、驱动程序、底层代码开发能力', color: '#22c55e' },
  { key: 'componentImport', name: '外购部件导入', description: '供应商管理、部件选型、导入验证能力', color: '#a855f7' },
  { key: 'systemDesign', name: '系统设计', description: '系统架构设计、方案规划、技术决策能力', color: '#f59e0b' },
  { key: 'driverInterface', name: '驱动接口类', description: '接口设计、协议开发、系统集成能力', color: '#06b6d4' }
];

// 默认能力模型值
export const getDefaultCapabilityValues = (): MemberCapabilities => {
  const values: MemberCapabilities = {};
  DEFAULT_CAPABILITY_DIMENSIONS.forEach(dim => {
    values[dim.key] = 5;
  });
  return values;
};

// 组织节点基础接口
export interface OrgNode {
  id: string;
  name: string;
  level: OrgLevelType;
  parentId: string | null;
  createdAt: number;
  updatedAt: number;
  children?: OrgTreeNode[]; // 可选的子节点
}

// 部门节点
export interface Department extends OrgNode {
  level: 'department';
  managerName?: string;
  description?: string;
  children: OrgTreeNode[];
}

// 技术组节点
export interface TechGroup extends OrgNode {
  level: 'tech_group';
  leaderId?: string;       // 技术经理成员 ID
  leaderName?: string;     // 技术经理姓名（用于显示和创建时的临时存储）
  description?: string;
  memberIds: string[];
  children: Member[];
}

// 成员节点
export interface Member extends OrgNode {
  level: 'member';
  employeeId: string;
  role: 'dept_manager' | 'tech_manager' | 'engineer';
  directSupervisorId?: string; // 直属主管 ID（工程师→技术经理，技术经理→部门经理）
  directSupervisorName?: string; // 直属主管姓名（用于显示）
  capabilities?: MemberCapabilities;
  children?: never; // 成员没有子节点
}

// 组织树节点联合类型
export type OrgTreeNode = Department | TechGroup | Member;

// 完整组织架构
export interface OrganizationStructure {
  version: number;
  lastUpdated: number;
  lastUpdatedBy: string;
  departments: Department[];
}

// 组织节点操作类型
export type OrgNodeOperation = 'create' | 'update' | 'delete' | 'move';

// 组织节点变更事件
export interface OrgChangeEvent {
  type: OrgNodeOperation;
  nodeType: OrgLevelType;
  nodeId: string;
  nodeName: string;
  timestamp: number;
  userId: string;
  details?: string;
}
