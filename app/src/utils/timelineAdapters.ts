/**
 * 时间轴数据适配器
 *
 * 负责新旧数据格式之间的转换，确保向后兼容
 *
 * @module utils/timelineAdapters
 */

import type {
  Timeline,
  TimelineTask,
  TimelineConfig,
} from '@/types/timeline';
import type { ProjectMilestone } from '@/types/project';
import type { WbsTask } from '@/types/wbs';
import { calculateDaysBetween } from './timePlanHelpers';

// ==================== 类型转换 ====================

/**
 * 将里程碑转换为时间轴任务
 */
export function milestoneToTimelineTask(
  milestone: ProjectMilestone,
  timelineId: string
): TimelineTask {
  return {
    id: `milestone_${milestone.id}`,
    title: milestone.name,
    description: milestone.description,
    startDate: milestone.plannedDate,
    endDate: milestone.plannedDate, // 里程碑是单日任务
    status: convertMilestoneStatus(milestone.status),
    priority: 'medium',
    progress: milestone.status === 'completed' ? 100 : 0,
    sourceType: 'milestone',
    sourceId: milestone.id,
    sortOrder: milestone.sortOrder,
  };
}

/**
 * 将WBS任务转换为时间轴任务
 */
export function wbsTaskToTimelineTask(
  wbsTask: WbsTask,
  timelineId: string
): TimelineTask {
  return {
    id: `wbs_${wbsTask.id}`,
    title: wbsTask.title,
    description: wbsTask.description,
    startDate: wbsTask.plannedStartDate,
    endDate: wbsTask.plannedEndDate,
    status: convertWbsStatus(wbsTask.status),
    priority: wbsTask.priority,
    progress: wbsTask.progress,
    assigneeId: wbsTask.memberId,
    sourceType: 'wbs',
    sourceId: wbsTask.id,
    sortOrder: wbsTask.order,
  };
}

/**
 * 将时间轴任务转换为里程碑
 */
export function timelineTaskToMilestone(
  task: TimelineTask,
  projectId: number
): Omit<ProjectMilestone, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    projectId,
    name: task.title,
    description: task.description,
    plannedDate: task.startDate,
    status: convertToMilestoneStatus(task.status),
    sortOrder: task.sortOrder ?? 0,
  };
}

/**
 * 将时间轴任务转换为WBS任务
 */
export function timelineTaskToWbsTask(
  task: TimelineTask,
  projectId: string
): Omit<WbsTask, 'id' | 'wbsCode' | 'createdAt' | 'updatedAt' | 'level' | 'subtasks' | 'isExpanded'> {
  return {
    projectId,
    memberId: task.assigneeId ?? '',
    title: task.title,
    description: task.description,
    status: convertToWbsStatus(task.status),
    priority: task.priority ?? 'medium',
    plannedStartDate: task.startDate,
    plannedEndDate: task.endDate,
    plannedDays: calculateDaysBetween(task.startDate, task.endDate),
    progress: task.progress ?? 0,
    order: task.sortOrder ?? 0,
  };
}

// ==================== 状态转换 ====================

/**
 * 转换里程碑状态到任务状态
 */
function convertMilestoneStatus(
  status: ProjectMilestone['status']
): TimelineTask['status'] {
  const statusMap: Record<ProjectMilestone['status'], TimelineTask['status']> = {
    pending: 'not_started',
    in_progress: 'in_progress',
    completed: 'completed',
    delayed: 'delayed',
    cancelled: 'cancelled',
  };
  return statusMap[status] ?? 'not_started';
}

/**
 * 转换WBS状态到任务状态
 */
function convertWbsStatus(
  status: WbsTask['status']
): TimelineTask['status'] {
  const statusMap: Record<WbsTask['status'], TimelineTask['status']> = {
    not_started: 'not_started',
    in_progress: 'in_progress',
    completed: 'completed',
    delayed: 'delayed',
    cancelled: 'cancelled',
  };
  return statusMap[status] ?? 'not_started';
}

/**
 * 转换任务状态到里程碑状态
 */
function convertToMilestoneStatus(
  status: TimelineTask['status']
): ProjectMilestone['status'] {
  const statusMap: Record<TimelineTask['status'], ProjectMilestone['status']> = {
    not_started: 'pending',
    in_progress: 'in_progress',
    completed: 'completed',
    delayed: 'delayed',
    cancelled: 'cancelled',
  };
  return statusMap[status] ?? 'pending';
}

/**
 * 转换任务状态到WBS状态
 */
function convertToWbsStatus(
  status: TimelineTask['status']
): WbsTask['status'] {
  const statusMap: Record<TimelineTask['status'], WbsTask['status']> = {
    not_started: 'not_started',
    in_progress: 'in_progress',
    completed: 'completed',
    delayed: 'delayed',
    cancelled: 'cancelled',
  };
  return statusMap[status] ?? 'not_started';
}

// ==================== 数据迁移 ====================

/**
 * 将旧的里程碑数据迁移到新的时间轴格式
 *
 * 创建默认时间轴，将所有里程碑放入其中
 */
export function migrateMilestonesToTimelines(
  milestones: ProjectMilestone[]
): Timeline[] {
  if (milestones.length === 0) {
    return [];
  }

  const defaultTimeline: Timeline = {
    config: {
      id: 'milestones_timeline',
      name: '里程碑',
      icon: '🏁',
      color: '#3b82f6',
      type: 'custom',
      visible: true,
      editable: true,
      sortOrder: 0,
    },
    tasks: milestones.map(m => milestoneToTimelineTask(m, 'milestones_timeline')),
  };

  return [defaultTimeline];
}

/**
 * 将旧的WBS任务数据迁移到新的时间轴格式
 *
 * 可以按成员ID分组创建时间轴
 */
export function migrateWbsTasksToTimelines(
  wbsTasks: WbsTask[],
  groupBy: 'all' | 'member' = 'all'
): Timeline[] {
  if (wbsTasks.length === 0) {
    return [];
  }

  if (groupBy === 'all') {
    // 所有任务放在一个时间轴
    const defaultTimeline: Timeline = {
      config: {
        id: 'tasks_timeline',
        name: '任务',
        icon: '📋',
        color: '#10b981',
        type: 'custom',
        visible: true,
        editable: true,
        sortOrder: 0,
      },
      tasks: wbsTasks.map(task => wbsTaskToTimelineTask(task, 'tasks_timeline')),
    };
    return [defaultTimeline];
  }

  // 按成员分组
  const memberGroups = new Map<string, WbsTask[]>();
  wbsTasks.forEach(task => {
    const memberId = task.memberId || 'unassigned';
    if (!memberGroups.has(memberId)) {
      memberGroups.set(memberId, []);
    }
    memberGroups.get(memberId)!.push(task);
  });

  return Array.from(memberGroups.entries()).map(([memberId, tasks], index) => {
    // 获取成员名称（从第一个任务中）
    const memberName = tasks[0].memberId || '未分配';

    return {
      config: {
        id: `member_${memberId}`,
        name: memberName,
        icon: '👤',
        color: getMemberColor(index),
        type: 'team',
        visible: true,
        editable: true,
        sortOrder: index,
      },
      tasks: tasks.map(task => wbsTaskToTimelineTask(task, `member_${memberId}`)),
    };
  });
}

/**
 * 将时间轴数据转换回旧格式（里程碑）
 */
export function timelinesToMilestones(
  timelines: Timeline[]
): Omit<ProjectMilestone, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>[] {
  const milestones: Omit<ProjectMilestone, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>[] = [];

  timelines.forEach(timeline => {
    timeline.tasks.forEach(task => {
      if (task.sourceType === 'milestone' || task.startDate === task.endDate) {
        milestones.push(timelineTaskToMilestone(task, 0));
      }
    });
  });

  // 按sortOrder排序
  return milestones.sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * 将时间轴数据转换回旧格式（WBS任务）
 */
export function timelinesToWbsTasks(
  timelines: Timeline[]
): Omit<WbsTask, 'id' | 'wbsCode' | 'createdAt' | 'updatedAt' | 'level' | 'subtasks' | 'isExpanded'>[] {
  const wbsTasks: Omit<WbsTask, 'id' | 'wbsCode' | 'createdAt' | 'updatedAt' | 'level' | 'subtasks' | 'isExpanded'>[] = [];

  timelines.forEach(timeline => {
    timeline.tasks.forEach(task => {
      if (task.sourceType === 'wbs' || task.startDate !== task.endDate) {
        wbsTasks.push(timelineTaskToWbsTask(task, ''));
      }
    });
  });

  // 按order排序
  return wbsTasks.sort((a, b) => a.order - b.order);
}

/**
 * 合并里程碑和WBS任务到时间轴格式
 */
export function mergeToTimelines(
  milestones: ProjectMilestone[],
  wbsTasks: WbsTask[],
  options: {
    separateMilestones?: boolean;
    groupByMember?: boolean;
  } = {}
): Timeline[] {
  const { separateMilestones = true, groupByMember = false } = options;
  const timelines: Timeline[] = [];

  // 处理里程碑
  if (milestones.length > 0) {
    if (separateMilestones) {
      timelines.push(...migrateMilestonesToTimelines(milestones));
    } else {
      // 里程碑与任务混合
      const milestoneTasks = milestones.map(m => milestoneToTimelineTask(m, 'mixed'));
      timelines.push({
        config: {
          id: 'mixed_timeline',
          name: '项目计划',
          icon: '📊',
          color: '#8b5cf6',
          type: 'custom',
          visible: true,
          editable: true,
          sortOrder: 0,
        },
        tasks: milestoneTasks,
      });
    }
  }

  // 处理WBS任务
  if (wbsTasks.length > 0) {
    timelines.push(...migrateWbsTasksToTimelines(wbsTasks, groupByMember ? 'member' : 'all'));
  }

  return timelines;
}

// ==================== 辅助函数 ====================

/**
 * 获取成员颜色（循环使用预定义颜色）
 */
function getMemberColor(index: number): string {
  const colors = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#84cc16', // lime
  ];
  return colors[index % colors.length];
}

/**
 * 检测时间轴任务是否来自里程碑
 */
export function isMilestoneTask(task: TimelineTask): boolean {
  return task.sourceType === 'milestone' || task.startDate === task.endDate;
}

/**
 * 检测时间轴任务是否来自WBS
 */
export function isWbsTask(task: TimelineTask): boolean {
  return task.sourceType === 'wbs' || task.startDate !== task.endDate;
}
