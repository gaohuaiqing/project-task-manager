import databaseService from '../services/DatabaseService';
import bcrypt from 'bcrypt';

const DEFAULT_USERS = [
  { username: 'tech_manager', password: 'tm123456', role: 'tech_manager', name: '技术经理' },
  { username: 'dept_manager', password: 'dm123456', role: 'dept_manager', name: '部门经理' },
  { username: 'engineer', password: 'eng123456', role: 'engineer', name: '工程师' }
];

async function initUsers() {
  await databaseService.init();

  for (const user of DEFAULT_USERS) {
    try {
      console.log(`🔍 检查用户 ${user.username}...`);

      const existing = await databaseService.query(
        'SELECT username FROM users WHERE username = ?',
        [user.username]
      );

      if (Array.isArray(existing) && existing.length > 0) {
        console.log(`  ✓ 用户 ${user.username} 已存在，跳过`);
      } else {
        const passwordHash = await bcrypt.hash(user.password, 10);
        await databaseService.query(
          'INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)',
          [user.username, passwordHash, user.role, user.name]
        );
        console.log(`  ✓ 已创建用户 ${user.username}`);
      }
    } catch (error) {
      console.error(`  ❌ 创建用户 ${user.username} 失败:`, error);
    }
  }

  console.log('\n✅ 用户初始化完成！');
  console.log('\n可用账号：');
  DEFAULT_USERS.forEach(u => {
    console.log(`  ${u.username} / ${u.password} (${u.name})`);
  });
}

initUsers()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
