/**
 * ProjectRepository - 项目数据访问层
 *
 * 提供项目相关的数据访问操作
 */

import { BaseRepository, type QueryOptions } from './BaseRepository.js';
import type { DatabaseService } from '../services/DatabaseService.js';
import type { Project } from '../../../shared/types/index.js';

/**
 * 项目查询选项
 */
export interface ProjectQueryOptions extends QueryOptions {
  /** 按状态筛选 */
  status?: Project['status'][];
  /** 按项目类型筛选 */
  projectType?: Project['projectType'][];
  /** 按创建者筛选 */
  createdBy?: number;
  /** 搜索关键词（代码或名称） */
  searchKeyword?: string;
}

/**
 * 项目统计信息
 */
export interface ProjectStats {
  total: number;
  byStatus: Record<Project['status'], number>;
  byType: Record<Project['projectType'], number>;
  inProgress: number;
  delayed: number;
}

/**
 * ProjectRepository类
 */
export class ProjectRepository extends BaseRepository<Project> {
  constructor(db: DatabaseService) {
    super(db);
  }

  /**
   * 获取表名
   */
  getTableName(): string {
    return 'projects';
  }

  /**
   * 将数据库行映射为Project实体
   */
  mapToEntity(row: Record<string, unknown>): Project {
    return {
      id: row.id as number,
      code: row.code as string,
      name: row.name as string,
      description: row.description as string | null,
      status: row.status as Project['status'],
      projectType: row.project_type as Project['projectType'],
      plannedStartDate: row.planned_start_date as string | null,
      plannedEndDate: row.planned_end_date as string | null,
      actualStartDate: row.actual_start_date as string | null,
      actualEndDate: row.actual_end_date as string | null,
      progress: row.progress as number,
      taskCount: row.task_count as number,
      completedTaskCount: row.completed_task_count as number,
      createdBy: row.created_by as number | null,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
      deletedAt: row.deleted_at as Date | null,
    };
  }

  /**
   * 将Project实体映射为数据库行
   */
  mapToRow(project: Partial<Project>): Record<string, unknown> {
    const row: Record<string, unknown> = {};

    if (project.code !== undefined) row.code = project.code;
    if (project.name !== undefined) row.name = project.name;
    if (project.description !== undefined) row.description = project.description;
    if (project.status !== undefined) row.status = project.status;
    if (project.projectType !== undefined) row.project_type = project.projectType;
    if (project.plannedStartDate !== undefined) row.planned_start_date = project.plannedStartDate;
    if (project.plannedEndDate !== undefined) row.planned_end_date = project.plannedEndDate;
    if (project.actualStartDate !== undefined) row.actual_start_date = project.actualStartDate;
    if (project.actualEndDate !== undefined) row.actual_end_date = project.actualEndDate;
    if (project.progress !== undefined) row.progress = project.progress;
    if (project.taskCount !== undefined) row.task_count = project.taskCount;
    if (project.completedTaskCount !== undefined) row.completed_task_count = project.completed_task_count;
    if (project.createdBy !== undefined) row.created_by = project.createdBy;

    return row;
  }

  /**
   * 根据代码查找项目
   */
  async findByCode(code: string): Promise<Project | null> {
    const sql = `SELECT * FROM ${this.getTableName()} WHERE code = ? AND deleted_at IS NULL`;
    const rows = await this.db.query(sql, [code]) as Record<string, unknown>[];

    if (rows.length === 0) {
      return null;
    }

    return this.mapToEntity(rows[0]);
  }

  /**
   * 检查代码是否存在
   */
  async codeExists(code: string, excludeId?: number): Promise<boolean> {
    let sql = `SELECT 1 FROM ${this.getTableName()} WHERE code = ? AND deleted_at IS NULL`;
    const params: unknown[] = [code];

    if (excludeId !== undefined) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }

    const result = await this.db.query(sql, params) as unknown[];
    return result.length > 0;
  }

  /**
   * 查询项目（带筛选）
   */
  async findProjects(options: ProjectQueryOptions = {}): Promise<Project[]> {
    const {
      status,
      projectType,
      createdBy,
      searchKeyword,
      includeDeleted = false,
      orderBy = 'created_at',
      orderDirection = 'DESC',
    } = options;

    let sql = `SELECT * FROM ${this.getTableName()} WHERE 1=1`;
    const params: unknown[] = [];

    if (!includeDeleted) {
      sql += ' AND deleted_at IS NULL';
    }

    if (status && status.length > 0) {
      sql += ` AND status IN (${status.map(() => '?').join(',')})`;
      params.push(...status);
    }

    if (projectType && projectType.length > 0) {
      sql += ` AND project_type IN (${projectType.map(() => '?').join(',')})`;
      params.push(...projectType);
    }

    if (createdBy !== undefined) {
      sql += ' AND created_by = ?';
      params.push(createdBy);
    }

    if (searchKeyword) {
      sql += ' AND (code LIKE ? OR name LIKE ?)';
      params.push(`%${searchKeyword}%`, `%${searchKeyword}%`);
    }

    sql += ` ORDER BY ${orderBy} ${orderDirection}`;

    const rows = await this.db.query(sql, params) as Record<string, unknown>[];
    return rows.map(row => this.mapToEntity(row));
  }

  /**
   * 分页查询项目
   */
  async findProjectsPaginated(options: ProjectQueryOptions = {}): Promise<Project[]> {
    return this.findProjects(options);
  }

  /**
   * 获取项目统计信息
   */
  async getProjectStats(): Promise<ProjectStats> {
    // 总数统计
    const totalResult = await this.db.query(
      `SELECT COUNT(*) as total FROM ${this.getTableName()} WHERE deleted_at IS NULL`
    ) as { total: bigint }[];
    const total = Number(totalResult[0].total);

    // 按状态统计
    const statusResult = await this.db.query(
      `SELECT status, COUNT(*) as count FROM ${this.getTableName()} WHERE deleted_at IS NULL GROUP BY status`
    ) as { status: Project['status']; count: bigint }[];

    const byStatus: Record<Project['status'], number> = {
      planning: 0,
      in_progress: 0,
      completed: 0,
      delayed: 0,
      archived: 0,
    };

    for (const row of statusResult) {
      byStatus[row.status] = Number(row.count);
    }

    // 按类型统计
    const typeResult = await this.db.query(
      `SELECT project_type, COUNT(*) as count FROM ${this.getTableName()} WHERE deleted_at IS NULL GROUP BY project_type`
    ) as { project_type: Project['projectType']; count: bigint }[];

    const byType: Record<Project['projectType'], number> = {
      product_development: 0,
      functional_management: 0,
    };

    for (const row of typeResult) {
      byType[row.project_type] = Number(row.count);
    }

    return {
      total,
      byStatus,
      byType,
      inProgress: byStatus.in_progress,
      delayed: byStatus.delayed,
    };
  }

  /**
   * 更新项目进度
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
   * 更新任务计数
   */
  async updateTaskCounts(
    id: number,
    taskCount: number,
    completedTaskCount: number
  ): Promise<void> {
    const sql = `
      UPDATE ${this.getTableName()}
      SET task_count = ?, completed_task_count = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND deleted_at IS NULL
    `;
    await this.db.query(sql, [taskCount, completedTaskCount, id]);
  }

  /**
   * 获取延期项目
   */
  async findDelayedProjects(): Promise<Project[]> {
    const sql = `
      SELECT * FROM ${this.getTableName()}
      WHERE status = 'delayed' AND deleted_at IS NULL
      ORDER BY planned_end_date ASC
    `;

    const rows = await this.db.query(sql) as Record<string, unknown>[];
    return rows.map(row => this.mapToEntity(row));
  }

  /**
   * 获取即将到期的项目
   */
  async findUpcomingDeadlineProjects(days: number = 7): Promise<Project[]> {
    const sql = `
      SELECT * FROM ${this.getTableName()}
      WHERE status IN ('planning', 'in_progress')
        AND deleted_at IS NULL
        AND planned_end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
      ORDER BY planned_end_date ASC
    `;

    const rows = await this.db.query(sql, [days]) as Record<string, unknown>[];
    return rows.map(row => this.mapToEntity(row));
  }
}
