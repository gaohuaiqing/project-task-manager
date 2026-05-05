/**
 * 数据库迁移 050: 创建任务类型配置表
 *
 * 目标：
 * 1. 创建 task_types 表
 * 2. 插入 12 种默认任务类型
 */

import { databaseService } from '../services/DatabaseService.js';

const MIGRATION_VERSION = '050';
const MIGRATION_NAME = 'create_task_types_table';

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

async function createTaskTypesTable(): Promise<void> {
  await databaseService.query(`
    CREATE TABLE IF NOT EXISTS task_types (
      id INT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
      code VARCHAR(50) NOT NULL UNIQUE COMMENT '类型编码（英文）',
      name VARCHAR(100) NOT NULL COMMENT '类型名称（中文）',
      color VARCHAR(20) DEFAULT 'gray' COMMENT '颜色标识',
      description TEXT COMMENT '类型描述',
      group_name VARCHAR(50) COMMENT '所属分组',
      is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
      sort_order INT DEFAULT 0 COMMENT '排序顺序',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
      INDEX idx_code (code),
      INDEX idx_is_active (is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('✅ task_types 表创建成功');
}

async function insertDefaultTaskTypes(): Promise<void> {
  const [existing] = await databaseService.query('SELECT COUNT(*) as count FROM task_types') as any[];
  if (existing[0].count === 0) {
    await databaseService.query(`
      INSERT INTO task_types (code, name, color, description, group_name, sort_order) VALUES
      ('firmware', '固件', 'indigo', '嵌入式固件开发、调试与维护', 'hardware', 1),
      ('board', '板卡', 'teal', 'PCB板卡设计、原理图、Layout', 'hardware', 2),
      ('driver', '驱动', 'purple', '驱动程序开发与调试', 'hardware', 3),
      ('interface', '接口类', 'cyan', '接口开发与对接', 'hardware', 4),
      ('hw_recovery', '硬件恢复包', 'orange', '硬件恢复包制作与维护', 'hardware', 5),
      ('material_import', '物料导入', 'lime', '物料导入与验证', 'material', 6),
      ('material_sub', '物料改代', 'amber', '物料替代改进', 'material', 7),
      ('sys_design', '系统设计', 'blue', '系统架构设计', 'design', 8),
      ('core_risk', '核心风险', 'red', '核心风险处理', 'design', 9),
      ('contact', '接口人', 'pink', '接口人任务', 'general', 10),
      ('func_task', '职能任务', 'green', '职能类任务', 'general', 11),
      ('other', '其它', 'gray', '其他类型任务', 'general', 12)
    `);
    console.log('✅ 默认任务类型数据插入成功');
  } else {
    console.log('📋 任务类型数据已存在，跳过插入');
  }
}

export async function runMigration050(): Promise<boolean> {
  try {
    // 初始化数据库连接
    await databaseService.init();

    if (await checkMigrationExecuted()) {
      console.log('📋 迁移 050 已执行，跳过');
      return true;
    }

    console.log('🚀 开始执行数据库迁移 050: 创建任务类型配置表');

    await createTaskTypesTable();
    await insertDefaultTaskTypes();

    await recordMigration();
    console.log('📝 迁移记录已保存');
    console.log('🎉 迁移 050 完成！');

    return true;
  } catch (error) {
    console.error('❌ 迁移 050 失败:', error);
    return false;
  }
}
