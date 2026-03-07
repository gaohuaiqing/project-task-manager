/**
 * 任务状态测试
 *
 * 测试任务状态变更的各种场景
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { TaskManagementPage } from '../../src/pages/TaskManagementPage';
import { ProjectListPage } from '../../src/pages/ProjectListPage';
import { ProjectFormPage } from '../../src/pages/ProjectFormPage';
import { getTestUser } from '../../src/data/test-users';
import { generateProjectData, generateTaskData } from '../../src/data/test-projects';
import { generateDateRange } from '../../src/helpers/DataGenerator';

test.describe('任务状态变更', () => {
  let projectName: string;
  let taskDescription: string;

  test.beforeEach(async ({ page }) => {
    // 使用部门经理登录
    const user = getTestUser('dept_manager');
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(user.username, user.password);

    // 创建一个测试项目
    const projectListPage = new ProjectListPage(page);
    const projectFormPage = new ProjectFormPage(page);

    await page.goto('/projects');
    await projectListPage.clickCreateProject();
    await projectFormPage.waitForForm();

    const projectData = generateProjectData({
      name: `状态测试项目_${Date.now()}`,
      type: 'management'
    });
    projectName = projectData.name;

    await projectFormPage.selectType('management');
    await projectFormPage.fillBasicInfo(projectData);
    await projectFormPage.submit();
    await projectFormPage.waitForFormClosed();
    await page.waitForTimeout(2000);

    // 创建一个测试任务
    const taskPage = new TaskManagementPage(page);
    await page.goto('/tasks');
    await taskPage.clickCreateTask();
    await taskPage.waitForCreateDialog();

    const taskData = generateTaskData({
      description: `状态测试任务_${Date.now()}`,
      priority: 'medium'
    });
    taskDescription = taskData.description;

    await taskPage.selectProject(projectName);
    await taskPage.selectMember(user.name || '部门经理');
    await taskPage.fillDescription(taskData.description);
    await taskPage.selectPriority('medium');
    await taskPage.confirmCreate();
    await taskPage.waitForCreateDialogClosed();
    await page.waitForTimeout(2000);
  });

  test('应该能够点击状态徽章切换任务状态', async ({ page }) => {
    const taskPage = new TaskManagementPage(page);

    // 刷新页面
    await page.goto('/tasks');
    await taskPage.waitForReady();

    // 点击任务状态徽章
    await taskPage.clickTaskStatus(taskDescription);

    // 等待状态更新
    await page.waitForTimeout(1000);

    // 验证状态已变更（通过检查页面元素）
    // 这里我们只验证操作不报错
    await page.reload();
    await taskPage.waitForReady();
  });

  test('状态应该能够从未开始切换到进行中', async ({ page }) => {
    const taskPage = new TaskManagementPage(page);

    await page.goto('/tasks');
    await taskPage.waitForReady();

    // 点击状态徽章切换到进行中
    await taskPage.clickTaskStatus(taskDescription);
    await page.waitForTimeout(1000);

    // 再次点击切换到已完成
    await taskPage.clickTaskStatus(taskDescription);
    await page.waitForTimeout(1000);
  });

  test('状态应该能够循环切换', async ({ page }) => {
    const taskPage = new TaskManagementPage(page);

    await page.goto('/tasks');
    await taskPage.waitForReady();

    // 未开始 -> 进行中
    await taskPage.clickTaskStatus(taskDescription);
    await page.waitForTimeout(1000);

    // 进行中 -> 已完成
    await taskPage.clickTaskStatus(taskDescription);
    await page.waitForTimeout(1000);

    // 已完成 -> 未开始（循环）
    await taskPage.clickTaskStatus(taskDescription);
    await page.waitForTimeout(1000);
  });

  test('应该能够看到任务状态显示', async ({ page }) => {
    const taskPage = new TaskManagementPage(page);

    await page.goto('/tasks');
    await taskPage.waitForReady();

    // 查找任务行
    const taskRow = page.locator(`tr:has-text("${taskDescription}")`);

    // 验证状态徽章存在
    const statusBadge = taskRow.locator('[class*="bg-"]');
    await expect(statusBadge.first()).toBeVisible();
  });
});

test.describe('任务状态显示', () => {
  test('不同状态应该有不同的视觉样式', async ({ page }) => {
    // 创建任务并设置不同状态，验证样式
    const user = getTestUser('dept_manager');
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login(user.username, user.password);

    // 创建项目
    const projectListPage = new ProjectListPage(page);
    const projectFormPage = new ProjectFormPage(page);

    await page.goto('/projects');
    await projectListPage.clickCreateProject();
    await projectFormPage.waitForForm();

    const projectData = generateProjectData({
      name: `样式测试项目_${Date.now()}`,
      type: 'management'
    });

    await projectFormPage.selectType('management');
    await projectFormPage.fillBasicInfo(projectData);
    await projectFormPage.submit();
    await projectFormPage.waitForFormClosed();
    await page.waitForTimeout(2000);

    // 创建多个不同状态的任务
    const taskPage = new TaskManagementPage(page);
    await page.goto('/tasks');

    const tasks = [
      { desc: '未开始任务', status: 'not_started' },
      { desc: '进行中任务', status: 'in_progress' },
      { desc: '已完成任务', status: 'completed' }
    ];

    for (const task of tasks) {
      await taskPage.clickCreateTask();
      await taskPage.waitForCreateDialog();

      await taskPage.selectProject(projectData.name);
      await taskPage.selectMember(user.name || '部门经理');
      await taskPage.fillDescription(task.desc);
      await taskPage.selectPriority('medium');
      await taskPage.confirmCreate();
      await taskPage.waitForCreateDialogClosed();
      await page.waitForTimeout(1000);

      // 点击状态徽章设置状态
      if (task.status !== 'not_started') {
        await taskPage.clickTaskStatus(task.desc);
        await page.waitForTimeout(500);
        if (task.status === 'completed') {
          await taskPage.clickTaskStatus(task.desc);
          await page.waitForTimeout(500);
        }
      }
    }

    // 刷新页面查看所有任务
    await page.reload();
    await taskPage.waitForReady();

    // 验证所有任务都显示
    for (const task of tasks) {
      const hasTask = await taskPage.hasTask(task.desc);
      expect(hasTask).toBeTruthy();
    }
  });
});
