// app/server/src/core/audit/AuditService.ts
import { randomUUID } from 'crypto';
import { getPool } from '../db';
import type {
  AuditCategory,
  AuditAction,
  CreateAuditLogParams,
  AuditLogQueryOptions,
  AuditLogListResult,
  AuditLog,
} from '../types/audit.types';

/**
 * 审计日志服务
 *
 * 提供审计日志的记录和查询功能
 * - 异步写入，不阻塞业务操作
 * - 支持字段级变更记录
 */
export class AuditService {
  private static instance: AuditService;
  private writeQueue: Array<() => Promise<void>> = [];
  private isProcessing = false;

  private constructor() {}

  static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  /**
   * 记录审计日志（异步）
   */
  async log(params: CreateAuditLogParams): Promise<void> {
    const logTask = async () => {
      try {
        const pool = getPool();
        const auditId = randomUUID();

        await pool.execute(
          `INSERT INTO audit_logs (
            audit_id, actor_user_id, actor_username, actor_role,
            category, action, table_name, record_id,
            details, before_data, after_data,
            ip_address, user_agent, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            auditId,
            params.userId,
            params.username,
            params.userRole,
            params.category,
            params.action,
            params.tableName,
            params.recordId || null,
            params.details || null,
            params.beforeData ? JSON.stringify(params.beforeData) : null,
            params.afterData ? JSON.stringify(params.afterData) : null,
            params.ipAddress || null,
            params.userAgent || null,
          ]
        );
      } catch (error) {
        console.error('[AuditService] 记录审计日志失败:', error);
      }
    };

    // 加入队列异步处理
    this.writeQueue.push(logTask);
    this.processQueue();
  }

  /**
   * 同步记录审计日志（用于关键操作）
   */
  async logSync(params: CreateAuditLogParams): Promise<void> {
    const pool = getPool();
    const auditId = randomUUID();

    await pool.execute(
      `INSERT INTO audit_logs (
        audit_id, actor_user_id, actor_username, actor_role,
        category, action, table_name, record_id,
        details, before_data, after_data,
        ip_address, user_agent, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        auditId,
        params.userId,
        params.username,
        params.userRole,
        params.category,
        params.action,
        params.tableName,
        params.recordId || null,
        params.details || null,
        params.beforeData ? JSON.stringify(params.beforeData) : null,
        params.afterData ? JSON.stringify(params.afterData) : null,
        params.ipAddress || null,
        params.userAgent || null,
      ]
    );
  }

  /**
   * 处理写入队列
   */
  private processQueue(): void {
    if (this.isProcessing || this.writeQueue.length === 0) return;

    this.isProcessing = true;
    const task = this.writeQueue.shift();

    if (task) {
      task().finally(() => {
        this.isProcessing = false;
        if (this.writeQueue.length > 0) {
          setImmediate(() => this.processQueue());
        }
      });
    }
  }

  /**
   * 查询审计日志
   */
  async query(options: AuditLogQueryOptions): Promise<AuditLogListResult> {
    const pool = getPool();
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (options.category) {
      conditions.push('al.category = ?');
      params.push(options.category);
    }
    if (options.action) {
      conditions.push('al.action = ?');
      params.push(options.action);
    }
    if (options.userId) {
      conditions.push('al.actor_user_id = ?');
      params.push(options.userId);
    }
    if (options.startDate) {
      conditions.push('al.created_at >= ?');
      params.push(options.startDate);
    }
    if (options.endDate) {
      conditions.push('al.created_at <= ?');
      params.push(options.endDate + ' 23:59:59');
    }
    if (options.search) {
      conditions.push('(al.details LIKE ? OR al.actor_username LIKE ?)');
      const searchPattern = `%${options.search}%`;
      params.push(searchPattern, searchPattern);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const page = options.page || 1;
    const pageSize = Math.min(options.pageSize || 50, 200);
    const offset = (page - 1) * pageSize;

    // Count
    const [countRows] = await pool.execute(
      `SELECT COUNT(*) as total FROM audit_logs al ${whereClause}`,
      params
    ) as any[];
    const total = countRows[0].total;

    // Data
    const [rows] = await pool.execute(
      `SELECT
        al.audit_id, al.actor_user_id, al.actor_username, al.actor_role,
        al.category, al.action, al.table_name, al.record_id,
        al.details, al.before_data, al.after_data,
        al.ip_address, al.user_agent, al.created_at
       FROM audit_logs al
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    return {
      items: rows as AuditLog[],
      total,
      page,
      pageSize,
    };
  }

  /**
   * 获取操作类型列表（用于筛选）
   */
  getActionTypes(): Array<{ value: string; label: string; category: string }> {
    return [
      // 安全
      { value: 'LOGIN', label: '登录', category: 'security' },
      { value: 'LOGOUT', label: '登出', category: 'security' },
      { value: 'PASSWORD_CHANGE', label: '修改密码', category: 'security' },
      { value: 'ROLE_CHANGE', label: '角色变更', category: 'security' },
      // 数据操作
      { value: 'CREATE', label: '创建', category: 'data' },
      { value: 'UPDATE', label: '更新', category: 'data' },
      { value: 'DELETE', label: '删除', category: 'data' },
      { value: 'ASSIGN', label: '分配', category: 'data' },
      { value: 'ARCHIVE', label: '归档', category: 'data' },
      { value: 'RESTORE', label: '恢复', category: 'data' },
      // 审批
      { value: 'APPROVE', label: '批准', category: 'workflow' },
      { value: 'REJECT', label: '拒绝', category: 'workflow' },
    ];
  }
}

// 导出单例
export const auditService = AuditService.getInstance();

// 便捷方法
export const audit = {
  log: (params: CreateAuditLogParams) => auditService.log(params),
  logSync: (params: CreateAuditLogParams) => auditService.logSync(params),
  query: (options: AuditLogQueryOptions) => auditService.query(options),
};
