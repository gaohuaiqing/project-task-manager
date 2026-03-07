/**
 * 逐步排查登录问题
 */
const mysql = require('mysql2/promise');

async function troubleshoot() {
  let connection;

  try {
    console.log('========================================');
    console.log('逐步排查登录问题');
    console.log('========================================\n');

    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'task_manager'
    });

    // 步骤 1: 验证用户数据
    console.log('步骤 1: 验证 admin 用户数据');
    const [users] = await connection.query(
      'SELECT id, username, password, role, name FROM users WHERE username = ?',
      ['admin']
    );

    if (users.length === 0) {
      console.log('   ✗ admin 用户不存在！');
      return;
    }

    const user = users[0];
    console.log('   ✓ 用户存在');
    console.log(`   ID: ${user.id}, 用户名: ${user.username}, 角色: ${user.role}\n`);

    // 步骤 2: 测试 UserCacheService
    console.log('步骤 2: 测试 UserCacheService');
    try {
      // 尝试导入 UserCacheService
      const userCacheService = (await import('../app/server/src/services/UserCacheService.js')).userCacheService;
      const cachedUser = await userCacheService.getUserInfo('admin');

      if (cachedUser) {
        console.log('   ✓ UserCacheService 返回用户:', cachedUser);
      } else {
        console.log('   ✗ UserCacheService 返回 null');
      }

    } catch (e) {
      console.log('   ✗ UserCacheService 失败:', e.message);
      console.log('   详细错误:', e.stack);
    }

    // 步骤 3: 测试 SessionManager
    console.log('\n步骤 3: 测试 SessionManager');
    try {
      const { sessionManager } = await import('../app/server/src/services/SessionManager.js');
      await sessionManager.initialize();

      console.log('   ✓ SessionManager 初始化成功');

      // 尝试创建会话
      const testSession = await sessionManager.createSession('admin', 'local');
      console.log('   ✓ 会话创建成功:', testSession.sessionId);

    } catch (e) {
      console.log('   ✗ SessionManager 失败:', e.message);
      console.log('   详细错误:', e.stack);
    }

    // 步骤 4: 测试完整登录流程
    console.log('\n步骤 4: 测试完整登录 API');
    try {
      const response = await fetch('http://localhost:3001/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'admin',
          password: 'admin123',
          ip: 'local'
        })
      });

      const result = await response.json();
      console.log(`   HTTP ${response.status}:`, result);

    } catch (e) {
      console.log('   ✗ API 请求失败:', e.message);
    }

    await connection.end();

    console.log('\n========================================');
    console.log('排查完成！');
    console.log('========================================\n');

  } catch (error) {
    console.error('\n排查失败:', error);

    if (connection) {
      await connection.end();
    }
  }
}

troubleshoot();
