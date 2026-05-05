/**
 * 数据库迁移 057: 添加 WBS 编码唯一约束
 *
 * 目标：
 * - 在 wbs_tasks 表上添加 (project_id, wbs_code) 唯一约束
 * - 防止并发创建任务时产生重复的 WBS 编码
 */

import { getPool } from '../core/db';
import type { RowDataPacket } from 'mysql2/promise';

const MIGRATION_VERSION = '057';
const MIGRATION_NAME = 'add_wbs_code_unique_constraint';

/**
 * 检查索引是否存在
 */
async function indexExists(tableName: string, indexName: string): Promise<boolean> {
  const pool = getPool();
  if (!pool) return false;

  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
      [tableName, indexName]
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

  console.log(`[Migration ${MIGRATION_VERSION}] 开始添加 WBS 编码唯一约束...`);

  const hasIndex = await indexExists('wbs_tasks', 'idx_unique_project_wbs_code');
  if (!hasIndex) {
    // 先清理可能存在的重复数据（保留ID最小的记录）
    const [duplicates] = await pool.execute<RowDataPacket[]>(
      `SELECT project_id, wbs_code, COUNT(*) as cnt
       FROM wbs_tasks
       GROUP BY project_id, wbs_code
       HAVING cnt > 1`
    );

    if ((duplicates as RowDataPacket[]).length > 0) {
      console.log(`[Migration ${MIGRATION_VERSION}] 发现 ${(duplicates as RowDataPacket[]).length} 组重复 WBS 编码，清理中...`);
      // 删除重复记录（保留最早创建的）
      await pool.execute(
        `DELETE t1 FROM wbs_tasks t1
         INNER JOIN wbs_tasks t2
         ON t1.project_id = t2.project_id AND t1.wbs_code = t2.wbs_code
         WHERE t1.id > t2.id`
      );
    }

    console.log(`[Migration ${MIGRATION_VERSION}] 添加唯一约束...`);
    await pool.execute(
      `ALTER TABLE wbs_tasks ADD UNIQUE INDEX idx_unique_project_wbs_code (project_id, wbs_code)`
    );
  } else {
    console.log(`[Migration ${MIGRATION_VERSION}] 唯一约束已存在，跳过`);
  }

  console.log(`✅ 迁移 ${MIGRATION_VERSION} 完成！`);
}
