import mysql from 'mysql2/promise';

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'task_manager'
};

async function analyzeFullDatabase() {
  const conn = await mysql.createConnection(dbConfig);

  try {
    console.log('=== MySQL 数据库完整分析报告 ===\n');

    // 1. 获取所有表
    const [tables] = await conn.query('SHOW TABLES');
    const tableNames = (tables as any[]).map(t => Object.values(t)[0]);

    console.log(`📊 数据库中共有 ${tableNames.length} 个表:\n`);

    // 按功能分组
    const tableGroups: { [key: string]: string[] } = {
      '用户与权限': ['users', 'sessions', 'permission_configs', 'permission_history'],
      '项目与任务': ['projects', 'wbs_tasks', 'task_assignments', 'project_members', 'project_milestones', 'milestones'],
      '组织架构': ['departments', 'tech_groups', 'members', 'user_departments', 'user_tech_groups'],
      '数据同步': ['global_data', 'data_versions', 'data_change_log', 'data_changes', 'data_fingerprints', 'data_locks', 'sync_conflicts', 'real_time_change_log', 'real_time_locks'],
      '系统管理': ['system_logs', 'operation_queue', 'online_users'],
      '其他': ['holidays']
    };

    for (const [group, groupTables] of Object.entries(tableGroups)) {
      const existingTables = groupTables.filter(t => tableNames.includes(t));
      if (existingTables.length > 0) {
        console.log(`📁 ${group}:`);
        existingTables.forEach(t => console.log(`   - ${t}`));
        console.log('');
      }
    }

    // 显示已删除的表
    const deletedTables = Object.values(tableGroups).flat().filter(t => !tableNames.includes(t));
    if (deletedTables.length > 0) {
      console.log('🗑️  已删除的表:');
      deletedTables.forEach(t => console.log(`   - ${t}`));
      console.log('');
    }

    console.log('='.repeat(60) + '\n');

    // 2. 分析每个表的结构和数据
    for (const tableName of tableNames) {
      console.log(`📋 表: ${tableName}`);

      // 获取记录数
      const [countResult] = await conn.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      const count = (countResult as any[])[0].count;
      console.log(`   记录数: ${count}`);

      // 获取表结构
      const [columns] = await conn.query(`DESCRIBE ${tableName}`);
      console.log(`   字段数: ${(columns as any[]).length}`);

      // 显示关键字段
      const keyFields = (columns as any[]).slice(0, 5).map((c: any) => c.Field);
      console.log(`   关键字段: ${keyFields.join(', ')}`);

      // 如果有数据，显示前2条
      if (count > 0) {
        const [rows] = await conn.query(`SELECT * FROM ${tableName} LIMIT 2`);
        console.log(`   样本数据 (前2条):`);
        (rows as any[]).forEach((row, index) => {
          const preview = JSON.stringify(row, null, 0).substring(0, 100);
          console.log(`     [${index + 1}] ${preview}...`);
        });
      } else {
        console.log(`   ⚠️  此表为空`);
      }

      console.log('');
    }

    console.log('='.repeat(60) + '\n');

    // 3. 重点表详细分析
    console.log('🔍 重点表详细分析:\n');

    // users 表
    const [users] = await conn.query('SELECT id, username, name, role, employee_id FROM users LIMIT 5');
    console.log('👤 users 表 (用户账户):');
    console.table(users);

    // projects 表
    const [projects] = await conn.query('SELECT id, code, name, status, progress FROM projects LIMIT 5');
    console.log('📁 projects 表 (项目):');
    console.table(projects);

    // wbs_tasks 表
    const [tasks] = await conn.query('SELECT id, project_id, task_code, task_name, status FROM wbs_tasks LIMIT 5');
    console.log('✅ wbs_tasks 表 (WBS任务):');
    console.table(tasks);

    // global_data 表统计
    const [globalStats] = await conn.query(`
      SELECT data_type, COUNT(*) as count, MIN(version) as min_ver, MAX(version) as max_ver
      FROM global_data
      GROUP BY data_type
    `);
    console.log('📦 global_data 表 (全局数据):');
    console.table(globalStats);

    console.log('\n' + '='.repeat(60) + '\n');

    // 4. 表关系分析
    console.log('🔗 表关系分析:\n');

    // 检查外键关系
    const [keys] = await conn.query(`
      SELECT
        TABLE_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = 'task_manager'
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `);

    if ((keys as any[]).length > 0) {
      console.log('外键关系:');
      (keys as any[]).forEach((key: any) => {
        console.log(`   ${key.TABLE_NAME}.${key.COLUMN_NAME} → ${key.REFERENCED_TABLE_NAME}.${key.REFERENCED_COLUMN_NAME}`);
      });
    } else {
      console.log('   无外键约束');
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // 5. 数据健康检查
    console.log('🏥 数据健康检查:\n');

    // 检查空表
    const emptyTables: string[] = [];
    for (const tableName of tableNames) {
      const [countResult] = await conn.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      if ((countResult as any[])[0].count === 0) {
        emptyTables.push(tableName);
      }
    }

    if (emptyTables.length > 0) {
      console.log(`⚠️  发现 ${emptyTables.length} 个空表:`);
      emptyTables.forEach(t => console.log(`   - ${t}`));
    } else {
      console.log('✅ 所有表都有数据');
    }

  } finally {
    await conn.end();
  }
}

analyzeFullDatabase().catch(console.error);
