/**
 * Playwright 全局设置
 *
 * 在所有测试运行前执行一次
 */

import { FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 开始全局设置...');

  // 加载环境变量
  require('dotenv').config();

  // 验证必要的环境变量
  const requiredEnvVars = [
    'BASE_URL',
    'TEST_ADMIN_USERNAME',
    'TEST_ADMIN_PASSWORD'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.warn('⚠️  警告: 缺少以下环境变量:', missingVars.join(', '));
    console.warn('   将使用默认值');
  }

  // 验证 BASE_URL
  const baseURL = process.env.BASE_URL || 'http://localhost:5173';
  console.log(`📡 测试目标地址: ${baseURL}`);

  // 验证测试账号
  const testAccounts = [
    { name: '管理员', user: process.env.TEST_ADMIN_USERNAME },
    { name: '技术经理', user: process.env.TEST_TECH_MANAGER_USERNAME },
    { name: '部门经理', user: process.env.TEST_DEPT_MANAGER_USERNAME },
    { name: '工程师', user: process.env.TEST_ENGINEER_USERNAME }
  ];

  console.log('👥 测试账号配置:');
  testAccounts.forEach(account => {
    if (account.user) {
      console.log(`   ✓ ${account.name}: ${account.user}`);
    }
  });

  // 这里可以添加数据库清理或测试数据准备逻辑
  // 但根据计划要求，所有操作必须通过UI进行

  console.log('✅ 全局设置完成');
}

export default globalSetup;
