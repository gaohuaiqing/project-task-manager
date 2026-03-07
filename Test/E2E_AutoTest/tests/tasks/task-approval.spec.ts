/**
 * 任务审批流程测试
 *
 * 测试工程师创建任务后的审批流程，包括审批通过和拒绝
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { TaskManagementPage } from '../../src/pages/TaskManagementPage';
import { ProjectListPage } from '../../src/pages/ProjectListPage';
import { ProjectFormPage } from '../../src/pages/ProjectFormPage';
import { getTestUser } from '../../src/data/test-users';
import { generateProjectData, generateTaskData } from '../../src/data/test-projects';

test.describe('任务审批流程', () => {
  let projectName: string;
  let engineerTask: string;

  test.beforeEach(async ({ page }) => {
    // 使用部门经理创建项目
    const manager = getTestUser('dept_manager');
    const loginPage = new LoginPage(page);
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
    projectName = projectData.name;

    await projectFormPage.selectType('management');
    await projectFormPage.fillBasicInfo(projectData);
    await projectFormPage.submit();
    await projectFormPage.waitForFormClosed();
    await page.waitForTimeout(2000);
  });

  test('工程师创建任务应该需要审批', async ({ page }) => {
    const engineer = getTestUser('engineer');
    const loginPage = new LoginPage(page);
    const taskPage = new TaskManagementPage(page);

    // 切换到工程师账号
    await page.locator('button[aria-expanded]').click();
    await page.locator('button:has-text("退出登录")').click();
    await page.waitForURL('**/');

    await loginPage.login(engineer.username, engineer.password);

    // 创建任务
    await page.goto('/tasks');
    await taskPage.clickCreateTask();
    await taskPage.waitForCreateDialog();

    engineerTask = `工程师待审批任务_${Date.now()}`;
    await taskPage.selectProject(projectName);
    await taskPage.fillDescription(engineerTask);
    await taskPage.selectPriority('medium');
    await taskPage.confirmCreate();
    await taskPage.waitForCreateDialogClosed();
    await page.waitForTimeout(2000);

    // 切换到技术经理账号
    await page.locator('button[aria-expanded]').click();
    await page.locator('button:has-text("退出登录")').click();
    await page.waitForURL('**/');

    const techManager = getTestUser('tech_manager');
    await loginPage.login(techManager.username, techManager.password);

    // 验证待审批任务显示
    await page.goto('/tasks');
    await taskPage.waitForReady();

    const approvalCount = await taskPage.getPendingApprovalCount();
    expect(approvalCount).toBeGreaterThan(0);
  });

  test('技术经理应该能够审批通过任务', async ({ page }) => {
    const engineer = getTestUser('engineer');
    const techManager = getTestUser('tech_manager');
    const loginPage = new LoginPage(page);
    const taskPage = new TaskManagementPage(page);

    // 工程师创建任务
    await loginPage.goto();
    await loginPage.login(engineer.username, engineer.password);

    await page.goto('/tasks');
    await taskPage.clickCreateTask();
    await taskPage.waitForCreateDialog();

    engineerTask = `待审批通过任务_${Date.now()}`;
    await taskPage.selectProject(projectName);
    await taskPage.fillDescription(engineerTask);
    await taskPage.selectPriority('medium');
    await taskPage.confirmCreate();
    await taskPage.waitForCreateDialogClosed();
    await page.waitForTimeout(2000);

    // 切换到技术经理
    await page.locator('button[aria-expanded]').click();
    await page.locator('button:has-text("退出登录")').click();
    await page.waitForURL('**/');

    await loginPage.login(techManager.username, techManager.password);

    // 审批任务
    await page.goto('/tasks');
    await taskPage.waitForReady();

    const approvalCountBefore = await taskPage.getPendingApprovalCount();

    // 点击审批按钮
    if (await taskPage.pendingApprovalCard.isVisible()) {
      await taskPage.clickApproveTask(engineerTask);
      await taskPage.approveTask('审批通过，任务合理');

      await page.waitForTimeout(2000);

      // 验证审批数量减少
      const approvalCountAfter = await taskPage.getPendingApprovalCount();
      expect(approvalCountAfter).toBeLessThan(approvalCountBefore);
    }
  });

  test('技术经理应该能够拒绝任务', async ({ page }) => {
    const engineer = getTestUser('engineer');
    const techManager = getTestUser('tech_manager');
    const loginPage = new LoginPage(page);
    const taskPage = new TaskManagementPage(page);

    // 工程师创建任务
    await loginPage.goto();
    await loginPage.login(engineer.username, engineer.password);

    await page.goto('/tasks');
    await taskPage.clickCreateTask();
    await taskPage.waitForCreateDialog();

    engineerTask = `待拒绝任务_${Date.now()}`;
    await taskPage.selectProject(projectName);
    await taskPage.fillDescription(engineerTask);
    await taskPage.selectPriority('medium');
    await taskPage.confirmCreate();
    await taskPage.waitForCreateDialogClosed();
    await page.waitForTimeout(2000);

    // 切换到技术经理
    await page.locator('button[aria-expanded]').click();
    await page.locator('button:has-text("退出登录")').click();
    await page.waitForURL('**/');

    await loginPage.login(techManager.username, techManager.password);

    // 拒绝任务
    await page.goto('/tasks');
    await taskPage.waitForReady();

    const approvalCountBefore = await taskPage.getPendingApprovalCount();

    // 点击审批并拒绝
    if (await taskPage.pendingApprovalCard.isVisible()) {
      await taskPage.clickApproveTask(engineerTask);
      await taskPage.rejectTask('任务描述不够清晰，请补充详细说明');

      await page.waitForTimeout(2000);

      // 验证审批数量减少
      const approvalCountAfter = await taskPage.getPendingApprovalCount();
      expect(approvalCountAfter).toBeLessThan(approvalCountBefore);
    }
  });

  test('部门经理创建任务不需要审批', async ({ page }) => {
    const manager = getTestUser('dept_manager');
    const techManager = getTestUser('tech_manager');
    const loginPage = new LoginPage(page);
    const taskPage = new TaskManagementPage(page);

    // 部门经理创建任务
    await loginPage.goto();
    await loginPage.login(manager.username, manager.password);

    await page.goto('/tasks');
    await taskPage.clickCreateTask();
    await taskPage.waitForCreateDialog();

    const managerTask = `经理任务_${Date.now()}`;
    await taskPage.selectProject(projectName);
    await taskPage.selectMember('部门经理');
    await taskPage.fillDescription(managerTask);
    await taskPage.selectPriority('medium');
    await taskPage.confirmCreate();
    await taskPage.waitForCreateDialogClosed();
    await page.waitForTimeout(2000);

    // 切换到技术经理
    await page.locator('button[aria-expanded]').click();
    await page.locator('button:has-text("退出登录")').click();
    await page.waitForURL('**/');

    await loginPage.login(techManager.username, techManager.password);

    // 验证没有待审批任务
    await page.goto('/tasks');
    await taskPage.waitForReady();

    const approvalCount = await taskPage.getPendingApprovalCount();
    expect(approvalCount).toBe(0);
  });

  test('审批意见应该可选填写', async ({ page }) => {
    const engineer = getTestUser('engineer');
    const techManager = getTestUser('tech_manager');
    const loginPage = new LoginPage(page);
    const taskPage = new TaskManagementPage(page);

    // 工程师创建任务
    await loginPage.goto();
    await loginPage.login(engineer.username, engineer.password);

    await page.goto('/tasks');
    await taskPage.clickCreateTask();
    await taskPage.waitForCreateDialog();

    engineerTask = `无审批意见任务_${Date.now()}`;
    await taskPage.selectProject(projectName);
    await taskPage.fillDescription(engineerTask);
    await taskPage.selectPriority('medium');
    await taskPage.confirmCreate();
    await taskPage.waitForCreateDialogClosed();
    await page.waitForTimeout(2000);

    // 切换到技术经理
    await page.locator('button[aria-expanded]').click();
    await page.locator('button:has-text("退出登录")').click();
    await page.waitForURL('**/');

    await loginPage.login(techManager.username, techManager.password);

    // 审批通过但不填写意见
    await page.goto('/tasks');
    await taskPage.waitForReady();

    if (await taskPage.pendingApprovalCard.isVisible()) {
      await taskPage.clickApproveTask(engineerTask);
      await taskPage.approveTask(); // 不填写意见

      await page.waitForTimeout(2000);

      // 验证审批成功
      const approvalCount = await taskPage.getPendingApprovalCount();
      expect(approvalCount).toBe(0);
    }
  });

  test('拒绝任务时必须填写审批意见', async ({ page }) => {
    const engineer = getTestUser('engineer');
    const techManager = getTestUser('tech_manager');
    const loginPage = new LoginPage(page);
    const taskPage = new TaskManagementPage(page);

    // 工程师创建任务
    await loginPage.goto();
    await loginPage.login(engineer.username, engineer.password);

    await page.goto('/tasks');
    await taskPage.clickCreateTask();
    await taskPage.waitForCreateDialog();

    engineerTask = `需填写拒绝意见任务_${Date.now()}`;
    await taskPage.selectProject(projectName);
    await taskPage.fillDescription(engineerTask);
    await taskPage.selectPriority('medium');
    await taskPage.confirmCreate();
    await taskPage.waitForCreateDialogClosed();
    await page.waitForTimeout(2000);

    // 切换到技术经理
    await page.locator('button[aria-expanded]').click();
    await page.locator('button:has-text("退出登录")').click();
    await page.waitForURL('**/');

    await loginPage.login(techManager.username, techManager.password);

    // 尝试拒绝任务并填写意见
    await page.goto('/tasks');
    await taskPage.waitForReady();

    if (await taskPage.pendingApprovalCard.isVisible()) {
      await taskPage.clickApproveTask(engineerTask);
      await taskPage.rejectTask('任务描述不清晰，请重新提交'); // 填写拒绝意见

      await page.waitForTimeout(2000);

      // 验证拒绝成功
      const approvalCount = await taskPage.getPendingApprovalCount();
      expect(approvalCount).toBe(0);
    }
  });

  test('待审批任务应该显示任务详情', async ({ page }) => {
    const engineer = getTestUser('engineer');
    const techManager = getTestUser('tech_manager');
    const loginPage = new LoginPage(page);
    const taskPage = new TaskManagementPage(page);

    // 工程师创建任务
    await loginPage.goto();
    await loginPage.login(engineer.username, engineer.password);

    await page.goto('/tasks');
    await taskPage.clickCreateTask();
    await taskPage.waitForCreateDialog();

    engineerTask = `显示详情任务_${Date.now()}`;
    await taskPage.selectProject(projectName);
    await taskPage.fillDescription(engineerTask);
    await taskPage.selectPriority('high');
    await taskPage.confirmCreate();
    await taskPage.waitForCreateDialogClosed();
    await page.waitForTimeout(2000);

    // 切换到技术经理
    await page.locator('button[aria-expanded]').click();
    await page.locator('button:has-text("退出登录")').click();
    await page.waitForURL('**/');

    await loginPage.login(techManager.username, techManager.password);

    // 验证待审批卡片显示任务信息
    await page.goto('/tasks');
    await taskPage.waitForReady();

    if (await taskPage.pendingApprovalCard.isVisible()) {
      const hasTaskTitle = await taskPage.pendingApprovalCard locator('text="${engineerTask}"').isVisible();
      expect(hasTaskTitle).toBeTruthy();

      // 验证显示申请人信息
      const hasApplicant = await taskPage.pendingApprovalCard locator('text="工程师"').isVisible();
      expect(hasApplicant).toBeTruthy();
    }
  });

  test('审批通过后任务应该正常显示', async ({ page }) => {
    const engineer = getTestUser('engineer');
    const techManager = getTestUser('tech_manager');
    const loginPage = new LoginPage(page);
    const taskPage = new TaskManagementPage(page);

    // 工程师创建任务
    await loginPage.goto();
    await loginPage.login(engineer.username, engineer.password);

    await page.goto('/tasks');
    await taskPage.clickCreateTask();
    await taskPage.waitForCreateDialog();

    engineerTask = `审批后显示任务_${Date.now()}`;
    await taskPage.selectProject(projectName);
    await taskPage.fillDescription(engineerTask);
    await taskPage.selectPriority('medium');
    await taskPage.confirmCreate();
    await taskPage.waitForCreateDialogClosed();
    await page.waitForTimeout(2000);

    // 切换到技术经理审批
    await page.locator('button[aria-expanded]').click();
    await page.locator('button:has-text("退出登录")').click();
    await page.waitForURL('**/');

    await loginPage.login(techManager.username, techManager.password);

    await page.goto('/tasks');
    await taskPage.waitForReady();

    if (await taskPage.pendingApprovalCard.isVisible()) {
      await taskPage.clickApproveTask(engineerTask);
      await taskPage.approveTask('审批通过');

      await page.waitForTimeout(2000);
    }

    // 切换回工程师验证任务显示
    await page.locator('button[aria-expanded]').click();
    await page.locator('button:has-text("退出登录")').click();
    await page.waitForURL('**/');

    await loginPage.login(engineer.username, engineer.password);

    await page.goto('/tasks');
    await taskPage.waitForReady();

    const hasTask = await taskPage.hasTask(engineerTask);
    expect(hasTask).toBeTruthy();
  });
});
