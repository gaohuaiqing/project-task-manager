/**
 * 项目成员管理服务
 * 负责项目成员的添加、删除和查询
 */

import { databaseService } from './DatabaseService.js';
import { systemLogger } from './AsyncSystemLogger.js';

export interface ProjectMember {
  id: number;
  project_id: number;
  user_id: number;
  created_at: Date;
  deleted_at: Date | null;
}

export interface ProjectMemberWithUser extends ProjectMember {
  username: string;
  name: string;
  role: string;
  employee_id: string | null;
}

export class ProjectMemberService {
  /**
   * 添加成员到项目
   */
  async addMemberToProject(
    projectId: number,
    userId: number,
    operatorId?: number
  ): Promise<ProjectMemberWithUser> {
    const connection = await databaseService.getConnection();
    if (!connection) {
      throw new Error('无法获取数据库连接');
    }

    try {
      // 检查成员是否已存在
      const [existing] = await connection.query(
        `SELECT id FROM project_members
         WHERE project_id = ? AND user_id = ? AND deleted_at IS NULL`,
        [projectId, userId]
      );

      if ((existing as any[]).length > 0) {
        throw new Error('该用户已是项目成员');
      }

      // 检查用户是否存在
      const [users] = await connection.query(
        'SELECT id, username, name, role, employee_id FROM users WHERE id = ? AND deleted_at IS NULL',
        [userId]
      );

      if ((users as any[]).length === 0) {
        throw new Error('用户不存在');
      }

      // 添加成员
      const [result] = await connection.query(
        `INSERT INTO project_members (project_id, user_id)
         VALUES (?, ?)`,
        [projectId, userId]
      ) as any[];

      // 获取完整的成员信息
      const [member] = await connection.query(
        `SELECT pm.*, u.username, u.name, u.role, u.employee_id
         FROM project_members pm
         JOIN users u ON pm.user_id = u.id
         WHERE pm.id = ?`,
        [result.insertId]
      );

      // 记录日志
      if (operatorId) {
        await systemLogger.logUserAction(
          'add_project_member',
          { projectId, userId: userId },
          operatorId,
          'system'
        );
      }

      return (member as any[])[0];

    } finally {
      connection.release();
    }
  }

  /**
   * 从项目移除成员（软删除）
   */
  async removeMemberFromProject(
    projectId: number,
    userId: number,
    operatorId?: number
  ): Promise<void> {
    const connection = await databaseService.getConnection();
    if (!connection) {
      throw new Error('无法获取数据库连接');
    }

    try {
      await connection.query(
        `UPDATE project_members
         SET deleted_at = CURRENT_TIMESTAMP
         WHERE project_id = ? AND user_id = ? AND deleted_at IS NULL`,
        [projectId, userId]
      );

      // 记录日志
      if (operatorId) {
        await systemLogger.logUserAction(
          'remove_project_member',
          { projectId, userId: userId },
          operatorId,
          'system'
        );
      }

    } finally {
      connection.release();
    }
  }

  /**
   * 获取项目所有成员
   */
  async getProjectMembers(projectId: number): Promise<ProjectMemberWithUser[]> {
    try {
      const [rows] = await databaseService.query(
        `SELECT pm.*, u.username, u.name, u.role, u.employee_id
         FROM project_members pm
         JOIN users u ON pm.user_id = u.id
         WHERE pm.project_id = ? AND pm.deleted_at IS NULL
         ORDER BY pm.created_at ASC`,
        [projectId]
      );

      return rows as ProjectMemberWithUser[];

    } catch (error) {
      console.error('[ProjectMemberService] 获取项目成员失败:', error);
      return [];
    }
  }

  /**
   * 创建项目时自动添加创建者为成员
   */
  async addCreatorAsMember(
    projectId: number,
    creatorId: number
  ): Promise<void> {
    try {
      await this.addMemberToProject(projectId, creatorId);
      console.log(`[ProjectMemberService] 已将创建者 (${creatorId}) 添加为项目 (${projectId}) 成员`);
    } catch (error: any) {
      // 如果已经存在，忽略错误
      if (error.message !== '该用户已是项目成员') {
        console.error('[ProjectMemberService] 添加创建者为成员失败:', error);
      }
    }
  }

  /**
   * 获取用户参与的所有项目
   */
  async getUserProjects(userId: number): Promise<number[]> {
    try {
      const [rows] = await databaseService.query(
        `SELECT DISTINCT project_id
         FROM project_members
         WHERE user_id = ? AND deleted_at IS NULL`,
        [userId]
      );

      return (rows as any[]).map(r => r.project_id);

    } catch (error) {
      console.error('[ProjectMemberService] 获取用户项目失败:', error);
      return [];
    }
  }

  /**
   * 检查用户是否是项目成员
   */
  async isProjectMember(projectId: number, userId: number): Promise<boolean> {
    try {
      const [rows] = await databaseService.query(
        `SELECT 1 FROM project_members
         WHERE project_id = ? AND user_id = ? AND deleted_at IS NULL
         LIMIT 1`,
        [projectId, userId]
      );

      return (rows as any[]).length > 0;

    } catch (error) {
      console.error('[ProjectMemberService] 检查项目成员失败:', error);
      return false;
    }
  }
}

export const projectMemberService = new ProjectMemberService();
