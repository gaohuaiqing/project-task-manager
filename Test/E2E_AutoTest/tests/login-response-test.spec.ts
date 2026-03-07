/**
 * 登录响应测试 - 捕获登录响应详情
 */

import { test, expect } from '@playwright/test';

test('登录响应测试', async ({ page }) => {
  let loginResponse: any = null;

  // 监听登录响应
  page.on('response', async (response) => {
    if (response.url().includes('/api/login')) {
      console.log('登录响应状态:', response.status());
      try {
        const body = await response.json();
        console.log('登录响应内容:', JSON.stringify(body, null, 2));
        loginResponse = body;
      } catch (e) {
        const text = await response.text();
        console.log('登录响应文本:', text);
        loginResponse = { text };
      }
    }
  });

  // 访问登录页
  await page.goto('http://localhost:5173');
  await page.waitForLoadState('load');

  // 填充用户名和密码
  await page.locator('#username').fill('tech_manager');
  await page.locator('#password').fill('123456');

  // 点击登录按钮
  await page.locator('button[type="submit"]').click();

  // 等待 3 秒让登录处理完成
  await page.waitForTimeout(3000);

  console.log('3秒后URL:', page.url());

  // 检查是否有错误提示
  const errorAlert = page.locator('div[role="alert"]');
  const hasError = await errorAlert.isVisible().catch(() => false);

  if (hasError) {
    const errorText = await errorAlert.textContent();
    console.log('错误提示:', errorText);
  } else {
    console.log('没有错误提示');
  }

  // 等待 5 秒查看是否有跳转
  await page.waitForTimeout(5000);
  console.log('8秒后URL:', page.url());

  // 检查localStorage
  const localStorage = await page.evaluate(() => {
    return {
      ...window.localStorage
    };
  });
  console.log('LocalStorage:', JSON.stringify(localStorage, null, 2));

  console.log('登录响应:', JSON.stringify(loginResponse, null, 2));
});
