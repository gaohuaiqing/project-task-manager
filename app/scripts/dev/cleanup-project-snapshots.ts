import mysql from 'mysql2/promise';

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'task_manager'
};

async function cleanupProjectSnapshots() {
  const conn = await mysql.createConnection(dbConfig);

  try {
    console.log('=== 清理历史项目快照 ===\n');

    // 1. 查看当前快照情况
    const [snapshotCount] = await conn.query(`
      SELECT COUNT(*) as count FROM global_data WHERE data_type = 'projects'
    `);
    console.log(`📊 当前项目快照数: ${(snapshotCount as any[])[0].count}`);

    // 2. 获取每个项目的最新版本ID
    const [latestVersions] = await conn.query(`
      SELECT
        JSON_EXTRACT(data_json, '$.id') as project_id,
        MAX(id) as latest_id
      FROM global_data
      WHERE data_type = 'projects'
      GROUP BY JSON_EXTRACT(data_json, '$.id')
    `);

    console.log(`📊 活跃项目数: ${(latestVersions as any[]).length}`);
    console.log(`💡 将保留每个项目的最新版本，删除历史版本\n`);

    // 3. 删除历史快照
    let deletedCount = 0;
    for (const row of latestVersions as any[]) {
      const projectId = row.project_id;
      const latestId = row.latest_id;

      const result = await conn.query(
        `DELETE FROM global_data
         WHERE data_type = 'projects'
         AND JSON_EXTRACT(data_json, '$.id') = ?
         AND id != ?`,
        [projectId, latestId]
      );

      deletedCount += (result as any).affectedRows || 0;
      console.log(`   项目 ${projectId}: 删除了 ${(result as any).affectedRows || 0} 个历史版本`);
    }

    console.log(`\n✅ 总共删除了 ${deletedCount} 条历史快照`);

    // 4. 验证结果
    const [newCount] = await conn.query(`
      SELECT COUNT(*) as count FROM global_data WHERE data_type = 'projects'
    `);
    console.log(`📊 清理后快照数: ${(newCount as any[])[0].count}`);

    // 5. 显示保留的项目
    const [remaining] = await conn.query(`
      SELECT id, JSON_EXTRACT(data_json, '$.code') as code,
             JSON_EXTRACT(data_json, '$.name') as name,
             JSON_EXTRACT(data_json, '$.status') as status
      FROM global_data
      WHERE data_type = 'projects'
      ORDER BY id DESC
    `);

    console.log('\n📁 保留的项目快照:');
    console.table(remaining);

    // 6. 清理测试数据
    console.log('\n🗑️  清理测试数据...');
    const testTypes = ['test_org', 'test_type'];
    for (const testType of testTypes) {
      const result = await conn.query(
        'DELETE FROM global_data WHERE data_type = ?',
        [testType]
      );
      if ((result as any).affectedRows > 0) {
        console.log(`   ✅ 删除 ${testType}: ${(result as any).affectedRows} 条`);
      }
    }

    console.log('\n=== 清理完成 ===');

  } finally {
    await conn.end();
  }
}

cleanupProjectSnapshots().catch(console.error);
