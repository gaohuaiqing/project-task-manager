/**
 * 设置页面导航测试
 *
 * 测试覆盖：
 * - 设置页面加载
 * - 标签页导航
 * - URL参数同步
 * - 标签页可见性
 */

import { test, expect } from '@playwright/test';
import { SettingsPage } from '../../src/pages/SettingsPage';
import { Sidebar } from '../../src/components/Sidebar';
import { login, logout } from '../../src/helpers/auth-helpers';

test.describe('设置页面导航', () => {
  let settingsPage: SettingsPage;
  let sidebar: Sidebar;

  test.beforeEach(async ({ page }) => {
    settingsPage = new SettingsPage(page);
    sidebar = new Sidebar(page);
    await login(page, 'admin');
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('应该正确加载设置页面', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.waitForReady();

    // 验证设置页面标题
    await expect(page.locator('h1, h2').filter({ hasText: /设置/ })).toBeVisible();

    // 验证在设置页面
    const isOnSettings = await settingsPage.isOnSettingsPage();
    expect(isOnSettings).toBeTruthy();
  });

  test('应该显示所有设置标签页（管理员）', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.waitForReady();

    // 验证各个标签页可见
    const expectedTabs = [
      '个人信息',
      '节假日',
      '任务类型',
      '项目类型',
      '权限',
      '组织',
      '日志'
    ];

    for (const tabName of expectedTabs) {
      const isVisible = await settingsPage.isTabVisible(tabName);
      expect(isVisible, `标签页 "${tabName}" 应该可见`).toBeTruthy();
    }
  });

  test('点击标签页应该切换内容并更新URL', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.waitForReady();

    // 测试各个标签页
    const tabTests = [
      { tab: 'profile', keyword: 'profile' },
      { tab: 'holidays', keyword: 'holidays' },
      { tab: 'task-types', keyword: 'task' },
      { tab: 'project-types', keyword: 'project' },
      { tab: 'permissions', keyword: 'permission' },
      { tab: 'logs', keyword: 'log' }
    ];

    for (const { tab, keyword } of tabTests) {
      await settingsPage.switchToTab(tab as any);
      await page.waitForTimeout(500);

      // 验证URL参数
      const url = page.url();
      expect(url.toLowerCase()).toContain(keyword);

      // 验证内容区域存在
      await expect(settingsPage.contentArea).toBeVisible();
    }
  });

  test('应该正确显示个人信息标签内容', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.goToProfile();

    // 验证个人信息表单存在
    await expect(settingsPage.profileForm).toBeVisible({ timeout: 5000 });

    // 验证用户信息字段存在
    const hasUserInfo = await page.locator('[class*="user"], [class*="profile"]').count() > 0;
    expect(hasUserInfo).toBeTruthy();
  });

  test('应该正确显示项目类型标签内容', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.goToProjectTypes();

    // 验证项目类型列表存在
    const hasTypeList = await settingsPage.projectTypeList.count() > 0;
    if (hasTypeList) {
      await expect(settingsPage.projectTypeList.first()).toBeVisible();
    }

    // 验证添加按钮存在
    await expect(settingsPage.addProjectTypeButton).toBeVisible();
  });

  test('应该正确显示任务类型标签内容', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.goToTaskTypes();

    // 验证任务类型输入框存在
    await expect(settingsPage.taskTypeInput).toBeVisible();

    // 验证颜色选择器存在
    await expect(settingsPage.taskTypeColorPicker).toBeVisible();
  });

  test('应该正确显示节假日标签内容', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.goToHolidays();

    // 验证节假日列表存在
    const hasHolidayList = await settingsPage.holidayList.count() > 0;
    if (hasHolidayList) {
      await expect(settingsPage.holidayList.first()).toBeVisible();
    }

    // 验证添加节假日按钮存在
    const hasAddButton = await settingsPage.addHolidayButton.count() > 0;
    expect(hasAddButton).toBeTruthy();
  });

  test('应该正确显示系统日志标签内容', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.goToSystemLogs();

    // 验证日志列表存在
    const hasLogList = await settingsPage.systemLogList.count() > 0;
    if (hasLogList) {
      await expect(settingsPage.systemLogList.first()).toBeVisible();
    }

    // 验证刷新按钮存在
    await expect(settingsPage.logRefreshButton).toBeVisible();
  });

  test('应该正确显示权限管理标签内容', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.goToPermissions();

    // 验证权限配置区域存在
    const hasPermissionConfig = await settingsPage.permissionConfig.count() > 0;
    if (hasPermissionConfig) {
      await expect(settingsPage.permissionConfig.first()).toBeVisible();
    }

    // 验证角色标签存在
    const hasRoleTabs = await settingsPage.roleTabs.count() > 0;
    expect(hasRoleTabs).toBeTruthy();
  });
});

test.describe('设置页面导航 - 权限控制', () => {
  test('普通用户应该只能看到部分标签页', async ({ page }) => {
    await login(page, 'engineer');

    await page.goto('/settings');
    await page.waitForTimeout(1000);

    const settingsPage = new SettingsPage(page);

    // 验证只能看到个人信息标签
    const hasProfileTab = await settingsPage.isTabVisible('个人信息');
    expect(hasProfileTab).toBeTruthy();

    // 验证看不到管理员专用标签
    const hasPermissionTab = await settingsPage.isTabVisible('权限');
    expect(hasPermissionTab).toBeFalsy();

    const hasLogsTab = await settingsPage.isTabVisible('日志');
    expect(hasLogsTab).toBeFalsy();

    await logout(page);
  });

  test('技术经理应该能看到相关设置标签', async ({ page }) => {
    await login(page, 'tech_manager');

    await page.goto('/settings');
    await page.waitForTimeout(1000);

    const settingsPage = new SettingsPage(page);

    // 验证能看到基本信息标签
    const hasProfileTab = await settingsPage.isTabVisible('个人信息');
    expect(hasProfileTab).toBeTruthy();

    // 验证看不到管理员专用标签
    const hasPermissionTab = await settingsPage.isTabVisible('权限');
    expect(hasPermissionTab).toBeFalsy();

    await logout(page);
  });

  test('部门经理应该能看到组织设置', async ({ page }) => {
    await login(page, 'dept_manager');

    await page.goto('/settings');
    await page.waitForTimeout(1000);

    const settingsPage = new SettingsPage(page);

    // 验证能看到组织设置标签
    const hasOrgTab = await settingsPage.isTabVisible('组织');
    expect(hasOrgTab).toBeTruthy();

    await logout(page);
  });

  test('访问无权限的标签页应该显示权限提示', async ({ page }) => {
    await login(page, 'engineer');

    // 尝试直接访问权限管理页面
    await page.goto('/settings?view=settings-permissions');
    await page.waitForTimeout(1000);

    const settingsPage = new SettingsPage(page);

    // 验证显示权限不足提示
    const hasAlert = await settingsPage.hasPermissionAlert();
    expect(hasAlert).toBeTruthy();

    await logout(page);
  });
});
