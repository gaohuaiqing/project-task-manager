/**
 * 数据库迁移 059: 修复项目类型 ENUM 添加技术预研
 *
 * 目标：修复 projects 表 project_type ENUM 字段，添加 tech_research 值
 */

import { getPool } from '../core/db';

const MIGRATION_VERSION = '059';
const MIGRATION_NAME = 'fix_project_type_enum';

/**
 * 执行迁移
 */
export async function up(): Promise<void> {
  const pool = getPool();
  if (!pool) {
    console.log(`[Migration ${MIGRATION_VERSION}] Database pool not available, skipping`);
    return;
  }

  console.log(`[Migration ${MIGRATION_VERSION}] 开始修复 project_type ENUM...`);

  try {
    // 查看当前 ENUM 定义
    const [columns] = await pool.query(`
      SELECT COLUMN_TYPE
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'projects'
        AND COLUMN_NAME = 'project_type'
    `) as any[];

    console.log(`[Migration ${MIGRATION_VERSION}] 当前 ENUM 定义:`, columns[0]?.COLUMN_TYPE);

    // 修改 ENUM 类型添加 tech_research
    await pool.query(`
      ALTER TABLE projects
      MODIFY COLUMN project_type ENUM('product_dev', 'func_mgmt', 'material_sub', 'quality_handle', 'tech_research')
    `);

    console.log(`[Migration ${MIGRATION_VERSION}] ✅ project_type ENUM 已添加 tech_research`);
  } catch (error) {
    console.error(`[Migration ${MIGRATION_VERSION}] 迁移失败:`, error);
    throw error;
  }
}
