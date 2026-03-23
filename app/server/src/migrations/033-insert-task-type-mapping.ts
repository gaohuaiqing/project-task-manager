/**
 * 数据库迁移 033: 插入任务类型与能力模型映射数据
 *
 * 目标：
 * 建立任务类型与能力模型的映射关系，用于智能分配推荐
 */

import { getPool } from '../core/db';
import type { RowDataPacket } from 'mysql2/promise';

const MIGRATION_VERSION = '033';
const MIGRATION_NAME = 'insert_task_type_mapping';

// 能力模型ID（与迁移030保持一致）
const CAPABILITY_MODEL_IDS = {
  embedded_dev: 'cap-model-001-embedded-dev', // 嵌入式开发能力
  sys_design: 'cap-model-002-sys-design',     // 系统设计能力
  general: 'cap-model-003-general',           // 通用能力
};

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
 * 插入任务类型与能力模型映射（补充缺失数据）
 */
async function insertTaskTypeMapping(): Promise<void> {
  const pool = getPool();
  if (!pool) return;

  // 任务类型与能力模型映射（与前端 constants/index.ts 同步）
  // priority: 1=主要能力模型, 2=次要能力模型
  const mappings = [
    // 嵌入式开发类任务 -> 嵌入式开发能力
    { task_type: 'firmware', model_id: CAPABILITY_MODEL_IDS.embedded_dev, priority: 1 },
    { task_type: 'board', model_id: CAPABILITY_MODEL_IDS.embedded_dev, priority: 1 },
    { task_type: 'driver', model_id: CAPABILITY_MODEL_IDS.embedded_dev, priority: 1 },
    { task_type: 'hw_recovery', model_id: CAPABILITY_MODEL_IDS.embedded_dev, priority: 1 },

    // 系统设计类任务 -> 系统设计能力
    { task_type: 'sys_design', model_id: CAPABILITY_MODEL_IDS.sys_design, priority: 1 },
    { task_type: 'interface', model_id: CAPABILITY_MODEL_IDS.sys_design, priority: 1 },
    { task_type: 'core_risk', model_id: CAPABILITY_MODEL_IDS.sys_design, priority: 1 },

    // 物料相关任务 -> 通用能力
    { task_type: 'material_import', model_id: CAPABILITY_MODEL_IDS.general, priority: 1 },
    { task_type: 'material_sub', model_id: CAPABILITY_MODEL_IDS.general, priority: 1 },

    // 职能任务 -> 通用能力
    { task_type: 'func_task', model_id: CAPABILITY_MODEL_IDS.general, priority: 1 },
    { task_type: 'contact', model_id: CAPABILITY_MODEL_IDS.general, priority: 1 },
    { task_type: 'other', model_id: CAPABILITY_MODEL_IDS.general, priority: 1 },

    // 次要能力模型（跨领域任务可能需要多种能力）
    { task_type: 'firmware', model_id: CAPABILITY_MODEL_IDS.sys_design, priority: 2 },
    { task_type: 'driver', model_id: CAPABILITY_MODEL_IDS.sys_design, priority: 2 },
    { task_type: 'sys_design', model_id: CAPABILITY_MODEL_IDS.general, priority: 2 },
    { task_type: 'core_risk', model_id: CAPABILITY_MODEL_IDS.embedded_dev, priority: 2 },
  ];

  // 批量插入（跳过已存在的数据）
  let insertedCount = 0;
  for (const mapping of mappings) {
    try {
      await pool.execute(
        `INSERT IGNORE INTO task_type_model_mapping (task_type, model_id, priority, created_at)
         VALUES (?, ?, ?, NOW())`,
        [mapping.task_type, mapping.model_id, mapping.priority]
      );
      insertedCount++;
    } catch {
      // 忽略重复数据
    }
  }

  console.log(`✅ 已插入 ${insertedCount} 条任务类型映射数据`);
}

/**
 * 执行迁移
 */
export async function runMigration033(): Promise<boolean> {
  try {
    if (await isMigrationExecuted()) {
      console.log('📋 迁移 033 已执行，跳过');
      return true;
    }

    console.log('🚀 开始执行数据库迁移 033: 插入任务类型与能力模型映射');

    await insertTaskTypeMapping();
    await recordMigration();

    console.log('📝 迁移记录已保存');
    console.log('🎉 迁移 033 完成！');

    return true;
  } catch (error) {
    console.error('❌ 迁移 033 失败:', error);
    return false;
  }
}
