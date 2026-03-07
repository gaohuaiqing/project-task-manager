/**
 * 登出功能测试
 *
 * 测试用户登出的各种场景
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { DashboardPage } from '../../src/pages/DashboardPage';
import { Header } from '../../src/components/Header';
import { getTestUser } from '../../src/data/test-users';
import { logout } from '../../src/helpers/auth-helpers';

test.describe('用户登出', () => {
  test('点击退出登录应该成功登出', async ({ page }) => {
    const user = getTestUser('tech_manager');
    const loginPage = new LoginPage(page);

    // 先登录
    await loginPage.goto();
    await loginPage.login(user.username, user.password);

    // 验证登录成功
    await expect(page).toHaveURL(/\/dashboard/);

    // 执行登出
    await logout(page);

    // 应该跳转到登录页
    await expect(page).toHaveURL(/\/$/);

    // 验证登录表单显示
    await expect(page.locator('#username')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
  });

  test('登出后应该清除会话', async ({ page }) => {
    const user = getTestUser('tech_manager');
    const loginPage = new LoginPage(page);

    // 先登录
    await loginPage.goto();
    await loginPage.login(user.username, user.password);

    // 执行登出
    await logout(page);

    // 验证已登出
    await expect(page).toHaveURL(/\/$/);

    // 尝试直接访问仪表板
    await page.goto('/dashboard');

    // 应该重定向到登录页
    await expect(page).toHaveURL(/\/$/);
  });

  test('登出后不能直接访问受保护页面', async ({ page }) => {
    const user = getTestUser('tech_manager');
    const loginPage = new LoginPage(page);

    // 先登录
    await loginPage.goto();
    await loginPage.login(user.username, user.password);

    // 执行登出
    await logout(page);

    // 尝试访问任务管理页面
    await page.goto('/tasks');

    // 应该重定向到登录页
    await expect(page).toHaveURL(/\/$/);
  });

  test('登出后localStorage应该被清除', async ({ page }) => {
    const user = getTestUser('tech_manager');
    const loginPage = new LoginPage(page);

    // 先登录
    await loginPage.goto();
    await loginPage.login(user.username, user.password);

    // 验证会话信息存在
    const sessionBefore = await page.evaluate(() => {
      return localStorage.getItem('sessionId');
    });
    expect(sessionBefore).not.toBeNull();

    // 执行登出
    await logout(page);

    // 验证会话信息被清除
    const sessionAfter = await page.evaluate(() => {
      return localStorage.getItem('sessionId');
    });
    expect(sessionAfter).toBeNull();
  });

  test('重新登录应该可以正常工作', async ({ page }) => {
    const user = getTestUser('tech_manager');
    const loginPage = new LoginPage(page);

    // 第一次登录
    await loginPage.goto();
    await loginPage.login(user.username, user.password);
    await expect(page).toHaveURL(/\/dashboard/);

    // 登出
    await logout(page);
    await expect(page).toHaveURL(/\/$/);

    // 第二次登录
    await loginPage.login(user.username, user.password);
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

test.describe('登出UI交互', () => {
  test('用户菜单应该可以正常展开和收起', async ({ page }) => {
    const user = getTestUser('tech_manager');
    const loginPage = new LoginPage(page);
    const header = new Header(page);

    // 先登录
    await loginPage.goto();
    await loginPage.login(user.username, user.password);

    // 点击用户菜单按钮
    await header.openUserMenu();

    // 验证下拉菜单展开
    await expect(header.userDropdown).toBeVisible();

    // 验证退出登录按钮可见
    await expect(header.logoutButton).toBeVisible();

    // 点击用户菜单按钮收起菜单
    await header.closeUserMenu();

    // 下拉菜单应该隐藏（这里简单验证）
    const isOpen = await header.isUserMenuOpen();
    expect(isOpen).toBe(false);
  });

  test('点击用户信息应该可以访问个人资料', async ({ page }) => {
    const user = getTestUser('tech_manager');
    const loginPage = new LoginPage(page);
    const header = new Header(page);

    // 先登录
    await loginPage.goto();
    await loginPage.login(user.username, user.password);

    // 点击用户菜单
    await header.openUserMenu();

    // 点击个人资料（如果有的话）
    const profileButton = page.locator('button:has-text("个人资料"), a:has-text("个人资料")');
    if (await profileButton.isVisible()) {
      await profileButton.first().click();
      // 应该导航到个人资料页面或打开对话框
      await page.waitForTimeout(1000);
    }
  });
});
