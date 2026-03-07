/**
 * 项目类型 API 服务
 *
 * 从后端获取项目类型配置
 */

const API_BASE = 'http://localhost:3001/api';

export interface ProjectTypeConfig {
  id: number;
  code: string;
  name: string;
  description: string;
  detail: string;
  icon: string;
  color: string;
  requiresDates: boolean;
  requiresMilestones: boolean;
  requiresMembers: boolean;
  codePrefix: string;
  fieldVisibility: {
    plannedStartDate?: boolean;
    plannedEndDate?: boolean;
    milestones?: boolean;
  };
  hints: string[];
  sortOrder: number;
  isActive: boolean;
}

/**
 * 获取所有项目类型
 */
export async function getProjectTypes(): Promise<ProjectTypeConfig[]> {
  const response = await fetch(`${API_BASE}/project-types`);
  const result = await response.json();

  if (result.success) {
    return result.data;
  }

  throw new Error(result.message || '获取项目类型失败');
}

/**
 * 获取单个项目类型
 */
export async function getProjectType(id: number): Promise<ProjectTypeConfig> {
  const response = await fetch(`${API_BASE}/project-types/${id}`);
  const result = await response.json();

  if (result.success) {
    return result.data;
  }

  throw new Error(result.message || '获取项目类型失败');
}

/**
 * 创建项目类型
 */
export async function createProjectType(data: Partial<ProjectTypeConfig>): Promise<ProjectTypeConfig> {
  const response = await fetch(`${API_BASE}/project-types`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await response.json();

  if (result.success) {
    return result.data;
  }

  throw new Error(result.message || '创建项目类型失败');
}

/**
 * 更新项目类型
 */
export async function updateProjectType(
  id: number,
  data: Partial<ProjectTypeConfig>
): Promise<void> {
  const response = await fetch(`${API_BASE}/project-types/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.message || '更新项目类型失败');
  }
}

/**
 * 删除项目类型
 */
export async function deleteProjectType(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/project-types/${id}`, {
    method: 'DELETE',
  });
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.message || '删除项目类型失败');
  }
}
