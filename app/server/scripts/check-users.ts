/**
 * 查询数据库中的用户
 */

import { databaseService } from '../src/services/DatabaseService.js';

async function checkUsers() {
  try {
    await databaseService.init();

    const users = await databaseService.query('SELECT id, username, role FROM users LIMIT 10') as any[];

    console.log('数据库用户列表:');
    console.log('================');
    if (users.length === 0) {
      console.log('⚠️  数据库中没有用户');
      console.log('');
      console.log('建议：请先运行用户初始化脚本或创建测试用户');
    } else {
      users.forEach((user: any) => {
        console.log(`  ID: ${user.id}, 用户名: ${user.username}, 角色: ${user.role || '未设置'}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ 查询失败:', error);
    process.exit(1);
  }
}

checkUsers();
