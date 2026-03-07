/**
 * 验证密码哈希一致性测试脚本
 *
 * 问题：前端和后端存储的 admin 密码哈希不一致
 * - 前端: $2b$10$w2x2kLPai7bc.HLqX7EtqeSBVEWWr2crpObcDAuYHpD.6tiRLzkwi
 * - 后端: $2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW
 *
 * 运行: node scripts/verify-password-hash.js
 */

const bcrypt = require('bcrypt');

const FRONTEND_HASH = '$2b$10$w2x2kLPai7bc.HLqX7EtqeSBVEWWr2crpObcDAuYHpD.6tiRLzkwi';
const BACKEND_HASH = '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW';
const TEST_PASSWORD = 'admin123';

async function verifyHashes() {
  console.log('🔍 验证密码哈希一致性\n');

  console.log('测试密码:', TEST_PASSWORD);
  console.log('前端哈希:', FRONTEND_HASH);
  console.log('后端哈希:', BACKEND_HASH);
  console.log('');

  const frontendValid = await bcrypt.compare(TEST_PASSWORD, FRONTEND_HASH);
  const backendValid = await bcrypt.compare(TEST_PASSWORD, BACKEND_HASH);

  console.log('✅ 前端哈希验证结果:', frontendValid ? '有效' : '无效');
  console.log('✅ 后端哈希验证结果:', backendValid ? '有效' : '无效');
  console.log('');

  if (frontendValid && backendValid) {
    console.log('✅ 两个哈希都对应同一个密码 "admin123"');
    console.log('ℹ️  这是正常的，因为 bcrypt 每次生成哈希都会使用不同的盐值');
    console.log('ℹ️  只要两个哈希都能通过验证，就说明它们都是正确的');
  } else if (!frontendValid && !backendValid) {
    console.log('❌ 两个哈希都无效！可能是密码不是 "admin123"');
  } else if (!frontendValid) {
    console.log('❌ 前端哈希无效！需要重新生成');
  } else if (!backendValid) {
    console.log('❌ 后端哈希无效！需要重新生成');
  }

  console.log('');
  console.log('📋 建议：');
  console.log('1. 如果两个哈希都有效，无需修改');
  console.log('2. 如果有哈希无效，使用以下命令重新生成：');
  console.log('   node -e "const bcrypt = require(\"bcrypt\"); console.log(bcrypt.hashSync(\"admin123\", 10))"');
}

verifyHashes().catch(console.error);
