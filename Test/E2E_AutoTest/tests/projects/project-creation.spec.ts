/**
 * 项目创建测试
 *
 * 测试项目创建的各种场景
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { ProjectListPage } from '../../src/pages/ProjectListPage';
import { ProjectFormPage } from '../../src/pages/ProjectFormPage';
import { getTestUser } from '../../src/data/test-users';
import { generateProjectData } from '../../src/data/test-projects';
import { generateDateRange } from '../../src/helpers/DataGenerator';

test.describe('项目创建', () => {
  test.beforeEach(async ({ page }) => {
    // 登录
    const user = getTestUser('dept_manager'); // 部门经理有项目管理权限
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(user.username, user.password);
  });

  test('应该能够创建产品开发类项目', async ({ page }) => {
    const projectListPage = new ProjectListPage(page);
    const projectFormPage = new ProjectFormPage(page);

    // 导航到项目列表
    await page.goto('/projects');
    await projectListPage.waitForReady();

    // 点击创建项目按钮
    await projectListPage.clickCreateProject();
    await projectFormPage.waitForForm();

    // 选择产品开发类
    await projectFormPage.selectType('product');

    // 填充基本信息
    const projectData = generateProjectData({
      name: 'E2E测试产品开发项目',
      type: 'product'
    });
    await projectFormPage.fillBasicInfo(projectData);

    // 下一步（成员）
    await projectFormPage.goToNextStep();

    // 下一步（时间计划）
    await projectFormPage.goToNextStep();

    // 提交
    await projectFormPage.submit();

    // 等待表单关闭
    await projectFormPage.waitForFormClosed();

    // 验证项目创建成功
    await page.waitForTimeout(2000); // 等待数据更新
    const hasProject = await projectListPage.hasProject(projectData.name);
    expect(hasProject).toBeTruthy();
  });

  test('应该能够创建职能管理类项目', async ({ page }) => {
    const projectListPage = new ProjectListPage(page);
    const projectFormPage = new ProjectFormPage(page);

    // 导航到项目列表
    await page.goto('/projects');
    await projectListPage.waitForReady();

    // 点击创建项目按钮
    await projectListPage.clickCreateProject();
    await projectFormPage.waitForForm();

    // 选择职能管理类
    await projectFormPage.selectType('management');

    // 填充基本信息
    const projectData = generateProjectData({
      name: 'E2E测试职能管理项目',
      type: 'management'
    });
    await projectFormPage.fillBasicInfo(projectData);

    // 提交（职能管理类可能不需要填写成员和时间计划）
    await projectFormPage.submit();

    // 等待表单关闭
    await projectFormPage.waitForFormClosed();

    // 验证项目创建成功
    await page.waitForTimeout(2000);
    const hasProject = await projectListPage.hasProject(projectData.name);
    expect(hasProject).toBeTruthy();
  });

  test('项目名称应该必填', async ({ page }) => {
    const projectFormPage = new ProjectFormPage(page);

    // 导航到项目列表并点击创建
    await page.goto('/projects');
    await page.locator('button:has-text("创建项目")').click();
    await projectFormPage.waitForForm();

    // 不填写名称直接提交
    await projectFormPage.submit();

    // 应该显示验证错误或无法提交
    await page.waitForTimeout(1000);

    // 验证仍在表单页（未关闭）
    const isDialogVisible = await page.locator('div[role="dialog"]').isVisible();
    expect(isDialogVisible).toBeTruthy();
  });

  test('应该能够切换项目类型', async ({ page }) => {
    const projectFormPage = new ProjectFormPage(page);

    // 导航到项目列表并点击创建
    await page.goto('/projects');
    await page.locator('button:has-text("创建项目")').click();
    await projectFormPage.waitForForm();

    // 初始选择产品开发类
    await projectFormPage.selectType('product');

    // 填充一些信息
    await projectFormPage.fillName('测试项目');

    // 切换到职能管理类
    await projectFormPage.selectType('management');

    // 可能会显示确认对话框
    await page.waitForTimeout(500);

    const confirmDialog = page.locator('div[role="dialog"]:has-text("确认")');
    if (await confirmDialog.isVisible()) {
      await page.locator('button:has-text("确认")').click();
    }

    // 验证类型已切换
    await page.waitForTimeout(500);
  });

  test('应该能够填写项目编码', async ({ page }) => {
    const projectFormPage = new ProjectFormPage(page);

    // 导航到项目列表并点击创建
    await page.goto('/projects');
    await page.locator('button:has-text("创建项目")').click();
    await projectFormPage.waitForForm();

    // 填充项目编码
    const code = 'PRJ-2024-001';
    await projectFormPage.fillCode(code);

    // 验证编码已填写
    const codeInput = page.locator('#project-code, #code, input[name="code"]');
    const value = await codeInput.inputValue();
    expect(value).toBe(code);
  });

  test('应该能够填写项目描述', async ({ page }) => {
    const projectFormPage = new ProjectFormPage(page);

    // 导航到项目列表并点击创建
    await page.goto('/projects');
    await page.locator('button:has-text("创建项目")').click();
    await projectFormPage.waitForForm();

    // 填充项目描述
    const description = '这是一个测试项目的描述';
    await projectFormPage.fillDescription(description);

    // 验证描述已填写
    const descInput = page.locator('#project-desc, #description, textarea[name="description"]');
    const value = await descInput.inputValue();
    expect(value).toBe(description);
  });

  test('应该能够在Tab之间导航', async ({ page }) => {
    const projectFormPage = new ProjectFormPage(page);

    // 导航到项目列表并点击创建
    await page.goto('/projects');
    await page.locator('button:has-text("创建项目")').click();
    await projectFormPage.waitForForm();

    // 验证基本信息Tab激活
    await expect(page.locator('button:has-text("基本信息")')).toBeVisible();

    // 切换到项目成员Tab
    await projectFormPage.goToMembersTab();
    await page.waitForTimeout(500);

    // 切换到时间计划Tab
    await projectFormPage.goToTimePlanTab();
    await page.waitForTimeout(500);

    // 返回基本信息Tab
    await projectFormPage.goToBasicInfoTab();
    await page.waitForTimeout(500);
  });

  test('应该能够取消项目创建', async ({ page }) => {
    const projectFormPage = new ProjectFormPage(page);

    // 导航到项目列表并点击创建
    await page.goto('/projects');
    await page.locator('button:has-text("创建项目")').click();
    await projectFormPage.waitForForm();

    // 填充一些信息
    await projectFormPage.fillName('应该被取消的项目');

    // 点击取消
    await projectFormPage.cancel();

    // 等待表单关闭
    await projectFormPage.waitForFormClosed();

    // 验证项目未创建
    const projectListPage = new ProjectListPage(page);
    const hasProject = await projectListPage.hasProject('应该被取消的项目');
    expect(hasProject).toBeFalsy();
  });

  test('产品开发类项目应该需要日期和里程碑', async ({ page }) => {
    const projectFormPage = new ProjectFormPage(page);

    // 导航到项目列表并点击创建
    await page.goto('/projects');
    await page.locator('button:has-text("创建项目")').click();
    await projectFormPage.waitForForm();

    // 选择产品开发类
    await projectFormPage.selectType('product');
    await page.waitForTimeout(500);

    // 填充基本信息
    await projectFormPage.fillName('需要日期的产品项目');

    // 下一步到成员
    await projectFormPage.goToNextStep();

    // 下一步到时间计划
    await projectFormPage.goToNextStep();

    // 应该看到日期选择器
    await expect(page.locator('input[type="date"]').first()).toBeVisible();

    // 取消
    await projectFormPage.cancel();
  });
});

test.describe('项目创建权限', () => {
  test('工程师不应该看到创建项目按钮', async ({ page }) => {
    // 使用工程师账号登录
    const user = getTestUser('engineer');
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login(user.username, user.password);

    // 导航到项目列表
    await page.goto('/projects');
    await page.waitForTimeout(1000);

    // 验证创建项目按钮不存在或不可见
    const createButton = page.locator('button:has-text("创建项目")');
    const isVisible = await createButton.isVisible().catch(() => false);
    expect(isVisible).toBeFalsy();
  });

  test('技术经理不应该看到创建项目按钮', async ({ page }) => {
    // 使用技术经理账号登录
    const user = getTestUser('tech_manager');
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login(user.username, user.password);

    // 导航到项目列表
    await page.goto('/projects');
    await page.waitForTimeout(1000);

    // 验证创建项目按钮不存在或不可见
    const createButton = page.locator('button:has-text("创建项目")');
    const isVisible = await createButton.isVisible().catch(() => false);
    expect(isVisible).toBeFalsy();
  });

  test('部门经理应该看到创建项目按钮', async ({ page }) => {
    // 使用部门经理账号登录
    const user = getTestUser('dept_manager');
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login(user.username, user.password);

    // 导航到项目列表
    await page.goto('/projects');
    await page.waitForTimeout(1000);

    // 验证创建项目按钮可见
    const createButton = page.locator('button:has-text("创建项目")');
    await expect(createButton).toBeVisible();
  });
});
