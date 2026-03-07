import databaseService from '../services/DatabaseService';

// 修复后的正确哈希（与前端代码一致）
const CORRECT_HASHES = {
  admin: '$2b$10$UlqvBIzHlnAJpb5wT1Aa9.fgLC.SKKjyCPiIMpIRNXDc0Bjx65RTS', // admin123
  tech_manager: '$2b$10$2zeE2Hvm.EcN4bqPMCp5mOWzpXj9.1ePC4TLbKVAXWY/73T2dqD76', // 123456
  dept_manager: '$2b$10$3cHjTFjWuCnf/B6meAj4AO1P5NnG0AeLTyEsxAhKTi7DwdEMOQ7lm', // 123456
  engineer: '$2b$10$MnqujUKF6iTtt2WxOD0ujOQVWF0jRxHii2bhuuCDlXdWMVv7aMeCu' // 123456
};

async function syncPasswordHashes() {
  await databaseService.init();

  console.log('🔄 同步密码哈希到数据库...\n');

  for (const [username, correctHash] of Object.entries(CORRECT_HASHES)) {
    const users = await databaseService.query(
      'SELECT username FROM users WHERE username = ?',
      [username]
    );

    if (Array.isArray(users) && users.length > 0) {
      await databaseService.query(
        'UPDATE users SET password = ? WHERE username = ?',
        [correctHash, username]
      );
      console.log(`✓ 更新 ${username} 密码哈希`);
    } else {
      console.log(`- ${username} 不存在于数据库，跳过`);
    }
  }

  console.log('\n✅ 密码哈希同步完成！');
  console.log('\n现在可以使用以下账号登录：');
  console.log('  admin / admin123');
  console.log('  tech_manager / 123456');
  console.log('  dept_manager / 123456');
  console.log('  engineer / 123456');

  process.exit(0);
}

syncPasswordHashes().catch(error => {
  console.error('❌ 错误:', error);
  process.exit(1);
});
