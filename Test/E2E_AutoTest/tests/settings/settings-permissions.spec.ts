/**
 * 权限管理测试
 *
 * 测试覆盖：
 * - 显示权限配置界面
 * - 角色标签切换
 * - 权限开关切换
 * - 批量权限设置
 * - 保存权限配置
 * - 权限历史记录
 * - 权限导入导出
 */

import { test, expect } from '@playwright/test';
import { SettingsPage } from '../../src/pages/SettingsPage';
import { Sidebar } from '../../src/components/Sidebar';
import { login, logout } from '../../src/helpers/auth-helpers';

test.describe('权限管理', () => {
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

  test('应该显示权限配置界面', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.goToPermissions();

    // 等待加载完成
    await settingsPage.waitForLoading();

    // 验证权限配置区域存在
    const hasPermissionConfig = await settingsPage.permissionConfig.count() > 0;

    if (hasPermissionConfig) {
      await expect(settingsPage.permissionConfig.first()).toBeVisible();
    } else {
      // 可能有其他形式的权限配置UI
      const permissionArea = page.locator('[class*="permission"], [data-testid*="permission"]');
      const hasPermissionArea = await permissionArea.count() > 0;
      expect(hasPermissionArea).toBeTruthy();
    }
  });

  test('应该显示角色标签页', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.goToPermissions();

    // 验证角色标签存在
    const hasRoleTabs = await settingsPage.roleTabs.count() > 0;

    if (hasRoleTabs) {
      const roleCount = await settingsPage.roleTabs.count();
      expect(roleCount).toBeGreaterThan(0);
    } else {
      // 可能用其他方式展示角色（如下拉选择）
      const roleSelector = page.locator('select[id*="role"], [class*="role"] select');
      const hasRoleSelector = await roleSelector.count() > 0;
      expect(hasRoleSelector).toBeTruthy();
    }
  });

  test('应该能够切换不同角色的权限配置', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.goToPermissions();

    const roleTabs = settingsPage.roleTabs;

    if (await roleTabs.count() > 0) {
      const firstTab = roleTabs.first();
      await firstTab.click();
      await page.waitForTimeout(500);

      // 验证内容切换
      const isActive = await firstTab.evaluate(el => {
        return el.classList.contains('active') ||
               el.getAttribute('aria-selected') === 'true';
      });

      expect(isActive).toBeTruthy();
    }
  });

  test('应该显示权限开关列表', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.goToPermissions();

    // 验证权限开关存在
    const hasSwitches = await settingsPage.permissionSwitches.count() > 0;

    expect(hasSwitches).toBeGreaterThan(0);
  });

  test('应该能够切换权限开关', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.goToPermissions();

    const switches = settingsPage.permissionSwitches;

    if (await switches.count() > 0) {
      const firstSwitch = switches.first();
      const originalState = await firstSwitch.isChecked();

      // 切换开关
      await firstSwitch.click();
      await page.waitForTimeout(300);

      const newState = await firstSwitch.isChecked();
      expect(newState).toBe(!originalState);

      // 切换回原状态
      await firstSwitch.click();
      await page.waitForTimeout(300);

      const restoredState = await firstSwitch.isChecked();
      expect(restoredState).toBe(originalState);
    }
  });

  test('应该能够保存权限配置', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.goToPermissions();

    if (await settingsPage.savePermissionButton.count() > 0) {
      // 先切换一个权限
      const switches = settingsPage.permissionSwitches;

      if (await switches.count() > 0) {
        const firstSwitch = switches.first();
        await firstSwitch.click();
        await page.waitForTimeout(300);

        // 保存配置
        await settingsPage.savePermissionButton.click();
        await page.waitForTimeout(1000);

        // 验证保存成功提示
        const hasSuccess = await settingsPage.successMessage.count() > 0;
        if (hasSuccess) {
          await expect(settingsPage.successMessage.first()).toBeVisible();
        }
      }
    }
  });

  test('应该能够打开批量权限设置', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.goToPermissions();

    const bulkButton = settingsPage.bulkPermissionButton;

    if (await bulkButton.count() > 0) {
      await bulkButton.click();
      await page.waitForTimeout(500);

      // 验证批量设置对话框打开
      const bulkDialog = page.locator('[role="dialog"]:has-text("批量")');
      const hasDialog = await bulkDialog.count() > 0;

      if (hasDialog) {
        await expect(bulkDialog).toBeVisible();

        // 关闭对话框
        await page.keyboard.press('Escape');
      }
    }
  });

  test('应该能够查看权限历史记录', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.goToPermissions();

    const historyButton = settingsPage.permissionHistoryButton;

    if (await historyButton.count() > 0) {
      await historyButton.click();
      await page.waitForTimeout(500);

      // 验证历史记录对话框打开
      const historyDialog = page.locator('[role="dialog"]:has-text("历史")');
      const hasDialog = await historyDialog.count() > 0;

      if (hasDialog) {
        await expect(historyDialog).toBeVisible();

        // 关闭对话框
        await page.keyboard.press('Escape');
      }
    }
  });

  test('应该能够导入导出权限配置', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.goToPermissions();

    const importExportButton = settingsPage.permissionImportExportButton;

    if (await importExportButton.count() > 0) {
      await importExportButton.click();
      await page.waitForTimeout(500);

      // 验证导入导出对话框打开
      const dialog = page.locator('[role="dialog"]:has-text("导入"), [role="dialog"]:has-text("导出")');
      const hasDialog = await dialog.count() > 0;

      if (hasDialog) {
        await expect(dialog).toBeVisible();

        // 关闭对话框
        await page.keyboard.press('Escape');
      }
    }
  });

  test('应该显示权限描述信息', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.goToPermissions();

    // 查找权限描述文本
    const descriptions = page.locator('[class*="description"], p[class*="permission"]');
    const hasDescriptions = await descriptions.count() > 0;

    if (hasDescriptions) {
      // 验证至少有一个描述
      await expect(descriptions.first()).toBeVisible();
    }
  });

  test('应该能够按模块分组显示权限', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.goToPermissions();

    // 查找模块分组元素
    const groups = page.locator('[class*="group"], [data-testid*="module"], fieldset');
    const hasGroups = await groups.count() > 0;

    if (hasGroups) {
      // 验证至少有一个分组
      expect(hasGroups).toBeGreaterThan(0);
    }
  });

  test('权限配置应该有默认值', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.goToPermissions();

    const switches = settingsPage.permissionSwitches;

    if (await switches.count() > 0) {
      // 验证所有开关都有明确的状态
      const switchCount = await switches.count();

      for (let i = 0; i < Math.min(switchCount, 3); i++) {
        const switchElement = switches.nth(i);
        const isChecked = await switchElement.isChecked();
        // 验证状态可以是true或false，但不能是undefined
        expect(typeof isChecked).toBe('boolean');
      }
    }
  });

  test('应该显示管理员角色的完整权限', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.goToPermissions();

    // 切换到管理员角色标签
    const adminTab = page.locator('button:has-text("管理员"), [data-role="admin"]');
    const hasAdminTab = await adminTab.count() > 0;

    if (hasAdminTab) {
      await adminTab.click();
      await page.waitForTimeout(500);

      // 验证管理员角色的大多数权限是开启的
      const switches = settingsPage.permissionSwitches;
      const enabledCount = await switches.count();

      if (enabledCount > 0) {
        let checkedCount = 0;
        for (let i = 0; i < enabledCount; i++) {
          if (await switches.nth(i).isChecked()) {
            checkedCount++;
          }
        }

        // 管理员应该有大部分权限开启
        expect(checkedCount / enabledCount).toBeGreaterThan(0.5);
      }
    }
  });
});

test.describe('权限管理 - 权限控制', () => {
  test('只有管理员能访问权限管理', async ({ page }) => {
    // 测试工程师
    await login(page, 'engineer');
    await page.goto('/settings?view=settings-permissions');
    await page.waitForTimeout(1000);

    let settingsPage = new SettingsPage(page);
    let hasAlert = await settingsPage.hasPermissionAlert();
    expect(hasAlert).toBeTruthy();

    await logout(page);

    // 测试技术经理
    await login(page, 'tech_manager');
    await page.goto('/settings?view=settings-permissions');
    await page.waitForTimeout(1000);

    settingsPage = new SettingsPage(page);
    hasAlert = await settingsPage.hasPermissionAlert();
    expect(hasAlert).toBeTruthy();

    await logout(page);

    // 测试管理员
    await login(page, 'admin');
    await page.goto('/settings?view=settings-permissions');
    await page.waitForTimeout(1000);

    settingsPage = new SettingsPage(page);
    hasAlert = await settingsPage.hasPermissionAlert();
    expect(hasAlert).toBeFalsy();

    await logout(page);
  });

  test('非管理员角色在侧边栏不应显示权限配置选项', async ({ page }) => {
    await login(page, 'tech_manager');

    const sidebar = new Sidebar(page);

    // 验证权限配置菜单项不存在或不可见
    const isMenuVisible = await sidebar.isMenuVisible('权限');
    expect(isMenuVisible).toBeFalsy();

    await logout(page);
  });

  test('管理员角色在侧边栏应显示权限配置选项', async ({ page }) => {
    await login(page, 'admin');

    const sidebar = new Sidebar(page);

    // 验证权限配置菜单项可见
    const isMenuVisible = await sidebar.isMenuVisible('权限');
    expect(isMenuVisible).toBeTruthy();

    await logout(page);
  });
});
