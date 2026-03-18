// app/server/src/modules/auth/repository.ts
import { getPool } from '../../core/db';
import type { RowDataPacket } from 'mysql2/promise';
import type { User, Session, Permission } from '../../core/types';

interface UserRow extends RowDataPacket, User {
  password: string;
  login_attempts: number;
  locked_until: Date | null;
}

interface SessionRow extends RowDataPacket, Session {}
interface PermissionRow extends RowDataPacket { permission: Permission }

export class AuthRepository {
  async findByUsername(username: string): Promise<UserRow | null> {
    const pool = getPool();
    const [rows] = await pool.execute<UserRow[]>(
      'SELECT * FROM users WHERE username = ? AND is_active = 1',
      [username]
    );
    return rows[0] || null;
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
    await pool.execute(
      'INSERT INTO sessions (id, user_id, ip_address, user_agent, expires_at) VALUES (?, ?, ?, ?, ?)',
      [session.id, session.user_id, session.ip_address, session.user_agent, session.expires_at]
    );
    return session.id;
  }

  async findSession(sessionId: string): Promise<Session | null> {
    const pool = getPool();
    const [rows] = await pool.execute<SessionRow[]>(
      'SELECT * FROM sessions WHERE id = ? AND terminated_at IS NULL AND expires_at > NOW()',
      [sessionId]
    );
    return rows[0] || null;
  }

  async terminateSession(sessionId: string, reason: string): Promise<void> {
    const pool = getPool();
    await pool.execute(
      'UPDATE sessions SET terminated_at = NOW(), termination_reason = ? WHERE id = ?',
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
}
