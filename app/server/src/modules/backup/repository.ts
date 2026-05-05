// app/server/src/modules/backup/repository.ts
import { getPool } from '../../core/db';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import type {
  BackupConfig,
  BackupRecord,
  CreateBackupRecordDTO,
  UpdateBackupConfigDTO,
  PaginatedResult,
  DataSnapshot,
} from './types';

interface BackupConfigRow extends RowDataPacket, BackupConfig {}
interface BackupRecordRow extends RowDataPacket, BackupRecord {}

export class BackupRepository {
  // ========== 配置管理 ==========

  /**
   * 获取备份配置（单行）
   */
  async getConfig(): Promise<BackupConfig | null> {
    const pool = getPool();
    const [rows] = await pool.execute<BackupConfigRow[]>(
      'SELECT * FROM backup_config LIMIT 1'
    );
    return rows[0] || null;
  }

  /**
   * 更新备份配置
   */
  async updateConfig(data: UpdateBackupConfigDTO): Promise<BackupConfig | null> {
    const pool = getPool();

    const fields: string[] = [];
    const values: (string | number | boolean | null)[] = [];

    if (data.backup_interval !== undefined) {
      fields.push('backup_interval = ?');
      values.push(data.backup_interval);
    }
    if (data.target_path !== undefined) {
      fields.push('target_path = ?');
      values.push(data.target_path);
    }
    if (data.retention_count !== undefined) {
      fields.push('retention_count = ?');
      values.push(data.retention_count);
    }
    if (data.backup_format !== undefined) {
      fields.push('backup_format = ?');
      values.push(data.backup_format);
    }
    if (data.remote_type !== undefined) {
      fields.push('remote_type = ?');
      values.push(data.remote_type);
    }
    if (data.remote_host !== undefined) {
      fields.push('remote_host = ?');
      values.push(data.remote_host);
    }
    if (data.remote_port !== undefined) {
      fields.push('remote_port = ?');
      values.push(data.remote_port);
    }
    if (data.remote_username !== undefined) {
      fields.push('remote_username = ?');
      values.push(data.remote_username);
    }
    // 注意：密码需要在 service 层加密后传入
    if (data.remote_password !== undefined) {
      fields.push('remote_password_encrypted = ?');
      values.push(data.remote_password);
    }
    if (data.enabled !== undefined) {
      fields.push('enabled = ?');
      values.push(data.enabled);
    }

    if (fields.length === 0) {
      return this.getConfig();
    }

    await pool.execute(
      `UPDATE backup_config SET ${fields.join(', ')}`,
      values
    );

    return this.getConfig();
  }

  /**
   * 初始化默认配置（如果不存在）
   */
  async initDefaultConfig(): Promise<void> {
    const pool = getPool();
    const [existing] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM backup_config'
    );
    if (existing[0].count === 0) {
      await pool.execute(
        `INSERT INTO backup_config (id, backup_interval, target_path, retention_count, backup_format, enabled)
         VALUES (UUID(), 'daily', './backups/', 10, 'both', true)`
      );
    }
  }

  // ========== 记录管理 ==========

  /**
   * 创建备份记录
   */
  async createRecord(data: CreateBackupRecordDTO & { id: string }): Promise<string> {
    const pool = getPool();
    await pool.execute(
      `INSERT INTO backup_records (id, backup_time, backup_type, file_format, status, operator_id)
       VALUES (?, NOW(), ?, ?, 'running', ?)`,
      [data.id, data.backup_type, data.file_format, data.operator_id || null]
    );
    return data.id;
  }

  /**
   * 更新备份记录状态
   */
  async updateRecordStatus(
    id: string,
    status: 'pending' | 'running' | 'success' | 'failed',
    data?: {
      sql_file_path?: string;
      excel_file_path?: string;
      file_size_bytes?: number;
      error_message?: string;
      data_snapshot?: DataSnapshot;
    }
  ): Promise<boolean> {
    const pool = getPool();

    const fields: string[] = ['status = ?'];
    const values: (string | number | null)[] = [status];

    if (data?.sql_file_path !== undefined) {
      fields.push('sql_file_path = ?');
      values.push(data.sql_file_path);
    }
    if (data?.excel_file_path !== undefined) {
      fields.push('excel_file_path = ?');
      values.push(data.excel_file_path);
    }
    if (data?.file_size_bytes !== undefined) {
      fields.push('file_size_bytes = ?');
      values.push(data.file_size_bytes);
    }
    if (data?.error_message !== undefined) {
      fields.push('error_message = ?');
      values.push(data.error_message);
    }
    if (data?.data_snapshot !== undefined) {
      fields.push('data_snapshot = ?');
      values.push(JSON.stringify(data.data_snapshot) as string);
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE backup_records SET ${fields.join(', ')} WHERE id = ?`,
      [...values, id]
    );
    return result.affectedRows > 0;
  }

  /**
   * 获取备份记录列表（分页）
   */
  async getRecords(page: number, limit: number): Promise<PaginatedResult<BackupRecord>> {
    const pool = getPool();
    const offset = (page - 1) * limit;

    // 总数
    const [countRows] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM backup_records'
    );
    const total = countRows[0].total;

    // 数据
    const [rows] = await pool.query<BackupRecordRow[]>(
      `SELECT br.*, u.real_name as operator_name
       FROM backup_records br
       LEFT JOIN users u ON br.operator_id = u.id
       ORDER BY br.backup_time DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    // 解析 data_snapshot JSON（MySQL2 可能返回对象或字符串）
    const items = rows.map(row => ({
      ...row,
      data_snapshot: row.data_snapshot
        ? (typeof row.data_snapshot === 'string' ? JSON.parse(row.data_snapshot) : row.data_snapshot)
        : null,
    }));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 获取备份记录详情
   */
  async getRecordById(id: string): Promise<BackupRecord | null> {
    const pool = getPool();
    const [rows] = await pool.execute<BackupRecordRow[]>(
      `SELECT br.*, u.real_name as operator_name
       FROM backup_records br
       LEFT JOIN users u ON br.operator_id = u.id
       WHERE br.id = ?`,
      [id]
    );
    if (!rows[0]) return null;

    return {
      ...rows[0],
      data_snapshot: rows[0].data_snapshot
        ? (typeof rows[0].data_snapshot === 'string' ? JSON.parse(rows[0].data_snapshot) : rows[0].data_snapshot)
        : null,
    };
  }

  /**
   * 删除备份记录
   */
  async deleteRecord(id: string): Promise<boolean> {
    const pool = getPool();
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM backup_records WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  /**
   * 检查是否有正在运行的备份
   */
  async hasRunningBackup(): Promise<boolean> {
    const pool = getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      "SELECT 1 FROM backup_records WHERE status = 'running' LIMIT 1"
    );
    return rows.length > 0;
  }

  /**
   * 获取超出保留数量的旧备份记录
   */
  async getOldRecords(retentionCount: number): Promise<BackupRecord[]> {
    const pool = getPool();
    const [rows] = await pool.execute<BackupRecordRow[]>(
      `SELECT * FROM backup_records
       WHERE status = 'success'
       ORDER BY backup_time DESC
       LIMIT 1000 OFFSET ?`,
      [retentionCount]
    );
    return rows;
  }

  // ========== 数据统计 ==========

  /**
   * 获取数据快照统计
   */
  async getDataSnapshot(): Promise<DataSnapshot> {
    const pool = getPool();

    const stats = await Promise.all([
      this.getTableCount('projects'),
      this.getTableCount('wbs_tasks'),
      this.getTableCount('users'),
      this.getTableCount('departments'),
    ]);

    return {
      total_projects: stats[0],
      total_tasks: stats[1],
      total_users: stats[2],
      total_departments: stats[3],
      backup_tables: [
        'users', 'departments', 'projects', 'wbs_tasks', 'progress_records',
        'plan_changes', 'delay_records', 'notifications', 'capability_models',
        'member_capabilities', 'timelines', 'timeline_tasks',
      ],
    };
  }

  private async getTableCount(tableName: string): Promise<number> {
    const pool = getPool();
    try {
      // 使用参数化查询防止 SQL 注入
      // 注意：表名不能参数化，但此方法仅内部调用，表名来自硬编码
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT COUNT(*) as count FROM ??`,
        [tableName]
      );
      return rows[0].count;
    } catch {
      return 0;
    }
  }
}