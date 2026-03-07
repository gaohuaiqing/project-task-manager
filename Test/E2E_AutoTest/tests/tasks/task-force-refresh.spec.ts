/**
 * 强行刷新任务计划测试
 *
 * 测试技术经理及以上角色强行刷新任务计划的功能
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { TaskManagementPage } from '../../src/pages/TaskManagementPage';
import { ProjectListPage } from '../../src/pages/ProjectListPage';
import { ProjectFormPage } from '../../src/pages/ProjectFormPage';
import { getTestUser } from '../../src/data/test-users';
import { generateProjectData } from '../../src/data/test-projects';

test.describe('强行刷新任务计划', () => {
  let projectName: string;
  let taskDescription: string;

  test.beforeEach(async ({ page }) => {
    const user = getTestUser('dept_manager');
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(user.username, user.password);

    // 创建测试项目
    const projectListPage = new ProjectListPage(page);
    const projectFormPage = new ProjectFormPage(page);

    await page.goto('/projects');
    await projectListPage.clickCreateProject();
    await projectFormPage.waitForForm();

    const projectData = generateProjectData({
      name: `强行刷新测试项目_${Date.now()}`,
      type: 'management'
    });
    projectName = projectData.name;

    await projectFormPage.selectType('management');
    await projectFormPage.fillBasicInfo(projectData);
    await projectFormPage.submit();
    await projectFormPage.waitForFormClosed();
    await page.waitForTimeout(2000);

    // 创建测试任务
    const taskPage = new TaskManagementPage(page);
    await page.goto('/tasks');
    await taskPage.clickCreateTask();
    await taskPage.waitForCreateDialog();

    taskDescription = `强行刷新测试任务_${Date.now()}`;
    await taskPage.selectProject(projectName);
    await taskPage.selectMember(user.name || '部门经理');
    await taskPage.fillDescription(taskDescription);
    await taskPage.selectPriority('medium');
    await taskPage.confirmCreate();
    await taskPage.waitForCreateDialogClosed();
    await page.waitForTimeout(1000);
  });

  test('技术经理应该能够看到强行刷新按钮', async ({ page }) => {
    const techManager = getTestUser('tech_manager');
    const loginPage = new LoginPage(page);
    const taskPage = new TaskManagementPage(page);

    // 切换到技术经理
    await page.locator('button[aria-expanded]').click();
    await page.locator('button:has-text("退出登录")').click();
    await page.waitForURL('**/');

    await loginPage.login(techManager.username, techManager.password);

    // 打开编辑对话框
    await page.goto('/tasks');
    await taskPage.clickEditTask(taskDescription);

    // 验证强行刷新按钮存在
    const hasForceRefreshButton = await taskPage.forceRefreshButton.isVisible();
    expect(hasForceRefreshButton).toBeTruthy();

    // 关闭对话框
    const cancelButton = taskPage.editTaskDialog.locator('button:has-text("取消")');
    await cancelButton.click();
    await page.waitForTimeout(500);
  });

  test('管理员应该能够看到强行刷新按钮', async ({ page }) => {
    const admin = getTestUser('admin');
    const loginPage = new LoginPage(page);
    const taskPage = new TaskManagementPage(page);

    // 切换到管理员
    await page.locator('button[aria-expanded]').click();
    await page.locator('button:has-text("退出登录")').click();
    await page.waitForURL('**/');

    await loginPage.login(admin.username, admin.password);

    // 打开编辑对话框
    await page.goto('/tasks');
    await taskPage.clickEditTask(taskDescription);

    // 验证强行刷新按钮存在
    const hasForceRefreshButton = await taskPage.forceRefreshButton.isVisible();
    expect(hasForceRefreshButton).toBeTruthy();

    // 关闭对话框
    const cancelButton = taskPage.editTaskDialog.locator('button:has-text("取消")');
    await cancelButton.click();
    await page.waitForTimeout(500);
  });

  test('工程师不应该看到强行刷新按钮', async ({ page }) => {
    const engineer = getTestUser('engineer');
    const loginPage = new LoginPage(page);
    const taskPage = new TaskManagementPage(page);

    // 切换到工程师
    await page.locator('button[aria-expanded]').click();
    await page.locator('button:has-text("退出登录")').click();
    await page.waitForURL('**/');

    await loginPage.login(engineer.username, engineer.password);

    // 打开编辑对话框（如果工程师能看到该任务）
    await page.goto('/tasks');

    const canEdit = await taskPage.hasTask(taskDescription);

    if (canEdit) {
      await taskPage.clickEditTask(taskDescription);

      // 验证强行刷新按钮不存在
      const hasForceRefreshButton = await taskPage.forceRefreshButton.isVisible();
      expect(hasForceRefreshButton).toBeFalsy();

      // 关闭对话框
      const cancelButton = taskPage.editTaskDialog.locator('button:has-text("取消")');
      await cancelButton.click();
      await page.waitForTimeout(500);
    } else {
      // 工程师看不到任务，测试通过
      expect(canEdit).toBeFalsy();
    }
  });

  test('强行刷新应该打开专用对话框', async ({ page }) => {
    const techManager = getTestUser('tech_manager');
    const loginPage = new LoginPage(page);
    const taskPage = new TaskManagementPage(page);

    // 切换到技术经理
    await page.locator('button[aria-expanded]').click();
    await page.locator('button:has-text("退出登录")').click();
    await page.waitForURL('**/');

    await loginPage.login(techManager.username, techManager.password);

    // 打开编辑对话框
    await page.goto('/tasks');
    await taskPage.clickEditTask(taskDescription);

    // 点击强行刷新按钮
    await taskPage.forceRefreshButton.click();
    await page.waitForTimeout(500);

    // 验证强行刷新对话框打开
    await expect(taskPage.forceRefreshDialog).toBeVisible();
    await expect(taskPage.forceRefreshTitle).toContainText('强行刷新');

    // 关闭对话框
    const cancelButton = taskPage.forceRefreshDialog.locator('button:has-text("取消")');
    await cancelButton.click();
    await page.waitForTimeout(500);

    // 也关闭编辑对话框
    const editCancelButton = taskPage.editTaskDialog.locator('button:has-text("取消")');
    await editCancelButton.click();
    await page.waitForTimeout(500);
  });

  test('强行刷新必须填写变更说明', async ({ page }) => {
    const techManager = getTestUser('tech_manager');
    const loginPage = new LoginPage(page);
    const taskPage = new TaskManagementPage(page);

    // 切换到技术经理
    await page.locator('button[aria-expanded]').click();
    await page.locator('button:has-text("退出登录")').click();
    await page.waitForURL('**/');

    await loginPage.login(techManager.username, techManager.password);

    // 打开编辑对话框和强行刷新对话框
    await page.goto('/tasks');
    await taskPage.clickEditTask(taskDescription);
    await taskPage.forceRefreshButton.click();
    await taskPage.forceRefreshDialog.waitFor({ state: 'visible' });

    // 尝试不填写说明直接确认
    await taskPage.confirmForceRefreshButton.click();
    await page.waitForTimeout(500);

    // 验证确认按钮应该被禁用或对话框仍然打开
    const isDialogOpen = await taskPage.forceRefreshDialog.isVisible();
    expect(isDialogOpen).toBeTruthy();

    // 关闭对话框
    const cancelButton = taskPage.forceRefreshDialog.locator('button:has-text("取消")');
    await cancelButton.click();
    await page.waitForTimeout(500);
  });

  test('强行刷新应该能够填写变更说明并提交', async ({ page }) => {
    const techManager = getTestUser('tech_manager');
    const loginPage = new LoginPage(page);
    const taskPage = new TaskManagementPage(page);

    // 切换到技术经理
    await page.locator('button[aria-expanded]').click();
    await page.locator('button:has-text("退出登录")').click();
    await page.waitForURL('**/');

    await loginPage.login(techManager.username, techManager.password);

    // 打开编辑对话框和强行刷新对话框
    await page.goto('/tasks');
    await taskPage.clickEditTask(taskDescription);

    // 修改任务日期
    await taskPage.updateTaskDates('2025-03-10', '2025-03-25');

    // 点击强行刷新
    await taskPage.forceRefreshButton.click();
    await taskPage.forceRefreshDialog.waitFor({ state: 'visible' });

    // 填写变更说明
    const refreshReason = '项目需求调整，延长工期';
    await taskPage.forceRefreshDescriptionTextarea.fill(refreshReason);

    // 确认刷新
    await taskPage.confirmForceRefreshButton.click();
    await page.waitForTimeout(1000);

    // 验证对话框关闭
    const isDialogOpen = await taskPage.forceRefreshDialog.isVisible();
    expect(isDialogOpen).toBeFalsy();

    // 验证编辑对话框也关闭
    await page.waitForTimeout(500);
    const isEditDialogOpen = await taskPage.editTaskDialog.isVisible();
    expect(isEditDialogOpen).toBeFalsy();
  });

  test('强行刷新后应该更新任务信息', async ({ page }) => {
    const techManager = getTestUser('tech_manager');
    const loginPage = new LoginPage(page);
    const taskPage = new TaskManagementPage(page);

    // 切换到技术经理
    await page.locator('button[aria-expanded]').click();
    await page.locator('button:has-text("退出登录")').click();
    await page.waitForURL('**/');

    await loginPage.login(techManager.username, techManager.password);

    // 打开编辑对话框
    await page.goto('/tasks');
    await taskPage.clickEditTask(taskDescription);

    // 修改进度
    await taskPage.updateTaskProgress(75);

    // 点击强行刷新
    await taskPage.forceRefreshButton.click();
    await taskPage.forceRefreshDialog.waitFor({ state: 'visible' });

    // 填写说明并确认
    await taskPage.forceRefreshDescriptionTextarea.fill('更新任务进度到75%');
    await taskPage.confirmForceRefreshButton.click();
    await page.waitForTimeout(2000);

    // 刷新页面
    await page.reload();
    await taskPage.waitForReady();

    // 再次打开编辑对话框验证更新
    await taskPage.clickEditTask(taskDescription);

    // 验证进度已更新
    const progressValue = await taskPage.editProgressSlider.inputValue();
    expect(progressValue).toBe('75');

    // 关闭对话框
    const cancelButton = taskPage.editTaskDialog.locator('button:has-text("取消")');
    await cancelButton.click();
    await page.waitForTimeout(500);
  });

  test('应该能够取消强行刷新操作', async ({ page }) => {
    const techManager = getTestUser('tech_manager');
    const loginPage = new LoginPage(page);
    const taskPage = new TaskManagementPage(page);

    // 切换到技术经理
    await page.locator('button[aria-expanded]').click();
    await page.locator('button:has-text("退出登录")').click();
    await page.waitForURL('**/');

    await loginPage.login(techManager.username, techManager.password);

    // 打开编辑对话框和强行刷新对话框
    await page.goto('/tasks');
    await taskPage.clickEditTask(taskDescription);
    await taskPage.forceRefreshButton.click();
    await taskPage.forceRefreshDialog.waitFor({ state: 'visible' });

    // 填写说明
    await taskPage.forceRefreshDescriptionTextarea.fill('测试取消操作');

    // 取消操作
    await taskPage.cancelForceRefreshButton.click();
    await page.waitForTimeout(500);

    // 验证强行刷新对话框关闭，但编辑对话框仍然打开
    const isForceRefreshDialogOpen = await taskPage.forceRefreshDialog.isVisible();
    const isEditDialogOpen = await taskPage.editTaskDialog.isVisible();

    expect(isForceRefreshDialogOpen).toBeFalsy();
    expect(isEditDialogOpen).toBeTruthy();

    // 关闭编辑对话框
    const cancelButton = taskPage.editTaskDialog.locator('button:has-text("取消")');
    await cancelButton.click();
    await page.waitForTimeout(500);
  });

  test('强行刷新对话框应该显示任务信息', async ({ page }) => {
    const techManager = getTestUser('tech_manager');
    const loginPage = new LoginPage(page);
    const taskPage = new TaskManagementPage(page);

    // 切换到技术经理
    await page.locator('button[aria-expanded]').click();
    await page.locator('button:has-text("退出登录")').click();
    await page.waitForURL('**/');

    await loginPage.login(techManager.username, techManager.password);

    // 打开编辑对话框和强行刷新对话框
    await page.goto('/tasks');
    await taskPage.clickEditTask(taskDescription);
    await taskPage.forceRefreshButton.click();
    await taskPage.forceRefreshDialog.waitFor({ state: 'visible' });

    // 验证显示任务标题
    const hasTaskTitle = await taskPage.forceRefreshDialog locator('text="${taskDescription}"').isVisible();
    expect(hasTaskTitle).toBeTruthy();

    // 关闭对话框
    const cancelButton = taskPage.forceRefreshDialog.locator('button:has-text("取消")');
    await cancelButton.click();
    await page.waitForTimeout(500);
  });
});
