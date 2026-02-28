import mysql from 'mysql2/promise';

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'task_manager'
};

async function dropEmptyTables() {
  const conn = await mysql.createConnection(dbConfig);

  try {
    console.log('=== 删除确定不会使用的空表 ===\n');

    // 分类删除
    const tablesToDrop = {
      '数据同步相关（未启用）': [
        'data_changes',
        'data_fingerprints',
        'data_locks',
        'real_time_change_log',
        'real_time_locks',
        'sync_conflicts'
      ],
      '实时功能相关（未启用）': [
        'online_users',
        'operation_queue'
      ],
      '审计和配置（低优先级）': [
        'permission_history',
        'user_configs'
      ],
      '功能增强（未实现）': [
        'milestones',
        'project_milestones'
      ]
    };

    let totalDropped = 0;

    for (const [category, tables] of Object.entries(tablesToDrop)) {
      console.log(`📁 ${category}:`);

      for (const tableName of tables) {
        try {
          // 先检查表是否存在
          const [check] = await conn.query('SHOW TABLES LIKE ?', [tableName]);

          if ((check as any[]).length > 0) {
            // 删除表
            await conn.query(`DROP TABLE IF EXISTS ${tableName}`);
            console.log(`   ✅ ${tableName} - 已删除`);
            totalDropped++;
          } else {
            console.log(`   ⚠️  ${tableName} - 不存在`);
          }
        } catch (error: any) {
          // 检查是否有外键约束
          if (error.code === 'ER_ROW_IS_REFERENCED') {
            console.log(`   ⚠️  ${tableName} - 有外键约束，跳过`);
          } else {
            console.log(`   ❌ ${tableName} - ${error.message}`);
          }
        }
      }

      console.log('');
    }

    console.log(`\n✅ 总共删除了 ${totalDropped} 个表`);

    // 验证结果
    const [remaining] = await conn.query('SHOW TABLES');
    const remainingTables = (remaining as any[]).map(t => Object.values(t)[0]);

    console.log(`\n📊 保留的表数量: ${remainingTables.length}`);
    console.log(`   删除前: 24 个表`);
    console.log(`   删除后: ${remainingTables.length} 个表`);

  } finally {
    await conn.end();
  }
}

dropEmptyTables().catch(console.error);
