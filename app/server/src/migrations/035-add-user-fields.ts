/**
 * 数据库迁移 035: 为 users 表添加 gender、is_builtin、deleted_at、deleted_by 字段
 * 需求来源: REQ_02_organization.md v1.3
 */

import { getPool } from '../core/db';

const MIGRATION_VERSION = '035';
const MIGRATION_NAME = 'add_user_fields_for_org_module';

export async function runMigration035(): Promise<boolean> {
  console.log(`🚀 开始执行迁移 ${MIGRATION_VERSION}: ${MIGRATION_NAME}`);

  const pool = getPool();
  if (!pool) {
    console.log('📋 数据库连接池未初始化，跳过迁移 035');
    return false;
  }

  try {
    // 1. 添加 gender 字段
    const [genderColumns] = await pool.execute(`
      SELECT COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'gender'
    `);

    if (Array.isArray(genderColumns) && genderColumns.length === 0) {
      await pool.execute(`
        ALTER TABLE users
        ADD COLUMN gender VARCHAR(10) DEFAULT NULL COMMENT '性别: male/female/other' AFTER role
      `);
      console.log('  ✓ 添加 gender 字段成功');
    } else {
      console.log('  ✓ gender 字段已存在，跳过');
    }

    // 2. 添加 is_builtin 字段
    const [builtinColumns] = await pool.execute(`
      SELECT COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'is_builtin'
    `);

    if (Array.isArray(builtinColumns) && builtinColumns.length === 0) {
      await pool.execute(`
        ALTER TABLE users
        ADD COLUMN is_builtin TINYINT(1) DEFAULT 0 COMMENT '是否为内置用户' AFTER is_active
      `);
      console.log('  ✓ 添加 is_builtin 字段成功');

      // 将 admin 用户标记为内置用户
      await pool.execute(`
        UPDATE users SET is_builtin = 1 WHERE username = 'admin'
      `);
      console.log('  ✓ 将 admin 用户标记为内置用户');
    } else {
      console.log('  ✓ is_builtin 字段已存在，跳过');
    }

    // 3. 添加 deleted_at 字段
    const [deletedAtColumns] = await pool.execute(`
      SELECT COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'deleted_at'
    `);

    if (Array.isArray(deletedAtColumns) && deletedAtColumns.length === 0) {
      await pool.execute(`
        ALTER TABLE users
        ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT '软删除时间' AFTER is_builtin
      `);
      console.log('  ✓ 添加 deleted_at 字段成功');
    } else {
      console.log('  ✓ deleted_at 字段已存在，跳过');
    }

    // 4. 添加 deleted_by 字段
    const [deletedByColumns] = await pool.execute(`
      SELECT COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'deleted_by'
    `);

    if (Array.isArray(deletedByColumns) && deletedByColumns.length === 0) {
      await pool.execute(`
        ALTER TABLE users
        ADD COLUMN deleted_by INT DEFAULT NULL COMMENT '删除操作人ID' AFTER deleted_at
      `);
      console.log('  ✓ 添加 deleted_by 字段成功');
    } else {
      console.log('  ✓ deleted_by 字段已存在，跳过');
    }

    // 记录迁移
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

    console.log(`🎉 迁移 ${MIGRATION_VERSION} 完成！`);
    return true;
  } catch (error) {
    console.error(`❌ 迁移 ${MIGRATION_VERSION} 失败:`, error);
    return false;
  }
}

export default runMigration035;
