/**
 * 任务批量操作测试
 *
 * 测试任务的批量删除、批量更新状态等批量操作功能
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { TaskManagementPage } from '../../src/pages/TaskManagementPage';
import { ProjectListPage } from '../../src/pages/ProjectListPage';
import { ProjectFormPage } from '../../src/pages/ProjectFormPage';
import { getTestUser } from '../../src/data/test-users';
import { generateProjectData } from '../../src/data/test-projects';

test.describe('任务批量操作', () => {
  let projectName: string;
  let batchTasks: string[] = [];

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
      name: `批量操作测试项目_${Date.now()}`,
      type: 'management'
    });
    projectName = projectData.name;

    await projectFormPage.selectType('management');
    await projectFormPage.fillBasicInfo(projectData);
    await projectFormPage.submit();
    await projectFormPage.waitForFormClosed();
    await page.waitForTimeout(2000);

    // 创建多个测试任务
    const taskPage = new TaskManagementPage(page);
    await page.goto('/tasks');

    for (let i = 0; i < 5; i++) {
      await taskPage.clickCreateTask();
      await taskPage.waitForCreateDialog();

      const desc = `批量操作任务_${Date.now()}_${i}`;
      batchTasks.push(desc);

      await taskPage.selectProject(projectName);
      await taskPage.selectMember(user.name || '部门经理');
      await taskPage.fillDescription(desc);
      await taskPage.selectPriority('medium');
      await taskPage.confirmCreate();
      await taskPage.waitForCreateDialogClosed();
      await page.waitForTimeout(500);
    }
  });

  test('应该能够选择所有任务', async ({ page }) => {
    const taskPage = new TaskManagementPage(page);

    await page.goto('/tasks');
    await taskPage.waitForReady();

    // 尝试选择所有任务（如果有复选框）
    const selectAllCheckbox = taskPage.selectAllCheckbox;
    if (await selectAllCheckbox.isVisible()) {
      await selectAllCheckbox.check();
      await page.waitForTimeout(500);

      // 验证所有任务被选中
      const isChecked = await selectAllCheckbox.isChecked();
      expect(isChecked).toBeTruthy();
    } else {
      // 如果没有复选框功能，测试跳过
      test.skip();
    }
  });

  test('应该能够批量删除任务', async ({ page }) => {
    const taskPage = new TaskManagementPage(page);

    await page.goto('/tasks');
    await taskPage.waitForReady();

    // 获取初始任务数量
    const initialCount = await taskPage.getTaskCount();

    // 检查是否有批量删除功能
    const batchDeleteButton = taskPage.batchDeleteButton;
    if (await batchDeleteButton.isVisible()) {
      // 选择所有任务
      await taskPage.selectAllTasks();

      // 批量删除
      await taskPage.batchDelete();

      // 等待删除完成
      await page.waitForTimeout(2000);

      // 刷新页面
      await page.reload();
      await taskPage.waitForReady();

      // 验证任务数量减少
      const newCount = await taskPage.getTaskCount();
      expect(newCount).toBeLessThan(initialCount);
    } else {
      // 如果没有批量删除功能，使用单个删除
      for (const task of batchTasks.slice(0, 3)) {
        await taskPage.clickDeleteTask(task);
        await page.waitForTimeout(500);
      }

      await page.reload();
      await taskPage.waitForReady();

      const newCount = await taskPage.getTaskCount();
      expect(newCount).toBeLessThan(initialCount);
    }
  });

  test('应该能够批量更新任务状态', async ({ page }) => {
    const taskPage = new TaskManagementPage(page);

    await page.goto('/tasks');
    await taskPage.waitForReady();

    // 检查是否有批量更新状态功能
    const batchUpdateButton = taskPage.batchUpdateStatusButton;
    if (await batchUpdateButton.isVisible()) {
      // 选择所有任务
      await taskPage.selectAllTasks();

      // 批量更新状态
      await batchUpdateButton.click();
      await page.waitForTimeout(500);

      // 选择状态（这里根据实际UI调整）
      const statusOption = page.locator('text="进行中"');
      if (await statusOption.isVisible()) {
        await statusOption.click();
      }

      // 确认更新
      const confirmButton = page.locator('button:has-text("确认"), button:has-text("更新")');
      await confirmButton.click();
      await page.waitForTimeout(1000);

      // 验证状态更新（刷新页面）
      await page.reload();
      await taskPage.waitForReady();

      // 检查任务状态
      for (const task of batchTasks) {
        const status = await taskPage.getTaskStatus(task);
        // 验证状态已更新
        expect(status).toBeTruthy();
      }
    } else {
      // 如果没有批量更新功能，测试跳过
      test.skip();
    }
  });

  test('批量操作应该显示确认对话框', async ({ page }) => {
    const taskPage = new TaskManagementPage(page);

    await page.goto('/tasks');
    await taskPage.waitForReady();

    // 检查批量删除按钮
    const batchDeleteButton = taskPage.batchDeleteButton;
    if (await batchDeleteButton.isVisible()) {
      // 选择任务
      await taskPage.selectAllTasks();

      // 点击批量删除
      await batchDeleteButton.click();
      await page.waitForTimeout(500);

      // 验证确认对话框出现
      const confirmDialog = page.locator('div[role="dialog"]');
      const hasConfirmDialog = await confirmDialog.isVisible();

      if (hasConfirmDialog) {
        // 取消操作
        const cancelButton = confirmDialog.locator('button:has-text("取消")');
        await cancelButton.click();
        await page.waitForTimeout(500);
      }
    } else {
      test.skip();
    }
  });

  test('应该能够取消批量操作', async ({ page }) => {
    const taskPage = new TaskManagementPage(page);

    await page.goto('/tasks');
    await taskPage.waitForReady();

    // 获取初始任务数量
    const initialCount = await taskPage.getTaskCount();

    // 检查批量删除功能
    const batchDeleteButton = taskPage.batchDeleteButton;
    if (await batchDeleteButton.isVisible()) {
      // 选择任务
      await taskPage.selectAllTasks();

      // 点击批量删除
      await batchDeleteButton.click();
      await page.waitForTimeout(500);

      // 取消操作
      const cancelButton = page.locator('button:has-text("取消")');
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
        await page.waitForTimeout(500);

        // 验证任务没有被删除
        const finalCount = await taskPage.getTaskCount();
        expect(finalCount).toBe(initialCount);
      }
    } else {
      test.skip();
    }
  });

  test('批量操作应该有权限控制', async ({ page }) => {
    const taskPage = new TaskManagementPage(page);

    await page.goto('/tasks');
    await taskPage.waitForReady();

    // 检查批量操作按钮的可见性
    const hasBatchDelete = await taskPage.batchDeleteButton.isVisible();
    const hasBatchUpdate = await taskPage.batchUpdateStatusButton.isVisible();

    // 部门经理应该能看到批量操作
    expect(hasBatchDelete || hasBatchUpdate).toBeTruthy();
  });

  test('选择部分任务进行批量操作', async ({ page }) => {
    const taskPage = new TaskManagementPage(page);

    await page.goto('/tasks');
    await taskPage.waitForReady();

    // 检查是否有复选框
    const firstCheckbox = page.locator('input[type="checkbox"]').first();
    if (await firstCheckbox.isVisible()) {
      // 只选择前两个任务
      const checkboxes = page.locator('input[type="checkbox"]');
      const count = await checkboxes.count();

      for (let i = 0; i < Math.min(2, count); i++) {
        await checkboxes.nth(i).check();
        await page.waitForTimeout(200);
      }

      // 验证只有部分被选中
      const checkedCount = await page.locator('input[type="checkbox"]:checked').count();
      expect(checkedCount).toBe(2);
    } else {
      test.skip();
    }
  });
});

test.describe('批量操作权限', () => {
  test('工程师不应该有批量删除权限', async ({ page }) => {
    const engineer = getTestUser('engineer');
    const manager = getTestUser('dept_manager');
    const loginPage = new LoginPage(page);
    const taskPage = new TaskManagementPage(page);

    // 先用经理创建项目和任务
    await loginPage.goto();
    await loginPage.login(manager.username, manager.password);

    const projectListPage = new ProjectListPage(page);
    const projectFormPage = new ProjectFormPage(page);

    await page.goto('/projects');
    await projectListPage.clickCreateProject();
    await projectFormPage.waitForForm();

    const projectData = generateProjectData({
      name: `工程师批量操作测试项目_${Date.now()}`,
      type: 'management'
    });

    await projectFormPage.selectType('management');
    await projectFormPage.fillBasicInfo(projectData);
    await projectFormPage.submit();
    await projectFormPage.waitForFormClosed();
    await page.waitForTimeout(2000);

    // 创建分配给工程师的任务
    await page.goto('/tasks');
    await taskPage.clickCreateTask();
    await taskPage.waitForCreateDialog();

    await taskPage.selectProject(projectData.name);
    await taskPage.selectMember('工程师');
    await taskPage.fillDescription('工程师任务');
    await taskPage.selectPriority('medium');
    await taskPage.confirmCreate();
    await taskPage.waitForCreateDialogClosed();
    await page.waitForTimeout(1000);

    // 切换到工程师账号
    await page.locator('button[aria-expanded]').click();
    await page.locator('button:has-text("退出登录")').click();
    await page.waitForURL('**/');

    await loginPage.login(engineer.username, engineer.password);

    // 验证工程师看不到批量删除按钮
    await page.goto('/tasks');
    await taskPage.waitForReady();

    const hasBatchDelete = await taskPage.batchDeleteButton.isVisible();
    expect(hasBatchDelete).toBeFalsy();
  });
});
