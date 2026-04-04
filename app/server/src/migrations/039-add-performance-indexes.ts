/**
 * 数据库迁移 039: 添加性能优化索引
 *
 * 目标:
 * 1. 为 wbs_tasks 表添加常用查询索引
 * 2. 为 projects 表添加常用查询索引
 * 3. 为 milestones 表添加常用查询索引
 */

import { databaseService } from '../services/DatabaseService.js';

const MIGRATION_VERSION = '039';
const MIGRATION_NAME = 'add_performance_indexes';

interface MigrationLog {
  step: string;
  status: 'success' | 'warning' | 'error';
  message: string;
}

const logs: MigrationLog[] = [];

function log(step: string, status: 'success' | 'warning' | 'error', message: string) {
  logs.push({ step, status, message });
  const icon = status === 'success' ? '✅' : status === 'warning' ? '⚠️' : '❌';
  console.log(`${icon} [${step}] ${message}`);
}

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

async function checkIndexExists(tableName: string, indexName: string): Promise<boolean> {
  const indexes = await databaseService.query(`
    SELECT INDEX_NAME
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND INDEX_NAME = ?
  `, [tableName, indexName]) as any[];
  return indexes.length > 0;
}

async function addIndexes(): Promise<boolean> {
  try {
    // ========== wbs_tasks 表索引 ==========

    // 索引1: 项目+状态复合索引 - 用于按项目筛选任务
    const hasProjectStatus = await checkIndexExists('wbs_tasks', 'idx_tasks_project_status');
    if (!hasProjectStatus) {
      await databaseService.query(`
        CREATE INDEX idx_tasks_project_status ON wbs_tasks (project_id, status)
      `);
      log('Step 1', 'success', 'idx_tasks_project_status 索引添加成功');
    } else {
      log('Step 1', 'warning', 'idx_tasks_project_status 索引已存在，跳过');
    }

    // 索引2: 负责人索引 - 用于按成员查询任务
    const hasAssignee = await checkIndexExists('wbs_tasks', 'idx_tasks_assignee');
    if (!hasAssignee) {
      await databaseService.query(`
        CREATE INDEX idx_tasks_assignee ON wbs_tasks (assignee_id)
      `);
      log('Step 2', 'success', 'idx_tasks_assignee 索引添加成功');
    } else {
      log('Step 2', 'warning', 'idx_tasks_assignee 索引已存在，跳过');
    }

    // 索引3: 日期索引 - 用于按时间范围查询
    const hasDates = await checkIndexExists('wbs_tasks', 'idx_tasks_dates');
    if (!hasDates) {
      await databaseService.query(`
        CREATE INDEX idx_tasks_dates ON wbs_tasks (start_date, end_date)
      `);
      log('Step 3', 'success', 'idx_tasks_dates 索引添加成功');
    } else {
      log('Step 3', 'warning', 'idx_tasks_dates 索引已存在，跳过');
    }

    // 索引4: 父任务索引 - 用于递归查询子任务
    const hasParent = await checkIndexExists('wbs_tasks', 'idx_tasks_parent');
    if (!hasParent) {
      await databaseService.query(`
        CREATE INDEX idx_tasks_parent ON wbs_tasks (parent_id)
      `);
      log('Step 4', 'success', 'idx_tasks_parent 索引添加成功');
    } else {
      log('Step 4', 'warning', 'idx_tasks_parent 索引已存在，跳过');
    }

    // 索引5: 前置任务索引 - 用于依赖关系查询
    const hasPredecessor = await checkIndexExists('wbs_tasks', 'idx_tasks_predecessor');
    if (!hasPredecessor) {
      await databaseService.query(`
        CREATE INDEX idx_tasks_predecessor ON wbs_tasks (predecessor_id)
      `);
      log('Step 5', 'success', 'idx_tasks_predecessor 索引添加成功');
    } else {
      log('Step 5', 'warning', 'idx_tasks_predecessor 索引已存在，跳过');
    }

    // ========== projects 表索引 ==========

    // 索引6: 状态索引 - 用于按状态筛选项目
    const hasProjectStatusIdx = await checkIndexExists('projects', 'idx_projects_status');
    if (!hasProjectStatusIdx) {
      await databaseService.query(`
        CREATE INDEX idx_projects_status ON projects (status)
      `);
      log('Step 6', 'success', 'idx_projects_status 索引添加成功');
    } else {
      log('Step 6', 'warning', 'idx_projects_status 索引已存在，跳过');
    }

    // 索引7: 部门索引 - 用于按部门筛选项目
    const hasDeptIdx = await checkIndexExists('projects', 'idx_projects_dept');
    if (!hasDeptIdx) {
      await databaseService.query(`
        CREATE INDEX idx_projects_dept ON projects (department_id)
      `);
      log('Step 7', 'success', 'idx_projects_dept 索引添加成功');
    } else {
      log('Step 7', 'warning', 'idx_projects_dept 索引已存在，跳过');
    }

    // 索引8: 时间范围索引 - 用于按时间查询项目
    const hasProjectDates = await checkIndexExists('projects', 'idx_projects_dates');
    if (!hasProjectDates) {
      await databaseService.query(`
        CREATE INDEX idx_projects_dates ON projects (planned_start_date, planned_end_date)
      `);
      log('Step 8', 'success', 'idx_projects_dates 索引添加成功');
    } else {
      log('Step 8', 'warning', 'idx_projects_dates 索引已存在，跳过');
    }

    // ========== milestones 表索引 ==========

    // 索引9: 项目索引 - 用于查询项目的里程碑
    const hasMilestoneProject = await checkIndexExists('project_milestones', 'idx_milestones_project');
    if (!hasMilestoneProject) {
      await databaseService.query(`
        CREATE INDEX idx_milestones_project ON project_milestones (project_id)
      `);
      log('Step 9', 'success', 'idx_milestones_project 索引添加成功');
    } else {
      log('Step 9', 'warning', 'idx_milestones_project 索引已存在，跳过');
    }

    // 索引10: 目标日期索引 - 用于按日期查询里程碑
    const hasMilestoneDate = await checkIndexExists('project_milestones', 'idx_milestones_date');
    if (!hasMilestoneDate) {
      await databaseService.query(`
        CREATE INDEX idx_milestones_date ON project_milestones (planned_date)
      `);
      log('Step 10', 'success', 'idx_milestones_date 索引添加成功');
    } else {
      log('Step 10', 'warning', 'idx_milestones_date 索引已存在，跳过');
    }

    return true;
  } catch (error) {
    log('Steps 1-10', 'error', '索引添加失败');
    console.error(error);
    return false;
  }
}

export async function runMigration039(): Promise<boolean> {
  console.log('🚀 开始执行数据库迁移 039: 添加性能优化索引');
  console.log('='.repeat(70));

  try {
    if (await checkMigrationExecuted()) {
      console.log('📋 迁移 039 已执行，跳过');
      return true;
    }

    const success = await addIndexes();

    if (success) {
      await recordMigration();
      console.log('📝 迁移记录已保存');
    }

    console.log('='.repeat(70));
    console.log('📊 迁移 039 执行总结:');
    console.log(`  成功: ${logs.filter(l => l.status === 'success').length}`);
    console.log(`  警告: ${logs.filter(l => l.status === 'warning').length}`);
    console.log(`  失败: ${logs.filter(l => l.status === 'error').length}`);

    if (success) {
      console.log('🎉 迁移 039 完成！');
    }

    return success;
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    return false;
  }
}

export async function runPendingMigrations(): Promise<void> {
  console.log('🔍 检查待执行的数据库迁移 039...');
  await runMigration039();
}
