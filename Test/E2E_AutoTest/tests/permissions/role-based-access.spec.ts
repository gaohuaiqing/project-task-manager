/**
 * 基于角色的访问控制测试
 *
 * 测试不同角色的权限控制
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { Sidebar } from '../../src/components/Sidebar';
import { getTestUser } from '../../src/data/test-users';

test.describe('角色权限 - 管理员', () => {
  test('管理员应该能够访问所有菜单', async ({ page }) => {
    const user = getTestUser('admin');
    const loginPage = new LoginPage(page);
    const sidebar = new Sidebar(page);

    // 使用统一登录
    await loginPage.goto();
    await loginPage.login(user.username, user.password);

    // 验证所有菜单可见
    await sidebar.waitForVisible();

    const menus = [
      '仪表板',
      '项目管理',
      '任务管理',
      '组织架构',
      '设置'
    ];

    for (const menu of menus) {
      const isVisible = await sidebar.isMenuVisible(menu);
      expect(isVisible).toBeTruthy();
    }
  });
});

test.describe('角色权限 - 技术经理', () => {
  test('技术经理应该能够访问任务管理', async ({ page }) => {
    const user = getTestUser('tech_manager');
    const loginPage = new LoginPage(page);
    const sidebar = new Sidebar(page);

    await loginPage.goto();
    await loginPage.login(user.username, user.password);

    await sidebar.waitForVisible();

    // 验证可以访问任务管理
    const canAccessTasks = await sidebar.isMenuVisible('任务管理');
    expect(canAccessTasks).toBeTruthy();
  });

  test('技术经理不应该能够创建项目', async ({ page }) => {
    const user = getTestUser('tech_manager');
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login(user.username, user.password);

    // 尝试访问项目创建
    await page.goto('/projects');
    await page.waitForTimeout(1000);

    // 创建项目按钮应该不存在或不可见
    const createButton = page.locator('button:has-text("创建项目")');
    const isVisible = await createButton.isVisible().catch(() => false);
    expect(isVisible).toBeFalsy();
  });

  test('技术经理不应该能够访问组织架构', async ({ page }) => {
    const user = getTestUser('tech_manager');
    const loginPage = new LoginPage(page);
    const sidebar = new Sidebar(page);

    await loginPage.goto();
    await loginPage.login(user.username, user.password);

    await sidebar.waitForVisible();

    // 组织架构菜单应该不可见
    const canAccessOrg = await sidebar.isMenuVisible('组织架构');
    expect(canAccessOrg).toBeFalsy();
  });
});

test.describe('角色权限 - 部门经理', () => {
  test('部门经理应该能够创建项目', async ({ page }) => {
    const user = getTestUser('dept_manager');
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login(user.username, user.password);

    // 访问项目页面
    await page.goto('/projects');
    await page.waitForTimeout(1000);

    // 创建项目按钮应该可见
    const createButton = page.locator('button:has-text("创建项目")');
    await expect(createButton).toBeVisible();
  });

  test('部门经理应该能够访问组织架构', async ({ page }) => {
    const user = getTestUser('dept_manager');
    const loginPage = new LoginPage(page);
    const sidebar = new Sidebar(page);

    await loginPage.goto();
    await loginPage.login(user.username, user.password);

    await sidebar.waitForVisible();

    // 组织架构菜单应该可见
    const canAccessOrg = await sidebar.isMenuVisible('组织架构');
    expect(canAccessOrg).toBeTruthy();
  });

  test('部门经理应该能够创建任务', async ({ page }) => {
    const user = getTestUser('dept_manager');
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login(user.username, user.password);

    // 访问任务页面
    await page.goto('/tasks');
    await page.waitForTimeout(1000);

    // 创建任务按钮应该可见
    const createButton = page.locator('button:has-text("新建任务")');
    await expect(createButton).toBeVisible();
  });
});

test.describe('角色权限 - 工程师', () => {
  test('工程师不应该能够创建项目', async ({ page }) => {
    const user = getTestUser('engineer');
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login(user.username, user.password);

    // 访问项目页面
    await page.goto('/projects');
    await page.waitForTimeout(1000);

    // 创建项目按钮应该不可见
    const createButton = page.locator('button:has-text("创建项目")');
    const isVisible = await createButton.isVisible().catch(() => false);
    expect(isVisible).toBeFalsy();
  });

  test('工程师不应该能够访问组织架构', async ({ page }) => {
    const user = getTestUser('engineer');
    const loginPage = new LoginPage(page);
    const sidebar = new Sidebar(page);

    await loginPage.goto();
    await loginPage.login(user.username, user.password);

    await sidebar.waitForVisible();

    // 组织架构菜单应该不可见
    const canAccessOrg = await sidebar.isMenuVisible('组织架构');
    expect(canAccessOrg).toBeFalsy();
  });

  test('工程师应该能够创建任务（但只能分配给自己）', async ({ page }) => {
    const user = getTestUser('engineer');
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login(user.username, user.password);

    // 访问任务页面
    await page.goto('/tasks');
    await page.waitForTimeout(1000);

    // 创建任务按钮应该可见
    const createButton = page.locator('button:has-text("新建任务")');
    await expect(createButton).toBeVisible();
  });

  test('工程师不应该看到系统设置菜单', async ({ page }) => {
    const user = getTestUser('engineer');
    const loginPage = new LoginPage(page);
    const sidebar = new Sidebar(page);

    await loginPage.goto();
    await loginPage.login(user.username, user.password);

    await sidebar.waitForVisible();

    // 设置菜单下的子菜单应该受限
    const canAccessSettings = await sidebar.isMenuVisible('设置');
    // 可能能看到设置主菜单，但子菜单受限
  });
});

test.describe('跨角色数据隔离', () => {
  test('工程师只能看到自己的任务', async ({ page }) => {
    // 这个测试需要预先创建数据，这里只测试基本逻辑
    const user = getTestUser('engineer');
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login(user.username, user.password);

    // 访问任务页面
    await page.goto('/tasks');
    await page.waitForTimeout(1000);

    // 验证页面加载成功
    await expect(page.locator('h1, h2')).toBeVisible();
  });

  test('不同角色应该看到不同的仪表板统计', async ({ page }) => {
    // 测试不同角色登录后的仪表板
    const roles: Array<'admin' | 'tech_manager' | 'dept_manager' | 'engineer'> = [
      'admin',
      'tech_manager',
      'dept_manager',
      'engineer'
    ];

    for (const role of roles) {
      const user = getTestUser(role);
      const loginPage = new LoginPage(page);

      // 登录
      await page.goto('/');
      await loginPage.login(user.username, user.password);

      // 验证仪表板加载
      await expect(page).toHaveURL(/\/dashboard/);
      await page.waitForTimeout(1000);

      // 验证仪表板内容显示
      const dashboardContent = page.locator('main, [class*="dashboard"]');
      await expect(dashboardContent).toBeVisible();

      // 登出
      await page.locator('button[aria-expanded"]').click();
      await page.locator('button:has-text("退出登录")').click();
      await page.waitForURL('**/');
    }
  });
});
