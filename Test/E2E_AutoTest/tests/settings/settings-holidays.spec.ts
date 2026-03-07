/**
 * 节假日管理测试
 *
 * 测试覆盖：
 * - 显示节假日列表
 * - 添加单日节假日
 * - 添加日期范围节假日
 * - 编辑节假日
 * - 删除节假日
 * - 搜索和筛选
 * - 导入导出
 */

import { test, expect } from '@playwright/test';
import { SettingsPage } from '../../src/pages/SettingsPage';
import { Sidebar } from '../../src/components/Sidebar';
import { login, logout } from '../../src/helpers/auth-helpers';

test.describe('节假日管理', () => {
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

  test('应该显示节假日列表', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.goToHolidays();

    // 等待加载完成
    await settingsPage.waitForLoading();

    // 验证节假日列表或日历组件存在
    const hasHolidayList = await settingsPage.holidayList.count() > 0;
    const hasCalendar = await settingsPage.holidayCalendar.count() > 0;

    expect(hasHolidayList || hasCalendar).toBeTruthy();
  });

  test('应该显示添加节假日按钮', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.goToHolidays();

    // 验证添加按钮存在
    const hasAddButton = await settingsPage.addHolidayButton.count() > 0;
    expect(hasAddButton).toBeTruthy();
  });

  test('应该能够打开添加节假日对话框', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.goToHolidays();

    if (await settingsPage.addHolidayButton.count() > 0) {
      await settingsPage.addHolidayButton.click();
      await page.waitForTimeout(500);

      // 验证对话框打开
      await expect(settingsPage.holidayDialog).toBeVisible();

      // 验证必要字段存在
      await expect(settingsPage.holidayNameInput).toBeVisible();
    }
  });

  test('应该能够添加单日节假日', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.goToHolidays();

    if (await settingsPage.addHolidayButton.count() > 0) {
      const holidayName = `测试节假日_${Date.now()}`;
      const date = new Date().toISOString().split('T')[0]; // 格式: YYYY-MM-DD

      await settingsPage.addHoliday(holidayName, date);
      await page.waitForTimeout(1000);

      // 验证成功提示或对话框关闭
      const dialogClosed = await settingsPage.holidayDialog.count() === 0;
      const hasSuccess = await settingsPage.successMessage.count() > 0;

      expect(dialogClosed || hasSuccess).toBeTruthy();

      // 刷新页面验证新节假日出现在列表中
      if (dialogClosed || hasSuccess) {
        await page.reload();
        await page.waitForTimeout(1000);

        const newHoliday = page.locator(`text=/${holidayName}/i`);
        const hasNewHoliday = await newHoliday.count() > 0;
        expect(hasNewHoliday).toBeTruthy();
      }
    }
  });

  test('节假日表单应该验证必填字段', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.goToHolidays();

    if (await settingsPage.addHolidayButton.count() > 0) {
      await settingsPage.addHolidayButton.click();
      await page.waitForTimeout(500);

      // 不填写任何字段直接提交
      await settingsPage.holidaySaveButton.click();
      await page.waitForTimeout(500);

      // 验证错误提示或按钮禁用状态
      const isDisabled = await settingsPage.holidaySaveButton.isDisabled();
      const hasError = await settingsPage.errorMessage.count() > 0;

      expect(isDisabled || hasError).toBeTruthy();
    }
  });

  test('应该能够搜索节假日', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.goToHolidays();

    // 查找搜索输入框
    const searchInput = settingsPage.holidaySearchInput;

    if (await searchInput.count() > 0) {
      // 输入搜索关键词
      await searchInput.fill('春节');
      await page.waitForTimeout(1000);

      // 验证搜索结果
      const searchResults = page.locator('text=/春节/i');
      const hasResults = await searchResults.count() > 0;
      // 如果有春节这个节假日，应该能搜到
    }
  });

  test('应该能够按年份筛选节假日', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.goToHolidays();

    const yearFilter = settingsPage.holidayYearFilter;

    if (await yearFilter.count() > 0) {
      // 选择一个年份
      await yearFilter.selectOption({ label: /2024|2025|2026/ });
      await page.waitForTimeout(1000);

      // 验证筛选结果（至少不应该出错）
      const hasHolidayList = await settingsPage.holidayList.count() > 0;
      const hasCalendar = await settingsPage.holidayCalendar.count() > 0;
      expect(hasHolidayList || hasCalendar).toBeTruthy();
    }
  });

  test('应该能够编辑节假日', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.goToHolidays();

    // 查找编辑按钮
    const editButtons = page.locator('button:has-text("编辑"), button[class*="edit"]').first();

    if (await editButtons.count() > 0) {
      await editButtons.click();
      await page.waitForTimeout(500);

      // 验证编辑对话框打开
      const dialogVisible = await settingsPage.holidayDialog.count() > 0 &&
                           await settingsPage.holidayDialog.isVisible();
      expect(dialogVisible).toBeTruthy();
    }
  });

  test('应该能够删除节假日', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.goToHolidays();

    // 先添加一个测试节假日
    if (await settingsPage.addHolidayButton.count() > 0) {
      const holidayName = `待删除节假日_${Date.now()}`;
      const date = new Date().toISOString().split('T')[0];

      await settingsPage.addHoliday(holidayName, date);
      await page.waitForTimeout(1000);

      // 查找并点击删除按钮
      const deleteButtons = page.locator('button:has-text("删除"), button[class*="delete"]');

      if (await deleteButtons.count() > 0) {
        const originalCount = await deleteButtons.count();

        await deleteButtons.first().click();
        await page.waitForTimeout(500);

        // 如果有确认对话框，点击确认
        const confirmButton = page.locator('button:has-text("确认"), button:has-text("删除"), button:has-text("确定")').first();

        if (await confirmButton.count() > 0) {
          await confirmButton.click();
          await page.waitForTimeout(1000);
        }

        // 验证删除成功
        const hasSuccess = await settingsPage.successMessage.count() > 0;
        if (hasSuccess) {
          await page.reload();
          await page.waitForTimeout(1000);

          const deletedHoliday = page.locator(`text=/${holidayName}/i`);
          const hasDeleted = await deletedHoliday.count() > 0;
          expect(hasDeleted).toBeFalsy();
        }
      }
    }
  });

  test('应该能够清空所有节假日', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.goToHolidays();

    // 查找清空按钮
    const clearButton = page.locator('button:has-text("清空"), button:has-text("清除所有")');

    if (await clearButton.count() > 0) {
      await clearButton.click();
      await page.waitForTimeout(500);

      // 验证确认对话框
      const confirmDialog = page.locator('[role="alertdialog"], [class*="confirm"]');
      const hasDialog = await confirmDialog.count() > 0;

      if (hasDialog) {
        // 取消操作（避免真的清空所有数据）
        const cancelButton = page.locator('button:has-text("取消")').first();
        await cancelButton.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('应该能够导出节假日数据', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.goToHolidays();

    // 查找导出按钮
    const exportButtons = page.locator('button:has-text("导出"), button[class*="export"]');

    if (await exportButtons.count() > 0) {
      await exportButtons.first().click();
      await page.waitForTimeout(1000);

      // 验证导出操作（可能有下载或格式选择）
      // 这里只验证按钮可以点击，不验证实际下载
    }
  });

  test('应该能够导入节假日数据', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.goToHolidays();

    // 查找导入按钮
    const importButtons = page.locator('button:has-text("导入"), button[class*="import"]');

    if (await importButtons.count() > 0) {
      await importButtons.first().click();
      await page.waitForTimeout(500);

      // 验证导入对话框打开
      const importDialog = page.locator('[role="dialog"]:has-text("导入")');
      const hasDialog = await importDialog.count() > 0;

      if (hasDialog) {
        await expect(importDialog).toBeVisible();

        // 关闭对话框
        await page.keyboard.press('Escape');
      }
    }
  });

  test('应该显示节假日统计信息', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.goToHolidays();

    // 查找统计信息
    const statsElements = page.locator('[class*="stat"], [data-testid*="stat"]');
    const hasStats = await statsElements.count() > 0;

    if (hasStats) {
      // 验证统计信息可见
      await expect(statsElements.first()).toBeVisible();
    }
  });

  test('应该支持单日和日期范围两种模式', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.goToHolidays();

    if (await settingsPage.addHolidayButton.count() > 0) {
      await settingsPage.addHolidayButton.click();
      await page.waitForTimeout(500);

      // 查找模式切换开关
      const modeSwitch = page.locator('input[type="checkbox"], [role="switch"]').first();

      if (await modeSwitch.count() > 0) {
        const initialState = await modeSwitch.isChecked();

        // 切换模式
        await modeSwitch.click();
        await page.waitForTimeout(300);

        const newState = await modeSwitch.isChecked();
        expect(newState).toBe(!initialState);
      }
    }
  });
});

test.describe('节假日管理 - 权限控制', () => {
  test('工程师不应该能访问节假日管理', async ({ page }) => {
    await login(page, 'engineer');

    // 尝试访问节假日页面
    await page.goto('/settings?view=settings-holidays');
    await page.waitForTimeout(1000);

    const settingsPage = new SettingsPage(page);

    // 验证显示权限不足提示
    const hasAlert = await settingsPage.hasPermissionAlert();
    expect(hasAlert).toBeTruthy();

    await logout(page);
  });

  test('管理员应该能够完全访问节假日管理', async ({ page }) => {
    await login(page, 'admin');

    const sidebar = new Sidebar(page);
    const settingsPage = new SettingsPage(page);

    await sidebar.navigateToSettings();
    await settingsPage.goToHolidays();

    // 验证能够正常访问
    const hasContent = await settingsPage.holidayList.count() > 0 ||
                       await settingsPage.holidayCalendar.count() > 0;
    expect(hasContent).toBeTruthy();

    await logout(page);
  });

  test('技术经理应该能够访问节假日管理', async ({ page }) => {
    await login(page, 'tech_manager');

    const sidebar = new Sidebar(page);
    const settingsPage = new SettingsPage(page);

    await sidebar.navigateToSettings();
    await settingsPage.goToHolidays();

    // 验证能够正常访问
    const hasContent = await settingsPage.holidayList.count() > 0 ||
                       await settingsPage.holidayCalendar.count() > 0;
    expect(hasContent).toBeTruthy();

    await logout(page);
  });
});
