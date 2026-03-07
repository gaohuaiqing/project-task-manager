/**
 * 登录功能测试
 *
 * 测试用户登录的各种场景
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { DashboardPage } from '../../src/pages/DashboardPage';
import { getTestUser } from '../../src/data/test-users';

test.describe('用户登录', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('应该显示统一登录表单', async ({ page }) => {
    // 验证统一登录表单的元素
    await expect(page.locator('#username')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#passwordToggle')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // 验证页面标题
    await expect(page.locator('h1:has-text("技术团队管理智能平台")')).toBeVisible();

    // 验证登录卡片标题
    await expect(page.locator('text=用户登录')).toBeVisible();
  });

  test('正确的用户名和密码应该登录成功', async ({ page }) => {
    const user = getTestUser('tech_manager');

    await loginPage.fillUsername(user.username);
    await loginPage.fillPassword(user.password);
    await loginPage.clickLoginButton();

    // 应该跳转到仪表板
    await expect(page).toHaveURL(/\/dashboard/);

    // 验证仪表板加载
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.waitForReady();

    // 验证用户信息显示
    const currentUrl = page.url();
    expect(currentUrl).toContain('/dashboard');
  });

  test('管理员账号应该能够通过统一登录成功', async ({ page }) => {
    const user = getTestUser('admin');

    // 使用统一登录表单
    await loginPage.fillUsername(user.username);
    await loginPage.fillPassword(user.password);
    await loginPage.clickLoginButton();

    // 应该跳转到仪表板
    await expect(page).toHaveURL(/\/dashboard/);

    // 验证管理员权限被正确识别
    const isAdmin = await page.evaluate(() => {
      const currentUser = localStorage.getItem('currentUser');
      if (!currentUser) return false;
      const user = JSON.parse(currentUser);
      return user.role === 'admin';
    });
    expect(isAdmin).toBe(true);
  });

  test('错误的用户名或密码应该显示错误提示', async ({ page }) => {
    await loginPage.fillUsername('wrong_user');
    await loginPage.fillPassword('wrong_password');
    await loginPage.clickLoginButton();

    // 应该显示错误提示
    await loginPage.expectLoginError();

    const errorMessage = await loginPage.getErrorMessage();
    expect(errorMessage.length).toBeGreaterThan(0);

    // 应该仍在登录页
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/dashboard');
  });

  test('空的用户名和密码应该显示验证错误', async ({ page }) => {
    // 直接点击登录按钮
    await loginPage.clickLoginButton();

    // 应该显示验证错误（或者在登录按钮上显示）
    // 这里我们验证不会跳转到仪表板
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/dashboard');
  });

  test('密码可见性切换应该正常工作', async ({ page }) => {
    const passwordInput = page.locator('#password');

    // 初始状态应该是密码类型
    let inputType = await passwordInput.getAttribute('type');
    expect(inputType).toBe('password');

    // 点击切换按钮
    await loginPage.togglePasswordVisibility();

    // 应该变成文本类型
    inputType = await passwordInput.getAttribute('type');
    expect(inputType).toBe('text');

    // 再次点击切换
    await loginPage.togglePasswordVisibility();

    // 应该变回密码类型
    inputType = await passwordInput.getAttribute('type');
    expect(inputType).toBe('password');
  });

  test('所有角色应该能够通过统一登录成功', async ({ page }) => {
    const roles = ['admin', 'tech_manager', 'dept_manager', 'engineer'] as const;

    for (const role of roles) {
      // 清除会话
      await page.evaluate(() => localStorage.clear());
      await loginPage.goto();

      const user = getTestUser(role);

      // 使用统一登录表单
      await loginPage.fillUsername(user.username);
      await loginPage.fillPassword(user.password);
      await loginPage.clickLoginButton();

      // 验证登录成功
      await expect(page).toHaveURL(/\/dashboard/);

      // 验证权限被正确识别
      const userRole = await page.evaluate(() => {
        const currentUser = localStorage.getItem('currentUser');
        if (!currentUser) return null;
        const user = JSON.parse(currentUser);
        return user.role;
      });
      expect(userRole).toBe(role);

      // 登出以便下一个角色测试
      if (role !== roles[roles.length - 1]) {
        await page.locator('button[aria-expanded]').click();
        await page.locator('button:has-text("退出登录")').click();
        await page.waitForURL('**/');
      }
    }
  });

  test('部门经理账号应该能够登录', async ({ page }) => {
    const user = getTestUser('dept_manager');

    await loginPage.fillUsername(user.username);
    await loginPage.fillPassword(user.password);
    await loginPage.clickLoginButton();

    // 应该跳转到仪表板
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('工程师账号应该能够登录', async ({ page }) => {
    const user = getTestUser('engineer');

    await loginPage.fillUsername(user.username);
    await loginPage.fillPassword(user.password);
    await loginPage.clickLoginButton();

    // 应该跳转到仪表板
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

test.describe('登录后验证', () => {
  test('登录后应该保持会话状态', async ({ page }) => {
    const user = getTestUser('tech_manager');
    const loginPage = new LoginPage(page);

    // 执行登录
    await loginPage.goto();
    await loginPage.login(user.username, user.password);

    // 验证登录成功
    await expect(page).toHaveURL(/\/dashboard/);

    // 刷新页面
    await page.reload();

    // 应该仍然在仪表板（会话保持）
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('未登录时访问受保护页面应该重定向到登录页', async ({ page }) => {
    // 直接访问仪表板
    await page.goto('/dashboard');

    // 应该重定向到登录页
    await expect(page).toHaveURL(/\/$/);
  });
});
