/**
 * 数据库迁移 004 回滚脚本: 补充缺失的数据库字段
 *
 * 此脚本用于回滚迁移 004，删除添加的字段
 *
 * 警告：回滚操作可能导致数据丢失，请确保已备份！
 */

import { databaseService } from '../services/DatabaseService.js';

const MIGRATION_VERSION = '004';

interface MigrationLog {
  step: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: any;
}

const logs: MigrationLog[] = [];

function log(step: string, status: 'success' | 'warning' | 'error', message: string, details?: any) {
  logs.push({ step, status, message, details });
  const icon = status === 'success' ? '✅' : status === 'warning' ? '⚠️' : '❌';
  console.log(`${icon} [${step}] ${message}`, details || '');
}

/**
 * 检查字段是否存在
 */
async function checkFieldExists(tableName: string, fieldName: string): Promise<boolean> {
  const columns = await databaseService.query(`
    SELECT COLUMN_NAME
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND COLUMN_NAME = ?
  `, [tableName, fieldName]) as any[];
  return columns.length > 0;
}

/**
 * 步骤1: 删除 projects 表的实际日期字段
 */
async function dropProjectsActualDates(): Promise<boolean> {
  try {
    const fields = ['actual_start_date', 'actual_end_date'];

    for (const field of fields) {
      const exists = await checkFieldExists('projects', field);
      if (!exists) {
        log('Step 1', 'warning', `projects.${field} 字段不存在，跳过`);
        continue;
      }

      await databaseService.query(`
        ALTER TABLE projects
        DROP COLUMN ${field}
      `);

      log('Step 1', 'success', `projects.${field} 字段已删除`);
    }

    return true;
  } catch (error) {
    log('Step 1', 'error', '删除 projects 表字段失败', error);
    return false;
  }
}

/**
 * 步骤2: 删除 project_members 表的 role 和 member_name 字段
 */
async function dropProjectMembersFields(): Promise<boolean> {
  try {
    const fields = ['member_name'];

    // 注意：role 字段可能是迁移 002 添加的，不要删除
    // 只删除本次迁移添加的 member_name 字段

    for (const field of fields) {
      const exists = await checkFieldExists('project_members', field);
      if (!exists) {
        log('Step 2', 'warning', `project_members.${field} 字段不存在，跳过`);
        continue;
      }

      await databaseService.query(`
        ALTER TABLE project_members
        DROP COLUMN ${field}
      `);

      log('Step 2', 'success', `project_members.${field} 字段已删除`);
    }

    return true;
  } catch (error) {
    log('Step 2', 'error', '删除 project_members 表字段失败', error);
    return false;
  }
}

/**
 * 步骤3: 删除 project_milestones 表的 actual_date 和 sort_order 字段
 */
async function dropProjectMilestonesFields(): Promise<boolean> {
  try {
    // 检查表是否存在
    const tables = await databaseService.query(`
      SELECT TABLE_NAME
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'project_milestones'
    `) as any[];

    if (tables.length === 0) {
      log('Step 3', 'warning', 'project_milestones 表不存在，跳过');
      return true;
    }

    const fields = ['actual_date', 'sort_order'];

    for (const field of fields) {
      const exists = await checkFieldExists('project_milestones', field);
      if (!exists) {
        log('Step 3', 'warning', `project_milestones.${field} 字段不存在，跳过`);
        continue;
      }

      await databaseService.query(`
        ALTER TABLE project_milestones
        DROP COLUMN ${field}
      `);

      log('Step 3', 'success', `project_milestones.${field} 字段已删除`);
    }

    return true;
  } catch (error) {
    log('Step 3', 'error', '删除 project_milestones 表字段失败', error);
    return false;
  }
}

/**
 * 步骤4: 删除 wbs_tasks 表的 wbs_code、level 和 subtasks 字段
 */
async function dropWbsTasksFields(): Promise<boolean> {
  try {
    const fields = ['wbs_code', 'level', 'subtasks'];

    for (const field of fields) {
      const exists = await checkFieldExists('wbs_tasks', field);
      if (!exists) {
        log('Step 4', 'warning', `wbs_tasks.${field} 字段不存在，跳过`);
        continue;
      }

      await databaseService.query(`
        ALTER TABLE wbs_tasks
        DROP COLUMN ${field}
      `);

      log('Step 4', 'success', `wbs_tasks.${field} 字段已删除`);
    }

    return true;
  } catch (error) {
    log('Step 4', 'error', '删除 wbs_tasks 表字段失败', error);
    return false;
  }
}

/**
 * 步骤5: 删除添加的索引
 */
async function dropIndexes(): Promise<boolean> {
  try {
    // 删除 project_members.idx_role 索引（如果是由本次迁移添加的）
    const indexExists = await databaseService.query(`
      SELECT INDEX_NAME
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'project_members'
        AND INDEX_NAME = 'idx_role'
    `) as any[];

    if (indexExists.length > 0) {
      await databaseService.query(`
        ALTER TABLE project_members
        DROP INDEX idx_role
      `);
      log('Step 5', 'success', 'project_members.idx_role 索引已删除');
    } else {
      log('Step 5', 'warning', 'project_members.idx_role 索引不存在，跳过');
    }

    return true;
  } catch (error) {
    log('Step 5', 'error', '删除索引失败', error);
    return false;
  }
}

/**
 * 步骤6: 删除迁移记录
 */
async function removeMigrationRecord(): Promise<boolean> {
  try {
    await databaseService.query(`
      DELETE FROM migrations WHERE version = ?
    `, [MIGRATION_VERSION]);

    log('Step 6', 'success', '迁移记录已删除');
    return true;
  } catch (error) {
    log('Step 6', 'error', '删除迁移记录失败', error);
    return false;
  }
}

/**
 * 执行回滚
 */
export async function rollbackMigration004(): Promise<boolean> {
  console.log('🔄 开始回滚数据库迁移 004: 补充缺失的数据库字段');
  console.log('=' .repeat(70));
  console.log('⚠️ 警告：回滚操作将删除添加的字段和相关数据！');
  console.log('=' .repeat(70));

  try {
    // 执行回滚步骤（逆序）
    const steps = [
      dropIndexes,
      dropWbsTasksFields,
      dropProjectMilestonesFields,
      dropProjectMembersFields,
      dropProjectsActualDates,
      removeMigrationRecord,
    ];

    let allSuccess = true;
    for (const step of steps) {
      const success = await step();
      if (!success) {
        allSuccess = false;
        // 不中断，继续执行后续步骤
      }
    }

    // 输出总结
    console.log('=' .repeat(70));
    console.log('📊 回滚 004 执行总结:');
    console.log(`  总步骤数: ${logs.length}`);
    console.log(`  成功: ${logs.filter(l => l.status === 'success').length}`);
    console.log(`  警告: ${logs.filter(l => l.status === 'warning').length}`);
    console.log(`  失败: ${logs.filter(l => l.status === 'error').length}`);

    if (allSuccess) {
      console.log('🎉 回滚 004 完成！');
    } else {
      console.log('⚠️ 回滚 004 完成，但存在警告或错误');
    }

    return allSuccess;
  } catch (error) {
    console.error('❌ 回滚失败:', error);
    return false;
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  rollbackMigration004().then(success => {
    process.exit(success ? 0 : 1);
  });
}
