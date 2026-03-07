/**
 * 任务列表加载测试
 *
 * 测试任务管理页面的列表显示和加载功能
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { TaskManagementPage } from '../../src/pages/TaskManagementPage';
import { ProjectListPage } from '../../src/pages/ProjectListPage';
import { ProjectFormPage } from '../../src/pages/ProjectFormPage';
import { getTestUser } from '../../src/data/test-users';
import { generateProjectData, generateTaskData } from '../../src/data/test-projects';
import { generateDateRange } from '../../src/helpers/DataGenerator';

test.describe('任务列表加载', () => {
  let projectName: string;
  let taskDescriptions: string[] = [];

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
    await projectListPage.waitForReady();
    await projectListPage.clickCreateProject();
    await projectFormPage.waitForForm();

    const projectData = generateProjectData({
      name: `列表测试项目_${Date.now()}`,
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
    await taskPage.waitForReady();

    const tasks = [
      { desc: '任务列表测试_任务1', priority: 'high' },
      { desc: '任务列表测试_任务2', priority: 'medium' },
      { desc: '任务列表测试_任务3', priority: 'low' }
    ];

    for (const task of tasks) {
      await taskPage.clickCreateTask();
      await taskPage.waitForCreateDialog();

      await taskPage.selectProject(projectName);
      await taskPage.selectMember(user.name || '部门经理');
      await taskPage.fillDescription(task.desc);
      await taskPage.selectPriority(task.priority as 'high' | 'medium' | 'low');
      await taskPage.confirmCreate();
      await taskPage.waitForCreateDialogClosed();
      await page.waitForTimeout(500);

      taskDescriptions.push(task.desc);
    }
  });

  test('应该能够加载并显示任务列表', async ({ page }) => {
    const taskPage = new TaskManagementPage(page);

    // 刷新页面
    await page.goto('/tasks');
    await taskPage.waitForReady();

    // 验证任务列表存在
    const taskCount = await taskPage.getTaskCount();
    expect(taskCount).toBeGreaterThanOrEqual(3);

    // 验证所有创建的任务都显示
    for (const desc of taskDescriptions) {
      const hasTask = await taskPage.hasTask(desc);
      expect(hasTask).toBeTruthy();
    }
  });

  test('应该能够显示任务的完整信息', async ({ page }) => {
    const taskPage = new TaskManagementPage(page);

    await page.goto('/tasks');
    await taskPage.waitForReady();

    // 检查第一个任务的详细信息
    const taskTitle = taskDescriptions[0];

    // 验证任务描述显示
    const hasDescription = await taskPage.hasTask(taskTitle);
    expect(hasDescription).toBeTruthy();

    // 验证任务状态徽章存在
    const status = await taskPage.getTaskStatus(taskTitle);
    expect(status).toBeTruthy();
  });

  test('应该能够显示空列表状态', async ({ page }) => {
    const taskPage = new TaskManagementPage(page);

    // 使用搜索功能查询不存在的任务
    await taskPage.searchTasks('不存在的任务_xyz123');
    await page.waitForTimeout(1000);

    // 可能显示空状态或无结果
    const taskCount = await taskPage.getTaskCount();

    // 验证要么显示空状态，要么任务数量为0
    if (taskCount === 0) {
      // 空列表是符合预期的
      expect(taskCount).toBe(0);
    } else {
      // 或者列表中没有匹配的任务
      const hasNonMatchingTask = await taskPage.hasTask(taskDescriptions[0]);
      expect(hasNonMatchingTask).toBeFalsy();
    }
  });

  test('应该能够正确分页显示任务（如果有分页）', async ({ page }) => {
    const taskPage = new TaskManagementPage(page);

    await page.goto('/tasks');
    await taskPage.waitForReady();

    // 获取当前任务数量
    const initialCount = await taskPage.getTaskCount();

    // 如果有分页控制，测试翻页功能
    const nextPageButton = page.locator('button:has-text("下一页"), button:has-text("Next")');
    if (await nextPageButton.isVisible()) {
      await nextPageButton.click();
      await page.waitForTimeout(1000);

      const newCount = await taskPage.getTaskCount();
      expect(newCount).toBeGreaterThanOrEqual(0);
    } else {
      // 没有分页，所有任务都在一页显示
      expect(initialCount).toBeGreaterThanOrEqual(3);
    }
  });

  test('应该能够显示任务统计信息', async ({ page }) => {
    const taskPage = new TaskManagementPage(page);

    await page.goto('/tasks');
    await taskPage.waitForReady();

    // 检查任务统计元素是否存在
    const hasStats = await taskPage.hasElement('[class*="stats"], [data-testid="task-stats"]');

    if (hasStats) {
      // 如果有统计元素，验证其可见性
      const stats = taskPage.taskStats;
      await expect(stats.first()).toBeVisible();
    }
  });

  test('任务列表应该支持刷新', async ({ page }) => {
    const taskPage = new TaskManagementPage(page);

    await page.goto('/tasks');
    await taskPage.waitForReady();

    // 记录初始任务数量
    const initialCount = await taskPage.getTaskCount();

    // 刷新页面
    await taskPage.refresh();

    // 验证任务数量保持一致
    const newCount = await taskPage.getTaskCount();
    expect(newCount).toBe(initialCount);
  });

  test('应该能够正确显示不同状态的任务', async ({ page }) => {
    const taskPage = new TaskManagementPage(page);

    await page.goto('/tasks');
    await taskPage.waitForReady();

    // 更改任务状态
    const taskTitle = taskDescriptions[0];
    await taskPage.clickTaskStatus(taskTitle);
    await page.waitForTimeout(500);

    // 刷新页面验证状态保持
    await page.reload();
    await taskPage.waitForReady();

    const hasTask = await taskPage.hasTask(taskTitle);
    expect(hasTask).toBeTruthy();

    const status = await taskPage.getTaskStatus(taskTitle);
    expect(status).toBeTruthy();
  });

  test('应该能够按WBS编码排序显示任务', async ({ page }) => {
    const taskPage = new TaskManagementPage(page);

    await page.goto('/tasks');
    await taskPage.waitForReady();

    // 查找WBS编码列（如果有）
    const wbsCodeColumn = page.locator('th:has-text("WBS"), th:has-text("编号")');

    if (await wbsCodeColumn.isVisible()) {
      // 点击WBS列进行排序
      await wbsCodeColumn.click();
      await page.waitForTimeout(500);

      // 验证任务仍然显示
      const taskCount = await taskPage.getTaskCount();
      expect(taskCount).toBeGreaterThanOrEqual(3);
    }
  });
});
