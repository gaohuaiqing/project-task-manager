/**
 * 会话管理测试
 *
 * 测试会话状态保持、超时等场景
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { DashboardPage } from '../../src/pages/DashboardPage';
import { getTestUser } from '../../src/data/test-users';

test.describe('会话管理', () => {
  test('登录后应该保持会话状态', async ({ page }) => {
    const user = getTestUser('tech_manager');
    const loginPage = new LoginPage(page);

    // 执行登录
    await loginPage.goto();
    await loginPage.login(user.username, user.password);

    // 验证登录成功
    await expect(page).toHaveURL(/\/dashboard/);

    // 获取会话ID
    const sessionId = await page.evaluate(() => {
      return localStorage.getItem('sessionId');
    });
    expect(sessionId).not.toBeNull();
  });

  test('刷新页面后应该保持登录状态', async ({ page }) => {
    const user = getTestUser('tech_manager');
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    // 执行登录
    await loginPage.goto();
    await loginPage.login(user.username, user.password);

    // 等待仪表板加载
    await dashboardPage.waitForReady();

    // 刷新页面
    await page.reload();

    // 应该仍然在仪表板
    await expect(page).toHaveURL(/\/dashboard/);

    // 仪表板应该正常显示
    await dashboardPage.waitForReady();
    const title = await dashboardPage.getPageTitle();
    expect(title.length).toBeGreaterThan(0);
  });

  test('关闭标签页后重新打开应该保持登录状态（同浏览器会话）', async ({ context }) => {
    const user = getTestUser('tech_manager');

    // 创建第一个页面并登录
    const page1 = await context.newPage();
    const loginPage1 = new LoginPage(page1);

    await loginPage1.goto();
    await loginPage1.login(user.username, user.password);

    await expect(page1).toHaveURL(/\/dashboard/);

    // 创建第二个页面（共享同一个浏览器上下文）
    const page2 = await context.newPage();
    await page2.goto('/dashboard');

    // 应该可以直接访问（共享会话）
    await expect(page2).toHaveURL(/\/dashboard/);

    // 清理
    await page1.close();
    await page2.close();
  });

  test('导航到其他页面后应该保持会话', async ({ page }) => {
    const user = getTestUser('tech_manager');
    const loginPage = new LoginPage(page);

    // 执行登录
    await loginPage.goto();
    await loginPage.login(user.username, user.password);

    // 导航到不同页面
    await page.goto('/projects');
    await expect(page).toHaveURL(/\/projects/);

    await page.goto('/tasks');
    await expect(page).toHaveURL(/\/tasks/);

    // 返回仪表板
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('会话应该在浏览器关闭后清除（不同浏览器上下文）', async ({ browser }) => {
    const user = getTestUser('tech_manager');

    // 第一个浏览器上下文
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    const loginPage1 = new LoginPage(page1);

    // 登录
    await loginPage1.goto();
    await loginPage1.login(user.username, user.password);
    await expect(page1).toHaveURL(/\/dashboard/);

    // 关闭第一个上下文
    await context1.close();

    // 创建新的浏览器上下文
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();

    // 尝试访问受保护页面
    await page2.goto('/dashboard');

    // 应该重定向到登录页
    await expect(page2).toHaveURL(/\/$/);

    // 清理
    await context2.close();
  });

  test('多个标签页应该共享会话状态', async ({ context }) => {
    const user = getTestUser('tech_manager');

    // 第一个标签页
    const page1 = await context.newPage();
    const loginPage1 = new LoginPage(page1);

    await loginPage1.goto();
    await loginPage1.login(user.username, user.password);
    await expect(page1).toHaveURL(/\/dashboard/);

    // 第二个标签页
    const page2 = await context.newPage();
    await page2.goto('/projects');

    // 应该可以直接访问（共享会话）
    await expect(page2).toHaveURL(/\/projects/);

    // 在第一个标签页登出
    await page1.goto('/'); // 返回首页
    await page1.locator('button[aria-expanded]').click();
    await page1.locator('button:has-text("退出登录")').click();

    // 等待登出完成
    await page1.waitForURL('**/');

    // 第二个标签页应该也会被登出
    await page2.reload();
    await expect(page2).toHaveURL(/\/$/);

    // 清理
    await page1.close();
    await page2.close();
  });
});

test.describe('会话存储', () => {
  test('应该正确存储用户信息', async ({ page }) => {
    const user = getTestUser('tech_manager');
    const loginPage = new LoginPage(page);

    // 执行登录
    await loginPage.goto();
    await loginPage.login(user.username, user.password);

    // 验证用户信息存储
    const userInfo = await page.evaluate(() => {
      return {
        sessionId: localStorage.getItem('sessionId'),
        userId: localStorage.getItem('userId'),
        username: localStorage.getItem('username'),
        userRole: localStorage.getItem('userRole')
      };
    });

    expect(userInfo.sessionId).not.toBeNull();
    expect(userInfo.userId).not.toBeNull();
    expect(userInfo.username).toBe(user.username);
    expect(userInfo.userRole).toBe('tech_manager');
  });

  test('登出后应该清除所有会话信息', async ({ page }) => {
    const user = getTestUser('tech_manager');
    const loginPage = new LoginPage(page);

    // 执行登录
    await loginPage.goto();
    await loginPage.login(user.username, user.password);

    // 验证会话信息存在
    const sessionBefore = await page.evaluate(() => {
      return localStorage.getItem('sessionId');
    });
    expect(sessionBefore).not.toBeNull();

    // 登出
    await page.locator('button[aria-expanded]').click();
    await page.locator('button:has-text("退出登录")').click();
    await page.waitForURL('**/');

    // 验证会话信息被清除
    const sessionAfter = await page.evaluate(() => {
      return localStorage.getItem('sessionId');
    });
    expect(sessionAfter).toBeNull();
  });
});
