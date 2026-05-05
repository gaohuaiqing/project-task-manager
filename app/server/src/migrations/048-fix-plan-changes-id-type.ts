/**
 * 修复 plan_changes 表 id 字段类型
 *
 * 问题：迁移023中 id 定义为 INT AUTO_INCREMENT，但代码使用 UUID 字符串
 * 导致审批记录无法创建（类型不匹配）
 *
 * 修复：
 * 1. 将 id 改为 VARCHAR(36) 支持 UUID
 * 2. 修复外键约束（wbs_tasks.id 是 VARCHAR(36)，不是 INT）
 * 3. 添加合适的索引
 *
 * @since 2026-04-22
 */

import { getPool } from '../core/db';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

const MIGRATION_VERSION = '048';
const MIGRATION_NAME = 'fix_plan_changes_id_type';

/**
 * 检查表是否存在
 */
async function tableExists(tableName: string): Promise<boolean> {
  const pool = getPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) as count FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = ?`,
    [tableName]
  );
  return rows[0].count > 0;
}

/**
 * 获取当前表结构
 */
async function getTableStructure(tableName: string): Promise<RowDataPacket[]> {
  const pool = getPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `DESCRIBE ${tableName}`
  );
  return rows;
}

/**
 * 执行迁移
 */
export async function up(): Promise<void> {
  console.log(`[Migration ${MIGRATION_VERSION}] 开始修复 plan_changes 表结构...`);

  const pool = getPool();

  if (!await tableExists('plan_changes')) {
    console.log(`[Migration ${MIGRATION_VERSION}] plan_changes 表不存在，创建新表...`);

    // 创建正确结构的表
    await pool.execute(`
      CREATE TABLE plan_changes (
        id VARCHAR(36) PRIMARY KEY COMMENT '审批记录ID（UUID）',
        task_id VARCHAR(36) NOT NULL COMMENT '任务ID',
        user_id INT NOT NULL COMMENT '申请人ID',
        change_type VARCHAR(50) NOT NULL COMMENT '变更类型：start_date, duration, predecessor_id, lag_days',
        old_value TEXT NULL COMMENT '原值',
        new_value TEXT NULL COMMENT '新值',
        reason TEXT NOT NULL COMMENT '变更原因',
        status ENUM('pending', 'approved', 'rejected', 'timeout') DEFAULT 'pending' COMMENT '审批状态',
        approver_id INT NULL COMMENT '审批人ID',
        approved_at DATETIME NULL COMMENT '审批时间',
        rejection_reason TEXT NULL COMMENT '驳回原因',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',

        INDEX idx_changes_task (task_id),
        INDEX idx_changes_user (user_id),
        INDEX idx_changes_status (status),
        INDEX idx_changes_approver (approver_id),
        INDEX idx_changes_created (created_at),

        CONSTRAINT fk_changes_task FOREIGN KEY (task_id) REFERENCES wbs_tasks(id) ON DELETE CASCADE,
        CONSTRAINT fk_changes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_changes_approver FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='计划变更审批表'
    `);

    console.log(`[Migration ${MIGRATION_VERSION}] plan_changes 表创建成功`);
    return;
  }

  // 表已存在，检查并修复结构
  const columns = await getTableStructure('plan_changes');
  const idColumn = columns.find(c => c.Field === 'id');

  if (idColumn && idColumn.Type.includes('int')) {
    console.log(`[Migration ${MIGRATION_VERSION}] 发现 id 为 INT 类型，需要修复...`);

    // 1. 删除旧的外键约束
    try {
      await pool.execute(`ALTER TABLE plan_changes DROP FOREIGN KEY IF EXISTS fk_changes_task`);
    } catch (e) {
      console.log(`[Migration ${MIGRATION_VERSION}] 删除 fk_changes_task 失败（可能不存在）`);
    }

    try {
      await pool.execute(`ALTER TABLE plan_changes DROP FOREIGN KEY IF EXISTS fk_changes_user`);
    } catch (e) {
      console.log(`[Migration ${MIGRATION_VERSION}] 删除 fk_changes_user 失败（可能不存在）`);
    }

    try {
      await pool.execute(`ALTER TABLE plan_changes DROP FOREIGN KEY IF EXISTS fk_changes_approver`);
    } catch (e) {
      console.log(`[Migration ${MIGRATION_VERSION}] 删除 fk_changes_approver 失败（可能不存在）`);
    }

    // 2. 删除旧的索引（如果存在）
    try {
      await pool.execute(`ALTER TABLE plan_changes DROP INDEX IF EXISTS idx_changes_task`);
    } catch (e) { /* ignore */ }

    // 3. 清空表数据（因为有 AUTO_INCREMENT，数据无法保留）
    await pool.execute(`TRUNCATE TABLE plan_changes`);

    // 4. 修改 id 字段类型
    await pool.execute(`ALTER TABLE plan_changes MODIFY id VARCHAR(36) NOT NULL COMMENT '审批记录ID（UUID）'`);

    // 5. 修改 task_id 字段类型（确保是 VARCHAR(36)）
    const taskColumn = columns.find(c => c.Field === 'task_id');
    if (taskColumn && taskColumn.Type.includes('int')) {
      await pool.execute(`ALTER TABLE plan_changes MODIFY task_id VARCHAR(36) NOT NULL COMMENT '任务ID'`);
    }

    // 6. 添加 timeout 状态（如果不存在）
    const statusColumn = columns.find(c => c.Field === 'status');
    if (statusColumn && !statusColumn.Type.includes('timeout')) {
      await pool.execute(`ALTER TABLE plan_changes MODIFY status ENUM('pending', 'approved', 'rejected', 'timeout') DEFAULT 'pending' COMMENT '审批状态'`);
    }

    // 7. 重新添加索引
    await pool.execute(`ALTER TABLE plan_changes ADD INDEX idx_changes_task (task_id)`);
    await pool.execute(`ALTER TABLE plan_changes ADD INDEX idx_changes_user (user_id)`);
    await pool.execute(`ALTER TABLE plan_changes ADD INDEX idx_changes_status (status)`);
    await pool.execute(`ALTER TABLE plan_changes ADD INDEX idx_changes_approver (approver_id)`);
    await pool.execute(`ALTER TABLE plan_changes ADD INDEX idx_changes_created (created_at)`);

    // 8. 重新添加外键约束
    await pool.execute(`
      ALTER TABLE plan_changes
      ADD CONSTRAINT fk_changes_task FOREIGN KEY (task_id) REFERENCES wbs_tasks(id) ON DELETE CASCADE
    `);
    await pool.execute(`
      ALTER TABLE plan_changes
      ADD CONSTRAINT fk_changes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    `);
    await pool.execute(`
      ALTER TABLE plan_changes
      ADD CONSTRAINT fk_changes_approver FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE SET NULL
    `);

    console.log(`[Migration ${MIGRATION_VERSION}] plan_changes 表结构修复成功`);
  } else {
    console.log(`[Migration ${MIGRATION_VERSION}] id 已为 VARCHAR(36) 类型，无需修复`);
  }
}

/**
 * 回滚迁移
 */
export async function down(): Promise<void> {
  console.log(`[Migration ${MIGRATION_VERSION}] 开始回滚...`);

  const pool = getPool();

  // 删除外键约束
  try {
    await pool.execute(`ALTER TABLE plan_changes DROP FOREIGN KEY IF EXISTS fk_changes_task`);
    await pool.execute(`ALTER TABLE plan_changes DROP FOREIGN KEY IF EXISTS fk_changes_user`);
    await pool.execute(`ALTER TABLE plan_changes DROP FOREIGN KEY IF EXISTS fk_changes_approver`);
  } catch (e) { /* ignore */ }

  // 删除表
  await pool.execute(`DROP TABLE IF EXISTS plan_changes`);

  console.log(`[Migration ${MIGRATION_VERSION}] 回滚完成`);
}

// 导出迁移信息
export const migrationInfo = {
  version: MIGRATION_VERSION,
  name: MIGRATION_NAME,
  up,
  down,
};