/**
 * 重置用户密码脚本
 * 将除 admin 外的所有用户的密码重置为工号（username）
 *
 * 使用方法：npx tsx src/scripts/reset-user-passwords-to-username.ts
 */

import databaseService from '../services/DatabaseService';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;
const ADMIN_USERNAME = 'admin';

interface UserRow {
  id: number;
  username: string;
  real_name: string;
  role: string;
  is_active: boolean;
}

/**
 * 重置用户密码为工号
 */
async function resetPasswordsToUsername(): Promise<void> {
  // 初始化数据库连接
  await databaseService.init();

  console.log('🚀 开始重置用户密码...');
  console.log('=' .repeat(60));

  try {
    // 查询所有非 admin 的活跃用户
    const users = await databaseService.query(
      `SELECT id, username, real_name, role, is_active
       FROM users
       WHERE username != ? AND is_active = 1
       ORDER BY id`,
      [ADMIN_USERNAME]
    );

    if (!Array.isArray(users) || users.length === 0) {
      console.log('⚠️  没有找到需要重置的用户');
      return;
    }

    console.log(`📋 找到 ${users.length} 个需要重置密码的用户：`);
    console.log('');

    let successCount = 0;
    let failedCount = 0;

    for (const user of users as UserRow[]) {
      try {
        // 使用 username 作为新密码
        const newPassword = user.username;
        const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

        // 更新密码
        await databaseService.query(
          'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
          [hashedPassword, user.id]
        );

        successCount++;
        console.log(`  ✅ ${user.username} (${user.real_name}) - 密码已重置为工号`);
      } catch (error) {
        failedCount++;
        console.log(`  ❌ ${user.username} (${user.real_name}) - 重置失败: ${error}`);
      }
    }

    console.log('');
    console.log('=' .repeat(60));
    console.log('📊 重置结果统计：');
    console.log(`  成功: ${successCount} 个用户`);
    console.log(`  失败: ${failedCount} 个用户`);
    console.log('');

    if (successCount > 0) {
      console.log('📝 用户登录信息（用户名和密码相同）：');
      console.log('');
      for (const user of users as UserRow[]) {
        console.log(`  ${user.username} / ${user.username} (${user.real_name})`);
      }
      console.log('');
      console.log('⚠️  请通知相关用户密码已变更，需使用工号登录！');
    }

    console.log('');
    console.log('🎉 密码重置完成！');
  } catch (error) {
    console.error('❌ 执行失败:', error);
    throw error;
  }
}

// 执行脚本
resetPasswordsToUsername()
  .then(() => {
    console.log('');
    process.exit(0);
  })
  .catch(() => {
    console.log('');
    process.exit(1);
  });