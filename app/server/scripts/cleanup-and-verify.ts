import mysql from 'mysql2/promise';

/**
 * 清理重复数据并验证数据完整性
 */
async function cleanupAndVerify() {
  const pool = await mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'task_manager',
  });

  console.log('🔄 开始清理和验证数据...\n');

  try {
    // 1. 清理任务类型映射的重复数据（保留最早的一条）
    console.log('🧹 清理任务类型映射重复数据...');
    await pool.execute(`
      DELETE t1 FROM task_type_model_mapping t1
      INNER JOIN task_type_model_mapping t2
      WHERE t1.id > t2.id
        AND t1.task_type = t2.task_type
        AND t1.model_id = t2.model_id
        AND t1.priority = t2.priority
    `);

    // 2. 验证数据完整性
    console.log('\n📊 数据验证结果:');
    console.log('='.repeat(50));

    // 用户统计
    const [users] = await pool.execute(`
      SELECT role, COUNT(*) as count
      FROM users
      GROUP BY role
    `);
    console.log('\n👤 用户数据:');
    for (const row of users as any[]) {
      console.log(`   ${row.role}: ${row.count} 人`);
    }

    // 成员统计
    const [members] = await pool.execute(`
      SELECT department, COUNT(*) as count
      FROM members
      GROUP BY department
    `);
    console.log('\n👥 成员数据:');
    for (const row of members as any[]) {
      console.log(`   ${row.department || '未分配'}: ${row.count} 人`);
    }

    // 部门统计
    const [depts] = await pool.execute('SELECT id, name FROM departments ORDER BY id');
    console.log('\n🏢 部门数据:');
    for (const row of depts as any[]) {
      console.log(`   [${row.id}] ${row.name}`);
    }

    // 能力模型统计
    const [capModels] = await pool.execute('SELECT id, name FROM capability_models');
    console.log('\n🎯 能力模型:');
    for (const row of capModels as any[]) {
      console.log(`   [${row.id}] ${row.name}`);
    }

    // 任务类型映射统计
    const [mappings] = await pool.execute(`
      SELECT task_type, COUNT(*) as count
      FROM task_type_model_mapping
      GROUP BY task_type
      ORDER BY task_type
    `);
    console.log('\n🔗 任务类型映射:');
    for (const row of mappings as any[]) {
      console.log(`   ${row.task_type}: ${row.count} 个模型`);
    }

    // 节假日统计
    const [holidays] = await pool.execute(`
      SELECT YEAR(holiday_date) as year, COUNT(*) as count
      FROM holidays
      GROUP BY YEAR(holiday_date)
      ORDER BY year
    `);
    console.log('\n📅 节假日数据:');
    for (const row of holidays as any[]) {
      console.log(`   ${row.year}年: ${row.count} 天`);
    }

    // 总体统计
    const [stats] = await pool.execute(`
      SELECT
        (SELECT COUNT(*) FROM users) as users,
        (SELECT COUNT(*) FROM members) as members,
        (SELECT COUNT(*) FROM departments) as departments,
        (SELECT COUNT(*) FROM capability_models) as capability_models,
        (SELECT COUNT(*) FROM task_type_model_mapping) as mappings,
        (SELECT COUNT(*) FROM holidays) as holidays,
        (SELECT COUNT(*) FROM projects) as projects,
        (SELECT COUNT(*) FROM wbs_tasks) as tasks
    `);
    const stat = (stats as any[])[0];
    console.log('\n📈 数据总览:');
    console.log('='.repeat(50));
    console.log(`   用户: ${stat.users}`);
    console.log(`   成员: ${stat.members}`);
    console.log(`   部门: ${stat.departments}`);
    console.log(`   能力模型: ${stat.capability_models}`);
    console.log(`   任务类型映射: ${stat.mappings}`);
    console.log(`   节假日: ${stat.holidays}`);
    console.log(`   项目: ${stat.projects}`);
    console.log(`   任务: ${stat.tasks}`);

    console.log('\n🎉 数据验证完成！');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ 验证失败:', error);
    await pool.end();
    process.exit(1);
  }
}

cleanupAndVerify();
