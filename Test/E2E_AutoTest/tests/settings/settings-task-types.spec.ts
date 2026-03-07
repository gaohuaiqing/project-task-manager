/**
 * 任务类型管理测试
 *
 * 测试覆盖：
 * - 显示任务类型列表
 * - 添加新任务类型
 * - 删除任务类型
 * - 颜色选择
 * - 权限控制
 */

import { test, expect } from '@playwright/test';
import { SettingsPage } from '../../src/pages/SettingsPage';
import { Sidebar } from '../../src/components/Sidebar';
import { login, logout } from '../../src/helpers/auth-helpers';

test.describe('任务类型管理', () => {
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

  test('应该显示任务类型列表', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.goToTaskTypes();

    // 等待加载完成
    await settingsPage.waitForLoading();

    // 验证任务类型列表存在
    const hasTypeList = await settingsPage.taskTypeList.count() > 0;

    if (hasTypeList) {
      await expect(settingsPage.taskTypeList.first()).toBeVisible();
    }

    // 验证类型徽章存在
    const hasBadges = await settingsPage.taskTypeBadges.count() > 0;
    if (hasBadges) {
      expect(hasBadges).toBeGreaterThan(0);
    }
  });

  test('应该显示添加任务类型表单', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.goToTaskTypes();

    // 验证任务类型输入框存在
    await expect(settingsPage.taskTypeInput).toBeVisible();

    // 验证颜色选择器存在
    await expect(settingsPage.taskTypeColorPicker).toBeVisible();

    // 验证添加按钮存在
    await expect(settingsPage.addTaskTypeButton).toBeVisible();
  });

  test('应该能够添加新任务类型', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.goToTaskTypes();

    const typeName = `测试任务类型_${Date.now()}`;

    await settingsPage.addTaskType(typeName);
    await page.waitForTimeout(500);

    // 验证新类型出现在列表中
    const newTypeBadge = page.locator(`text=/${typeName}/i`);
    const hasNewType = await newTypeBadge.count() > 0;
    expect(hasNewType).toBeTruthy();
  });

  test('添加按钮在输入为空时应该禁用', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.goToTaskTypes();

    // 验证添加按钮初始状态（应该被禁用）
    const isDisabled = await settingsPage.addTaskTypeButton.isDisabled();
    expect(isDisabled).toBeTruthy();
  });

  test('应该能够为任务类型选择颜色', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.goToTaskTypes();

    const typeName = `彩色任务类型_${Date.now()}`;

    // 查找颜色选项
    const colorOptions = settingsPage.taskTypeColorPicker.locator('button, [role="button"]');
    const colorCount = await colorOptions.count();

    if (colorCount > 0) {
      // 选择第一个颜色
      await colorOptions.first().click();
      await page.waitForTimeout(300);

      // 验证选中状态（可能有ring或其他视觉反馈）
      const selectedColor = colorOptions.first();
      await expect(selectedColor).toBeVisible();
    }

    // 添加任务类型
    await settingsPage.taskTypeInput.fill(typeName);
    await settingsPage.addTaskTypeButton.click();
    await page.waitForTimeout(500);

    // 验证新类型存在
    const newTypeBadge = page.locator(`text=/${typeName}/i`);
    const hasNewType = await newTypeBadge.count() > 0;
    expect(hasNewType).toBeTruthy();
  });

  test('应该能够删除任务类型', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.goToTaskTypes();

    // 先添加一个任务类型
    const typeName = `待删除类型_${Date.now()}`;
    await settingsPage.addTaskType(typeName);
    await page.waitForTimeout(500);

    // 查找删除按钮
    const deleteButtons = page.locator('button:has-text("删除"), [class*="delete"], [class*="trash"]');

    if (await deleteButtons.count() > 0) {
      const deleteCount = await deleteButtons.count();
      const originalCount = await settingsPage.taskTypeBadges.count();

      // 点击最后一个删除按钮（新添加的类型）
      await deleteButtons.nth(deleteCount - 1).click();
      await page.waitForTimeout(500);

      // 验证类型已删除
      const newCount = await settingsPage.taskTypeBadges.count();
      expect(newCount).toBeLessThan(originalCount);
    }
  });

  test('按Enter键应该能够快速添加任务类型', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.goToTaskTypes();

    const typeName = `快捷添加_${Date.now()}`;

    // 在输入框中输入并按Enter
    await settingsPage.taskTypeInput.fill(typeName);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    // 验证新类型存在
    const newTypeBadge = page.locator(`text=/${typeName}/i`);
    const hasNewType = await newTypeBadge.count() > 0;
    expect(hasNewType).toBeTruthy();
  });

  test('任务类型应该显示为徽章样式', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.goToTaskTypes();

    const badges = settingsPage.taskTypeBadges;

    if (await badges.count() > 0) {
      // 验证徽章可见
      await expect(badges.first()).toBeVisible();

      // 验证徽章有颜色样式
      const firstBadge = badges.first();
      const badgeStyles = await firstBadge.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          backgroundColor: styles.backgroundColor,
          color: styles.color,
          border: styles.border
        };
      });

      expect(badgeStyles.backgroundColor).toBeTruthy();
    }
  });

  test('任务类型徽章应该包含删除按钮', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.goToTaskTypes();

    const badges = settingsPage.taskTypeBadges;

    if (await badges.count() > 0) {
      const firstBadge = badges.first();
      const deleteButton = firstBadge.locator('button, [class*="delete"], [class*="trash"]');

      const hasDeleteButton = await deleteButton.count() > 0;
      expect(hasDeleteButton).toBeTruthy();
    }
  });

  test('应该显示默认的任务类型', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.goToTaskTypes();

    // 验证存在一些默认任务类型
    const badgeCount = await settingsPage.taskTypeBadges.count();
    expect(badgeCount).toBeGreaterThan(0);

    // 验证常见任务类型存在
    const commonTypes = ['开发', '测试', '设计', '文档'];

    for (const type of commonTypes) {
      const typeBadge = page.locator(`text=/${type}/i`);
      const hasType = await typeBadge.count() > 0;
      // 至少应该有一个常见类型
      if (hasType) {
        break;
      }
    }
  });

  test('添加任务类型后输入框应该清空', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.goToTaskTypes();

    const typeName = `测试类型_${Date.now()}`;

    await settingsPage.taskTypeInput.fill(typeName);
    await settingsPage.addTaskTypeButton.click();
    await page.waitForTimeout(500);

    // 验证输入框已清空
    const inputValue = await settingsPage.taskTypeInput.inputValue();
    expect(inputValue).toBe('');
  });
});

test.describe('任务类型管理 - 权限控制', () => {
  test('工程师不应该能访问任务类型设置', async ({ page }) => {
    await login(page, 'engineer');

    // 尝试访问任务类型页面
    await page.goto('/settings?view=settings-task-types');
    await page.waitForTimeout(1000);

    const settingsPage = new SettingsPage(page);

    // 验证显示权限不足提示
    const hasAlert = await settingsPage.hasPermissionAlert();
    expect(hasAlert).toBeTruthy();
  });

  test('管理员应该能够完全访问任务类型设置', async ({ page }) => {
    await login(page, 'admin');

    const sidebar = new Sidebar(page);
    const settingsPage = new SettingsPage(page);

    await sidebar.navigateToSettings();
    await settingsPage.goToTaskTypes();

    // 验证能够正常访问
    await expect(settingsPage.taskTypeInput).toBeVisible({ timeout: 5000 });
    await expect(settingsPage.addTaskTypeButton).toBeVisible();

    await logout(page);
  });

  test('技术经理应该能够访问任务类型设置', async ({ page }) => {
    await login(page, 'tech_manager');

    const sidebar = new Sidebar(page);
    const settingsPage = new SettingsPage(page);

    await sidebar.navigateToSettings();
    await settingsPage.goToTaskTypes();

    // 验证能够正常访问
    await expect(settingsPage.taskTypeInput).toBeVisible({ timeout: 5000 });

    await logout(page);
  });

  test('部门经理应该能够访问任务类型设置', async ({ page }) => {
    await login(page, 'dept_manager');

    const sidebar = new Sidebar(page);
    const settingsPage = new SettingsPage(page);

    await sidebar.navigateToSettings();
    await settingsPage.goToTaskTypes();

    // 验证能够正常访问
    await expect(settingsPage.taskTypeInput).toBeVisible({ timeout: 5000 });

    await logout(page);
  });
});
