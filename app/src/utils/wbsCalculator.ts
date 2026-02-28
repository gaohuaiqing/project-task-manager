/**
 * WBS 任务计算工具函数
 * 包含日期计算、关键路径识别、日期冲突检测等功能
 */

import { format, addDays, differenceInDays, parseISO, isBefore, isAfter, isEqual } from 'date-fns';
import type { WbsTask, DateConflict, CriticalPathNode, WbsTreeNode } from '@/types/wbs';

// 自定义 isWeekend 函数，支持单休日模式
function isWeekend(date: Date, isSingleRestDay: boolean = false): boolean {
  if (!isSingleRestDay) {
    // 双休模式：周六、周日休息
    const day = date.getDay();
    return day === 0 || day === 6;
  } else {
    // 单休模式：周日休息
    return date.getDay() === 0;
  }
}

// ==================== 日期计算 ====================

/**
 * 计算两个日期之间的工作日天数（排除周末）
 * @param startDate 开始日期（YYYY-MM-DD）
 * @param endDate 结束日期（YYYY-MM-DD）
 * @param holidays 节假日列表
 * @param isSingleRestDay 是否使用单休日计算（每周工作6天，周日休息）
 */
export function calculateWorkDays(startDate: string, endDate: string, holidays: string[] = [], isSingleRestDay: boolean = false): number {
  // 验证参数
  if (!startDate || !endDate) {
    return 0;
  }

  try {
    const start = parseISO(startDate);
    const end = parseISO(endDate);

    // 验证日期有效性
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      console.error('计算工作日天数时出错: 无效的日期格式', { startDate, endDate });
      return 0;
    }

    let days = 0;
    let current = start;

    while (current <= end) {
      const dateStr = format(current, 'yyyy-MM-dd');
      if (!isWeekend(current, isSingleRestDay) && !holidays.includes(dateStr)) {
        days++;
      }
      current = addDays(current, 1);
    }

    return days;
  } catch (error) {
    console.error('计算工作日天数时出错:', error);
    return 0;
  }
}

/**
 * 根据开始日期和工期计算结束日期（考虑节假日）
 * @param startDate 开始日期（YYYY-MM-DD）
 * @param days 工期天数
 * @param holidays 节假日列表
 * @param isSingleRestDay 是否使用单休日计算（每周工作6天，周日休息）
 */
export function calculateEndDate(startDate: string, days: number, holidays: string[] = [], isSingleRestDay: boolean = false): string {
  if (!startDate || !days || days <= 0) return startDate || '';
  const start = parseISO(startDate);
  let current = start;
  let workDays = 0;

  while (workDays < days) {
    const dateStr = format(current, 'yyyy-MM-dd');
    if (!isWeekend(current, isSingleRestDay) && !holidays.includes(dateStr)) {
      workDays++;
    }
    if (workDays < days) {
      current = addDays(current, 1);
    }
  }

  return format(current, 'yyyy-MM-dd');
}

/**
 * 找到下一个工作日
 * @param date 开始日期
 * @param holidays 节假日列表
 * @param isSingleRestDay 是否使用单休日计算
 * @returns 下一个工作日的日期字符串（YYYY-MM-DD）
 */
export function findNextWorkDay(date: string, holidays: string[] = [], isSingleRestDay: boolean = false): string {
  if (!date) return date;

  try {
    let current = parseISO(date);

    // 循环查找下一个工作日
    while (true) {
      const dateStr = format(current, 'yyyy-MM-dd');
      if (!isWeekend(current, isSingleRestDay) && !holidays.includes(dateStr)) {
        return dateStr;
      }
      current = addDays(current, 1);
    }
  } catch {
    return date;
  }
}

/**
 * 计算自然天数
 */
export function calculateDays(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0;
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  return differenceInDays(end, start) + 1;
}

// ==================== WBS 编码生成 ====================

/**
 * 生成 WBS 编码
 * @param parentCode 父任务编码
 * @param siblingIndex 同级索引
 */
export function generateWbsCode(parentCode: string | undefined, siblingIndex: number): string {
  if (!parentCode) return `${siblingIndex + 1}`;
  return `${parentCode}.${siblingIndex + 1}`;
}

/**
 * 根据 WBS 编码排序任务
 */
export function sortTasksByWbsCode(tasks: WbsTask[]): WbsTask[] {
  return [...tasks].sort((a, b) => {
    const aParts = a.wbsCode.split('.').map(Number);
    const bParts = b.wbsCode.split('.').map(Number);
    
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aVal = aParts[i] || 0;
      const bVal = bParts[i] || 0;
      if (aVal !== bVal) return aVal - bVal;
    }
    return 0;
  });
}

// ==================== 父子任务联动 ====================

/**
 * 构建 WBS 树形结构
 */
export function buildWbsTree(tasks: WbsTask[]): WbsTreeNode[] {
  const taskMap = new Map<string, WbsTreeNode>();
  const roots: WbsTreeNode[] = [];

  // 首先创建所有节点的映射
  tasks.forEach(task => {
    taskMap.set(task.id, { ...task, children: [], depth: 0 });
  });

  // 构建树形结构
  tasks.forEach(task => {
    const node = taskMap.get(task.id)!;
    if (task.parentId && taskMap.has(task.parentId)) {
      const parent = taskMap.get(task.parentId)!;
      parent.children.push(node);
      node.depth = parent.depth + 1;
    } else {
      roots.push(node);
    }
  });

  // 对每个父节点的子节点按 order 排序
  const sortChildren = (nodes: WbsTreeNode[]) => {
    nodes.sort((a, b) => a.order - b.order);
    nodes.forEach(node => sortChildren(node.children));
  };
  sortChildren(roots);

  return roots;
}

/**
 * 获取任务的所有子任务（包括嵌套的）
 */
export function getAllDescendants(taskId: string, allTasks: WbsTask[]): WbsTask[] {
  const descendants: WbsTask[] = [];
  
  // 递归获取所有子任务
  const findChildren = (currentId: string) => {
    const directChildren = allTasks.filter(t => t.parentId === currentId);
    directChildren.forEach(child => {
      descendants.push(child);
      findChildren(child.id);
    });
  };
  
  findChildren(taskId);
  return descendants;
}

/**
 * 更新父任务的日期范围（基于子任务）
 */
export function updateParentDates(tasks: WbsTask[], parentId: string): WbsTask[] {
  const parent = tasks.find(t => t.id === parentId);
  if (!parent) return tasks;

  const children = tasks.filter(t => t.parentId === parentId);
  if (children.length === 0) return tasks;

  // 找出子任务的最早开始和最晚结束
  const startDates = children.map(c => c.plannedStartDate).filter(Boolean);
  const endDates = children.map(c => c.plannedEndDate).filter(Boolean);

  if (startDates.length === 0 || endDates.length === 0) return tasks;

  const earliestStart = startDates.sort()[0];
  const latestEnd = endDates.sort().reverse()[0];

  // 更新父任务
  return tasks.map(t => {
    if (t.id === parentId) {
      return {
        ...t,
        plannedStartDate: earliestStart,
        plannedEndDate: latestEnd,
        plannedDays: calculateWorkDays(earliestStart, latestEnd, [], t.isSingleRestDay),
        updatedAt: new Date().toISOString()
      };
    }
    return t;
  });
}

/**
 * 计算父任务进度（基于子任务加权平均）
 */
export function calculateParentProgress(tasks: WbsTask[], parentId: string): number {
  const children = tasks.filter(t => t.parentId === parentId);
  if (children.length === 0) return 0;

  const totalPlannedDays = children.reduce((sum, c) => sum + c.plannedDays, 0);
  if (totalPlannedDays === 0) return 0;

  const weightedProgress = children.reduce((sum, c) => {
    return sum + (c.progress * c.plannedDays);
  }, 0);

  return Math.round(weightedProgress / totalPlannedDays);
}

// ==================== 关键路径识别 ====================

/**
 * 识别关键路径（使用拓扑排序和前后向遍历）
 */
export function identifyCriticalPath(tasks: WbsTask[], holidays: string[] = []): CriticalPathNode[] {
  if (tasks.length === 0) return [];

  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const criticalNodes: CriticalPathNode[] = [];

  // 1. 构建依赖图
  const dependencies = new Map<string, string[]>(); // taskId -> 前置任务列表
  const dependents = new Map<string, string[]>();   // taskId -> 后续任务列表

  tasks.forEach(task => {
    dependencies.set(task.id, task.predecessor ? [task.predecessor] : []);
    if (task.predecessor) {
      if (!dependents.has(task.predecessor)) {
        dependents.set(task.predecessor, []);
      }
      dependents.get(task.predecessor)!.push(task.id);
    }
  });

  // 2. 计算最早开始/结束时间（前向遍历）
  const earliestStart = new Map<string, string>();
  const earliestEnd = new Map<string, string>();

  const calculateEarliest = (taskId: string, visited = new Set<string>()): void => {
    if (visited.has(taskId)) return;
    visited.add(taskId);

    const task = taskMap.get(taskId);
    if (!task) return;

    const preds = dependencies.get(taskId) || [];
    let startDate = task.plannedStartDate;

    if (preds.length > 0) {
      // 取前置任务中最晚的结束日期
      let maxEndDate = '';
      preds.forEach(predId => {
        calculateEarliest(predId, visited);
        const predEnd = earliestEnd.get(predId);
        if (predEnd && (!maxEndDate || predEnd > maxEndDate)) {
          maxEndDate = predEnd;
        }
      });
      if (maxEndDate) {
        startDate = format(addDays(parseISO(maxEndDate), 1), 'yyyy-MM-dd');
      }
    }

    earliestStart.set(taskId, startDate);
    earliestEnd.set(taskId, calculateEndDate(startDate, task.plannedDays, holidays, task.isSingleRestDay));
  };

  tasks.forEach(task => calculateEarliest(task.id));

  // 3. 计算最晚开始/结束时间（后向遍历）
  const latestStart = new Map<string, string>();
  const latestEnd = new Map<string, string>();

  // 找到项目结束日期
  const projectEnd = Array.from(earliestEnd.values()).sort().reverse()[0];

  const calculateLatest = (taskId: string, visited = new Set<string>()): void => {
    if (visited.has(taskId)) return;
    visited.add(taskId);

    const task = taskMap.get(taskId);
    if (!task) return;

    const deps = dependents.get(taskId) || [];
    let endDate = projectEnd;

    if (deps.length > 0) {
      // 取后续任务中最早的开始日期
      let minStartDate = '';
      deps.forEach(depId => {
        calculateLatest(depId, visited);
        const depStart = latestStart.get(depId);
        if (depStart && (!minStartDate || depStart < minStartDate)) {
          minStartDate = depStart;
        }
      });
      if (minStartDate) {
        endDate = format(addDays(parseISO(minStartDate), -1), 'yyyy-MM-dd');
      }
    }

    latestEnd.set(taskId, endDate);
    latestStart.set(taskId, format(addDays(parseISO(endDate), -task.plannedDays + 1), 'yyyy-MM-dd'));
  };

  // 从终点开始反向计算
  const endTasks = tasks.filter(t => !dependents.has(t.id) || dependents.get(t.id)?.length === 0);
  endTasks.forEach(task => calculateLatest(task.id));

  // 4. 识别关键路径（浮动时间为0的任务）
  tasks.forEach(task => {
    const es = earliestStart.get(task.id) || task.plannedStartDate;
    const ee = earliestEnd.get(task.id) || task.plannedEndDate;
    const ls = latestStart.get(task.id) || task.plannedStartDate;
    const le = latestEnd.get(task.id) || task.plannedEndDate;

    const float = differenceInDays(parseISO(ls), parseISO(es));

    if (float === 0) {
      criticalNodes.push({
        taskId: task.id,
        wbsCode: task.wbsCode,
        title: task.title,
        earliestStart: es,
        earliestEnd: ee,
        latestStart: ls,
        latestEnd: le,
        float
      });
    }
  });

  return criticalNodes.sort((a, b) => a.wbsCode.localeCompare(b.wbsCode));
}

// ==================== 日期冲突检测 ====================

/**
 * 检测日期冲突
 */
export function detectDateConflicts(tasks: WbsTask[]): DateConflict[] {
  const conflicts: DateConflict[] = [];
  const taskMap = new Map(tasks.map(t => [t.id, t]));

  tasks.forEach(task => {
    // 1. 检查与前置任务的冲突
    if (task.predecessor) {
      const pred = taskMap.get(task.predecessor);
      if (pred) {
        const predEnd = parseISO(pred.plannedEndDate);
        const taskStart = parseISO(task.plannedStartDate);
        
        if (isBefore(taskStart, addDays(predEnd, 1))) {
          conflicts.push({
            taskId: task.id,
            taskTitle: task.title,
            conflictType: 'predecessor_mismatch',
            conflictWith: pred.id,
            message: `任务开始时间(${task.plannedStartDate})早于前置任务结束时间(${pred.plannedEndDate})之后`
          });
        }
      }
    }

    // 2. 检查与父任务的冲突
    if (task.parentId) {
      const parent = taskMap.get(task.parentId);
      if (parent) {
        const taskStart = parseISO(task.plannedStartDate);
        const taskEnd = parseISO(task.plannedEndDate);
        const parentStart = parseISO(parent.plannedStartDate);
        const parentEnd = parseISO(parent.plannedEndDate);

        if (isBefore(taskStart, parentStart) || isAfter(taskEnd, parentEnd)) {
          conflicts.push({
            taskId: task.id,
            taskTitle: task.title,
            conflictType: 'parent_child_mismatch',
            conflictWith: parent.id,
            message: `子任务时间范围超出父任务时间范围`
          });
        }
      }
    }

    // 3. 检查同级任务的时间重叠（同一负责人）
    const siblings = tasks.filter(t => 
      t.id !== task.id && 
      t.memberId === task.memberId &&
      t.parentId === task.parentId
    );

    siblings.forEach(sibling => {
      const taskStart = parseISO(task.plannedStartDate);
      const taskEnd = parseISO(task.plannedEndDate);
      const siblingStart = parseISO(sibling.plannedStartDate);
      const siblingEnd = parseISO(sibling.plannedEndDate);

      // 检查是否有重叠
      if (
        (isBefore(taskStart, siblingEnd) || isEqual(taskStart, siblingEnd)) &&
        (isAfter(taskEnd, siblingStart) || isEqual(taskEnd, siblingStart))
      ) {
        // 避免重复添加
        const alreadyExists = conflicts.some(c => 
          c.taskId === sibling.id && c.conflictWith === task.id
        );
        
        if (!alreadyExists) {
          conflicts.push({
            taskId: task.id,
            taskTitle: task.title,
            conflictType: 'overlap',
            conflictWith: sibling.id,
            message: `与任务"${sibling.title}"时间重叠`
          });
        }
      }
    });
  });

  return conflicts;
}

// ==================== 数据验证 ====================

/**
 * 验证任务数据
 */
export function validateTaskData(task: Partial<WbsTask>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!task.title || task.title.trim().length === 0) {
    errors.push('任务标题不能为空');
  }

  // 计划开始日期和结束日期允许为空，不进行强制验证
  // 只有当两个日期都有值时才验证日期逻辑
  if (task.plannedStartDate && task.plannedEndDate) {
    const start = parseISO(task.plannedStartDate);
    const end = parseISO(task.plannedEndDate);
    
    if (isBefore(end, start)) {
      errors.push('计划结束日期不能早于开始日期');
    }
  }

  if (task.plannedDays !== undefined && task.plannedDays <= 0) {
    errors.push('计划工期必须大于0');
  }

  if (task.progress !== undefined && (task.progress < 0 || task.progress > 100)) {
    errors.push('进度百分比必须在0-100之间');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// ==================== 统计计算 ====================

/**
 * 计算 WBS 任务统计信息
 */
export function calculateWbsStats(tasks: WbsTask[]): {
  total: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  delayed: number;
  overallProgress: number;
} {
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === 'completed').length;
  const inProgress = tasks.filter(t => t.status === 'in_progress').length;
  const notStarted = tasks.filter(t => t.status === 'not_started').length;
  const delayed = tasks.filter(t => t.status === 'delayed').length;

  const totalPlannedDays = tasks.reduce((sum, t) => sum + t.plannedDays, 0);
  const weightedProgress = tasks.reduce((sum, t) => sum + (t.progress * t.plannedDays), 0);
  const overallProgress = totalPlannedDays > 0 ? Math.round(weightedProgress / totalPlannedDays) : 0;

  return {
    total,
    completed,
    inProgress,
    notStarted,
    delayed,
    overallProgress
  };
}

// ==================== 辅助函数 ====================

/**
 * 检查任务是否即将延期（3天内到期但未完成）
 */
export function isNearDeadline(task: WbsTask): boolean {
  if (task.status === 'completed') return false;
  if (!task.plannedEndDate) return false;
  const endDate = parseISO(task.plannedEndDate);
  const today = new Date();
  const diffDays = differenceInDays(endDate, today);
  return diffDays <= 3 && diffDays >= 0;
}

/**
 * 检查任务是否已延期
 */
export function isOverdue(task: WbsTask): boolean {
  if (task.status === 'completed') return false;
  if (!task.plannedEndDate) return false;
  const endDate = parseISO(task.plannedEndDate);
  const today = new Date();
  return isBefore(endDate, today);
}

/**
 * 获取状态配置
 */
export function getStatusConfig(status: WbsTask['status']) {
  const configs = {
    not_started: {
      label: '未开始',
      color: 'text-slate-400',
      bgColor: 'bg-slate-500/20',
      borderColor: 'border-slate-500/30'
    },
    in_progress: {
      label: '进行中',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      borderColor: 'border-blue-500/30'
    },
    completed: {
      label: '已完成',
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-500/30'
    },
    delayed: {
      label: '已延期',
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
      borderColor: 'border-red-500/30'
    },
    cancelled: {
      label: '已取消',
      color: 'text-gray-400',
      bgColor: 'bg-gray-500/20',
      borderColor: 'border-gray-500/30'
    }
  };
  return configs[status] || configs.not_started;
}

// ==================== 实际工期和状态计算 ====================

/**
 * 计算实际工期（工作日）
 * 规则：实际工期 = 实际结束日期 - 实际开始日期（工作日，排除周末和节假日）
 */
export function calculateActualDays(task: WbsTask, holidays: string[] = []): number | undefined {
  if (!task.actualStartDate || !task.actualEndDate) {
    return undefined;
  }

  try {
    const start = parseISO(task.actualStartDate);
    const end = parseISO(task.actualEndDate);

    // 验证日期有效性
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      console.error('计算实际工期时出错: 无效的日期格式', {
        actualStartDate: task.actualStartDate,
        actualEndDate: task.actualEndDate
      });
      return undefined;
    }

    // 处理结束日期早于开始日期的情况
    if (isBefore(end, start)) {
      return 0;
    }

    // 使用工作日计算函数，传递任务的 isSingleRestDay 属性
    return calculateWorkDays(task.actualStartDate, task.actualEndDate, holidays, task.isSingleRestDay);
  } catch {
    return undefined;
  }
}

/**
 * 计算任务状态（基于实际日期和计划日期）
 * 规则：
 * 新规则（优先级最高）：当实际开始时间为空，且当前日期超过计划开始时间，状态为"延期"
 * a. 如果实际结束日期晚于计划结束日期：超期完成
 * b. 如果实际结束日期未填写：
 *    i. 如果计划结束日期未到达：进行中
 *    ii. 如果计划结束日期已过去：延期
 * c. 如果实际结束日期早于计划结束日期：提前完成
 * d. 如果实际结束日期等于计划结束日期：按期完成
 */
export function calculateTaskStatus(task: WbsTask): {
  status: string;
  statusCode: 'overdue_completed' | 'in_progress' | 'delayed' | 'early_completed' | 'on_time_completed' | 'not_started';
  color: string;
  bgColor: string;
} {
  const today = new Date();
  
  // 新规则（优先级最高）：当实际开始时间为空，且当前日期超过计划开始时间，状态为"延期"
  if (!task.actualStartDate && task.plannedStartDate) {
    try {
      const plannedStart = parseISO(task.plannedStartDate);
      if (isBefore(plannedStart, today)) {
        // 当前日期已超过计划开始时间：延期
        return {
          status: '延期',
          statusCode: 'delayed',
          color: 'text-red-400',
          bgColor: 'bg-red-500/20'
        };
      }
    } catch {
      // 日期解析错误，继续后续判断
    }
  }
  
  // 如果没有实际开始日期，且未触发上述延期规则，任务未开始
  if (!task.actualStartDate) {
    return {
      status: '未开始',
      statusCode: 'not_started',
      color: 'text-slate-400',
      bgColor: 'bg-slate-500/20'
    };
  }
  
  // 如果有实际结束日期，根据与计划结束日期的比较确定状态
  if (task.actualEndDate && task.plannedEndDate) {
    try {
      const actualEnd = parseISO(task.actualEndDate);
      const plannedEnd = parseISO(task.plannedEndDate);
      
      if (isAfter(actualEnd, plannedEnd)) {
        // 实际结束日期晚于计划结束日期：超期完成
        return {
          status: '超期完成',
          statusCode: 'overdue_completed',
          color: 'text-orange-400',
          bgColor: 'bg-orange-500/20'
        };
      } else if (isBefore(actualEnd, plannedEnd)) {
        // 实际结束日期早于计划结束日期：提前完成
        return {
          status: '提前完成',
          statusCode: 'early_completed',
          color: 'text-green-400',
          bgColor: 'bg-green-500/20'
        };
      } else {
        // 实际结束日期等于计划结束日期：按期完成
        return {
          status: '按期完成',
          statusCode: 'on_time_completed',
          color: 'text-blue-400',
          bgColor: 'bg-blue-500/20'
        };
      }
    } catch {
      // 日期解析错误，返回进行中
      return {
        status: '进行中',
        statusCode: 'in_progress',
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/20'
      };
    }
  }
  
  // 实际结束日期未填写，根据计划结束日期判断
  if (task.plannedEndDate) {
    try {
      const plannedEnd = parseISO(task.plannedEndDate);
      
      if (isBefore(plannedEnd, today)) {
        // 计划结束日期已过去：延期
        return {
          status: '延期',
          statusCode: 'delayed',
          color: 'text-red-400',
          bgColor: 'bg-red-500/20'
        };
      } else {
        // 计划结束日期未到达：进行中
        return {
          status: '进行中',
          statusCode: 'in_progress',
          color: 'text-cyan-400',
          bgColor: 'bg-cyan-500/20'
        };
      }
    } catch {
      return {
        status: '进行中',
        statusCode: 'in_progress',
        color: 'text-cyan-400',
        bgColor: 'bg-cyan-500/20'
      };
    }
  }
  
  // 默认返回进行中
  return {
    status: '进行中',
    statusCode: 'in_progress',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/20'
  };
}

/**
 * 获取优先级配置
 */
export function getPriorityConfig(priority: WbsTask['priority']) {
  const configs = {
    low: {
      label: '低',
      color: 'text-slate-400',
      bgColor: 'bg-slate-500/20'
    },
    medium: {
      label: '中',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20'
    },
    high: {
      label: '高',
      color: 'text-red-400',
      bgColor: 'bg-red-500/20'
    }
  };
  return configs[priority] || configs.medium;
}

// ==================== 计划日期计算 ====================

/**
 * 计算任务的计划开始、计划结束和计划工期
 * 基于前置任务和提前/落后时间进行计算
 */
export function calculatePlannedDates(
  task: WbsTask,
  allTasks: WbsTask[],
  holidays: string[] = []
): {
  plannedStartDate: string;
  plannedEndDate: string;
  plannedDays: number;
} {
  let plannedStartDate = task.plannedStartDate;
  let plannedEndDate = task.plannedEndDate;
  let plannedDays = task.plannedDays;

  // 检查任务是否有子任务
  const hasChildren = allTasks.some(t => t.parentId === task.id);
  
  if (hasChildren) {
    // 对于父任务，计划开始日期是所有子任务中最早的开始时间
    // 计划结束日期是所有子任务中最晚的结束时间
    const allDescendants = getAllDescendants(task.id, allTasks);
    const allSubTasks = [...allDescendants];

    // 获取所有子任务的计划开始日期
    const startDates = allSubTasks
      .map(t => {
        const { plannedStartDate } = calculatePlannedDates(t, allTasks, holidays);
        return plannedStartDate;
      })
      .filter(Boolean);

    // 获取所有子任务的计划结束日期
    const endDates = allSubTasks
      .map(t => {
        const { plannedEndDate } = calculatePlannedDates(t, allTasks, holidays);
        return plannedEndDate;
      })
      .filter(Boolean);

    if (startDates.length > 0) {
      // 找到最早的开始日期
      plannedStartDate = startDates.sort()[0];
      // 调整到工作日
      plannedStartDate = findNextWorkDay(plannedStartDate, holidays, task.isSingleRestDay);
    }

    if (endDates.length > 0) {
      // 找到最晚的结束日期
      plannedEndDate = endDates.sort().reverse()[0];
      // 调整到工作日
      plannedEndDate = findNextWorkDay(plannedEndDate, holidays, task.isSingleRestDay);
    }

    // 根据计算出的开始和结束日期计算工期
    if (plannedStartDate && plannedEndDate) {
      plannedDays = calculateWorkDays(plannedStartDate, plannedEndDate, holidays, task.isSingleRestDay);
    } else {
      plannedDays = 1;
    }
  } else if (task.predecessor) {
    // 对于非父任务且有前置任务的情况，根据前置任务的结束日期计算
    const predecessorTask = allTasks.find(t => t.id === task.predecessor);
    if (predecessorTask && predecessorTask.plannedEndDate) {
      // 前置任务结束日期的下一天作为开始日期
      const predEndDate = parseISO(predecessorTask.plannedEndDate);
      const leadLag = task.leadLag || 0;

      // 考虑提前/落后时间
      // leadLag > 0 表示落后（延迟开始），leadLag < 0 表示提前
      let calculatedStartDate = format(addDays(predEndDate, 1 + leadLag), 'yyyy-MM-dd');

      // 调整开始日期到下一个工作日
      plannedStartDate = findNextWorkDay(calculatedStartDate, holidays, task.isSingleRestDay);

      // 根据工期计算结束日期
      plannedEndDate = calculateEndDate(plannedStartDate, plannedDays, holidays, task.isSingleRestDay);

      // 调整结束日期到下一个工作日（如果需要）
      plannedEndDate = findNextWorkDay(plannedEndDate, holidays, task.isSingleRestDay);

      // 重新计算工期，确保准确性
      plannedDays = calculateWorkDays(plannedStartDate, plannedEndDate, holidays, task.isSingleRestDay);
    }
  } else {
    // 如果没有前置任务且不是父任务，保持原有计划日期
    // 但确保工期与日期范围一致，并且日期调整到工作日
    if (plannedStartDate) {
      // 调整开始日期到下一个工作日
      plannedStartDate = findNextWorkDay(plannedStartDate, holidays, task.isSingleRestDay);
    }

    if (plannedEndDate) {
      // 调整结束日期到下一个工作日
      plannedEndDate = findNextWorkDay(plannedEndDate, holidays, task.isSingleRestDay);
    }

    if (plannedStartDate && plannedEndDate) {
      // 重新计算工期，确保准确性
      plannedDays = calculateWorkDays(plannedStartDate, plannedEndDate, holidays, task.isSingleRestDay);
    } else if (!plannedDays) {
      // 如果没有计划日期和工期，设置默认值
      plannedDays = 1;
    }
  }

  return {
    plannedStartDate: plannedStartDate || '',
    plannedEndDate: plannedEndDate || '',
    plannedDays: plannedDays || 1
  };
}

/**
 * 批量计算所有任务的计划日期
 * 按照WBS编码顺序计算，确保前置任务先计算
 */
export function calculateAllPlannedDates(
  tasks: WbsTask[],
  holidays: string[] = []
): WbsTask[] {
  const calculatedTasks = new Map<string, WbsTask>();
  
  // 按WBS编码排序
  const sortedTasks = sortTasksByWbsCode(tasks);
  
  sortedTasks.forEach(task => {
    // 更新前置任务的引用为已计算的任务
    const updatedTask = { ...task };
    
    if (task.predecessor && calculatedTasks.has(task.predecessor)) {
      // 使用已计算的前置任务数据
      const { plannedStartDate, plannedEndDate, plannedDays } = calculatePlannedDates(
        updatedTask,
        Array.from(calculatedTasks.values()),
        holidays
      );
      
      updatedTask.plannedStartDate = plannedStartDate;
      updatedTask.plannedEndDate = plannedEndDate;
      updatedTask.plannedDays = plannedDays;
    }
    
    calculatedTasks.set(task.id, updatedTask);
  });
  
  return Array.from(calculatedTasks.values());
}
