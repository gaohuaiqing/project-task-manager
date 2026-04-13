/**
 * 数据库运行时迁移脚本
 * 在服务器启动时自动执行迁移
 */

import { getPool } from '../core/db';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

// 导入独立的迁移函数
import { runMigration025 } from './025-add-users-is-active';
import { runMigration029 } from './029-add-pending-changes';
import { runMigration030 } from './030-insert-default-capability-models';
import { runMigration031 } from './031-insert-default-users';
import { runMigration032 } from './032-insert-default-holidays';
import { runMigration033 } from './033-insert-task-type-mapping';
import { runMigration034 } from './034-create-task-delay-approvals-table';
import { runMigration035 } from './035-add-user-fields';
import { runMigration036 } from './036-add-audit-log-category';
import { runMigration037 } from './037-create-timelines-tables';
import { runMigration038 } from './038-add-audit-log-indexes';
import { runMigration039 } from './039-add-performance-indexes';
import { runMigration040 } from './040-add-timeline-progress-status';
import { up as runMigration041 } from './041-fix-milestone-status-enum';
import { up as addDependencyTypeField } from './030-add-dependency-type';
import { runMigration042 } from './042-add-trend-query-indexes';
import { runMigration043 } from './043-add-wbs-order-column';

/**
 * 检查迁移是否已执行
 */
async function isMigrationExecuted(version: string): Promise<boolean> {
  const pool = getPool();
  if (!pool) return false;

  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT 1 FROM migrations WHERE version = ?',
      [version]
    );
    return rows.length > 0;
  } catch {
    return false;
  }
}

/**
 * 记录迁移执行
 */
async function recordMigration(version: string, name: string): Promise<void> {
  const pool = getPool();
  if (!pool) return;

  await pool.execute(
    'INSERT INTO migrations (name, version, executed_at) VALUES (?, ?, NOW())',
    [name, version]
  );
}

/**
 * 迁移 002: 创建项目成员和里程碑表
 */
async function runMigration002(): Promise<boolean> {
  const version = '002';
  const name = 'add_project_tables';

  if (await isMigrationExecuted(version)) {
    console.log('📋 迁移 002 已执行，跳过');
    return true;
  }

  const pool = getPool();
  if (!pool) return false;

  try {
    console.log('🚀 开始执行数据库迁移 002...');

    // 创建 project_members 表
    await pool.execute(`
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
    `);
    console.log('✅ project_members 表创建成功');

    // 创建 project_milestones 表
    await pool.execute(`
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
    `);
    console.log('✅ project_milestones 表创建成功');

    await recordMigration(version, name);
    console.log('🎉 迁移 002 完成！');
    return true;
  } catch (error) {
    console.error('❌ 迁移 002 失败:', error);
    return false;
  }
}

/**
 * 迁移 023: 创建计划变更表
 */
async function runMigration023(): Promise<boolean> {
  const version = '023';
  const name = 'create_plan_changes_table';

  if (await isMigrationExecuted(version)) {
    console.log('📋 迁移 023 已执行，跳过');
    return true;
  }

  const pool = getPool();
  if (!pool) return false;

  try {
    console.log('🚀 开始执行数据库迁移 023...');

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS plan_changes (
        id VARCHAR(36) PRIMARY KEY,
        task_id VARCHAR(36) NOT NULL,
        user_id INT NOT NULL,
        change_type ENUM('start_date', 'duration', 'predecessor_id', 'lag_days') NOT NULL,
        old_value VARCHAR(255) NULL,
        new_value VARCHAR(255) NULL,
        reason TEXT NOT NULL,
        status ENUM('pending', 'approved', 'rejected', 'timeout') DEFAULT 'pending',
        approver_id INT NULL,
        approved_at DATETIME NULL,
        rejection_reason TEXT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_task_id (task_id),
        INDEX idx_user_id (user_id),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ plan_changes 表创建成功');

    await recordMigration(version, name);
    console.log('🎉 迁移 023 完成！');
    return true;
  } catch (error) {
    console.error('❌ 迁移 023 失败:', error);
    return false;
  }
}

/**
 * 迁移 024: 创建延期记录表
 */
async function runMigration024(): Promise<boolean> {
  const version = '024';
  const name = 'create_delay_records_table';

  if (await isMigrationExecuted(version)) {
    console.log('📋 迁移 024 已执行，跳过');
    return true;
  }

  const pool = getPool();
  if (!pool) return false;

  try {
    console.log('🚀 开始执行数据库迁移 024...');

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS delay_records (
        id VARCHAR(36) PRIMARY KEY,
        task_id VARCHAR(36) NOT NULL,
        delay_days INT NOT NULL,
        reason TEXT NOT NULL,
        recorded_by INT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_task_id (task_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ delay_records 表创建成功');

    await recordMigration(version, name);
    console.log('🎉 迁移 024 完成！');
    return true;
  } catch (error) {
    console.error('❌ 迁移 024 失败:', error);
    return false;
  }
}

/**
 * 迁移 027: 创建组织架构表
 */
async function runMigration027(): Promise<boolean> {
  const version = '027';
  const name = 'create_org_tables';

  if (await isMigrationExecuted(version)) {
    console.log('📋 迁移 027 已执行，跳过');
    return true;
  }

  const pool = getPool();
  if (!pool) return false;

  try {
    console.log('🚀 开始执行数据库迁移 027...');

    // 创建 departments 表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS departments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        parent_id INT NULL,
        manager_id INT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_parent_id (parent_id),
        INDEX idx_manager_id (manager_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ departments 表创建成功');

    // 添加用户表的部门字段（如果不存在）
    try {
      await pool.execute(`ALTER TABLE users ADD COLUMN department_id INT NULL`);
    } catch (e: any) {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    }

    // 创建 capability_models 表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS capability_models (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        dimensions JSON NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ capability_models 表创建成功');

    // 创建 member_capabilities 表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS member_capabilities (
        id VARCHAR(36) PRIMARY KEY,
        user_id INT NOT NULL,
        model_id VARCHAR(36) NOT NULL,
        model_name VARCHAR(100),
        association_label VARCHAR(100),
        dimension_scores JSON NOT NULL,
        overall_score INT,
        evaluated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        evaluated_by INT,
        notes TEXT,
        INDEX idx_user_id (user_id),
        INDEX idx_model_id (model_id),
        INDEX idx_overall_score (overall_score)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ member_capabilities 表创建成功');

    // 创建 task_type_model_mapping 表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS task_type_model_mapping (
        id INT PRIMARY KEY AUTO_INCREMENT,
        task_type VARCHAR(50) NOT NULL,
        model_id VARCHAR(36) NOT NULL,
        priority INT DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_task_type (task_type),
        INDEX idx_model_id (model_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ task_type_model_mapping 表创建成功');

    await recordMigration(version, name);
    console.log('🎉 迁移 027 完成！');
    return true;
  } catch (error) {
    console.error('❌ 迁移 027 失败:', error);
    return false;
  }
}

/**
 * 迁移 028: 创建进展记录表和节假日表
 */
async function runMigration028(): Promise<boolean> {
  const version = '028';
  const name = 'create_progress_and_holidays_tables';

  if (await isMigrationExecuted(version)) {
    console.log('📋 迁移 028 已执行，跳过');
    return true;
  }

  const pool = getPool();
  if (!pool) return false;

  try {
    console.log('🚀 开始执行数据库迁移 028...');

    // 创建进展记录表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS progress_records (
        id VARCHAR(36) PRIMARY KEY,
        task_id VARCHAR(36) NOT NULL,
        content TEXT NOT NULL,
        recorded_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_task_id (task_id),
        INDEX idx_recorded_by (recorded_by),
        INDEX idx_created_at (created_at),
        FOREIGN KEY (task_id) REFERENCES wbs_tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ progress_records 表创建成功');

    // 创建节假日表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS holidays (
        id INT AUTO_INCREMENT PRIMARY KEY,
        holiday_date DATE NOT NULL UNIQUE,
        holiday_name VARCHAR(100),
        is_working_day BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_holiday_date (holiday_date),
        INDEX idx_is_working_day (is_working_day)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ holidays 表创建成功');

    await recordMigration(version, name);
    console.log('🎉 迁移 028 完成！');
    return true;
  } catch (error) {
    console.error('❌ 迁移 028 失败:', error);
    return false;
  }
}

/**
 * 迁移 030b: 添加 dependency_type 字段到 wbs_tasks 表
 */
async function runMigration030b(): Promise<boolean> {
  const version = '030b';
  const name = 'add_dependency_type_field';

  if (await isMigrationExecuted(version)) {
    console.log('📋 迁移 030b 已执行，跳过');
    return true;
  }

  try {
    console.log('🚀 开始执行数据库迁移 030b...');
    await addDependencyTypeField();
    await recordMigration(version, name);
    console.log('🎉 迁移 030b 完成！');
    return true;
  } catch (error) {
    console.error('❌ 迁移 030b 失败:', error);
    return false;
  }
}

/**
 * 迁移 041: 修复里程碑 status 枚举值
 */
async function runMigration041Wrapper(): Promise<boolean> {
  const version = '041';
  const name = 'fix_milestone_status_enum';

  if (await isMigrationExecuted(version)) {
    console.log('📋 迁移 041 已执行，跳过');
    return true;
  }

  try {
    console.log('🚀 开始执行数据库迁移 041...');
    await runMigration041();
    await recordMigration(version, name);
    console.log('🎉 迁移 041 完成！');
    return true;
  } catch (error) {
    console.error('❌ 迁移 041 失败:', error);
    return false;
  }
}

/**
 * 执行所有待运行的迁移
 */
export async function runPendingMigrations(): Promise<void> {
  console.log('🔍 检查待执行的数据库迁移...');

  // 按顺序执行迁移
  await runMigration002();
  await runMigration025();
  await runMigration023();
  await runMigration024();
  await runMigration027();
  await runMigration028();
  await runMigration029();
  await runMigration030();
  await runMigration030b();  // 添加 dependency_type 字段

  // 种子数据迁移 (031-033)
  await runMigration031();  // 默认用户和成员
  await runMigration032();  // 中国节假日
  await runMigration033();  // 任务类型与能力模型映射

  // 结构迁移 (034+)
  await runMigration034();  // 任务延期审批表
  await runMigration035();  // 用户表新增字段 (gender, is_builtin, deleted_at, deleted_by)
  await runMigration036();  // audit_logs 添加 category 字段
  await runMigration037();  // 时间线相关表 (timelines, timeline_tasks)
  await runMigration038();  // audit_logs 添加性能索引
  await runMigration039();  // 业务表性能索引
  await runMigration040();  // 时间线添加进度和状态字段
  await runMigration041Wrapper();  // 修复里程碑 status 枚举值
  await runMigration042();  // 趋势查询优化索引
  await runMigration043();  // WBS 排序优化列

  console.log('✅ 数据库迁移检查完成');
}
