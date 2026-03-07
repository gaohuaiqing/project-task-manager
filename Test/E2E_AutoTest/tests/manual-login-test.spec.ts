/**
 * 手动登录测试 - 用于调试
 */

import { test, expect } from '@playwright/test';

test('手动登录测试', async ({ page }) => {
  console.log('开始访问登录页面...');

  // 访问登录页
  await page.goto('http://localhost:5173');
  await page.waitForLoadState('load');

  console.log('当前URL:', page.url());

  // 截图
  await page.screenshot({ path: 'debug-1-login-page.png' });

  // 填充用户名
  console.log('填充用户名...');
  await page.locator('#username').fill('tech_manager');
  await page.screenshot({ path: 'debug-2-username-filled.png' });

  // 填充密码
  console.log('填充密码...');
  await page.locator('#password').fill('123456');
  await page.screenshot({ path: 'debug-3-password-filled.png' });

  // 点击登录按钮
  console.log('点击登录按钮...');
  await page.locator('button[type="submit"]').click();
  await page.screenshot({ path: 'debug-4-after-click.png' });

  // 等待 5 秒查看结果
  console.log('等待响应...');
  await page.waitForTimeout(5000);

  console.log('5秒后URL:', page.url());
  await page.screenshot({ path: 'debug-5-final.png' });

  // 检查是否有错误提示
  const errorAlert = page.locator('div[role="alert"]');
  if (await errorAlert.isVisible()) {
    const errorText = await errorAlert.textContent();
    console.log('错误提示:', errorText);
  }
});
