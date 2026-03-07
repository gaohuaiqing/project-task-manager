import bcrypt from 'bcrypt';

// 生成所有用户的正确密码哈希
const passwords = {
  admin: 'admin123',
  tech_manager: '123456',
  dept_manager: '123456',
  engineer: '123456'
};

console.log('🔐 生成正确的密码哈希...\n');

const hashes: Record<string, string> = {};

for (const [user, password] of Object.entries(passwords)) {
  const hash = await bcrypt.hash(password, 10);
  hashes[user] = hash;
  console.log(`${user}:`);
  console.log(`  密码: ${password}`);
  console.log(`  哈希: ${hash}\n`);
}

console.log('\n// 复制这段代码到 DEFAULT_PASSWORD_HASHES:\n');
console.log('const DEFAULT_PASSWORD_HASHES: Record<string, string> = {');
for (const [user, hash] of Object.entries(hashes)) {
  const password = passwords[user as keyof typeof passwords];
  console.log(`  ${user}: '${hash}', // ${password}`);
}
console.log('};');
