/**
 * Playwright 全局清理
 *
 * 在所有测试运行后执行一次
 */

import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 开始全局清理...');

  // 这里可以添加测试后的清理逻辑
  // 例如：生成测试报告摘要、发送通知等

  // 注意：根据计划要求，不允许直接操作数据库
  // 所有数据清理应该通过测试的 afterEach 钩子完成

  console.log('✅ 全局清理完成');
}

export default globalTeardown;
