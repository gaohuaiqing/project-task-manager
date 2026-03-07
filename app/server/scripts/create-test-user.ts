/**
 * 创建测试用户脚本
 * 用于初始化系统测试账号
 */

import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'task_manager',
};

const testUsers = [
  {
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    name: '系统管理员',
  },
  {
    username: 'tech01',
    password: 'tech123',
    role: 'tech_manager',
    name: '技术经理01',
  },
  {
    username: 'dept01',
    password: 'dept123',
    role: 'dept_manager',
    name: '部门经理01',
  },
  {
    username: 'engineer01',
    password: 'eng123',
    role: 'engineer',
    name: '工程师01',
  },
];

async function createTestUsers() {
  const pool = mysql.createPool(dbConfig);

  try {
    console.log('开始创建测试用户...\n');

    for (const user of testUsers) {
      // 检查用户是否已存在
      const [existing] = await pool.query(
        'SELECT id FROM users WHERE username = ?',
        [user.username]
      );

      if (existing.length > 0) {
        console.log(`✓ 用户 "${user.username}" 已存在，跳过`);
        continue;
      }

      // 加密密码
      const hashedPassword = await bcrypt.hash(user.password, 10);

      // 插入用户
      await pool.query(
        'INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)',
        [user.username, hashedPassword, user.role, user.name]
      );

      console.log(`✓ 用户 "${user.username}" 创建成功`);
      console.log(`  用户名: ${user.username}`);
      console.log(`  密码: ${user.password}`);
      console.log(`  角色: ${user.role}`);
      console.log(`  姓名: ${user.name}`);
      console.log('');
    }

    // 显示所有用户
    const [users] = await pool.query('SELECT username, role, name FROM users');
    console.log('当前系统用户列表:');
    console.table(users);

    console.log('\n✅ 测试用户创建完成！');
    console.log('\n您现在可以使用以下账号登录:');
    testUsers.forEach((u) => {
      console.log(`  用户名: ${u.username}, 密码: ${u.password}`);
    });

  } catch (error) {
    console.error('创建测试用户失败:', error);
  } finally {
    await pool.end();
  }
}

createTestUsers();
