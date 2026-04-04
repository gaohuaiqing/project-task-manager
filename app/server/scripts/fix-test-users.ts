import { getPool } from '../src/core/db';
import * as bcrypt from 'bcryptjs';

async function fixUsers() {
  try {
    const pool = getPool();
    if (!pool) {
      console.log('❌ 数据库连接失败');
      process.exit(1);
    }

    console.log('开始修复测试账户...');

    // 1. 解锁所有用户
    await pool.execute('UPDATE users SET locked_until = NULL, login_attempts = 0 WHERE id IN (1598, 1601, 1606)');
    console.log('✅ 已解锁账户');

    // 2. 重置密码
    const passwordHash = await bcrypt.hash('admin123', 10);
    await pool.execute('UPDATE users SET password = ? WHERE id IN (1598, 1601, 1606)', [passwordHash]);
    console.log('✅ 已重置密码为: admin123');

    // 3. 显示用户信息
    const [rows]: any = await pool.execute('SELECT id, username, real_name, role FROM users WHERE id IN (1598, 1601, 1606)');
    console.log('');
    console.log('=== 测试账户信息 ===');
    (rows as any[]).forEach((r: any) => {
      console.log(`  ${r.role.padEnd(12)} | ${r.username.padEnd(10)} | ${r.real_name}`);
    });
    console.log('');
    console.log('统一密码: admin123');

    process.exit(0);
  } catch (error) {
    console.error('错误:', error);
    process.exit(1);
  }
}

fixUsers();
