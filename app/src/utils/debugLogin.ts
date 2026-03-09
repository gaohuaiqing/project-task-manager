/**
 * 登录调试工具
 * 用于诊断登录问题
 */

import bcrypt from 'bcryptjs';

// 默认用户凭据
const DEFAULT_USERS = {
  admin: {
    username: 'admin',
    password: 'admin123',
    name: '系统管理员',
    role: 'admin'
  },
  tech_manager: {
    username: 'tech_manager',
    password: 'tm123456',
    name: '技术经理',
    role: 'tech_manager'
  },
  dept_manager: {
    username: 'dept_manager',
    password: 'dm123456',
    name: '部门经理',
    role: 'dept_manager'
  },
  engineer: {
    username: 'engineer',
    password: 'eng123456',
    name: '工程师',
    role: 'engineer'
  }
};

export async function debugLogin() {
  console.log('=== 登录调试工具 ===');

  // 1. 检查 localStorage
  console.log('\n1. 检查 localStorage:');
  const usersKey = 'app_users';
  const storedUsers = localStorage.getItem(usersKey);
  console.log('存储的用户数据:', storedUsers);

  // 2. 检查当前用户
  console.log('\n2. 检查当前登录状态:');
  const currentUser = localStorage.getItem('currentUser');
  console.log('当前用户:', currentUser);

  // 3. 测试密码哈希
  console.log('\n3. 测试密码哈希:');
  for (const [username, userData] of Object.entries(DEFAULT_USERS)) {
    const hash = await bcrypt.hash(userData.password, 10);
    const isValid = await bcrypt.compare(userData.password, hash);
    console.log(`${username}: ${userData.password} -> ${hash.substring(0, 20)}... (验证: ${isValid})`);
  }

  // 4. 检查后端连接
  console.log('\n4. 检查后端连接:');
  try {
    const response = await fetch('http://localhost:3001/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123',
        ip: 'local',
        deviceId: 'debug'
      })
    });
    const result = await response.json();
    console.log('后端响应:', result);
  } catch (error) {
    console.error('后端连接失败:', error);
  }

  // 5. 提供重置命令
  console.log('\n5. 重置命令:');
  console.log('在控制台执行以下命令来重置用户数据:');
  console.log(`
// 清除所有数据
localStorage.clear();

// 重新初始化默认用户
const defaultUsers = {
  admin: { password: await bcrypt.hash('admin123', 10), role: 'admin', name: '系统管理员' },
  tech_manager: { password: await bcrypt.hash('tm123456', 10), role: 'tech_manager', name: '技术经理' },
  dept_manager: { password: await bcrypt.hash('dm123456', 10), role: 'dept_manager', name: '部门经理' },
  engineer: { password: await bcrypt.hash('eng123456', 10), role: 'engineer', name: '工程师' }
};
localStorage.setItem('app_users', JSON.stringify(defaultUsers));
location.reload();
  `);
}

// 暴露到全局对象以便在控制台调用
if (typeof window !== 'undefined') {
  (window as any).debugLogin = debugLogin;
  console.log('登录调试工具已加载。在控制台输入 debugLogin() 开始诊断。');
}
