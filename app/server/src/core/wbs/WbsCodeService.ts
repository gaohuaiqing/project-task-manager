/**
 * WBS 编码计算服务
 *
 * 核心功能：
 * 1. 根据任务树结构实时计算 WBS 编码
 * 2. 支持用户权限过滤后的编码计算
 * 3. 计算前置任务编码
 */

import type { WBSTask } from '../../modules/task/types';

/** 编码计算结果 */
export interface WbsCodeResult {
  /** 任务 ID -> 编码映射 */
  codeMap: Map<string, string>;
  /** 编码 -> 任务 ID 映射（用于查找） */
  idMap: Map<string, string>;
}

/** 任务节点（用于计算） */
interface TaskNode {
  id: string;
  parent_id: string | null;
  wbs_level: number;
  sort_order: number | null;
  created_at: Date | string;
}

/** 最大层级 */
const MAX_WBS_LEVEL = 5;

export class WbsCodeService {
  /**
   * 计算任务列表的 WBS 编码
   * @param tasks 任务列表（已按权限过滤）
   * @returns 编码计算结果
   */
  calculateCodes(tasks: TaskNode[]): WbsCodeResult {
    const codeMap = new Map<string, string>();
    const idMap = new Map<string, string>();

    if (tasks.length === 0) {
      return { codeMap, idMap };
    }

    // 构建父子关系映射
    const childrenMap = new Map<string | null, TaskNode[]>();
    tasks.forEach(task => {
      const parentId = task.parent_id || null;
      if (!childrenMap.has(parentId)) {
        childrenMap.set(parentId, []);
      }
      childrenMap.get(parentId)!.push(task);
    });

    // 每层排序：sort_order 优先，无则按 created_at
    childrenMap.forEach(children => {
      children.sort((a, b) => {
        // 都有 sort_order，按 sort_order 排序
        if (a.sort_order !== null && b.sort_order !== null) {
          return a.sort_order - b.sort_order;
        }
        // 只有 a 有 sort_order，a 排前面
        if (a.sort_order !== null) return -1;
        // 只有 b 有 sort_order，b 排前面
        if (b.sort_order !== null) return 1;
        // 都没有 sort_order，按创建时间排序（空值按原始顺序）
        const aTime = a.created_at
          ? (typeof a.created_at === 'string' ? new Date(a.created_at).getTime() : a.created_at.getTime())
          : 0;
        const bTime = b.created_at
          ? (typeof b.created_at === 'string' ? new Date(b.created_at).getTime() : b.created_at.getTime())
          : 0;
        return aTime - bTime;
      });
    });

    // 递归分配编码
    const assignCode = (parentId: string | null, prefix: string): void => {
      const children = childrenMap.get(parentId) || [];
      children.forEach((child, index) => {
        const code = prefix ? `${prefix}.${index + 1}` : `${index + 1}`;
        codeMap.set(child.id, code);
        idMap.set(code, child.id);
        assignCode(child.id, code);
      });
    };

    assignCode(null, '');
    return { codeMap, idMap };
  }

  /**
   * 为任务列表附加 WBS 编码
   * @param tasks 任务列表
   * @returns 带编码的任务列表
   */
  attachCodes<T extends TaskNode>(tasks: T[]): (T & { wbs_code: string })[] {
    const { codeMap } = this.calculateCodes(tasks);
    return tasks.map(task => ({
      ...task,
      wbs_code: codeMap.get(task.id) || '',
    }));
  }

  /**
   * 计算单个任务的编码
   * @param tasks 同项目所有任务
   * @param taskId 目标任务 ID
   * @returns WBS 编码
   */
  getTaskCode(tasks: TaskNode[], taskId: string): string {
    const { codeMap } = this.calculateCodes(tasks);
    return codeMap.get(taskId) || '';
  }

  /**
   * 验证层级是否有效
   * @param level 目标层级
   * @param parentLevel 父任务层级
   * @returns 是否有效
   */
  validateLevel(level: number, parentLevel: number | null): { valid: boolean; error?: string } {
    if (level < 1 || level > MAX_WBS_LEVEL) {
      return { valid: false, error: `层级必须在 1-${MAX_WBS_LEVEL} 之间` };
    }
    if (parentLevel !== null && level !== parentLevel + 1) {
      return { valid: false, error: `子任务层级应为父任务层级 + 1` };
    }
    return { valid: true };
  }

  /**
   * 检查移动后是否会超过最大层级
   * @param taskLevel 被移动任务的层级
   * @param maxDescendantLevel 最深子任务的相对层级
   * @param newParentLevel 新父任务的层级
   * @returns 是否会超限
   */
  willExceedMaxLevel(
    taskLevel: number,
    maxDescendantLevel: number,
    newParentLevel: number
  ): boolean {
    // 新层级 = 新父任务层级 + 1
    const newLevel = newParentLevel + 1;
    // 最深子任务的新层级 = 新层级 + (最深子任务相对层级 - 当前任务层级)
    const deepestNewLevel = newLevel + (maxDescendantLevel - taskLevel);
    return deepestNewLevel > MAX_WBS_LEVEL;
  }

  /**
   * 计算移动后的新层级
   * @param currentLevel 当前层级
   * @param newParentLevel 新父任务层级
   * @returns 新层级
   */
  calculateNewLevel(currentLevel: number, newParentLevel: number): number {
    return newParentLevel + 1;
  }
}

// 单例导出
export const wbsCodeService = new WbsCodeService();
