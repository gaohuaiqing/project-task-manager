/**
 * Repository迁移示例
 *
 * 展示如何将现有的业务服务迁移到使用Repository模式
 */

import { ProjectRepository } from '../repositories/ProjectRepository.js';
import { MemberRepository } from '../repositories/MemberRepository.js';
import type { DatabaseService } from '../services/DatabaseService.js';
import type { Project, ProjectMember, ProjectMilestone } from '../../../shared/types/index.js';

// ================================================================
// 示例1: 简单的查询操作迁移
// ================================================================

/**
 * 迁移前：直接使用DatabaseService
 */
class LegacyProjectService {
  constructor(private db: DatabaseService) {}

  async getProject(id: number): Promise<Project | null> {
    try {
      const result = await this.db.query(
        'SELECT * FROM projects WHERE id = ? AND deleted_at IS NULL',
        [id]
      ) as any[];
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('[LegacyProjectService] 获取项目失败:', error);
      throw error;
    }
  }

  async getProjects(): Promise<Project[]> {
    try {
      const result = await this.db.query(
        'SELECT * FROM projects WHERE deleted_at IS NULL ORDER BY created_at DESC'
      ) as Project[];
      return result;
    } catch (error) {
      console.error('[LegacyProjectService] 获取项目列表失败:', error);
      throw error;
    }
  }

  async createProject(data: Partial<Project>): Promise<Project> {
    try {
      const result = await this.db.query(
        'INSERT INTO projects (code, name, description, status, project_type) VALUES (?, ?, ?, ?, ?)',
        [data.code, data.name, data.description, data.status, data.projectType]
      ) as { insertId: number };

      const created = await this.getProject(result.insertId);
      if (!created) throw new Error('创建项目失败');
      return created;
    } catch (error) {
      console.error('[LegacyProjectService] 创建项目失败:', error);
      throw error;
    }
  }

  async updateProject(id: number, data: Partial<Project>): Promise<Project> {
    try {
      const updates: string[] = [];
      const values: any[] = [];

      if (data.name !== undefined) {
        updates.push('name = ?');
        values.push(data.name);
      }
      if (data.status !== undefined) {
        updates.push('status = ?');
        values.push(data.status);
      }
      if (data.description !== undefined) {
        updates.push('description = ?');
        values.push(data.description);
      }

      if (updates.length === 0) {
        const existing = await this.getProject(id);
        if (!existing) throw new Error('项目不存在');
        return existing;
      }

      values.push(id);
      await this.db.query(
        `UPDATE projects SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        values
      );

      const updated = await this.getProject(id);
      if (!updated) throw new Error('更新项目失败');
      return updated;
    } catch (error) {
      console.error('[LegacyProjectService] 更新项目失败:', error);
      throw error;
    }
  }

  async deleteProject(id: number): Promise<void> {
    try {
      await this.db.query(
        'UPDATE projects SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?',
        [id]
      );
    } catch (error) {
      console.error('[LegacyProjectService] 删除项目失败:', error);
      throw error;
    }
  }
}

/**
 * 迁移后：使用Repository
 */
class ModernProjectService {
  constructor(
    private projectRepo: ProjectRepository
  ) {}

  async getProject(id: number): Promise<Project | null> {
    try {
      return await this.projectRepo.findById(id);
    } catch (error) {
      console.error('[ModernProjectService] 获取项目失败:', error);
      throw error;
    }
  }

  async getProjects(): Promise<Project[]> {
    try {
      return await this.projectRepo.findAll({
        orderBy: 'created_at',
        orderDirection: 'DESC'
      });
    } catch (error) {
      console.error('[ModernProjectService] 获取项目列表失败:', error);
      throw error;
    }
  }

  async createProject(data: Partial<Project>): Promise<Project> {
    try {
      return await this.projectRepo.create(data);
    } catch (error) {
      console.error('[ModernProjectService] 创建项目失败:', error);
      throw error;
    }
  }

  async updateProject(id: number, data: Partial<Project>): Promise<Project> {
    try {
      return await this.projectRepo.update(id, data);
    } catch (error) {
      console.error('[ModernProjectService] 更新项目失败:', error);
      throw error;
    }
  }

  async deleteProject(id: number): Promise<void> {
    try {
      await this.projectRepo.softDelete(id);
    } catch (error) {
      console.error('[ModernProjectService] 删除项目失败:', error);
      throw error;
    }
  }
}

// ================================================================
// 示例2: 复杂查询迁移
// ================================================================

/**
 * 迁移前：复杂SQL查询
 */
class LegacyProjectQueryService {
  constructor(private db: DatabaseService) {}

  async getProjectsByStatus(statuses: string[]): Promise<Project[]> {
    try {
      const placeholders = statuses.map(() => '?').join(',');
      const result = await this.db.query(
        `SELECT * FROM projects WHERE status IN (${placeholders}) AND deleted_at IS NULL ORDER BY created_at DESC`,
        statuses
      ) as Project[];
      return result;
    } catch (error) {
      console.error('[LegacyProjectQueryService] 按状态查询项目失败:', error);
      throw error;
    }
  }

  async searchProjects(keyword: string): Promise<Project[]> {
    try {
      const result = await this.db.query(
        `SELECT * FROM projects WHERE (code LIKE ? OR name LIKE ?) AND deleted_at IS NULL ORDER BY created_at DESC`,
        [`%${keyword}%`, `%${keyword}%`]
      ) as Project[];
      return result;
    } catch (error) {
      console.error('[LegacyProjectQueryService] 搜索项目失败:', error);
      throw error;
    }
  }

  async getDelayedProjects(): Promise<Project[]> {
    try {
      const result = await this.db.query(
        `SELECT * FROM projects WHERE status = 'delayed' AND deleted_at IS NULL ORDER BY planned_end_date ASC`
      ) as Project[];
      return result;
    } catch (error) {
      console.error('[LegacyProjectQueryService] 获取延期项目失败:', error);
      throw error;
    }
  }
}

/**
 * 迁移后：使用Repository的专用方法
 */
class ModernProjectQueryService {
  constructor(
    private projectRepo: ProjectRepository
  ) {}

  async getProjectsByStatus(statuses: Project['status'][]): Promise<Project[]> {
    try {
      return await this.projectRepo.findProjects({
        status: statuses,
        orderBy: 'created_at',
        orderDirection: 'DESC'
      });
    } catch (error) {
      console.error('[ModernProjectQueryService] 按状态查询项目失败:', error);
      throw error;
    }
  }

  async searchProjects(keyword: string): Promise<Project[]> {
    try {
      return await this.projectRepo.findProjects({
        searchKeyword: keyword,
        orderBy: 'created_at',
        orderDirection: 'DESC'
      });
    } catch (error) {
      console.error('[ModernProjectQueryService] 搜索项目失败:', error);
      throw error;
    }
  }

  async getDelayedProjects(): Promise<Project[]> {
    try {
      return await this.projectRepo.findDelayedProjects();
    } catch (error) {
      console.error('[ModernProjectQueryService] 获取延期项目失败:', error);
      throw error;
    }
  }
}

// ================================================================
// 示例3: 批量操作迁移
// ================================================================

/**
 * 迁移前：手动循环处理
 */
class LegacyProjectBatchService {
  constructor(private db: DatabaseService) {}

  async batchUpdateProjects(updates: Array<{ id: number; data: Partial<Project> }>): Promise<Project[]> {
    const results: Project[] = [];

    try {
      // 使用事务
      await this.db.query('START TRANSACTION');

      for (const { id, data } of updates) {
        const updatesArray: string[] = [];
        const values: any[] = [];

        if (data.name !== undefined) {
          updatesArray.push('name = ?');
          values.push(data.name);
        }
        if (data.status !== undefined) {
          updatesArray.push('status = ?');
          values.push(data.status);
        }

        values.push(id);
        await this.db.query(
          `UPDATE projects SET ${updatesArray.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          values
        );

        const updated = await this.db.query(
          'SELECT * FROM projects WHERE id = ?',
          [id]
        ) as Project[];
        results.push(updated[0]);
      }

      await this.db.query('COMMIT');
      return results;
    } catch (error) {
      await this.db.query('ROLLBACK');
      console.error('[LegacyProjectBatchService] 批量更新项目失败:', error);
      throw error;
    }
  }

  async batchDeleteProjects(ids: number[]): Promise<void> {
    try {
      await this.db.query('START TRANSACTION');

      for (const id of ids) {
        await this.db.query(
          'UPDATE projects SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?',
          [id]
        );
      }

      await this.db.query('COMMIT');
    } catch (error) {
      await this.db.query('ROLLBACK');
      console.error('[LegacyProjectBatchService] 批量删除项目失败:', error);
      throw error;
    }
  }
}

/**
 * 迁移后：使用Repository的批量方法
 */
class ModernProjectBatchService {
  constructor(
    private projectRepo: ProjectRepository
  ) {}

  async batchUpdateProjects(updates: Array<{ id: number; data: Partial<Project> }>): Promise<Project[]> {
    try {
      return await this.projectRepo.updateMany(updates);
    } catch (error) {
      console.error('[ModernProjectBatchService] 批量更新项目失败:', error);
      throw error;
    }
  }

  async batchDeleteProjects(ids: number[]): Promise<void> {
    try {
      await this.projectRepo.softDeleteMany(ids);
    } catch (error) {
      console.error('[ModernProjectBatchService] 批量删除项目失败:', error);
      throw error;
    }
  }
}

// ================================================================
// 示例4: 带关联的查询迁移
// ================================================================

/**
 * 迁移前：多次查询或JOIN
 */
class LegacyProjectDetailService {
  constructor(private db: DatabaseService) {}

  async getProjectWithMembers(projectId: number): Promise<{
    project: Project;
    members: ProjectMember[];
  } | null> {
    try {
      // 查询项目
      const projectResult = await this.db.query(
        'SELECT * FROM projects WHERE id = ? AND deleted_at IS NULL',
        [projectId]
      ) as Project[];
      if (projectResult.length === 0) return null;

      // 查询成员
      const membersResult = await this.db.query(
        `SELECT m.*, pm.role as project_role
         FROM project_members pm
         JOIN members m ON m.id = pm.member_id
         WHERE pm.project_id = ?
         ORDER BY pm.role, m.name`,
        [projectId]
      ) as any[];

      return {
        project: projectResult[0],
        members: membersResult
      };
    } catch (error) {
      console.error('[LegacyProjectDetailService] 获取项目详情失败:', error);
      throw error;
    }
  }
}

/**
 * 迁移后：使用多个Repository组合
 */
class ModernProjectDetailService {
  constructor(
    private projectRepo: ProjectRepository,
    private memberRepo: MemberRepository
  ) {}

  async getProjectWithMembers(projectId: number): Promise<{
    project: Project;
    members: ProjectMember[];
  } | null> {
    try {
      // 并行查询项目和信息
      const [project, members] = await Promise.all([
        this.projectRepo.findById(projectId),
        this.memberRepo.findByProject(projectId)
      ]);

      if (!project) return null;

      return { project, members };
    } catch (error) {
      console.error('[ModernProjectDetailService] 获取项目详情失败:', error);
      throw error;
    }
  }
}

// ================================================================
// 迁移检查清单
// ================================================================

/**
 * 迁移步骤：
 *
 * 1. ✅ 确认目标Repository已实现
 * 2. ✅ 在服务构造函数中注入Repository
 * 3. ✅ 逐个方法迁移：
 *    - 简单查询 → findById/findAll
 *    - 条件查询 → findXXX专用方法
 *    - 创建 → create
 *    - 更新 → update
 *    - 删除 → softDelete
 *    - 批量操作 → updateMany/softDeleteMany
 * 4. ✅ 保留错误处理逻辑
 * 5. ✅ 更新单元测试
 * 6. ✅ 验证功能正常
 *
 * 注意事项：
 * - 迁移时保持API接口不变
 * - 优先迁移新功能，现有功能逐步迁移
 * - 复杂查询可使用queryRaw/queryRawEntities
 * - 事务操作通过db.transaction包装
 */

// ================================================================
// 实际使用示例
// ================================================================

/**
 * 在Express应用中使用Repository
 */
import express from 'express';

export function createProjectRoutes(
  projectRepo: ProjectRepository,
  memberRepo: MemberRepository
): express.Router {
  const router = express.Router();

  // 获取项目列表
  router.get('/projects', async (req, res) => {
    try {
      const projects = await projectRepo.findAll({
        orderBy: 'created_at',
        orderDirection: 'DESC'
      });
      res.json({ success: true, data: projects });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '获取项目列表失败'
      });
    }
  });

  // 获取单个项目
  router.get('/projects/:id', async (req, res) => {
    try {
      const project = await projectRepo.findById(parseInt(req.params.id));
      if (!project) {
        return res.status(404).json({
          success: false,
          message: '项目不存在'
        });
      }
      res.json({ success: true, data: project });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '获取项目失败'
      });
    }
  });

  // 创建项目
  router.post('/projects', async (req, res) => {
    try {
      const project = await projectRepo.create(req.body);
      res.status(201).json({ success: true, data: project });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '创建项目失败'
      });
    }
  });

  // 更新项目
  router.put('/projects/:id', async (req, res) => {
    try {
      const project = await projectRepo.update(
        parseInt(req.params.id),
        req.body
      );
      res.json({ success: true, data: project });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '更新项目失败'
      });
    }
  });

  // 删除项目
  router.delete('/projects/:id', async (req, res) => {
    try {
      await projectRepo.softDelete(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '删除项目失败'
      });
    }
  });

  return router;
}
