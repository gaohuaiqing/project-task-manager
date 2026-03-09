/**
 * 优化的成员服务 - 集成缓存和性能优化
 *
 * 优化内容：
 * 1. 双层缓存（Redis + LRU内存）
 * 2. 分页查询
 * 3. 字段选择优化
 * 4. 批量查询
 * 5. 按部门分组缓存
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

export interface MemberQueryOptions extends QueryOptions {
  department?: string;       // 部门筛选
  status?: string;           // 状态筛选
  search?: string;           // 搜索关键词
  position?: string;         // 职位筛选
  skill?: string;            // 技能筛选
}

export interface MemberListResponse {
  data: MemberListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  cached: boolean;
  queryTime: number;
}

export interface MemberListItem {
  id: number;
  name: string;
  employeeId: string | null;
  department: string | null;
  position: string | null;
  status: string;
  skills: string[];
  capabilities: Record<string, any>;
  createdAt: string;
  createdBy: number;
  createdByName: string | null;
}

export interface MemberDetail extends MemberListItem {
  taskAssignments?: TaskAssignmentSummary[];
}

export interface TaskAssignmentSummary {
  taskId: number;
  taskName: string;
  projectName: string;
  status: string;
  progress: number;
}

// ================================================================
// 优化的成员服务
// ================================================================

class OptimizedMemberService {
  private readonly CACHE_TYPE_LIST = 'members_list';
  private readonly CACHE_TYPE_DETAIL = 'members_detail';

  // ================================================================
  // 成员列表查询（带缓存和分页）
  // ================================================================

  /**
   * 获取成员列表（带缓存和分页）
   */
  async getMemberList(options: MemberQueryOptions = {}): Promise<MemberListResponse> {
    const startTime = Date.now();

    // 1. 生成缓存键
    const cacheKey = queryCacheManager.buildKey({
      type: 'list',
      ...options
    });

    // 2. 尝试从缓存获取
    const cached = await queryCacheManager.get<PaginatedResult<MemberListItem>>(
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
    const result = await this.queryMemberList(options);

    // 4. 写入缓存
    await queryCacheManager.set(this.CACHE_TYPE_LIST, cacheKey, result);

    return {
      ...result,
      cached: false,
      queryTime: Date.now() - startTime
    };
  }

  /**
   * 执行成员列表查询
   */
  private async queryMemberList(options: MemberQueryOptions): Promise<{
    data: MemberListItem[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
  }> {
    const {
      page = 1,
      pageSize = 50,
      orderBy = 'name',
      order = 'ASC'
    } = options;

    // 构建字段列表
    const fieldList = `
      m.id,
      m.name,
      m.employee_id as employeeId,
      m.department,
      m.position,
      m.status,
      m.skills,
      m.capabilities,
      m.created_at as createdAt,
      m.created_by as createdBy,
      u.name as created_by_name
    `;

    // 构建 WHERE 条件
    const { whereClause, params } = this.buildWhereClause(options);

    // 验证分页参数
    const validPage = Math.max(1, page);
    const validPageSize = Math.min(Math.max(1, pageSize), 500);
    const offset = (validPage - 1) * validPageSize;

    // 使用超时控制执行查询
    return await queryWithTimeout(
      this.executePaginatedQuery(fieldList, whereClause, params, orderBy, order, validPage, validPageSize, offset),
      QUERY_TIMEOUT.MEDIUM,
      '成员列表查询'
    );
  }

  /**
   * 执行分页查询
   */
  private async executePaginatedQuery(
    fieldList: string,
    whereClause: string,
    params: any[],
    orderBy: string,
    order: string,
    page: number,
    pageSize: number,
    offset: number
  ): Promise<{
    data: MemberListItem[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
  }> {
    // 获取总数
    const countSql = `
      SELECT COUNT(*) as total
      FROM members m
      LEFT JOIN users u ON m.created_by = u.id
      ${whereClause}
    `;
    const countResult = await databaseService.query(countSql, params) as { total: number }[];
    const total = countResult[0]?.total || 0;

    // 查询数据
    const sql = `
      SELECT ${fieldList}
      FROM members m
      LEFT JOIN users u ON m.created_by = u.id
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
  // 成员详情查询（带缓存）
  // ================================================================

  /**
   * 获取成员详情（带缓存）
   */
  async getMemberDetail(id: number): Promise<MemberDetail | null> {
    // 1. 尝试从缓存获取
    const cacheKey = `detail:${id}`;
    const cached = await queryCacheManager.get<MemberDetail>(
      this.CACHE_TYPE_DETAIL,
      cacheKey
    );

    if (cached) {
      return cached;
    }

    // 2. 查询数据库
    const result = await this.queryMemberDetail(id);

    // 3. 写入缓存
    if (result) {
      await queryCacheManager.set(this.CACHE_TYPE_DETAIL, cacheKey, result);
    }

    return result;
  }

  /**
   * 执行成员详情查询
   */
  private async queryMemberDetail(id: number): Promise<MemberDetail | null> {
    const sql = `
      SELECT
        m.id,
        m.name,
        m.employee_id as employeeId,
        m.department,
        m.position,
        m.status,
        m.skills,
        m.capabilities,
        m.created_at as createdAt,
        m.created_by as createdBy,
        u.name as created_by_name
      FROM members m
      LEFT JOIN users u ON m.created_by = u.id
      WHERE m.id = ? AND m.deleted_at IS NULL
    `;

    const result = await databaseService.query(sql, [id]) as any[];

    if (result.length === 0) {
      return null;
    }

    return this.parseJsonFields(result[0]);
  }

  // ================================================================
  // 批量查询成员
  // ================================================================

  /**
   * 批量获取成员详情
   */
  async batchGetMembers(ids: number[]): Promise<Map<number, MemberDetail>> {
    if (ids.length === 0) {
      return new Map();
    }

    // 1. 批量查询缓存
    const cachedResults = await this.batchGetFromCache(ids);

    // 2. 找出未命中的ID
    const missedIds = ids.filter(id => !cachedResults.has(id));

    // 3. 批量查询数据库
    if (missedIds.length > 0) {
      const dbResults = await this.batchQueryMembers(missedIds);

      // 4. 写入缓存
      for (const [id, member] of dbResults.entries()) {
        await queryCacheManager.set(
          this.CACHE_TYPE_DETAIL,
          `detail:${id}`,
          member
        );
        cachedResults.set(id, member);
      }
    }

    return cachedResults;
  }

  /**
   * 批量从缓存获取
   */
  private async batchGetFromCache(ids: number[]): Promise<Map<number, MemberDetail>> {
    const results = new Map<number, MemberDetail>();

    for (const id of ids) {
      const cached = await queryCacheManager.get<MemberDetail>(
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
  private async batchQueryMembers(ids: number[]): Promise<Map<number, MemberDetail>> {
    const placeholders = ids.map(() => '?').join(',');
    const sql = `
      SELECT
        m.id,
        m.name,
        m.employee_id as employeeId,
        m.department,
        m.position,
        m.status,
        m.skills,
        m.capabilities,
        m.created_at as createdAt,
        m.created_by as createdBy,
        u.name as created_by_name
      FROM members m
      LEFT JOIN users u ON m.created_by = u.id
      WHERE m.id IN (${placeholders}) AND m.deleted_at IS NULL
    `;

    const results = await databaseService.query(sql, ids) as any[];
    const map = new Map<number, MemberDetail>();

    for (const member of results) {
      map.set(member.id, this.parseJsonFields(member));
    }

    return map;
  }

  // ================================================================
  // 按部门获取成员（常用查询优化）
  // ================================================================

  /**
   * 按部门获取成员列表（带缓存）
   */
  async getMembersByDepartment(department: string): Promise<MemberListItem[]> {
    const cacheKey = `department:${department}`;
    const cacheType = 'members_by_department';

    // 1. 尝试从缓存获取
    const cached = await queryCacheManager.get<MemberListItem[]>(cacheType, cacheKey);
    if (cached) {
      return cached;
    }

    // 2. 查询数据库
    const sql = `
      SELECT
        m.id,
        m.name,
        m.employee_id as employeeId,
        m.department,
        m.position,
        m.status
      FROM members m
      WHERE m.department = ? AND m.status = 'active' AND m.deleted_at IS NULL
      ORDER BY m.name
    `;

    const result = await databaseService.query(sql, [department]) as MemberListItem[];

    // 3. 写入缓存
    await queryCacheManager.set(cacheType, cacheKey, result);

    return result;
  }

  // ================================================================
  // 字段优化查询
  // ================================================================

  /**
   * 只查询指定字段（性能优化）
   */
  async getMemberFields(
    ids: number[],
    fields: (keyof MemberListItem)[]
  ): Promise<Map<number, Partial<MemberListItem>>> {
    if (ids.length === 0 || fields.length === 0) {
      return new Map();
    }

    // 使用预设字段或自定义字段
    const fieldList = this.buildFieldList(fields);
    const placeholders = ids.map(() => '?').join(',');

    const sql = `
      SELECT ${fieldList}
      FROM members m
      WHERE m.id IN (${placeholders}) AND m.deleted_at IS NULL
    `;

    const results = await databaseService.query(sql, ids) as any[];
    const map = new Map<number, Partial<MemberListItem>>();

    for (const member of results) {
      if (member.id) {
        map.set(member.id, this.parseJsonFields(member));
      }
    }

    return map;
  }

  // ================================================================
  // 缓存失效
  // ================================================================

  /**
   * 使成员缓存失效
   */
  async invalidateMember(id?: number): Promise<void> {
    if (id) {
      // 失效特定成员缓存
      await queryCacheManager.delete(this.CACHE_TYPE_DETAIL, `detail:${id}`);
      // 失效部门缓存
      const member = await this.queryMemberDetail(id);
      if (member?.department) {
        await queryCacheManager.delete('members_by_department', `department:${member.department}`);
      }
      // 失效列表缓存
      await queryCacheManager.invalidateType(this.CACHE_TYPE_LIST);
    } else {
      // 失效所有成员缓存
      await queryCacheManager.invalidateType(this.CACHE_TYPE_DETAIL);
      await queryCacheManager.invalidateType(this.CACHE_TYPE_LIST);
      await queryCacheManager.invalidateType('members_by_department');
    }
  }

  // ================================================================
  // 工具函数
  // ================================================================

  /**
   * 解析JSON字段（带错误处理）
   */
  private parseJsonFields(row: any): any {
    const safeParse = (value: any, defaultValue: any) => {
      if (!value || value === 'null' || value === '') {
        return defaultValue;
      }
      try {
        return JSON.parse(value);
      } catch (error) {
        console.warn(`[MemberService] JSON 解析失败: ${value}`, error);
        return defaultValue;
      }
    };

    return {
      ...row,
      skills: safeParse(row.skills, []),
      capabilities: safeParse(row.capabilities, {})
    };
  }

  /**
   * 构建字段列表
   */
  private buildFieldList(fields: (keyof MemberListItem)[]): string {
    const fieldMap: Record<string, string> = {
      id: 'm.id',
      name: 'm.name',
      employeeId: 'm.employee_id',
      department: 'm.department',
      position: 'm.position',
      status: 'm.status',
      skills: 'm.skills',
      capabilities: 'm.capabilities',
      createdAt: 'm.created_at',
      createdBy: 'm.created_by',
      createdByName: 'u.name as created_by_name'
    };

    return fields.map(f => fieldMap[String(f)] || String(f)).join(', ');
  }

  /**
   * 排序字段转换
   */
  private orderByToSql(orderBy: string): string {
    const orderByMap: Record<string, string> = {
      id: 'm.id',
      name: 'm.name',
      department: 'm.department',
      position: 'm.position',
      status: 'm.status',
      createdAt: 'm.created_at'
    };

    return orderByMap[orderBy] || orderBy;
  }

  /**
   * 构建 WHERE 条件
   */
  private buildWhereClause(options: MemberQueryOptions): { whereClause: string; params: any[] } {
    const conditions: string[] = [];
    const params: any[] = [];

    // 基础条件：未删除
    conditions.push('m.deleted_at IS NULL');

    // 状态筛选
    if (options.status) {
      conditions.push('m.status = ?');
      params.push(options.status);
    }

    // 部门筛选
    if (options.department) {
      conditions.push('m.department = ?');
      params.push(options.department);
    }

    // 职位筛选
    if (options.position) {
      conditions.push('m.position = ?');
      params.push(options.position);
    }

    // 搜索关键词
    if (options.search) {
      conditions.push('(m.name LIKE ? OR m.employee_id LIKE ? OR m.department LIKE ?)');
      const searchTerm = `%${options.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // 技能筛选（JSON查询）
    if (options.skill) {
      conditions.push('JSON_CONTAINS(m.skills, ?)');
      params.push(JSON.stringify(options.skill));
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

export const optimizedMemberService = new OptimizedMemberService();

// 导出类型
export type { MemberQueryOptions, MemberListResponse, MemberListItem, MemberDetail };
