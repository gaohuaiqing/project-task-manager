/**
 * 迁移：修复里程碑表结构
 * 1. 将 project_milestones 重命名为 milestones（如果需要）
 * 2. 添加 completion_percentage 字段
 * 3. 添加 target_date 字段（或重命名 planned_date）
 * 4. 更新 status 枚举值
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

async function checkTableExists(tableName: string): Promise<boolean> {
  const pool = getPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [tableName]
  );
  return rows.length > 0;
}

export async function up(): Promise<void> {
  const pool = getPool();

  // 检查 milestones 表是否存在
  const milestonesExists = await checkTableExists('milestones');
  const projectMilestonesExists = await checkTableExists('project_milestones');

  console.log(`[Migration] milestones 表存在: ${milestonesExists}`);
  console.log(`[Migration] project_milestones 表存在: ${projectMilestonesExists}`);

  // 如果 milestones 表不存在但 project_milestones 存在，重命名
  if (!milestonesExists && projectMilestonesExists) {
    console.log('[Migration] 重命名 project_milestones 为 milestones...');
    await pool.execute('RENAME TABLE project_milestones TO milestones');
  }

  // 确保 milestones 表存在
  if (!await checkTableExists('milestones')) {
    console.log('[Migration] 创建 milestones 表...');
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS milestones (
        id VARCHAR(36) PRIMARY KEY COMMENT '主键ID',
        project_id VARCHAR(36) NOT NULL COMMENT '项目ID',
        name VARCHAR(200) NOT NULL COMMENT '里程碑名称',
        description TEXT COMMENT '里程碑描述',
        target_date DATE NOT NULL COMMENT '目标日期',
        planned_date DATE COMMENT '计划日期（兼容旧字段）',
        actual_date DATE DEFAULT NULL COMMENT '实际完成日期',
        status ENUM('pending', 'achieved', 'overdue') DEFAULT 'pending' COMMENT '里程碑状态',
        completion_percentage INT DEFAULT 0 COMMENT '完成百分比 0-100',
        sort_order INT DEFAULT 0 COMMENT '排序顺序',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        INDEX idx_project_id (project_id),
        INDEX idx_target_date (target_date),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  // 添加 completion_percentage 字段
  if (!await checkColumnExists('milestones', 'completion_percentage')) {
    console.log('[Migration] 添加 completion_percentage 字段...');
    await pool.execute(`
      ALTER TABLE milestones
      ADD COLUMN completion_percentage INT DEFAULT 0 COMMENT '完成百分比 0-100'
    `);
  }

  // 添加 target_date 字段
  if (!await checkColumnExists('milestones', 'target_date')) {
    console.log('[Migration] 添加 target_date 字段...');
    // 如果有 planned_date，复制数据
    if (await checkColumnExists('milestones', 'planned_date')) {
      await pool.execute(`
        ALTER TABLE milestones
        ADD COLUMN target_date DATE COMMENT '目标日期'
      `);
      await pool.execute(`
        UPDATE milestones SET target_date = planned_date WHERE target_date IS NULL AND planned_date IS NOT NULL
      `);
    } else {
      await pool.execute(`
        ALTER TABLE milestones
        ADD COLUMN target_date DATE NOT NULL COMMENT '目标日期' AFTER description
      `);
    }
  }

  // 修改 status 枚举值（如果需要）
  try {
    // 先检查当前枚举值
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'milestones' AND COLUMN_NAME = 'status'`
    );

    if (rows.length > 0) {
      const columnType = rows[0].COLUMN_TYPE as string;
      // 如果包含旧的枚举值，则修改
      if (columnType.includes('in_progress') || columnType.includes('completed') || columnType.includes('delayed')) {
        console.log('[Migration] 修改 status 字段枚举值...');
        await pool.execute(`
          ALTER TABLE milestones
          MODIFY COLUMN status ENUM('pending', 'achieved', 'overdue') DEFAULT 'pending' COMMENT '里程碑状态'
        `);
      }
    }
  } catch (error) {
    console.log('[Migration] 修改 status 字段失败，继续...', error);
  }

  // 根据 completion_percentage 更新状态
  console.log('[Migration] 根据完成百分比更新状态...');
  await pool.execute(`
    UPDATE milestones
    SET status = CASE
      WHEN completion_percentage = 100 THEN 'achieved'
      ELSE 'pending'
    END
    WHERE status NOT IN ('achieved', 'overdue')
  `);

  console.log('[Migration] 里程碑表结构修复完成');
}

export async function down(): Promise<void> {
  const pool = getPool();

  // 移除 completion_percentage 字段
  if (await checkColumnExists('milestones', 'completion_percentage')) {
    await pool.execute('ALTER TABLE milestones DROP COLUMN completion_percentage');
  }

  // 移除 target_date 字段
  if (await checkColumnExists('milestones', 'target_date')) {
    await pool.execute('ALTER TABLE milestones DROP COLUMN target_date');
  }

  console.log('[Migration] 回滚完成');
}
