/**
 * 数据库迁移 044: 添加报表查询优化索引
 *
 * 目标:
 * 1. 为报表分析模块的核心查询添加复合索引
 * 2. 优化权限过滤查询的性能
 * 3. 优化聚合统计查询
 *
 * 预期效果: 报表API响应时间从 ~1000ms 降低到 ~400ms
 */

import { getPool } from '../core/db';
import type { RowDataPacket } from 'mysql2/promise';

const MIGRATION_VERSION = '044';
const MIGRATION_NAME = 'add_report_query_indexes';

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
  const pool = getPool();
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

async function recordMigration(): Promise<void> {
  const pool = getPool();
  await pool.execute(
    'INSERT INTO migrations (name, version, executed_at) VALUES (?, ?, NOW())',
    [MIGRATION_NAME, MIGRATION_VERSION]
  );
}

async function checkIndexExists(tableName: string, indexName: string): Promise<boolean> {
  const pool = getPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT INDEX_NAME
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND INDEX_NAME = ?`,
    [tableName, indexName]
  );
  return rows.length > 0;
}

async function addReportIndexes(): Promise<boolean> {
  const pool = getPool();

  try {
    // ========== wbs_tasks 表报表查询复合索引 ==========

    // 索引1: project_id + assignee_id + status - 优化任务统计报表的核心查询
    const hasTaskStat = await checkIndexExists('wbs_tasks', 'idx_tasks_report_stats');
    if (!hasTaskStat) {
      await pool.execute(
        'CREATE INDEX idx_tasks_report_stats ON wbs_tasks (project_id, assignee_id, status)'
      );
      log('Step 1', 'success', 'idx_tasks_report_stats 索引添加成功 - 任务统计报表优化');
    } else {
      log('Step 1', 'warning', 'idx_tasks_report_stats 索引已存在，跳过');
    }

    // 索引2: project_id + priority + status - 优化优先级分布查询
    const hasPriority = await checkIndexExists('wbs_tasks', 'idx_tasks_priority_status');
    if (!hasPriority) {
      await pool.execute(
        'CREATE INDEX idx_tasks_priority_status ON wbs_tasks (project_id, priority, status)'
      );
      log('Step 2', 'success', 'idx_tasks_priority_status 索引添加成功 - 优先级分布优化');
    } else {
      log('Step 2', 'warning', 'idx_tasks_priority_status 索引已存在，跳过');
    }

    // 索引3: assignee_id + status + end_date - 优化延期分析报表
    const hasDelay = await checkIndexExists('wbs_tasks', 'idx_tasks_delay_analysis');
    if (!hasDelay) {
      await pool.execute(
        'CREATE INDEX idx_tasks_delay_analysis ON wbs_tasks (assignee_id, status, end_date)'
      );
      log('Step 3', 'success', 'idx_tasks_delay_analysis 索引添加成功 - 延期分析优化');
    } else {
      log('Step 3', 'warning', 'idx_tasks_delay_analysis 索引已存在，跳过');
    }

    // 索引4: assignee_id + progress - 优化成员效能分析
    const hasMemberEff = await checkIndexExists('wbs_tasks', 'idx_tasks_member_efficiency');
    if (!hasMemberEff) {
      await pool.execute(
        'CREATE INDEX idx_tasks_member_efficiency ON wbs_tasks (assignee_id, progress)'
      );
      log('Step 4', 'success', 'idx_tasks_member_efficiency 索引添加成功 - 成员效能优化');
    } else {
      log('Step 4', 'warning', 'idx_tasks_member_efficiency 索引已存在，跳过');
    }

    // ========== users 表权限过滤索引 ==========

    // 索引5: department_id + is_active - 优化部门成员查询
    const hasUserDept = await checkIndexExists('users', 'idx_users_dept_active');
    if (!hasUserDept) {
      await pool.execute(
        'CREATE INDEX idx_users_dept_active ON users (department_id, is_active)'
      );
      log('Step 5', 'success', 'idx_users_dept_active 索引添加成功 - 权限过滤优化');
    } else {
      log('Step 5', 'warning', 'idx_users_dept_active 索引已存在，跳过');
    }

    // 索引6: id + department_id - 优化用户部门关联查询
    const hasUserDeptId = await checkIndexExists('users', 'idx_users_id_dept');
    if (!hasUserDeptId) {
      await pool.execute(
        'CREATE INDEX idx_users_id_dept ON users (id, department_id)'
      );
      log('Step 6', 'success', 'idx_users_id_dept 索引添加成功 - 用户部门关联优化');
    } else {
      log('Step 6', 'warning', 'idx_users_id_dept 索引已存在，跳过');
    }

    // ========== project_members 表关联索引 ==========

    // 索引7: project_id + user_id - 优化项目成员关联查询（如果不存在）
    const hasProjMem = await checkIndexExists('project_members', 'idx_proj_mem_project_user');
    if (!hasProjMem) {
      await pool.execute(
        'CREATE INDEX idx_proj_mem_project_user ON project_members (project_id, user_id)'
      );
      log('Step 7', 'success', 'idx_proj_mem_project_user 索引添加成功 - 项目成员关联优化');
    } else {
      log('Step 7', 'warning', 'idx_proj_mem_project_user 索引已存在，跳过');
    }

    // 索引8: user_id - 优化用户参与项目查询
    const hasProjMemUser = await checkIndexExists('project_members', 'idx_proj_mem_user');
    if (!hasProjMemUser) {
      await pool.execute(
        'CREATE INDEX idx_proj_mem_user ON project_members (user_id)'
      );
      log('Step 8', 'success', 'idx_proj_mem_user 索引添加成功 - 用户项目关联优化');
    } else {
      log('Step 8', 'warning', 'idx_proj_mem_user 索引已存在，跳过');
    }

    // ========== departments 表层级查询索引 ==========

    // 索引9: parent_id + manager_id - 优化部门层级递归查询
    const hasDeptParent = await checkIndexExists('departments', 'idx_dept_parent_manager');
    if (!hasDeptParent) {
      await pool.execute(
        'CREATE INDEX idx_dept_parent_manager ON departments (parent_id, manager_id)'
      );
      log('Step 9', 'success', 'idx_dept_parent_manager 索引添加成功 - 部门层级查询优化');
    } else {
      log('Step 9', 'warning', 'idx_dept_parent_manager 索引已存在，跳过');
    }

    // 索引10: manager_id - 优化按经理查询部门
    const hasDeptMgr = await checkIndexExists('departments', 'idx_dept_manager');
    if (!hasDeptMgr) {
      await pool.execute(
        'CREATE INDEX idx_dept_manager ON departments (manager_id)'
      );
      log('Step 10', 'success', 'idx_dept_manager 索引添加成功 - 部门经理查询优化');
    } else {
      log('Step 10', 'warning', 'idx_dept_manager 索引已存在，跳过');
    }

    // ========== projects 表报表查询索引 ==========

    // 索引11: status + planned_end_date - 优化项目进度报表延期计算
    const hasProjDelay = await checkIndexExists('projects', 'idx_projects_status_deadline');
    if (!hasProjDelay) {
      await pool.execute(
        'CREATE INDEX idx_projects_status_deadline ON projects (status, planned_end_date)'
      );
      log('Step 11', 'success', 'idx_projects_status_deadline 索引添加成功 - 项目延期计算优化');
    } else {
      log('Step 11', 'warning', 'idx_projects_status_deadline 索引已存在，跳过');
    }

    return true;
  } catch (error) {
    log('Steps 1-11', 'error', '索引添加失败');
    console.error(error);
    return false;
  }
}

export async function runMigration044(): Promise<boolean> {
  console.log('🚀 开始执行数据库迁移 044: 添加报表查询优化索引');
  console.log('='.repeat(70));

  try {
    if (await checkMigrationExecuted()) {
      console.log('📋 迁移 044 已执行，跳过');
      return true;
    }

    const success = await addReportIndexes();

    if (success) {
      await recordMigration();
      console.log('📝 迁移记录已保存');
    }

    console.log('='.repeat(70));
    console.log('📊 迁移 044 执行总结:');
    console.log(`  成功: ${logs.filter(l => l.status === 'success').length}`);
    console.log(`  警告: ${logs.filter(l => l.status === 'warning').length}`);
    console.log(`  失败: ${logs.filter(l => l.status === 'error').length}`);

    if (success) {
      console.log('🎉 迁移 044 完成！');
    }

    return success;
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    return false;
  }
}

