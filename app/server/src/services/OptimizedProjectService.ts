/**
 * 优化的项目服务 - 集成缓存和性能优化
 *
 * 优化内容：
 * 1. 双层缓存（Redis + LRU内存）
 * 2. 分页查询
 * 3. 字段选择优化
 * 4. 批量查询
 * 5. 查询超时控制
 *
 * @author AI Assistant
 * @since 2025-03-04
 */

import { databaseService } from './DatabaseService.js';
import { queryCacheManager } from './QueryCacheManager.js';
import { QueryOptimizer, PaginatedResult, QueryOptions } from '../utils/QueryOptimizer.js';
import { queryWithTimeout, QUERY_TIMEOUT } from '../utils/DatabaseQueryTimeout.js';
import { withDeadlockRetry } from '../utils/DeadlockRetry.js';

// ================================================================
// 类型定义
// ================================================================

export interface ProjectQueryOptions extends QueryOptions {
  status?: string;           // 状态筛选
  projectType?: string;      // 项目类型筛选
  search?: string;           // 搜索关键词
  createdBy?: number;        // 创建者筛选
  dateFrom?: string;         // 开始日期
  dateTo?: string;           // 结束日期
}

export interface ProjectListResponse {
  data: ProjectListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  cached: boolean;
  queryTime: number;
}

export interface ProjectListItem {
  id: number;
  code: string;
  name: string;
  description: string | null;
  status: string;
  projectType: string;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  progress: number;
  taskCount: number;
  completedTaskCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy: number;
  createdByName: string | null;
}

export interface ProjectDetail extends ProjectListItem {
  members?: ProjectMemberSummary[];
  tasks?: TaskSummary[];
}

export interface ProjectMemberSummary {
  userId: number;
  userName: string;
  role: string;
  joinedAt: string;
}

export interface TaskSummary {
  id: number;
  taskCode: string;
  taskName: string;
  status: string;
  progress: number;
  assigneeName: string | null;
}

// ================================================================
// 项目查询字段映射
// ================================================================

const PROJECT_FIELDS = {
  basic: ['id', 'code', 'name', 'status', 'progress'],
  detail: ['id', 'code', 'name', 'description', 'status', 'projectType', 'progress', 'taskCount', 'completedTaskCount'],
  full: ['id', 'code', 'name', 'description', 'status', 'projectType', 'plannedStartDate', 'plannedEndDate', 'progress', 'taskCount', 'completedTaskCount', 'createdAt', 'updatedAt', 'createdBy']
};

// ================================================================
// 优化的项目服务
// ================================================================

class OptimizedProjectService {
  private readonly CACHE_TYPE_LIST = 'projects_list';
  private readonly CACHE_TYPE_DETAIL = 'projects_detail';

  // ================================================================
  // 项目列表查询（带缓存和分页）
  // ================================================================

  /**
   * 获取项目列表（带缓存和分页）
   */
  async getProjectList(options: ProjectQueryOptions = {}): Promise<ProjectListResponse> {
    const startTime = Date.now();

    // 1. 生成缓存键
    const cacheKey = queryCacheManager.buildKey({
      type: 'list',
      ...options
    });

    // 2. 尝试从缓存获取
    const cached = await queryCacheManager.get<PaginatedResult<ProjectListItem>>(
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
    const result = await this.queryProjectList(options);

    // 4. 写入缓存
    await queryCacheManager.set(this.CACHE_TYPE_LIST, cacheKey, result);

    return {
      ...result,
      cached: false,
      queryTime: Date.now() - startTime
    };
  }

  /**
   * 执行项目列表查询
   */
  private async queryProjectList(options: ProjectQueryOptions): Promise<{
    data: ProjectListItem[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
  }> {
    const {
      page = 1,
      pageSize = 50,
      fields = [],
      orderBy = 'created_at',
      order = 'DESC',
      status,
      projectType,
      search,
      createdBy,
      dateFrom,
      dateTo
    } = options;

    // 构建字段列表
    const fieldList = fields.length > 0
      ? fields.map(f => this.fieldToSql(f)).join(', ')
      : this.getDefaultFields('list');

    // 构建 WHERE 条件
    const { whereClause, params } = this.buildWhereClause({
      status,
      projectType,
      search,
      createdBy,
      dateFrom,
      dateTo
    });

    // 使用超时控制执行查询
    return await queryWithTimeout(
      this.executePaginatedQuery(fieldList, whereClause, params, orderBy, order, page, pageSize),
      QUERY_TIMEOUT.MEDIUM,
      '项目列表查询'
    );
  }

  /**
   * 执行分页查询
   * 性能优化: 添加详细的查询时间监控
   */
  private async executePaginatedQuery(
    fieldList: string,
    whereClause: string,
    params: any[],
    orderBy: string,
    order: string,
    page: number,
    pageSize: number
  ): Promise<{
    data: ProjectListItem[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
  }> {
    const queryStartTime = Date.now();

    // 验证分页参数
    const validPage = Math.max(1, page);
    const validPageSize = Math.min(Math.max(1, pageSize), 500);
    const offset = (validPage - 1) * validPageSize;

    // 获取总数
    const countStartTime = Date.now();
    const countSql = `
      SELECT COUNT(*) as total
      FROM projects p
      LEFT JOIN users u ON p.created_by = u.id
      ${whereClause}
    `;
    const countResult = await databaseService.query(countSql, params) as { total: number }[];
    const total = countResult[0]?.total || 0;
    const countDuration = Date.now() - countStartTime;

    // 查询数据
    const dataStartTime = Date.now();
    const sql = `
      SELECT ${fieldList}
      FROM projects p
      LEFT JOIN users u ON p.created_by = u.id
      ${whereClause}
      ORDER BY ${this.fieldToSql(orderBy)} ${order}
      LIMIT ${validPageSize} OFFSET ${offset}
    `;

    const data = await databaseService.query(sql, params) as ProjectListItem[];
    const dataDuration = Date.now() - dataStartTime;
    const totalDuration = Date.now() - queryStartTime;

    // 性能日志
    console.log(`[Perf] 项目列表查询耗时: ${totalDuration}ms (COUNT: ${countDuration}ms, DATA: ${dataDuration}ms, 返回: ${data.length} 条)`);

    // 如果查询时间超过阈值，记录警告
    if (totalDuration > 100) {
      console.warn(`[Perf] ⚠️ 项目列表查询较慢: ${totalDuration}ms，建议检查索引`);
    }

    return {
      data,
      pagination: {
        page: validPage,
        pageSize: validPageSize,
        total,
        totalPages: Math.ceil(total / validPageSize)
      }
    };
  }

  // ================================================================
  // 项目详情查询（带缓存）
  // ================================================================

  /**
   * 获取项目详情（带缓存）
   */
  async getProjectDetail(id: number): Promise<ProjectDetail | null> {
    // 1. 尝试从缓存获取
    const cacheKey = `detail:${id}`;
    const cached = await queryCacheManager.get<ProjectDetail>(
      this.CACHE_TYPE_DETAIL,
      cacheKey
    );

    if (cached) {
      return cached;
    }

    // 2. 查询数据库
    const result = await this.queryProjectDetail(id);

    // 3. 写入缓存
    if (result) {
      await queryCacheManager.set(this.CACHE_TYPE_DETAIL, cacheKey, result);
    }

    return result;
  }

  /**
   * 执行项目详情查询
   */
  private async queryProjectDetail(id: number): Promise<ProjectDetail | null> {
    const sql = `
      SELECT
        p.id,
        p.code,
        p.name,
        p.description,
        p.status,
        p.project_type as projectType,
        p.planned_start_date as plannedStartDate,
        p.planned_end_date as plannedEndDate,
        p.progress,
        p.task_count as taskCount,
        p.completed_task_count as completedTaskCount,
        p.created_at as createdAt,
        p.updated_at as updatedAt,
        p.created_by as createdBy,
        u.name as created_by_name
      FROM projects p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.id = ? AND p.deleted_at IS NULL
    `;

    const result = await databaseService.query(sql, [id]) as ProjectDetail[];

    return result[0] || null;
  }

  // ================================================================
  // 批量查询项目
  // ================================================================

  /**
   * 批量获取项目详情
   */
  async batchGetProjects(ids: number[]): Promise<Map<number, ProjectDetail>> {
    if (ids.length === 0) {
      return new Map();
    }

    // 1. 批量查询缓存
    const cacheKeys = ids.map(id => `detail:${id}`);
    const cachedResults = await this.batchGetFromCache(cacheKeys);

    // 2. 找出未命中的ID
    const missedIds = ids.filter(id => !cachedResults.has(id));

    // 3. 批量查询数据库
    if (missedIds.length > 0) {
      const dbResults = await this.batchQueryProjects(missedIds);

      // 4. 写入缓存
      for (const [id, project] of dbResults.entries()) {
        await queryCacheManager.set(
          this.CACHE_TYPE_DETAIL,
          `detail:${id}`,
          project
        );
        cachedResults.set(id, project);
      }
    }

    return cachedResults;
  }

  /**
   * 批量从缓存获取
   */
  private async batchGetFromCache(keys: string[]): Promise<Map<number, ProjectDetail>> {
    const results = new Map<number, ProjectDetail>();

    for (const key of keys) {
      const cached = await queryCacheManager.get<ProjectDetail>(
        this.CACHE_TYPE_DETAIL,
        key
      );
      if (cached) {
        const id = parseInt(key.split(':')[1]);
        results.set(id, cached);
      }
    }

    return results;
  }

  /**
   * 批量查询数据库
   */
  private async batchQueryProjects(ids: number[]): Promise<Map<number, ProjectDetail>> {
    const placeholders = ids.map(() => '?').join(',');
    const sql = `
      SELECT
        p.id,
        p.code,
        p.name,
        p.description,
        p.status,
        p.project_type as projectType,
        p.planned_start_date as plannedStartDate,
        p.planned_end_date as plannedEndDate,
        p.progress,
        p.task_count as taskCount,
        p.completed_task_count as completedTaskCount,
        p.created_at as createdAt,
        p.updated_at as updatedAt,
        p.created_by as createdBy,
        u.name as created_by_name
      FROM projects p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.id IN (${placeholders}) AND p.deleted_at IS NULL
    `;

    const results = await databaseService.query(sql, ids) as ProjectDetail[];
    const map = new Map<number, ProjectDetail>();

    for (const project of results) {
      map.set(project.id, project);
    }

    return map;
  }

  // ================================================================
  // 字段优化查询
  // ================================================================

  /**
   * 只查询指定字段（性能优化）
   */
  async getProjectFields(
    ids: number[],
    fields: (keyof ProjectListItem)[]
  ): Promise<Map<number, Partial<ProjectListItem>>> {
    if (ids.length === 0 || fields.length === 0) {
      return new Map();
    }

    // 使用预设字段或自定义字段
    const fieldList = fields.map(f => this.fieldToSql(String(f))).join(', ');
    const placeholders = ids.map(() => '?').join(',');

    const sql = `
      SELECT ${fieldList}
      FROM projects p
      WHERE p.id IN (${placeholders}) AND p.deleted_at IS NULL
    `;

    const results = await databaseService.query(sql, ids) as Partial<ProjectListItem>[];
    const map = new Map<number, Partial<ProjectListItem>>();

    for (const project of results) {
      if (project.id) {
        map.set(project.id, project);
      }
    }

    return map;
  }

  // ================================================================
  // 缓存失效
  // ================================================================

  /**
   * 使项目缓存失效
   */
  async invalidateProject(id?: number): Promise<void> {
    if (id) {
      // 失效特定项目缓存
      await queryCacheManager.delete(this.CACHE_TYPE_DETAIL, `detail:${id}`);
      // 失效列表缓存（因为列表中可能包含该项目）
      await queryCacheManager.invalidateType(this.CACHE_TYPE_LIST);
    } else {
      // 失效所有项目缓存
      await queryCacheManager.invalidateType(this.CACHE_TYPE_DETAIL);
      await queryCacheManager.invalidateType(this.CACHE_TYPE_LIST);
    }
  }

  // ================================================================
  // 工具函数
  // ================================================================

  /**
   * 构建默认字段列表
   */
  private getDefaultFields(type: 'list' | 'detail'): string {
    return `
      p.id,
      p.code,
      p.name,
      p.description,
      p.status,
      p.project_type as projectType,
      p.planned_start_date as plannedStartDate,
      p.planned_end_date as plannedEndDate,
      p.progress,
      p.task_count as taskCount,
      p.completed_task_count as completedTaskCount,
      p.created_at as createdAt,
      p.updated_at as updatedAt,
      p.created_by as createdBy,
      u.name as created_by_name
    `;
  }

  /**
   * 字段名转换（camelCase -> snake_case）
   */
  private fieldToSql(field: string): string {
    const fieldMap: Record<string, string> = {
      // camelCase 输入
      id: 'p.id',
      code: 'p.code',
      name: 'p.name',
      description: 'p.description',
      status: 'p.status',
      projectType: 'p.project_type',
      plannedStartDate: 'p.planned_start_date',
      plannedEndDate: 'p.planned_end_date',
      progress: 'p.progress',
      taskCount: 'p.task_count',
      completedTaskCount: 'p.completed_task_count',
      createdAt: 'p.created_at',
      updatedAt: 'p.updated_at',
      createdBy: 'p.created_by',
      createdByName: 'u.name as created_by_name',
      // snake_case 输入（兼容性）
      created_at: 'p.created_at',
      updated_at: 'p.updated_at',
      created_by: 'p.created_by',
      project_type: 'p.project_type',
      planned_start_date: 'p.planned_start_date',
      planned_end_date: 'p.planned_end_date',
      task_count: 'p.task_count',
      completed_task_count: 'p.completed_task_count'
    };

    // 如果字段已经在映射中，直接返回
    if (fieldMap[field]) {
      return fieldMap[field];
    }

    // 如果字段包含表别名前缀，直接返回
    if (field.includes('.')) {
      return field;
    }

    // 默认使用 projects 表的别名
    return `p.${field}`;
  }

  /**
   * 构建 WHERE 条件
   */
  private buildWhereClause(filters: {
    status?: string;
    projectType?: string;
    search?: string;
    createdBy?: number;
    dateFrom?: string;
    dateTo?: string;
  }): { whereClause: string; params: any[] } {
    const conditions: string[] = [];
    const params: any[] = [];

    // 基础条件：未删除
    conditions.push('p.deleted_at IS NULL');

    // 状态筛选
    if (filters.status) {
      conditions.push('p.status = ?');
      params.push(filters.status);
    }

    // 项目类型筛选
    if (filters.projectType) {
      conditions.push('p.project_type = ?');
      params.push(filters.projectType);
    }

    // 搜索关键词
    if (filters.search) {
      conditions.push('(p.code LIKE ? OR p.name LIKE ? OR p.description LIKE ?)');
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // 创建者筛选
    if (filters.createdBy) {
      conditions.push('p.created_by = ?');
      params.push(filters.createdBy);
    }

    // 日期范围筛选
    if (filters.dateFrom) {
      conditions.push('p.created_at >= ?');
      params.push(filters.dateFrom);
    }
    if (filters.dateTo) {
      conditions.push('p.created_at <= ?');
      params.push(filters.dateTo);
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
      listSize: queryCacheManager.getCacheSize(this.CACHE_TYPE_LIST),
      detailSize: queryCacheManager.getCacheSize(this.CACHE_TYPE_DETAIL)
    };
  }
}

// ================================================================
// 导出单例
// ================================================================

export const optimizedProjectService = new OptimizedProjectService();

// 导出类型
export type { ProjectQueryOptions, ProjectListResponse, ProjectListItem, ProjectDetail };
