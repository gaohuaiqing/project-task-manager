/**
 * 快速重置认证数据
 * 在控制台粘贴并执行
 */

// 快速重置脚本 - 在浏览器控制台粘贴执行
(async function() {
  console.log('=== 重置认证数据 ===');

  // 1. 清除所有相关数据
  const keysToRemove = [
    'app_users',
    'currentUser',
    'auth_session',
    'isAdmin',
    'auth_session_admin',
    'active_session_admin',
    'cross_browser_session_admin'
  ];

  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });

  console.log('✓ 已清除所有认证数据');

  // 2. 生成默认用户（使用 bcrypt 哈希）
  const bcrypt = await import('bcryptjs');

  const defaultUsers = {
    'admin': {
      password: await bcrypt.default.hash('admin123', 10),
      role: 'admin',
      name: '系统管理员'
    },
    'tech_manager': {
      password: await bcrypt.default.hash('tm123456', 10),
      role: 'tech_manager',
      name: '技术经理'
    },
    'dept_manager': {
      password: await bcrypt.default.hash('dm123456', 10),
      role: 'dept_manager',
      name: '部门经理'
    },
    'engineer': {
      password: await bcrypt.default.hash('eng123456', 10),
      role: 'engineer',
      name: '工程师'
    }
  };

  localStorage.setItem('app_users', JSON.stringify(defaultUsers));
  console.log('✓ 已重新创建默认用户');

  // 3. 显示登录凭据
  console.log('\n=== 可用登录凭据 ===');
  console.log('管理员：');
  console.log('  用户名: admin');
  console.log('  密码: admin123');
  console.log('\n技术经理：');
  console.log('  用户名: tech_manager');
  console.log('  密码: tm123456');
  console.log('\n部门经理：');
  console.log('  用户名: dept_manager');
  console.log('  密码: dm123456');
  console.log('\n工程师：');
  console.log('  用户名: engineer');
  console.log('  密码: eng123456');

  console.log('\n✓ 重置完成！请刷新页面并使用上述凭据登录。');

  // 4. 验证密码哈希
  console.log('\n=== 验证密码哈希 ===');
  const adminValid = await bcrypt.default.compare('admin123', defaultUsers.admin.password);
  console.log('admin 密码验证:', adminValid ? '✓ 正确' : '✗ 错误');

  // 5. 自动刷新（可选）
  // setTimeout(() => location.reload(), 2000);
})();
