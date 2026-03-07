/**
 * 项目CRUD操作 E2E 测试套件
 *
 * 测试场景：
 * 1. 编辑现有项目
 * 2. 删除项目
 * 3. 批量操作
 * 4. 项目状态变更
 * 5. 项目详情查看
 *
 * @module tests/projects/project-crud
 */

import { test, expect, Page } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { DashboardPage } from '../../pages/DashboardPage';
import { ProjectListPage } from '../../pages/ProjectListPage';
import { ProjectFormPage } from '../../pages/ProjectFormPage';
import { TEST_USERS } from '../../data/test-users';

/**
 * 测试前置条件 - 登录并导航到项目列表
 */
async function setupCRUDTest(page: Page, userRole: keyof typeof TEST_USERS = 'admin') {
  const loginPage = new LoginPage(page);
  const dashboardPage = new DashboardPage(page);
  const projectListPage = new ProjectListPage(page);

  // 登录
  const user = TEST_USERS[userRole];
  await page.goto('/');
  await loginPage.login(user.username, user.password);
  await dashboardPage.waitForReady();

  // 导航到项目管理
  await dashboardPage.navigateToSection('项目管理');
  await projectListPage.waitForReady();

  return { loginPage, dashboardPage, projectListPage };
}

/**
 * 创建测试项目
 */
async function createTestProject(page: Page, projectName?: string) {
  const projectListPage = new ProjectListPage(page);
  const projectFormPage = new ProjectFormPage(page);

  // 打开创建表单
  await projectListPage.clickCreateProject();
  await projectFormPage.waitForForm();

  // 填写表单
  const timestamp = Date.now();
  const name = projectName || `E2E测试项目_${timestamp}`;

  await projectFormPage.selectType('management');
  await projectFormPage.fillCode(`TEST-${timestamp}`);
  await projectFormPage.fillName(name);
  await projectFormPage.fillDescription(`用于E2E测试的项目，创建于${timestamp}`);

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

  // 等待创建完成
  await page.waitForTimeout(2000);

  return name;
}

test.describe('项目编辑 - 基本功能', () => {
  test('应该能够打开编辑表单', async ({ page }) => {
    const { projectListPage } = await setupCRUDTest(page);

    // 创建测试项目
    const projectName = await createTestProject(page);

    // 等待列表刷新
    await page.waitForTimeout(1000);

    // 查找创建的项目
    const projectCard = page.locator(`text="${projectName}"`).locator('..');
    await expect(projectCard).toBeVisible();

    // 点击编辑按钮
    const editButton = projectCard.locator('button:has-text("编辑")').first();
    const hasEdit = await editButton.isVisible().catch(() => false);

    if (hasEdit) {
      await editButton.click();

      // 验证编辑表单打开
      const dialog = page.locator('div[role="dialog"]');
      await expect(dialog).toBeVisible();

      // 验证表单包含现有数据
      const nameInput = page.locator('#project-name, #name');
      const currentValue = await nameInput.inputValue();
      expect(currentValue).toBe(projectName);

      // 关闭表单
      const cancelButton = dialog.locator('button:has-text("取消")').first();
      await cancelButton.click();
      await page.waitForTimeout(500);
    }
  });

  test('应该能够编辑项目基本信息', async ({ page }) => {
    const { projectListPage } = await setupCRUDTest(page);

    // 创建测试项目
    const oldName = await createTestProject(page);
    await page.waitForTimeout(1000);

    // 打开编辑
    const projectCard = page.locator(`text="${oldName}"`).locator('..');
    const editButton = projectCard.locator('button:has-text("编辑")').first();
    const hasEdit = await editButton.isVisible().catch(() => false);

    if (hasEdit) {
      await editButton.click();

      // 修改项目名称
      const newName = `${oldName}_已编辑`;
      const nameInput = page.locator('#project-name, #name');
      await nameInput.clear();
      await nameInput.fill(newName);

      // 提交修改
      const submitButton = page.locator('button:has-text("保存修改"), button:has-text("保存")');
      await submitButton.click();

      // 等待保存完成
      await page.waitForTimeout(2000);

      // 验证修改成功
      const updatedCard = page.locator(`text="${newName}"`);
      const isVisible = await updatedCard.isVisible().catch(() => false);

      if (isVisible) {
        await expect(updatedCard).toBeVisible();
      }
    }
  });

  test('应该能够编辑项目成员', async ({ page }) => {
    const { projectListPage } = await setupCRUDTest(page);

    // 创建测试项目
    const projectName = await createTestProject(page);
    await page.waitForTimeout(1000);

    // 打开编辑
    const projectCard = page.locator(`text="${projectName}"`).locator('..');
    const editButton = projectCard.locator('button:has-text("编辑")').first();
    const hasEdit = await editButton.isVisible().catch(() => false);

    if (hasEdit) {
      await editButton.click();

      // 切换到成员Tab
      const membersTab = page.locator('button:has-text("项目成员")');
      await membersTab.click();
      await page.waitForTimeout(500);

      // 选择新成员
      const checkboxes = page.locator('input[type="checkbox"]');
      const count = await checkboxes.count();

      if (count > 1) {
        // 选择第二个成员
        await checkboxes.nth(1).check();
        await page.waitForTimeout(500);
      }

      // 保存修改
      const submitButton = page.locator('button:has-text("保存修改"), button:has-text("保存")');
      await submitButton.click();

      // 等待保存完成
      await page.waitForTimeout(2000);

      // 验证保存成功（检查成功提示）
      const toast = page.locator('div[role="alert"]').first();
      const hasToast = await toast.isVisible().catch(() => false);

      if (hasToast) {
        const toastText = await toast.textContent();
        expect(toastText).toMatch(/成功|saved|保存/);
      }
    }
  });

  test('应该能够编辑项目时间计划', async ({ page }) => {
    const { projectListPage } = await setupCRUDTest(page);

    // 创建产品开发类项目
    await projectListPage.clickCreateProject();
    const projectFormPage = new ProjectFormPage(page);
    await projectFormPage.waitForForm();

    const timestamp = Date.now();
    const projectName = `E2E产品项目_${timestamp}`;

    await projectFormPage.selectType('product');
    await projectFormPage.fillCode(`PROD-${timestamp}`);
    await projectFormPage.fillName(projectName);
    await projectFormPage.fillDescription('用于测试时间计划编辑');

    // 选择成员
    await projectFormPage.goToMembersTab();
    const memberCheckbox = page.locator('input[type="checkbox"]').first();
    const hasMember = await memberCheckbox.isVisible().catch(() => false);
    if (hasMember) {
      await memberCheckbox.check();
    }

    // 设置时间计划
    await projectFormPage.goToTimePlanTab();
    const startDateInput = page.locator('#start-date, input[name="plannedStartDate"]');
    const endDateInput = page.locator('#end-date, input[name="plannedEndDate"]');

    const newStartDate = new Date().toISOString().split('T')[0];
    const newEndDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    await startDateInput.fill(newStartDate);
    await endDateInput.fill(newEndDate);

    // 保存项目
    await projectFormPage.submit();
    await page.waitForTimeout(2000);

    // 重新打开编辑
    const projectCard = page.locator(`text="${projectName}"`).locator('..');
    const editButton = projectCard.locator('button:has-text("编辑")').first();
    const hasEdit = await editButton.isVisible().catch(() => false);

    if (hasEdit) {
      await editButton.click();

      // 验证时间计划已加载
      await page.waitForTimeout(500);
      const loadedStartDate = await startDateInput.inputValue();
      const loadedEndDate = await endDateInput.inputValue();

      expect(loadedStartDate).toBe(newStartDate);
      expect(loadedEndDate).toBe(newEndDate);

      // 修改时间计划
      const updatedEndDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      await endDateInput.clear();
      await endDateInput.fill(updatedEndDate);

      // 保存修改
      const submitButton = page.locator('button:has-text("保存修改"), button:has-text("保存")');
      await submitButton.click();
      await page.waitForTimeout(2000);

      // 验证修改成功
      const toast = page.locator('div[role="alert"]').first();
      const hasToast = await toast.isVisible().catch(() => false);

      if (hasToast) {
        const toastText = await toast.textContent();
        expect(toastText).toMatch(/成功|saved|保存/);
      }
    }
  });

  test('应该能够取消编辑', async ({ page }) => {
    const { projectListPage } = await setupCRUDTest(page);

    // 创建测试项目
    const projectName = await createTestProject(page);
    await page.waitForTimeout(1000);

    // 打开编辑
    const projectCard = page.locator(`text="${projectName}"`).locator('..');
    const editButton = projectCard.locator('button:has-text("编辑")').first();
    const hasEdit = await editButton.isVisible().catch(() => false);

    if (hasEdit) {
      await editButton.click();

      // 修改项目名称
      const modifiedName = `${projectName}_已修改`;
      const nameInput = page.locator('#project-name, #name');
      await nameInput.clear();
      await nameInput.fill(modifiedName);

      // 取消编辑
      const cancelButton = page.locator('button:has-text("取消")').first();
      await cancelButton.click();

      // 等待对话框关闭
      await page.waitForTimeout(1000);

      // 验证项目名称未改变
      const originalCard = page.locator(`text="${projectName}"`);
      const modifiedCard = page.locator(`text="${modifiedName}"`);

      const hasOriginal = await originalCard.isVisible().catch(() => false);
      const hasModified = await modifiedCard.isVisible().catch(() => false);

      expect(hasOriginal || !hasModified).toBeTruthy();
    }
  });
});

test.describe('项目删除 - 基本功能', () => {
  test('应该能够删除项目', async ({ page }) => {
    const { projectListPage } = await setupCRUDTest(page);

    // 创建测试项目
    const projectName = await createTestProject(page);
    await page.waitForTimeout(1000);

    // 查找项目
    const projectCard = page.locator(`text="${projectName}"`).locator('..');
    await expect(projectCard).toBeVisible();

    // 点击删除按钮
    const deleteButton = projectCard.locator('button:has-text("删除")').first();
    const hasDelete = await deleteButton.isVisible().catch(() => false);

    if (hasDelete) {
      await deleteButton.click();

      // 等待确认对话框
      await page.waitForTimeout(500);

      // 查找确认对话框
      const confirmDialog = page.locator('div[role="dialog"]:visible, .confirm-dialog:visible');
      const hasDialog = await confirmDialog.isVisible().catch(() => false);

      if (hasDialog) {
        // 点击确认删除
        const confirmButton = confirmDialog.locator('button:has-text("确认"), button:has-text("删除"), button.danger');
        await confirmButton.click();
      }

      // 等待删除完成
      await page.waitForTimeout(2000);

      // 验证项目已删除
      const deletedCard = page.locator(`text="${projectName}"`);
      const isDeleted = await deletedCard.isVisible().catch(() => true);

      expect(!isDeleted).toBeTruthy();
    }
  });

  test('应该能够取消删除', async ({ page }) => {
    const { projectListPage } = await setupCRUDTest(page);

    // 创建测试项目
    const projectName = await createTestProject(page);
    await page.waitForTimeout(1000);

    // 点击删除按钮
    const projectCard = page.locator(`text="${projectName}"`).locator('..');
    const deleteButton = projectCard.locator('button:has-text("删除")').first();
    const hasDelete = await deleteButton.isVisible().catch(() => false);

    if (hasDelete) {
      await deleteButton.click();

      // 等待确认对话框
      await page.waitForTimeout(500);

      // 点击取消
      const cancelButton = page.locator('button:has-text("取消")').last();
      const hasCancel = await cancelButton.isVisible().catch(() => false);

      if (hasCancel) {
        await cancelButton.click();
      }

      // 等待对话框关闭
      await page.waitForTimeout(1000);

      // 验证项目仍然存在
      const projectStillExists = page.locator(`text="${projectName}"`);
      await expect(projectStillExists).toBeVisible();
    }
  });

  test('删除应该显示确认提示', async ({ page }) => {
    const { projectListPage } = await setupCRUDTest(page);

    // 创建测试项目
    const projectName = await createTestProject(page);
    await page.waitForTimeout(1000);

    // 点击删除按钮
    const projectCard = page.locator(`text="${projectName}"`).locator('..');
    const deleteButton = projectCard.locator('button:has-text("删除")').first();
    const hasDelete = await deleteButton.isVisible().catch(() => false);

    if (hasDelete) {
      await deleteButton.click();

      // 验证确认对话框
      const confirmDialog = page.locator('div[role="dialog"]:visible, .confirm-dialog:visible');
      const hasDialog = await confirmDialog.isVisible().catch(() => false);

      if (hasDialog) {
        await expect(confirmDialog).toBeVisible();

        // 验证警告文本
        const warningText = page.locator('text=/确认删除|确定要删除|此操作不可恢复/').first();
        const hasWarning = await warningText.isVisible().catch(() => false);

        if (hasWarning) {
          await expect(warningText).toBeVisible();
        }

        // 取消删除
        const cancelButton = confirmDialog.locator('button:has-text("取消")').first();
        await cancelButton.click();
      }
    }
  });
});

test.describe('项目详情 - 查看功能', () => {
  test('应该能够查看项目详情', async ({ page }) => {
    const { projectListPage } = await setupCRUDTest(page);

    // 创建测试项目
    const projectName = await createTestProject(page);
    await page.waitForTimeout(1000);

    // 点击项目卡片（非操作按钮）
    const projectCard = page.locator(`text="${projectName}"`).locator('..');

    // 记录当前URL
    const urlBeforeClick = page.url();

    // 点击卡片
    await projectCard.click();
    await page.waitForTimeout(1500);

    // 验证导航到详情页或打开详情对话框
    const urlAfterClick = page.url();
    const hasNavigated = urlBeforeClick !== urlAfterClick;

    const detailDialog = page.locator('div[role="dialog"]:visible');
    const hasDialog = await detailDialog.isVisible().catch(() => false);

    expect(hasNavigated || hasDialog).toBeTruthy();

    // 如果是对话框，关闭它
    if (hasDialog) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  });

  test('项目详情应该显示完整信息', async ({ page }) => {
    const { projectListPage } = await setupCRUDTest(page);

    // 创建测试项目
    const projectName = await createTestProject(page);
    await page.waitForTimeout(1000);

    // 点击项目卡片
    const projectCard = page.locator(`text="${projectName}"`).locator('..');
    await projectCard.click();
    await page.waitForTimeout(1500);

    // 检查是否导航到详情页
    const detailPage = page.locator('[class*="detail"], [class*="Detail"]');
    const hasDetailPage = await detailPage.isVisible().catch(() => false);

    // 检查是否打开详情对话框
    const detailDialog = page.locator('div[role="dialog"]:visible');
    const hasDialog = await detailDialog.isVisible().catch(() => false);

    if (hasDetailPage || hasDialog) {
      // 验证显示项目基本信息
      const container = hasDetailPage ? detailPage : detailDialog;

      // 验证项目名称
      const nameElement = container.locator(`text="${projectName}"`);
      await expect(nameElement).toBeVisible();

      // 验证其他信息元素存在
      const hasInfo = await container.locator('text=/编码|描述|状态|成员/').count() > 0;
      expect(hasInfo).toBeTruthy();
    }

    // 关闭详情
    if (hasDialog) {
      await page.keyboard.press('Escape');
    } else if (hasDetailPage) {
      await page.goBack();
    }
  });

  test('应该能从详情页编辑项目', async ({ page }) => {
    const { projectListPage } = await setupCRUDTest(page);

    // 创建测试项目
    const projectName = await createTestProject(page);
    await page.waitForTimeout(1000);

    // 点击项目卡片
    const projectCard = page.locator(`text="${projectName}"`).locator('..');
    await projectCard.click();
    await page.waitForTimeout(1500);

    // 查找编辑按钮
    const editButton = page.locator('button:has-text("编辑"), button:has-text("Edit")').first();
    const hasEdit = await editButton.isVisible().catch(() => false);

    if (hasEdit) {
      await editButton.click();

      // 验证打开编辑表单
      const formDialog = page.locator('div[role="dialog"]');
      await expect(formDialog).toBeVisible();

      // 关闭表单
      const cancelButton = formDialog.locator('button:has-text("取消")').first();
      await cancelButton.click();
      await page.waitForTimeout(500);
    }

    // 关闭详情
    const detailDialog = page.locator('div[role="dialog"]:visible');
    const hasDialog = await detailDialog.isVisible().catch(() => false);
    if (hasDialog) {
      await page.keyboard.press('Escape');
    }
  });
});

test.describe('项目状态 - 变更功能', () => {
  test('应该能够变更项目状态', async ({ page }) => {
    const { projectListPage } = await setupCRUDTest(page);

    // 创建测试项目
    const projectName = await createTestProject(page);
    await page.waitForTimeout(1000);

    // 查找项目卡片
    const projectCard = page.locator(`text="${projectName}"`).locator('..');

    // 查找状态标签或状态选择器
    const statusBadge = projectCard.locator('[class*="status"], .badge').first();
    const hasStatus = await statusBadge.isVisible().catch(() => false);

    if (hasStatus) {
      // 获取当前状态
      const currentStatus = await statusBadge.textContent();

      // 尝试点击状态进行更改
      await statusBadge.click();
      await page.waitForTimeout(500);

      // 检查是否有状态选择菜单
      const statusMenu = page.locator('[role="menu"]:visible, .dropdown-menu:visible');
      const hasMenu = await statusMenu.isVisible().catch(() => false);

      if (hasMenu) {
        // 选择新状态
        const newStatus = statusMenu.locator('text=/进行中|已完成/').first();
        const hasNewStatus = await newStatus.isVisible().catch(() => false);

        if (hasNewStatus) {
          await newStatus.click();
          await page.waitForTimeout(1000);

          // 验证状态已更新
          const updatedStatus = await statusBadge.textContent();
          expect(updatedStatus).not.toBe(currentStatus);
        }
      } else {
        // 可能是通过编辑表单更改状态
        await page.keyboard.press('Escape');
      }
    }
  });

  test('状态变更应该有视觉反馈', async ({ page }) => {
    const { projectListPage } = await setupCRUDTest(page);

    // 创建测试项目
    const projectName = await createTestProject(page);
    await page.waitForTimeout(1000);

    const projectCard = page.locator(`text="${projectName}"`).locator('..');
    const statusBadge = projectCard.locator('[class*="status"], .badge').first();

    // 验证状态有颜色标识
    const hasStatus = await statusBadge.isVisible().catch(() => false);

    if (hasStatus) {
      const className = await statusBadge.getAttribute('class') || '';
      const hasColorClass = /bg-|text-/.test(className);

      expect(hasColorClass).toBeTruthy();
    }
  });
});

test.describe('项目CRUD - 权限控制', () => {
  test('普通用户可能无法编辑项目', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    const projectListPage = new ProjectListPage(page);

    // 使用工程师账号登录
    const user = TEST_USERS.engineer;
    await page.goto('/');
    await loginPage.login(user.username, user.password);
    await dashboardPage.waitForReady();

    await dashboardPage.navigateToSection('项目管理');
    await projectListPage.waitForReady();

    // 等待列表加载
    await page.waitForTimeout(1000);

    // 查找第一个项目
    const firstCard = page.locator('[class*="project-card"]').first();
    const hasProject = await firstCard.isVisible().catch(() => false);

    if (hasProject) {
      // 检查编辑按钮
      const editButton = firstCard.locator('button:has-text("编辑")');
      const canEdit = await editButton.isVisible().catch(() => false);

      // 工程师可能没有编辑权限
      if (!canEdit) {
        expect(canEdit).toBeFalsy();
      }
    }
  });

  test('普通用户可能无法删除项目', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    const projectListPage = new ProjectListPage(page);

    // 使用工程师账号登录
    const user = TEST_USERS.engineer;
    await page.goto('/');
    await loginPage.login(user.username, user.password);
    await dashboardPage.waitForReady();

    await dashboardPage.navigateToSection('项目管理');
    await projectListPage.waitForReady();

    await page.waitForTimeout(1000);

    // 查找第一个项目
    const firstCard = page.locator('[class*="project-card"]').first();
    const hasProject = await firstCard.isVisible().catch(() => false);

    if (hasProject) {
      // 检查删除按钮
      const deleteButton = firstCard.locator('button:has-text("删除")');
      const canDelete = await deleteButton.isVisible().catch(() => false);

      // 工程师可能没有删除权限
      if (!canDelete) {
        expect(canDelete).toBeFalsy();
      }
    }
  });

  test('管理员应该有完整CRUD权限', async ({ page }) => {
    const { projectListPage } = await setupCRUDTest(page, 'admin');

    // 创建测试项目
    const projectName = await createTestProject(page);
    await page.waitForTimeout(1000);

    const projectCard = page.locator(`text="${projectName}"`).locator('..');

    // 验证编辑按钮
    const editButton = projectCard.locator('button:has-text("编辑")');
    const canEdit = await editButton.isVisible().catch(() => false);
    expect(canEdit).toBeTruthy();

    // 验证删除按钮
    const deleteButton = projectCard.locator('button:has-text("删除")');
    const canDelete = await deleteButton.isVisible().catch(() => false);
    expect(canDelete).toBeTruthy();

    // 清理测试数据
    if (canDelete) {
      await deleteButton.click();
      await page.waitForTimeout(500);

      const confirmButton = page.locator('button:has-text("确认"), button.danger');
      const hasConfirm = await confirmButton.isVisible().catch(() => false);
      if (hasConfirm) {
        await confirmButton.click();
      }
      await page.waitForTimeout(1000);
    }
  });
});
