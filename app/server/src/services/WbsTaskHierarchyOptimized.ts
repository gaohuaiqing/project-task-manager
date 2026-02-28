/**
 * WBS 任务层级工具（优化版）
 * 处理任务层级关系的验证和检测，使用递归 CTE 消除 N+1 查询
 *
 * 优化策略：
 * 1. 使用递归 CTE 单次查询获取完整层级路径
 * 2. 内存缓存层级关系（5分钟TTL）
 * 3. 支持批量预加载
 * 4. 图结构缓存用于快速循环检测
 */

import { databaseService } from './DatabaseService.js';

// ==================== 类型定义 ====================

interface TaskNode {
  id: number;
  parentId: number | null;
  children: Set<number>;
  ancestors: Set<number>;
  depth: number;
}

interface HierarchyGraph {
  nodes: Map<number, TaskNode>;
  lastRefresh: number;
}

// ==================== 缓存配置 ====================

const hierarchyCache = new Map<number, number[]>();
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存
const cacheTimestamps = new Map<number, number>();

// 图结构缓存（用于快速循环检测）
let hierarchyGraph: HierarchyGraph | null = null;
const GRAPH_REFRESH_INTERVAL = 10 * 60 * 1000; // 10分钟刷新一次图结构

// ==================== 图结构管理 ====================

/**
 * 构建完整的层级图结构（内存中）
 */
async function buildHierarchyGraph(forceRefresh = false): Promise<HierarchyGraph> {
  const now = Date.now();

  // 检查是否需要刷新
  if (!forceRefresh && hierarchyGraph && (now - hierarchyGraph.lastRefresh < GRAPH_REFRESH_INTERVAL)) {
    return hierarchyGraph;
  }

  try {
    // 一次性获取所有任务的父子关系
    const [tasks] = await databaseService.query(`
      SELECT id, parent_id
      FROM wbs_tasks
      WHERE deleted_at IS NULL
      ORDER BY id
    `) as Array<{ id: number; parent_id: number | null }>;

    // 构建图结构
    const nodes = new Map<number, TaskNode>();
    const childrenMap = new Map<number, Set<number>>();

    // 初始化所有节点
    for (const task of tasks) {
      nodes.set(task.id, {
        id: task.id,
        parentId: task.parent_id,
        children: new Set(),
        ancestors: new Set(),
        depth: 0
      });

      // 建立子任务映射
      if (task.parent_id !== null) {
        if (!childrenMap.has(task.parent_id)) {
          childrenMap.set(task.parent_id, new Set());
        }
        childrenMap.get(task.parent_id)!.add(task.id);
      }
    }

    // 填充子任务和祖先关系
    for (const [parentId, children] of childrenMap) {
      const node = nodes.get(parentId);
      if (node) {
        node.children = children;
      }
    }

    // 计算每个节点的深度和祖先
    for (const task of tasks) {
      const node = nodes.get(task.id);
      if (!node) continue;

      if (task.parent_id === null) {
        node.depth = 0;
      } else {
        const parentNode = nodes.get(task.parent_id);
        if (parentNode) {
          node.depth = parentNode.depth + 1;
          // 继承父节点的祖先
          node.ancestors = new Set([...parentNode.ancestors, task.parent_id]);
        }
      }
    }

    hierarchyGraph = {
      nodes,
      lastRefresh: now
    };

    console.log(`[WBS] 图结构已构建，包含 ${nodes.size} 个任务节点`);

    return hierarchyGraph;
  } catch (error) {
    console.error('[WBS] 构建图结构失败:', error);
    return { nodes: new Map(), lastRefresh: 0 };
  }
}

/**
 * 基于图结构快速检测循环引用
 */
export function detectCycleInGraph(taskId: number, parentId: number | null): boolean {
  if (!hierarchyGraph || parentId === null || taskId === parentId) {
    return false;
  }

  const taskNode = hierarchyGraph.nodes.get(taskId);
  if (!taskNode) {
    return false;
  }

  // 检查目标任务的祖先是否包含父任务ID
  return taskNode.ancestors.has(parentId);
}

/**
 * 基于图结构快速获取子孙任务
 */
export function getDescendantsInGraph(taskId: number): number[] {
  if (!hierarchyGraph) {
    return [];
  }

  const descendants: number[] = [];
  const queue = [taskId];
  const visited = new Set<number>();

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const node = hierarchyGraph.nodes.get(currentId);
    if (node) {
      for (const childId of node.children) {
        if (childId !== taskId) { // 排除自己
          descendants.push(childId);
          queue.push(childId);
        }
      }
    }
  }

  return descendants;
}

/**
 * 使用递归 CTE 检测任务是否形成循环引用（单次查询）
 * @param taskId 任务ID
 * @param parentId 父任务ID
 * @returns 如果形成循环返回 true，否则返回 false
 */
export async function detectCycle(taskId: number, parentId: number | null): Promise<boolean> {
  if (parentId === null) {
    return false; // 没有父任务，不会形成循环
  }

  if (taskId === parentId) {
    return true; // 任务不能设置自己为父任务
  }

  try {
    // 使用递归 CTE 一次性获取完整的祖先路径
    const [ancestors] = await databaseService.query(`
      WITH RECURSIVE TaskAncestors AS (
        -- 起始节点：父任务
        SELECT id, parent_id, 1 as depth
        FROM wbs_tasks
        WHERE id = ? AND deleted_at IS NULL

        UNION ALL

        -- 递归部分：向上查找父任务
        SELECT t.id, t.parent_id, ta.depth + 1
        FROM wbs_tasks t
        INNER JOIN TaskAncestors ta ON t.id = ta.parent_id
        WHERE t.deleted_at IS NULL
        AND ta.depth < 100  -- 最大深度限制
      )
      SELECT id FROM TaskAncestors WHERE id = ?
    `, [parentId, taskId]) as any[];

    // 如果在祖先路径中找到了目标任务ID，说明存在循环
    return ancestors && ancestors.length > 0;
  } catch (error) {
    console.error('[WBS] 循环检测失败:', error);
    // 出错时保守处理，允许操作
    return false;
  }
}

/**
 * 获取任务的完整层级路径（使用递归 CTE，单次查询）
 * @param taskId 任务ID
 * @returns 层级路径数组
 */
export async function getTaskPath(taskId: number): Promise<Array<{ id: number; task_code: string; task_name: string }>> {
  try {
    const [result] = await databaseService.query(`
      WITH RECURSIVE TaskPath AS (
        -- 起始节点：目标任务
        SELECT id, task_code, task_name, parent_id, 0 as level
        FROM wbs_tasks
        WHERE id = ? AND deleted_at IS NULL

        UNION ALL

        -- 递归部分：向上查找父任务
        SELECT t.id, t.task_code, t.task_name, t.parent_id, tp.level + 1
        FROM wbs_tasks t
        INNER JOIN TaskPath tp ON t.id = tp.parent_id
        WHERE t.deleted_at IS NULL
        AND tp.level < 100
      )
      SELECT id, task_code, task_name
      FROM TaskPath
      ORDER BY level DESC
    `, [taskId]) as any[];

    return result || [];
  } catch (error) {
    console.error('[WBS] 获取任务路径失败:', error);
    return [];
  }
}

/**
 * 获取任务的所有子孙任务ID（使用递归 CTE，单次查询）
 * @param taskId 任务ID
 * @returns 子孙任务ID数组
 */
export async function getDescendantTaskIds(taskId: number): Promise<number[]> {
  try {
    const [result] = await databaseService.query(`
      WITH RECURSIVE TaskDescendants AS (
        -- 起始节点：目标任务
        SELECT id, parent_id
        FROM wbs_tasks
        WHERE id = ? AND deleted_at IS NULL

        UNION ALL

        -- 递归部分：向下查找子任务
        SELECT t.id, t.parent_id
        FROM wbs_tasks t
        INNER JOIN TaskDescendants td ON t.parent_id = td.id
        WHERE t.deleted_at IS NULL
      )
      SELECT id FROM TaskDescendants WHERE id != ?
    `, [taskId, taskId]) as any[];

    return result?.map((r: any) => r.id) || [];
  } catch (error) {
    console.error('[WBS] 获取子孙任务失败:', error);
    return [];
  }
}

/**
 * 计算任务的层级深度（使用递归 CTE，单次查询）
 * @param taskId 任务ID
 * @returns 层级深度（根任务为0）
 */
export async function getTaskDepth(taskId: number): Promise<number> {
  // 检查缓存
  const cachedDepth = hierarchyCache.get(taskId);
  const cacheTime = cacheTimestamps.get(taskId) || 0;

  if (cachedDepth !== undefined && Date.now() - cacheTime < CACHE_TTL) {
    return cachedDepth;
  }

  try {
    const [result] = await databaseService.query(`
      WITH RECURSIVE TaskDepth AS (
        -- 起始节点
        SELECT id, parent_id, 0 as depth
        FROM wbs_tasks
        WHERE id = ? AND deleted_at IS NULL

        UNION ALL

        -- 递归向上
        SELECT t.id, t.parent_id, td.depth + 1
        FROM wbs_tasks t
        INNER JOIN TaskDepth td ON t.id = td.parent_id
        WHERE t.deleted_at IS NULL
        AND td.depth < 100
      )
      SELECT MAX(depth) as depth FROM TaskDepth
    `, [taskId]) as any[];

    const depth = result?.[0]?.depth || 0;

    // 缓存结果
    hierarchyCache.set(taskId, depth);
    cacheTimestamps.set(taskId, Date.now());

    return depth;
  } catch (error) {
    console.error('[WBS] 计算任务深度失败:', error);
    return 0;
  }
}

/**
 * 验证任务层级关系是否有效（优化版）
 * @param taskId 任务ID（新建时为 null）
 * @param parentId 父任务ID
 * @param projectId 项目ID
 * @returns 验证结果
 */
export async function validateTaskHierarchy(
  taskId: number | null,
  parentId: number | null,
  projectId: number
): Promise<{ valid: boolean; reason?: string }> {
  // 1. 检查父任务是否属于同一项目
  if (parentId !== null) {
    const [parentResult] = await databaseService.query(
      'SELECT id, project_id FROM wbs_tasks WHERE id = ? AND deleted_at IS NULL',
      [parentId]
    ) as any[];

    if (!parentResult || parentResult.length === 0) {
      return { valid: false, reason: '父任务不存在' };
    }

    if (parentResult[0].project_id !== projectId) {
      return { valid: false, reason: '父任务不属于同一项目' };
    }
  }

  // 2. 检查循环引用（仅当更新现有任务且有父任务时）
  if (taskId !== null && parentId !== null) {
    const hasCycle = await detectCycle(taskId, parentId);
    if (hasCycle) {
      return { valid: false, reason: '形成循环引用：任务不能成为自己的祖先' };
    }
  }

  return { valid: true };
}

/**
 * 清除层级缓存
 */
export function clearHierarchyCache(taskId?: number): void {
  if (taskId !== undefined) {
    hierarchyCache.delete(taskId);
    cacheTimestamps.delete(taskId);
  } else {
    hierarchyCache.clear();
    cacheTimestamps.clear();
  }
}

/**
 * 批量预加载任务层级关系（减少重复查询）
 * @param taskIds 任务ID数组
 */
export async function preloadTaskHierarchy(taskIds: number[]): Promise<void> {
  if (taskIds.length === 0) return;

  try {
    // 使用单次查询获取所有任务的深度
    const [result] = await databaseService.query(`
      WITH RECURSIVE AllTaskDepths AS (
        -- 起始节点：所有指定任务
        SELECT id, parent_id, id as root_id, 0 as depth
        FROM wbs_tasks
        WHERE id IN (?) AND deleted_at IS NULL

        UNION ALL

        -- 递归向上
        SELECT t.id, t.parent_id, atd.root_id, atd.depth + 1
        FROM wbs_tasks t
        INNER JOIN AllTaskDepths atd ON t.id = atd.parent_id
        WHERE t.deleted_at IS NULL
        AND atd.depth < 100
      )
      SELECT root_id as task_id, MAX(depth) as depth
      FROM AllTaskDepths
      GROUP BY root_id
    `, [taskIds]) as any[];

    // 缓存结果
    for (const row of result) {
      hierarchyCache.set(row.task_id, row.depth);
      cacheTimestamps.set(row.task_id, Date.now());
    }

    console.log(`[WBS] 预加载了 ${result.length} 个任务的层级关系`);
  } catch (error) {
    console.error('[WBS] 批量预加载失败:', error);
  }
}
