/**
 * 控制台日志测试 - 用于调试
 */

import { test, expect } from '@playwright/test';

test('控制台日志测试', async ({ page }) => {
  // 监听控制台消息
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('Browser Console Error:', msg.text());
    } else if (msg.type() === 'warning') {
      console.warn('Browser Console Warning:', msg.text());
    } else {
      console.log('Browser Console Log:', msg.text());
    }
  });

  // 监听网络请求
  page.on('request', request => {
    console.log('Request:', request.method(), request.url());
  });

  page.on('response', response => {
    const status = response.status();
    if (status >= 400) {
      console.error('Response Error:', status, response.url());
    } else {
      console.log('Response:', status, response.url());
    }
  });

  // 访问登录页
  await page.goto('http://localhost:5173');
  await page.waitForLoadState('load');

  console.log('页面已加载，当前URL:', page.url());

  // 填充用户名
  await page.locator('#username').fill('tech_manager');
  console.log('用户名已填充');

  // 填充密码
  await page.locator('#password').fill('123456');
  console.log('密码已填充');

  // 点击登录按钮
  await page.locator('button[type="submit"]').click();
  console.log('登录按钮已点击');

  // 等待 10 秒
  await page.waitForTimeout(10000);

  console.log('最终URL:', page.url());

  // 检查页面内容
  const pageTitle = await page.title();
  console.log('页面标题:', pageTitle);
});
