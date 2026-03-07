import bcrypt from 'bcrypt';
import databaseService from '../services/DatabaseService';

async function testLogin() {
  await databaseService.init();

  const username = 'admin';
  const password = 'admin123';
  const expectedHash = '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW';

  console.log('🔍 测试登录认证...\n');

  // 1. 从数据库获取用户
  const users = await databaseService.query(
    'SELECT id, username, password, role FROM users WHERE username = ?',
    [username]
  );

  console.log('数据库查询结果:');
  console.log('  用户存在:', users.length > 0);

  if (users.length === 0) {
    console.log('  ❌ 用户不存在!');
    return;
  }

  const user = users[0];
  console.log('  用户名:', user.username);
  console.log('  密码哈希:', user.password.substring(0, 30) + '...');
  console.log('  角色:', user.role);

  // 2. 测试密码验证
  console.log('\n密码验证测试:');

  const isValid1 = await bcrypt.compare(password, user.password);
  console.log('  数据库哈希验证 admin123:', isValid1 ? '✅ 通过' : '❌ 失败');

  const isValid2 = await bcrypt.compare(password, expectedHash);
  console.log('  代码预期哈希验证 admin123:', isValid2 ? '✅ 通过' : '❌ 失败');

  const isValid3 = await bcrypt.compare('wrongpassword', user.password);
  console.log('  错误密码验证 (应该失败):', isValid3 ? '❌ 异常' : '✅ 正确失败');

  // 3. 模拟后端登录流程
  console.log('\n模拟后端登录流程:');
  console.log('  输入: username =', username);
  console.log('  输入: password =', password);

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    console.log('  ❌ 密码验证失败');
    console.log('  返回: 401 用户名或密码错误');
  } else {
    console.log('  ✅ 密码验证通过');
    console.log('  返回: 200 登录成功');
  }

  console.log('\n✅ 测试完成');
  process.exit(0);
}

testLogin().catch(error => {
  console.error('❌ 测试失败:', error);
  process.exit(1);
});
