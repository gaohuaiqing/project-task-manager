// app/server/src/modules/auth/repository.ts
import { getPool } from '../../core/db';
import type { RowDataPacket } from 'mysql2/promise';
import type { User, Session, Permission } from '../../core/types';
import type { UserListOptions, CreateUserRequest, UpdateUserRequest } from './types';

interface UserRow extends RowDataPacket, User {
  password: string;
  login_attempts: number;
  locked_until: Date | null;
}

interface SessionRow extends RowDataPacket, Session {}
interface PermissionRow extends RowDataPacket { permission: Permission }
interface CountRow extends RowDataPacket { count: number }

export class AuthRepository {
  async findByUsername(username: string): Promise<UserRow | null> {
    const pool = getPool();
    // 查询用户，优先检查 is_active，如果字段不存在则忽略
    try {
      const [rows] = await pool.execute<UserRow[]>(
        'SELECT * FROM users WHERE username = ? AND (is_active = 1 OR is_active IS NULL)',
        [username]
      );
      return rows[0] || null;
    } catch (error: any) {
      // 如果 is_active 字段不存在，使用不带 is_active 的查询
      if (error.code === 'ER_BAD_FIELD_ERROR') {
        const [rows] = await pool.execute<UserRow[]>(
          'SELECT * FROM users WHERE username = ?',
          [username]
        );
        return rows[0] || null;
      }
      throw error;
    }
  }

  async findById(userId: number): Promise<User | null> {
    const pool = getPool();
    const [rows] = await pool.execute<UserRow[]>(
      'SELECT id, username, real_name, role, department_id, email, phone, is_active, created_at, updated_at FROM users WHERE id = ?',
      [userId]
    );
    return rows[0] || null;
  }

  async createSession(session: {
    id: string;
    user_id: number;
    ip_address: string | null;
    user_agent: string | null;
    expires_at: Date;
  }): Promise<string> {
    const pool = getPool();
    // 使用 session_id 字段存储 UUID，id 是自增字段
    await pool.execute(
      'INSERT INTO sessions (session_id, user_id, ip_address, user_agent, expires_at, status, created_at, last_accessed) VALUES (?, ?, ?, ?, ?, ?, UNIX_TIMESTAMP(), UNIX_TIMESTAMP())',
      [session.id, session.user_id, session.ip_address, session.user_agent, session.expires_at, 'active']
    );
    return session.id;
  }

  async findSession(sessionId: string): Promise<Session | null> {
    const pool = getPool();
    // 使用 session_id 查找，检查状态和过期时间
    const [rows] = await pool.execute<SessionRow[]>(
      "SELECT * FROM sessions WHERE session_id = ? AND status = 'active' AND expires_at > UNIX_TIMESTAMP()",
      [sessionId]
    );
    return rows[0] || null;
  }

  async terminateSession(sessionId: string, reason: string): Promise<void> {
    const pool = getPool();
    await pool.execute(
      "UPDATE sessions SET status = 'terminated', termination_reason = ?, terminated_at = NOW() WHERE session_id = ?",
      [reason, sessionId]
    );
  }

  async getPermissionsByRole(role: string): Promise<Permission[]> {
    const pool = getPool();
    const [rows] = await pool.execute<PermissionRow[]>(
      'SELECT permission FROM permissions_config WHERE role = ? AND is_enabled = 1',
      [role]
    );
    return rows.map(r => r.permission);
  }

  async updateLoginAttempts(userId: number, attempts: number, lockedUntil: Date | null): Promise<void> {
    const pool = getPool();
    await pool.execute(
      'UPDATE users SET login_attempts = ?, locked_until = ? WHERE id = ?',
      [attempts, lockedUntil, userId]
    );
  }

  // ========== 用户管理 ==========

  async getUsers(options: UserListOptions): Promise<{ items: User[]; total: number }> {
    const pool = getPool();
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    const offset = (page - 1) * pageSize;

    const conditions: string[] = [];
    const params: any[] = [];

    if (options.role) {
      conditions.push('role = ?');
      params.push(options.role);
    }
    if (options.department_id) {
      conditions.push('department_id = ?');
      params.push(options.department_id);
    }
    if (options.is_active !== undefined) {
      conditions.push('is_active = ?');
      params.push(options.is_active ? 1 : 0);
    }
    if (options.search) {
      conditions.push('(username LIKE ? OR real_name LIKE ?)');
      const searchPattern = `%${options.search}%`;
      params.push(searchPattern, searchPattern);
    }
    if (options.excludeBuiltin) {
      conditions.push('(is_builtin = 0 OR is_builtin IS NULL)');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 查询总数
    const [countRows] = await pool.execute<CountRow[]>(
      `SELECT COUNT(*) as count FROM users ${whereClause}`,
      params
    );
    const total = countRows[0].count;

    // 查询列表
    // 注意：LIMIT/OFFSET 使用模板字符串直接拼接，因为 pageSize 和 offset 是内部计算的数值，安全可控
    // mysql2 的 prepared statement 对 LIMIT 参数类型处理有问题
    const [rows] = await pool.execute<UserRow[]>(
      `SELECT id, username, real_name, role, department_id, email, phone, is_active, created_at, updated_at
       FROM users ${whereClause}
       ORDER BY created_at DESC
       LIMIT ${pageSize} OFFSET ${offset}`,
      params
    );

    return { items: rows, total };
  }

  async createUser(data: CreateUserRequest & { password: string }): Promise<number> {
    const pool = getPool();
    const [result] = await pool.execute(
      `INSERT INTO users (username, password, name, real_name, role, department_id, email, phone, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
      [data.username, data.password, data.real_name, data.real_name, data.role, data.department_id || null, data.email || null, data.phone || null]
    );
    return (result as any).insertId;
  }

  async updateUser(userId: number, data: UpdateUserRequest): Promise<boolean> {
    const pool = getPool();
    const fields: string[] = [];
    const params: any[] = [];

    if (data.real_name !== undefined) {
      fields.push('real_name = ?');
      params.push(data.real_name);
    }
    if (data.role !== undefined) {
      fields.push('role = ?');
      params.push(data.role);
    }
    if (data.department_id !== undefined) {
      fields.push('department_id = ?');
      params.push(data.department_id);
    }
    if (data.email !== undefined) {
      fields.push('email = ?');
      params.push(data.email);
    }
    if (data.phone !== undefined) {
      fields.push('phone = ?');
      params.push(data.phone);
    }
    if (data.is_active !== undefined) {
      fields.push('is_active = ?');
      params.push(data.is_active ? 1 : 0);
    }

    if (fields.length === 0) return false;

    fields.push('updated_at = NOW()');
    params.push(userId);

    await pool.execute(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      params
    );
    return true;
  }

  async softDeleteUser(userId: number): Promise<boolean> {
    const pool = getPool();
    await pool.execute(
      'UPDATE users SET is_active = 0, updated_at = NOW() WHERE id = ?',
      [userId]
    );
    return true;
  }

  async updatePassword(userId: number, hashedPassword: string): Promise<void> {
    const pool = getPool();
    await pool.execute(
      'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
      [hashedPassword, userId]
    );
  }

  async usernameExists(username: string, excludeUserId?: number): Promise<boolean> {
    const pool = getPool();
    if (excludeUserId) {
      const [rows] = await pool.execute<CountRow[]>(
        'SELECT COUNT(*) as count FROM users WHERE username = ? AND id != ?',
        [username, excludeUserId]
      );
      return rows[0].count > 0;
    } else {
      const [rows] = await pool.execute<CountRow[]>(
        'SELECT COUNT(*) as count FROM users WHERE username = ?',
        [username]
      );
      return rows[0].count > 0;
    }
  }

  // ========== 会话管理增强 ==========

  /**
   * 统计用户的活跃会话数量
   */
  async countActiveSessionsByUser(userId: number): Promise<number> {
    const pool = getPool();
    const [rows] = await pool.execute<CountRow[]>(
      "SELECT COUNT(*) as count FROM sessions WHERE user_id = ? AND status = 'active' AND expires_at > UNIX_TIMESTAMP()",
      [userId]
    );
    return rows[0].count;
  }

  /**
   * 获取用户的活跃会话列表
   */
  async getActiveSessionsByUser(userId: number): Promise<Session[]> {
    const pool = getPool();
    const [rows] = await pool.execute<SessionRow[]>(
      "SELECT * FROM sessions WHERE user_id = ? AND status = 'active' AND expires_at > UNIX_TIMESTAMP() ORDER BY last_accessed ASC",
      [userId]
    );
    return rows;
  }

  /**
   * 更新会话的最后访问时间
   */
  async updateSessionLastAccessed(sessionId: string): Promise<void> {
    const pool = getPool();
    await pool.execute(
      "UPDATE sessions SET last_accessed = UNIX_TIMESTAMP() WHERE session_id = ?",
      [sessionId]
    );
  }

  /**
   * 批量终止会话
   */
  async terminateSessions(sessionIds: string[], reason: string): Promise<void> {
    if (sessionIds.length === 0) return;

    const pool = getPool();
    const placeholders = sessionIds.map(() => '?').join(',');
    await pool.execute(
      `UPDATE sessions SET status = 'terminated', termination_reason = ?, terminated_at = NOW() WHERE session_id IN (${placeholders})`,
      [reason, ...sessionIds]
    );
  }

  /**
   * 续期会话
   */
  async renewSession(sessionId: string, newExpiresAt: Date): Promise<void> {
    const pool = getPool();
    await pool.execute(
      "UPDATE sessions SET expires_at = ?, last_accessed = UNIX_TIMESTAMP() WHERE session_id = ? AND status = 'active'",
      [newExpiresAt, sessionId]
    );
  }

  /**
   * 获取会话详情（包含用户信息）
   */
  async getSessionWithUser(sessionId: string): Promise<{ session: Session; user: User } | null> {
    const pool = getPool();
    const [rows] = await pool.execute<
      (RowDataPacket & { session: Session; user: User })[]
    >(
      `SELECT s.*, u.id as user_id, u.username, u.real_name, u.role, u.department_id, u.email, u.phone, u.is_active, u.created_at, u.updated_at
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.session_id = ? AND s.status = 'active' AND s.expires_at > UNIX_TIMESTAMP()`,
      [sessionId]
    );

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      session: {
        id: row.session.id,
        session_id: row.session.session_id,
        user_id: row.session.user_id,
        ip_address: row.session.ip_address,
        user_agent: row.session.user_agent,
        expires_at: row.session.expires_at,
        status: row.session.status,
        created_at: row.session.created_at,
        last_accessed: row.session.last_accessed,
        termination_reason: row.session.termination_reason,
        terminated_at: row.session.terminated_at,
      },
      user: {
        id: row.user_id,
        username: row.username,
        real_name: row.real_name,
        role: row.role,
        gender: row.gender,
        department_id: row.department_id,
        email: row.email,
        phone: row.phone,
        is_active: row.is_active,
        is_builtin: row.is_builtin,
        deleted_at: row.deleted_at,
        deleted_by: row.deleted_by,
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
    };
  }
}
