/**
 * UserRepository - 用户数据访问层
 *
 * 提供用户相关的数据访问操作
 */

import { BaseRepository, type QueryOptions } from './BaseRepository.js';
import type { DatabaseService } from '../services/DatabaseService.js';
import type { User, UserRole } from '../../../shared/types/index.js';

/**
 * 用户查询选项
 */
export interface UserQueryOptions extends QueryOptions {
  /** 按角色筛选 */
  role?: UserRole[];
  /** 是否包含关联的成员信息 */
  includeMember?: boolean;
  /** 搜索关键词（用户名或姓名） */
  searchKeyword?: string;
}

/**
 * 用户统计信息
 */
export interface UserStats {
  total: number;
  byRole: Record<UserRole, number>;
  active: number; // 有活跃会话的用户
  withMember: number;
  withoutMember: number;
}

/**
 * 带成员信息的用户
 */
export interface UserWithMember extends User {
  member?: {
    id: number;
    name: string;
    employeeId: string | null;
    department: string | null;
    position: string | null;
  };
}

/**
 * UserRepository类
 */
export class UserRepository extends BaseRepository<User> {
  constructor(db: DatabaseService) {
    super(db);
  }

  /**
   * 获取表名
   */
  getTableName(): string {
    return 'users';
  }

  /**
   * 将数据库行映射为User实体
   */
  mapToEntity(row: Record<string, unknown>): User {
    return {
      id: row.id as number,
      username: row.username as string,
      password: row.password as string,
      role: row.role as UserRole,
      name: row.name as string,
      createdBy: row.created_by as number | null,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
      deletedAt: row.deleted_at as Date | null,
    };
  }

  /**
   * 将User实体映射为数据库行
   */
  mapToRow(user: Partial<User>): Record<string, unknown> {
    const row: Record<string, unknown> = {};

    if (user.username !== undefined) row.username = user.username;
    if (user.password !== undefined) row.password = user.password;
    if (user.role !== undefined) row.role = user.role;
    if (user.name !== undefined) row.name = user.name;
    if (user.createdBy !== undefined) row.created_by = user.createdBy;

    return row;
  }

  /**
   * 根据用户名查找
   */
  async findByUsername(username: string): Promise<User | null> {
    const sql = `SELECT * FROM ${this.getTableName()} WHERE username = ? AND deleted_at IS NULL`;
    const rows = await this.db.query(sql, [username]) as Record<string, unknown>[];

    if (rows.length === 0) {
      return null;
    }

    return this.mapToEntity(rows[0]);
  }

  /**
   * 检查用户名是否存在
   */
  async usernameExists(username: string, excludeId?: number): Promise<boolean> {
    let sql = `SELECT 1 FROM ${this.getTableName()} WHERE username = ? AND deleted_at IS NULL`;
    const params: unknown[] = [username];

    if (excludeId !== undefined) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }

    const result = await this.db.query(sql, params) as unknown[];
    return result.length > 0;
  }

  /**
   * 查询用户（带筛选）
   */
  async findUsers(options: UserQueryOptions = {}): Promise<User[]> {
    const {
      role,
      includeMember = false,
      searchKeyword,
      orderBy = 'username',
      orderDirection = 'ASC',
    } = options;

    let sql = includeMember
      ? `SELECT u.*, m.id as member_id, m.name as member_name, m.employee_id, m.department, m.position
         FROM ${this.getTableName()} u
         LEFT JOIN members m ON u.id = m.user_id AND m.deleted_at IS NULL
         WHERE u.deleted_at IS NULL`
      : `SELECT * FROM ${this.getTableName()} WHERE deleted_at IS NULL`;

    const params: unknown[] = [];

    if (role && role.length > 0) {
      sql += ` AND u.role IN (${role.map(() => '?').join(',')})`;
      params.push(...role);
    }

    if (searchKeyword) {
      sql += ' AND (u.username LIKE ? OR u.name LIKE ?)';
      params.push(`%${searchKeyword}%`, `%${searchKeyword}%`);
    }

    sql += ` ORDER BY u.${orderBy} ${orderDirection}`;

    const rows = await this.db.query(sql, params) as Record<string, unknown>[];

    return rows.map(row => this.mapToEntity(row));
  }

  /**
   * 获取用户统计信息
   */
  async getUserStats(): Promise<UserStats> {
    // 总数和角色统计
    const roleResult = await this.db.query(
      `SELECT role, COUNT(*) as count FROM ${this.getTableName()} WHERE deleted_at IS NULL GROUP BY role`
    ) as { role: UserRole; count: bigint }[];

    const byRole: Record<UserRole, number> = {
      admin: 0,
      tech_manager: 0,
      dept_manager: 0,
      engineer: 0,
    };

    let total = 0;
    for (const row of roleResult) {
      byRole[row.role] = Number(row.count);
      total += Number(row.count);
    }

    // 活跃用户统计（有活跃会话）
    const activeResult = await this.db.query(
      `SELECT COUNT(DISTINCT s.user_id) as active
       FROM sessions s
       WHERE s.status = 'active' AND s.expires_at > NOW()`
    ) as { active: bigint }[];

    // 成员关联统计
    const memberResult = await this.db.query(
      `SELECT
        COUNT(CASE WHEN m.id IS NOT NULL THEN 1 END) as with_member,
        COUNT(CASE WHEN m.id IS NULL THEN 1 END) as without_member
       FROM ${this.getTableName()} u
       LEFT JOIN members m ON u.id = m.user_id AND m.deleted_at IS NULL
       WHERE u.deleted_at IS NULL`
    ) as { with_member: bigint; without_member: bigint }[];

    return {
      total,
      byRole,
      active: Number(activeResult[0].active),
      withMember: Number(memberResult[0].with_member),
      withoutMember: Number(memberResult[0].without_member),
    };
  }

  /**
   * 验证用户密码
   */
  async verifyPassword(username: string, password: string): Promise<User | null> {
    const user = await this.findByUsername(username);
    if (!user) {
      return null;
    }

    // 密码验证应该在外部使用 bcrypt 完成
    // 这里只返回用户信息
    return user;
  }

  /**
   * 更新密码
   */
  async updatePassword(userId: number, hashedPassword: string): Promise<void> {
    const sql = `
      UPDATE ${this.getTableName()}
      SET password = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND deleted_at IS NULL
    `;
    await this.db.query(sql, [hashedPassword, userId]);
  }

  /**
   * 更新角色
   */
  async updateRole(userId: number, role: UserRole): Promise<void> {
    const sql = `
      UPDATE ${this.getTableName()}
      SET role = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND deleted_at IS NULL
    `;
    await this.db.query(sql, [role, userId]);
  }

  /**
   * 获取用户的所有会话
   */
  async getUserSessions(userId: number): Promise<{
    sessionId: string;
    deviceId: string;
    deviceInfo: string | null;
    ipAddress: string | null;
    status: 'active' | 'terminated';
    lastAccessed: number;
    expiresAt: number;
  }[]> {
    const sql = `
      SELECT session_id, device_id, device_info, ip_address, status, last_accessed, expires_at
      FROM sessions
      WHERE user_id = ?
      ORDER BY last_accessed DESC
    `;

    const rows = await this.db.query(sql, [userId]) as Record<string, unknown>[];

    return rows.map(row => ({
      sessionId: row.session_id as string,
      deviceId: row.device_id as string,
      deviceInfo: row.device_info as string | null,
      ipAddress: row.ip_address as string | null,
      status: row.status as 'active' | 'terminated',
      lastAccessed: row.last_accessed as number,
      expiresAt: row.expires_at as number,
    }));
  }

  /**
   * 终止用户的所有会话
   */
  async terminateAllSessions(userId: number): Promise<number> {
    const sql = `
      UPDATE sessions
      SET status = 'terminated',
          termination_reason = 'admin_termination',
          termination_timestamp = UNIX_TIMESTAMP() * 1000
      WHERE user_id = ? AND status = 'active'
    `;

    const result = await this.db.query(sql, [userId]) as { affectedRows: number };
    return result.affectedRows;
  }

  /**
   * 搜索用户
   */
  async search(keyword: string, limit: number = 20): Promise<User[]> {
    const sql = `
      SELECT * FROM ${this.getTableName()}
      WHERE deleted_at IS NULL
        AND (username LIKE ? OR name LIKE ?)
      ORDER BY username ASC
      LIMIT ?
    `;

    const rows = await this.db.query(sql, [`%${keyword}%`, `%${keyword}%`, limit]) as Record<string, unknown>[];

    return rows.map(row => this.mapToEntity(row));
  }

  /**
   * 获取有权限的用户列表
   */
  async findByRole(role: UserRole): Promise<User[]> {
    return this.findUsers({ role: [role] });
  }

  /**
   * 获取管理员用户
   */
  async findAdmins(): Promise<User[]> {
    return this.findByRole('admin');
  }

  /**
   * 获取技术经理
   */
  async findTechManagers(): Promise<User[]> {
    return this.findByRole('tech_manager');
  }

  /**
   * 获取部门经理
   */
  async findDeptManagers(): Promise<User[]> {
    return this.findByRole('dept_manager');
  }

  /**
   * 获取工程师
   */
  async findEngineers(): Promise<User[]> {
    return this.findByRole('engineer');
  }
}
