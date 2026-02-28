/**
 * 操作审计日志服务
 *
 * 职责：
 * 1. 记录关键业务操作（任务分配、项目创建、权限变更等）
 * 2. 提供不可篡改的审计日志
 * 3. 支持审计日志查询和导出
 * 4. 提供操作统计分析
 *
 * 与 SystemLogger 的区别：
 * - SystemLogger: 记录系统运行日志、错误、性能等
 * - AuditLogService: 专注于业务操作的合规性审计
 */

import { v4 as uuidv4 } from 'uuid';
import { databaseService } from './DatabaseService';

// ================================================================
// 类型定义
// ================================================================

/**
 * 审计操作类型
 */
export type AuditOperationType =
  // 用户管理
  | 'user_create'
  | 'user_update'
  | 'user_delete'
  | 'user_role_change'
  | 'user_password_reset'
  // 项目管理
  | 'project_create'
  | 'project_update'
  | 'project_delete'
  | 'project_status_change'
  | 'project_member_add'
  | 'project_member_remove'
  // 任务管理
  | 'task_create'
  | 'task_update'
  | 'task_delete'
  | 'task_assign'
  | 'task_status_change'
  | 'task_date_change'
  | 'task_approve'
  | 'task_reject'
  | 'task_move'
  // WBS 操作
  | 'wbs_node_create'
  | 'wbs_node_update'
  | 'wbs_node_delete'
  | 'wbs_node_move'
  | 'wbs_hierarchy_change'
  // 权限管理
  | 'permission_config_update'
  | 'permission_grant'
  | 'permission_revoke'
  // 组织架构
  | 'department_create'
  | 'department_update'
  | 'department_delete'
  | 'tech_group_create'
  | 'tech_group_update'
  | 'tech_group_delete'
  // 系统配置
  | 'system_config_update'
  | 'holiday_update'
  | 'task_type_update'
  // 认证
  | 'login_success'
  | 'login_failure'
  | 'logout'
  | 'session_terminated'
  // 数据变更
  | 'data_conflict'
  | 'data_merge'
  | 'data_rollback';

/**
 * 审计操作结果
 */
export type AuditResult = 'success' | 'failure' | 'partial' | 'conflict';

/**
 * 审计日志条目
 */
export interface AuditLogEntry {
  /** 日志唯一标识 */
  auditId: string;
  /** 操作类型 */
  operationType: AuditOperationType;
  /** 操作结果 */
  result: AuditResult;
  /** 操作者用户ID */
  actorUserId?: number;
  /** 操作者用户名 */
  actorUsername?: string;
  /** 操作者角色 */
  actorRole?: string;
  /** 目标实体类型（如 task, project, user） */
  targetType?: string;
  /** 目标实体ID */
  targetId?: string | number;
  /** 目标实体名称 */
  targetName?: string;
  /** 操作详情（JSON格式） */
  details?: any;
  /** 操作前的数据 */
  beforeData?: any;
  /** 操作后的数据 */
  afterData?: any;
  /** 关联的操作ID（用于关联多个操作） */
  relatedOperationId?: string;
  /** 操作原因/备注 */
  reason?: string;
  /** IP地址 */
  ipAddress?: string;
  /** User Agent */
  userAgent?: string;
  /** 会话ID */
  sessionId?: string;
  /** 操作时间戳 */
  timestamp: number;
  /** 服务器节点标识（用于多服务器部署） */
  serverNode?: string;
}

/**
 * 审计日志查询选项
 */
export interface AuditQueryOptions {
  /** 操作类型 */
  operationType?: AuditOperationType | AuditOperationType[];
  /** 操作结果 */
  result?: AuditResult;
  /** 操作者用户ID */
  actorUserId?: number;
  /** 操作者用户名 */
  actorUsername?: string;
  /** 目标实体类型 */
  targetType?: string;
  /** 目标实体ID */
  targetId?: string | number;
  /** 关联操作ID */
  relatedOperationId?: string;
  /** 开始时间 */
  startTime?: Date;
  /** 结束时间 */
  endTime?: Date;
  /** 关键词搜索 */
  keyword?: string;
  /** 分页偏移 */
  offset?: number;
  /** 每页数量 */
  limit?: number;
  /** 排序字段 */
  sortBy?: 'timestamp' | 'operationType' | 'actorUsername';
  /** 排序方向 */
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * 审计统计结果
 */
export interface AuditStatistics {
  /** 总操作数 */
  totalOperations: number;
  /** 按操作类型统计 */
  byOperationType: Record<AuditOperationType, number>;
  /** 按操作结果统计 */
  byResult: Record<AuditResult, number>;
  /** 按用户统计 */
  byUser: Array<{ userId: number; username: string; count: number }>;
  /** 按目标类型统计 */
  byTargetType: Record<string, number>;
  /** 时间段统计（按天） */
  byDate: Array<{ date: string; count: number }>;
}

/**
 * 审计导出选项
 */
export interface AuditExportOptions {
  /** 查询条件 */
  query: AuditQueryOptions;
  /** 导出格式 */
  format: 'csv' | 'json' | 'excel';
  /** 包含详细数据 */
  includeDetails?: boolean;
  /** 包含变更前后数据 */
  includeDataChanges?: boolean;
}

// ================================================================
// AuditLogService 类
// ================================================================

class AuditLogService {
  private isEnabled: boolean = true;
  private serverNode: string;
  private writeQueue: AuditLogEntry[] = [];
  private isProcessingQueue: boolean = false;
  private maxQueueSize: number = 500;
  private flushInterval: number = 3000; // 3秒刷新一次
  private flushTimer: NodeJS.Timeout | null = null;

  constructor() {
    // 从环境变量获取服务器节点标识，默认为 'default'
    this.serverNode = process.env.SERVER_NODE || 'default';
    this.startFlushTimer();
  }

  /**
   * 记录审计日志
   */
  async log(entry: Omit<AuditLogEntry, 'auditId' | 'timestamp' | 'serverNode'>): Promise<string> {
    if (!this.isEnabled) {
      return '';
    }

    // 创建完整日志条目
    const fullEntry: AuditLogEntry = {
      ...entry,
      auditId: uuidv4(),
      timestamp: Date.now(),
      serverNode: this.serverNode
    };

    // 添加到写入队列
    this.addToQueue(fullEntry);

    // 同时输出到控制台（便于调试）
    console.log(`[AuditLog] ${fullEntry.operationType} | ${fullEntry.result} | ${fullEntry.actorUsername || 'system'}` +
      (fullEntry.targetName ? ` | ${fullEntry.targetType}:${fullEntry.targetName}` : ''));

    return fullEntry.auditId;
  }

  /**
   * 添加到队列
   */
  private addToQueue(entry: AuditLogEntry): void {
    // 检查队列大小
    if (this.writeQueue.length >= this.maxQueueSize) {
      // 队列已满，强制刷新
      console.warn('[AuditLog] 队列已满，强制刷新');
      this.flush().catch(err => console.error('[AuditLog] 强制刷新失败:', err));
    }

    this.writeQueue.push(entry);

    // 如果队列达到批量大小，立即刷新
    if (this.writeQueue.length >= 50) {
      this.flush().catch(err => console.error('[AuditLog] 刷新失败:', err));
    }
  }

  /**
   * 启动定时刷新
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch(err => console.error('[AuditLog] 定时刷新失败:', err));
    }, this.flushInterval);
  }

  /**
   * 刷新队列到数据库
   */
  private async flush(): Promise<void> {
    // 如果已经在处理中，跳过
    if (this.isProcessingQueue) {
      return;
    }

    // 如果队列为空，跳过
    if (this.writeQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    // 取出当前需要处理的日志
    const logsToProcess = this.writeQueue.splice(0, 100);

    if (logsToProcess.length === 0) {
      this.isProcessingQueue = false;
      return;
    }

    try {
      const connection = await databaseService.getConnection();

      try {
        // 批量插入日志
        const values = logsToProcess.map(log => [
          log.auditId,
          log.operationType,
          log.result,
          log.actorUserId || null,
          log.actorUsername || null,
          log.actorRole || null,
          log.targetType || null,
          log.targetId || null,
          log.targetName || null,
          log.details ? JSON.stringify(log.details) : null,
          log.beforeData ? JSON.stringify(log.beforeData) : null,
          log.afterData ? JSON.stringify(log.afterData) : null,
          log.relatedOperationId || null,
          log.reason || null,
          log.ipAddress || null,
          log.userAgent || null,
          log.sessionId || null,
          log.serverNode
        ]);

        // 修复Bug-P1-003: 使用UTC时间戳避免时区问题
        // 直接将毫秒时间戳转换为ISO格式字符串，确保时区一致性
        const sql = `INSERT INTO audit_logs
          (audit_id, operation_type, result, actor_user_id, actor_username, actor_role,
           target_type, target_id, target_name, details, before_data, after_data,
           related_operation_id, reason, ip_address, user_agent, session_id, server_node, created_at)
          VALUES ${values.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')}`;

        // 修复Bug-P1-002: 使用正确的timestamp值，并修复Bug-P1-003: 使用UTC时间避免时区问题
        const flatValues = values.flatMap((v, idx) => [
          ...v,
          new Date(logsToProcess[idx].timestamp).toISOString().slice(0, 19).replace('T', ' ')
        ]);

        await connection.query(sql, flatValues);

        console.log(`[AuditLog] 已写入 ${logsToProcess.length} 条审计日志`);
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('[AuditLog] 批量写入审计日志失败:', error);

      // 写入失败，将日志放回队列头部
      this.writeQueue.unshift(...logsToProcess);
    } finally {
      this.isProcessingQueue = false;

      // 如果还有日志待处理，继续刷新
      if (this.writeQueue.length > 0) {
        setImmediate(() => {
          this.flush().catch(err => console.error('[AuditLog] 继续刷新失败:', err));
        });
      }
    }
  }

  /**
   * 强制刷新所有日志
   */
  async flushAll(): Promise<void> {
    // 停止定时器
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // 刷新剩余日志
    while (this.writeQueue.length > 0) {
      await this.flush();
    }
  }

  // ================================================================
  // 便捷方法 - 用户管理
  // ================================================================

  async logUserCreate(
    userId: number,
    username: string,
    actorUserId: number,
    actorUsername: string,
    actorRole: string,
    details?: any
  ): Promise<string> {
    return this.log({
      operationType: 'user_create',
      result: 'success',
      actorUserId,
      actorUsername,
      actorRole,
      targetType: 'user',
      targetId: userId,
      targetName: username,
      details,
      afterData: details
    });
  }

  async logUserRoleChange(
    userId: number,
    username: string,
    oldRole: string,
    newRole: string,
    actorUserId: number,
    actorUsername: string,
    actorRole: string
  ): Promise<string> {
    return this.log({
      operationType: 'user_role_change',
      result: 'success',
      actorUserId,
      actorUsername,
      actorRole,
      targetType: 'user',
      targetId: userId,
      targetName: username,
      beforeData: { role: oldRole },
      afterData: { role: newRole },
      details: { oldRole, newRole }
    });
  }

  // ================================================================
  // 便捷方法 - 项目管理
  // ================================================================

  async logProjectCreate(
    projectId: number,
    projectCode: string,
    projectName: string,
    actorUserId: number,
    actorUsername: string,
    actorRole: string,
    details?: any
  ): Promise<string> {
    return this.log({
      operationType: 'project_create',
      result: 'success',
      actorUserId,
      actorUsername,
      actorRole,
      targetType: 'project',
      targetId: projectId,
      targetName: `${projectCode} - ${projectName}`,
      details,
      afterData: { projectCode, projectName, ...details }
    });
  }

  async logProjectUpdate(
    projectId: number,
    projectCode: string,
    projectName: string,
    beforeData: any,
    afterData: any,
    actorUserId: number,
    actorUsername: string,
    actorRole: string
  ): Promise<string> {
    return this.log({
      operationType: 'project_update',
      result: 'success',
      actorUserId,
      actorUsername,
      actorRole,
      targetType: 'project',
      targetId: projectId,
      targetName: `${projectCode} - ${projectName}`,
      beforeData,
      afterData,
      details: { changes: this.detectChanges(beforeData, afterData) }
    });
  }

  // ================================================================
  // 便捷方法 - 任务管理
  // ================================================================

  async logTaskAssign(
    taskId: number,
    taskCode: string,
    taskName: string,
    oldAssignee: string | null,
    newAssignee: string,
    newAssigneeId: number,
    actorUserId: number,
    actorUsername: string,
    actorRole: string,
    reason?: string
  ): Promise<string> {
    return this.log({
      operationType: 'task_assign',
      result: 'success',
      actorUserId,
      actorUsername,
      actorRole,
      targetType: 'task',
      targetId: taskId,
      targetName: `${taskCode} - ${taskName}`,
      beforeData: { assignee: oldAssignee },
      afterData: { assignee: newAssignee, assigneeId: newAssigneeId },
      details: { oldAssignee, newAssignee, newAssigneeId },
      reason
    });
  }

  async logTaskStatusChange(
    taskId: number,
    taskCode: string,
    taskName: string,
    oldStatus: string,
    newStatus: string,
    actorUserId: number,
    actorUsername: string,
    actorRole: string
  ): Promise<string> {
    return this.log({
      operationType: 'task_status_change',
      result: 'success',
      actorUserId,
      actorUsername,
      actorRole,
      targetType: 'task',
      targetId: taskId,
      targetName: `${taskCode} - ${taskName}`,
      beforeData: { status: oldStatus },
      afterData: { status: newStatus },
      details: { oldStatus, newStatus }
    });
  }

  async logTaskApprove(
    taskId: number,
    taskCode: string,
    taskName: string,
    requesterId: number,
    requesterName: string,
    approverId: number,
    approverName: string,
    approverRole: string,
    comment?: string
  ): Promise<string> {
    return this.log({
      operationType: 'task_approve',
      result: 'success',
      actorUserId: approverId,
      actorUsername: approverName,
      actorRole: approverRole,
      targetType: 'task',
      targetId: taskId,
      targetName: `${taskCode} - ${taskName}`,
      details: { requester: requesterName, requesterId, comment },
      afterData: { status: 'approved', approver: approverName }
    });
  }

  // ================================================================
  // 便捷方法 - WBS 操作
  // ================================================================

  async logWbsNodeMove(
    nodeId: number,
    nodePath: string,
    oldParentPath: string,
    newParentPath: string,
    affectedCount: number,
    actorUserId: number,
    actorUsername: string,
    actorRole: string
  ): Promise<string> {
    return this.log({
      operationType: 'wbs_node_move',
      result: 'success',
      actorUserId,
      actorUsername,
      actorRole,
      targetType: 'wbs_node',
      targetId: nodeId,
      targetName: nodePath,
      beforeData: { parentPath: oldParentPath },
      afterData: { parentPath: newParentPath },
      details: { oldParentPath, newParentPath, affectedCount }
    });
  }

  // ================================================================
  // 便捷方法 - 权限管理
  // ================================================================

  async logPermissionConfigUpdate(
    configKey: string,
    beforeData: any,
    afterData: any,
    actorUserId: number,
    actorUsername: string,
    actorRole: string
  ): Promise<string> {
    return this.log({
      operationType: 'permission_config_update',
      result: 'success',
      actorUserId,
      actorUsername,
      actorRole,
      targetType: 'permission_config',
      targetId: configKey,
      beforeData,
      afterData,
      details: { configKey }
    });
  }

  // ================================================================
  // 便捷方法 - 认证事件
  // ================================================================

  async logLoginSuccess(
    userId: number,
    username: string,
    role: string,
    ipAddress: string,
    userAgent: string,
    sessionId: string
  ): Promise<string> {
    return this.log({
      operationType: 'login_success',
      result: 'success',
      actorUserId: userId,
      actorUsername: username,
      actorRole: role,
      targetType: 'session',
      targetId: sessionId,
      ipAddress,
      userAgent,
      sessionId
    });
  }

  async logLoginFailure(
    username: string,
    reason: string,
    ipAddress: string,
    userAgent: string
  ): Promise<string> {
    return this.log({
      operationType: 'login_failure',
      result: 'failure',
      actorUsername: username,
      targetType: 'user',
      targetName: username,
      details: { reason },
      ipAddress,
      userAgent
    });
  }

  // ================================================================
  // 便捷方法 - 数据变更
  // ================================================================

  async logDataConflict(
    dataType: string,
    dataId: string | number,
    localVersion: number,
    serverVersion: number,
    userId: number,
    username: string,
    resolution?: 'local' | 'server' | 'merge'
  ): Promise<string> {
    return this.log({
      operationType: 'data_conflict',
      result: 'conflict',
      actorUserId: userId,
      actorUsername: username,
      targetType: dataType,
      targetId: dataId,
      beforeData: { version: localVersion },
      afterData: { version: serverVersion },
      details: { localVersion, serverVersion, resolution }
    });
  }

  // ================================================================
  // 查询和管理方法
  // ================================================================

  /**
   * 查询审计日志
   */
  async queryLogs(options: AuditQueryOptions = {}): Promise<{ logs: AuditLogEntry[]; total: number }> {
    let connection;
    try {
      connection = await databaseService.getConnection();

      // 构建查询条件
      const conditions: string[] = [];
      const params: any[] = [];

      // 处理操作类型（支持数组）
      if (options.operationType) {
        if (Array.isArray(options.operationType)) {
          const placeholders = options.operationType.map(() => '?').join(',');
          conditions.push(`operation_type IN (${placeholders})`);
          params.push(...options.operationType);
        } else {
          conditions.push('operation_type = ?');
          params.push(options.operationType);
        }
      }

      if (options.result) {
        conditions.push('result = ?');
        params.push(options.result);
      }

      if (options.actorUserId) {
        conditions.push('actor_user_id = ?');
        params.push(options.actorUserId);
      }

      if (options.actorUsername) {
        conditions.push('actor_username = ?');
        params.push(options.actorUsername);
      }

      if (options.targetType) {
        conditions.push('target_type = ?');
        params.push(options.targetType);
      }

      if (options.targetId) {
        conditions.push('target_id = ?');
        params.push(options.targetId);
      }

      if (options.relatedOperationId) {
        conditions.push('related_operation_id = ?');
        params.push(options.relatedOperationId);
      }

      if (options.startTime) {
        conditions.push('created_at >= ?');
        params.push(options.startTime);
      }

      if (options.endTime) {
        conditions.push('created_at <= ?');
        params.push(options.endTime);
      }

      if (options.keyword) {
        conditions.push('(actor_username LIKE ? OR target_name LIKE ? OR details LIKE ?)');
        const keywordPattern = `%${options.keyword}%`;
        params.push(keywordPattern, keywordPattern, keywordPattern);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // 查询总数
      const [countResult] = await connection.execute(
        `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`,
        params
      ) as any[];
      const total = countResult[0].total;

      // 排序
      const sortBy = options.sortBy || 'timestamp';
      const sortOrder = options.sortOrder || 'DESC';

      // 查询日志列表
      const limit = options.limit || 100;
      const offset = options.offset || 0;

      const [logs] = await connection.query(
        `SELECT * FROM audit_logs ${whereClause} ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      ) as any[];

      // 转换为 AuditLogEntry 格式
      const formattedLogs: AuditLogEntry[] = logs.map(log => ({
        auditId: log.audit_id,
        operationType: log.operation_type,
        result: log.result,
        actorUserId: log.actor_user_id,
        actorUsername: log.actor_username,
        actorRole: log.actor_role,
        targetType: log.target_type,
        targetId: log.target_id,
        targetName: log.target_name,
        details: log.details ? JSON.parse(log.details) : undefined,
        beforeData: log.before_data ? JSON.parse(log.before_data) : undefined,
        afterData: log.after_data ? JSON.parse(log.after_data) : undefined,
        relatedOperationId: log.related_operation_id,
        reason: log.reason,
        ipAddress: log.ip_address,
        userAgent: log.user_agent,
        sessionId: log.session_id,
        timestamp: log.created_at ? new Date(log.created_at).getTime() : Date.now(),
        serverNode: log.server_node
      }));

      return { logs: formattedLogs, total };
    } catch (error) {
      console.error('[AuditLog] 查询审计日志失败:', error);
      return { logs: [], total: 0 };
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * 获取审计统计
   */
  async getStatistics(options: {
    startTime?: Date;
    endTime?: Date;
    groupBy?: 'day' | 'week' | 'month';
  } = {}): Promise<AuditStatistics> {
    let connection;
    try {
      connection = await databaseService.getConnection();

      const conditions: string[] = [];
      const params: any[] = [];

      if (options.startTime) {
        conditions.push('created_at >= ?');
        params.push(options.startTime);
      }

      if (options.endTime) {
        conditions.push('created_at <= ?');
        params.push(options.endTime);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // 总操作数
      const [totalResult] = await connection.execute(
        `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`,
        params
      ) as any[];
      const totalOperations = totalResult[0].total;

      // 按操作类型统计
      const [typeResult] = await connection.execute(
        `SELECT operation_type, COUNT(*) as count FROM audit_logs ${whereClause} GROUP BY operation_type`,
        params
      ) as any[];
      const byOperationType: Record<string, number> = {};
      typeResult.forEach((row: any) => {
        byOperationType[row.operation_type] = row.count;
      });

      // 按结果统计
      const [resultResult] = await connection.execute(
        `SELECT result, COUNT(*) as count FROM audit_logs ${whereClause} GROUP BY result`,
        params
      ) as any[];
      const byResult: Record<string, number> = {};
      resultResult.forEach((row: any) => {
        byResult[row.result] = row.count;
      });

      // 按用户统计（Top 10）
      const [userResult] = await connection.execute(
        `SELECT actor_user_id as userId, actor_username as username, COUNT(*) as count
         FROM audit_logs ${whereClause}
         GROUP BY actor_user_id, actor_username
         ORDER BY count DESC LIMIT 10`,
        params
      ) as any[];
      const byUser = userResult.map((row: any) => ({
        userId: row.userId,
        username: row.username,
        count: row.count
      }));

      // 按目标类型统计
      const [targetResult] = await connection.execute(
        `SELECT target_type, COUNT(*) as count FROM audit_logs ${whereClause} GROUP BY target_type`,
        params
      ) as any[];
      const byTargetType: Record<string, number> = {};
      targetResult.forEach((row: any) => {
        byTargetType[row.target_type] = row.count;
      });

      // 按日期统计
      let dateFormat = 'DATE(created_at)';
      if (options.groupBy === 'week') {
        dateFormat = 'DATE_FORMAT(created_at, "%Y-%u")';
      } else if (options.groupBy === 'month') {
        dateFormat = 'DATE_FORMAT(created_at, "%Y-%m")';
      }

      const [dateResult] = await connection.execute(
        `SELECT ${dateFormat} as date, COUNT(*) as count
         FROM audit_logs ${whereClause}
         GROUP BY ${dateFormat}
         ORDER BY date DESC LIMIT 30`,
        params
      ) as any[];
      const byDate = dateResult.map((row: any) => ({
        date: row.date,
        count: row.count
      }));

      return {
        totalOperations,
        byOperationType: byOperationType as any,
        byResult: byResult as any,
        byUser,
        byTargetType,
        byDate
      };
    } catch (error) {
      console.error('[AuditLog] 获取审计统计失败:', error);
      return {
        totalOperations: 0,
        byOperationType: {} as any,
        byResult: {} as any,
        byUser: [],
        byTargetType: {},
        byDate: []
      };
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * 导出审计日志
   */
  async exportLogs(options: AuditExportOptions): Promise<{ data: string; filename: string }> {
    const { logs } = await this.queryLogs(options.query);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    if (options.format === 'json') {
      const data = JSON.stringify(logs, null, 2);
      return { data, filename: `audit_logs_${timestamp}.json` };
    }

    if (options.format === 'csv') {
      const headers = [
        '审计ID',
        '操作类型',
        '结果',
        '操作者',
        '操作者角色',
        '目标类型',
        '目标ID',
        '目标名称',
        '详情',
        '操作前',
        '操作后',
        '原因',
        'IP地址',
        '时间戳'
      ];

      const rows = logs.map(log => [
        log.auditId,
        log.operationType,
        log.result,
        log.actorUsername || '',
        log.actorRole || '',
        log.targetType || '',
        log.targetId || '',
        log.targetName || '',
        options.includeDetails ? (log.details ? JSON.stringify(log.details) : '') : '',
        options.includeDataChanges ? (log.beforeData ? JSON.stringify(log.beforeData) : '') : '',
        options.includeDataChanges ? (log.afterData ? JSON.stringify(log.afterData) : '') : '',
        log.reason || '',
        log.ipAddress || '',
        new Date(log.timestamp).toISOString()
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      return { data: csvContent, filename: `audit_logs_${timestamp}.csv` };
    }

    // Excel 格式（简化为 CSV with BOM for Excel）
    if (options.format === 'excel') {
      const { data } = await this.exportLogs({ ...options, format: 'csv' });
      // Add BOM for Excel to recognize UTF-8
      return { data: '\uFEFF' + data, filename: `audit_logs_${timestamp}.csv` };
    }

    throw new Error(`不支持的导出格式: ${options.format}`);
  }

  /**
   * 清理过期审计日志
   * 注意：审计日志通常需要长期保留，此方法仅用于清理非常旧的日志
   */
  async cleanOldLogs(days: number = 365): Promise<number> {
    let connection;
    try {
      connection = await databaseService.getConnection();

      const [result] = await connection.execute(
        `DELETE FROM audit_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
        [days]
      ) as any[];

      return result.affectedRows;
    } catch (error) {
      console.error('[AuditLog] 清理审计日志失败:', error);
      return 0;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * 检测两个对象之间的差异
   */
  private detectChanges(before: any, after: any): string[] {
    const changes: string[] = [];

    if (!before || !after) return changes;

    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

    for (const key of allKeys) {
      const beforeValue = before[key];
      const afterValue = after[key];

      if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
        changes.push(`${key}: ${JSON.stringify(beforeValue)} → ${JSON.stringify(afterValue)}`);
      }
    }

    return changes;
  }

  /**
   * 启用/禁用审计日志
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * 获取队列状态
   */
  getQueueStatus(): { queueSize: number; isProcessing: boolean } {
    return {
      queueSize: this.writeQueue.length,
      isProcessing: this.isProcessingQueue
    };
  }
}

// ================================================================
// 导出单例
// ================================================================

export const auditLogService = new AuditLogService();

// 为了向后兼容，同时导出类
export { AuditLogService };
