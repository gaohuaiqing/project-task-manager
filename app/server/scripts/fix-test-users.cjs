const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixUsers() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'task_manager'
    });

    console.log('开始修复测试账户...');

    // 1. 解锁所有用户
    await connection.execute('UPDATE users SET locked_until = NULL, login_attempts = 0 WHERE id IN (1598, 1601, 1606)');
    console.log('✅ 已解锁账户');

    // 2. 重置密码
    const passwordHash = await bcrypt.hash('admin123', 10);
    await connection.execute('UPDATE users SET password = ? WHERE id IN (1598, 1601, 1606)', [passwordHash]);
    console.log('✅ 已重置密码为: admin123');

    // 3. 显示用户信息
    const [rows] = await connection.execute('SELECT id, username, real_name, role FROM users WHERE id IN (1598, 1601, 1606)');
    console.log('');
    console.log('=== 测试账户信息 ===');
    rows.forEach((r) => {
      console.log(`  ${r.role.padEnd(12)} | ${r.username.padEnd(10)} | ${r.real_name}`);
    });
    console.log('');
    console.log('统一密码: admin123');

  } catch (error) {
    console.error('错误:', error);
  } finally {
    if (connection) await connection.end();
  }
}

fixUsers();
