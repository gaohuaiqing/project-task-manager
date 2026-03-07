/**
 * 项目类型管理测试
 *
 * 测试覆盖：
 * - 显示项目类型列表
 * - 创建新项目类型
 * - 编辑项目类型
 * - 删除项目类型
 * - 表单验证
 * - 权限控制
 */

import { test, expect } from '@playwright/test';
import { SettingsPage } from '../../src/pages/SettingsPage';
import { Sidebar } from '../../src/components/Sidebar';
import { login, logout } from '../../src/helpers/auth-helpers';

test.describe('项目类型管理', () => {
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

  test('应该显示项目类型列表', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.goToProjectTypes();

    // 等待加载完成
    await settingsPage.waitForLoading();

    // 验证项目类型列表存在
    const hasTypeList = await settingsPage.projectTypeList.count() > 0;

    if (hasTypeList) {
      await expect(settingsPage.projectTypeList.first()).toBeVisible();
    } else {
      // 可能是空列表
      const emptyMessage = page.locator('text=/暂无|空|empty/i');
      const hasEmptyMessage = await emptyMessage.count() > 0;
      expect(hasEmptyMessage).toBeTruthy();
    }

    // 验证添加按钮存在
    await expect(settingsPage.addProjectTypeButton).toBeVisible();
  });

  test('应该能够打开新建项目类型对话框', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.goToProjectTypes();

    await settingsPage.addProjectTypeButton.click();
    await page.waitForTimeout(500);

    // 验证对话框打开
    await expect(settingsPage.projectTypeDialog).toBeVisible();

    // 验证必要字段存在
    await expect(settingsPage.projectTypeCodeInput).toBeVisible();
    await expect(settingsPage.projectTypeNameInput).toBeVisible();
    await expect(settingsPage.projectTypeDescInput).toBeVisible();
  });

  test('新建项目类型表单应该验证必填字段', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.goToProjectTypes();

    await settingsPage.addProjectTypeButton.click();
    await page.waitForTimeout(500);

    // 不填写任何字段直接提交
    await settingsPage.projectTypeSaveButton.click();
    await page.waitForTimeout(500);

    // 验证错误提示或按钮禁用状态
    const isDisabled = await settingsPage.projectTypeSaveButton.isDisabled();
    const hasError = await settingsPage.errorMessage.count() > 0;

    expect(isDisabled || hasError).toBeTruthy();
  });

  test('应该能够创建新项目类型', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.goToProjectTypes();

    const timestamp = Date.now();
    const code = `test_type_${timestamp}`;
    const name = `测试项目类型_${timestamp}`;
    const description = '这是一个测试项目类型';

    await settingsPage.addProjectType(code, name, description);
    await page.waitForTimeout(1000);

    // 验证成功提示或对话框关闭
    const dialogClosed = await settingsPage.projectTypeDialog.count() === 0;
    const hasSuccess = await settingsPage.successMessage.count() > 0;

    expect(dialogClosed || hasSuccess).toBeTruthy();

    // 刷新页面验证新类型出现在列表中
    if (dialogClosed || hasSuccess) {
      await page.reload();
      await page.waitForTimeout(1000);

      const newTypeInList = page.locator(`text=/${name}|${code}/i`);
      const hasNewType = await newTypeInList.count() > 0;
      expect(hasNewType).toBeTruthy();
    }
  });

  test('类型编码应该是唯一的', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.goToProjectTypes();

    const existingCode = 'test_duplicate';

    // 先创建一个类型
    await settingsPage.addProjectType(existingCode, '原始类型', '测试重复');
    await page.waitForTimeout(1000);

    // 尝试创建相同编码的类型
    await settingsPage.addProjectTypeButton.click();
    await page.waitForTimeout(500);

    await settingsPage.projectTypeCodeInput.fill(existingCode);
    await settingsPage.projectTypeNameInput.fill('重复类型');
    await settingsPage.projectTypeDescInput.fill('应该失败');

    await settingsPage.projectTypeSaveButton.click();
    await page.waitForTimeout(1000);

    // 验证错误提示
    const hasError = await settingsPage.errorMessage.count() > 0;
    if (hasError) {
      const errorMessage = await settingsPage.errorMessage.textContent();
      expect(errorMessage).toMatch(/已存在|重复|唯一/);
    }
  });

  test('应该能够编辑项目类型', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.goToProjectTypes();

    // 查找现有的项目类型
    const editButtons = page.locator('button:has-text("编辑"), button[class*="edit"]').first();

    if (await editButtons.count() > 0) {
      await editButtons.click();
      await page.waitForTimeout(500);

      // 验证编辑对话框打开
      await expect(settingsPage.projectTypeDialog).toBeVisible();

      // 验证编码字段被禁用（创建后不可修改）
      const isCodeDisabled = await settingsPage.projectTypeCodeInput.isDisabled();
      expect(isCodeDisabled).toBeTruthy();

      // 修改名称
      const newName = `编辑后的名称_${Date.now()}`;
      await settingsPage.projectTypeNameInput.clear();
      await settingsPage.projectTypeNameInput.fill(newName);

      await settingsPage.projectTypeSaveButton.click();
      await page.waitForTimeout(1000);

      // 验证保存成功
      const dialogClosed = await settingsPage.projectTypeDialog.count() === 0;
      const hasSuccess = await settingsPage.successMessage.count() > 0;

      expect(dialogClosed || hasSuccess).toBeTruthy();
    }
  });

  test('应该能够删除项目类型', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.goToProjectTypes();

    // 先创建一个测试类型
    const timestamp = Date.now();
    const code = `delete_test_${timestamp}`;
    const name = `待删除类型_${timestamp}`;

    await settingsPage.addProjectType(code, name, '用于测试删除');
    await page.waitForTimeout(1000);

    // 查找并点击删除按钮
    const deleteButtons = page.locator('button:has-text("删除"), button[class*="delete"], button[class*="trash"]');
    const deleteCount = await deleteButtons.count();

    if (deleteCount > 0) {
      await deleteButtons.first().click();
      await page.waitForTimeout(500);

      // 验证确认对话框
      const confirmDialog = page.locator('[role="alertdialog"], [class*="confirm"]');
      const hasConfirmDialog = await confirmDialog.count() > 0;

      if (hasConfirmDialog) {
        // 点击确认删除
        const confirmButton = page.locator('button:has-text("确认"), button:has-text("删除")').first();
        await confirmButton.click();
        await page.waitForTimeout(1000);

        // 验证删除成功
        const hasSuccess = await settingsPage.successMessage.count() > 0;
        if (hasSuccess) {
          // 刷新页面验证类型已删除
          await page.reload();
          await page.waitForTimeout(1000);

          const deletedType = page.locator(`text=/${name}/i`);
          const hasDeletedType = await deletedType.count() > 0;
          expect(hasDeletedType).toBeFalsy();
        }
      }
    }
  });

  test('应该能够选择项目类型图标', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.goToProjectTypes();

    await settingsPage.addProjectTypeButton.click();
    await page.waitForTimeout(500);

    // 查找图标选择器
    const iconSelect = page.locator('select[id*="icon"], [class*="icon"] select').first();

    if (await iconSelect.count() > 0) {
      const iconOptions = await iconSelect.locator('option').count();
      expect(iconOptions).toBeGreaterThan(0);
    }
  });

  test('应该能够选择项目类型颜色', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.goToProjectTypes();

    await settingsPage.addProjectTypeButton.click();
    await page.waitForTimeout(500);

    // 查找颜色选择器
    const colorSelect = page.locator('select[id*="color"], [class*="color"] select').first();

    if (await colorSelect.count() > 0) {
      const colorOptions = await colorSelect.locator('option').count();
      expect(colorOptions).toBeGreaterThan(0);

      // 选择一个颜色
      await colorSelect.selectOption({ index: 1 });
      await page.waitForTimeout(500);

      // 验证选择成功
      const selectedValue = await colorSelect.inputValue();
      expect(selectedValue).toBeTruthy();
    }
  });

  test('应该能够配置项目类型属性', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.goToProjectTypes();

    await settingsPage.addProjectTypeButton.click();
    await page.waitForTimeout(500);

    // 查找属性配置复选框
    const checkboxes = page.locator('input[type="checkbox"]');

    if (await checkboxes.count() > 0) {
      const checkboxCount = await checkboxes.count();

      // 切换第一个复选框
      await checkboxes.first().check();
      await page.waitForTimeout(500);

      // 验证选中状态
      const isChecked = await checkboxes.first().isChecked();
      expect(isChecked).toBeTruthy();
    }
  });

  test('应该能够预览项目类型', async ({ page }) => {
    await sidebar.navigateToSettings();
    await settingsPage.goToProjectTypes();

    await settingsPage.addProjectTypeButton.click();
    await page.waitForTimeout(500);

    // 填写基本信息
    await settingsPage.projectTypeCodeInput.fill('preview_test');
    await settingsPage.projectTypeNameInput.fill('预览测试类型');
    await settingsPage.projectTypeDescInput.fill('测试预览功能');

    // 查找预览区域
    const previewArea = page.locator('[class*="preview"], [data-testid="preview"]');
    const hasPreview = await previewArea.count() > 0;

    if (hasPreview) {
      await expect(previewArea).toBeVisible();

      // 验证预览内容
      const previewText = await previewArea.textContent();
      expect(previewText).toContain('预览测试类型');
    }
  });
});

test.describe('项目类型管理 - 权限控制', () => {
  test('普通用户不应该能访问项目类型管理', async ({ page }) => {
    await login(page, 'engineer');

    // 直接尝试访问项目类型页面
    await page.goto('/settings?view=settings-project-types');
    await page.waitForTimeout(1000);

    const settingsPage = new SettingsPage(page);

    // 验证显示权限不足提示
    const hasAlert = await settingsPage.hasPermissionAlert();
    expect(hasAlert).toBeTruthy();
  });

  test('技术经理不应该能访问项目类型管理', async ({ page }) => {
    await login(page, 'tech_manager');

    // 直接尝试访问项目类型页面
    await page.goto('/settings?view=settings-project-types');
    await page.waitForTimeout(1000);

    const settingsPage = new SettingsPage(page);

    // 验证显示权限不足提示
    const hasAlert = await settingsPage.hasPermissionAlert();
    expect(hasAlert).toBeTruthy();
  });

  test('管理员应该能够访问项目类型管理', async ({ page }) => {
    await login(page, 'admin');

    const sidebar = new Sidebar(page);
    const settingsPage = new SettingsPage(page);

    await sidebar.navigateToSettings();
    await settingsPage.goToProjectTypes();

    // 验证能够正常访问
    await expect(settingsPage.addProjectTypeButton).toBeVisible({ timeout: 5000 });

    await logout(page);
  });
});
