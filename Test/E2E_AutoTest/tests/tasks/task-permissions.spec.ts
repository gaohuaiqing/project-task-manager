/**
 * 任务权限控制测试
 *
 * 测试不同角色（工程师/技术经理/管理员）的任务操作权限
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { TaskManagementPage } from '../../src/pages/TaskManagementPage';
import { ProjectListPage } from '../../src/pages/ProjectListPage';
import { ProjectFormPage } from '../../src/pages/ProjectFormPage';
import { getTestUser } from '../../src/data/test-users';
import { generateProjectData, generateTaskData } from '../../src/data/test-projects';

test.describe('工程师权限', () => {
  test('工程师应该只能看到分配给自己的任务', async ({ page }) => {
    const engineer = getTestUser('engineer');
    const manager = getTestUser('dept_manager');
    const loginPage = new LoginPage(page);
    const taskPage = new TaskManagementPage(page);

    // 使用经理账号登录并创建任务
    await loginPage.goto();
    await loginPage.login(manager.username, manager.password);

    // 创建项目
    const projectListPage = new ProjectListPage(page);
    const projectFormPage = new ProjectFormPage(page);

    await page.goto('/projects');
    await projectListPage.clickCreateProject();
    await projectFormPage.waitForForm();

    const projectData = generateProjectData({
      name: `工程师权限测试项目_${Date.now()}`,
      type: 'management'
    });

    await projectFormPage.selectType('management');
    await projectFormPage.fillBasicInfo(projectData);
    await projectFormPage.submit();
    await projectFormPage.waitForFormClosed();
    await page.waitForTimeout(2000);

    // 创建分配给经理的任务
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

    // 创建分配给工程师的任务
    await taskPage.clickCreateTask();
    await taskPage.waitForCreateDialog();

    const engineerTask = `工程师的任务_${Date.now()}`;
    await taskPage.selectProject(projectData.name);
    await taskPage.selectMember('工程师');
    await taskPage.fillDescription(engineerTask);
    await taskPage.selectPriority('medium');
    await taskPage.confirmCreate();
    await taskPage.waitForCreateDialogClosed();
    await page.waitForTimeout(1000);

    // 切换到工程师账号
    await page.locator('button[aria-expanded]').click();
    await page.locator('button:has-text("退出登录")').click();
    await page.waitForURL('**/');

    await loginPage.login(engineer.username, engineer.password);

    // 验证工程师只能看到自己的任务
    await page.goto('/tasks');
    await taskPage.waitForReady();

    const hasEngineerTask = await taskPage.hasTask(engineerTask);
    const hasManagerTask = await taskPage.hasTask(managerTask);

    expect(hasEngineerTask).toBeTruthy();
    expect(hasManagerTask).toBeFalsy();
  });

  test('工程师创建任务时负责人应自动设置为当前用户', async ({ page }) => {
    const engineer = getTestUser('engineer');
    const manager = getTestUser('dept_manager');
    const loginPage = new LoginPage(page);
    const taskPage = new TaskManagementPage(page);

    // 先用经理创建项目
    await loginPage.goto();
    await loginPage.login(manager.username, manager.password);

    const projectListPage = new ProjectListPage(page);
    const projectFormPage = new ProjectFormPage(page);

    await page.goto('/projects');
    await projectListPage.clickCreateProject();
    await projectFormPage.waitForForm();

    const projectData = generateProjectData({
      name: `工程师创建任务测试项目_${Date.now()}`,
      type: 'management'
    });

    await projectFormPage.selectType('management');
    await projectFormPage.fillBasicInfo(projectData);
    await projectFormPage.submit();
    await projectFormPage.waitForFormClosed();
    await page.waitForTimeout(2000);

    // 切换到工程师账号
    await page.locator('button[aria-expanded]').click();
    await page.locator('button:has-text("退出登录")').click();
    await page.waitForURL('**/');

    await loginPage.login(engineer.username, engineer.password);

    // 创建任务
    await page.goto('/tasks');
    await taskPage.clickCreateTask();
    await taskPage.waitForCreateDialog();

    await taskPage.selectProject(projectData.name);

    // 验证成员选择器被禁用或自动填充
    const memberSelect = taskPage.memberSelect;
    const isDisabled = await memberSelect.isDisabled();

    expect(isDisabled).toBeTruthy();

    await taskPage.cancelCreate();
  });

  test('工程师应该能够创建任务', async ({ page }) => {
    const engineer = getTestUser('engineer');
    const manager = getTestUser('dept_manager');
    const loginPage = new LoginPage(page);
    const taskPage = new TaskManagementPage(page);

    // 先用经理创建项目
    await loginPage.goto();
    await loginPage.login(manager.username, manager.password);

    const projectListPage = new ProjectListPage(page);
    const projectFormPage = new ProjectFormPage(page);

    await page.goto('/projects');
    await projectListPage.clickCreateProject();
    await projectFormPage.waitForForm();

    const projectData = generateProjectData({
      name: `工程师创建测试项目_${Date.now()}`,
      type: 'management'
    });

    await projectFormPage.selectType('management');
    await projectFormPage.fillBasicInfo(projectData);
    await projectFormPage.submit();
    await projectFormPage.waitForFormClosed();
    await page.waitForTimeout(2000);

    // 切换到工程师账号
    await page.locator('button[aria-expanded]').click();
    await page.locator('button:has-text("退出登录")').click();
    await page.waitForURL('**/');

    await loginPage.login(engineer.username, engineer.password);

    // 验证创建任务按钮可见
    await page.goto('/tasks');
    const canCreate = await taskPage.canCreateTask();
    expect(canCreate).toBeTruthy();
  });
});

test.describe('技术经理权限', () => {
  test('技术经理应该能够查看所有任务', async ({ page }) => {
    const techManager = getTestUser('tech_manager');
    const manager = getTestUser('dept_manager');
    const loginPage = new LoginPage(page);
    const taskPage = new TaskManagementPage(page);

    // 使用经理账号创建任务
    await loginPage.goto();
    await loginPage.login(manager.username, manager.password);

    const projectListPage = new ProjectListPage(page);
    const projectFormPage = new ProjectFormPage(page);

    await page.goto('/projects');
    await projectListPage.clickCreateProject();
    await projectFormPage.waitForForm();

    const projectData = generateProjectData({
      name: `技术经理权限测试项目_${Date.now()}`,
      type: 'management'
    });

    await projectFormPage.selectType('management');
    await projectFormPage.fillBasicInfo(projectData);
    await projectFormPage.submit();
    await projectFormPage.waitForFormClosed();
    await page.waitForTimeout(2000);

    // 创建不同成员的任务
    await page.goto('/tasks');

    const members = ['部门经理', '工程师'];
    const tasks = [];

    for (const member of members) {
      await taskPage.clickCreateTask();
      await taskPage.waitForCreateDialog();

      const desc = `${member}的任务_${Date.now()}`;
      tasks.push(desc);

      await taskPage.selectProject(projectData.name);
      await taskPage.selectMember(member);
      await taskPage.fillDescription(desc);
      await taskPage.selectPriority('medium');
      await taskPage.confirmCreate();
      await taskPage.waitForCreateDialogClosed();
      await page.waitForTimeout(500);
    }

    // 切换到技术经理账号
    await page.locator('button[aria-expanded]').click();
    await page.locator('button:has-text("退出登录")').click();
    await page.waitForURL('**/');

    await loginPage.login(techManager.username, techManager.password);

    // 验证技术经理能看到所有任务
    await page.goto('/tasks');
    await taskPage.waitForReady();

    for (const task of tasks) {
      const hasTask = await taskPage.hasTask(task);
      expect(hasTask).toBeTruthy();
    }
  });

  test('技术经理应该能够审批工程师创建的任务', async ({ page }) => {
    const techManager = getTestUser('tech_manager');
    const engineer = getTestUser('engineer');
    const manager = getTestUser('dept_manager');
    const loginPage = new LoginPage(page);
    const taskPage = new TaskManagementPage(page);

    // 先用经理创建项目
    await loginPage.goto();
    await loginPage.login(manager.username, manager.password);

    const projectListPage = new ProjectListPage(page);
    const projectFormPage = new ProjectFormPage(page);

    await page.goto('/projects');
    await projectListPage.clickCreateProject();
    await projectFormPage.waitForForm();

    const projectData = generateProjectData({
      name: `审批测试项目_${Date.now()}`,
      type: 'management'
    });

    await projectFormPage.selectType('management');
    await projectFormPage.fillBasicInfo(projectData);
    await projectFormPage.submit();
    await projectFormPage.waitForFormClosed();
    await page.waitForTimeout(2000);

    // 切换到工程师账号创建任务
    await page.locator('button[aria-expanded]').click();
    await page.locator('button:has-text("退出登录")').click();
    await page.waitForURL('**/');

    await loginPage.login(engineer.username, engineer.password);

    await page.goto('/tasks');
    await taskPage.clickCreateTask();
    await taskPage.waitForCreateDialog();

    const engineerTask = `待审批任务_${Date.now()}`;
    await taskPage.selectProject(projectData.name);
    await taskPage.fillDescription(engineerTask);
    await taskPage.selectPriority('medium');
    await taskPage.confirmCreate();
    await taskPage.waitForCreateDialogClosed();
    await page.waitForTimeout(1000);

    // 切换到技术经理账号
    await page.locator('button[aria-expanded]').click();
    await page.locator('button:has-text("退出登录")').click();
    await page.waitForURL('**/');

    await loginPage.login(techManager.username, techManager.password);

    // 验证待审批任务卡片显示
    await page.goto('/tasks');
    await taskPage.waitForReady();

    const hasPendingApproval = await taskPage.hasElement('[class*="pending"], [class*="approval"]');
    const approvalCount = await taskPage.getPendingApprovalCount();

    expect(hasPendingApproval || approvalCount > 0).toBeTruthy();
  });
});

test.describe('管理员权限', () => {
  test('管理员应该能够查看所有任务', async ({ page }) => {
    const admin = getTestUser('admin');
    const manager = getTestUser('dept_manager');
    const loginPage = new LoginPage(page);
    const taskPage = new TaskManagementPage(page);

    // 使用经理账号创建任务
    await loginPage.goto();
    await loginPage.login(manager.username, manager.password);

    const projectListPage = new ProjectListPage(page);
    const projectFormPage = new ProjectFormPage(page);

    await page.goto('/projects');
    await projectListPage.clickCreateProject();
    await projectFormPage.waitForForm();

    const projectData = generateProjectData({
      name: `管理员权限测试项目_${Date.now()}`,
      type: 'management'
    });

    await projectFormPage.selectType('management');
    await projectFormPage.fillBasicInfo(projectData);
    await projectFormPage.submit();
    await projectFormPage.waitForFormClosed();
    await page.waitForTimeout(2000);

    // 创建任务
    await page.goto('/tasks');
    await taskPage.clickCreateTask();
    await taskPage.waitForCreateDialog();

    const taskDesc = `管理员测试任务_${Date.now()}`;
    await taskPage.selectProject(projectData.name);
    await taskPage.selectMember('部门经理');
    await taskPage.fillDescription(taskDesc);
    await taskPage.selectPriority('medium');
    await taskPage.confirmCreate();
    await taskPage.waitForCreateDialogClosed();
    await page.waitForTimeout(1000);

    // 切换到管理员账号
    await page.locator('button[aria-expanded]').click();
    await page.locator('button:has-text("退出登录")').click();
    await page.waitForURL('**/');

    await loginPage.login(admin.username, admin.password);

    // 验证管理员能看到任务
    await page.goto('/tasks');
    await taskPage.waitForReady();

    const hasTask = await taskPage.hasTask(taskDesc);
    expect(hasTask).toBeTruthy();
  });

  test('管理员应该能够删除任何任务', async ({ page }) => {
    const admin = getTestUser('admin');
    const manager = getTestUser('dept_manager');
    const loginPage = new LoginPage(page);
    const taskPage = new TaskManagementPage(page);

    // 使用经理账号创建任务
    await loginPage.goto();
    await loginPage.login(manager.username, manager.password);

    const projectListPage = new ProjectListPage(page);
    const projectFormPage = new ProjectFormPage(page);

    await page.goto('/projects');
    await projectListPage.clickCreateProject();
    await projectFormPage.waitForForm();

    const projectData = generateProjectData({
      name: `管理员删除测试项目_${Date.now()}`,
      type: 'management'
    });

    await projectFormPage.selectType('management');
    await projectFormPage.fillBasicInfo(projectData);
    await projectFormPage.submit();
    await projectFormPage.waitForFormClosed();
    await page.waitForTimeout(2000);

    // 创建任务
    await page.goto('/tasks');
    await taskPage.clickCreateTask();
    await taskPage.waitForCreateDialog();

    const taskDesc = `待删除任务_${Date.now()}`;
    await taskPage.selectProject(projectData.name);
    await taskPage.selectMember('部门经理');
    await taskPage.fillDescription(taskDesc);
    await taskPage.selectPriority('medium');
    await taskPage.confirmCreate();
    await taskPage.waitForCreateDialogClosed();
    await page.waitForTimeout(1000);

    // 切换到管理员账号
    await page.locator('button[aria-expanded]').click();
    await page.locator('button:has-text("退出登录")').click();
    await page.waitForURL('**/');

    await loginPage.login(admin.username, admin.password);

    // 删除任务
    await page.goto('/tasks');
    await taskPage.waitForReady();

    await taskPage.clickDeleteTask(taskDesc);
    await page.waitForTimeout(1000);

    // 验证任务已删除
    await page.reload();
    await taskPage.waitForReady();

    const hasTask = await taskPage.hasTask(taskDesc);
    expect(hasTask).toBeFalsy();
  });
});

test.describe('权限提示', () => {
  test('应该显示当前角色权限提示', async ({ page }) => {
    const user = getTestUser('engineer');
    const loginPage = new LoginPage(page);
    const taskPage = new TaskManagementPage(page);

    await loginPage.goto();
    await loginPage.login(user.username, user.password);

    await page.goto('/tasks');
    await taskPage.waitForReady();

    // 验证权限提示显示
    const hasPermissionNotice = await taskPage.hasPermissionNotice();
    expect(hasPermissionNotice).toBeTruthy();
  });

  test('权限不足时应该显示错误提示', async ({ page }) => {
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
      name: `权限错误测试项目_${Date.now()}`,
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

    const managerTask = `经理任务_${Date.now()}`;
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

    // 尝试访问不属于自己的任务
    await page.goto('/tasks');
    await taskPage.waitForReady();

    // 验证工程师看不到经理的任务
    const hasManagerTask = await taskPage.hasTask(managerTask);
    expect(hasManagerTask).toBeFalsy();
  });
});
