/**
 * 数据库迁移 045: 创建部门经理关联表
 *
 * 目标:
 * 1. 创建 department_managers 关联表，支持一个技术组多个技术经理
 * 2. 将现有 departments.manager_id 数据迁移到关联表（role = 'primary'）
 */

import { getPool } from '../core/db';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

const MIGRATION_VERSION = '045';
const MIGRATION_NAME = 'create_department_managers_table';

async function isMigrationExecuted(): Promise<boolean> {
  const pool = getPool();
  if (!pool) return false;
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT 1 FROM migrations WHERE version = ?',
      [MIGRATION_VERSION]
    );
    return rows.length > 0;
  } catch {
    return false;
  }
}

async function recordMigration(): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  await pool.execute(
    'INSERT INTO migrations (name, version, executed_at) VALUES (?, ?, NOW())',
    [MIGRATION_NAME, MIGRATION_VERSION]
  );
}

async function createTable(): Promise<boolean> {
  const pool = getPool();
  if (!pool) return false;

  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS department_managers (
        id INT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
        department_id INT NOT NULL COMMENT '部门ID',
        user_id INT NOT NULL COMMENT '用户ID（技术经理）',
        role ENUM('primary', 'co_manager') NOT NULL DEFAULT 'co_manager' COMMENT '角色：primary=主经理, co_manager=副经理',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        UNIQUE INDEX uk_dept_user (department_id, user_id) COMMENT '同一部门同一用户唯一',
        INDEX idx_user_id (user_id) COMMENT '用户ID索引',
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='部门-技术经理关联表'
    `);
    console.log(`✅ [迁移045] department_managers 表创建成功`);
    return true;
  } catch (error) {
    console.error(`❌ [迁移045] 创建 department_managers 表失败:`, error);
    return false;
  }
}

async function migrateExistingData(): Promise<void> {
  const pool = getPool();
  if (!pool) return;

  try {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT IGNORE INTO department_managers (department_id, user_id, role)
       SELECT id, manager_id, 'primary'
       FROM departments
       WHERE manager_id IS NOT NULL`
    );
    console.log(`✅ [迁移045] 已迁移 ${result.affectedRows} 条主经理记录到关联表`);
  } catch (error) {
    console.error(`⚠️ [迁移045] 迁移现有数据失败:`, error);
  }
}

export async function runMigration045(): Promise<boolean> {
  if (await isMigrationExecuted()) {
    console.log(`📋 [迁移045] 已执行，跳过`);
    return true;
  }

  console.log(`🔄 [迁移045] 开始执行: ${MIGRATION_NAME}`);

  const tableCreated = await createTable();
  if (!tableCreated) return false;

  await migrateExistingData();

  await recordMigration();
  console.log(`✅ [迁移045] 迁移完成`);
  return true;
}
