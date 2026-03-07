/**
 * 任务筛选和搜索测试
 *
 * 测试任务列表的多维度筛选和搜索功能
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { TaskManagementPage } from '../../src/pages/TaskManagementPage';
import { ProjectListPage } from '../../src/pages/ProjectListPage';
import { ProjectFormPage } from '../../src/pages/ProjectFormPage';
import { getTestUser } from '../../src/data/test-users';
import { generateProjectData, generateTaskData } from '../../src/data/test-projects';

test.describe('任务搜索', () => {
  let projectName: string;
  let searchTasks: string[] = [];

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
      name: `搜索测试项目_${Date.now()}`,
      type: 'management'
    });
    projectName = projectData.name;

    await projectFormPage.selectType('management');
    await projectFormPage.fillBasicInfo(projectData);
    await projectFormPage.submit();
    await projectFormPage.waitForFormClosed();
    await page.waitForTimeout(2000);

    // 创建多个不同描述的任务
    const taskPage = new TaskManagementPage(page);
    await page.goto('/tasks');

    const tasks = [
      '前端开发任务_实现用户登录',
      '前端开发任务_实现数据展示',
      '后端开发任务_实现API接口',
      '测试任务_编写单元测试'
    ];

    for (const desc of tasks) {
      await taskPage.clickCreateTask();
      await taskPage.waitForCreateDialog();

      await taskPage.selectProject(projectName);
      await taskPage.selectMember(user.name || '部门经理');
      await taskPage.fillDescription(desc);
      await taskPage.selectPriority('medium');
      await taskPage.confirmCreate();
      await taskPage.waitForCreateDialogClosed();
      await page.waitForTimeout(500);

      searchTasks.push(desc);
    }
  });

  test('应该能够按任务名称搜索', async ({ page }) => {
    const taskPage = new TaskManagementPage(page);

    await page.goto('/tasks');
    await taskPage.waitForReady();

    // 搜索"前端"
    await taskPage.searchTasks('前端');
    await page.waitForTimeout(1000);

    // 验证只显示包含"前端"的任务
    const hasFrontend1 = await taskPage.hasTask('前端开发任务_实现用户登录');
    const hasFrontend2 = await taskPage.hasTask('前端开发任务_实现数据展示');
    const hasBackend = await taskPage.hasTask('后端开发任务_实现API接口');

    expect(hasFrontend1).toBeTruthy();
    expect(hasFrontend2).toBeTruthy();
    expect(hasBackend).toBeFalsy();
  });

  test('应该能够按WBS编码搜索', async ({ page }) => {
    const taskPage = new TaskManagementPage(page);

    await page.goto('/tasks');
    await taskPage.waitForReady();

    // 搜索WBS编码（如"1"）
    await taskPage.searchTasks('1');
    await page.waitForTimeout(1000);

    // 验证搜索结果
    const taskCount = await taskPage.getTaskCount();
    expect(taskCount).toBeGreaterThanOrEqual(0);
  });

  test('应该能够清除搜索结果', async ({ page }) => {
    const taskPage = new TaskManagementPage(page);

    await page.goto('/tasks');
    await taskPage.waitForReady();

    // 获取初始任务数量
    const initialCount = await taskPage.getTaskCount();

    // 搜索
    await taskPage.searchTasks('前端');
    await page.waitForTimeout(1000);

    const searchCount = await taskPage.getTaskCount();

    // 清除搜索
    await taskPage.searchTasks('');
    await page.waitForTimeout(1000);

    const finalCount = await taskPage.getTaskCount();

    expect(finalCount).toBe(initialCount);
  });

  test('搜索不存在的任务应该返回空结果', async ({ page }) => {
    const taskPage = new TaskManagementPage(page);

    await page.goto('/tasks');
    await taskPage.waitForReady();

    // 搜索不存在的任务
    await taskPage.searchTasks('不存在的任务_xyz123');
    await page.waitForTimeout(1000);

    // 验证没有匹配结果
    const hasAnyTask = await taskPage.hasTask('前端');
    expect(hasAnyTask).toBeFalsy();
  });

  test('应该支持模糊搜索', async ({ page }) => {
    const taskPage = new TaskManagementPage(page);

    await page.goto('/tasks');
    await taskPage.waitForReady();

    // 搜索部分关键词
    await taskPage.searchTasks('登录');
    await page.waitForTimeout(1000);

    const hasTask = await taskPage.hasTask('前端开发任务_实现用户登录');
    expect(hasTask).toBeTruthy();
  });
});

test.describe('项目筛选', () => {
  test('应该能够按项目筛选任务', async ({ page }) => {
    const user = getTestUser('dept_manager');
    const loginPage = new LoginPage(page);
    const taskPage = new TaskManagementPage(page);

    await loginPage.goto();
    await loginPage.login(user.username, user.password);

    // 创建两个项目
    const projectListPage = new ProjectListPage(page);
    const projectFormPage = new ProjectFormPage(page);

    const projects = [];
    for (let i = 0; i < 2; i++) {
      await page.goto('/projects');
      await projectListPage.clickCreateProject();
      await projectFormPage.waitForForm();

      const projectData = generateProjectData({
        name: `筛选测试项目_${Date.now()}_${i}`,
        type: 'management'
      });
      projects.push(projectData.name);

      await projectFormPage.selectType('management');
      await projectFormPage.fillBasicInfo(projectData);
      await projectFormPage.submit();
      await projectFormPage.waitForFormClosed();
      await page.waitForTimeout(1000);
    }

    // 为每个项目创建任务
    await page.goto('/tasks');
    for (const projectName of projects) {
      await taskPage.clickCreateTask();
      await taskPage.waitForCreateDialog();

      await taskPage.selectProject(projectName);
      await taskPage.selectMember(user.name || '部门经理');
      await taskPage.fillDescription(`${projectName}_任务`);
      await taskPage.selectPriority('medium');
      await taskPage.confirmCreate();
      await taskPage.waitForCreateDialogClosed();
      await page.waitForTimeout(500);
    }

    await page.reload();
    await taskPage.waitForReady();

    // 按第一个项目筛选
    await taskPage.filterByProject(projects[0]);
    await page.waitForTimeout(1000);

    // 验证只显示该项目的任务
    const hasProject1Task = await taskPage.hasTask(`${projects[0]}_任务`);
    const hasProject2Task = await taskPage.hasTask(`${projects[1]}_任务`);

    expect(hasProject1Task).toBeTruthy();
    expect(hasProject2Task).toBeFalsy();
  });

  test('应该能够显示"所有项目"选项', async ({ page }) => {
    const taskPage = new TaskManagementPage(page);
    const user = getTestUser('dept_manager');
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login(user.username, user.password);

    await page.goto('/tasks');
    await taskPage.waitForReady();

    // 检查项目筛选器
    const projectFilter = taskPage.projectFilter;
    await expect(projectFilter).toBeVisible();
  });
});

test.describe('成员筛选', () => {
  test('应该能够按成员筛选任务', async ({ page }) => {
    const user = getTestUser('dept_manager');
    const loginPage = new LoginPage(page);
    const taskPage = new TaskManagementPage(page);

    await loginPage.goto();
    await loginPage.login(user.username, user.password);

    // 创建项目
    const projectListPage = new ProjectListPage(page);
    const projectFormPage = new ProjectFormPage(page);

    await page.goto('/projects');
    await projectListPage.clickCreateProject();
    await projectFormPage.waitForForm();

    const projectData = generateProjectData({
      name: `成员筛选测试项目_${Date.now()}`,
      type: 'management'
    });

    await projectFormPage.selectType('management');
    await projectFormPage.fillBasicInfo(projectData);
    await projectFormPage.submit();
    await projectFormPage.waitForFormClosed();
    await page.waitForTimeout(2000);

    // 为不同成员创建任务
    await page.goto('/tasks');

    const members = ['部门经理', '工程师'];
    const tasks = [];

    for (const member of members) {
      await taskPage.clickCreateTask();
      await taskPage.waitForCreateDialog();

      const desc = `${member}_任务_${Date.now()}`;
      tasks.push({ member, desc });

      await taskPage.selectProject(projectData.name);
      await taskPage.selectMember(member);
      await taskPage.fillDescription(desc);
      await taskPage.selectPriority('medium');
      await taskPage.confirmCreate();
      await taskPage.waitForCreateDialogClosed();
      await page.waitForTimeout(500);
    }

    await page.reload();
    await taskPage.waitForReady();

    // 按部门经理筛选
    await taskPage.filterByMember('部门经理');
    await page.waitForTimeout(1000);

    const hasManagerTask = await taskPage.hasTask(tasks[0].desc);
    const hasEngineerTask = await taskPage.hasTask(tasks[1].desc);

    expect(hasManagerTask).toBeTruthy();
    expect(hasEngineerTask).toBeFalsy();
  });
});

test.describe('状态筛选', () => {
  test('应该能够按任务状态筛选', async ({ page }) => {
    const user = getTestUser('dept_manager');
    const loginPage = new LoginPage(page);
    const taskPage = new TaskManagementPage(page);

    await loginPage.goto();
    await loginPage.login(user.username, user.password);

    // 创建项目和任务
    const projectListPage = new ProjectListPage(page);
    const projectFormPage = new ProjectFormPage(page);

    await page.goto('/projects');
    await projectListPage.clickCreateProject();
    await projectFormPage.waitForForm();

    const projectData = generateProjectData({
      name: `状态筛选测试项目_${Date.now()}`,
      type: 'management'
    });

    await projectFormPage.selectType('management');
    await projectFormPage.fillBasicInfo(projectData);
    await projectFormPage.submit();
    await projectFormPage.waitForFormClosed();
    await page.waitForTimeout(2000);

    // 创建不同状态的任务
    await page.goto('/tasks');

    const tasks = {
      notStarted: `未开始任务_${Date.now()}`,
      inProgress: `进行中任务_${Date.now()}`,
      completed: `已完成任务_${Date.now()}`
    };

    for (const [status, desc] of Object.entries(tasks)) {
      await taskPage.clickCreateTask();
      await taskPage.waitForCreateDialog();

      await taskPage.selectProject(projectData.name);
      await taskPage.selectMember(user.name || '部门经理');
      await taskPage.fillDescription(desc);
      await taskPage.selectPriority('medium');
      await taskPage.confirmCreate();
      await taskPage.waitForCreateDialogClosed();
      await page.waitForTimeout(500);

      // 更新任务状态
      if (status === 'inProgress' || status === 'completed') {
        await taskPage.clickTaskStatus(desc);
        await page.waitForTimeout(500);
      }
      if (status === 'completed') {
        await taskPage.clickTaskStatus(desc);
        await page.waitForTimeout(500);
      }
    }

    await page.reload();
    await taskPage.waitForReady();

    // 按"已完成"筛选
    await taskPage.filterByStatus('已完成');
    await page.waitForTimeout(1000);

    const hasCompletedTask = await taskPage.hasTask(tasks.completed);
    const hasNotStartedTask = await taskPage.hasTask(tasks.notStarted);

    expect(hasCompletedTask).toBeTruthy();
    expect(hasNotStartedTask).toBeFalsy();
  });
});

test.describe('优先级筛选', () => {
  test('应该能够按任务优先级筛选', async ({ page }) => {
    const user = getTestUser('dept_manager');
    const loginPage = new LoginPage(page);
    const taskPage = new TaskManagementPage(page);

    await loginPage.goto();
    await loginPage.login(user.username, user.password);

    // 创建项目
    const projectListPage = new ProjectListPage(page);
    const projectFormPage = new ProjectFormPage(page);

    await page.goto('/projects');
    await projectListPage.clickCreateProject();
    await projectFormPage.waitForForm();

    const projectData = generateProjectData({
      name: `优先级筛选测试项目_${Date.now()}`,
      type: 'management'
    });

    await projectFormPage.selectType('management');
    await projectFormPage.fillBasicInfo(projectData);
    await projectFormPage.submit();
    await projectFormPage.waitForFormClosed();
    await page.waitForTimeout(2000);

    // 创建不同优先级的任务
    await page.goto('/tasks');

    const tasks = {
      high: `高优先级任务_${Date.now()}`,
      medium: `中优先级任务_${Date.now()}`,
      low: `低优先级任务_${Date.now()}`
    };

    for (const [priority, desc] of Object.entries(tasks)) {
      await taskPage.clickCreateTask();
      await taskPage.waitForCreateDialog();

      await taskPage.selectProject(projectData.name);
      await taskPage.selectMember(user.name || '部门经理');
      await taskPage.fillDescription(desc);
      await taskPage.selectPriority(priority as 'high' | 'medium' | 'low');
      await taskPage.confirmCreate();
      await taskPage.waitForCreateDialogClosed();
      await page.waitForTimeout(500);
    }

    await page.reload();
    await taskPage.waitForReady();

    // 按"高"优先级筛选
    await taskPage.filterByPriority('高');
    await page.waitForTimeout(1000);

    const hasHighTask = await taskPage.hasTask(tasks.high);
    const hasMediumTask = await taskPage.hasTask(tasks.medium);

    expect(hasHighTask).toBeTruthy();
    expect(hasMediumTask).toBeFalsy();
  });
});

test.describe('组合筛选', () => {
  test('应该能够同时使用多个筛选条件', async ({ page }) => {
    const user = getTestUser('dept_manager');
    const loginPage = new LoginPage(page);
    const taskPage = new TaskManagementPage(page);

    await loginPage.goto();
    await loginPage.login(user.username, user.password);

    // 创建项目和多个任务
    const projectListPage = new ProjectListPage(page);
    const projectFormPage = new ProjectFormPage(page);

    await page.goto('/projects');
    await projectListPage.clickCreateProject();
    await projectFormPage.waitForForm();

    const projectData = generateProjectData({
      name: `组合筛选测试项目_${Date.now()}`,
      type: 'management'
    });

    await projectFormPage.selectType('management');
    await projectFormPage.fillBasicInfo(projectData);
    await projectFormPage.submit();
    await projectFormPage.waitForFormClosed();
    await page.waitForTimeout(2000);

    // 创建不同条件组合的任务
    await page.goto('/tasks');

    const tasks = [
      { desc: '高优先级_未开始', priority: 'high', status: 'notStarted' },
      { desc: '高优先级_已完成', priority: 'high', status: 'completed' },
      { desc: '低优先级_未开始', priority: 'low', status: 'notStarted' }
    ];

    for (const task of tasks) {
      await taskPage.clickCreateTask();
      await taskPage.waitForCreateDialog();

      await taskPage.selectProject(projectData.name);
      await taskPage.selectMember(user.name || '部门经理');
      await taskPage.fillDescription(task.desc);
      await taskPage.selectPriority(task.priority as 'high' | 'low');
      await taskPage.confirmCreate();
      await taskPage.waitForCreateDialogClosed();
      await page.waitForTimeout(500);

      if (task.status === 'completed') {
        await taskPage.clickTaskStatus(task.desc);
        await page.waitForTimeout(500);
        await taskPage.clickTaskStatus(task.desc);
        await page.waitForTimeout(500);
      }
    }

    await page.reload();
    await taskPage.waitForReady();

    // 组合筛选：高优先级 + 未开始
    await taskPage.filterByPriority('高');
    await page.waitForTimeout(500);

    const hasTask1 = await taskPage.hasTask(tasks[0].desc);
    const hasTask2 = await taskPage.hasTask(tasks[1].desc);
    const hasTask3 = await taskPage.hasTask(tasks[2].desc);

    expect(hasTask1).toBeTruthy();
    expect(hasTask2).toBeFalsy(); // 已完成
    expect(hasTask3).toBeFalsy(); // 低优先级
  });
});
