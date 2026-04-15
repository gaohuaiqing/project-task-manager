// app/server/src/modules/collab/repository.ts
import { getPool } from '../../core/db';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import type { DataVersion, Attachment, UploadAttachmentRequest, BatchQueryRequest, OnlineUser } from './types';

interface DataVersionRow extends RowDataPacket, DataVersion {}
interface AttachmentRow extends RowDataPacket, Attachment {}
interface OnlineUserRow extends RowDataPacket, OnlineUser {}

export class CollabRepository {
  // ========== 版本历史 ==========

  async getVersionHistory(tableName: string, recordId: string): Promise<DataVersion[]> {
    const pool = getPool();
    const [rows] = await pool.execute<DataVersionRow[]>(
      `SELECT dv.*, u.real_name as changer_name
       FROM data_versions dv
       LEFT JOIN users u ON dv.changed_by = u.id
       WHERE dv.table_name = ? AND dv.record_id = ?
       ORDER BY dv.version DESC
       LIMIT 50`,
      [tableName, recordId]
    );
    return rows;
  }

  async createVersion(data: { table_name: string; record_id: string; version: number; data: string; changed_by: number }): Promise<void> {
    const pool = getPool();
    await pool.execute(
      'INSERT INTO data_versions (id, table_name, record_id, version, data, changed_by) VALUES (UUID(), ?, ?, ?, ?, ?)',
      [data.table_name, data.record_id, data.version, data.data, data.changed_by]
    );
  }

  // ========== 在线状态 ==========

  async getOnlineUsers(): Promise<OnlineUser[]> {
    const pool = getPool();
    // 基于 sessions 表查询活跃用户
    const [rows] = await pool.execute<OnlineUserRow[]>(
      `SELECT s.user_id, 'online' as status, MAX(s.last_accessed) as last_activity, u.real_name, u.username
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.status = 'active'
         AND s.expires_at > NOW()
       GROUP BY s.user_id, u.real_name, u.username
       ORDER BY last_activity DESC`
    );
    return rows;
  }

  async updateUserStatus(userId: number, status: 'online' | 'away' | 'offline'): Promise<void> {
    const pool = getPool();
    await pool.execute(
      `INSERT INTO online_users (user_id, status, last_activity) VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE status = VALUES(status), last_activity = NOW()`,
      [userId, status]
    );
  }

  async setOffline(userId: number): Promise<void> {
    const pool = getPool();
    await pool.execute(
      "UPDATE online_users SET status = 'offline' WHERE user_id = ?",
      [userId]
    );
  }

  // ========== 附件管理 ==========

  async getAttachments(taskId: string): Promise<Attachment[]> {
    const pool = getPool();
    const [rows] = await pool.execute<AttachmentRow[]>(
      `SELECT a.*, u.real_name as uploader_name
       FROM attachments a
       LEFT JOIN users u ON a.uploaded_by = u.id
       WHERE a.task_id = ?
       ORDER BY a.created_at DESC`,
      [taskId]
    );
    return rows;
  }

  async createAttachment(data: UploadAttachmentRequest & { id: string; uploaded_by: number }): Promise<string> {
    const pool = getPool();
    await pool.execute(
      'INSERT INTO attachments (id, task_id, file_name, file_path, file_size, mime_type, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [data.id, data.task_id, data.file_name, data.file_path, data.file_size, data.mime_type || null, data.uploaded_by]
    );
    return data.id;
  }

  async deleteAttachment(id: string): Promise<boolean> {
    const pool = getPool();
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM attachments WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  // ========== 批量查询 ==========

  async batchQueryProjects(ids: string[]): Promise<unknown[]> {
    if (ids.length === 0) return [];
    const pool = getPool();
    const placeholders = ids.map(() => '?').join(',');
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM projects WHERE id IN (${placeholders})`,
      ids
    );
    return rows;
  }

  async batchQueryMembers(ids: number[]): Promise<unknown[]> {
    if (ids.length === 0) return [];
    const pool = getPool();
    const placeholders = ids.map(() => '?').join(',');
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, username, real_name, role, department_id, email, phone, is_active FROM users WHERE id IN (${placeholders})`,
      ids
    );
    return rows;
  }

  async batchQueryTasks(ids: string[]): Promise<unknown[]> {
    if (ids.length === 0) return [];
    const pool = getPool();
    const placeholders = ids.map(() => '?').join(',');
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM wbs_tasks WHERE id IN (${placeholders})`,
      ids
    );
    return rows;
  }

  async mixedBatchQuery(request: BatchQueryRequest): Promise<{ projects?: unknown[]; members?: unknown[]; tasks?: unknown[] }> {
    const result: { projects?: unknown[]; members?: unknown[]; tasks?: unknown[] } = {};

    if (request.projects && request.projects.length > 0) {
      result.projects = await this.batchQueryProjects(request.projects);
    }
    if (request.members && request.members.length > 0) {
      result.members = await this.batchQueryMembers(request.members);
    }
    if (request.tasks && request.tasks.length > 0) {
      result.tasks = await this.batchQueryTasks(request.tasks);
    }

    return result;
  }

  // ========== 审计日志 ==========

  async createAuditLog(data: {
    user_id: number;
    action: string;
    table_name: string;
    record_id: string;
    old_value?: string;
    new_value?: string;
    ip_address?: string;
  }): Promise<void> {
    const pool = getPool();
    await pool.execute(
      'INSERT INTO audit_logs (audit_id, actor_user_id, action, table_name, record_id, old_value, new_value, ip_address, created_at) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, NOW())',
      [data.user_id, data.action, data.table_name, data.record_id, data.old_value || null, data.new_value || null, data.ip_address || null]
    );
  }

  async getAuditLogs(options?: {
    user_id?: number;
    action?: string;
    table_name?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: unknown[]; total: number }> {
    const pool = getPool();
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (options?.user_id) {
      conditions.push('al.actor_user_id = ?');
      params.push(options.user_id);
    }
    if (options?.action) {
      conditions.push('al.action = ?');
      params.push(options.action);
    }
    if (options?.table_name) {
      conditions.push('al.table_name = ?');
      params.push(options.table_name);
    }
    if (options?.start_date) {
      conditions.push('al.created_at >= ?');
      params.push(options.start_date);
    }
    if (options?.end_date) {
      conditions.push('al.created_at <= ?');
      params.push(options.end_date);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count
    const [countRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM audit_logs al ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    // Data
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 50;
    const offset = (page - 1) * pageSize;

    // 注意：LIMIT/OFFSET 直接拼接数值，避免 mysql2 prepared statement 类型问题
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT al.*, u.real_name as user_name
       FROM audit_logs al
       LEFT JOIN users u ON al.actor_user_id = u.id
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT ${pageSize} OFFSET ${offset}`,
      params
    );

    return { items: rows, total };
  }
}
