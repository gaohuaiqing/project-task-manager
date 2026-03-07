/**
 * 任务依赖关系服务
 *
 * 提供任务依赖关系的验证、计算和管理功能
 */

import { parseISO, differenceInDays, addDays, isBefore, isEqual } from 'date-fns';
import type { WbsTask } from '@/types/wbs';

/**
 * 依赖关系类型
 */
export type DependencyType =
  | 'finish_to_start'  // FS: 前置任务结束后，后续任务才能开始
  | 'start_to_start'   // SS: 前置任务开始后，后续任务才能开始
  | 'finish_to_finish' // FF: 前置任务结束后，后续任务才能结束
  | 'start_to_finish'; // SF: 前置任务开始后，后续任务才能结束

/**
 * 依赖关系信息
 */
export interface TaskDependency {
  fromTaskId: string;
  toTaskId: string;
  type: DependencyType;
  lag?: number;
}

/**
 * 验证结果
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * 计算结果
 */
export interface CalculationResult {
  earliestStartDate: string;
  earliestEndDate: string;
  latestStartDate?: string;
  latestEndDate?: string;
  float?: number;
}

/**
 * 任务依赖关系服务
 */
export class TaskDependencyService {
  /**
   * 检测循环依赖
   * 使用深度优先搜索（DFS）检测图中是否存在环
   *
   * @param taskId - 要添加依赖的任务ID
   * @param predecessorId - 前置任务ID
   * @param tasks - 所有任务列表
   * @returns 是否存在循环依赖
   */
  static detectCircularDependency(
    taskId: string,
    predecessorId: string,
    tasks: WbsTask[]
  ): boolean {
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const visited = new Set<string>();
    const recStack = new Set<string>();

    // 构建邻接表
    const graph = new Map<string, string[]>();
    tasks.forEach(task => {
      const deps = task.predecessors?.map(p => p.taskId) || [];
      if (task.predecessor) {
        deps.push(task.predecessor); // 向后兼容
      }
      graph.set(task.id, deps);
    });

    // 添加新的依赖关系（临时）
    const currentDeps = graph.get(taskId) || [];
    graph.set(taskId, [...currentDeps, predecessorId]);

    const dfs = (node: string): boolean => {
      visited.add(node);
      recStack.add(node);

      const neighbors = graph.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) {
            return true;
          }
        } else if (recStack.has(neighbor)) {
          return true; // 发现环
        }
      }

      recStack.delete(node);
      return false;
    };

    // 从每个节点开始DFS
    for (const task of tasks) {
      if (!visited.has(task.id)) {
        if (dfs(task.id)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * 计算任务的最早开始日期（考虑所有前置任务）
   *
   * @param task - 目标任务
   * @param tasks - 所有任务列表
   * @param holidays - 节假日列表
   * @returns 计算结果
   */
  static calculateEarliestStartDate(
    task: WbsTask,
    tasks: WbsTask[],
    holidays: string[] = []
  ): CalculationResult {
    const taskMap = new Map(tasks.map(t => [t.id, t]));

    // 获取所有前置任务
    const predecessors: Array<{ task: WbsTask; type: DependencyType; lag?: number }> = [];

    // 从新格式的 predecessors 字段获取
    if (task.predecessors && task.predecessors.length > 0) {
      task.predecessors.forEach(pred => {
        const predTask = taskMap.get(pred.taskId);
        if (predTask) {
          predecessors.push({
            task: predTask,
            type: pred.type,
            lag: pred.lag,
          });
        }
      });
    }

    // 向后兼容：从 predecessor 字段获取
    if (task.predecessor) {
      const predTask = taskMap.get(task.predecessor);
      if (predTask && !predecessors.some(p => p.task.id === task.predecessor)) {
        predecessors.push({
          task: predTask,
          type: 'finish_to_start',
          lag: task.leadLag,
        });
      }
    }

    if (predecessors.length === 0) {
      // 没有前置任务，使用任务的计划开始日期
      const startDate = parseISO(task.plannedStartDate);
      const endDate = parseISO(task.plannedEndDate);

      return {
        earliestStartDate: task.plannedStartDate,
        earliestEndDate: task.plannedEndDate,
      };
    }

    // 计算每个前置任务约束的最早开始日期，取最大值
    let maxDate = parseISO('1900-01-01');

    predecessors.forEach(({ task: predTask, type, lag }) => {
      const predStartDate = parseISO(predTask.plannedStartDate);
      const predEndDate = parseISO(predTask.plannedEndDate);

      let constrainedDate: Date;

      switch (type) {
        case 'finish_to_start':
          // 前置任务结束后 + 延迟
          constrainedDate = addDays(predEndDate, lag || 0);
          break;
        case 'start_to_start':
          // 前置任务开始后 + 延迟
          constrainedDate = addDays(predStartDate, lag || 0);
          break;
        case 'finish_to_finish':
          // 前置任务结束后 - 工期 + 延迟
          const duration = differenceInDays(
            parseISO(task.plannedEndDate),
            parseISO(task.plannedStartDate)
          );
          constrainedDate = addDays(predEndDate, -duration + (lag || 0));
          break;
        case 'start_to_finish':
          // 前置任务开始后 - 工期 + 延迟
          const duration2 = differenceInDays(
            parseISO(task.plannedEndDate),
            parseISO(task.plannedStartDate)
          );
          constrainedDate = addDays(predStartDate, -duration2 + (lag || 0));
          break;
        default:
          constrainedDate = predEndDate;
      }

      if (isBefore(maxDate, constrainedDate) || isEqual(maxDate, constrainedDate)) {
        if (differenceInDays(constrainedDate, maxDate) > 0) {
          maxDate = constrainedDate;
        }
      }
    });

    // 计算结束日期
    const duration = differenceInDays(
      parseISO(task.plannedEndDate),
      parseISO(task.plannedStartDate)
    );
    const endDate = addDays(maxDate, duration);

    return {
      earliestStartDate: maxDate.toISOString().split('T')[0],
      earliestEndDate: endDate.toISOString().split('T')[0],
    };
  }

  /**
   * 验证依赖关系是否合法
   *
   * @param fromTask - 前置任务
   * @param toTask - 后续任务
   * @param type - 依赖类型
   * @param tasks - 所有任务列表
   * @returns 验证结果
   */
  static validateDependency(
    fromTask: WbsTask,
    toTask: WbsTask,
    type: DependencyType,
    tasks: WbsTask[]
  ): ValidationResult {
    // 不能依赖自己
    if (fromTask.id === toTask.id) {
      return {
        valid: false,
        error: '任务不能依赖自己',
      };
    }

    // 检测循环依赖
    if (this.detectCircularDependency(toTask.id, fromTask.id, tasks)) {
      return {
        valid: false,
        error: '添加此依赖关系将导致循环依赖',
      };
    }

    // 验证日期逻辑
    const fromStartDate = parseISO(fromTask.plannedStartDate);
    const fromEndDate = parseISO(fromTask.plannedEndDate);
    const toStartDate = parseISO(toTask.plannedStartDate);
    const toEndDate = parseISO(toTask.plannedEndDate);

    switch (type) {
      case 'finish_to_start':
        // FS: 前置结束应该早于或等于后续开始
        if (isBefore(toStartDate, fromEndDate)) {
          return {
            valid: false,
            error: '后续任务开始日期早于前置任务结束日期',
          };
        }
        break;

      case 'start_to_start':
        // SS: 前置开始应该早于或等于后续开始
        if (isBefore(toStartDate, fromStartDate)) {
          return {
            valid: false,
            error: '后续任务开始日期早于前置任务开始日期',
          };
        }
        break;

      case 'finish_to_finish':
        // FF: 前置结束应该早于或等于后续结束
        if (isBefore(toEndDate, fromEndDate)) {
          return {
            valid: false,
            error: '后续任务结束日期早于前置任务结束日期',
          };
        }
        break;

      case 'start_to_finish':
        // SF: 前置开始应该早于或等于后续结束
        if (isBefore(toEndDate, fromStartDate)) {
          return {
            valid: false,
            error: '后续任务结束日期早于前置任务开始日期',
          };
        }
        break;
    }

    return { valid: true };
  }

  /**
   * 构建任务依赖图
   *
   * @param tasks - 所有任务列表
   * @returns 依赖关系列表
   */
  static buildDependencyGraph(tasks: WbsTask[]): TaskDependency[] {
    const dependencies: TaskDependency[] = [];

    tasks.forEach(task => {
      // 从新格式的 predecessors 字段获取
      if (task.predecessors && task.predecessors.length > 0) {
        task.predecessors.forEach(pred => {
          dependencies.push({
            fromTaskId: pred.taskId,
            toTaskId: task.id,
            type: pred.type,
            lag: pred.lag,
          });
        });
      }

      // 向后兼容：从 predecessor 字段获取
      if (task.predecessor) {
        // 检查是否已经添加过（避免重复）
        const alreadyAdded = dependencies.some(
          d => d.fromTaskId === task.predecessor && d.toTaskId === task.id
        );
        if (!alreadyAdded) {
          dependencies.push({
            fromTaskId: task.predecessor,
            toTaskId: task.id,
            type: 'finish_to_start',
            lag: task.leadLag,
          });
        }
      }
    });

    return dependencies;
  }

  /**
   * 拓扑排序任务（按照依赖关系排序）
   *
   * @param tasks - 所有任务列表
   * @returns 排序后的任务ID列表（如果存在循环依赖，返回空数组）
   */
  static topologicalSort(tasks: WbsTask[]): string[] {
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const inDegree = new Map<string, number>();
    const graph = new Map<string, string[]>();

    // 初始化
    tasks.forEach(task => {
      inDegree.set(task.id, 0);
      graph.set(task.id, []);
    });

    // 构建图和计算入度
    tasks.forEach(task => {
      // 从新格式的 predecessors 字段获取
      if (task.predecessors && task.predecessors.length > 0) {
        task.predecessors.forEach(pred => {
          const preds = graph.get(pred.taskId) || [];
          preds.push(task.id);
          graph.set(pred.taskId, preds);
          inDegree.set(task.id, (inDegree.get(task.id) || 0) + 1);
        });
      }

      // 向后兼容：从 predecessor 字段获取
      if (task.predecessor) {
        const preds = graph.get(task.predecessor) || [];
        if (!preds.includes(task.id)) {
          preds.push(task.id);
          graph.set(task.predecessor, preds);
          inDegree.set(task.id, (inDegree.get(task.id) || 0) + 1);
        }
      }
    });

    // Kahn算法
    const queue: string[] = [];
    const result: string[] = [];

    // 找到所有入度为0的节点
    inDegree.forEach((degree, taskId) => {
      if (degree === 0) {
        queue.push(taskId);
      }
    });

    while (queue.length > 0) {
      const taskId = queue.shift()!;
      result.push(taskId);

      const neighbors = graph.get(taskId) || [];
      neighbors.forEach(neighbor => {
        const newDegree = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) {
          queue.push(neighbor);
        }
      });
    }

    // 如果结果数量不等于任务数量，说明存在环
    if (result.length !== tasks.length) {
      return [];
    }

    return result;
  }

  /**
   * 计算任务的最晚开始和结束日期
   *
   * @param task - 目标任务
   * @param tasks - 所有任务列表
   * @param projectEndDate - 项目结束日期
   * @param holidays - 节假日列表
   * @returns 计算结果
   */
  static calculateLatestDates(
    task: WbsTask,
    tasks: WbsTask[],
    projectEndDate: string,
    holidays: string[] = []
  ): CalculationResult {
    const taskMap = new Map(tasks.map(t => [t.id, t]));

    // 获取所有以此任务为前置的后续任务
    const successors: Array<{ task: WbsTask; type: DependencyType; lag?: number }> = [];

    tasks.forEach(t => {
      // 从新格式的 predecessors 字段获取
      if (t.predecessors && t.predecessors.length > 0) {
        t.predecessors.forEach(pred => {
          if (pred.taskId === task.id) {
            successors.push({
              task: t,
              type: pred.type,
              lag: pred.lag,
            });
          }
        });
      }

      // 向后兼容：从 predecessor 字段获取
      if (t.predecessor === task.id) {
        if (!successors.some(s => s.task.id === t.id)) {
          successors.push({
            task: t,
            type: 'finish_to_start',
            lag: t.leadLag,
          });
        }
      }
    });

    if (successors.length === 0) {
      // 没有后续任务，使用项目结束日期
      const endDate = parseISO(projectEndDate);
      const duration = differenceInDays(
        parseISO(task.plannedEndDate),
        parseISO(task.plannedStartDate)
      );
      const startDate = addDays(endDate, -duration);

      return {
        latestStartDate: startDate.toISOString().split('T')[0],
        latestEndDate: projectEndDate,
      };
    }

    // 计算每个后续任务约束的最晚结束日期，取最小值
    let minDate = parseISO('2099-12-31');

    successors.forEach(({ task: succTask, type, lag }) => {
      // 递归获取后续任务的最晚日期
      const succResult = this.calculateLatestDates(
        succTask,
        tasks,
        projectEndDate,
        holidays
      );

      const succLatestStart = parseISO(succResult.latestStartDate || succTask.plannedStartDate);
      const succLatestEnd = parseISO(succResult.latestEndDate || succTask.plannedEndDate);

      let constrainedDate: Date;

      switch (type) {
        case 'finish_to_start':
          // 后续任务开始前 - 延迟
          constrainedDate = addDays(succLatestStart, -(lag || 0));
          break;
        case 'start_to_start':
          // 后续任务开始前
          constrainedDate = succLatestStart;
          break;
        case 'finish_to_finish':
          // 后续任务结束前
          constrainedDate = succLatestEnd;
          break;
        case 'start_to_finish':
          // 后续任务开始前 + 工期 - 延迟
          const duration = differenceInDays(
            parseISO(task.plannedEndDate),
            parseISO(task.plannedStartDate)
          );
          constrainedDate = addDays(succLatestStart, duration - (lag || 0));
          break;
        default:
          constrainedDate = succLatestEnd;
      }

      if (isBefore(constrainedDate, minDate)) {
        minDate = constrainedDate;
      }
    });

    // 计算最晚开始日期
    const duration = differenceInDays(
      parseISO(task.plannedEndDate),
      parseISO(task.plannedStartDate)
    );
    const startDate = addDays(minDate, -duration);

    // 计算浮动时间
    const earliestStart = parseISO(task.plannedStartDate);
    const float = differenceInDays(startDate, earliestStart);

    return {
      latestStartDate: startDate.toISOString().split('T')[0],
      latestEndDate: minDate.toISOString().split('T')[0],
      float,
    };
  }
}
