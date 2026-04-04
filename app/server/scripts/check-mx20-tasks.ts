/**
 * 检查 MX20 项目任务数据
 * 用于诊断任务消失问题
 *
 * 使用方法:
 *   cd app/server
 *   npx tsx scripts/check-mx20-tasks.ts
 */

import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'task_manager',
};

async function checkMX20Tasks() {
  console.log('========================================');
  console.log('    MX20 任务数据诊断工具');
  console.log('========================================\n');

  const pool = await mysql.createPool(dbConfig);

  try {
    // 1. 检查所有项目
    console.log('📁 检查所有项目:\n');
    const [projects] = await pool.execute(`
      SELECT id, code, name, status, created_at, updated_at
      FROM projects
      ORDER BY created_at DESC
    `);

    if ((projects as any[]).length === 0) {
      console.log('   ⚠️  没有找到任何项目！\n');
    } else {
      for (const p of projects as any[]) {
        const isMX20 = p.name.includes('MX20') || p.code?.includes('MX20');
        const marker = isMX20 ? ' 👈 MX20 项目' : '';
        console.log(`   [${p.id}] ${p.code || 'N/A'} - ${p.name} (${p.status})${marker}`);
        console.log(`       创建: ${p.created_at}, 更新: ${p.updated_at}`);
      }
      console.log('');
    }

    // 2. 查找 MX20 相关项目
    console.log('🔍 查找 MX20 相关项目:\n');
    const [mx20Projects] = await pool.execute(`
      SELECT id, code, name, status
      FROM projects
      WHERE name LIKE '%MX20%' OR code LIKE '%MX20%'
    `);

    const mx20ProjectIds = (mx20Projects as any[]).map(p => p.id);
    if (mx20ProjectIds.length === 0) {
      console.log('   ⚠️  没有找到 MX20 项目！\n');
    } else {
      for (const p of mx20Projects as any[]) {
        console.log(`   [${p.id}] ${p.code || 'N/A'} - ${p.name} (${p.status})`);
      }
      console.log('');
    }

    // 3. 检查所有任务数量
    console.log('📊 任务统计:\n');
    const [taskStats] = await pool.execute(`
      SELECT
        COUNT(*) as total,
        COUNT(DISTINCT project_id) as project_count
      FROM wbs_tasks
    `);
    const stats = (taskStats as any[])[0];
    console.log(`   总任务数: ${stats.total}`);
    console.log(`   涉及项目数: ${stats.project_count}\n`);

    // 4. 按项目分组统计任务
    console.log('📋 各项目任务数:\n');
    const [projectTaskCounts] = await pool.execute(`
      SELECT
        p.id,
        p.name,
        p.code,
        COUNT(t.id) as task_count
      FROM projects p
      LEFT JOIN wbs_tasks t ON t.project_id = p.id
      GROUP BY p.id, p.name, p.code
      ORDER BY task_count DESC
    `);

    for (const p of projectTaskCounts as any[]) {
      const isMX20 = p.name?.includes('MX20') || p.code?.includes('MX20');
      const marker = isMX20 ? ' 👈 MX20 项目' : '';
      console.log(`   [${p.id}] ${p.code || 'N/A'} - ${p.name}: ${p.task_count} 个任务${marker}`);
    }
    console.log('');

    // 5. 检查孤立的任务（project_id 不存在）
    console.log('🔗 检查孤立任务（项目ID无效）:\n');
    const [orphanTasks] = await pool.execute(`
      SELECT t.id, t.project_id, t.wbs_code, t.description
      FROM wbs_tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE p.id IS NULL
      LIMIT 10
    `);

    if ((orphanTasks as any[]).length === 0) {
      console.log('   ✅ 没有孤立任务\n');
    } else {
      console.log(`   ⚠️  发现 ${(orphanTasks as any[]).length} 个孤立任务！\n`);
      for (const t of orphanTasks as any[]) {
        console.log(`   [${t.id}] project_id=${t.project_id}, wbs=${t.wbs_code}, desc=${t.description?.substring(0, 30)}...`);
      }
      console.log('');
    }

    // 6. 检查最近删除的任务（如果有审计日志）
    console.log('📝 检查最近的操作记录:\n');
    try {
      const [auditLogs] = await pool.execute(`
        SELECT action, table_name, record_id, details, created_at
        FROM audit_logs
        WHERE table_name IN ('wbs_tasks', 'projects')
        ORDER BY created_at DESC
        LIMIT 10
      `);

      if ((auditLogs as any[]).length === 0) {
        console.log('   没有找到审计日志\n');
      } else {
        for (const log of auditLogs as any[]) {
          console.log(`   [${log.created_at}] ${log.action} ${log.table_name} - ${log.details?.substring(0, 50)}...`);
        }
        console.log('');
      }
    } catch (e) {
      console.log('   审计日志表不存在或查询失败\n');
    }

    // 7. 如果找到 MX20 项目，检查其任务
    if (mx20ProjectIds.length > 0) {
      console.log('🔎 MX20 项目的任务详情:\n');
      const placeholders = mx20ProjectIds.map(() => '?').join(',');
      const [mx20Tasks] = await pool.execute(
        `SELECT id, wbs_code, description, status, created_at, updated_at
         FROM wbs_tasks
         WHERE project_id IN (${placeholders})
         ORDER BY wbs_code`,
        mx20ProjectIds
      );

      if ((mx20Tasks as any[]).length === 0) {
        console.log('   ⚠️  MX20 项目下没有任务！\n');
        console.log('   可能原因：');
        console.log('   1. 任务从未被成功创建');
        console.log('   2. 任务被删除了');
        console.log('   3. 数据库服务重启导致数据丢失\n');
      } else {
        console.log(`   找到 ${(mx20Tasks as any[]).length} 个任务:\n`);
        for (const t of mx20Tasks as any[]) {
          console.log(`   [${t.wbs_code}] ${t.description?.substring(0, 40)}... (${t.status})`);
          console.log(`       创建: ${t.created_at}, 更新: ${t.updated_at}`);
        }
        console.log('');
      }
    }

    // 8. 检查数据库连接和版本
    console.log('🔧 数据库信息:\n');
    const [dbInfo] = await pool.execute('SELECT VERSION() as version');
    console.log(`   MySQL 版本: ${(dbInfo as any[])[0].version}\n`);

    console.log('========================================');
    console.log('    诊断完成！');
    console.log('========================================\n');

  } catch (error) {
    console.error('❌ 诊断失败:', error);
  } finally {
    await pool.end();
  }
}

checkMX20Tasks();
