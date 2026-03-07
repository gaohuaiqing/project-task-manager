/**
 * MemberRepository - 成员数据访问层
 *
 * 提供成员相关的数据访问操作
 */

import { BaseRepository, type QueryOptions } from './BaseRepository.js';
import type { DatabaseService } from '../services/DatabaseService.js';
import type { Member, MemberStatus } from '../../../shared/types/index.js';

/**
 * 成员查询选项
 */
export interface MemberQueryOptions extends QueryOptions {
  /** 按状态筛选 */
  status?: MemberStatus[];
  /** 按部门筛选 */
  department?: string[];
  /** 按职位筛选 */
  position?: string[];
  /** 是否包含用户账户信息 */
  includeUser?: boolean;
  /** 搜索关键词（姓名或工号） */
  searchKeyword?: string;
}

/**
 * 成员统计信息
 */
export interface MemberStats {
  total: number;
  active: number;
  inactive: number;
  byDepartment: Record<string, number>;
  byPosition: Record<string, number>;
  withUserAccount: number;
  withoutUserAccount: number;
}

/**
 * 带用户信息的成员
 */
export interface MemberWithUser extends Member {
  user?: {
    id: number;
    username: string;
    role: string;
  };
}

/**
 * MemberRepository类
 */
export class MemberRepository extends BaseRepository<Member> {
  constructor(db: DatabaseService) {
    super(db);
  }

  /**
   * 获取表名
   */
  getTableName(): string {
    return 'members';
  }

  /**
   * 将数据库行映射为Member实体
   */
  mapToEntity(row: Record<string, unknown>): Member {
    return {
      id: row.id as number,
      name: row.name as string,
      employeeId: row.employee_id as string | null,
      department: row.department as string | null,
      position: row.position as string | null,
      skills: row.skills as Record<string, unknown> | null,
      capabilities: row.capabilities as Record<string, unknown> | null,
      status: row.status as MemberStatus,
      version: row.version as number,
      userId: row.user_id as number | null,
      createdBy: row.created_by as number | null,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
      deletedAt: row.deleted_at as Date | null,
    };
  }

  /**
   * 将Member实体映射为数据库行
   */
  mapToRow(member: Partial<Member>): Record<string, unknown> {
    const row: Record<string, unknown> = {};

    if (member.name !== undefined) row.name = member.name;
    if (member.employeeId !== undefined) row.employee_id = member.employeeId;
    if (member.department !== undefined) row.department = member.department;
    if (member.position !== undefined) row.position = member.position;
    if (member.skills !== undefined) row.skills = member.skills;
    if (member.capabilities !== undefined) row.capabilities = member.capabilities;
    if (member.status !== undefined) row.status = member.status;
    if (member.userId !== undefined) row.user_id = member.userId;
    if (member.createdBy !== undefined) row.created_by = member.createdBy;

    return row;
  }

  /**
   * 根据工号查找
   */
  async findByEmployeeId(employeeId: string): Promise<Member | null> {
    const sql = `SELECT * FROM ${this.getTableName()} WHERE employee_id = ? AND deleted_at IS NULL`;
    const rows = await this.db.query(sql, [employeeId]) as Record<string, unknown>[];

    if (rows.length === 0) {
      return null;
    }

    return this.mapToEntity(rows[0]);
  }

  /**
   * 根据用户ID查找成员
   */
  async findByUserId(userId: number): Promise<Member | null> {
    const sql = `SELECT * FROM ${this.getTableName()} WHERE user_id = ? AND deleted_at IS NULL`;
    const rows = await this.db.query(sql, [userId]) as Record<string, unknown>[];

    if (rows.length === 0) {
      return null;
    }

    return this.mapToEntity(rows[0]);
  }

  /**
   * 查询成员（带筛选）
   */
  async findMembers(options: MemberQueryOptions = {}): Promise<Member[]> {
    const {
      status,
      department,
      position,
      includeUser = false,
      searchKeyword,
      includeDeleted = false,
      orderBy = 'name',
      orderDirection = 'ASC',
    } = options;

    let sql = includeUser
      ? `SELECT m.*, u.id as user_id, u.username, u.role FROM ${this.getTableName()} m LEFT JOIN users u ON m.user_id = u.id WHERE 1=1`
      : `SELECT * FROM ${this.getTableName()} WHERE 1=1`;

    const params: unknown[] = [];

    if (!includeDeleted) {
      sql += ' AND m.deleted_at IS NULL';
    }

    if (status && status.length > 0) {
      sql += ` AND m.status IN (${status.map(() => '?').join(',')})`;
      params.push(...status);
    }

    if (department && department.length > 0) {
      sql += ` AND m.department IN (${department.map(() => '?').join(',')})`;
      params.push(...department);
    }

    if (position && position.length > 0) {
      sql += ` AND m.position IN (${position.map(() => '?').join(',')})`;
      params.push(...position);
    }

    if (searchKeyword) {
      sql += ' AND (m.name LIKE ? OR m.employee_id LIKE ?)';
      params.push(`%${searchKeyword}%`, `%${searchKeyword}%`);
    }

    sql += ` ORDER BY m.${orderBy} ${orderDirection}`;

    const rows = await this.db.query(sql, params) as Record<string, unknown>[];

    if (includeUser) {
      return rows.map(row => {
        const member = this.mapToEntity(row);
        if (row.user_id) {
          (member as any).user = {
            id: row.user_id as number,
            username: row.username as string,
            role: row.role as string,
          };
        }
        return member;
      });
    }

    return rows.map(row => this.mapToEntity(row));
  }

  /**
   * 获取成员统计信息
   */
  async getMemberStats(): Promise<MemberStats> {
    // 总数和状态统计
    const statusResult = await this.db.query(
      `SELECT status, COUNT(*) as count FROM ${this.getTableName()} WHERE deleted_at IS NULL GROUP BY status`
    ) as { status: MemberStatus; count: bigint }[];

    const byStatus: Record<MemberStatus, number> = {
      active: 0,
      inactive: 0,
    };

    let total = 0;
    for (const row of statusResult) {
      byStatus[row.status] = Number(row.count);
      total += Number(row.count);
    }

    // 按部门统计
    const deptResult = await this.db.query(
      `SELECT department, COUNT(*) as count FROM ${this.getTableName()} WHERE deleted_at IS NULL GROUP BY department`
    ) as { department: string; count: bigint }[];

    const byDepartment: Record<string, number> = {};
    for (const row of deptResult) {
      byDepartment[row.department] = Number(row.count);
    }

    // 按职位统计
    const posResult = await this.db.query(
      `SELECT position, COUNT(*) as count FROM ${this.getTableName()} WHERE deleted_at IS NULL GROUP BY position`
    ) as { position: string; count: bigint }[];

    const byPosition: Record<string, number> = {};
    for (const row of posResult) {
      byPosition[row.position] = Number(row.count);
    }

    // 用户账户统计
    const userResult = await this.db.query(
      `SELECT
        COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as with_user,
        COUNT(CASE WHEN user_id IS NULL THEN 1 END) as without_user
       FROM ${this.getTableName()}
       WHERE deleted_at IS NULL`
    ) as { with_user: bigint; without_user: bigint }[];

    return {
      total,
      active: byStatus.active,
      inactive: byStatus.inactive,
      byDepartment,
      byPosition,
      withUserAccount: Number(userResult[0].with_user),
      withoutUserAccount: Number(userResult[0].without_user),
    };
  }

  /**
   * 关联用户账户
   */
  async linkUserAccount(memberId: number, userId: number): Promise<void> {
    const sql = `
      UPDATE ${this.getTableName()}
      SET user_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND deleted_at IS NULL
    `;
    await this.db.query(sql, [userId, memberId]);
  }

  /**
   * 取消关联用户账户
   */
  async unlinkUserAccount(memberId: number): Promise<void> {
    const sql = `
      UPDATE ${this.getTableName()}
      SET user_id = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND deleted_at IS NULL
    `;
    await this.db.query(sql, [memberId]);
  }

  /**
   * 更新能力评估
   */
  async updateCapabilities(memberId: number, capabilities: Record<string, unknown>): Promise<void> {
    const sql = `
      UPDATE ${this.getTableName()}
      SET capabilities = ?, version = version + 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND deleted_at IS NULL
    `;
    await this.db.query(sql, [JSON.stringify(capabilities), memberId]);
  }

  /**
   * 更新技能
   */
  async updateSkills(memberId: number, skills: Record<string, unknown>): Promise<void> {
    const sql = `
      UPDATE ${this.getTableName()}
      SET skills = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND deleted_at IS NULL
    `;
    await this.db.query(sql, [JSON.stringify(skills), memberId]);
  }

  /**
   * 获取可用成员（可用于任务分配）
   */
  async findAvailableMembers(): Promise<Member[]> {
    const sql = `
      SELECT m.* FROM ${this.getTableName()} m
      WHERE m.status = 'active' AND m.deleted_at IS NULL
      ORDER BY m.name ASC
    `;

    const rows = await this.db.query(sql) as Record<string, unknown>[];
    return rows.map(row => this.mapToEntity(row));
  }

  /**
   * 搜索成员
   */
  async search(keyword: string, limit: number = 20): Promise<Member[]> {
    const sql = `
      SELECT * FROM ${this.getTableName()}
      WHERE deleted_at IS NULL
        AND (name LIKE ? OR employee_id LIKE ? OR department LIKE ?)
      ORDER BY name ASC
      LIMIT ?
    `;

    const rows = await this.db.query(sql, [
      `%${keyword}%`,
      `%${keyword}%`,
      `%${keyword}%`,
      limit,
    ]) as Record<string, unknown>[];

    return rows.map(row => this.mapToEntity(row));
  }

  /**
   * 获取成员的工作负载
   */
  async getMemberWorkload(memberId: number): Promise<{
    totalTasks: number;
    activeTasks: number;
    completedTasks: number;
    estimatedHours: number;
    actualHours: number;
  }> {
    const sql = `
      SELECT
        COUNT(*) as total_tasks,
        COUNT(CASE WHEN status IN ('pending', 'in_progress') THEN 1 END) as active_tasks,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
        COALESCE(SUM(estimated_hours), 0) as estimated_hours,
        COALESCE(SUM(actual_hours), 0) as actual_hours
      FROM wbs_tasks
      WHERE assignee_id = ? AND deleted_at IS NULL
    `;

    const result = await this.db.query(sql, [memberId]) as {
      total_tasks: bigint;
      active_tasks: bigint;
      completed_tasks: bigint;
      estimated_hours: number;
      actual_hours: number;
    }[];

    return {
      totalTasks: Number(result[0].total_tasks),
      activeTasks: Number(result[0].active_tasks),
      completedTasks: Number(result[0].completed_tasks),
      estimatedHours: result[0].estimated_hours || 0,
      actualHours: result[0].actual_hours || 0,
    };
  }
}
