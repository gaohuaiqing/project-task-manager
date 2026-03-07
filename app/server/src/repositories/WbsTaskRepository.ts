/**
 * WbsTaskRepository - WBS任务数据访问层
 *
 * 提供WBS任务相关的数据访问操作
 */

import { BaseRepository, type QueryOptions } from './BaseRepository.js';
import type { DatabaseService } from '../services/DatabaseService.js';
import type { WbsTask } from '../../../shared/types/index.js';

/**
 * WBS任务查询选项
 */
export interface WbsTaskQueryOptions extends QueryOptions {
  /** 按项目ID筛选 */
  projectId?: number;
  /** 按父任务ID筛选 */
  parentId?: number | null;
  /** 按状态筛选 */
  status?: WbsTask['status'][];
  /** 按分配人筛选 */
  assigneeId?: number;
  /** 按任务类型筛选 */
  taskType?: WbsTask['taskType'][];
  /** 是否包含子任务 */
  includeSubtasks?: boolean;
  /** 层级深度 */
  level?: number;
}

/**
 * WBS任务统计信息
 */
export interface WbsTaskStats {
  total: number;
  byStatus: Record<WbsTask['status'], number>;
  byType: Record<WbsTask['taskType'], number>;
  byLevel: Record<number, number>;
  assigned: number;
  unassigned: number;
  overdue: number;
}

/**
 * WbsTaskRepository类
 */
export class WbsTaskRepository extends BaseRepository<WbsTask> {
  constructor(db: DatabaseService) {
    super(db);
  }

  /**
   * 获取表名
   */
  getTableName(): string {
    return 'wbs_tasks';
  }

  /**
   * 将数据库行映射为WbsTask实体
   */
  mapToEntity(row: Record<string, unknown>): WbsTask {
    return {
      id: row.id as number,
      projectId: row.project_id as number,
      parentId: row.parent_id as number | null,
      taskCode: row.task_code as string,
      taskName: row.task_name as string,
      description: row.description as string | null,
      taskType: row.task_type as WbsTask['taskType'],
      status: row.status as WbsTask['status'],
      priority: row.priority as number,
      estimatedHours: row.estimated_hours as number | null,
      actualHours: row.actual_hours as number | null,
      progress: row.progress as number,
      plannedStartDate: row.planned_start_date as string | null,
      plannedEndDate: row.planned_end_date as string | null,
      actualStartDate: row.actual_start_date as string | null,
      actualEndDate: row.actual_end_date as string | null,
      assigneeId: row.assignee_id as number | null,
      dependencies: row.dependencies as Record<string, unknown> | null,
      tags: row.tags as string[] | null,
      attachments: row.attachments as Record<string, unknown> | null,
      version: row.version as number,
      createdBy: row.created_by as number | null,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
      deletedAt: row.deleted_at as Date | null,
      // 新增字段
      wbsCode: row.wbs_code as string | undefined,
      level: row.level as number | undefined,
      subtasks: row.subtasks as number[] | undefined,
    };
  }

  /**
   * 将WbsTask实体映射为数据库行
   */
  mapToRow(task: Partial<WbsTask>): Record<string, unknown> {
    const row: Record<string, unknown> = {};

    if (task.projectId !== undefined) row.project_id = task.projectId;
    if (task.parentId !== undefined) row.parent_id = task.parentId;
    if (task.taskCode !== undefined) row.task_code = task.taskCode;
    if (task.taskName !== undefined) row.task_name = task.taskName;
    if (task.description !== undefined) row.description = task.description;
    if (task.taskType !== undefined) row.task_type = task.taskType;
    if (task.status !== undefined) row.status = task.status;
    if (task.priority !== undefined) row.priority = task.priority;
    if (task.estimatedHours !== undefined) row.estimated_hours = task.estimatedHours;
    if (task.actualHours !== undefined) row.actual_hours = task.actualHours;
    if (task.progress !== undefined) row.progress = task.progress;
    if (task.plannedStartDate !== undefined) row.planned_start_date = task.plannedStartDate;
    if (task.plannedEndDate !== undefined) row.planned_end_date = task.plannedEndDate;
    if (task.actualStartDate !== undefined) row.actual_start_date = task.actualStartDate;
    if (task.actualEndDate !== undefined) row.actual_end_date = task.actualEndDate;
    if (task.assigneeId !== undefined) row.assignee_id = task.assigneeId;
    if (task.dependencies !== undefined) row.dependencies = task.dependencies;
    if (task.tags !== undefined) row.tags = JSON.stringify(task.tags);
    if (task.attachments !== undefined) row.attachments = task.attachments;
    if (task.createdBy !== undefined) row.created_by = task.createdBy;
    if (task.wbsCode !== undefined) row.wbs_code = task.wbsCode;
    if (task.level !== undefined) row.level = task.level;
    if (task.subtasks !== undefined) row.subtasks = JSON.stringify(task.subtasks);

    return row;
  }

  /**
   * 根据任务编码查找
   */
  async findByTaskCode(projectId: number, taskCode: string): Promise<WbsTask | null> {
    const sql = `
      SELECT * FROM ${this.getTableName()}
      WHERE project_id = ? AND task_code = ? AND deleted_at IS NULL
    `;
    const rows = await this.db.query(sql, [projectId, taskCode]) as Record<string, unknown>[];

    if (rows.length === 0) {
      return null;
    }

    return this.mapToEntity(rows[0]);
  }

  /**
   * 查询项目的所有任务
   */
  async findByProject(projectId: number, options: WbsTaskQueryOptions = {}): Promise<WbsTask[]> {
    const {
      status,
      assigneeId,
      taskType,
      includeSubtasks = false,
      level,
      orderBy = 'task_code',
      orderDirection = 'ASC',
    } = options;

    let sql = `SELECT * FROM ${this.getTableName()} WHERE project_id = ? AND deleted_at IS NULL`;
    const params: unknown[] = [projectId];

    if (status && status.length > 0) {
      sql += ` AND status IN (${status.map(() => '?').join(',')})`;
      params.push(...status);
    }

    if (assigneeId !== undefined) {
      sql += ' AND assignee_id = ?';
      params.push(assigneeId);
    }

    if (taskType && taskType.length > 0) {
      sql += ` AND task_type IN (${taskType.map(() => '?').join(',')})`;
      params.push(...taskType);
    }

    if (!includeSubtasks) {
      sql += ' AND parent_id IS NULL';
    }

    if (level !== undefined) {
      sql += ' AND level = ?';
      params.push(level);
    }

    sql += ` ORDER BY ${orderBy} ${orderDirection}`;

    const rows = await this.db.query(sql, params) as Record<string, unknown>[];
    return rows.map(row => this.mapToEntity(row));
  }

  /**
   * 查询子任务
   */
  async findSubtasks(parentId: number): Promise<WbsTask[]> {
    const sql = `
      SELECT * FROM ${this.getTableName()}
      WHERE parent_id = ? AND deleted_at IS NULL
      ORDER BY task_code ASC
    `;
    const rows = await this.db.query(sql, [parentId]) as Record<string, unknown>[];
    return rows.map(row => this.mapToEntity(row));
  }

  /**
   * 查询任务树（递归）
   */
  async findTaskTree(projectId: number, rootParentId: number | null = null): Promise<WbsTask[]> {
    let sql = `
      SELECT * FROM ${this.getTableName()}
      WHERE project_id = ? AND parent_id ? AND deleted_at IS NULL
      ORDER BY task_code ASC
    `;

    const operator = rootParentId === null ? 'IS NULL' : '= ?';
    sql = sql.replace('?', operator);
    const params: unknown[] = [projectId];
    if (rootParentId !== null) {
      params.push(rootParentId);
    }

    const rows = await this.db.query(sql, params) as Record<string, unknown>[];
    const tasks = rows.map(row => this.mapToEntity(row));

    // 递归获取子任务
    for (const task of tasks) {
      const subtasks = await this.findTaskTree(projectId, task.id);
      (task as any)._subtasks = subtasks;
    }

    return tasks;
  }

  /**
   * 获取任务统计信息
   */
  async getTaskStats(projectId?: number): Promise<WbsTaskStats> {
    let whereSql = 'WHERE deleted_at IS NULL';
    const params: unknown[] = [];

    if (projectId !== undefined) {
      whereSql += ' AND project_id = ?';
      params.push(projectId);
    }

    // 总数统计
    const totalResult = await this.db.query(
      `SELECT COUNT(*) as total FROM ${this.getTableName()} ${whereSql}`,
      params
    ) as { total: bigint }[];
    const total = Number(totalResult[0].total);

    // 按状态统计
    const statusResult = await this.db.query(
      `SELECT status, COUNT(*) as count FROM ${this.getTableName()} ${whereSql} GROUP BY status`,
      params
    ) as { status: WbsTask['status']; count: bigint }[];

    const byStatus: Record<WbsTask['status'], number> = {
      pending: 0,
      in_progress: 0,
      completed: 0,
      delayed: 0,
      cancelled: 0,
    };

    for (const row of statusResult) {
      byStatus[row.status] = Number(row.count);
    }

    // 按类型统计
    const typeResult = await this.db.query(
      `SELECT task_type, COUNT(*) as count FROM ${this.getTableName()} ${whereSql} GROUP BY task_type`,
      params
    ) as { task_type: WbsTask['taskType']; count: bigint }[];

    const byType: Record<WbsTask['taskType'], number> = {
      milestone: 0,
      phase: 0,
      task: 0,
      deliverable: 0,
    };

    for (const row of typeResult) {
      byType[row.task_type] = Number(row.count);
    }

    // 按层级统计
    const levelResult = await this.db.query(
      `SELECT level, COUNT(*) as count FROM ${this.getTableName()} ${whereSql} GROUP BY level`,
      params
    ) as { level: number; count: bigint }[];

    const byLevel: Record<number, number> = {};
    for (const row of levelResult) {
      byLevel[row.level] = Number(row.count);
    }

    // 已分配和未分配统计
    const assignResult = await this.db.query(
      `SELECT
        COUNT(CASE WHEN assignee_id IS NOT NULL THEN 1 END) as assigned,
        COUNT(CASE WHEN assignee_id IS NULL THEN 1 END) as unassigned
       FROM ${this.getTableName()} ${whereSql}`,
      params
    ) as { assigned: bigint; unassigned: bigint }[];

    // 逾期任务统计
    const overdueResult = await this.db.query(
      `SELECT COUNT(*) as overdue FROM ${this.getTableName()}
       ${whereSql}
       AND status IN ('pending', 'in_progress')
       AND planned_end_date < CURDATE()`,
      params
    ) as { overdue: bigint }[];

    return {
      total,
      byStatus,
      byType,
      byLevel,
      assigned: Number(assignResult[0].assigned),
      unassigned: Number(assignResult[0].unassigned),
      overdue: Number(overdueResult[0].overdue),
    };
  }

  /**
   * 更新任务进度
   */
  async updateProgress(id: number, progress: number): Promise<void> {
    const sql = `
      UPDATE ${this.getTableName()}
      SET progress = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND deleted_at IS NULL
    `;
    await this.db.query(sql, [progress, id]);
  }

  /**
   * 更新任务状态
   */
  async updateStatus(id: number, status: WbsTask['status']): Promise<void> {
    const sql = `
      UPDATE ${this.getTableName()}
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND deleted_at IS NULL
    `;
    await this.db.query(sql, [status, id]);

    // 如果状态变为已完成，设置实际结束日期
    if (status === 'completed') {
      await this.db.query(
        `UPDATE ${this.getTableName()} SET actual_end_date = CURDATE() WHERE id = ?`,
        [id]
      );
    }
  }

  /**
   * 分配任务
   */
  async assignTask(taskId: number, assigneeId: number): Promise<void> {
    const sql = `
      UPDATE ${this.getTableName()}
      SET assignee_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND deleted_at IS NULL
    `;
    await this.db.query(sql, [assigneeId, taskId]);
  }

  /**
   * 取消任务分配
   */
  async unassignTask(taskId: number): Promise<void> {
    const sql = `
      UPDATE ${this.getTableName()}
      SET assignee_id = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND deleted_at IS NULL
    `;
    await this.db.query(sql, [taskId]);
  }

  /**
   * 移动任务（更改父任务）
   */
  async moveTask(taskId: number, newParentId: number | null): Promise<void> {
    await this.db.beginTransaction();
    try {
      // 计算新层级
      let newLevel = 1;
      if (newParentId !== null) {
        const parent = await this.findById(newParentId);
        if (parent) {
          newLevel = (parent.level || 1) + 1;
        }
      }

      // 更新任务
      const sql = `
        UPDATE ${this.getTableName()}
        SET parent_id = ?, level = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND deleted_at IS NULL
      `;
      await this.db.query(sql, [newParentId, newLevel, taskId]);

      // 更新子任务的层级
      await this.updateChildrenLevel(taskId, newLevel);

      await this.db.commitTransaction();
    } catch (error) {
      await this.db.rollbackTransaction();
      throw error;
    }
  }

  /**
   * 递归更新子任务层级
   */
  private async updateChildrenLevel(parentId: number, parentLevel: number): Promise<void> {
    const children = await this.findSubtasks(parentId);

    for (const child of children) {
      const newLevel = parentLevel + 1;
      await this.db.query(
        `UPDATE ${this.getTableName()} SET level = ? WHERE id = ?`,
        [newLevel, child.id]
      );

      // 递归更新子任务
      await this.updateChildrenLevel(child.id, newLevel);
    }
  }

  /**
   * 获取关键路径上的任务
   */
  async findCriticalPathTasks(projectId: number): Promise<WbsTask[]> {
    // 简化实现：返回所有有依赖关系的未完成任务
    const sql = `
      SELECT DISTINCT t.* FROM ${this.getTableName()} t
      WHERE t.project_id = ?
        AND t.status IN ('pending', 'in_progress')
        AND t.deleted_at IS NULL
        AND (t.dependencies IS NOT NULL AND JSON_LENGTH(t.dependencies) > 0)
      ORDER BY t.planned_end_date ASC
    `;

    const rows = await this.db.query(sql, [projectId]) as Record<string, unknown>[];
    return rows.map(row => this.mapToEntity(row));
  }

  /**
   * 获取即将到期的任务
   */
  async findUpcomingDeadlineTasks(days: number = 3): Promise<WbsTask[]> {
    const sql = `
      SELECT * FROM ${this.getTableName()}
      WHERE status IN ('pending', 'in_progress')
        AND deleted_at IS NULL
        AND planned_end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
      ORDER BY planned_end_date ASC
    `;

    const rows = await this.db.query(sql, [days]) as Record<string, unknown>[];
    return rows.map(row => this.mapToEntity(row));
  }
}
