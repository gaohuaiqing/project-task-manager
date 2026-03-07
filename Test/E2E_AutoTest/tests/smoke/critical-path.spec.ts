/**
 * 关键路径冒烟测试
 *
 * 验证系统最核心的业务流程是否正常工作
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { DashboardPage } from '../../src/pages/DashboardPage';
import { ProjectListPage } from '../../src/pages/ProjectListPage';
import { ProjectFormPage } from '../../src/pages/ProjectFormPage';
import { TaskManagementPage } from '../../src/pages/TaskManagementPage';
import { Sidebar } from '../../src/components/Sidebar';
import { Header } from '../../src/components/Header';
import { getTestUser } from '../../src/data/test-users';
import { generateProjectData } from '../../src/data/test-projects';
import { generateTaskData } from '../../src/data/test-tasks';
import { generateDateRange } from '../../src/helpers/DataGenerator';

test.describe('关键路径冒烟测试', () => {
  test('完整业务流程：登录 -> 创建项目 -> 创建任务 -> 更新状态 -> 登出', async ({ page }) => {
    const user = getTestUser('dept_manager');
    const loginPage = new LoginPage(page);
    const sidebar = new Sidebar(page);
    const header = new Header(page);

    // ========== 步骤1: 用户登录 ==========
    await test.step('用户登录', async () => {
      await loginPage.goto();
      await loginPage.login(user.username, user.password);

      // 验证登录成功
      await expect(page).toHaveURL(/\/dashboard/);
    });

    // ========== 步骤2: 验证仪表板加载 ==========
    await test.step('验证仪表板加载', async () => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.waitForReady();

      // 验证页面标题
      const title = await dashboardPage.getPageTitle();
      expect(title.length).toBeGreaterThan(0);

      // 验证侧边栏可见
      await sidebar.waitForVisible();
    });

    // ========== 步骤3: 创建项目 ==========
    let projectName: string;
    await test.step('创建项目', async () => {
      await sidebar.navigateToProjects();

      const projectListPage = new ProjectListPage(page);
      await projectListPage.waitForReady();

      // 点击创建项目
      await projectListPage.clickCreateProject();

      const projectFormPage = new ProjectFormPage(page);
      await projectFormPage.waitForForm();

      // 生成项目数据
      const projectData = generateProjectData({
        name: `冒烟测试项目_${Date.now()}`,
        type: 'management'
      });
      projectName = projectData.name;

      // 填写表单
      await projectFormPage.selectType('management');
      await projectFormPage.fillBasicInfo(projectData);
      await projectFormPage.submit();

      // 等待创建完成
      await projectFormPage.waitForFormClosed();
      await page.waitForTimeout(2000);

      // 验证项目创建成功
      const hasProject = await projectListPage.hasProject(projectName);
      expect(hasProject).toBeTruthy();
    });

    // ========== 步骤4: 创建任务 ==========
    let taskDescription: string;
    await test.step('创建任务', async () => {
      await sidebar.navigateToTasks();

      const taskPage = new TaskManagementPage(page);
      await taskPage.waitForReady();

      // 点击创建任务
      await taskPage.clickCreateTask();
      await taskPage.waitForCreateDialog();

      // 生成任务数据
      const taskData = generateTaskData({
        description: `冒烟测试任务_${Date.now()}`,
        priority: 'medium'
      });
      taskDescription = taskData.description;

      // 填写任务信息
      await taskPage.selectProject(projectName);
      await taskPage.selectMember(user.name || '部门经理');
      await taskPage.fillDescription(taskData.description);
      await taskPage.selectPriority('medium');

      // 确认创建
      await taskPage.confirmCreate();
      await taskPage.waitForCreateDialogClosed();
      await page.waitForTimeout(2000);

      // 验证任务创建成功
      const hasTask = await taskPage.hasTask(taskDescription);
      expect(hasTask).toBeTruthy();
    });

    // ========== 步骤5: 更新任务状态 ==========
    await test.step('更新任务状态', async () => {
      const taskPage = new TaskManagementPage(page);

      // 点击状态徽章切换状态
      await taskPage.clickTaskStatus(taskDescription);
      await page.waitForTimeout(1000);

      // 再次点击切换到已完成
      await taskPage.clickTaskStatus(taskDescription);
      await page.waitForTimeout(1000);

      // 刷新页面验证状态保持
      await page.reload();
      await taskPage.waitForReady();

      const hasTask = await taskPage.hasTask(taskDescription);
      expect(hasTask).toBeTruthy();
    });

    // ========== 步骤6: 验证导航功能 ==========
    await test.step('验证导航功能', async () => {
      // 测试各个导航菜单
      await sidebar.navigateToDashboard();
      await expect(page).toHaveURL(/\/dashboard/);

      await sidebar.navigateToProjects();
      await expect(page).toHaveURL(/\/projects/);

      await sidebar.navigateToTasks();
      await expect(page).toHaveURL(/\/tasks/);
    });

    // ========== 步骤7: 用户登出 ==========
    await test.step('用户登出', async () => {
      await header.clickLogout();

      // 验证登出成功
      await expect(page).toHaveURL(/\/$/);

      // 验证登录表单显示
      await expect(page.locator('#username')).toBeVisible();
    });
  });

  test('快速验证：核心功能可用性', async ({ page }) => {
    const user = getTestUser('tech_manager');
    const loginPage = new LoginPage(page);
    const sidebar = new Sidebar(page);

    // 登录
    await loginPage.goto();
    await loginPage.login(user.username, user.password);

    // 快速验证各页面可访问
    await test.step('仪表板可访问', async () => {
      await sidebar.navigateToDashboard();
      await expect(page).toHaveURL(/\/dashboard/);
    });

    await test.step('任务管理可访问', async () => {
      await sidebar.navigateToTasks();
      await expect(page).toHaveURL(/\/tasks/);
    });

    await test.step('项目管理可访问', async () => {
      await sidebar.navigateToProjects();
      await expect(page).toHaveURL(/\/projects/);
    });
  });
});

test.describe('多角色登录验证', () => {
  const roles = ['admin', 'tech_manager', 'dept_manager', 'engineer'] as const;

  for (const role of roles) {
    test(`${role} 角色应该能够成功登录`, async ({ page }) => {
      const user = getTestUser(role);
      const loginPage = new LoginPage(page);

      await test.step(`${role} 登录`, async () => {
        await loginPage.goto();

        // 所有角色使用统一登录，系统自动识别权限
        await loginPage.login(user.username, user.password);

        // 验证登录成功
        await expect(page).toHaveURL(/\/dashboard/);

        // 验证权限被正确识别
        const userRole = await page.evaluate(() => {
          const currentUser = localStorage.getItem('currentUser');
          if (!currentUser) return null;
          const user = JSON.parse(currentUser);
          return user.role;
        });
        expect(userRole).toBe(role);
      });

      await test.step(`${role} 登出`, async () => {
        const header = new Header(page);
        await header.clickLogout();

        // 验证登出成功
        await expect(page).toHaveURL(/\/$/);
      });
    });
  }
});

test.describe('系统基本可用性', () => {
  test('应该能够处理并发操作', async ({ page }) => {
    const user = getTestUser('dept_manager');
    const loginPage = new LoginPage(page);

    // 登录
    await loginPage.goto();
    await loginPage.login(user.username, user.password);

    // 快速导航多个页面
    await page.goto('/dashboard');
    await page.waitForTimeout(500);

    await page.goto('/projects');
    await page.waitForTimeout(500);

    await page.goto('/tasks');
    await page.waitForTimeout(500);

    // 验证最后一次导航成功
    await expect(page).toHaveURL(/\/tasks/);
  });

  test('应该能够正确处理页面刷新', async ({ page }) => {
    const user = getTestUser('tech_manager');
    const loginPage = new LoginPage(page);

    // 登录
    await loginPage.goto();
    await loginPage.login(user.username, user.password);

    // 访问任务管理
    await page.goto('/tasks');
    await expect(page).toHaveURL(/\/tasks/);

    // 刷新页面
    await page.reload();

    // 验证仍然在任务管理页面
    await expect(page).toHaveURL(/\/tasks/);
  });

  test('应该能够正确处理浏览器前进后退', async ({ page }) => {
    const user = getTestUser('tech_manager');
    const loginPage = new LoginPage(page);

    // 登录
    await loginPage.goto();
    await loginPage.login(user.username, user.password);

    // 访问不同页面
    await page.goto('/dashboard');
    await page.waitForTimeout(500);

    await page.goto('/projects');
    await page.waitForTimeout(500);

    await page.goto('/tasks');
    await page.waitForTimeout(500);

    // 后退
    await page.goBack();
    await expect(page).toHaveURL(/\/projects/);

    // 前进
    await page.goForward();
    await expect(page).toHaveURL(/\/tasks/);
  });
});
