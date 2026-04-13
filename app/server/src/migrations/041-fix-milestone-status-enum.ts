/**
 * 迁移：修复里程碑 status 字段枚举值
 *
 * 问题描述：
 * 之前的迁移 040 修改枚举值时可能失败或被跳过，导致数据库中
 * status 字段仍使用旧的枚举值 ENUM('pending', 'in_progress', 'completed', 'delayed', 'cancelled')
 * 而代码期望的是 ENUM('pending', 'achieved', 'overdue')
 *
 * 修复方案：
 * 1. 先将所有旧状态映射到新状态
 * 2. 修改枚举定义
 */
import { getPool } from '../../core/db';
import type { RowDataPacket } from 'mysql2/promise';

async function checkColumnExists(tableName: string, columnName: string): Promise<boolean> {
  const pool = getPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );
  return rows.length > 0;
}

export async function up(): Promise<void> {
  const pool = getPool();

  console.log('[Migration 041] 开始修复里程碑 status 枚举值...');

  // 检查 milestones 表是否存在
  if (!await checkColumnExists('milestones', 'status')) {
    console.log('[Migration 041] milestones 表或 status 字段不存在，跳过');
    return;
  }

  // 先检查当前枚举值
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'milestones' AND COLUMN_NAME = 'status'`
  );

  if (rows.length === 0) {
    console.log('[Migration 041] 无法获取 status 字段信息，跳过');
    return;
  }

  const columnType = rows[0].COLUMN_TYPE as string;
  console.log('[Migration 041] 当前 status 字段类型:', columnType);

  // 如果包含旧的枚举值，需要修复
  if (columnType.includes('in_progress') || columnType.includes('completed') || columnType.includes('delayed') || columnType.includes('cancelled')) {
    console.log('[Migration 041] 检测到旧枚举值，开始修复...');

    // 步骤 1：先映射旧状态到新状态
    // in_progress -> pending
    // completed -> achieved
    // delayed -> overdue
    // cancelled -> pending
    console.log('[Migration 041] 步骤 1: 映射旧状态到新状态...');
    await pool.execute(`
      UPDATE milestones
      SET status = CASE
        WHEN status = 'in_progress' THEN 'pending'
        WHEN status = 'completed' THEN 'achieved'
        WHEN status = 'delayed' THEN 'overdue'
        WHEN status = 'cancelled' THEN 'pending'
        ELSE status
      END
      WHERE status IN ('in_progress', 'completed', 'delayed', 'cancelled')
    `);

    // 步骤 2：修改枚举定义
    console.log('[Migration 041] 步骤 2: 修改枚举定义...');
    await pool.execute(`
      ALTER TABLE milestones
      MODIFY COLUMN status ENUM('pending', 'achieved', 'overdue') DEFAULT 'pending' COMMENT '里程碑状态'
    `);

    console.log('[Migration 041] 修复完成');
  } else {
    console.log('[Migration 041] 枚举值已正确，无需修复');
  }

  // 根据 completion_percentage 更新状态（确保一致性）
  console.log('[Migration 041] 根据 completion_percentage 更新状态...');
  await pool.execute(`
    UPDATE milestones
    SET status = CASE
      WHEN completion_percentage = 100 THEN 'achieved'
      ELSE 'pending'
    END
    WHERE completion_percentage IS NOT NULL
  `);

  console.log('[Migration 041] 迁移完成');
}

export async function down(): Promise<void> {
  const pool = getPool();

  // 回滚：恢复旧的枚举值
  console.log('[Migration 041] 回滚：恢复旧的枚举值...');

  // 先映射新状态到旧状态
  await pool.execute(`
    UPDATE milestones
    SET status = CASE
      WHEN status = 'achieved' THEN 'completed'
      WHEN status = 'overdue' THEN 'delayed'
      ELSE status
    END
    WHERE status IN ('achieved', 'overdue')
  `);

  // 恢复旧的枚举定义
  await pool.execute(`
    ALTER TABLE milestones
    MODIFY COLUMN status ENUM('pending', 'in_progress', 'completed', 'delayed', 'cancelled') DEFAULT 'pending' COMMENT '里程碑状态'
  `);

  console.log('[Migration 041] 回滚完成');
}
