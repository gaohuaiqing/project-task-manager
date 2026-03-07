/**
 * BaseRepository - 数据访问抽象层
 *
 * 提供通用的数据访问接口和实现
 * 所有具体的Repository都应该继承此类
 */

import type { EntityId, QueryFilter, PaginationParams, PaginatedResponse } from '../../../shared/types/index.js';
import type { DatabaseService } from '../services/DatabaseService.js';

/**
 * 实体接口基类
 * 所有实体都应该包含审计字段
 */
export interface BaseEntity {
  id: EntityId;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/**
 * 查询选项
 */
export interface QueryOptions {
  filters?: QueryFilter[];
  pagination?: PaginationParams;
  includeDeleted?: boolean;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

/**
 * Repository统计信息
 */
export interface RepositoryStats {
  total: number;
  active: number;
  deleted: number;
}

/**
 * BaseRepository抽象类
 *
 * 提供标准的CRUD操作和数据访问方法
 *
 * @template T - 实体类型
 */
export abstract class BaseRepository<T extends BaseEntity> {
  constructor(protected db: DatabaseService) {}

  /**
   * 获取表名
   */
  abstract getTableName(): string;

  /**
   * 将数据库行映射为实体
   */
  abstract mapToEntity(row: Record<string, unknown>): T;

  /**
   * 将实体映射为数据库行
   */
  abstract mapToRow(entity: Partial<T>): Record<string, unknown>;

  /**
   * 根据ID查找实体
   *
   * @param id - 实体ID
   * @param options - 查询选项
   * @returns 实体或null
   */
  async findById(id: EntityId, options: QueryOptions = {}): Promise<T | null> {
    const { includeDeleted = false } = options;

    let sql = `SELECT * FROM ${this.getTableName()} WHERE id = ?`;
    const params: unknown[] = [id];

    if (!includeDeleted) {
      sql += ' AND deleted_at IS NULL';
    }

    const rows = await this.db.query(sql, params) as Record<string, unknown>[];

    if (rows.length === 0) {
      return null;
    }

    return this.mapToEntity(rows[0]);
  }

  /**
   * 根据ID列表查找多个实体
   *
   * @param ids - 实体ID列表
   * @param options - 查询选项
   * @returns 实体列表
   */
  async findByIds(ids: EntityId[], options: QueryOptions = {}): Promise<T[]> {
    if (ids.length === 0) {
      return [];
    }

    const { includeDeleted = false } = options;

    let sql = `SELECT * FROM ${this.getTableName()} WHERE id IN (${ids.map(() => '?').join(',')})`;
    const params: unknown[] = [...ids];

    if (!includeDeleted) {
      sql += ' AND deleted_at IS NULL';
    }

    const rows = await this.db.query(sql, params) as Record<string, unknown>[];

    return rows.map(row => this.mapToEntity(row));
  }

  /**
   * 查找所有实体
   *
   * @param options - 查询选项
   * @returns 实体列表
   */
  async findAll(options: QueryOptions = {}): Promise<T[]> {
    const {
      filters = [],
      includeDeleted = false,
      orderBy = 'created_at',
      orderDirection = 'DESC',
    } = options;

    let sql = `SELECT * FROM ${this.getTableName()} WHERE 1=1`;
    const params: unknown[] = [];

    // 处理软删除
    if (!includeDeleted) {
      sql += ' AND deleted_at IS NULL';
    }

    // 处理过滤条件
    for (const filter of filters) {
      sql += this.buildFilterCondition(filter);
      if (filter.value !== undefined) {
        params.push(filter.value);
      }
    }

    // 排序
    sql += ` ORDER BY ${orderBy} ${orderDirection}`;

    const rows = await this.db.query(sql, params) as Record<string, unknown>[];

    return rows.map(row => this.mapToEntity(row));
  }

  /**
   * 分页查询
   *
   * @param options - 查询选项
   * @returns 分页响应
   */
  async findPaginated(options: QueryOptions = {}): Promise<PaginatedResponse<T>> {
    const {
      filters = [],
      pagination = { page: 1, pageSize: 20 },
      includeDeleted = false,
      orderBy = 'created_at',
      orderDirection = 'DESC',
    } = options;

    const { page, pageSize } = pagination;
    const offset = (page - 1) * pageSize;

    // 构建WHERE子句
    let whereSql = 'WHERE 1=1';
    const params: unknown[] = [];

    if (!includeDeleted) {
      whereSql += ' AND deleted_at IS NULL';
    }

    for (const filter of filters) {
      whereSql += this.buildFilterCondition(filter);
      if (filter.value !== undefined) {
        params.push(filter.value);
      }
    }

    // 查询总数
    const countSql = `SELECT COUNT(*) as total FROM ${this.getTableName()} ${whereSql}`;
    const countResult = await this.db.query(countSql, params) as { total: bigint }[];
    const total = Number(countResult[0].total);

    // 查询数据
    const dataSql = `
      SELECT * FROM ${this.getTableName()}
      ${whereSql}
      ORDER BY ${orderBy} ${orderDirection}
      LIMIT ${pageSize} OFFSET ${offset}
    `;

    const rows = await this.db.query(dataSql, params) as Record<string, unknown>[];
    const data = rows.map(row => this.mapToEntity(row));

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 创建实体
   *
   * @param entity - 实体数据（不包含id、createdAt、updatedAt）
   * @returns 创建的实体
   */
  async create(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<T> {
    const row = this.mapToRow(entity as Partial<T>);
    const columns = Object.keys(row);
    const values = Object.values(row);
    const placeholders = values.map(() => '?');

    const sql = `
      INSERT INTO ${this.getTableName()} (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
    `;

    const result = await this.db.query(sql, values) as { insertId: number };

    // 获取完整的实体
    const created = await this.findById(result.insertId);
    if (!created) {
      throw new Error(`Failed to retrieve created entity with id ${result.insertId}`);
    }

    return created;
  }

  /**
   * 批量创建实体
   *
   * @param entities - 实体数据列表
   * @returns 创建的实体列表
   */
  async createMany(
    entities: Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>[]
  ): Promise<T[]> {
    if (entities.length === 0) {
      return [];
    }

    const results: T[] = [];

    // 使用事务
    return this.db.transaction(async () => {
      for (const entity of entities) {
        const created = await this.create(entity);
        results.push(created);
      }
      return results;
    });
  }

  /**
   * 更新实体
   *
   * @param id - 实体ID
   * @param entity - 要更新的字段
   * @returns 更新后的实体
   */
  async update(id: EntityId, entity: Partial<T>): Promise<T> {
    const row = this.mapToRow(entity);
    const columns = Object.keys(row);
    const values = Object.values(row);

    if (columns.length === 0) {
      // 没有需要更新的字段，直接返回现有实体
      const existing = await this.findById(id);
      if (!existing) {
        throw new Error(`Entity with id ${id} not found`);
      }
      return existing;
    }

    const setClause = columns.map(col => `${col} = ?`).join(', ');
    const sql = `
      UPDATE ${this.getTableName()}
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND deleted_at IS NULL
    `;

    values.push(id);

    await this.db.query(sql, values);

    // 获取更新后的实体
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Failed to retrieve updated entity with id ${id}`);
    }

    return updated;
  }

  /**
   * 批量更新实体
   *
   * @param updates - 更新列表 { id, entity }[]
   * @returns 更新后的实体列表
   */
  async updateMany(updates: { id: EntityId; entity: Partial<T> }[]): Promise<T[]> {
    if (updates.length === 0) {
      return [];
    }

    const results: T[] = [];

    // 使用事务
    return this.db.transaction(async () => {
      for (const { id, entity } of updates) {
        const updated = await this.update(id, entity);
        results.push(updated);
      }
      return results;
    });
  }

  /**
   * 软删除实体
   *
   * @param id - 实体ID
   * @returns 是否成功
   */
  async softDelete(id: EntityId): Promise<boolean> {
    const sql = `
      UPDATE ${this.getTableName()}
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = ? AND deleted_at IS NULL
    `;

    const result = await this.db.query(sql, [id]) as { affectedRows: number };
    return result.affectedRows > 0;
  }

  /**
   * 批量软删除实体
   *
   * @param ids - 实体ID列表
   * @returns 删除的数量
   */
  async softDeleteMany(ids: EntityId[]): Promise<number> {
    if (ids.length === 0) {
      return 0;
    }

    const placeholders = ids.map(() => '?').join(',');
    const sql = `
      UPDATE ${this.getTableName()}
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id IN (${placeholders}) AND deleted_at IS NULL
    `;

    const result = await this.db.query(sql, ids) as { affectedRows: number };
    return result.affectedRows;
  }

  /**
   * 硬删除实体
   *
   * @param id - 实体ID
   * @returns 是否成功
   */
  async hardDelete(id: EntityId): Promise<boolean> {
    const sql = `DELETE FROM ${this.getTableName()} WHERE id = ?`;

    const result = await this.db.query(sql, [id]) as { affectedRows: number };
    return result.affectedRows > 0;
  }

  /**
   * 批量硬删除实体
   *
   * @param ids - 实体ID列表
   * @returns 删除的数量
   */
  async hardDeleteMany(ids: EntityId[]): Promise<number> {
    if (ids.length === 0) {
      return 0;
    }

    const placeholders = ids.map(() => '?').join(',');
    const sql = `DELETE FROM ${this.getTableName()} WHERE id IN (${placeholders})`;

    const result = await this.db.query(sql, ids) as { affectedRows: number };
    return result.affectedRows;
  }

  /**
   * 恢复已软删除的实体
   *
   * @param id - 实体ID
   * @returns 是否成功
   */
  async restore(id: EntityId): Promise<boolean> {
    const sql = `
      UPDATE ${this.getTableName()}
      SET deleted_at = NULL
      WHERE id = ? AND deleted_at IS NOT NULL
    `;

    const result = await this.db.query(sql, [id]) as { affectedRows: number };
    return result.affectedRows > 0;
  }

  /**
   * 统计实体数量
   *
   * @param options - 查询选项
   * @returns 统计信息
   */
  async stats(options: QueryOptions = {}): Promise<RepositoryStats> {
    const { includeDeleted = false } = options;

    // 统计总数
    const totalSql = `SELECT COUNT(*) as total FROM ${this.getTableName()}`;
    const totalResult = await this.db.query(totalSql) as { total: bigint }[];
    const total = Number(totalResult[0].total);

    // 统计活跃数
    const activeSql = `SELECT COUNT(*) as active FROM ${this.getTableName()} WHERE deleted_at IS NULL`;
    const activeResult = await this.db.query(activeSql) as { active: bigint }[];
    const active = Number(activeResult[0].active);

    // 统计已删除数
    const deletedSql = `SELECT COUNT(*) as deleted FROM ${this.getTableName()} WHERE deleted_at IS NOT NULL`;
    const deletedResult = await this.db.query(deletedSql) as { deleted: bigint }[];
    const deleted = Number(deletedResult[0].deleted);

    return {
      total,
      active,
      deleted,
    };
  }

  /**
   * 检查实体是否存在
   *
   * @param id - 实体ID
   * @param includeDeleted - 是否包含已删除的实体
   * @returns 是否存在
   */
  async exists(id: EntityId, includeDeleted = false): Promise<boolean> {
    let sql = `SELECT 1 FROM ${this.getTableName()} WHERE id = ?`;
    if (!includeDeleted) {
      sql += ' AND deleted_at IS NULL';
    }

    const result = await this.db.query(sql, [id]) as unknown[];
    return result.length > 0;
  }

  /**
   * 计数
   *
   * @param options - 查询选项
   * @returns 数量
   */
  async count(options: QueryOptions = {}): Promise<number> {
    const { filters = [], includeDeleted = false } = options;

    let sql = `SELECT COUNT(*) as count FROM ${this.getTableName()} WHERE 1=1`;
    const params: unknown[] = [];

    if (!includeDeleted) {
      sql += ' AND deleted_at IS NULL';
    }

    for (const filter of filters) {
      sql += this.buildFilterCondition(filter);
      if (filter.value !== undefined) {
        params.push(filter.value);
      }
    }

    const result = await this.db.query(sql, params) as { count: bigint }[];
    return Number(result[0].count);
  }

  /**
   * 构建过滤条件SQL
   *
   * @param filter - 过滤条件
   * @returns SQL条件字符串
   */
  protected buildFilterCondition(filter: QueryFilter): string {
    const { field, operator, value } = filter;

    switch (operator) {
      case 'eq':
        return ` AND ${field} = ?`;
      case 'ne':
        return ` AND ${field} != ?`;
      case 'gt':
        return ` AND ${field} > ?`;
      case 'gte':
        return ` AND ${field} >= ?`;
      case 'lt':
        return ` AND ${field} < ?`;
      case 'lte':
        return ` AND ${field} <= ?`;
      case 'like':
        return ` AND ${field} LIKE ?`;
      case 'in':
        if (Array.isArray(value)) {
          const placeholders = value.map(() => '?').join(',');
          return ` AND ${field} IN (${placeholders})`;
        }
        return ` AND ${field} IN (?)`;
      case 'is_null':
        return ` AND ${field} IS NULL`;
      case 'is_not_null':
        return ` AND ${field} IS NOT NULL`;
      default:
        return '';
    }
  }

  /**
   * 执行原生SQL查询
   *
   * @param sql - SQL语句
   * @param params - 参数
   * @returns 查询结果
   */
  protected async queryRaw(sql: string, params: unknown[] = []): Promise<Record<string, unknown>[]> {
    return this.db.query(sql, params) as Record<string, unknown>[];
  }

  /**
   * 执行原生SQL查询并映射为实体
   *
   * @param sql - SQL语句
   * @param params - 参数
   * @returns 实体列表
   */
  protected async queryRawEntities(sql: string, params: unknown[] = []): Promise<T[]> {
    const rows = await this.queryRaw(sql, params);
    return rows.map(row => this.mapToEntity(row));
  }
}
