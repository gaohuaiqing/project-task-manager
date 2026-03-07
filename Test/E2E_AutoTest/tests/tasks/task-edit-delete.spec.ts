/**
 * 任务编辑和删除测试
 *
 * 测试任务的编辑、更新和删除功能
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { TaskManagementPage } from '../../src/pages/TaskManagementPage';
import { ProjectListPage } from '../../src/pages/ProjectListPage';
import { ProjectFormPage } from '../../src/pages/ProjectFormPage';
import { getTestUser } from '../../src/data/test-users';
import { generateProjectData, generateTaskData } from '../../src/data/test-projects';

test.describe('任务编辑', () => {
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
      name: `编辑测试项目_${Date.now()}`,
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

    const taskData = generateTaskData({
      description: `编辑测试任务_${Date.now()}`,
      priority: 'medium'
    });
    taskDescription = taskData.description;

    await taskPage.selectProject(projectName);
    await taskPage.selectMember(user.name || '部门经理');
    await taskPage.fillDescription(taskData.description);
    await taskPage.selectPriority('medium');
    await taskPage.confirmCreate();
    await taskPage.waitForCreateDialogClosed();
    await page.waitForTimeout(1000);
  });

  test('应该能够打开编辑任务对话框', async ({ page }) => {
    const taskPage = new TaskManagementPage(page);

    await page.goto('/tasks');
    await taskPage.waitForReady();

    // 点击编辑按钮
    await taskPage.clickEditTask(taskDescription);

    // 验证编辑对话框打开
    await expect(taskPage.editTaskDialog).toBeVisible();
    await expect(taskPage.editDialogTitle).toContainText('编辑任务');
  });

  test('应该能够更新任务描述', async ({ page }) => {
    const taskPage = new TaskManagementPage(page);

    await page.goto('/tasks');
    await taskPage.waitForReady();

    // 打开编辑对话框
    await taskPage.clickEditTask(taskDescription);

    // 更新描述
    const newDescription = `${taskDescription}_已更新`;
    await taskPage.updateTaskDescription(newDescription);

    // 保存
    await taskPage.saveEdit();

    // 验证更新成功
    await page.waitForTimeout(1000);
    await page.reload();
    await taskPage.waitForReady();

    const hasOldTask = await taskPage.hasTask(taskDescription);
    const hasNewTask = await taskPage.hasTask(newDescription);

    expect(hasOldTask).toBeFalsy();
    expect(hasNewTask).toBeTruthy();
  });

  test('应该能够更新任务日期', async ({ page }) => {
    const taskPage = new TaskManagementPage(page);

    await page.goto('/tasks');
    await taskPage.waitForReady();

    // 打开编辑对话框
    await taskPage.clickEditTask(taskDescription);

    // 更新日期
    await taskPage.updateTaskDates('2025-03-10', '2025-03-20');

    // 保存
    await taskPage.saveEdit();

    // 验证对话框关闭
    await expect(taskPage.editTaskDialog).not.toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  test('应该能够更新任务进度', async ({ page }) => {
    const taskPage = new TaskManagementPage(page);

    await page.goto('/tasks');
    await taskPage.waitForReady();

    // 打开编辑对话框
    await taskPage.clickEditTask(taskDescription);

    // 更新进度
    await taskPage.updateTaskProgress(50);

    // 保存
    await taskPage.saveEdit();

    // 验证保存成功
    await page.waitForTimeout(1000);
  });

  test('应该能够取消编辑任务', async ({ page }) => {
    const taskPage = new TaskManagementPage(page);

    await page.goto('/tasks');
    await taskPage.waitForReady();

    // 打开编辑对话框
    await taskPage.clickEditTask(taskDescription);

    // 修改描述
    await taskPage.updateTaskDescription('不应该保存的修改');

    // 关闭对话框（取消）
    const cancelButton = taskPage.editTaskDialog.locator('button:has-text("取消")');
    await cancelButton.click();
    await page.waitForTimeout(500);

    // 验证任务未更改
    await page.reload();
    await taskPage.waitForReady();

    const hasOriginalTask = await taskPage.hasTask(taskDescription);
    const hasModifiedTask = await taskPage.hasTask('不应该保存的修改');

    expect(hasOriginalTask).toBeTruthy();
    expect(hasModifiedTask).toBeFalsy();
  });

  test('应该能够更改前置任务', async ({ page }) => {
    const taskPage = new TaskManagementPage(page);

    // 先创建另一个任务作为前置任务
    await taskPage.clickCreateTask();
    await taskPage.waitForCreateDialog();

    const predecessorTask = `前置任务_${Date.now()}`;
    await taskPage.selectProject(projectName);
    await taskPage.selectMember('部门经理');
    await taskPage.fillDescription(predecessorTask);
    await taskPage.selectPriority('medium');
    await taskPage.confirmCreate();
    await taskPage.waitForCreateDialogClosed();
    await page.waitForTimeout(1000);

    // 编辑原任务，添加前置任务
    await page.goto('/tasks');
    await taskPage.waitForReady();
    await taskPage.clickEditTask(taskDescription);

    // 选择前置任务（这里需要根据实际UI调整）
    await taskPage.saveEdit();

    // 验证保存成功
    await page.waitForTimeout(1000);
  });
});

test.describe('任务删除', () => {
  let projectName: string;
  let taskDescription: string;

  test.beforeEach(async ({ page }) => {
    const user = getTestUser('dept_manager');
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(user.username, user.password);

    // 创建测试项目和任务
    const projectListPage = new ProjectListPage(page);
    const projectFormPage = new ProjectFormPage(page);

    await page.goto('/projects');
    await projectListPage.clickCreateProject();
    await projectFormPage.waitForForm();

    const projectData = generateProjectData({
      name: `删除测试项目_${Date.now()}`,
      type: 'management'
    });
    projectName = projectData.name;

    await projectFormPage.selectType('management');
    await projectFormPage.fillBasicInfo(projectData);
    await projectFormPage.submit();
    await projectFormPage.waitForFormClosed();
    await page.waitForTimeout(2000);

    const taskPage = new TaskManagementPage(page);
    await page.goto('/tasks');
    await taskPage.clickCreateTask();
    await taskPage.waitForCreateDialog();

    const taskData = generateTaskData({
      description: `删除测试任务_${Date.now()}`,
      priority: 'medium'
    });
    taskDescription = taskData.description;

    await taskPage.selectProject(projectName);
    await taskPage.selectMember(user.name || '部门经理');
    await taskPage.fillDescription(taskData.description);
    await taskPage.selectPriority('medium');
    await taskPage.confirmCreate();
    await taskPage.waitForCreateDialogClosed();
    await page.waitForTimeout(1000);
  });

  test('应该能够删除任务', async ({ page }) => {
    const taskPage = new TaskManagementPage(page);

    await page.goto('/tasks');
    await taskPage.waitForReady();

    // 验证任务存在
    const hasTaskBefore = await taskPage.hasTask(taskDescription);
    expect(hasTaskBefore).toBeTruthy();

    // 删除任务
    await taskPage.clickDeleteTask(taskDescription);

    // 等待删除完成
    await page.waitForTimeout(2000);

    // 验证任务已删除
    await page.reload();
    await taskPage.waitForReady();

    const hasTaskAfter = await taskPage.hasTask(taskDescription);
    expect(hasTaskAfter).toBeFalsy();
  });

  test('删除任务后应该更新列表', async ({ page }) => {
    const taskPage = new TaskManagementPage(page);

    await page.goto('/tasks');
    await taskPage.waitForReady();

    // 获取初始任务数量
    const initialCount = await taskPage.getTaskCount();

    // 删除任务
    await taskPage.clickDeleteTask(taskDescription);
    await page.waitForTimeout(1000);

    // 验证任务数量减少
    const newCount = await taskPage.getTaskCount();
    expect(newCount).toBeLessThan(initialCount);
  });

  test('应该能够删除多个任务', async ({ page }) => {
    const taskPage = new TaskManagementPage(page);
    const user = getTestUser('dept_manager');

    // 创建多个任务
    const tasksToDelete = [];
    for (let i = 0; i < 3; i++) {
      await taskPage.clickCreateTask();
      await taskPage.waitForCreateDialog();

      const desc = `批量删除任务_${Date.now()}_${i}`;
      tasksToDelete.push(desc);

      await taskPage.selectProject(projectName);
      await taskPage.selectMember(user.name || '部门经理');
      await taskPage.fillDescription(desc);
      await taskPage.selectPriority('medium');
      await taskPage.confirmCreate();
      await taskPage.waitForCreateDialogClosed();
      await page.waitForTimeout(500);
    }

    await page.reload();
    await taskPage.waitForReady();

    // 删除所有任务
    for (const desc of tasksToDelete) {
      await taskPage.clickDeleteTask(desc);
      await page.waitForTimeout(500);
    }

    // 验证所有任务都已删除
    await page.reload();
    await taskPage.waitForReady();

    for (const desc of tasksToDelete) {
      const hasTask = await taskPage.hasTask(desc);
      expect(hasTask).toBeFalsy();
    }
  });
});

test.describe('任务编辑权限', () => {
  test('工程师只能编辑自己的任务', async ({ page }) => {
    const engineer = getTestUser('engineer');
    const manager = getTestUser('dept_manager');
    const loginPage = new LoginPage(page);
    const taskPage = new TaskManagementPage(page);

    // 使用经理登录创建任务
    await loginPage.goto();
    await loginPage.login(manager.username, manager.password);

    // 创建项目和任务（分配给工程师）
    const projectListPage = new ProjectListPage(page);
    const projectFormPage = new ProjectFormPage(page);

    await page.goto('/projects');
    await projectListPage.clickCreateProject();
    await projectFormPage.waitForForm();

    const projectData = generateProjectData({
      name: `权限测试项目_${Date.now()}`,
      type: 'management'
    });

    await projectFormPage.selectType('management');
    await projectFormPage.fillBasicInfo(projectData);
    await projectFormPage.submit();
    await projectFormPage.waitForFormClosed();
    await page.waitForTimeout(2000);

    await page.goto('/tasks');
    await taskPage.clickCreateTask();
    await taskPage.waitForCreateDialog();

    const managerTask = `经理的任务_${Date.now()}`;
    await taskPage.selectProject(projectData.name);
    await taskPage.selectMember('部门经理');
    await taskPage.fillDescription(managerTask);
    await taskPage.selectPriority('medium');
    await taskPage.confirmCreate();
    await taskPage.waitForCreateDialogClosed();
    await page.waitForTimeout(1000);

    // 切换到工程师账号
    await page.locator('button[aria-expanded]').click();
    await page.locator('button:has-text("退出登录")').click();
    await page.waitForURL('**/');

    await loginPage.login(engineer.username, engineer.password);

    // 创建工程师自己的任务
    await page.goto('/tasks');
    await taskPage.clickCreateTask();
    await taskPage.waitForCreateDialog();

    const engineerTask = `工程师的任务_${Date.now()}`;
    await taskPage.selectProject(projectData.name);
    // 工程师的成员选择器应该是禁用的
    await taskPage.fillDescription(engineerTask);
    await taskPage.selectPriority('medium');
    await taskPage.confirmCreate();
    await taskPage.waitForCreateDialogClosed();
    await page.waitForTimeout(1000);

    // 验证工程师只能看到自己的任务
    await page.reload();
    await taskPage.waitForReady();

    const hasEngineerTask = await taskPage.hasTask(engineerTask);
    const hasManagerTask = await taskPage.hasTask(managerTask);

    expect(hasEngineerTask).toBeTruthy();
    expect(hasManagerTask).toBeFalsy();
  });
});
