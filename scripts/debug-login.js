/**
 * 调试后端登录问题
 */
const mysql = require('mysql2/promise');

async function debugLogin() {
  let connection;

  try {
    console.log('========================================');
    console.log('调试后端登录问题');
    console.log('========================================\n');

    // 1. 测试数据库连接和用户查询
    console.log('1. 测试数据库和用户查询...');
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'task_manager'
    });

    const [users] = await connection.query(
      'SELECT id, username, password, role, name FROM users WHERE username = ?',
      ['admin']
    );

    if (users.length === 0) {
      console.log('   ✗ admin 用户不存在');
      return;
    }

    const user = users[0];
    console.log('   ✓ admin 用户存在');
    console.log(`   用户数据:`, JSON.stringify({
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name
    }));

    // 2. 测试密码验证
    console.log('\n2. 测试密码验证...');
    const bcrypt = require('bcrypt');
    const isValid = await bcrypt.compare('admin123', user.password);
    console.log('   密码验证结果:', isValid ? '✓ 通过' : '✗ 失败');

    // 3. 测试 sessions 表
    console.log('\n3. 测试 sessions 表...');
    try {
      const [sessionCheck] = await connection.query(
        'SELECT COUNT(*) as count FROM sessions'
      );
      console.log(`   ✓ sessions 表存在，有 ${sessionCheck[0].count} 条记录`);
    } catch (e) {
      console.log('   ✗ sessions 表查询失败:', e.message);
    }

    // 4. 测试创建会话（模拟）
    console.log('\n4. 测试创建会话...');
    const { v4: uuidv4 } = require('uuid');
    const sessionId = uuidv4();
    const now = Date.now();
    const expiresAt = now + 28800000; // 8小时

    try {
      await connection.query(
        `INSERT INTO sessions
         (session_id, user_id, device_id, device_info, ip_address, status, created_at, last_accessed, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [sessionId, user.id, 'test-device', 'test-info', 'local', 'active', now, now, expiresAt]
      );
      console.log('   ✓ 会话创建成功');
      console.log(`   Session ID: ${sessionId}`);

      // 清理测试会话
      await connection.query('DELETE FROM sessions WHERE session_id = ?', [sessionId]);
      console.log('   ✓ 测试会话已清理');

    } catch (e) {
      console.log('   ✗ 会话创建失败:', e.message);
    }

    // 5. 测试完整登录流程
    console.log('\n5. 测试完整登录 API...');
    try {
      const loginResponse = await fetch('http://localhost:3001/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'admin',
          password: 'admin123',
          ip: 'local'
        })
      });

      console.log(`   HTTP 状态: ${loginResponse.status}`);
      const loginText = await loginResponse.text();
      console.log(`   响应: ${loginText}`);

    } catch (e) {
      console.log('   ✗ API 请求失败:', e.message);
    }

    await connection.end();

    console.log('\n========================================');
    console.log('调试完成！');
    console.log('========================================\n');

  } catch (error) {
    console.error('\n调试失败:', error);

    if (connection) {
      await connection.end();
    }
  }
}

debugLogin();
