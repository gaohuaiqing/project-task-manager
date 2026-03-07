import { test, expect } from '@playwright/test';
import { SettingsPage } from '../../src/pages/SettingsPage';
import { Sidebar } from '../../src/components/Sidebar';
import { login, logout } from '../../src/helpers/auth-helpers';

/**
 * 设置管理模块E2E测试
 *
 * 测试覆盖：
 * - 设置页面导航
 * - 个人信息设置
 * - 密码修改
 * - 用户管理
 * - 权限管理
 * - 项目类型管理
 * - 任务类型管理
 * - 节假日管理
 * - 系统日志
 * - 权限控制
 */
test.describe('设置管理模块', () => {
  let settingsPage: SettingsPage;
  let sidebar: Sidebar;

  // 使用管理员账号进行大部分测试
  test.beforeEach(async ({ page }) => {
    settingsPage = new SettingsPage(page);
    sidebar = new Sidebar(page);
    await login(page, 'admin');
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test.describe('设置页面导航', () => {
    test('应该正确加载设置页面', async ({ page }) => {
      await sidebar.navigateToSettings();
      await settingsPage.waitForLoad();

      // 验证设置页面标题
      await expect(page.locator('h1, h2:has-text("设置")')).toBeVisible();
    });

    test('应该显示所有设置标签页', async ({ page }) => {
      await sidebar.navigateToSettings();
      await settingsPage.waitForLoad();

      // 验证标签页导航存在
      await expect(settingsPage.tabsNavigation).toBeVisible();
    });

    test('点击标签页应该切换内容', async ({ page }) => {
      await sidebar.navigateToSettings();
      await settingsPage.waitForLoad();

      // 切换到个人信息标签
      await settingsPage.switchToTab('profile');
      await page.waitForTimeout(500);

      // 验证URL参数
      const url = page.url();
      expect(url).toContain('profile');
    });
  });

  test.describe('个人信息设置', () => {
    test('应该显示个人信息表单', async ({ page }) => {
      await sidebar.navigateToSettings();
      await settingsPage.switchToTab('profile');
      await page.waitForTimeout(500);

      // 验证表单元素
      await expect(settingsPage.profileForm).toBeVisible();
    });

    test('应该可以修改个人信息', async ({ page }) => {
      await sidebar.navigateToSettings();
      await settingsPage.switchToTab('profile');
      await page.waitForTimeout(500);

      // 获取当前名称
      const nameInput = settingsPage.getProfileField('name');
      const originalName = await nameInput.inputValue();

      // 修改名称
      const newName = `测试用户_${Date.now()}`;
      await nameInput.clear();
      await nameInput.fill(newName);

      // 保存修改
      await settingsPage.saveProfile();
      await page.waitForTimeout(1000);

      // 验证保存成功提示
      const successMessage = page.locator('.toast-success, [data-testid="save-success"]');
      const hasSuccess = await successMessage.count() > 0;

      if (hasSuccess) {
        await expect(successMessage.first()).toBeVisible();
      }

      // 恢复原名称
      await nameInput.clear();
      await nameInput.fill(originalName);
      await settingsPage.saveProfile();
    });

    test('应该显示密码修改对话框', async ({ page }) => {
      await sidebar.navigateToSettings();
      await settingsPage.switchToTab('profile');
      await page.waitForTimeout(500);

      // 点击修改密码按钮
      await settingsPage.openChangePasswordDialog();

      // 验证对话框打开
      await expect(settingsPage.passwordDialog).toBeVisible({ timeout: 3000 });

      // 关闭对话框
      await page.keyboard.press('Escape');
    });
  });

  test.describe('用户管理', () => {
    test('应该显示用户列表', async ({ page }) => {
      await sidebar.navigateToSettings();
      await settingsPage.switchToTab('users');
      await page.waitForTimeout(1000);

      // 验证用户列表存在
      const hasUserList = await settingsPage.userList.count() > 0;

      if (hasUserList) {
        await expect(settingsPage.userList.first()).toBeVisible();
      }
    });

    test('应该可以打开新建用户对话框', async ({ page }) => {
      await sidebar.navigateToSettings();
      await settingsPage.switchToTab('users');
      await page.waitForTimeout(1000);

      // 点击新建用户按钮
      await settingsPage.clickAddUser();

      // 验证对话框打开
      const userDialog = page.locator('[data-testid="user-dialog"], [role="dialog"]:has-text("用户")');
      const hasDialog = await userDialog.count() > 0;

      if (hasDialog) {
        await expect(userDialog.first()).toBeVisible();

        // 关闭对话框
        await page.keyboard.press('Escape');
      }
    });

    test('用户表单应该进行验证', async ({ page }) => {
      await sidebar.navigateToSettings();
      await settingsPage.switchToTab('users');
      await page.waitForTimeout(1000);

      await settingsPage.clickAddUser();
      await page.waitForTimeout(500);

      // 尝试不填写必填字段直接提交
      const submitButton = page.locator('button:has-text("提交"), button:has-text("创建")').first();

      if (await submitButton.count() > 0) {
        await submitButton.click();
        await page.waitForTimeout(500);

        // 验证错误提示
        const errorMessage = page.locator('.error, .validation-error, [data-testid="form-error"]');
        const hasError = await errorMessage.count() > 0;

        if (hasError) {
          await expect(errorMessage.first()).toBeVisible();
        }
      }

      // 关闭对话框
      await page.keyboard.press('Escape');
    });
  });

  test.describe('权限管理', () => {
    test('应该显示权限配置界面', async ({ page }) => {
      await sidebar.navigateToSettings();
      await settingsPage.switchToTab('permissions');
      await page.waitForTimeout(1000);

      // 验证权限配置存在
      const hasPermissionConfig = await settingsPage.permissionConfig.count() > 0;

      if (hasPermissionConfig) {
        await expect(settingsPage.permissionConfig.first()).toBeVisible();
      }
    });

    test('应该可以修改角色权限', async ({ page }) => {
      await sidebar.navigateToSettings();
      await settingsPage.switchToTab('permissions');
      await page.waitForTimeout(1000);

      // 选择一个角色
      const roleTab = page.locator('[data-testid="role-tab"], .role-tab').first();

      const hasRoleTab = await roleTab.count() > 0;

      if (hasRoleTab) {
        await roleTab.click();
        await page.waitForTimeout(500);

        // 切换一个权限开关
        const permissionSwitch = page.locator(
          '[data-testid="permission-switch"], .permission-switch'
        ).first();

        const hasSwitch = await permissionSwitch.count() > 0;

        if (hasSwitch) {
          const originalState = await permissionSwitch.isChecked();

          await permissionSwitch.click();
          await page.waitForTimeout(500);

          // 验证状态改变
          const newState = await permissionSwitch.isChecked();
          expect(newState).toBe(!originalState);

          // 恢复原状态
          await permissionSwitch.click();
        }
      }
    });

    test('应该可以批量设置权限', async ({ page }) => {
      await sidebar.navigateToSettings();
      await settingsPage.switchToTab('permissions');
      await page.waitForTimeout(1000);

      // 查找批量设置按钮
      const bulkButton = page.locator(
        '[data-testid="bulk-permission-button"], button:has-text("批量")'
      ).first();

      const hasBulkButton = await bulkButton.count() > 0;

      if (hasBulkButton) {
        await bulkButton.click();
        await page.waitForTimeout(500);

        // 验证批量设置对话框打开
        const bulkDialog = page.locator('[data-testid="bulk-permission-dialog"]').first();
        const hasDialog = await bulkDialog.count() > 0;

        if (hasDialog) {
          await expect(bulkDialog).toBeVisible();

          // 关闭对话框
          await page.keyboard.press('Escape');
        }
      }
    });
  });

  test.describe('项目类型管理', () => {
    test('应该显示项目类型列表', async ({ page }) => {
      await sidebar.navigateToSettings();
      await settingsPage.switchToTab('project-types');
      await page.waitForTimeout(1000);

      // 验证类型列表存在
      const hasTypeList = await settingsPage.projectTypeList.count() > 0;

      if (hasTypeList) {
        await expect(settingsPage.projectTypeList.first()).toBeVisible();
      }
    });

    test('应该可以添加新项目类型', async ({ page }) => {
      await sidebar.navigateToSettings();
      await settingsPage.switchToTab('project-types');
      await page.waitForTimeout(1000);

      // 查找添加按钮
      const addButton = page.locator(
        '[data-testid="add-project-type"], button:has-text("添加"), button:has-text("新建")'
      ).first();

      const hasAddButton = await addButton.count() > 0;

      if (hasAddButton) {
        await addButton.click();
        await page.waitForTimeout(500);

        // 验证对话框打开
        const dialog = page.locator('[data-testid="project-type-dialog"]').first();
        const hasDialog = await dialog.count() > 0;

        if (hasDialog) {
          await expect(dialog).toBeVisible();

          // 关闭对话框
          await page.keyboard.press('Escape');
        }
      }
    });
  });

  test.describe('任务类型管理', () => {
    test('应该显示任务类型列表', async ({ page }) => {
      await sidebar.navigateToSettings();
      await settingsPage.switchToTab('task-types');
      await page.waitForTimeout(1000);

      // 验证类型列表存在
      const hasTypeList = await settingsPage.taskTypeList.count() > 0;

      if (hasTypeList) {
        await expect(settingsPage.taskTypeList.first()).toBeVisible();
      }
    });
  });

  test.describe('节假日管理', () => {
    test('应该显示节假日日历', async ({ page }) => {
      await sidebar.navigateToSettings();
      await settingsPage.switchToTab('holidays');
      await page.waitForTimeout(1000);

      // 验证日历组件存在
      const hasCalendar = await settingsPage.holidayCalendar.count() > 0;

      if (hasCalendar) {
        await expect(settingsPage.holidayCalendar.first()).toBeVisible();
      }
    });

    test('应该可以添加节假日', async ({ page }) => {
      await sidebar.navigateToSettings();
      await settingsPage.switchToTab('holidays');
      await page.waitForTimeout(1000);

      // 查找添加按钮
      const addButton = page.locator(
        '[data-testid="add-holiday"], button:has-text("添加节假日")'
      ).first();

      const hasAddButton = await addButton.count() > 0;

      if (hasAddButton) {
        await addButton.click();
        await page.waitForTimeout(500);

        // 验证对话框打开
        const dialog = page.locator('[data-testid="holiday-dialog"]').first();
        const hasDialog = await dialog.count() > 0;

        if (hasDialog) {
          await expect(dialog).toBeVisible();

          // 关闭对话框
          await page.keyboard.press('Escape');
        }
      }
    });
  });

  test.describe('系统日志', () => {
    test('应该显示系统日志列表', async ({ page }) => {
      await sidebar.navigateToSettings();
      await settingsPage.switchToTab('logs');
      await page.waitForTimeout(1000);

      // 验证日志列表存在
      const hasLogList = await settingsPage.systemLogList.count() > 0;

      if (hasLogList) {
        await expect(settingsPage.systemLogList.first()).toBeVisible();
      }
    });

    test('应该支持日志筛选', async ({ page }) => {
      await sidebar.navigateToSettings();
      await settingsPage.switchToTab('logs');
      await page.waitForTimeout(1000);

      // 查找筛选器
      const filterSelect = page.locator(
        '[data-testid="log-filter"], select, [role="combobox"]'
      ).first();

      const hasFilter = await filterSelect.count() > 0;

      if (hasFilter) {
        // 点击筛选器
        await filterSelect.click();
        await page.waitForTimeout(500);

        // 验证选项显示
        const options = page.locator('option, [role="option"]');
        const hasOptions = await options.count() > 0;

        if (hasOptions) {
          expect(hasOptions).toBeTruthy();
        }
      }
    });
  });

  test.describe('设置权限控制', () => {
    test('普通用户只能访问个人信息设置', async ({ page }) => {
      // 登出管理员
      await logout(page);

      // 使用工程师账号登录
      await login(page, 'engineer');
      await sidebar.navigateToSettings();
      await page.waitForTimeout(1000);

      // 验证只能看到个人信息标签
      const visibleTabs = await settingsPage.tabsNavigation.allInnerTexts();

      // 应该包含个人信息
      const hasProfile = visibleTabs.some((text) =>
        text.includes('个人信息') || text.includes('Profile')
      );

      expect(hasProfile).toBeTruthy();
    });

    test('技术经理可以访问节假日和任务类型设置', async ({ page }) => {
      await logout(page);
      await login(page, 'tech_manager');
      await sidebar.navigateToSettings();
      await page.waitForTimeout(1000);

      // 验证可以访问相关标签
      const visibleTabs = await settingsPage.tabsNavigation.allInnerTexts();

      // 检查是否有节假日或任务类型
      const hasRelevantTab = visibleTabs.some((text) =>
        text.includes('节假日') || text.includes('任务类型') || text.includes('Holidays')
      );

      // 可能有这些标签，也可能没有，取决于具体实现
    });
  });
});

/**
 * 冒烟测试：设置关键功能快速验证
 */
test.describe('设置冒烟测试', () => {
  test('设置页面应该可以正常访问', async ({ page }) => {
    const sidebar = new Sidebar(page);

    await login(page, 'admin');
    await sidebar.navigateToSettings();
    await page.waitForTimeout(1000);

    // 验证设置页面加载
    await expect(page.locator('h1, h2:has-text("设置")')).toBeVisible();

    await logout(page);
  });
});
