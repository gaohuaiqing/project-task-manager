/**
 * Project 类型适配层
 *
 * 处理新旧 Project 类型之间的兼容性转换：
 * - 旧类型：id: string
 * - 新类型：id: number
 *
 * @module utils/projectAdapters
 */

import type { Project as LegacyProject } from '@/types';
import type { Project as NewProject, ProjectStatus, ProjectType } from '@/types/project';

// ==================== 类型定义 ====================

/**
 * 联合项目类型（兼容旧和新）
 */
export type AnyProject = LegacyProject | NewProject;

/**
 * 项目版本标识
 */
export type ProjectVersion = 'legacy' | 'new';

// ==================== 类型守卫 ====================

/**
 * 检查是否为旧版 Project（id 为 string）
 */
export function isLegacyProject(project: AnyProject): project is LegacyProject {
  return typeof project.id === 'string';
}

/**
 * 检查是否为新版 Project（id 为 number）
 */
export function isNewProject(project: AnyProject): project is NewProject {
  return typeof project.id === 'number';
}

/**
 * 获取项目版本
 */
export function getProjectVersion(project: AnyProject): ProjectVersion {
  return isLegacyProject(project) ? 'legacy' : 'new';
}

// ==================== ID 转换 ====================

/**
 * 字符串 ID 转数字 ID
 * @param stringId 字符串 ID（如 "123" 或 "proj-123"）
 * @returns 数字 ID，失败返回 null
 */
export function stringIdToNumber(stringId: string): number | null {
  // 尝试直接解析数字
  const num = parseInt(stringId, 10);
  if (!isNaN(num)) return num;

  // 尝试提取数字部分（如 "proj-123" -> 123）
  const match = stringId.match(/\d+/);
  if (match) return parseInt(match[0], 10);

  return null;
}

/**
 * 数字 ID 转字符串 ID
 */
export function numberIdToString(numberId: number): string {
  return String(numberId);
}

// ==================== 类型转换 ====================

/**
 * 新版 Project 转旧版
 */
export function toLegacyProject(newProject: NewProject): LegacyProject {
  return {
    id: numberIdToString(newProject.id),
    code: newProject.code,
    name: newProject.name,
    description: newProject.description || '',
    progress: newProject.progress,
    status: newProject.status as LegacyProject['status'],
    members: [], // 需要从成员列表转换
    deadline: newProject.plannedEndDate || newProject.actualEndDate || '',
    startDate: newProject.plannedStartDate || newProject.actualStartDate || '',
    taskCount: newProject.taskCount,
    completedTaskCount: newProject.completedTaskCount,
    timeline: [], // 需要从里程碑转换
    projectType: newProject.projectType as LegacyProject['projectType'],
    projectPlan: {
      plannedStartDate: newProject.plannedStartDate || '',
      plannedEndDate: newProject.plannedEndDate || '',
      milestones: [], // 需要从里程碑转换
      resourceAllocations: [],
    },
  };
}

/**
 * 旧版 Project 转新版
 */
export function toNewProject(legacyProject: LegacyProject): NewProject {
  const idNum = stringIdToNumber(legacyProject.id) || 0;

  return {
    id: idNum,
    code: legacyProject.code,
    name: legacyProject.name,
    description: legacyProject.description,
    status: legacyProject.status as ProjectStatus,
    projectType: legacyProject.projectType as ProjectType,
    plannedStartDate: legacyProject.projectPlan?.plannedStartDate || legacyProject.startDate,
    plannedEndDate: legacyProject.projectPlan?.plannedEndDate || legacyProject.deadline,
    actualStartDate: undefined,
    actualEndDate: undefined,
    progress: legacyProject.progress,
    taskCount: legacyProject.taskCount || 0,
    completedTaskCount: legacyProject.completedTaskCount || 0,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 批量转换旧版到新版
 */
export function toNewProjects(legacyProjects: LegacyProject[]): NewProject[] {
  return legacyProjects.map(toNewProject);
}

/**
 * 批量转换新版到旧版
 */
export function toLegacyProjects(newProjects: NewProject[]): LegacyProject[] {
  return newProjects.map(toLegacyProject);
}

// ==================== 混合数组处理 ====================

/**
 * 分离混合项目数组为新旧两组
 */
export function separateProjectsByVersion(projects: AnyProject[]): {
  legacy: LegacyProject[];
  new: NewProject[];
} {
  const legacy: LegacyProject[] = [];
  const new: NewProject[] = [];

  projects.forEach(project => {
    if (isLegacyProject(project)) {
      legacy.push(project);
    } else {
      new.push(project);
    }
  });

  return { legacy, new };
}

/**
 * 统一为新版项目数组
 * 自动转换旧版项目
 */
export function normalizeProjects(projects: AnyProject[]): NewProject[] {
  return projects.map(project =>
    isLegacyProject(project) ? toNewProject(project) : project
  );
}

/**
 * 统一为旧版项目数组
 * 自动转换新版项目
 */
export function denormalizeProjects(projects: AnyProject[]): LegacyProject[] {
  return projects.map(project =>
    isNewProject(project) ? toLegacyProject(project) : project
  );
}

// ==================== 查询适配 ====================

/**
 * 适配项目 ID 查询（支持 string 或 number）
 */
export function adaptProjectId(id: string | number): number {
  return typeof id === 'string' ? stringIdToNumber(id) || 0 : id;
}

/**
 * 适配项目 ID 比较相等
 */
export function isProjectIdEqual(id1: string | number, id2: string | number): boolean {
  const num1 = typeof id1 === 'string' ? stringIdToNumber(id1) : id1;
  const num2 = typeof id2 === 'string' ? stringIdToNumber(id2) : id2;
  return num1 === num2;
}

/**
 * 从项目列表中查找项目（支持混合类型）
 */
export function findProjectById(
  projects: AnyProject[],
  id: string | number
): AnyProject | undefined {
  const targetNum = typeof id === 'string' ? stringIdToNumber(id) : id;
  if (targetNum === null) return undefined;

  return projects.find(project => {
    const projectIdNum = typeof project.id === 'string'
      ? stringIdToNumber(project.id)
      : project.id;
    return projectIdNum === targetNum;
  });
}

// ==================== 表单数据适配 ====================

/**
 * 表单数据转新版 Project
 */
export function formDataToNewProject(formData: {
  code: string;
  name: string;
  description?: string;
  projectType: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  memberIds?: number[];
  milestones?: any[];
}): Partial<NewProject> {
  return {
    code: formData.code,
    name: formData.name,
    description: formData.description,
    projectType: formData.projectType as ProjectType,
    plannedStartDate: formData.plannedStartDate,
    plannedEndDate: formData.plannedEndDate,
    version: 1,
  };
}

/**
 * 表单数据转旧版 Project
 */
export function formDataToLegacyProject(formData: {
  code: string;
  name: string;
  description?: string;
  projectType: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  memberIds?: string[];
  milestones?: any[];
}): Partial<LegacyProject> {
  return {
    code: formData.code,
    name: formData.name,
    description: formData.description,
    projectType: formData.projectType as LegacyProject['projectType'],
    projectPlan: {
      plannedStartDate: formData.plannedStartDate || '',
      plannedEndDate: formData.plannedEndDate || '',
      milestones: formData.milestones || [],
    },
  };
}

// ==================== API 响应适配 ====================

/**
 * 适配 API 响应中的项目数据
 * 自动转换旧版数据为新版
 */
export function adaptApiResponseProject(data: any): NewProject {
  if (!data) return data;

  // 如果是旧版格式（id 为 string），转换为新版
  if (typeof data.id === 'string') {
    return toNewProject(data as LegacyProject);
  }

  return data as NewProject;
}

/**
 * 适配 API 响应中的项目数组
 */
export function adaptApiResponseProjects(data: any[]): NewProject[] {
  if (!Array.isArray(data)) return [];
  return data.map(adaptApiResponseProject);
}

// ==================== 导出便捷函数 ====================

/**
 * 创建项目 ID 映射（用于快速查找）
 */
export function createProjectIdMap(projects: AnyProject[]): Map<number, AnyProject> {
  const map = new Map<number, AnyProject>();
  projects.forEach(project => {
    const id = typeof project.id === 'string'
      ? stringIdToNumber(project.id)
      : project.id;
    if (id !== null) {
      map.set(id, project);
    }
  });
  return map;
}

/**
 * 过滤项目（支持混合类型）
 */
export function filterProjects<T extends AnyProject>(
  projects: T[],
  predicate: (project: T) => boolean
): T[] {
  return projects.filter(predicate);
}

/**
 * 排序项目（支持混合类型）
 */
export function sortProjects<T extends AnyProject>(
  projects: T[],
  compareFn: (a: T, b: T) => number
): T[] {
  return [...projects].sort(compareFn);
}
