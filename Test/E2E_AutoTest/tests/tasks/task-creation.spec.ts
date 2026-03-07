/**
 * 任务创建测试
 *
 * 测试任务创建的各种场景
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { TaskManagementPage } from '../../src/pages/TaskManagementPage';
import { ProjectListPage } from '../../src/pages/ProjectListPage';
import { ProjectFormPage } from '../../src/pages/ProjectFormPage';
import { getTestUser } from '../../src/data/test-users';
import { generateProjectData, generateTaskData } from '../../src/data/test-projects';
import { generateDateRange } from '../../src/helpers/DataGenerator';

test.describe('任务创建', () => {
  let projectName: string;

  test.beforeEach(async ({ page }) => {
    // 使用部门经理登录（有创建项目和任务的权限）
    const user = getTestUser('dept_manager');
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(user.username, user.password);

    // 创建一个测试项目
    const projectListPage = new ProjectListPage(page);
    const projectFormPage = new ProjectFormPage(page);

    await page.goto('/projects');
    await projectListPage.waitForReady();
    await projectListPage.clickCreateProject();
    await projectFormPage.waitForForm();

    const projectData = generateProjectData({
      name: `任务测试项目_${Date.now()}`,
      type: 'management'
    });
    projectName = projectData.name;

    await projectFormPage.selectType('management');
    await projectFormPage.fillBasicInfo(projectData);
    await projectFormPage.submit();
    await projectFormPage.waitForFormClosed();
    await page.waitForTimeout(2000);
  });

  test('应该能够创建基本任务', async ({ page }) => {
    const taskPage = new TaskManagementPage(page);
    const user = getTestUser('dept_manager');

    // 导航到任务管理
    await page.goto('/tasks');
    await taskPage.waitForReady();

    // 点击创建任务
    await taskPage.clickCreateTask();
    await taskPage.waitForCreateDialog();

    // 填写任务信息
    const taskData = generateTaskData({
      description: 'E2E测试任务_基本创建',
      priority: 'medium'
    });

    await taskPage.selectProject(projectName);
    await taskPage.selectMember(user.name || '部门经理');
    await taskPage.fillDescription(taskData.description);
    await taskPage.selectPriority(taskData.priority || 'medium');

    // 确认创建
    await taskPage.confirmCreate();
    await taskPage.waitForCreateDialogClosed();

    // 等待任务创建
    await page.waitForTimeout(2000);

    // 验证任务创建成功
    const hasTask = await taskPage.hasTask(taskData.description);
    expect(hasTask).toBeTruthy();
  });

  test('应该能够创建带日期的任务', async ({ page }) => {
    const taskPage = new TaskManagementPage(page);
    const user = getTestUser('dept_manager');

    // 导航到任务管理
    await page.goto('/tasks');
    await taskPage.waitForReady();

    // 点击创建任务
    await taskPage.clickCreateTask();
    await taskPage.waitForCreateDialog();

    // 填写任务信息（包含日期）
    const taskData = generateTaskData({
      description: 'E2E测试任务_带日期',
      priority: 'high'
    });

    const dates = generateDateRange(0, 7);

    await taskPage.selectProject(projectName);
    await taskPage.selectMember(user.name || '部门经理');
    await taskPage.fillDescription(taskData.description);
    await taskPage.selectStartDate(dates.startDate);
    await taskPage.selectEndDate(dates.endDate);
    await taskPage.selectPriority(taskData.priority || 'high');

    // 确认创建
    await taskPage.confirmCreate();
    await taskPage.waitForCreateDialogClosed();
  });

  test('任务描述应该必填', async ({ page }) => {
    const taskPage = new TaskManagementPage(page);

    // 导航到任务管理
    await page.goto('/tasks');
    await taskPage.waitForReady();

    // 点击创建任务
    await taskPage.clickCreateTask();
    await taskPage.waitForCreateDialog();

    // 不填写描述直接提交
    await taskPage.confirmCreate();

    // 应该无法提交或显示错误
    await page.waitForTimeout(1000);

    // 对话框应该仍然打开
    const isDialogOpen = await taskPage.createTaskDialog.isVisible();
    expect(isDialogOpen).toBeTruthy();

    // 关闭对话框
    await taskPage.cancelCreate();
  });

  test('应该能够选择项目', async ({ page }) => {
    const taskPage = new TaskManagementPage(page);

    // 导航到任务管理
    await page.goto('/tasks');
    await taskPage.waitForReady();

    // 点击创建任务
    await taskPage.clickCreateTask();
    await taskPage.waitForCreateDialog();

    // 验证项目选择器存在
    await expect(taskPage.projectSelect).toBeVisible();

    // 选择项目
    await taskPage.selectProject(projectName);

    // 验证选择成功（通过检查选择器的值）
    const selectedValue = await taskPage.projectSelect.inputValue();
    expect(selectedValue).toBeTruthy();

    // 关闭对话框
    await taskPage.cancelCreate();
  });

  test('应该能够选择成员', async ({ page }) => {
    const taskPage = new TaskManagementPage(page);

    // 导航到任务管理
    await page.goto('/tasks');
    await taskPage.waitForReady();

    // 点击创建任务
    await taskPage.clickCreateTask();
    await taskPage.waitForCreateDialog();

    // 先选择项目
    await taskPage.selectProject(projectName);

    // 验证成员选择器存在
    await expect(taskPage.memberSelect).toBeVisible();

    // 选择成员
    await taskPage.selectMember('部门经理');

    // 验证选择成功
    const selectedValue = await taskPage.memberSelect.inputValue();
    expect(selectedValue).toBeTruthy();

    // 关闭对话框
    await taskPage.cancelCreate();
  });

  test('应该能够设置任务优先级', async ({ page }) => {
    const taskPage = new TaskManagementPage(page);

    // 导航到任务管理
    await page.goto('/tasks');
    await taskPage.waitForReady();

    // 点击创建任务
    await taskPage.clickCreateTask();
    await taskPage.waitForCreateDialog();

    // 验证优先级选择器存在
    await expect(taskPage.prioritySelect).toBeVisible();

    // 选择不同优先级
    await taskPage.selectPriority('high');
    await page.waitForTimeout(500);

    await taskPage.selectPriority('medium');
    await page.waitForTimeout(500);

    await taskPage.selectPriority('low');
    await page.waitForTimeout(500);

    // 关闭对话框
    await taskPage.cancelCreate();
  });

  test('应该能够取消任务创建', async ({ page }) => {
    const taskPage = new TaskManagementPage(page);

    // 导航到任务管理
    await page.goto('/tasks');
    await taskPage.waitForReady();

    // 点击创建任务
    await taskPage.clickCreateTask();
    await taskPage.waitForCreateDialog();

    // 填写一些信息
    await taskPage.fillDescription('应该被取消的任务');

    // 点击取消
    await taskPage.cancelCreate();
    await taskPage.waitForCreateDialogClosed();

    // 验证任务未创建
    const hasTask = await taskPage.hasTask('应该被取消的任务');
    expect(hasTask).toBeFalsy();
  });

  test('应该能够设置任务日期范围', async ({ page }) => {
    const taskPage = new TaskManagementPage(page);

    // 导航到任务管理
    await page.goto('/tasks');
    await taskPage.waitForReady();

    // 点击创建任务
    await taskPage.clickCreateTask();
    await taskPage.waitForCreateDialog();

    // 验证日期选择器存在
    await expect(taskPage.startDateInput).toBeVisible();
    await expect(taskPage.endDateInput).toBeVisible();

    // 设置日期
    const dates = generateDateRange(1, 14); // 从明天开始，持续14天
    await taskPage.selectStartDate(dates.startDate);
    await taskPage.selectEndDate(dates.endDate);

    // 验证日期已设置
    const startDateValue = await taskPage.startDateInput.inputValue();
    const endDateValue = await taskPage.endDateInput.inputValue();

    expect(startDateValue).toBe(dates.startDate);
    expect(endDateValue).toBe(dates.endDate);

    // 关闭对话框
    await taskPage.cancelCreate();
  });
});

test.describe('任务创建权限', () => {
  test('工程师应该能够创建任务', async ({ page }) => {
    // 使用工程师账号登录
    const user = getTestUser('engineer');
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login(user.username, user.password);

    // 导航到任务管理
    await page.goto('/tasks');
    await page.waitForTimeout(1000);

    // 验证创建任务按钮可见
    const createButton = page.locator('button:has-text("新建任务")');
    await expect(createButton).toBeVisible();
  });

  test('技术经理应该能够创建任务', async ({ page }) => {
    // 使用技术经理账号登录
    const user = getTestUser('tech_manager');
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login(user.username, user.password);

    // 导航到任务管理
    await page.goto('/tasks');
    await page.waitForTimeout(1000);

    // 验证创建任务按钮可见
    const createButton = page.locator('button:has-text("新建任务")');
    await expect(createButton).toBeVisible();
  });

  test('部门经理应该能够创建任务', async ({ page }) => {
    // 使用部门经理账号登录
    const user = getTestUser('dept_manager');
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login(user.username, user.password);

    // 导航到任务管理
    await page.goto('/tasks');
    await page.waitForTimeout(1000);

    // 验证创建任务按钮可见
    const createButton = page.locator('button:has-text("新建任务")');
    await expect(createButton).toBeVisible();
  });
});

test.describe('工程师创建任务限制', () => {
  test('工程师创建任务时负责人应该自动设置为当前用户', async ({ page }) => {
    // 先创建一个项目
    const deptManager = getTestUser('dept_manager');
    const loginPage = new LoginPage(page);
    const projectListPage = new ProjectListPage(page);
    const projectFormPage = new ProjectFormPage(page);

    await loginPage.goto();
    await loginPage.login(deptManager.username, deptManager.password);

    await page.goto('/projects');
    await projectListPage.clickCreateProject();
    await projectFormPage.waitForForm();

    const projectData = generateProjectData({
      name: `工程师任务测试项目_${Date.now()}`,
      type: 'management'
    });

    await projectFormPage.selectType('management');
    await projectFormPage.fillBasicInfo(projectData);
    await projectFormPage.submit();
    await projectFormPage.waitForFormClosed();
    await page.waitForTimeout(2000);

    // 切换到工程师账号
    const engineer = getTestUser('engineer');
    await page.locator('button[aria-expanded]').click();
    await page.locator('button:has-text("退出登录")').click();
    await page.waitForURL('**/');

    await loginPage.login(engineer.username, engineer.password);

    // 导航到任务管理并点击创建
    const taskPage = new TaskManagementPage(page);
    await page.goto('/tasks');
    await taskPage.clickCreateTask();
    await taskPage.waitForCreateDialog();

    // 选择项目
    await taskPage.selectProject(projectData.name);

    // 验证成员选择器被禁用或自动设置为当前用户
    const memberSelect = taskPage.memberSelect;
    const isDisabled = await memberSelect.isDisabled();
    expect(isDisabled).toBeTruthy();

    // 关闭对话框
    await taskPage.cancelCreate();
  });
});
