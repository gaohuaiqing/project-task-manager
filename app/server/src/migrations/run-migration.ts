/**
 * 数据库运行时迁移脚本
 * 在服务器启动时自动执行迁移
 */

import { databaseService } from '../services/DatabaseService.js';

const MIGRATION_VERSION = '002';
const MIGRATION_NAME = 'add_project_tables';

async function checkMigrationExecuted(): Promise<boolean> {
  try {
    const result = await databaseService.query(
      'SELECT 1 FROM migrations WHERE version = ?',
      [MIGRATION_VERSION]
    ) as any[];
    return result && result.length > 0;
  } catch {
    return false;
  }
}

async function recordMigration(): Promise<void> {
  await databaseService.query(
    'INSERT INTO migrations (name, version, executed_at) VALUES (?, ?, NOW())',
    [MIGRATION_NAME, MIGRATION_VERSION]
  );
}

async function createProjectMembersTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS project_members (
      id INT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
      project_id INT NOT NULL COMMENT '项目ID',
      member_id INT NOT NULL COMMENT '成员ID',
      role ENUM('owner', 'manager', 'member', 'viewer') DEFAULT 'member' COMMENT '成员角色',
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '加入时间',
      created_by INT COMMENT '创建人ID',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
      deleted_at DATETIME DEFAULT NULL COMMENT '软删除时间',
      INDEX idx_project_id (project_id),
      INDEX idx_member_id (member_id),
      INDEX idx_role (role)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `;
  await databaseService.query(sql);
}

async function createProjectMilestonesTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS project_milestones (
      id INT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
      project_id INT NOT NULL COMMENT '项目ID',
      name VARCHAR(200) NOT NULL COMMENT '里程碑名称',
      description TEXT COMMENT '里程碑描述',
      planned_date DATE NOT NULL COMMENT '计划日期',
      actual_date DATE DEFAULT NULL COMMENT '实际完成日期',
      status ENUM('pending', 'in_progress', 'completed', 'delayed', 'cancelled') DEFAULT 'pending' COMMENT '里程碑状态',
      sort_order INT DEFAULT 0 COMMENT '排序顺序',
      created_by INT COMMENT '创建人ID',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
      deleted_at DATETIME DEFAULT NULL COMMENT '软删除时间',
      INDEX idx_project_id (project_id),
      INDEX idx_planned_date (planned_date),
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `;
  await databaseService.query(sql);
}

export async function runMigration002(): Promise<boolean> {
  try {
    // 确保 DatabaseService 已初始化
    if (!databaseService['pool']) {
      await databaseService.init();
    }

    // 检查是否已执行
    if (await checkMigrationExecuted()) {
      console.log('📋 迁移 002 已执行，跳过');
      return true;
    }

    console.log('🚀 开始执行数据库迁移 002...');

    // 创建表
    await createProjectMembersTable();
    console.log('✅ project_members 表创建成功');

    await createProjectMilestonesTable();
    console.log('✅ project_milestones 表创建成功');

    // 记录迁移
    await recordMigration();
    console.log('📝 迁移记录已保存');

    // 验证
    const tables = await databaseService.query(`
      SELECT TABLE_NAME, TABLE_ROWS
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME IN ('project_members', 'project_milestones')
    `);

    console.log('📊 表验证:', tables);
    console.log('🎉 迁移 002 完成！');

    return true;
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    return false;
  }
}

// 导入迁移 003 和 004
import { runMigration003 } from './003-unify-users-members.js';
import { runMigration004 } from './004-add-missing-fields.js';
import { runMigration023 } from './023-create-plan-changes-table.js';
import { runMigration024 } from './024-create-delay-records-table.js';

// 导出自动运行函数
export async function runPendingMigrations(): Promise<void> {
  console.log('🔍 检查待执行的数据库迁移...');

  // 按顺序执行迁移
  await runMigration002();
  await runMigration003();
  await runMigration004();
  await runMigration023();
  await runMigration024();
}
