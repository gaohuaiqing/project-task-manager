/**
 * 认证设置 - 在所有测试前执行登录并保存认证状态
 */
import { test as setup, expect } from '@playwright/test';
import { testUser } from '../../fixtures/test-data';

const authFile = 'playwright/.auth/user.json';

setup('认证设置 - 登录并保存认证状态', async ({ page }) => {
  // 访问登录页
  await page.goto('/login');

  // 等待登录表单加载
  await page.waitForSelector('[data-testid="login-form"]', { timeout: 10000 });

  // 填写登录信息
  await page.fill('[data-testid="username-input"]', testUser.username);
  await page.fill('[data-testid="password-input"]', testUser.password);

  // 点击登录
  await page.click('[data-testid="login-button"]');

  // 等待跳转（可能是 dashboard 或其他页面）
  await page.waitForURL(/.*(?:dashboard|projects|tasks)/, { timeout: 15000 });

  // 验证登录成功（不在登录页）
  await expect(page).not.toHaveURL(/.*login/);

  // 保存认证状态
  await page.context().storageState({ path: authFile });
  
  console.log('✓ 认证状态已保存');
});
