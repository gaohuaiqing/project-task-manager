import mysql from 'mysql2/promise';

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'task_manager'
};

async function cleanupOldSessions() {
  const conn = await mysql.createConnection(dbConfig);

  try {
    console.log('=== 清理历史会话数据 ===\n');

    // 1. 查看当前会话情况
    const [totalCount] = await conn.query('SELECT COUNT(*) as count FROM sessions');
    const [terminatedCount] = await conn.query(`
      SELECT COUNT(*) as count FROM sessions WHERE status = 'terminated'
    `);
    const [activeCount] = await conn.query(`
      SELECT COUNT(*) as count FROM sessions WHERE status = 'active'
    `);

    console.log(`📊 会话统计:`);
    console.log(`   总会话数: ${(totalCount as any[])[0].count}`);
    console.log(`   已终止: ${(terminatedCount as any[])[0].count} (${Math.round((terminatedCount as any[])[0].count / (totalCount as any[])[0].count * 100)}%)`);
    console.log(`   活跃中: ${(activeCount as any[])[0].count}\n`);

    // 2. 删除30天前已终止的会话
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const result = await conn.query(
      `DELETE FROM sessions
       WHERE status = 'terminated'
       AND termination_timestamp < ?
       AND id > 1`,  // 保留第一条记录作为样本
      [thirtyDaysAgo]
    );

    const deletedCount = (result as any).affectedRows || 0;
    console.log(`🗑️  删除了 ${deletedCount} 条30天前的已终止会话`);

    // 3. 验证结果
    const [newTotal] = await conn.query('SELECT COUNT(*) as count FROM sessions');
    const [newTerminated] = await conn.query(`
      SELECT COUNT(*) as count FROM sessions WHERE status = 'terminated'
    `);

    console.log(`\n📊 清理后会话统计:`);
    console.log(`   总会话数: ${(newTotal as any[])[0].count}`);
    console.log(`   已终止: ${(newTerminated as any[])[0].count}`);
    console.log(`   活跃中: ${(activeCount as any[])[0].count} (未变化)\n`);

    // 4. 显示保留的活跃会话
    const [activeSessions] = await conn.query(`
      SELECT session_id, user_id, username, status, created_at
      FROM sessions
      WHERE status = 'active'
      ORDER BY created_at DESC
      LIMIT 10
    `);

    if ((activeSessions as any[]).length > 0) {
      console.log('📱 活跃会话 (最近10条):');
      console.table(activeSessions);
    } else {
      console.log('📱 当前无活跃会话');
    }

    console.log('\n=== 清理完成 ===');

  } finally {
    await conn.end();
  }
}

cleanupOldSessions().catch(console.error);
