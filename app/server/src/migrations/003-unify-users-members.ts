/**
 * 数据库迁移 003: 统一 users 和 members 表关系
 *
 * 目标：
 * 1. 明确两表职责：users 用于系统认证，members 用于业务逻辑
 * 2. 添加 members.user_id 外键关联两表
 * 3. 统一所有 assignee 字段引用 members.id
 * 4. 保持 task_assignments 的审计追踪功能
 *
 * 回滚：
 * - 003-rollback-unify-users-members.ts
 */

import { databaseService } from '../services/DatabaseService.js';

const MIGRATION_VERSION = '003';
const MIGRATION_NAME = 'unify_users_members';

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
 * 检查迁移是否已执行
 */
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

/**
 * 记录迁移执行
 */
async function recordMigration(): Promise<void> {
  await databaseService.query(
    'INSERT INTO migrations (name, version, executed_at) VALUES (?, ?, NOW())',
    [MIGRATION_NAME, MIGRATION_VERSION]
  );
}

/**
 * 步骤1: 添加 members.user_id 字段
 */
async function addMemberUserIdField(): Promise<boolean> {
  try {
    // 检查字段是否已存在
    const columns = await databaseService.query(`
      SELECT COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'members'
        AND COLUMN_NAME = 'user_id'
    `) as any[];

    if (columns.length > 0) {
      log('Step 1', 'warning', 'members.user_id 字段已存在，跳过');
      return true;
    }

    // 添加字段
    await databaseService.query(`
      ALTER TABLE members
      ADD COLUMN user_id INT NULL COMMENT '关联的用户账户ID' AFTER created_by,
      ADD INDEX idx_user_id (user_id)
    `);

    log('Step 1', 'success', 'members.user_id 字段添加成功');
    return true;
  } catch (error) {
    log('Step 1', 'error', '添加 members.user_id 字段失败', error);
    return false;
  }
}

/**
 * 步骤2: 为现有 members 数据关联 user 记录
 */
async function linkMembersToUsers(): Promise<boolean> {
  try {
    // 检查未关联的 members
    const unlinkedMembers = await databaseService.query(`
      SELECT m.id, m.name, m.employee_id
      FROM members m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.user_id IS NULL
        AND m.status = 'active'
    `) as any[];

    if (unlinkedMembers.length === 0) {
      log('Step 2', 'success', '所有 members 已关联 user，无需处理');
      return true;
    }

    log('Step 2', 'warning', `发现 ${unlinkedMembers.length} 条未关联的 members 记录`);

    // 策略：基于 employee_id 或 name 查找已存在的 users
    let linkedCount = 0;
    for (const member of unlinkedMembers) {
      // 先尝试通过 employee_id 匹配 username
      let users = await databaseService.query(`
        SELECT id FROM users WHERE username = ?
      `, [member.employee_id]) as any[];

      // 如果没找到，尝试通过 name 匹配
      if (users.length === 0) {
        users = await databaseService.query(`
          SELECT id FROM users WHERE name = ?
        `, [member.name]) as any[];
      }

      // 如果找到对应的 user，建立关联
      if (users.length > 0) {
        await databaseService.query(`
          UPDATE members SET user_id = ? WHERE id = ?
        `, [users[0].id, member.id]);
        linkedCount++;
      }
    }

    log('Step 2', 'success', `成功关联 ${linkedCount}/${unlinkedMembers.length} 条 members 记录`);

    if (linkedCount < unlinkedMembers.length) {
      log('Step 2', 'warning', `还有 ${unlinkedMembers.length - linkedCount} 条 members 未关联 user，需要手动处理`);
    }

    return true;
  } catch (error) {
    log('Step 2', 'error', '关联 members 到 users 失败', error);
    return false;
  }
}

/**
 * 步骤3: 创建 members.user_id 外键约束
 */
async function createMemberUserForeignKey(): Promise<boolean> {
  try {
    // 检查外键是否已存在
    const foreignKeys = await databaseService.query(`
      SELECT CONSTRAINT_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'members'
        AND COLUMN_NAME = 'user_id'
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `) as any[];

    if (foreignKeys.length > 0) {
      log('Step 3', 'warning', 'members.user_id 外键已存在，跳过');
      return true;
    }

    // 创建外键
    await databaseService.query(`
      ALTER TABLE members
      ADD CONSTRAINT fk_members_user_id
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    `);

    log('Step 3', 'success', 'members.user_id 外键创建成功');
    return true;
  } catch (error) {
    log('Step 3', 'error', '创建 members.user_id 外键失败', error);
    return false;
  }
}

/**
 * 步骤4: 统一 task_assignments.assignee_id 引用 members.id
 */
async function unifyTaskAssignmentsAssignee(): Promise<boolean> {
  try {
    // 检查当前外键引用
    const currentRef = await databaseService.query(`
      SELECT REFERENCED_TABLE_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'task_assignments'
        AND COLUMN_NAME = 'assignee_id'
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `) as any[];

    if (currentRef.length === 0 || currentRef[0].REFERENCED_TABLE_NAME === 'members') {
      log('Step 4', 'warning', 'task_assignments.assignee_id 已引用 members，跳过');
      return true;
    }

    log('Step 4', 'warning', 'task_assignments.assignee_id 当前引用 users，需要迁移');

    // 备份现有数据
    await databaseService.query(`
      CREATE TABLE IF NOT EXISTS task_assignments_backup_003
      AS SELECT * FROM task_assignments
    `);

    log('Step 4', 'success', 'task_assignments 数据已备份到 task_assignments_backup_003');

    // 删除旧外键约束
    await databaseService.query(`
      ALTER TABLE task_assignments
      DROP FOREIGN KEY task_assignments_ibfk_2
    `);

    // 修改列类型和引用（如果需要）
    // 注意：这里假设 users.id 和 members.id 都是 INT，无需修改类型

    // 创建新外键约束
    await databaseService.query(`
      ALTER TABLE task_assignments
      ADD CONSTRAINT fk_task_assignments_assignee_id
      FOREIGN KEY (assignee_id) REFERENCES members(id) ON DELETE CASCADE
    `);

    log('Step 4', 'success', 'task_assignments.assignee_id 现在引用 members.id');
    return true;
  } catch (error) {
    log('Step 4', 'error', '修改 task_assignments.assignee_id 引用失败', error);
    return false;
  }
}

/**
 * 步骤5: 验证数据一致性
 */
async function validateDataConsistency(): Promise<boolean> {
  try {
    const issues: string[] = [];

    // 检查孤立的 members（有 user_id 但对应的 user 不存在）
    const orphanMembers = await databaseService.query(`
      SELECT COUNT(*) as count
      FROM members m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.user_id IS NOT NULL AND u.id IS NULL
    `) as any[];

    if (orphanMembers[0].count > 0) {
      issues.push(`发现 ${orphanMembers[0].count} 条孤立的 members 记录（user_id 指向不存在的用户）`);
    }

    // 检查 wbs_tasks.assignee_id 是否都指向有效的 members
    const invalidWbsAssignments = await databaseService.query(`
      SELECT COUNT(*) as count
      FROM wbs_tasks w
      LEFT JOIN members m ON w.assignee_id = m.id
      WHERE w.assignee_id IS NOT NULL AND m.id IS NULL
    `) as any[];

    if (invalidWbsAssignments[0].count > 0) {
      issues.push(`发现 ${invalidWbsAssignments[0].count} 条 wbs_tasks 记录的 assignee_id 指向不存在的成员`);
    }

    // 检查 task_assignments.assignee_id 是否都指向有效的 members
    const invalidTaskAssignments = await databaseService.query(`
      SELECT COUNT(*) as count
      FROM task_assignments ta
      LEFT JOIN members m ON ta.assignee_id = m.id
      WHERE m.id IS NULL
    `) as any[];

    if (invalidTaskAssignments[0].count > 0) {
      issues.push(`发现 ${invalidTaskAssignments[0].count} 条 task_assignments 记录的 assignee_id 指向不存在的成员`);
    }

    if (issues.length > 0) {
      log('Step 5', 'warning', '数据一致性检查发现问题', issues);
      return false;
    }

    log('Step 5', 'success', '数据一致性检查通过');
    return true;
  } catch (error) {
    log('Step 5', 'error', '数据一致性检查失败', error);
    return false;
  }
}

/**
 * 步骤6: 创建数据字典视图
 */
async function createDataDictionaryViews(): Promise<boolean> {
  try {
    // 创建用户-成员关联视图
    await databaseService.query(`
      CREATE OR REPLACE VIEW v_user_members AS
      SELECT
        u.id AS user_id,
        u.username,
        u.name AS user_name,
        u.role AS user_role,
        m.id AS member_id,
        m.name AS member_name,
        m.employee_id,
        m.department,
        m.position,
        m.status AS member_status
      FROM users u
      LEFT JOIN members m ON u.id = m.user_id
      ORDER BY u.id
    `);

    log('Step 6', 'success', '数据字典视图 v_user_members 创建成功');
    return true;
  } catch (error) {
    log('Step 6', 'error', '创建数据字典视图失败', error);
    return false;
  }
}

/**
 * 执行迁移
 */
export async function runMigration003(): Promise<boolean> {
  console.log('🚀 开始执行数据库迁移 003: 统一 users 和 members 表关系');
  console.log('=' .repeat(70));

  try {
    // 检查是否已执行
    if (await checkMigrationExecuted()) {
      console.log('📋 迁移 003 已执行，跳过');
      return true;
    }

    // 执行迁移步骤
    const steps = [
      addMemberUserIdField,
      linkMembersToUsers,
      createMemberUserForeignKey,
      unifyTaskAssignmentsAssignee,
      validateDataConsistency,
      createDataDictionaryViews,
    ];

    let allSuccess = true;
    for (const step of steps) {
      const success = await step();
      if (!success) {
        allSuccess = false;
        // 不中断，继续执行后续步骤
      }
    }

    // 记录迁移
    if (allSuccess) {
      await recordMigration();
      console.log('📝 迁移记录已保存');
    }

    // 输出总结
    console.log('=' .repeat(70));
    console.log('📊 迁移 003 执行总结:');
    console.log(`  总步骤数: ${logs.length}`);
    console.log(`  成功: ${logs.filter(l => l.status === 'success').length}`);
    console.log(`  警告: ${logs.filter(l => l.status === 'warning').length}`);
    console.log(`  失败: ${logs.filter(l => l.status === 'error').length}`);

    if (allSuccess) {
      console.log('🎉 迁移 003 完成！');
    } else {
      console.log('⚠️ 迁移 003 完成，但存在警告或错误');
    }

    return allSuccess;
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    return false;
  }
}

// 导出自动运行函数
export async function runPendingMigrations(): Promise<void> {
  console.log('🔍 检查待执行的数据库迁移 003...');
  await runMigration003();
}
