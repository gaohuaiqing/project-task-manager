/**
 * 成员数据服务
 *
 * 核心功能：
 * - CRUD操作
 * - 乐观锁版本控制
 * - 缓存管理
 */

import { databaseService } from '../services/DatabaseService.js';
import { cacheManager } from '../cache/index.js';
import { broadcastService } from '../realtime/index.js';
import { logger, LOG_CATEGORIES } from '../logging/index.js';
import type { Member, QueryOptions } from './types.js';
import { VersionConflictError, DataChangeType } from './types.js';

/**
 * 成员数据服务类
 */
export class MemberService {
  /**
   * 获取成员列表
   */
  async getMembers(options: QueryOptions = {}): Promise<Member[]> {
    const { sortBy = 'name', sortOrder = 'ASC', filters = {} } = options;

    // 尝试从缓存获取
    const cached = await cacheManager.getMembersList();
    if (cached.success && cached.data) {
      return cached.data;
    }

    // 从数据库查询
    let query = `SELECT * FROM members WHERE status = 'active'`;
    const params: any[] = [];

    if (filters.department) {
      query += ' AND department = ?';
      params.push(filters.department);
    }

    if (filters.search) {
      query += ' AND (name LIKE ? OR employee_id LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm);
    }

    query += ` ORDER BY ${sortBy} ${sortOrder}`;

    const members = await databaseService.query(query, params) as any[];

    // 写入缓存
    await cacheManager.setMembersList(members);

    return members;
  }

  /**
   * 获取成员详情
   */
  async getMember(memberId: number): Promise<Member | null> {
    // 尝试从缓存获取
    const cached = await cacheManager.getMember(memberId);
    if (cached.success && cached.data) {
      return cached.data;
    }

    // 从数据库查询
    const members = await databaseService.query(
      'SELECT * FROM members WHERE id = ?',
      [memberId]
    ) as any[];

    if (!members || members.length === 0) {
      return null;
    }

    const member = members[0];

    // 写入缓存
    await cacheManager.setMember(memberId, member);

    return member;
  }

  /**
   * 创建成员
   */
  async createMember(data: Partial<Member>, userId: number): Promise<Member> {
    const connection = await databaseService.getConnection();

    try {
      await connection.beginTransaction();

      const [result] = await connection.execute(
        `INSERT INTO members
         (name, employee_id, department, position, skills, capabilities, status, version, created_by)
         VALUES (?, ?, ?, ?, ?, ?, 'active', 1, ?)`,
        [
          data.name,
          data.employee_id || null,
          data.department || null,
          data.position || null,
          JSON.stringify(data.skills || []),
          JSON.stringify(data.capabilities || {}),
          userId
        ]
      );

      const memberId = (result as any).insertId;

      await connection.commit();

      const member = await this.getMember(memberId);

      // 广播变更
      await broadcastService.broadcastMemberChange(memberId, 'create' as DataChangeType, member, userId);

      // 删除列表缓存
      await cacheManager.invalidateMembersList();

      logger.info(LOG_CATEGORIES.DATA_SYNC, '成员已创建', {
        memberId,
        name: data.name,
        userId
      });

      return member!;
    } catch (error: any) {
      await connection.rollback();
      logger.error(LOG_CATEGORIES.DATA_SYNC, '创建成员失败', {
        name: data.name,
        error: error.message
      });
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 更新成员（带乐观锁）
   */
  async updateMember(
    memberId: number,
    data: Partial<Member>,
    currentVersion: number,
    userId: number
  ): Promise<Member> {
    const connection = await databaseService.getConnection();

    try {
      await connection.beginTransaction();

      const [result] = await connection.execute(
        `UPDATE members
         SET name = ?,
             employee_id = ?,
             department = ?,
             position = ?,
             skills = ?,
             capabilities = ?,
             version = version + 1
         WHERE id = ? AND version = ?`,
        [
          data.name,
          data.employee_id || null,
          data.department || null,
          data.position || null,
          JSON.stringify(data.skills || []),
          JSON.stringify(data.capabilities || {}),
          memberId,
          currentVersion
        ]
      );

      if ((result as any).affectedRows === 0) {
        await connection.rollback();
        throw new VersionConflictError({
          current: null,
          attempted: data,
          history: [],
          message: '版本冲突：该成员已被其他用户修改'
        });
      }

      await connection.commit();

      // 删除缓存
      await cacheManager.invalidateMember(memberId);

      const member = await this.getMember(memberId);

      // 广播变更
      await broadcastService.broadcastMemberChange(memberId, 'update' as DataChangeType, member, userId);

      logger.info(LOG_CATEGORIES.DATA_SYNC, '成员已更新', {
        memberId,
        version: currentVersion + 1,
        userId
      });

      return member!;
    } catch (error: any) {
      await connection.rollback();
      if (error instanceof VersionConflictError) {
        throw error;
      }
      logger.error(LOG_CATEGORIES.DATA_SYNC, '更新成员失败', {
        memberId,
        error: error.message
      });
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 删除成员（带乐观锁）
   */
  async deleteMember(memberId: number, currentVersion: number, userId: number): Promise<boolean> {
    const connection = await databaseService.getConnection();

    try {
      await connection.beginTransaction();

      const [result] = await connection.execute(
        'DELETE FROM members WHERE id = ? AND version = ?',
        [memberId, currentVersion]
      );

      if ((result as any).affectedRows === 0) {
        await connection.rollback();
        throw new VersionConflictError({
          current: null,
          attempted: { memberId, version: currentVersion },
          history: [],
          message: '版本冲突：该成员已被其他用户修改或删除'
        });
      }

      await connection.commit();

      // 删除缓存
      await cacheManager.invalidateMember(memberId);

      // 广播变更
      await broadcastService.broadcastMemberChange(memberId, 'delete' as DataChangeType, { memberId }, userId);

      logger.info(LOG_CATEGORIES.DATA_SYNC, '成员已删除', {
        memberId,
        userId
      });

      return true;
    } catch (error: any) {
      await connection.rollback();
      if (error instanceof VersionConflictError) {
        throw error;
      }
      logger.error(LOG_CATEGORIES.DATA_SYNC, '删除成员失败', {
        memberId,
        error: error.message
      });
      throw error;
    } finally {
      connection.release();
    }
  }
}

/**
 * 全局成员服务实例
 */
export const memberService = new MemberService();

/**
 * 默认导出
 */
export default memberService;
