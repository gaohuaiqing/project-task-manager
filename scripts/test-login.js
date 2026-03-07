/**
 * 测试数据库连接和 admin 用户
 */
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function test() {
  console.log('========================================');
  console.log('测试数据库连接和 admin 用户');
  console.log('========================================\n');

  try {
    // 1. 测试数据库连接
    console.log('1. 测试数据库连接...');
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'task_manager'
    });
    console.log('   ✓ 数据库连接成功\n');

    // 2. 测试 admin 用户
    console.log('2. 测试 admin 用户...');
    const [users] = await connection.query(
      'SELECT id, username, password, role, name FROM users WHERE username = ?',
      ['admin']
    );

    if (users.length === 0) {
      console.log('   ✗ admin 用户不存在！');
      console.log('   正在创建 admin 用户...');

      const hashedPassword = await bcrypt.hash('admin123', 10);
      await connection.query(
        'INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)',
        ['admin', hashedPassword, 'admin', '系统管理员']
      );
      console.log('   ✓ admin 用户创建成功\n');
    } else {
      console.log('   ✓ admin 用户存在');
      const user = users[0];

      // 3. 测试密码验证
      console.log('3. 测试密码验证...');
      const isValid = await bcrypt.compare('admin123', user.password);
      if (isValid) {
        console.log('   ✓ 密码验证通过\n');
      } else {
        console.log('   ✗ 密码验证失败！');
        console.log('   正在重置密码...');

        const newHashedPassword = await bcrypt.hash('admin123', 10);
        await connection.query(
          'UPDATE users SET password = ? WHERE username = ?',
          [newHashedPassword, 'admin']
        );
        console.log('   ✓ 密码已重置\n');
      }
    }

    // 4. 测试登录接口
    console.log('4. 测试登录接口...');
    const response = await fetch('http://localhost:3001/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123',
        ip: 'local'
      })
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        console.log('   ✓ 登录测试成功！');
        console.log(`   Session ID: ${result.session?.sessionId}\n`);
      } else {
        console.log(`   ✗ 登录失败: ${result.message}\n`);
      }
    } else {
      console.log(`   ✗ HTTP 错误: ${response.status}\n`);
    }

    await connection.end();
    console.log('========================================');
    console.log('✓ 测试完成！');
    console.log('========================================\n');
    console.log('您现在可以使用 admin / admin123 登录了！\n');

  } catch (error) {
    console.error('\n✗ 测试失败:', error.message);
    console.error('\n可能的原因:');
    console.error('  1. 后端服务未启动 (cd app/server && npm run dev)');
    console.error('  2. MySQL 服务未启动');
    console.error('  3. 数据库连接配置错误\n');

    process.exit(1);
  }
}

test();
