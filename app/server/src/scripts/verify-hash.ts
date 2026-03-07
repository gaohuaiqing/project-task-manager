import bcrypt from 'bcrypt';

// 代码中的预期哈希
const expectedHash = '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW';

// 测试不同的密码
const passwords = ['admin123', 'admin', 'password', '123456'];

console.log('🔍 验证代码中的哈希值...\n');

for (const pwd of passwords) {
  const isValid = await bcrypt.compare(pwd, expectedHash);
  console.log(`密码 "${pwd}": ${isValid ? '✅ 匹配' : '❌ 不匹配'}`);
}

console.log('\n🔍 生成新的 admin123 哈希:\n');
const newHash = await bcrypt.hash('admin123', 10);
console.log(newHash);
console.log('\n验证新哈希:', await bcrypt.compare('admin123', newHash) ? '✅ 有效' : '❌ 无效');
