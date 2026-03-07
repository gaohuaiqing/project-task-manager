/**
 * 数据库迁移 004: 补充缺失的数据库字段
 *
 * 目标：
 * 1. 为 projects 表添加 actual_start_date 和 actual_end_date 字段
 * 2. 为 milestones 表添加 actual_date 和 sort_order 字段
 * 3. 为 project_members 表添加 role 和 member_name 字段
 * 4. 为 wbs_tasks 表添加 wbs_code、level 和 subtasks 字段
 *
 * 回滚：
 * - 004-rollback-add-missing-fields.ts
 */

import { databaseService } from '../services/DatabaseService.js';

const MIGRATION_VERSION = '004';
const MIGRATION_NAME = 'add_missing_fields';

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
 * 步骤1: 为 projects 表添加实际日期字段
 */
async function addProjectsActualDates(): Promise<boolean> {
  try {
    const fields = [
      { name: 'actual_start_date', type: 'DATE NULL COMMENT \'实际开始日期\'' },
      { name: 'actual_end_date', type: 'DATE NULL COMMENT \'实际结束日期\'' },
    ];

    for (const field of fields) {
      const exists = await checkFieldExists('projects', field.name);
      if (exists) {
        log('Step 1', 'warning', `projects.${field.name} 字段已存在，跳过`);
        continue;
      }

      await databaseService.query(`
        ALTER TABLE projects
        ADD COLUMN ${field.name} ${field.type} AFTER planned_end_date
      `);

      log('Step 1', 'success', `projects.${field.name} 字段添加成功`);
    }

    return true;
  } catch (error) {
    log('Step 1', 'error', '添加 projects 表字段失败', error);
    return false;
  }
}

/**
 * 步骤2: 为 project_members 表添加 role 和 member_name 字段
 */
async function addProjectMembersFields(): Promise<boolean> {
  try {
    // 检查是否使用新版本的 project_members 表（有 role 字段）
    const hasRole = await checkFieldExists('project_members', 'role');

    if (hasRole) {
      log('Step 2', 'warning', 'project_members.role 字段已存在，检查 member_name 字段');

      const hasMemberName = await checkFieldExists('project_members', 'member_name');
      if (hasMemberName) {
        log('Step 2', 'warning', 'project_members.member_name 字段已存在，跳过');
        return true;
      }

      // 只添加 member_name 字段
      await databaseService.query(`
        ALTER TABLE project_members
        ADD COLUMN member_name VARCHAR(100) NULL COMMENT '冗余成员名称' AFTER role
      `);

      log('Step 2', 'success', 'project_members.member_name 字段添加成功');

      // 为现有记录填充 member_name
      await databaseService.query(`
        UPDATE project_members pm
        LEFT JOIN members m ON pm.member_id = m.id
        SET pm.member_name = m.name
        WHERE pm.member_name IS NULL AND m.id IS NOT NULL
      `);

      log('Step 2', 'success', '已为现有 project_members 记录填充 member_name');

      return true;
    }

    // 添加 role 和 member_name 字段
    await databaseService.query(`
      ALTER TABLE project_members
      ADD COLUMN role ENUM('owner', 'manager', 'member', 'viewer') DEFAULT 'member' COMMENT '成员角色' AFTER user_id,
      ADD COLUMN member_name VARCHAR(100) NULL COMMENT '冗余成员名称' AFTER role
    `);

    log('Step 2', 'success', 'project_members.role 和 member_name 字段添加成功');

    // 为现有记录填充 member_name
    await databaseService.query(`
      UPDATE project_members pm
      LEFT JOIN users u ON pm.user_id = u.id
      SET pm.member_name = u.name
      WHERE pm.member_name IS NULL AND u.id IS NOT NULL
    `);

    log('Step 2', 'success', '已为现有 project_members 记录填充 member_name');

    return true;
  } catch (error) {
    log('Step 2', 'error', '添加 project_members 表字段失败', error);
    return false;
  }
}

/**
 * 步骤3: 为 project_milestones 表添加 actual_date 和 sort_order 字段
 */
async function addProjectMilestonesFields(): Promise<boolean> {
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

    const fields = [
      { name: 'actual_date', type: 'DATE NULL COMMENT \'实际完成日期\' AFTER planned_date' },
      { name: 'sort_order', type: 'INT DEFAULT 0 COMMENT \'排序序号\' AFTER status' },
    ];

    for (const field of fields) {
      const exists = await checkFieldExists('project_milestones', field.name);
      if (exists) {
        log('Step 3', 'warning', `project_milestones.${field.name} 字段已存在，跳过`);
        continue;
      }

      await databaseService.query(`
        ALTER TABLE project_milestones
        ADD COLUMN ${field.name} ${field.type}
      `);

      log('Step 3', 'success', `project_milestones.${field.name} 字段添加成功`);
    }

    // 为现有记录填充 sort_order（按 id 排序）
    await databaseService.query(`
      UPDATE project_milestones
      SET sort_order = id
      WHERE sort_order = 0 OR sort_order IS NULL
    `);

    log('Step 3', 'success', '已为现有 project_milestones 记录填充 sort_order');

    return true;
  } catch (error) {
    log('Step 3', 'error', '添加 project_milestones 表字段失败', error);
    return false;
  }
}

/**
 * 步骤4: 为 wbs_tasks 表添加 wbs_code、level 和 subtasks 字段
 */
async function addWbsTasksFields(): Promise<boolean> {
  try {
    const fields = [
      { name: 'wbs_code', type: 'VARCHAR(50) NULL COMMENT \'WBS编码(如1.1.2)\' AFTER task_code' },
      { name: 'level', type: 'INT NULL COMMENT \'层级深度\' AFTER task_name' },
      { name: 'subtasks', type: 'JSON NULL COMMENT \'子任务ID数组\' AFTER attachments' },
    ];

    for (const field of fields) {
      const exists = await checkFieldExists('wbs_tasks', field.name);
      if (exists) {
        log('Step 4', 'warning', `wbs_tasks.${field.name} 字段已存在，跳过`);
        continue;
      }

      await databaseService.query(`
        ALTER TABLE wbs_tasks
        ADD COLUMN ${field.name} ${field.type}
      `);

      log('Step 4', 'success', `wbs_tasks.${field.name} 字段添加成功`);
    }

    // 为现有记录计算 level
    await databaseService.query(`
      UPDATE wbs_tasks w
      LEFT JOIN wbs_tasks p ON w.parent_id = p.id
      SET w.level = CASE
        WHEN w.parent_id IS NULL THEN 1
        WHEN p.level IS NOT NULL THEN p.level + 1
        ELSE NULL
      END
      WHERE w.level IS NULL
    `);

    log('Step 4', 'success', '已为现有 wbs_tasks 记录计算 level');

    // 为现有记录填充 subtasks（基于 parent_id 反向查询）
    const tasks = await databaseService.query(`
      SELECT id FROM wbs_tasks WHERE parent_id IS NULL
    `) as any[];

    for (const task of tasks) {
      const subtaskIds = await databaseService.query(`
        SELECT id FROM wbs_tasks WHERE parent_id = ?
      `, [task.id]) as any[];

      if (subtaskIds.length > 0) {
        await databaseService.query(`
          UPDATE wbs_tasks
          SET subtasks = ?
          WHERE id = ?
        `, [JSON.stringify(subtaskIds.map((t: any) => t.id)), task.id]);
      }
    }

    log('Step 4', 'success', '已为现有 wbs_tasks 记录填充 subtasks');

    return true;
  } catch (error) {
    log('Step 4', 'error', '添加 wbs_tasks 表字段失败', error);
    return false;
  }
}

/**
 * 步骤5: 添加索引优化
 */
async function addIndexes(): Promise<boolean> {
  try {
    // 为 project_members 添加索引
    const indexExists = await databaseService.query(`
      SELECT INDEX_NAME
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'project_members'
        AND INDEX_NAME = 'idx_role'
    `) as any[];

    if (indexExists.length === 0) {
      await databaseService.query(`
        ALTER TABLE project_members
        ADD INDEX idx_role (role)
      `);
      log('Step 5', 'success', 'project_members.idx_role 索引添加成功');
    } else {
      log('Step 5', 'warning', 'project_members.idx_role 索引已存在，跳过');
    }

    return true;
  } catch (error) {
    log('Step 5', 'error', '添加索引失败', error);
    return false;
  }
}

/**
 * 步骤6: 验证数据完整性
 */
async function validateDataIntegrity(): Promise<boolean> {
  try {
    const issues: string[] = [];

    // 检查 projects 表日期字段的合理性
    const invalidDates = await databaseService.query(`
      SELECT COUNT(*) as count
      FROM projects
      WHERE (actual_start_date IS NOT NULL AND actual_end_date IS NOT NULL
        AND actual_start_date > actual_end_date)
         OR (planned_start_date IS NOT NULL AND planned_end_date IS NOT NULL
        AND planned_start_date > planned_end_date)
    `) as any[];

    if (invalidDates[0].count > 0) {
      issues.push(`发现 ${invalidDates[0].count} 条 projects 记录的日期不合理`);
    }

    // 检查 wbs_tasks.level 的合理性
    const invalidLevels = await databaseService.query(`
      SELECT COUNT(*) as count
      FROM wbs_tasks
      WHERE level IS NOT NULL AND (level < 1 OR level > 10)
    `) as any[];

    if (invalidLevels[0].count > 0) {
      issues.push(`发现 ${invalidLevels[0].count} 条 wbs_tasks 记录的 level 值不合理`);
    }

    if (issues.length > 0) {
      log('Step 6', 'warning', '数据完整性检查发现问题', issues);
      return false;
    }

    log('Step 6', 'success', '数据完整性检查通过');
    return true;
  } catch (error) {
    log('Step 6', 'error', '数据完整性检查失败', error);
    return false;
  }
}

/**
 * 执行迁移
 */
export async function runMigration004(): Promise<boolean> {
  console.log('🚀 开始执行数据库迁移 004: 补充缺失的数据库字段');
  console.log('=' .repeat(70));

  try {
    // 检查是否已执行
    if (await checkMigrationExecuted()) {
      console.log('📋 迁移 004 已执行，跳过');
      return true;
    }

    // 执行迁移步骤
    const steps = [
      addProjectsActualDates,
      addProjectMembersFields,
      addProjectMilestonesFields,
      addWbsTasksFields,
      addIndexes,
      validateDataIntegrity,
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
    console.log('📊 迁移 004 执行总结:');
    console.log(`  总步骤数: ${logs.length}`);
    console.log(`  成功: ${logs.filter(l => l.status === 'success').length}`);
    console.log(`  警告: ${logs.filter(l => l.status === 'warning').length}`);
    console.log(`  失败: ${logs.filter(l => l.status === 'error').length}`);

    if (allSuccess) {
      console.log('🎉 迁移 004 完成！');
    } else {
      console.log('⚠️ 迁移 004 完成，但存在警告或错误');
    }

    return allSuccess;
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    return false;
  }
}

// 导出自动运行函数
export async function runPendingMigrations(): Promise<void> {
  console.log('🔍 检查待执行的数据库迁移 004...');
  await runMigration004();
}
