/**
 * 甘特图数据适配器
 *
 * 在 WbsTask/ProjectMilestone 和 TimeNode 之间进行转换
 *
 * @module utils/ganttAdapters
 */

import type { TimeNode } from '@/components/gantt';
import type { WbsTask } from '@/types/wbs';
import type { ProjectMilestone } from '@/types/project';

/**
 * 将 WbsTask 转换为 TimeNode
 */
export function wbsTaskToTimeNode(task: WbsTask): TimeNode {
  return {
    id: task.id,
    type: 'task',
    name: task.title || task.wbsCode || task.id,
    description: task.description,
    startDate: task.plannedStartDate,
    endDate: task.plannedEndDate,
    duration: task.plannedDays || 1,
    status: task.status,
    assignee: task.memberName,
    color: getStatusColor(task.status),
  };
}

/**
 * 将 ProjectMilestone 转换为 TimeNode
 */
export function milestoneToTimeNode(milestone: ProjectMilestone): TimeNode {
  return {
    id: milestone.id,
    type: 'milestone',
    name: milestone.name,
    description: milestone.description,
    startDate: milestone.plannedDate,
    endDate: milestone.plannedDate,
    duration: 1,
    status: milestone.status,
  };
}

/**
 * 将 WbsTask 列表和 ProjectMilestone 列表合并为 TimeNode 列表
 */
export function mergeToTimeNodes(
  tasks: WbsTask[],
  milestones: ProjectMilestone[]
): TimeNode[] {
  const taskNodes = tasks.map(wbsTaskToTimeNode);
  const milestoneNodes = milestones.map(milestoneToTimeNode);

  // 按开始日期排序
  return [...taskNodes, ...milestoneNodes].sort((a, b) =>
    a.startDate.localeCompare(b.startDate)
  );
}

/**
 * 将 TimeNode 转换为 WbsTask（仅适用于任务类型）
 */
export function timeNodeToWbsTask(node: TimeNode): WbsTask {
  return {
    id: node.id,
    projectId: 0, // 需要从外部获取
    memberId: '',
    title: node.name,
    description: node.description || '',
    status: (node.status as WbsTask['status']) || 'not_started',
    priority: 'medium',
    plannedStartDate: node.startDate,
    plannedEndDate: node.endDate,
    plannedDays: node.duration,
    progress: 0,
    wbsCode: '',
    level: 0,
    subtasks: [],
    order: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 将 TimeNode 转换为 ProjectMilestone（仅适用于里程碑类型）
 */
export function timeNodeToMilestone(node: TimeNode): ProjectMilestone {
  return {
    id: node.id,
    projectId: 0, // 需要从外部获取
    name: node.name,
    description: node.description || '',
    plannedDate: node.startDate,
    actualDate: node.endDate === node.startDate ? node.endDate : undefined,
    status: (node.status as ProjectMilestone['status']) || 'pending',
    sortOrder: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 从 TimeNode 列表中提取并更新 WbsTask 列表
 */
export function updateWbsTasksFromNodes(
  originalTasks: WbsTask[],
  nodes: TimeNode[]
): WbsTask[] {
  const nodeMap = new Map(nodes.filter(n => n.type === 'task').map(n => [n.id, n]));

  return originalTasks.map(task => {
    const node = nodeMap.get(task.id);
    if (!node) return task;

    return {
      ...task,
      plannedStartDate: node.startDate,
      plannedEndDate: node.endDate,
      plannedDays: node.duration,
      updatedAt: new Date().toISOString(),
    };
  });
}

/**
 * 从 TimeNode 列表中提取并更新 ProjectMilestone 列表
 */
export function updateMilestonesFromNodes(
  originalMilestones: ProjectMilestone[],
  nodes: TimeNode[]
): ProjectMilestone[] {
  const nodeMap = new Map(nodes.filter(n => n.type === 'milestone').map(n => [n.id, n]));

  return originalMilestones.map(milestone => {
    const node = nodeMap.get(milestone.id);
    if (!node) return milestone;

    return {
      ...milestone,
      name: node.name,
      plannedDate: node.startDate,
      status: (node.status as ProjectMilestone['status']) || milestone.status,
      updatedAt: new Date().toISOString(),
    };
  });
}

/**
 * 获取状态对应的颜色
 */
function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return '#22c55e';
    case 'in_progress':
      return '#3b82f6';
    case 'delayed':
      return '#ef4444';
    case 'not_started':
    default:
      return '#94a3b8';
  }
}
