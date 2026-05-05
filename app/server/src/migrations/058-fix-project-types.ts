/**
 * 数据库迁移 058: 修复项目类型数据
 *
 * 目标：
 * 1. 修复现有项目类型名称错误（功能管理 -> 职能管理，物料替代 -> 物料改代）
 * 2. 添加新的项目类型：技术预研
 */

import { getPool } from '../core/db';
import type { RowDataPacket } from 'mysql2/promise';

const MIGRATION_VERSION = '058';
const MIGRATION_NAME = 'fix_project_types';

/**
 * 检查项目类型是否存在
 */
async function projectTypeExists(code: string): Promise<boolean> {
  const pool = getPool();
  if (!pool) return false;

  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT 1 FROM config_project_types WHERE code = ?',
      [code]
    );
    return rows.length > 0;
  } catch {
    return false;
  }
}

/**
 * 执行迁移
 */
export async function up(): Promise<void> {
  const pool = getPool();
  if (!pool) {
    console.log(`[Migration ${MIGRATION_VERSION}] Database pool not available, skipping`);
    return;
  }

  console.log(`[Migration ${MIGRATION_VERSION}] 开始修复项目类型数据...`);

  try {
    // 1. 修复现有数据
    console.log(`[Migration ${MIGRATION_VERSION}] 修复现有项目类型名称...`);
    await pool.execute(
      "UPDATE config_project_types SET name = '职能管理' WHERE code = 'func_mgmt' AND name = '功能管理'"
    );
    await pool.execute(
      "UPDATE config_project_types SET name = '物料改代' WHERE code = 'material_sub' AND name = '物料替代'"
    );

    // 2. 添加新项目类型：技术预研
    const techResearchExists = await projectTypeExists('tech_research');
    if (!techResearchExists) {
      console.log(`[Migration ${MIGRATION_VERSION}] 添加技术预研项目类型...`);
      await pool.execute(
        "INSERT INTO config_project_types (code, name, sort_order) VALUES ('tech_research', '技术预研', 5)"
      );
    } else {
      console.log(`[Migration ${MIGRATION_VERSION}] 技术预研类型已存在，跳过`);
    }

    console.log(`[Migration ${MIGRATION_VERSION}] 项目类型数据修复完成`);
  } catch (error) {
    console.error(`[Migration ${MIGRATION_VERSION}] 迁移失败:`, error);
    throw error;
  }
}
