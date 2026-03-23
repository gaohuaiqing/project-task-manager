/**
 * 清理所有项目数据脚本
 * 删除 projects 表及所有关联数据
 *
 * 使用方法:
 *   cd app/server
 *   npx tsx scripts/cleanup-all-projects.ts
 */

import mysql from 'mysql2/promise';
import * as readline from 'readline';

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'task_manager',
};

// 可能需要清理的表（按删除顺序排列）
const TABLES_TO_CHECK = [
  { name: 'timeline_tasks', description: '时间线任务' },
  { name: 'timelines', description: '时间线' },
  { name: 'wbs_tasks', description: 'WBS任务' },
  { name: 'milestones', description: '里程碑' },
  { name: 'project_members', description: '项目成员' },
  { name: 'projects', description: '项目' },
];

function askConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

async function tableExists(pool: mysql.Pool, tableName: string): Promise<boolean> {
  try {
    await pool.query(`SELECT 1 FROM ${tableName} LIMIT 1`);
    return true;
  } catch {
    return false;
  }
}

async function getTableCount(pool: mysql.Pool, tableName: string): Promise<number> {
  try {
    const [rows] = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`) as [any[], any];
    return rows[0]?.count || 0;
  } catch {
    return -1; // 表不存在
  }
}

async function cleanupAllProjects() {
  console.log('========================================');
  console.log('    清理所有项目数据脚本');
  console.log('========================================\n');

  const pool = mysql.createPool(dbConfig);

  try {
    // 1. 检测存在的表
    console.log('🔍 检测数据库表...\n');
    const existingTables: { name: string; description: string }[] = [];

    for (const table of TABLES_TO_CHECK) {
      const exists = await tableExists(pool, table.name);
      if (exists) {
        existingTables.push(table);
        console.log(`   ✓ ${table.description} (${table.name}) - 存在`);
      } else {
        console.log(`   ○ ${table.description} (${table.name}) - 不存在，跳过`);
      }
    }

    if (existingTables.length === 0) {
      console.log('\n⚠️  没有找到需要清理的表');
      return;
    }

    // 2. 显示删除前的数据统计
    console.log('\n📊 删除前数据统计:\n');
    const beforeStats: { table: string; description: string; count: number }[] = [];

    for (const table of existingTables) {
      const count = await getTableCount(pool, table.name);
      beforeStats.push({ ...table, count });
      console.log(`   ${table.description} (${table.name}): ${count} 条`);
    }

    const totalRecords = beforeStats.reduce((sum, s) => sum + s.count, 0);
    console.log(`\n   📈 总计: ${totalRecords} 条记录\n`);

    if (totalRecords === 0) {
      console.log('✅ 没有需要清理的数据');
      return;
    }

    // 3. 确认删除
    console.log('⚠️  警告: 此操作将删除所有项目及关联数据！');
    console.log('⚠️  数据删除后无法恢复！\n');

    const confirmed = await askConfirmation('确认要删除所有项目数据吗？(yes/no): ');

    if (!confirmed) {
      console.log('\n❌ 操作已取消');
      return;
    }

    console.log('\n🔄 开始清理数据...\n');

    // 4. 开始事务
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // 禁用外键检查
      await connection.query('SET FOREIGN_KEY_CHECKS = 0');

      // 按顺序删除数据
      for (const table of existingTables) {
        await connection.query(`DELETE FROM ${table.name}`);
        console.log(`   ✓ 已清理 ${table.description} (${table.name})`);
      }

      // 重置自增ID（仅对 projects 表）
      if (existingTables.some(t => t.name === 'projects')) {
        await connection.query('ALTER TABLE projects AUTO_INCREMENT = 1');
        console.log('   ✓ 已重置项目ID自增值');
      }

      // 恢复外键检查
      await connection.query('SET FOREIGN_KEY_CHECKS = 1');

      // 提交事务
      await connection.commit();
      console.log('\n✅ 数据清理完成！\n');

    } catch (error) {
      // 回滚事务
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    // 5. 验证删除结果
    console.log('📊 删除后数据验证:\n');

    for (const table of existingTables) {
      const count = await getTableCount(pool, table.name);
      const status = count === 0 ? '✅' : '❌';
      console.log(`   ${status} ${table.description} (${table.name}): ${count} 条`);
    }

    console.log('\n========================================');
    console.log('    清理完成！');
    console.log('========================================\n');

  } catch (error) {
    console.error('\n❌ 清理失败:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// 执行清理
cleanupAllProjects();
