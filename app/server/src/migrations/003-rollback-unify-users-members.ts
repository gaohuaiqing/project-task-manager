/**
 * 数据库迁移 003 回滚脚本: 统一 users 和 members 表关系
 *
 * 此脚本用于回滚迁移 003，恢复到迁移前的状态
 *
 * 警告：回滚操作可能导致数据丢失，请确保已备份！
 */

import { databaseService } from '../services/DatabaseService.js';

const MIGRATION_VERSION = '003';

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
 * 步骤1: 删除数据字典视图
 */
async function dropDataDictionaryViews(): Promise<boolean> {
  try {
    await databaseService.query(`DROP VIEW IF EXISTS v_user_members`);
    log('Step 1', 'success', '数据字典视图已删除');
    return true;
  } catch (error) {
    log('Step 1', 'error', '删除数据字典视图失败', error);
    return false;
  }
}

/**
 * 步骤2: 恢复 task_assignments.assignee_id 引用 users.id
 */
async function restoreTaskAssignmentsAssignee(): Promise<boolean> {
  try {
    // 检查是否需要恢复
    const currentRef = await databaseService.query(`
      SELECT REFERENCED_TABLE_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'task_assignments'
        AND COLUMN_NAME = 'assignee_id'
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `) as any[];

    if (currentRef.length === 0 || currentRef[0].REFERENCED_TABLE_NAME === 'users') {
      log('Step 2', 'warning', 'task_assignments.assignee_id 已引用 users，跳过');
      return true;
    }

    // 删除现有外键
    await databaseService.query(`
      ALTER TABLE task_assignments
      DROP FOREIGN KEY fk_task_assignments_assignee_id
    `);

    // 创建引用 users 的外键
    await databaseService.query(`
      ALTER TABLE task_assignments
      ADD CONSTRAINT fk_task_assignments_assignee_id
      FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE CASCADE
    `);

    log('Step 2', 'success', 'task_assignments.assignee_id 已恢复引用 users.id');
    return true;
  } catch (error) {
    log('Step 2', 'error', '恢复 task_assignments.assignee_id 失败', error);
    return false;
  }
}

/**
 * 步骤3: 删除 members.user_id 外键约束
 */
async function dropMemberUserForeignKey(): Promise<boolean> {
  try {
    // 检查外键是否存在
    const foreignKeys = await databaseService.query(`
      SELECT CONSTRAINT_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'members'
        AND COLUMN_NAME = 'user_id'
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `) as any[];

    if (foreignKeys.length === 0) {
      log('Step 3', 'warning', 'members.user_id 外键不存在，跳过');
      return true;
    }

    // 删除外键
    await databaseService.query(`
      ALTER TABLE members
      DROP FOREIGN KEY fk_members_user_id
    `);

    log('Step 3', 'success', 'members.user_id 外键已删除');
    return true;
  } catch (error) {
    log('Step 3', 'error', '删除 members.user_id 外键失败', error);
    return false;
  }
}

/**
 * 步骤4: 清除 members.user_id 关联数据
 */
async function clearMemberUserIdLinks(): Promise<boolean> {
  try {
    // 检查是否有关联数据
    const linkedCount = await databaseService.query(`
      SELECT COUNT(*) as count FROM members WHERE user_id IS NOT NULL
    `) as any[];

    if (linkedCount[0].count === 0) {
      log('Step 4', 'warning', '没有 members.user_id 关联数据，跳过');
      return true;
    }

    log('Step 4', 'warning', `即将清除 ${linkedCount[0].count} 条 members.user_id 关联数据`);

    // 清除关联（保留字段，仅清空值）
    await databaseService.query(`
      UPDATE members SET user_id = NULL WHERE user_id IS NOT NULL
    `);

    log('Step 4', 'success', 'members.user_id 关联数据已清除');
    return true;
  } catch (error) {
    log('Step 4', 'error', '清除 members.user_id 关联数据失败', error);
    return false;
  }
}

/**
 * 步骤5: 删除 members.user_id 字段
 */
async function dropMemberUserIdField(): Promise<boolean> {
  try {
    // 检查字段是否存在
    const columns = await databaseService.query(`
      SELECT COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'members'
        AND COLUMN_NAME = 'user_id'
    `) as any[];

    if (columns.length === 0) {
      log('Step 5', 'warning', 'members.user_id 字段不存在，跳过');
      return true;
    }

    // 删除字段
    await databaseService.query(`
      ALTER TABLE members
      DROP COLUMN user_id
    `);

    log('Step 5', 'success', 'members.user_id 字段已删除');
    return true;
  } catch (error) {
    log('Step 5', 'error', '删除 members.user_id 字段失败', error);
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
export async function rollbackMigration003(): Promise<boolean> {
  console.log('🔄 开始回滚数据库迁移 003: 统一 users 和 members 表关系');
  console.log('=' .repeat(70));
  console.log('⚠️ 警告：回滚操作可能导致数据丢失，请确保已备份！');
  console.log('=' .repeat(70));

  try {
    // 执行回滚步骤（逆序）
    const steps = [
      dropDataDictionaryViews,
      restoreTaskAssignmentsAssignee,
      dropMemberUserForeignKey,
      clearMemberUserIdLinks,
      dropMemberUserIdField,
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
    console.log('📊 回滚 003 执行总结:');
    console.log(`  总步骤数: ${logs.length}`);
    console.log(`  成功: ${logs.filter(l => l.status === 'success').length}`);
    console.log(`  警告: ${logs.filter(l => l.status === 'warning').length}`);
    console.log(`  失败: ${logs.filter(l => l.status === 'error').length}`);

    if (allSuccess) {
      console.log('🎉 回滚 003 完成！');
    } else {
      console.log('⚠️ 回滚 003 完成，但存在警告或错误');
    }

    return allSuccess;
  } catch (error) {
    console.error('❌ 回滚失败:', error);
    return false;
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  rollbackMigration003().then(success => {
    process.exit(success ? 0 : 1);
  });
}
