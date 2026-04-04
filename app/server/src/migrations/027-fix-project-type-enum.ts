/**
 * 修复 project_type ENUM 类型
 *
 * 问题：前端使用 product_dev, 但数据库 ENUM 值可能是 product_development
 * 解决：统一使用 product_dev, func_mgmt, material_sub, quality_handle
 */

import { getPool } from '../core/db';

export async function up(): Promise<void> {
  const pool = getPool();
  if (!pool) {
    throw new Error('Database pool not initialized');
  }

  console.log('[Migration 027] Fixing project_type ENUM...');

  try {
    // 先查看当前的 ENUM 定义
    const [columns] = await pool.query(`
      SELECT COLUMN_TYPE
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'projects'
        AND COLUMN_NAME = 'project_type'
    `) as any[];

    console.log('[Migration 027] Current ENUM definition:', columns[0]?.COLUMN_TYPE);

    // 修改 ENUM 类型为包含新值
    await pool.query(`
      ALTER TABLE projects
      MODIFY COLUMN project_type ENUM('product_dev', 'func_mgmt', 'material_sub', 'quality_handle')
    `);

    // 更新现有数据（将旧值转换为新值）
    await pool.query(`
      UPDATE projects
      SET project_type = 'product_dev'
      WHERE project_type = 'product_development'
    `);

    await pool.query(`
      UPDATE projects
      SET project_type = 'func_mgmt'
      WHERE project_type = 'functional_management'
    `);

    console.log('[Migration 027] ✅ project_type ENUM fixed successfully');
  } catch (error: any) {
    console.error('[Migration 027] Error:', error.message);
    throw error;
  }
}

export async function down(): Promise<void> {
  // 回滚：恢复旧值
  const pool = getPool();
  if (!pool) return;

  try {
    // 先将数据转回旧值
    await pool.query(`
      UPDATE projects
      SET project_type = 'product_development'
      WHERE project_type = 'product_dev'
    `);

    await pool.query(`
      UPDATE projects
      SET project_type = 'functional_management'
      WHERE project_type = 'func_mgmt'
    `);

    // 恢复旧的 ENUM 定义
    await pool.query(`
      ALTER TABLE projects
      MODIFY COLUMN project_type ENUM('product_development', 'functional_management', 'material_sub', 'quality_handle')
    `);

    console.log('[Migration 027] Rolled back');
  } catch (error: any) {
    console.error('[Migration 027] Rollback error:', error.message);
  }
}
