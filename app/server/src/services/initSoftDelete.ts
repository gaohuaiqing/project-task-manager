/**
 * 软删除机制初始化
 * 为核心表添加 deleted_at 字段，修改外键约束策略
 */

import { databaseService } from './DatabaseService.js';

/**
 * 为表添加软删除支持
 */
async function addSoftDeleteColumn(tableName: string): Promise<void> {
  const connection = await databaseService.getConnection();

  try {
    // 检查列是否已存在
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'task_manager'
      AND TABLE_NAME = ?
      AND COLUMN_NAME = 'deleted_at'
    `, [tableName]) as any[];

    if (columns.length === 0) {
      await connection.query(`
        ALTER TABLE ${tableName}
        ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL
      `);

      // 添加索引以提升查询性能
      await connection.query(`
        CREATE INDEX idx_${tableName}_deleted_at ON ${tableName}(deleted_at)
      `);

      console.log(`[SoftDelete] ${tableName} 表已添加 deleted_at 字段`);
    }
  } finally {
    connection.release();
  }
}

/**
 * 修改外键约束策略（从 CASCADE 改为 SET NULL）
 */
async function modifyForeignKeyConstraints(): Promise<void> {
  const connection = await databaseService.getConnection();

  try {
    // 使用 REFERENTIAL_CONSTRAINTS 表获取外键约束信息（兼容更多 MySQL 版本）
    const [foreignKeys] = await connection.query(`
      SELECT
        kcu.TABLE_NAME,
        kcu.CONSTRAINT_NAME,
        kcu.REFERENCED_TABLE_NAME,
        rc.DELETE_RULE
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
      LEFT JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
        ON kcu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
        AND kcu.TABLE_SCHEMA = rc.CONSTRAINT_SCHEMA
      WHERE kcu.TABLE_SCHEMA = 'task_manager'
      AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
      GROUP BY kcu.TABLE_NAME, kcu.CONSTRAINT_NAME, kcu.REFERENCED_TABLE_NAME, rc.DELETE_RULE
    `) as any[];

    // 需要修改的外键：将 ON DELETE CASCADE 改为 ON DELETE SET NULL
    const constraintsToModify = [
      { table: 'sessions', fk: 'sessions_ibfk_1', ref: 'users', oldRule: 'CASCADE' },
      { table: 'milestones', fk: 'milestones_ibfk_1', ref: 'projects', oldRule: 'CASCADE' },
      { table: 'project_members', fk: 'project_members_ibfk_1', ref: 'projects', oldRule: 'CASCADE' },
      { table: 'project_members', fk: 'project_members_ibfk_2', ref: 'users', oldRule: 'CASCADE' },
      { table: 'wbs_tasks', fk: 'wbs_tasks_ibfk_1', ref: 'projects', oldRule: 'CASCADE' },
      { table: 'task_assignments', fk: 'task_assignments_ibfk_1', ref: 'wbs_tasks', oldRule: 'CASCADE' },
      { table: 'task_assignments', fk: 'task_assignments_ibfk_2', ref: 'members', oldRule: 'CASCADE' },
    ];

    for (const constraint of constraintsToModify) {
      try {
        // 删除旧的外键约束
        await connection.query(`
          ALTER TABLE ${constraint.table}
          DROP FOREIGN KEY ${constraint.fk}
        `);

        // 重新创建外键约束，使用 ON DELETE SET NULL
        await connection.query(`
          ALTER TABLE ${constraint.table}
          ADD CONSTRAINT ${constraint.fk}
          FOREIGN KEY (${constraint.ref === 'users' ? 'user_id' :
                     constraint.ref === 'projects' ? 'project_id' :
                     constraint.ref === 'members' ? 'assignee_id' :
                     constraint.ref === 'wbs_tasks' ? 'task_id' : 'id'})
          REFERENCES ${constraint.ref}(id)
          ON DELETE SET NULL
        `);

        console.log(`[SoftDelete] ${constraint.table}.${constraint.fk} 外键约束已修改为 ON DELETE SET NULL`);
      } catch (error) {
        // 约束可能已修改或不存在，继续处理
        console.warn(`[SoftDelete] ${constraint.table}.${constraint.fk} 约束修改跳过:`, error.message);
      }
    }
  } finally {
    connection.release();
  }
}

/**
 * 初始化软删除机制
 */
export async function initSoftDelete(): Promise<void> {
  try {
    console.log('[SoftDelete] 开始初始化软删除机制...');

    // 为核心表添加 deleted_at 字段
    const tablesWithSoftDelete = [
      'users',
      'projects',
      'members',
      'wbs_tasks',
      'milestones',
      'project_members',
      'task_assignments'
    ];

    for (const table of tablesWithSoftDelete) {
      await addSoftDeleteColumn(table);
    }

    // 修改外键约束策略
    await modifyForeignKeyConstraints();

    console.log('[SoftDelete] ✅ 软删除机制初始化成功');
  } catch (error) {
    console.error('[SoftDelete] ❌ 初始化失败:', error);
    throw error;
  }
}

/**
 * 软删除记录
 * @param tableName 表名
 * @param id 记录ID
 * @param userId 执行删除的用户ID
 */
export async function softDelete(tableName: string, id: number, userId: number): Promise<boolean> {
  try {
    const result = await databaseService.query(
      `UPDATE ${tableName}
       SET deleted_at = NOW(),
           updated_at = NOW()
       WHERE id = ? AND deleted_at IS NULL`,
      [id]
    );

    const affectedRows = (result as any).affectedRows;
    if (affectedRows > 0) {
      // 记录删除操作到审计日志
      await databaseService.query(
        `INSERT INTO data_changes (change_type, entity_type, entity_id, user_id, created_at)
         VALUES ('delete', ?, ?, ?, NOW())`,
        [tableName, id, userId]
      );

      console.log(`[SoftDelete] ${tableName}#${id} 已软删除`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`[SoftDelete] ${tableName}#${id} 软删除失败:`, error);
    return false;
  }
}

/**
 * 恢复软删除的记录
 * @param tableName 表名
 * @param id 记录ID
 * @param userId 执行恢复的用户ID
 */
export async function restoreSoftDeleted(tableName: string, id: number, userId: number): Promise<boolean> {
  try {
    const result = await databaseService.query(
      `UPDATE ${tableName}
       SET deleted_at = NULL,
           updated_at = NOW()
       WHERE id = ? AND deleted_at IS NOT NULL`,
      [id]
    );

    const affectedRows = (result as any).affectedRows;
    if (affectedRows > 0) {
      // 记录恢复操作到审计日志
      await databaseService.query(
        `INSERT INTO data_changes (change_type, entity_type, entity_id, user_id, created_at)
         VALUES ('restore', ?, ?, ?, NOW())`,
        [tableName, id, userId]
      );

      console.log(`[SoftDelete] ${tableName}#${id} 已恢复`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`[SoftDelete] ${tableName}#${id} 恢复失败:`, error);
    return false;
  }
}
