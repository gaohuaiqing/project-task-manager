/**
 * 数据库迁移 030: 插入默认能力模型种子数据
 *
 * 目标：
 * 插入3个默认能力模型：
 * 1. 嵌入式开发能力
 * 2. 系统设计能力
 * 3. 通用能力
 */

import { getPool } from '../core/db';
import type { RowDataPacket } from 'mysql2/promise';

const MIGRATION_VERSION = '030';
const MIGRATION_NAME = 'insert_default_capability_models';

/**
 * 检查迁移是否已执行
 */
async function isMigrationExecuted(): Promise<boolean> {
  const pool = getPool();
  if (!pool) return false;

  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT 1 FROM migrations WHERE version = ?',
      [MIGRATION_VERSION]
    );
    return rows.length > 0;
  } catch {
    return false;
  }
}

/**
 * 记录迁移执行
 */
async function recordMigration(): Promise<void> {
  const pool = getPool();
  if (!pool) return;

  await pool.execute(
    'INSERT INTO migrations (name, version, executed_at) VALUES (?, ?, NOW())',
    [MIGRATION_NAME, MIGRATION_VERSION]
  );
}

/**
 * 确保capability_models表存在
 */
async function ensureCapabilityModelsTable(): Promise<void> {
  const pool = getPool();
  if (!pool) return;

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS capability_models (
      id VARCHAR(36) PRIMARY KEY COMMENT 'UUID主键',
      name VARCHAR(100) NOT NULL COMMENT '模型名称',
      description TEXT COMMENT '模型描述',
      dimensions JSON NOT NULL COMMENT '能力维度配置',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

/**
 * 插入默认能力模型
 */
async function insertDefaultModels(): Promise<void> {
  const pool = getPool();
  if (!pool) return;

  // 检查是否已有数据
  const [existing] = await pool.execute<RowDataPacket[]>(
    'SELECT COUNT(*) as count FROM capability_models'
  );

  if (existing[0].count > 0) {
    console.log('📋 能力模型已有数据，跳过插入');
    return;
  }

  // 默认能力模型数据
  const defaultModels = [
    {
      id: 'cap-model-001-embedded-dev',
      name: '嵌入式开发能力',
      description: '评估嵌入式系统开发相关能力，包括固件开发、驱动开发、系统设计和问题分析等维度',
      dimensions: JSON.stringify([
        { name: '固件开发', weight: 35, description: '嵌入式固件设计与实现能力' },
        { name: '驱动开发', weight: 30, description: '硬件驱动程序开发能力' },
        { name: '系统设计', weight: 20, description: '嵌入式系统架构设计能力' },
        { name: '问题分析', weight: 15, description: '硬件相关问题分析与调试能力' }
      ])
    },
    {
      id: 'cap-model-002-sys-design',
      name: '系统设计能力',
      description: '评估系统架构设计相关能力，包括架构设计、接口设计和文档编写等维度',
      dimensions: JSON.stringify([
        { name: '架构设计', weight: 40, description: '系统整体架构设计能力' },
        { name: '接口设计', weight: 30, description: '模块间接口定义与设计能力' },
        { name: '文档编写', weight: 30, description: '技术文档撰写与维护能力' }
      ])
    },
    {
      id: 'cap-model-003-general',
      name: '通用能力',
      description: '评估员工通用职场能力，包括沟通协调、问题解决和执行力等维度',
      dimensions: JSON.stringify([
        { name: '沟通协调', weight: 30, description: '团队沟通与跨部门协调能力' },
        { name: '问题解决', weight: 35, description: '问题分析与解决能力' },
        { name: '执行力', weight: 35, description: '任务执行与目标达成能力' }
      ])
    }
  ];

  // 批量插入
  for (const model of defaultModels) {
    await pool.execute(
      `INSERT INTO capability_models (id, name, description, dimensions)
       VALUES (?, ?, ?, ?)`,
      [model.id, model.name, model.description, model.dimensions]
    );
  }

  console.log(`✅ 已插入 ${defaultModels.length} 个默认能力模型`);
}

/**
 * 执行迁移
 */
export async function runMigration030(): Promise<boolean> {
  try {
    if (await isMigrationExecuted()) {
      console.log('📋 迁移 030 已执行，跳过');
      return true;
    }

    console.log('🚀 开始执行数据库迁移 030: 插入默认能力模型');

    await ensureCapabilityModelsTable();
    await insertDefaultModels();
    await recordMigration();

    console.log('📝 迁移记录已保存');
    console.log('🎉 迁移 030 完成！');

    return true;
  } catch (error) {
    console.error('❌ 迁移 030 失败:', error);
    return false;
  }
}
