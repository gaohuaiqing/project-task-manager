/**
 * 数据库迁移 025: 为 users 表添加 is_active 字段
 */

import { getPool } from '../core/db';

const MIGRATION_VERSION = '025';
const MIGRATION_NAME = 'add_users_is_active';

export async function runMigration025(): Promise<boolean> {
  console.log(`🚀 开始执行迁移 ${MIGRATION_VERSION}: ${MIGRATION_NAME}`);

  const pool = getPool();

  try {
    // 检查字段是否已存在
    const [columns] = await pool.execute(`
      SELECT COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'is_active'
    `);

    if (Array.isArray(columns) && columns.length > 0) {
      console.log('  ✓ is_active 字段已存在，跳过');
      return true;
    }

    // 添加 is_active 字段
    await pool.execute(`
      ALTER TABLE users
      ADD COLUMN is_active TINYINT(1) DEFAULT 1 COMMENT '是否激活' AFTER role
    `);
    console.log('  ✓ 添加 is_active 字段成功');

    // 更新现有用户为激活状态
    await pool.execute(`
      UPDATE users SET is_active = 1 WHERE is_active IS NULL
    `);
    console.log('  ✓ 更新现有用户为激活状态');

    // 检查 migrations 表是否存在
    const [tables] = await pool.execute(`
      SELECT TABLE_NAME
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'migrations'
    `);

    if (Array.isArray(tables) && tables.length > 0) {
      // 记录迁移
      await pool.execute(`
        INSERT INTO migrations (name, version, executed_at)
        VALUES (?, ?, NOW())
        ON DUPLICATE KEY UPDATE executed_at = NOW()
      `, [MIGRATION_NAME, MIGRATION_VERSION]);
      console.log('  ✓ 迁移记录已保存');
    }

    console.log(`🎉 迁移 ${MIGRATION_VERSION} 完成！`);
    return true;
  } catch (error) {
    console.error(`❌ 迁移 ${MIGRATION_VERSION} 失败:`, error);
    return false;
  }
}

export default runMigration025;

// 运行迁移函数（用于 run-migration.ts 调用）
import { getPool } from '../core/db';

export async function runMigration025(): Promise<boolean> {
  try {
    const pool = getPool();
    if (!pool) {
      console.log('📋 数据库连接池未初始化，跳过迁移 025');
      return false;
    }

    // 检查字段是否已存在
    const [columns] = await pool.execute(`
      SELECT COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'is_active'
    `);

    if (Array.isArray(columns) && columns.length > 0) {
      console.log('📋 迁移 025 已执行（is_active 字段已存在），跳过');
      return true;
    }

    // 添加 is_active 字段
    await pool.execute(`
      ALTER TABLE users
      ADD COLUMN is_active TINYINT(1) DEFAULT 1 COMMENT '是否激活' AFTER role
    `);
    console.log('  ✓ 添加 is_active 字段成功');

    // 更新现有用户为激活状态
    await pool.execute(`
      UPDATE users SET is_active = 1 WHERE is_active IS NULL
    `);
    console.log('  ✓ 更新现有用户为激活状态');

    // 检查 migrations 表是否存在并记录
    const [tables] = await pool.execute(`
      SELECT TABLE_NAME
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'migrations'
    `);

    if (Array.isArray(tables) && tables.length > 0) {
      await pool.execute(`
        INSERT INTO migrations (name, version, executed_at)
        VALUES (?, ?, NOW())
        ON DUPLICATE KEY UPDATE executed_at = NOW()
      `, [MIGRATION_NAME, MIGRATION_VERSION]);
      console.log('  ✓ 迁移记录已保存');
    }

    console.log('🎉 迁移 025 完成！');
    return true;
  } catch (error) {
    console.error('❌ 迁移 025 失败:', error);
    return false;
  }
}
