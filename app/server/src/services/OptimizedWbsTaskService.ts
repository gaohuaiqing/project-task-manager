/**
 * 优化的WBS任务服务 - 集成缓存和性能优化
 *
 * 优化内容：
 * 1. 双层缓存（Redis + LRU内存）
 * 2. 分页查询
 * 3. 字段选择优化
 * 4. 批量查询
 * 5. 按项目分组缓存
 * 6. 任务树查询优化
 *
 * @author AI Assistant
 * @since 2025-03-04
 */

import { databaseService } from './DatabaseService.js';
import { queryCacheManager } from './QueryCacheManager.js';
import { QueryOptions, PaginatedResult } from '../utils/QueryOptimizer.js';
import { queryWithTimeout, QUERY_TIMEOUT } from '../utils/DatabaseQueryTimeout.js';

// ================================================================
// 类型定义
// ================================================================

export interface WbsTaskQueryOptions extends QueryOptions {
  projectId?: number;        // 项目ID筛选
  status?: string;           // 状态筛选
  taskType?: string;         // 任务类型筛选
  assigneeId?: number;       // 负责人筛选
  parentId?: number | null;  // 父任务ID筛选
  search?: string;           // 搜索关键词
  priorityFrom?: number;     // 优先级范围（最小）
  priorityTo?: number;       // 优先级范围（最大）
  dateFrom?: string;         // 计划开始日期（从）
  dateTo?: string;           // 计划结束日期（到）
}

export interface WbsTaskListResponse {
  data: WbsTaskListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  cached: boolean;
  queryTime: number;
}

export interface WbsTaskListItem {
  id: number;
  projectId: number;
  projectName: string | null;
  parentId: number | null;
  parentTaskName: string | null;
  taskCode: string;
  taskName: string;
  description: string | null;
  taskType: string;
  status: string;
  priority: number;
  progress: number;
  estimatedHours: number | null;
  actualHours: number | null;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  assigneeId: number | null;
  assigneeName: string | null;
  dependencies: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: number;
}

export interface WbsTaskDetail extends WbsTaskListItem {
  children?: WbsTaskListItem[];
  ancestors?: WbsTaskListItem[];
  descendants?: WbsTaskListItem[];
}

export interface WbsTaskTreeNode {
  id: number;
  taskCode: string;
  taskName: string;
  status: string;
  progress: number;
  priority: number;
  assigneeName: string | null;
  children: WbsTaskTreeNode[];
}

// ================================================================
// 优化的WBS任务服务
// ================================================================

class OptimizedWbsTaskService {
  private readonly CACHE_TYPE_LIST = 'wbs_tasks_list';
  private readonly CACHE_TYPE_DETAIL = 'wbs_tasks_detail';
  private readonly CACHE_TYPE_TREE = 'wbs_tasks_tree';

  // ================================================================
  // 任务列表查询（带缓存和分页）
  // ================================================================

  /**
   * 获取任务列表（带缓存和分页）
   */
  async getTaskList(options: WbsTaskQueryOptions = {}): Promise<WbsTaskListResponse> {
    const startTime = Date.now();

    // 1. 生成缓存键
    const cacheKey = queryCacheManager.buildKey({
      type: 'list',
      ...options
    });

    // 2. 尝试从缓存获取
    const cached = await queryCacheManager.get<PaginatedResult<WbsTaskListItem>>(
      this.CACHE_TYPE_LIST,
      cacheKey
    );

    if (cached) {
      return {
        data: cached.data,
        pagination: cached.pagination,
        cached: true,
        queryTime: Date.now() - startTime
      };
    }

    // 3. 查询数据库
    const result = await this.queryTaskList(options);

    // 4. 写入缓存
    await queryCacheManager.set(this.CACHE_TYPE_LIST, cacheKey, result);

    return {
      ...result,
      cached: false,
      queryTime: Date.now() - startTime
    };
  }

  /**
   * 执行任务列表查询
   */
  private async queryTaskList(options: WbsTaskQueryOptions): Promise<{
    data: WbsTaskListItem[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
  }> {
    const {
      page = 1,
      pageSize = 50,
      orderBy = 'created_at',
      order = 'DESC'
    } = options;

    // 构建 WHERE 条件
    const { whereClause, params } = this.buildWhereClause(options);

    // 验证分页参数
    const validPage = Math.max(1, page);
    const validPageSize = Math.min(Math.max(1, pageSize), 500);
    const offset = (validPage - 1) * validPageSize;

    // 使用超时控制执行查询
    return await queryWithTimeout(
      this.executePaginatedQuery(whereClause, params, orderBy, order, validPage, validPageSize, offset),
      QUERY_TIMEOUT.MEDIUM,
      'WBS任务列表查询'
    );
  }

  /**
   * 执行分页查询
   */
  private async executePaginatedQuery(
    whereClause: string,
    params: any[],
    orderBy: string,
    order: string,
    page: number,
    pageSize: number,
    offset: number
  ): Promise<{
    data: WbsTaskListItem[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
  }> {
    // 获取总数
    const countSql = `
      SELECT COUNT(*) as total
      FROM wbs_tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN members m ON t.assignee_id = m.id
      LEFT JOIN wbs_tasks parent ON t.parent_id = parent.id
      ${whereClause}
    `;
    const countResult = await databaseService.query(countSql, params) as { total: number }[];
    const total = countResult[0]?.total || 0;

    // 查询数据
    const sql = `
      SELECT
        t.id,
        t.project_id as projectId,
        p.name as projectName,
        t.parent_id as parentId,
        parent.task_name as parentTaskName,
        t.task_code as taskCode,
        t.task_name as taskName,
        t.description,
        t.task_type as taskType,
        t.status,
        t.priority,
        t.progress,
        t.estimated_hours as estimatedHours,
        t.actual_hours as actualHours,
        t.planned_start_date as plannedStartDate,
        t.planned_end_date as plannedEndDate,
        t.actual_start_date as actualStartDate,
        t.actual_end_date as actualEndDate,
        t.assignee_id as assigneeId,
        m.name as assigneeName,
        t.dependencies,
        t.tags,
        t.created_at as createdAt,
        t.updated_at as updatedAt,
        t.created_by as createdBy
      FROM wbs_tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN members m ON t.assignee_id = m.id
      LEFT JOIN wbs_tasks parent ON t.parent_id = parent.id
      ${whereClause}
      ORDER BY ${this.orderByToSql(orderBy)} ${order}
      LIMIT ${pageSize} OFFSET ${offset}
    `;

    const rawData = await databaseService.query(sql, params) as any[];
    const data = rawData.map(this.parseJsonFields);

    return {
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }

  // ================================================================
  // 任务详情查询（带缓存）
  // ================================================================

  /**
   * 获取任务详情（带缓存）
   */
  async getTaskDetail(id: number): Promise<WbsTaskDetail | null> {
    // 1. 尝试从缓存获取
    const cacheKey = `detail:${id}`;
    const cached = await queryCacheManager.get<WbsTaskDetail>(
      this.CACHE_TYPE_DETAIL,
      cacheKey
    );

    if (cached) {
      return cached;
    }

    // 2. 查询数据库
    const result = await this.queryTaskDetail(id);

    // 3. 写入缓存
    if (result) {
      await queryCacheManager.set(this.CACHE_TYPE_DETAIL, cacheKey, result);
    }

    return result;
  }

  /**
   * 执行任务详情查询
   */
  private async queryTaskDetail(id: number): Promise<WbsTaskDetail | null> {
    const sql = `
      SELECT
        t.id,
        t.project_id as projectId,
        p.name as projectName,
        t.parent_id as parentId,
        parent.task_name as parentTaskName,
        t.task_code as taskCode,
        t.task_name as taskName,
        t.description,
        t.task_type as taskType,
        t.status,
        t.priority,
        t.progress,
        t.estimated_hours as estimatedHours,
        t.actual_hours as actualHours,
        t.planned_start_date as plannedStartDate,
        t.planned_end_date as plannedEndDate,
        t.actual_start_date as actualStartDate,
        t.actual_end_date as actualEndDate,
        t.assignee_id as assigneeId,
        m.name as assigneeName,
        t.dependencies,
        t.tags,
        t.attachments,
        t.created_at as createdAt,
        t.updated_at as updatedAt,
        t.created_by as createdBy
      FROM wbs_tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN members m ON t.assignee_id = m.id
      LEFT JOIN wbs_tasks parent ON t.parent_id = parent.id
      WHERE t.id = ? AND t.deleted_at IS NULL
    `;

    const result = await databaseService.query(sql, [id]) as any[];

    if (result.length === 0) {
      return null;
    }

    return this.parseJsonFields(result[0]);
  }

  // ================================================================
  // 批量查询任务
  // ================================================================

  /**
   * 批量获取任务详情
   */
  async batchGetTasks(ids: number[]): Promise<Map<number, WbsTaskDetail>> {
    if (ids.length === 0) {
      return new Map();
    }

    // 1. 批量查询缓存
    const cachedResults = await this.batchGetFromCache(ids);

    // 2. 找出未命中的ID
    const missedIds = ids.filter(id => !cachedResults.has(id));

    // 3. 批量查询数据库
    if (missedIds.length > 0) {
      const dbResults = await this.batchQueryTasks(missedIds);

      // 4. 写入缓存
      for (const [id, task] of dbResults.entries()) {
        await queryCacheManager.set(
          this.CACHE_TYPE_DETAIL,
          `detail:${id}`,
          task
        );
        cachedResults.set(id, task);
      }
    }

    return cachedResults;
  }

  /**
   * 批量从缓存获取
   */
  private async batchGetFromCache(ids: number[]): Promise<Map<number, WbsTaskDetail>> {
    const results = new Map<number, WbsTaskDetail>();

    for (const id of ids) {
      const cached = await queryCacheManager.get<WbsTaskDetail>(
        this.CACHE_TYPE_DETAIL,
        `detail:${id}`
      );
      if (cached) {
        results.set(id, cached);
      }
    }

    return results;
  }

  /**
   * 批量查询数据库
   */
  private async batchQueryTasks(ids: number[]): Promise<Map<number, WbsTaskDetail>> {
    const placeholders = ids.map(() => '?').join(',');
    const sql = `
      SELECT
        t.id,
        t.project_id as projectId,
        p.name as projectName,
        t.parent_id as parentId,
        parent.task_name as parentTaskName,
        t.task_code as taskCode,
        t.task_name as taskName,
        t.description,
        t.task_type as taskType,
        t.status,
        t.priority,
        t.progress,
        t.estimated_hours as estimatedHours,
        t.actual_hours as actualHours,
        t.planned_start_date as plannedStartDate,
        t.planned_end_date as plannedEndDate,
        t.actual_start_date as actualStartDate,
        t.actual_end_date as actualEndDate,
        t.assignee_id as assigneeId,
        m.name as assigneeName,
        t.dependencies,
        t.tags,
        t.attachments,
        t.created_at as createdAt,
        t.updated_at as updatedAt,
        t.created_by as createdBy
      FROM wbs_tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN members m ON t.assignee_id = m.id
      LEFT JOIN wbs_tasks parent ON t.parent_id = parent.id
      WHERE t.id IN (${placeholders}) AND t.deleted_at IS NULL
    `;

    const results = await databaseService.query(sql, ids) as any[];
    const map = new Map<number, WbsTaskDetail>();

    for (const task of results) {
      map.set(task.id, this.parseJsonFields(task));
    }

    return map;
  }

  // ================================================================
  // 按项目获取任务（常用查询优化）
  // ================================================================

  /**
   * 按项目获取任务列表（带缓存）
   */
  async getTasksByProject(projectId: number): Promise<WbsTaskListItem[]> {
    const cacheKey = `project:${projectId}`;
    const cacheType = 'wbs_tasks_by_project';

    // 1. 尝试从缓存获取
    const cached = await queryCacheManager.get<WbsTaskListItem[]>(cacheType, cacheKey);
    if (cached) {
      return cached;
    }

    // 2. 查询数据库
    const sql = `
      SELECT
        t.id,
        t.project_id as projectId,
        p.name as projectName,
        t.parent_id as parentId,
        parent.task_name as parentTaskName,
        t.task_code as taskCode,
        t.task_name as taskName,
        t.description,
        t.task_type as taskType,
        t.status,
        t.priority,
        t.progress,
        t.estimated_hours as estimatedHours,
        t.actual_hours as actualHours,
        t.planned_start_date as plannedStartDate,
        t.planned_end_date as plannedEndDate,
        t.actual_start_date as actualStartDate,
        t.actual_end_date as actualEndDate,
        t.assignee_id as assigneeId,
        m.name as assigneeName,
        t.dependencies,
        t.tags,
        t.created_at as createdAt,
        t.updated_at as updatedAt,
        t.created_by as createdBy
      FROM wbs_tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN members m ON t.assignee_id = m.id
      LEFT JOIN wbs_tasks parent ON t.parent_id = parent.id
      WHERE t.project_id = ? AND t.deleted_at IS NULL
      ORDER BY t.created_at DESC
    `;

    const result = await databaseService.query(sql, [projectId]) as any[];
    const tasks = result.map(this.parseJsonFields);

    // 3. 写入缓存
    await queryCacheManager.set(cacheType, cacheKey, tasks);

    return tasks;
  }

  // ================================================================
  // 任务树查询
  // ================================================================

  /**
   * 获取项目的任务树（带缓存）
   */
  async getTaskTree(projectId: number): Promise<WbsTaskTreeNode[]> {
    const cacheKey = `tree:${projectId}`;
    const cacheType = this.CACHE_TYPE_TREE;

    // 1. 尝试从缓存获取
    const cached = await queryCacheManager.get<WbsTaskTreeNode[]>(cacheType, cacheKey);
    if (cached) {
      return cached;
    }

    // 2. 查询数据库
    const sql = `
      SELECT
        t.id,
        t.task_code as taskCode,
        t.task_name as taskName,
        t.status,
        t.progress,
        t.priority,
        t.parent_id as parentId,
        m.name as assigneeName
      FROM wbs_tasks t
      LEFT JOIN members m ON t.assignee_id = m.id
      WHERE t.project_id = ? AND t.deleted_at IS NULL
      ORDER BY t.created_at ASC
    `;

    const result = await databaseService.query(sql, [projectId]) as any[];

    // 3. 构建树形结构
    const tree = this.buildTaskTree(result);

    // 4. 写入缓存
    await queryCacheManager.set(cacheType, cacheKey, tree);

    return tree;
  }

  /**
   * 构建任务树
   */
  private buildTaskTree(tasks: any[]): WbsTaskTreeNode[] {
    const taskMap = new Map<number, WbsTaskTreeNode>();
    const rootTasks: WbsTaskTreeNode[] = [];

    // 第一遍：创建所有节点
    for (const task of tasks) {
      taskMap.set(task.id, {
        id: task.id,
        taskCode: task.taskCode,
        taskName: task.taskName,
        status: task.status,
        progress: task.progress,
        priority: task.priority,
        assigneeName: task.assigneeName,
        children: []
      });
    }

    // 第二遍：构建父子关系
    for (const task of tasks) {
      const node = taskMap.get(task.id)!;
      if (task.parentId === null) {
        rootTasks.push(node);
      } else {
        const parent = taskMap.get(task.parentId);
        if (parent) {
          parent.children.push(node);
        }
      }
    }

    return rootTasks;
  }

  // ================================================================
  // 字段优化查询
  // ================================================================

  /**
   * 只查询指定字段（性能优化）
   */
  async getTaskFields(
    ids: number[],
    fields: (keyof WbsTaskListItem)[]
  ): Promise<Map<number, Partial<WbsTaskListItem>>> {
    if (ids.length === 0 || fields.length === 0) {
      return new Map();
    }

    // 使用预设字段或自定义字段
    const fieldList = this.buildFieldList(fields);
    const placeholders = ids.map(() => '?').join(',');

    const sql = `
      SELECT ${fieldList}
      FROM wbs_tasks t
      WHERE t.id IN (${placeholders}) AND t.deleted_at IS NULL
    `;

    const results = await databaseService.query(sql, ids) as any[];
    const map = new Map<number, Partial<WbsTaskListItem>>();

    for (const task of results) {
      if (task.id) {
        map.set(task.id, this.parseJsonFields(task));
      }
    }

    return map;
  }

  // ================================================================
  // 缓存失效
  // ================================================================

  /**
   * 使任务缓存失效
   */
  async invalidateTask(id?: number, projectId?: number): Promise<void> {
    if (id) {
      // 失效特定任务缓存
      await queryCacheManager.delete(this.CACHE_TYPE_DETAIL, `detail:${id}`);
      // 失效列表缓存
      await queryCacheManager.invalidateType(this.CACHE_TYPE_LIST);
    }

    if (projectId) {
      // 失效项目相关缓存
      await queryCacheManager.delete('wbs_tasks_by_project', `project:${projectId}`);
      await queryCacheManager.delete(this.CACHE_TYPE_TREE, `tree:${projectId}`);
    } else if (id) {
      // 如果没有指定projectId，尝试从任务中获取
      const task = await this.queryTaskDetail(id);
      if (task?.projectId) {
        await queryCacheManager.delete('wbs_tasks_by_project', `project:${task.projectId}`);
        await queryCacheManager.delete(this.CACHE_TYPE_TREE, `tree:${task.projectId}`);
      }
    }

    if (!id && !projectId) {
      // 失效所有任务缓存
      await queryCacheManager.invalidateType(this.CACHE_TYPE_DETAIL);
      await queryCacheManager.invalidateType(this.CACHE_TYPE_LIST);
      await queryCacheManager.invalidateType(this.CACHE_TYPE_TREE);
      await queryCacheManager.invalidateType('wbs_tasks_by_project');
    }
  }

  // ================================================================
  // 工具函数
  // ================================================================

  /**
   * 解析JSON字段
   */
  private parseJsonFields(row: any): any {
    return {
      ...row,
      dependencies: row.dependencies ? JSON.parse(row.dependencies) : [],
      tags: row.tags ? JSON.parse(row.tags) : [],
      attachments: row.attachments ? JSON.parse(row.attachments) : []
    };
  }

  /**
   * 构建字段列表
   */
  private buildFieldList(fields: (keyof WbsTaskListItem)[]): string {
    const fieldMap: Record<string, string> = {
      id: 't.id',
      projectId: 't.project_id',
      projectName: 'p.name as projectName',
      parentId: 't.parent_id',
      parentTaskName: 'parent.task_name as parentTaskName',
      taskCode: 't.task_code',
      taskName: 't.task_name',
      description: 't.description',
      taskType: 't.task_type',
      status: 't.status',
      priority: 't.priority',
      progress: 't.progress',
      estimatedHours: 't.estimated_hours',
      actualHours: 't.actual_hours',
      plannedStartDate: 't.planned_start_date',
      plannedEndDate: 't.planned_end_date',
      actualStartDate: 't.actual_start_date',
      actualEndDate: 't.actual_end_date',
      assigneeId: 't.assignee_id',
      assigneeName: 'm.name as assigneeName',
      dependencies: 't.dependencies',
      tags: 't.tags',
      createdAt: 't.created_at',
      updatedAt: 't.updated_at',
      createdBy: 't.created_by'
    };

    // 根据字段选择需要的JOIN
    const needsProject = fields.some(f => ['projectId', 'projectName'].includes(String(f)));
    const needsMember = fields.some(f => ['assigneeId', 'assigneeName'].includes(String(f)));
    const needsParent = fields.some(f => ['parentId', 'parentTaskName'].includes(String(f)));

    let fieldList = fields.map(f => fieldMap[String(f)] || String(f)).join(', ');

    // 添加必要的JOIN提示（在实际查询中会添加）
    return fieldList;
  }

  /**
   * 排序字段转换
   */
  private orderByToSql(orderBy: string): string {
    const orderByMap: Record<string, string> = {
      id: 't.id',
      taskCode: 't.task_code',
      taskName: 't.task_name',
      status: 't.status',
      priority: 't.priority',
      progress: 't.progress',
      createdAt: 't.created_at',
      plannedStartDate: 't.planned_start_date',
      plannedEndDate: 't.planned_end_date'
    };

    return orderByMap[orderBy] || orderBy;
  }

  /**
   * 构建 WHERE 条件
   */
  private buildWhereClause(options: WbsTaskQueryOptions): { whereClause: string; params: any[] } {
    const conditions: string[] = [];
    const params: any[] = [];

    // 基础条件：未删除
    conditions.push('t.deleted_at IS NULL');

    // 项目ID筛选
    if (options.projectId !== undefined) {
      conditions.push('t.project_id = ?');
      params.push(options.projectId);
    }

    // 状态筛选
    if (options.status) {
      conditions.push('t.status = ?');
      params.push(options.status);
    }

    // 任务类型筛选
    if (options.taskType) {
      conditions.push('t.task_type = ?');
      params.push(options.taskType);
    }

    // 负责人筛选
    if (options.assigneeId !== undefined) {
      conditions.push('t.assignee_id = ?');
      params.push(options.assigneeId);
    }

    // 父任务筛选
    if (options.parentId !== undefined) {
      if (options.parentId === null) {
        conditions.push('t.parent_id IS NULL');
      } else {
        conditions.push('t.parent_id = ?');
        params.push(options.parentId);
      }
    }

    // 搜索关键词
    if (options.search) {
      conditions.push('(t.task_code LIKE ? OR t.task_name LIKE ? OR t.description LIKE ?)');
      const searchTerm = `%${options.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // 优先级范围筛选
    if (options.priorityFrom !== undefined) {
      conditions.push('t.priority >= ?');
      params.push(options.priorityFrom);
    }
    if (options.priorityTo !== undefined) {
      conditions.push('t.priority <= ?');
      params.push(options.priorityTo);
    }

    // 日期范围筛选
    if (options.dateFrom) {
      conditions.push('t.planned_start_date >= ?');
      params.push(options.dateFrom);
    }
    if (options.dateTo) {
      conditions.push('t.planned_end_date <= ?');
      params.push(options.dateTo);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    return { whereClause, params };
  }

  /**
   * 获取缓存统计
   */
  getCacheStats() {
    return {
      list: queryCacheManager.getStats(this.CACHE_TYPE_LIST),
      detail: queryCacheManager.getStats(this.CACHE_TYPE_DETAIL),
      tree: queryCacheManager.getStats(this.CACHE_TYPE_TREE),
      listSize: queryCacheManager.getCacheSize(this.CACHE_TYPE_LIST),
      detailSize: queryCacheManager.getCacheSize(this.CACHE_TYPE_DETAIL),
      treeSize: queryCacheManager.getCacheSize(this.CACHE_TYPE_TREE)
    };
  }
}

// ================================================================
// 导出单例
// ================================================================

export const optimizedWbsTaskService = new OptimizedWbsTaskService();

// 导出类型
export type { WbsTaskQueryOptions, WbsTaskListResponse, WbsTaskListItem, WbsTaskDetail, WbsTaskTreeNode };
