/**
 * 数据库迁移 027: 创建组织架构相关表
 *
 * 目标：
 * 1. 创建 departments 表
 * 2. 创建 capability_models 表
 * 3. 创建 member_capabilities 表
 * 4. 创建 task_type_model_mapping 表
 */

import { databaseService } from '../services/DatabaseService.js';

const MIGRATION_VERSION = '027';
const MIGRATION_NAME = 'create_org_tables';

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

async function createDepartmentsTable(): Promise<void> {
  await databaseService.query(`
    CREATE TABLE IF NOT EXISTS departments (
      id INT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
      name VARCHAR(100) NOT NULL COMMENT '部门名称',
      parent_id INT DEFAULT NULL COMMENT '父部门ID',
      manager_id INT DEFAULT NULL COMMENT '部门经理ID',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
      INDEX idx_parent_id (parent_id),
      INDEX idx_manager_id (manager_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('✅ departments 表创建成功');
}

async function createCapabilityModelsTable(): Promise<void> {
  await databaseService.query(`
    CREATE TABLE IF NOT EXISTS capability_models (
      id VARCHAR(36) PRIMARY KEY COMMENT 'UUID主键',
      name VARCHAR(100) NOT NULL COMMENT '模型名称',
      description TEXT COMMENT '模型描述',
      dimensions JSON NOT NULL COMMENT '能力维度配置',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('✅ capability_models 表创建成功');
}

async function createMemberCapabilitiesTable(): Promise<void> {
  await databaseService.query(`
    CREATE TABLE IF NOT EXISTS member_capabilities (
      id VARCHAR(36) PRIMARY KEY COMMENT 'UUID主键',
      user_id INT NOT NULL COMMENT '用户ID',
      model_id VARCHAR(36) NOT NULL COMMENT '能力模型ID',
      model_name VARCHAR(100) COMMENT '模型名称快照',
      association_label VARCHAR(100) COMMENT '关联标签',
      dimension_scores JSON NOT NULL COMMENT '维度分数',
      overall_score INT COMMENT '综合分数',
      evaluated_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '评定时间',
      evaluated_by INT COMMENT '评定人ID',
      notes TEXT COMMENT '备注',
      INDEX idx_user_id (user_id),
      INDEX idx_model_id (model_id),
      INDEX idx_overall_score (overall_score)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('✅ member_capabilities 表创建成功');
}

async function createTaskTypeMappingTable(): Promise<void> {
  await databaseService.query(`
    CREATE TABLE IF NOT EXISTS task_type_model_mapping (
      id INT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
      task_type VARCHAR(50) NOT NULL COMMENT '任务类型',
      model_id VARCHAR(36) NOT NULL COMMENT '能力模型ID',
      priority INT DEFAULT 1 COMMENT '优先级',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      INDEX idx_task_type (task_type),
      INDEX idx_model_id (model_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('✅ task_type_model_mapping 表创建成功');
}

async function insertDefaultDepartment(): Promise<void> {
  const [existing] = await databaseService.query('SELECT COUNT(*) as count FROM departments') as any[];
  if (existing[0].count === 0) {
    await databaseService.query(`
      INSERT INTO departments (id, name, parent_id) VALUES
      (1, '总公司', NULL),
      (2, '研发部', 1),
      (3, '产品部', 1),
      (4, '测试部', 1),
      (5, '运维部', 1)
    `);
    console.log('✅ 默认部门数据插入成功');
  }
}

export async function runMigration027(): Promise<boolean> {
  try {
    if (!databaseService['pool']) {
      await databaseService.init();
    }

    if (await checkMigrationExecuted()) {
      console.log('📋 迁移 027 已执行，跳过');
      return true;
    }

    console.log('🚀 开始执行数据库迁移 027: 创建组织架构相关表');

    await createDepartmentsTable();
    await createCapabilityModelsTable();
    await createMemberCapabilitiesTable();
    await createTaskTypeMappingTable();
    await insertDefaultDepartment();

    await recordMigration();
    console.log('📝 迁移记录已保存');
    console.log('🎉 迁移 027 完成！');

    return true;
  } catch (error) {
    console.error('❌ 迁移 027 失败:', error);
    return false;
  }
}
