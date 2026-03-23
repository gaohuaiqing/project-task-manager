/**
 * 工作日计算工具
 * 支持跳过周末和节假日
 */

import { getPool } from '../db';
import type { RowDataPacket } from 'mysql2/promise';

interface HolidayRow extends RowDataPacket {
  holiday_date: Date;
  is_working_day: boolean;
}

/**
 * 获取节假日缓存（进程级缓存）
 */
let holidayCache: {
  data: Map<string, boolean>; // date string -> is_working_day
  expiresAt: number;
} | null = null;

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24小时

/**
 * 加载节假日数据
 */
async function loadHolidays(): Promise<Map<string, boolean>> {
  // 检查缓存
  if (holidayCache && holidayCache.expiresAt > Date.now()) {
    return holidayCache.data;
  }

  const pool = getPool();
  let data = new Map<string, boolean>();

  try {
    const [rows] = await pool.execute<HolidayRow[]>(
      'SELECT holiday_date, is_working_day FROM holidays WHERE holiday_date >= CURDATE() - INTERVAL 1 YEAR'
    );

    rows.forEach((row) => {
      const dateStr = formatDate(row.holiday_date);
      data.set(dateStr, row.is_working_day);
    });
  } catch (error) {
    // 表不存在时，使用空的节假日数据（仅按周末判断）
    console.warn('holidays表不存在或结构不正确，将仅使用周末判断工作日');
    data = new Map<string, boolean>();
  }

  holidayCache = {
    data,
    expiresAt: Date.now() + CACHE_TTL,
  };

  return data;
}

/**
 * 清除节假日缓存（用于测试或手动刷新）
 */
export function clearHolidayCache(): void {
  holidayCache = null;
}

/**
 * 格式化日期为 YYYY-MM-DD 字符串
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 判断是否为周末（周六或周日）
 */
function isWeekend(date: Date, isSixDayWeek: boolean): boolean {
  const dayOfWeek = date.getDay();
  // 0 = 周日, 6 = 周六
  if (isSixDayWeek) {
    return dayOfWeek === 0; // 六天工作制，只休息周日
  }
  return dayOfWeek === 0 || dayOfWeek === 6; // 五天工作制，休息周六周日
}

/**
 * 判断指定日期是否为工作日
 * @param date 日期
 * @param isSixDayWeek 是否六天工作制
 * @param holidays 节假日数据（可选）
 * @returns 是否为工作日
 */
export async function isWorkingDay(
  date: Date,
  isSixDayWeek: boolean = false,
  holidays?: Map<string, boolean>
): Promise<boolean> {
  const holidayMap = holidays || (await loadHolidays());
  const dateStr = formatDate(date);

  // 检查节假日配置
  if (holidayMap.has(dateStr)) {
    return holidayMap.get(dateStr)!;
  }

  // 检查周末
  return !isWeekend(date, isSixDayWeek);
}

/**
 * 添加工作日
 * @param startDate 开始日期
 * @param days 要添加的工作日数（可以为负数表示向前）
 * @param isSixDayWeek 是否六天工作制
 * @returns 计算后的日期
 */
export async function addWorkingDays(
  startDate: Date,
  days: number,
  isSixDayWeek: boolean = false
): Promise<Date> {
  const holidays = await loadHolidays();
  const result = new Date(startDate);
  result.setHours(0, 0, 0, 0);

  if (days === 0) return result;

  const direction = days > 0 ? 1 : -1;
  let remainingDays = Math.abs(days);

  while (remainingDays > 0) {
    result.setDate(result.getDate() + direction);

    const isWorkDay = await isWorkingDay(result, isSixDayWeek, holidays);
    if (isWorkDay) {
      remainingDays--;
    }
  }

  return result;
}

/**
 * 计算两个日期之间的工作日数
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @param isSixDayWeek 是否六天工作制
 * @returns 工作日数
 */
export async function getWorkingDaysBetween(
  startDate: Date,
  endDate: Date,
  isSixDayWeek: boolean = false
): Promise<number> {
  const holidays = await loadHolidays();
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  if (start.getTime() > end.getTime()) {
    return 0;
  }

  let count = 0;
  const current = new Date(start);

  while (current.getTime() <= end.getTime()) {
    const isWorkDay = await isWorkingDay(current, isSixDayWeek, holidays);
    if (isWorkDay) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * 计算任务结束日期
 * 公式：结束日期 = 开始日期 + 工期 - 1
 * @param startDate 开始日期
 * @param duration 工期（工作日数）
 * @param isSixDayWeek 是否六天工作制
 * @returns 结束日期
 */
export async function calculateEndDate(
  startDate: Date | string,
  duration: number,
  isSixDayWeek: boolean = false
): Promise<Date> {
  const start = typeof startDate === 'string' ? new Date(startDate) : new Date(startDate);
  start.setHours(0, 0, 0, 0);

  if (duration <= 0) {
    return start;
  }

  // 工期从1开始计算，所以需要减1天
  // 例如：开始日期1月1日，工期1天，结束日期应该是1月1日
  return addWorkingDays(start, duration - 1, isSixDayWeek);
}

/**
 * 计算任务开始日期（基于前置任务）
 * 公式：开始日期 = 前置任务结束日期 + 提前/落后天数 + 1
 * @param predecessorEndDate 前置任务结束日期
 * @param lagDays 提前/落后天数（正数为落后，负数为提前）
 * @param isSixDayWeek 是否六天工作制
 * @returns 开始日期
 */
export async function calculateStartDateFromPredecessor(
  predecessorEndDate: Date | string,
  lagDays: number = 0,
  isSixDayWeek: boolean = false
): Promise<Date> {
  const predEnd = typeof predecessorEndDate === 'string'
    ? new Date(predecessorEndDate)
    : new Date(predecessorEndDate);
  predEnd.setHours(0, 0, 0, 0);

  // 从前置任务结束日期的下一天开始
  const nextDay = new Date(predEnd);
  nextDay.setDate(nextDay.getDate() + 1);

  // 加上提前/落后天数
  return addWorkingDays(nextDay, lagDays, isSixDayWeek);
}

/**
 * 批量计算任务的日期（考虑依赖关系）
 * @param tasks 任务列表
 * @returns 更新后的任务列表
 */
export async function recalculateTaskDates(
  tasks: Array<{
    id: string;
    start_date: Date | string | null;
    duration: number | null;
    predecessor_id: string | null;
    lag_days: number | null;
    is_six_day_week: boolean;
  }>
): Promise<Map<string, { start_date: Date; end_date: Date }>> {
  const results = new Map<string, { start_date: Date; end_date: Date }>();
  const holidays = await loadHolidays();

  // 构建任务映射
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  // 递归计算任务日期
  const calculateTask = async (
    taskId: string,
    visited: Set<string> = new Set()
  ): Promise<{ start_date: Date; end_date: Date } | null> => {
    // 防止循环依赖
    if (visited.has(taskId)) {
      return null;
    }
    visited.add(taskId);

    const task = taskMap.get(taskId);
    if (!task) return null;

    // 如果已经计算过，直接返回
    if (results.has(taskId)) {
      return results.get(taskId)!;
    }

    let startDate: Date;

    if (task.predecessor_id) {
      // 有前置任务
      const predecessorResult = await calculateTask(task.predecessor_id, visited);
      if (predecessorResult) {
        startDate = await calculateStartDateFromPredecessor(
          predecessorResult.end_date,
          task.lag_days || 0,
          task.is_six_day_week
        );
      } else {
        // 前置任务不存在或循环依赖，使用原始开始日期
        startDate = task.start_date ? new Date(task.start_date) : new Date();
      }
    } else {
      // 没有前置任务
      startDate = task.start_date ? new Date(task.start_date) : new Date();
    }

    startDate.setHours(0, 0, 0, 0);

    // 计算结束日期
    const duration = task.duration || 1;
    const endDate = await calculateEndDate(startDate, duration, task.is_six_day_week);

    const result = { start_date: startDate, end_date: endDate };
    results.set(taskId, result);
    return result;
  };

  // 计算所有任务
  for (const task of tasks) {
    await calculateTask(task.id);
  }

  return results;
}

/**
 * 获取下一个工作日
 */
export async function getNextWorkingDay(date: Date, isSixDayWeek: boolean = false): Promise<Date> {
  return addWorkingDays(date, 1, isSixDayWeek);
}

/**
 * 获取上一个工作日
 */
export async function getPreviousWorkingDay(date: Date, isSixDayWeek: boolean = false): Promise<Date> {
  return addWorkingDays(date, -1, isSixDayWeek);
}

// ========== 依赖类型日期计算 ==========

/**
 * 依赖类型定义
 * - FS (Finish-to-Start): 前置任务完成后，后续任务才能开始
 * - SS (Start-to-Start): 前置任务开始后，后续任务才能开始
 * - FF (Finish-to-Finish): 前置任务完成后，后续任务才能完成
 * - SF (Start-to-Finish): 前置任务开始后，后续任务才能完成
 */
export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF';

/**
 * 根据依赖类型计算任务开始日期
 *
 * @param predecessorStartDate 前置任务开始日期
 * @param predecessorEndDate 前置任务结束日期
 * @param dependencyType 依赖类型
 * @param lagDays 滞后天数（正数为延后，负数为提前）
 * @param duration 后续任务工期（用于FF/SF类型反推开始日期）
 * @param isSixDayWeek 是否六天工作制
 * @returns 后续任务的开始日期
 */
export async function calculateStartDateForDependency(
  predecessorStartDate: Date | string,
  predecessorEndDate: Date | string,
  dependencyType: DependencyType,
  lagDays: number = 0,
  duration: number = 1,
  isSixDayWeek: boolean = false
): Promise<Date> {
  const predStart = typeof predecessorStartDate === 'string'
    ? new Date(predecessorStartDate)
    : new Date(predecessorStartDate);
  const predEnd = typeof predecessorEndDate === 'string'
    ? new Date(predecessorEndDate)
    : new Date(predecessorEndDate);
  predStart.setHours(0, 0, 0, 0);
  predEnd.setHours(0, 0, 0, 0);

  const holidays = await loadHolidays();

  switch (dependencyType) {
    case 'FS': {
      // FS (Finish-to-Start): 开始 = 前置结束 + 1 + lag
      const nextDay = new Date(predEnd);
      nextDay.setDate(nextDay.getDate() + 1);
      return addWorkingDays(nextDay, lagDays, isSixDayWeek);
    }

    case 'SS': {
      // SS (Start-to-Start): 开始 = 前置开始 + lag
      return addWorkingDays(predStart, lagDays, isSixDayWeek);
    }

    case 'FF': {
      // FF (Finish-to-Finish): 结束 = 前置结束 + lag → 反推开始
      const endDate = await addWorkingDays(predEnd, lagDays, isSixDayWeek);
      // 反推开始日期：开始 = 结束 - (工期 - 1)
      return addWorkingDays(endDate, -(duration - 1), isSixDayWeek);
    }

    case 'SF': {
      // SF (Start-to-Finish): 结束 = 前置开始 + lag → 反推开始
      const endDate = await addWorkingDays(predStart, lagDays, isSixDayWeek);
      // 反推开始日期：开始 = 结束 - (工期 - 1)
      return addWorkingDays(endDate, -(duration - 1), isSixDayWeek);
    }

    default:
      // 默认使用FS
      const nextDay = new Date(predEnd);
      nextDay.setDate(nextDay.getDate() + 1);
      return addWorkingDays(nextDay, lagDays, isSixDayWeek);
  }
}

/**
 * 根据依赖类型计算任务结束日期
 *
 * @param predecessorStartDate 前置任务开始日期
 * @param predecessorEndDate 前置任务结束日期
 * @param dependencyType 依赖类型
 * @param lagDays 滞后天数
 * @param isSixDayWeek 是否六天工作制
 * @returns 后续任务的结束日期
 */
export async function calculateEndDateForDependency(
  predecessorStartDate: Date | string,
  predecessorEndDate: Date | string,
  dependencyType: DependencyType,
  lagDays: number = 0,
  isSixDayWeek: boolean = false
): Promise<Date> {
  const predStart = typeof predecessorStartDate === 'string'
    ? new Date(predecessorStartDate)
    : new Date(predecessorStartDate);
  const predEnd = typeof predecessorEndDate === 'string'
    ? new Date(predecessorEndDate)
    : new Date(predecessorEndDate);
  predStart.setHours(0, 0, 0, 0);
  predEnd.setHours(0, 0, 0, 0);

  switch (dependencyType) {
    case 'FS':
    case 'SS': {
      // FS/SS: 结束日期由开始日期和工期决定，这里返回前置任务的影响点
      // FS: 返回前置结束日期
      // SS: 返回前置开始日期
      const baseDate = dependencyType === 'FS' ? predEnd : predStart;
      return addWorkingDays(baseDate, lagDays, isSixDayWeek);
    }

    case 'FF': {
      // FF (Finish-to-Finish): 结束 = 前置结束 + lag
      return addWorkingDays(predEnd, lagDays, isSixDayWeek);
    }

    case 'SF': {
      // SF (Start-to-Finish): 结束 = 前置开始 + lag
      return addWorkingDays(predStart, lagDays, isSixDayWeek);
    }

    default:
      return addWorkingDays(predEnd, lagDays, isSixDayWeek);
  }
}

// ========== 循环依赖检测 ==========

/**
 * 循环依赖检测结果
 */
export interface CycleDetectionResult {
  /** 是否存在循环 */
  hasCycle: boolean;
  /** 循环路径（如果存在循环） */
  cyclePath?: string[];
  /** 错误消息 */
  message?: string;
}

/**
 * 检测循环依赖
 * 通过DFS遍历前置任务链，检测是否存在循环引用
 *
 * @param taskId 当前任务ID
 * @param predecessorId 要设置的前置任务ID
 * @param getAllTasks 获取所有任务的函数（用于依赖注入）
 * @returns 检测结果
 */
export async function detectCycleDependency(
  taskId: string,
  predecessorId: string,
  getAllTasks: () => Promise<Array<{ id: string; predecessor_id: string | null }>>
): Promise<CycleDetectionResult> {
  // 获取所有任务
  const allTasks = await getAllTasks();

  // 构建任务映射
  const taskMap = new Map<string, { id: string; predecessor_id: string | null }>();
  allTasks.forEach(t => taskMap.set(t.id, t));

  // 检查前置任务是否存在
  if (!taskMap.has(predecessorId)) {
    return {
      hasCycle: false,
      message: undefined,
    };
  }

  // 从前置任务开始，沿着前置链向上追溯
  // 如果能追溯到当前任务，说明存在循环
  const visited: string[] = [];
  let currentId: string | null = predecessorId;

  while (currentId) {
    // 如果追回到当前任务，存在循环
    if (currentId === taskId) {
      return {
        hasCycle: true,
        cyclePath: [...visited, taskId],
        message: `检测到循环依赖：任务链 ${[...visited, taskId].join(' -> ')} 形成闭环`,
      };
    }

    // 如果已经访问过，说明存在其他循环（但不是当前任务引起的）
    if (visited.includes(currentId)) {
      // 这不是我们要检测的循环，跳出
      break;
    }

    visited.push(currentId);

    // 获取当前任务的前置任务
    const currentTask = taskMap.get(currentId);
    currentId = currentTask?.predecessor_id || null;
  }

  // 从当前任务开始，沿着前置链向下检查
  // 检查设置 predecessorId 后，predecessorId 的前置链是否包含 taskId
  // 这部分已经在上面检查过了

  // 另外需要检查：如果 taskId 的后续任务链中有 predecessorId
  // 这需要构建反向映射（后续任务）
  const successorMap = new Map<string, string[]>();
  allTasks.forEach(t => {
    if (t.predecessor_id) {
      const successors = successorMap.get(t.predecessor_id) || [];
      successors.push(t.id);
      successorMap.set(t.predecessor_id, successors);
    }
  });

  // 从 taskId 开始，沿着后续任务链向下搜索
  // 检查是否能到达 predecessorId
  const visitedSuccessors: string[] = [];
  const queue: string[] = [taskId];

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current === predecessorId) {
      return {
        hasCycle: true,
        cyclePath: [...visitedSuccessors, predecessorId],
        message: `检测到循环依赖：设置此后置任务将导致 ${predecessorId} -> ... -> ${taskId} -> ${predecessorId} 形成闭环`,
      };
    }

    if (visitedSuccessors.includes(current)) {
      continue;
    }

    visitedSuccessors.push(current);

    const successors = successorMap.get(current) || [];
    queue.push(...successors);
  }

  return {
    hasCycle: false,
  };
}
