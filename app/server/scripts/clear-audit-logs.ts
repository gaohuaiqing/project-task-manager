// 清空审计日志表
// Usage: npx tsx scripts/clear-audit-logs.ts

import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'task_manager',
};

async function clearAuditLogs() {
  const pool = mysql.createPool(dbConfig);

  try {
    // 先查看当前日志数量
    const [countResult] = await pool.query('SELECT COUNT(*) as total FROM audit_logs');
    const total = (countResult as any[])[0].total;
    console.log(`当前审计日志数量: ${total}`);

    if (total === 0) {
      console.log('审计日志表已为空，无需清空');
      return;
    }

    // 执行清空
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');
    await pool.query('TRUNCATE TABLE audit_logs');
    await pool.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('✅ 审计日志表已清空');

    // 验证
    const [newCount] = await pool.query('SELECT COUNT(*) as total FROM audit_logs');
    console.log(`清空后日志数量: ${(newCount as any[])[0].total}`);

  } catch (error) {
    console.error('清空失败:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

clearAuditLogs();
