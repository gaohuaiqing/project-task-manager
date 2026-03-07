import databaseService from '../services/DatabaseService';
import bcrypt from 'bcrypt';

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';
const EXPECTED_HASH = '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW';

async function resetAdminPassword() {
  // 确保数据库已初始化
  await databaseService.init();

  try {
    console.log('🔍 检查当前 admin 用户...');
    const users = await databaseService.query(
      'SELECT username, password, role FROM users WHERE username = ?',
      [ADMIN_USERNAME]
    );

    if (Array.isArray(users) && users.length > 0) {
      const currentUser = users[0] as any;
      console.log('✓ 找到 admin 用户');
      console.log('  当前密码哈希:', currentUser.password.substring(0, 30) + '...');

      // 验证当前哈希是否匹配 admin123
      const currentMatches = await bcrypt.compare(ADMIN_PASSWORD, currentUser.password);
      console.log('  当前哈希匹配 admin123:', currentMatches ? '是' : '否');

      // 验证预期哈希是否匹配 admin123
      const expectedMatches = await bcrypt.compare(ADMIN_PASSWORD, EXPECTED_HASH);
      console.log('  预期哈希匹配 admin123:', expectedMatches ? '是' : '否');

      // 如果不匹配，更新密码
      if (!currentMatches) {
        console.log('🔄 更新 admin 密码哈希...');
        await databaseService.query(
          'UPDATE users SET password = ? WHERE username = ?',
          [EXPECTED_HASH, ADMIN_USERNAME]
        );
        console.log('✓ 密码已更新');

        // 验证更新
        const updated = await databaseService.query(
          'SELECT password FROM users WHERE username = ?',
          [ADMIN_USERNAME]
        );
        if (Array.isArray(updated) && updated.length > 0) {
          const verifyUser = updated[0] as any;
          const verifyMatches = await bcrypt.compare(ADMIN_PASSWORD, verifyUser.password);
          console.log('✓ 验证更新后哈希匹配 admin123:', verifyMatches ? '是' : '否');
        }
      } else {
        console.log('✓ 当前密码已经是 admin123，无需更新');
      }
    } else {
      console.log('❌ 未找到 admin 用户，将创建新用户...');
      await databaseService.query(
        'INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)',
        [ADMIN_USERNAME, EXPECTED_HASH, 'admin', '系统管理员']
      );
      console.log('✓ admin 用户已创建');
    }

    console.log('\n✅ 密码重置完成！现在可以使用 admin/admin123 登录');
  } catch (error) {
    console.error('❌ 错误:', error);
    throw error;
  }
}

resetAdminPassword()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
