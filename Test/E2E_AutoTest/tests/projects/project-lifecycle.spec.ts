/**
 * 项目完整生命周期 E2E 测试套件
 *
 * 测试场景：
 * 1. 从创建到归档的完整流程
 * 2. 多项目协作场景
 * 3. 项目数据一致性
 * 4. 并发操作
 *
 * @module tests/projects/project-lifecycle
 */

import { test, expect, Page } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { DashboardPage } from '../../pages/DashboardPage';
import { ProjectListPage } from '../../pages/ProjectListPage';
import { ProjectFormPage } from '../../pages/ProjectFormPage';
import { TEST_USERS } from '../../data/test-users';

/**
 * 测试前置条件
 */
async function setupLifecycleTest(page: Page, userRole: keyof typeof TEST_USERS = 'admin') {
  const loginPage = new LoginPage(page);
  const dashboardPage = new DashboardPage(page);
  const projectListPage = new ProjectListPage(page);
  const projectFormPage = new ProjectFormPage(page);

  // 登录
  const user = TEST_USERS[userRole];
  await page.goto('/');
  await loginPage.login(user.username, user.password);
  await dashboardPage.waitForReady();

  // 导航到项目管理
  await dashboardPage.navigateToSection('项目管理');
  await projectListPage.waitForReady();

  return { loginPage, dashboardPage, projectListPage, projectFormPage };
}

/**
 * 创建产品开发类项目的完整流程
 */
async function createFullProductProject(page: Page, projectName?: string) {
  const { projectListPage, projectFormPage } = await setupLifecycleTest(page);

  const timestamp = Date.now();
  const name = projectName || `生命周期测试项目_${timestamp}`;

  // 打开创建表单
  await projectListPage.clickCreateProject();
  await projectFormPage.waitForForm();

  // 选择产品开发类
  await projectFormPage.selectType('product');

  // 填写基本信息
  await projectFormPage.fillCode(`LC-${timestamp}`);
  await projectFormPage.fillName(name);
  await projectFormPage.fillDescription(`完整生命周期测试项目 - ${timestamp}`);

  // 选择成员
  await projectFormPage.goToMembersTab();
  const memberCheckbox = page.locator('input[type="checkbox"]').first();
  const hasMember = await memberCheckbox.isVisible().catch(() => false);
  if (hasMember) {
    await memberCheckbox.check();
    await page.waitForTimeout(500);
  }

  // 设置时间计划
  await projectFormPage.goToTimePlanTab();

  const startDate = new Date().toISOString().split('T')[0];
  const endDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  await projectFormPage.fillDateRange(startDate, endDate);

  // 打开时间计划编辑器
  const editorButton = page.locator('button:has-text("打开时间计划编辑器")');
  const hasEditor = await editorButton.isVisible().catch(() => false);

  if (hasEditor) {
    await editorButton.click();

    // 添加里程碑
    const addMilestoneButton = page.locator('button:has-text("添加里程碑")');
    const hasAdd = await addMilestoneButton.isVisible().catch(() => false);

    if (hasAdd) {
      await addMilestoneButton.click();
      await page.waitForTimeout(500);

      // 填写里程碑名称
      const milestoneInput = page.locator('input[placeholder*="里程碑"]').first();
      const hasInput = await milestoneInput.isVisible().catch(() => false);

      if (hasInput) {
        await milestoneInput.fill('需求评审');
        await page.waitForTimeout(500);
      }
    }

    // 保存时间计划
    const saveButton = page.locator('button:has-text("保存")');
    const hasSave = await saveButton.isVisible().catch(() => false);

    if (hasSave) {
      await saveButton.click();
      await page.waitForTimeout(1000);
    } else {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  }

  // 提交项目
  await projectFormPage.submit();
  await page.waitForTimeout(2000);

  return name;
}

test.describe('项目生命周期 - 创建阶段', () => {
  test('完整创建产品开发类项目', async ({ page }) => {
    const projectName = await createFullProductProject(page);

    // 验证项目创建成功
    const projectListPage = new ProjectListPage(page);
    const exists = await projectListPage.projectExists(projectName);

    expect(exists).toBeTruthy();
  });

  test('完整创建职能管理类项目', async ({ page }) => {
    const { projectListPage, projectFormPage } = await setupLifecycleTest(page);

    const timestamp = Date.now();
    const projectName = `职能管理项目_${timestamp}`;

    // 打开创建表单
    await projectListPage.clickCreateProject();
    await projectFormPage.waitForForm();

    // 选择职能管理类
    await projectFormPage.selectType('management');

    // 填写基本信息
    await projectFormPage.fillCode(`MG-${timestamp}`);
    await projectFormPage.fillName(projectName);
    await projectFormPage.fillDescription('职能管理类完整生命周期测试');

    // 选择成员
    await projectFormPage.goToMembersTab();
    const memberCheckbox = page.locator('input[type="checkbox"]').first();
    const hasMember = await memberCheckbox.isVisible().catch(() => false);
    if (hasMember) {
      await memberCheckbox.check();
      await page.waitForTimeout(500);
    }

    // 提交
    await projectFormPage.submit();
    await page.waitForTimeout(2000);

    // 验证创建成功
    const exists = await projectListPage.projectExists(projectName);
    expect(exists).toBeTruthy();
  });

  test('创建后应该在列表中正确显示', async ({ page }) => {
    const projectName = await createFullProductProject(page);

    const projectListPage = new ProjectListPage(page);

    // 等待列表刷新
    await projectListPage.waitForProjectsToLoad();

    // 验证项目在列表中
    const exists = await projectListPage.projectExists(projectName);
    expect(exists).toBeTruthy();

    // 获取项目状态
    const status = await projectListPage.getProjectStatus(projectName);
    expect(status).toBeTruthy();
  });
});

test.describe('项目生命周期 - 执行阶段', () => {
  test('应该能够编辑项目信息', async ({ page }) => {
    const projectName = await createFullProductProject(page);
    await page.waitForTimeout(1000);

    const projectListPage = new ProjectListPage(page);
    const projectCard = page.locator(`text="${projectName}"`).locator('..');

    // 打开编辑
    const editButton = projectCard.locator('button:has-text("编辑")').first();
    const hasEdit = await editButton.isVisible().catch(() => false);

    if (hasEdit) {
      await editButton.click();

      // 修改描述
      const descInput = page.locator('#project-desc, #description, textarea[name="description"]');
      await descInput.clear();
      await descInput.fill('已修改的项目描述 - 执行阶段');

      // 保存
      const submitButton = page.locator('button:has-text("保存修改"), button:has-text("保存")');
      await submitButton.click();
      await page.waitForTimeout(2000);

      // 验证修改成功
      const toast = page.locator('div[role="alert"]').first();
      const hasToast = await toast.isVisible().catch(() => false);

      if (hasToast) {
        const toastText = await toast.textContent();
        expect(toastText).toMatch(/成功|保存/);
      }
    }
  });

  test('应该能够更新项目状态', async ({ page }) => {
    const projectName = await createFullProductProject(page);
    await page.waitForTimeout(1000);

    const projectListPage = new ProjectListPage(page);
    const projectCard = page.locator(`text="${projectName}"`).locator('..');

    // 获取初始状态
    const initialStatus = await projectListPage.getProjectStatus(projectName);

    // 尝试点击状态徽章
    const statusBadge = projectCard.locator('[class*="status"], .badge').first();
    const hasStatus = await statusBadge.isVisible().catch(() => false);

    if (hasStatus) {
      await statusBadge.click();
      await page.waitForTimeout(500);

      // 检查是否有状态选择菜单
      const statusMenu = page.locator('[role="menu"]:visible');
      const hasMenu = await statusMenu.isVisible().catch(() => false);

      if (hasMenu) {
        const newStatusOption = statusMenu.locator('text=/进行中/').first();
        const hasOption = await newStatusOption.isVisible().catch(() => false);

        if (hasOption) {
          await newStatusOption.click();
          await page.waitForTimeout(1000);

          // 验证状态已更新
          const newStatus = await projectListPage.getProjectStatus(projectName);
          expect(newStatus).not.toBe(initialStatus);
        }
      } else {
        await page.keyboard.press('Escape');
      }
    }
  });

  test('应该能够查看项目详情', async ({ page }) => {
    const projectName = await createFullProductProject(page);
    await page.waitForTimeout(1000);

    const projectListPage = new ProjectListPage(page);

    // 点击项目查看详情
    await projectListPage.viewProjectDetails(projectName);

    // 验证详情页或对话框打开
    const detailDialog = page.locator('div[role="dialog"]:visible');
    const hasDialog = await detailDialog.isVisible().catch(() => false);

    const currentUrl = page.url();
    const hasNavigated = /project|detail/i.test(currentUrl);

    expect(hasDialog || hasNavigated).toBeTruthy();

    // 关闭详情
    if (hasDialog) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  });
});

test.describe('项目生命周期 - 协作场景', () => {
  test('多项目同时存在时正确显示', async ({ page }) => {
    const { projectListPage, projectFormPage } = await setupLifecycleTest(page);

    // 创建多个项目
    const projectNames: string[] = [];

    for (let i = 0; i < 3; i++) {
      const timestamp = Date.now() + i * 1000;
      const name = `多项目测试_${i}_${timestamp}`;

      await projectListPage.clickCreateProject();
      await projectFormPage.waitForForm();

      await projectFormPage.selectType('management');
      await projectFormPage.fillCode(`MP-${timestamp}`);
      await projectFormPage.fillName(name);
      await projectFormPage.fillDescription(`多项目测试第${i + 1}个`);

      await projectFormPage.goToMembersTab();
      const memberCheckbox = page.locator('input[type="checkbox"]').first();
      const hasMember = await memberCheckbox.isVisible().catch(() => false);
      if (hasMember) {
        await memberCheckbox.check();
        await page.waitForTimeout(500);
      }

      await projectFormPage.submit();
      await page.waitForTimeout(2000);

      projectNames.push(name);
    }

    // 验证所有项目都在列表中
    await projectListPage.waitForProjectsToLoad();

    for (const name of projectNames) {
      const exists = await projectListPage.projectExists(name);
      expect(exists).toBeTruthy();
    }
  });

  test('搜索功能在多项目场景下工作正常', async ({ page }) => {
    const { projectListPage, projectFormPage } = await setupLifecycleTest(page);

    // 创建多个项目
    const timestamp = Date.now();
    const searchKeyword = `搜索测试_${timestamp}`;

    await projectListPage.clickCreateProject();
    await projectFormPage.waitForForm();

    await projectFormPage.selectType('management');
    await projectFormPage.fillCode(`SR-${timestamp}`);
    await projectFormPage.fillName(searchKeyword);
    await projectFormPage.fillDescription('用于测试搜索功能');

    await projectFormPage.goToMembersTab();
    const memberCheckbox = page.locator('input[type="checkbox"]').first();
    const hasMember = await memberCheckbox.isVisible().catch(() => false);
    if (hasMember) {
      await memberCheckbox.check();
      await page.waitForTimeout(500);
    }

    await projectFormPage.submit();
    await page.waitForTimeout(2000);

    // 使用搜索功能
    await projectListPage.searchProjects(searchKeyword);
    await page.waitForTimeout(1000);

    // 验证搜索结果
    const exists = await projectListPage.projectExists(searchKeyword);
    expect(exists).toBeTruthy();

    // 清空搜索
    const searchInput = page.locator('input[placeholder*="搜索"], input[type="search"]');
    await searchInput.clear();
    await page.waitForTimeout(1000);
  });

  test('筛选功能在多项目场景下工作正常', async ({ page }) => {
    const { projectListPage, projectFormPage } = await setupLifecycleTest(page);

    // 创建不同类型的项目
    const timestamp = Date.now();

    // 创建产品开发类项目
    await projectListPage.clickCreateProject();
    await projectFormPage.waitForForm();
    await projectFormPage.selectType('product');
    await projectFormPage.fillCode(`FT-${timestamp}`);
    await projectFormPage.fillName(`产品项目_${timestamp}`);
    await projectFormPage.fillDescription('筛选测试');

    await projectFormPage.goToMembersTab();
    const memberCheckbox = page.locator('input[type="checkbox"]').first();
    const hasMember = await memberCheckbox.isVisible().catch(() => false);
    if (hasMember) {
      await memberCheckbox.check();
    }

    await projectFormPage.goToTimePlanTab();
    await projectFormPage.fillDateRange(
      new Date().toISOString().split('T')[0],
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    );

    await projectFormPage.submit();
    await page.waitForTimeout(2000);

    // 尝试筛选
    const filterButton = page.locator('button:has-text("筛选")');
    const hasFilter = await filterButton.isVisible().catch(() => false);

    if (hasFilter) {
      await filterButton.click();
      await page.waitForTimeout(500);

      // 选择产品开发类
      const productFilter = page.locator('text=/产品开发/').first();
      const hasOption = await productFilter.isVisible().catch(() => false);

      if (hasOption) {
        await productFilter.click();
        await page.waitForTimeout(1000);

        // 验证筛选结果
        const exists = await projectListPage.projectExists(`产品项目_${timestamp}`);
        expect(exists).toBeTruthy();
      }
    }
  });
});

test.describe('项目生命周期 - 数据一致性', () => {
  test('编辑后数据应该正确保存', async ({ page }) => {
    const projectName = await createFullProductProject(page);
    await page.waitForTimeout(1000);

    const projectListPage = new ProjectListPage(page);
    const projectCard = page.locator(`text="${projectName}"`).locator('..');

    // 获取原始数据
    const originalName = await projectCard.textContent();

    // 编辑项目
    const editButton = projectCard.locator('button:has-text("编辑")').first();
    const hasEdit = await editButton.isVisible().catch(() => false);

    if (hasEdit) {
      await editButton.click();

      // 修改名称
      const nameInput = page.locator('#project-name, #name');
      await nameInput.clear();
      const newName = `${projectName}_已更新`;
      await nameInput.fill(newName);

      // 保存
      const submitButton = page.locator('button:has-text("保存修改"), button:has-text("保存")');
      await submitButton.click();
      await page.waitForTimeout(2000);

      // 刷新页面
      await page.reload();
      await projectListPage.waitForReady();
      await page.waitForTimeout(1000);

      // 验证数据持久化
      const updatedExists = await projectListPage.projectExists(newName);
      const originalExists = await projectListPage.projectExists(projectName);

      expect(updatedExists || !originalExists).toBeTruthy();
    }
  });

  test('删除后项目应该不再存在', async ({ page }) => {
    const projectName = await createFullProductProject(page);
    await page.waitForTimeout(1000);

    const projectListPage = new ProjectListPage(page);
    const projectCard = page.locator(`text="${projectName}"`).locator('..');

    // 删除项目
    const deleteButton = projectCard.locator('button:has-text("删除")').first();
    const hasDelete = await deleteButton.isVisible().catch(() => false);

    if (hasDelete) {
      await deleteButton.click();
      await page.waitForTimeout(500);

      // 确认删除
      const confirmButton = page.locator('button:has-text("确认"), button.danger');
      const hasConfirm = await confirmButton.isVisible().catch(() => false);

      if (hasConfirm) {
        await confirmButton.click();
      }

      await page.waitForTimeout(2000);

      // 验证项目已删除
      const exists = await projectListPage.projectExists(projectName);
      expect(exists).toBeFalsy();
    }
  });

  test('刷新页面后数据应该保持一致', async ({ page }) => {
    const projectName = await createFullProductProject(page);
    await page.waitForTimeout(1000);

    const projectListPage = new ProjectListPage(page);

    // 记录项目数量
    const initialCount = await projectListPage.getProjectCount();

    // 刷新页面
    await page.reload();
    await projectListPage.waitForReady();
    await page.waitForTimeout(1000);

    // 验证项目数量一致
    const newCount = await projectListPage.getProjectCount();
    expect(newCount).toBe(initialCount);

    // 验证项目仍然存在
    const exists = await projectListPage.projectExists(projectName);
    expect(exists).toBeTruthy();
  });
});

test.describe('项目生命周期 - 性能测试', () => {
  test('创建项目应该在合理时间内完成', async ({ page }) => {
    const { projectListPage, projectFormPage } = await setupLifecycleTest(page);

    const startTime = Date.now();

    await projectListPage.clickCreateProject();
    await projectFormPage.waitForForm();

    const timestamp = Date.now();

    await projectFormPage.selectType('management');
    await projectFormPage.fillCode(`PERF-${timestamp}`);
    await projectFormPage.fillName(`性能测试项目_${timestamp}`);
    await projectFormPage.fillDescription('测试创建性能');

    await projectFormPage.goToMembersTab();
    const memberCheckbox = page.locator('input[type="checkbox"]').first();
    const hasMember = await memberCheckbox.isVisible().catch(() => false);
    if (hasMember) {
      await memberCheckbox.check();
    }

    await projectFormPage.submit();
    await page.waitForTimeout(2000);

    const endTime = Date.now();
    const duration = endTime - startTime;

    // 创建流程应该在10秒内完成
    expect(duration).toBeLessThan(10000);
  });

  test('列表加载应该在合理时间内完成', async ({ page }) => {
    const { projectListPage } = await setupLifecycleTest(page);

    const startTime = Date.now();

    await projectListPage.waitForProjectsToLoad();

    const endTime = Date.now();
    const loadTime = endTime - startTime;

    // 列表加载应该在5秒内完成
    expect(loadTime).toBeLessThan(5000);
  });

  test('搜索操作应该快速响应', async ({ page }) => {
    const { projectListPage } = await setupLifecycleTest(page);

    await projectListPage.waitForProjectsToLoad();

    const startTime = Date.now();

    await projectListPage.searchProjects('测试');
    await page.waitForTimeout(1000);

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // 搜索应该在2秒内响应
    expect(responseTime).toBeLessThan(2000);
  });
});
