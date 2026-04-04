/**
 * 数据库迁移 037: 创建时间线相关表
 */

import { getPool } from '../core/db';
import type { RowDataPacket } from 'mysql2';

const MIGRATION_VERSION = '037';
const MIGRATION_NAME = 'create_timelines_tables';

async function checkMigrationExecuted(): Promise<boolean> {
  const pool = getPool();
  if (!pool) return false;

  try {
    const [result] = await pool.execute<RowDataPacket[]>(
      'SELECT 1 FROM migrations WHERE version = ?',
      [MIGRATION_VERSION]
    );
    return result && result.length > 0;
  } catch {
    return false;
  }
}

async function recordMigration(): Promise<void> {
  const pool = getPool();
  if (!pool) return;

  await pool.execute(
    'INSERT INTO migrations (name, version, executed_at) VALUES (?, ?, now())',
    [MIGRATION_NAME, MIGRATION_VERSION]
  );
}

export async function runMigration037(): Promise<boolean> {
  if (await checkMigrationExecuted()) {
    console.log('📋 迁移 037 已执行，跳过');
    return true;
  }

  const pool = getPool();
  if (!pool) return false;

  try {
    console.log('🚀 开始执行数据库迁移 037...');

    // 创建 timelines 表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS timelines (
        id VARCHAR(36) PRIMARY KEY,
        project_id VARCHAR(36) NOT NULL COMMENT '项目ID',
        name VARCHAR(100) NOT NULL COMMENT '时间线名称',
        start_date DATE NOT NULL COMMENT '开始日期',
        end_date DATE NOT NULL COMMENT '结束日期',
        type VARCHAR(50) DEFAULT 'development' COMMENT '时间线类型',
        visible BOOLEAN DEFAULT TRUE COMMENT '是否可见',
        sort_order INT DEFAULT 0 COMMENT '排序顺序',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        INDEX idx_project_id (project_id),
        INDEX idx_start_date (start_date),
        INDEX idx_end_date (end_date),
        INDEX idx_type (type),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ timelines 表创建成功');

    // 创建 timeline_tasks 表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS timeline_tasks (
        id VARCHAR(36) PRIMARY KEY,
        timeline_id VARCHAR(36) NOT NULL COMMENT '时间线ID',
        title VARCHAR(200) NOT NULL COMMENT '任务标题',
        description TEXT NULL COMMENT '任务描述',
        start_date DATE NOT NULL COMMENT '开始日期',
        end_date DATE NOT NULL COMMENT '结束日期',
        status ENUM('pending', 'in_progress', 'completed', 'delayed') DEFAULT 'pending' COMMENT '任务状态',
        priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium' COMMENT '优先级',
        progress INT DEFAULT 0 COMMENT '进度百分比',
        assignee_id INT NULL COMMENT '负责人ID',
        source_type ENUM('wbs', 'manual') DEFAULT 'manual' COMMENT '来源类型',
        source_id VARCHAR(36) NULL COMMENT '来源ID',
        sort_order INT DEFAULT 0 COMMENT '排序顺序',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        INDEX idx_timeline_id (timeline_id),
        INDEX idx_start_date (start_date),
        INDEX idx_end_date (end_date),
        INDEX idx_status (status),
        INDEX idx_assignee_id (assignee_id),
        INDEX idx_source (source_type, source_id),
        FOREIGN KEY (timeline_id) REFERENCES timelines(id) ON DELETE CASCADE,
        FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ timeline_tasks 表创建成功');

    await recordMigration();
    console.log('🎉 迁移 037 完成！');
    return true;
  } catch (error) {
    console.error('❌ 迁移 037 失败:', error);
    return false;
  }
}
