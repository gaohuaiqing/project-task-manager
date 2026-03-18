/**
 * 项目数据服务
 *
 * 核心功能：
 * - CRUD操作
 * - 乐观锁版本控制
 * - 缓存管理
 * - 数据变更广播
 */

import { databaseService } from '../services/DatabaseService.js';
import { cacheManager } from '../cache/index.js';
import { broadcastService } from '../realtime/index.js';
import { logger, LOG_CATEGORIES } from '../logging/index.js';
import { performanceMonitor } from '../logging/index.js';
import type { Project, QueryOptions, PaginatedResult } from './types.js';
import { VersionConflictError, DataChangeType } from './types.js';

/**
 * 项目数据服务类
 */
export class ProjectService {
  /**
   * ============================================
   * 查询操作
   * ============================================
   */

  /**
   * 获取项目列表（带缓存）
   */
  async getProjects(options: QueryOptions = {}): Promise<Project[] | PaginatedResult<Project>> {
    const { page, pageSize, sortBy = 'updated_at', sortOrder = 'DESC', filters = {} } = options;

    // 如果是分页查询，不使用缓存
    if (page && pageSize) {
      return this.getProjectsPaginated(page, pageSize, sortBy, sortOrder, filters);
    }

    // 尝试从缓存获取
    const cached = await cacheManager.getProjectsList();
    if (cached.success && cached.data) {
      return cached.data;
    }

    // 从数据库查询
    const projects = await this.queryProjectsFromDB(sortBy, sortOrder, filters);

    // 写入缓存
    await cacheManager.setProjectsList(projects);

    return projects;
  }

  /**
   * 获取项目详情（带缓存）
   */
  async getProject(projectId: number): Promise<Project | null> {
    // 尝试从缓存获取
    const cached = await cacheManager.getProject(projectId);
    if (cached.success && cached.data) {
      return cached.data;
    }

    // 从数据库查询
    const projects = await databaseService.query(
      'SELECT * FROM projects WHERE id = ?',
      [projectId]
    ) as any[];

    if (!projects || projects.length === 0) {
      return null;
    }

    const project = projects[0];

    // 写入缓存
    await cacheManager.setProject(projectId, project);

    return project;
  }

  /**
   * ============================================
   * 写入操作（带乐观锁）
   * ============================================
   */

  /**
   * 创建项目
   */
  // @performanceMonitor()  // 暂时禁用装饰器以避免类型错误
  async createProject(data: Partial<Project>, userId: number): Promise<Project> {
    const connection = await databaseService.getConnection();

    try {
      await connection.beginTransaction();

      // 插入项目
      const [result] = await connection.execute(
        `INSERT INTO projects
         (code, name, description, status, project_type, planned_start_date, planned_end_date, progress, created_by, version)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          data.code,
          data.name,
          data.description || null,
          data.status || 'planning',
          data.project_type || 'other',
          data.planned_start_date || null,
          data.planned_end_date || null,
          data.progress || 0,
          userId
        ]
      );

      const projectId = (result as any).insertId;

      // 记录版本历史
      await this.recordVersionHistory(connection, 'project', projectId, 1, userId, 'create', data);

      await connection.commit();

      // 获取完整项目数据
      const project = await this.getProject(projectId);

      // 广播变更
      await broadcastService.broadcastProjectChange(projectId, 'create' as DataChangeType, project, userId);

      // 删除列表缓存
      await cacheManager.invalidateProjectsList();

      logger.info(LOG_CATEGORIES.DATA_SYNC, '项目已创建', {
        projectId,
        code: data.code,
        name: data.name,
        userId
      });

      return project!;
    } catch (error: any) {
      await connection.rollback();
      logger.error(LOG_CATEGORIES.DATA_SYNC, '创建项目失败', {
        code: data.code,
        error: error.message
      });
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 更新项目（带乐观锁）
   */
  // @performanceMonitor()  // 暂时禁用装饰器以避免类型错误
  async updateProject(
    projectId: number,
    data: Partial<Project>,
    currentVersion: number,
    userId: number
  ): Promise<Project> {
    const connection = await databaseService.getConnection();

    try {
      await connection.beginTransaction();

      // 尝试更新（带版本号检查）
      const [result] = await connection.execute(
        `UPDATE projects
         SET code = ?,
             name = ?,
             description = ?,
             status = ?,
             project_type = ?,
             planned_start_date = ?,
             planned_end_date = ?,
             progress = ?,
             version = version + 1,
             updated_by = ?
         WHERE id = ? AND version = ?`,
        [
          data.code,
          data.name,
          data.description || null,
          data.status,
          data.project_type,
          data.planned_start_date || null,
          data.planned_end_date || null,
          data.progress,
          userId,
          projectId,
          currentVersion
        ]
      );

      // 检查是否成功
      if ((result as any).affectedRows === 0) {
        // 版本冲突，获取最新数据
        const [latest] = await connection.query(
          'SELECT * FROM projects WHERE id = ?',
          [projectId]
        ) as any[];

        // 获取版本历史
        const history = await this.getVersionHistory(projectId, 5);

        await connection.rollback();

        // 抛出版本冲突错误
        throw new VersionConflictError({
          current: latest[0],
          attempted: data,
          history,
          message: '版本冲突：该项目已被其他用户修改，请刷新后重试'
        });
      }

      // 记录版本历史
      await this.recordVersionHistory(connection, 'project', projectId, currentVersion + 1, userId, 'update', data);

      await connection.commit();

      // 删除缓存
      await cacheManager.invalidateProject(projectId);

      // 获取更新后的数据
      const project = await this.getProject(projectId);

      // 广播变更
      await broadcastService.broadcastProjectChange(projectId, 'update' as DataChangeType, project, userId);

      logger.info(LOG_CATEGORIES.DATA_SYNC, '项目已更新', {
        projectId,
        version: currentVersion + 1,
        userId
      });

      return project!;
    } catch (error: any) {
      await connection.rollback();

      if (error instanceof VersionConflictError) {
        throw error;
      }

      logger.error(LOG_CATEGORIES.DATA_SYNC, '更新项目失败', {
        projectId,
        error: error.message
      });
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 删除项目（带乐观锁）
   */
  // @performanceMonitor()  // 暂时禁用装饰器以避免类型错误
  async deleteProject(projectId: number, currentVersion: number, userId: number): Promise<boolean> {
    const connection = await databaseService.getConnection();

    try {
      await connection.beginTransaction();

      // 尝试删除（带版本号检查）
      const [result] = await connection.execute(
        'DELETE FROM projects WHERE id = ? AND version = ?',
        [projectId, currentVersion]
      );

      if ((result as any).affectedRows === 0) {
        await connection.rollback();
        throw new VersionConflictError({
          current: null,
          attempted: { projectId, version: currentVersion },
          history: [],
          message: '版本冲突：该项目已被其他用户修改或删除'
        });
      }

      // 记录版本历史
      await this.recordVersionHistory(connection, 'project', projectId, currentVersion, userId, 'delete', { projectId });

      await connection.commit();

      // 删除缓存
      await cacheManager.invalidateProject(projectId);

      // 广播变更
      await broadcastService.broadcastProjectChange(projectId, 'delete' as DataChangeType, { projectId }, userId);

      logger.info(LOG_CATEGORIES.DATA_SYNC, '项目已删除', {
        projectId,
        userId
      });

      return true;
    } catch (error: any) {
      await connection.rollback();

      if (error instanceof VersionConflictError) {
        throw error;
      }

      logger.error(LOG_CATEGORIES.DATA_SYNC, '删除项目失败', {
        projectId,
        error: error.message
      });
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * ============================================
   * 辅助方法
   * ============================================
   */

  /**
   * 从数据库查询项目列表
   */
  private async queryProjectsFromDB(
    sortBy: string,
    sortOrder: string,
    filters: Record<string, any>
  ): Promise<Project[]> {
    let query = 'SELECT * FROM projects WHERE 1=1';
    const params: any[] = [];

    // 应用过滤器
    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.project_type) {
      query += ' AND project_type = ?';
      params.push(filters.project_type);
    }

    if (filters.search) {
      query += ' AND (code LIKE ? OR name LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm);
    }

    // 排序
    query += ` ORDER BY ${sortBy} ${sortOrder}`;

    const projects = await databaseService.query(query, params) as any[];
    return projects;
  }

  /**
   * 分页查询
   */
  private async getProjectsPaginated(
    page: number,
    pageSize: number,
    sortBy: string,
    sortOrder: string,
    filters: Record<string, any>
  ): Promise<PaginatedResult<Project>> {
    const offset = (page - 1) * pageSize;

    // 查询总数
    let countQuery = 'SELECT COUNT(*) as total FROM projects WHERE 1=1';
    const countParams: any[] = [];

    if (filters.status) {
      countQuery += ' AND status = ?';
      countParams.push(filters.status);
    }

    if (filters.project_type) {
      countQuery += ' AND project_type = ?';
      countParams.push(filters.project_type);
    }

    if (filters.search) {
      countQuery += ' AND (code LIKE ? OR name LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      countParams.push(searchTerm, searchTerm);
    }

    const [totalResult] = await databaseService.query(countQuery, countParams) as any[];
    const total = totalResult.total;

    // 查询数据
    const projects = await this.queryProjectsFromDB(sortBy, sortOrder, filters);

    const startIndex = offset;
    const endIndex = offset + pageSize;
    const rows = projects.slice(startIndex, endIndex);

    return {
      rows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  /**
   * 记录版本历史
   */
  private async recordVersionHistory(
    connection: any,
    entityType: string,
    entityId: number,
    version: number,
    userId: number,
    changeType: 'create' | 'update' | 'delete',
    changeData: any
  ): Promise<void> {
    await connection.execute(
      `INSERT INTO data_versions
       (entity_type, entity_id, version, changed_by, change_type, change_data)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [entityType, entityId, version, userId, changeType, JSON.stringify(changeData)]
    );
  }

  /**
   * 获取版本历史
   */
  async getVersionHistory(projectId: number, limit: number = 10): Promise<any[]> {
    const history = await databaseService.query(
      `SELECT dv.*, u.name as changed_by_name
       FROM data_versions dv
       LEFT JOIN users u ON dv.changed_by = u.id
       WHERE dv.entity_type = 'project' AND dv.entity_id = ?
       ORDER BY dv.created_at DESC
       LIMIT ?`,
      [projectId, limit]
    );

    return history || [];
  }
}

/**
 * 全局项目服务实例
 */
export const projectService = new ProjectService();

/**
 * 默认导出
 */
export default projectService;
