/**
 * 项目删除测试
 *
 * 测试项目删除的各种场景
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { ProjectListPage } from '../../src/pages/ProjectListPage';
import { ProjectFormPage } from '../../src/pages/ProjectFormPage';
import { getTestUser } from '../../src/data/test-users';
import { generateProjectData } from '../../src/data/test-projects';

test.describe('项目删除', () => {
  let projectName: string;

  test.beforeEach(async ({ page }) => {
    // 登录
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
      name: `待删除测试项目_${Date.now()}`,
      type: 'management'
    });
    projectName = projectData.name;

    await projectFormPage.selectType('management');
    await projectFormPage.fillBasicInfo(projectData);
    await projectFormPage.submit();
    await projectFormPage.waitForFormClosed();

    // 等待项目创建
    await page.waitForTimeout(2000);
  });

  test('应该能够删除项目', async ({ page }) => {
    const projectListPage = new ProjectListPage(page);

    // 刷新页面
    await page.goto('/projects');
    await projectListPage.waitForReady();

    // 验证项目存在
    const hasProjectBefore = await projectListPage.hasProject(projectName);
    expect(hasProjectBefore).toBeTruthy();

    // 点击删除按钮
    await projectListPage.clickDeleteProject(projectName);

    // 可能有确认对话框
    await page.waitForTimeout(500);
    const confirmDialog = page.locator('div[role="dialog"]:has-text("确认删除"), div[role="dialog"]:has-text("删除")');
    if (await confirmDialog.isVisible()) {
      await page.locator('button:has-text("确认"), button:has-text("删除")').click();
    }

    // 等待删除完成
    await page.waitForTimeout(2000);

    // 刷新页面
    await page.reload();
    await projectListPage.waitForReady();

    // 验证项目已删除
    const hasProjectAfter = await projectListPage.hasProject(projectName);
    expect(hasProjectAfter).toBeFalsy();
  });

  test('应该能够取消删除操作', async ({ page }) => {
    const projectListPage = new ProjectListPage(page);

    // 点击删除按钮
    await projectListPage.clickDeleteProject(projectName);

    // 如果有确认对话框，点击取消
    await page.waitForTimeout(500);
    const confirmDialog = page.locator('div[role="dialog"]:has-text("确认删除"), div[role="dialog"]:has-text("删除")');
    if (await confirmDialog.isVisible()) {
      await page.locator('button:has-text("取消")').click();
    }

    // 等待对话框关闭
    await page.waitForTimeout(1000);

    // 验证项目仍然存在
    const hasProject = await projectListPage.hasProject(projectName);
    expect(hasProject).toBeTruthy();
  });
});

test.describe('项目删除权限', () => {
  test('工程师不应该能够删除项目', async ({ page }) => {
    // 使用部门经理创建项目
    const deptManager = getTestUser('dept_manager');
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login(deptManager.username, deptManager.password);

    const projectListPage = new ProjectListPage(page);
    const projectFormPage = new ProjectFormPage(page);

    // 创建项目
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

    // 切换到工程师账号
    const engineer = getTestUser('engineer');
    await page.locator('button[aria-expanded]').click();
    await page.locator('button:has-text("退出登录")').click();
    await page.waitForURL('**/');

    await loginPage.login(engineer.username, engineer.password);

    // 导航到项目列表
    await page.goto('/projects');
    await page.waitForTimeout(1000);

    // 验证删除按钮不存在或不可见
    const projectCard = page.locator(`text="${projectData.name}"`).locator('..');
    const deleteButton = projectCard.locator('button:has-text("删除")');
    const isVisible = await deleteButton.isVisible().catch(() => false);
    expect(isVisible).toBeFalsy();
  });
});
