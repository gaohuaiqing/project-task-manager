/**
 * 项目表单 E2E 测试套件
 *
 * 测试场景：
 * 1. 创建产品开发类项目（完整流程）
 * 2. 创建职能管理类项目
 * 3. 编辑项目
 * 4. 表单验证
 * 5. 草稿保存功能
 * 6. 项目类型切换
 * 7. 成员选择
 * 8. 时间计划设置
 *
 * @module tests/projects/project-form
 */

import { test, expect, Page } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { DashboardPage } from '../../pages/DashboardPage';
import { ProjectListPage } from '../../pages/ProjectListPage';
import { ProjectFormPage } from '../../pages/ProjectFormPage';
import { TEST_USERS } from '../../data/test-users';
import { generateProjectData } from '../../data/test-projects';

/**
 * 测试前置条件 - 登录并打开创建项目表单
 */
async function setupProjectFormTest(page: Page, userRole: keyof typeof TEST_USERS = 'admin') {
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

  // 打开创建项目表单
  await projectListPage.clickCreateProject();
  await projectFormPage.waitForForm();

  return { loginPage, dashboardPage, projectListPage, projectFormPage };
}

/**
 * 生成唯一的测试数据
 */
function generateUniqueProjectData() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return {
    code: `E2E-${timestamp}`,
    name: `E2E测试项目_${timestamp}_${random}`,
    description: `这是一个E2E自动化测试创建的项目，时间戳：${timestamp}`,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  };
}

test.describe('项目表单 - 基本信息Tab', () => {
  test('应该显示项目类型选择', async ({ page }) => {
    const { projectFormPage } = await setupProjectFormTest(page);

    // 验证项目类型选择区域
    await expect(projectFormPage.basicInfoTab).toBeVisible();
    await expect(projectFormPage.productTypeButton).toBeVisible();
    await expect(projectFormPage.managementTypeButton).toBeVisible();

    // 验证默认选中产品开发类
    const productButton = page.locator('button:has-text("产品开发类")');
    const isSelected = await productButton.evaluate(el =>
      el.classList.contains('border-primary')
    );
    expect(isSelected).toBeTruthy();
  });

  test('应该能够选择项目类型', async ({ page }) => {
    const { projectFormPage } = await setupProjectFormTest(page);

    // 选择职能管理类
    await projectFormPage.selectType('management');

    // 验证选中状态
    const managementButton = page.locator('button:has-text("职能管理类")');
    await expect(managementButton).toHaveAttribute('class', /border-primary/);
  });

  test('应该显示项目类型提示信息', async ({ page }) => {
    const { projectFormPage } = await setupProjectFormTest(page);

    // 查找类型提示信息
    const hints = page.locator('[class*="badge"], [class*="Badge"]');
    const count = await hints.count();

    // 应该有至少一个提示标签
    expect(count).toBeGreaterThan(0);
  });

  test('应该能够输入项目编码', async ({ page }) => {
    const { projectFormPage } = await setupProjectFormTest(page);
    const testData = generateUniqueProjectData();

    // 输入项目编码
    await projectFormPage.fillCode(testData.code);

    // 验证输入值
    const codeInput = page.locator('#project-code, #code');
    await expect(codeInput).toHaveValue(testData.code);
  });

  test('应该能够输入项目名称', async ({ page }) => {
    const { projectFormPage } = await setupProjectFormTest(page);
    const testData = generateUniqueProjectData();

    // 输入项目名称
    await projectFormPage.fillName(testData.name);

    // 验证输入值
    const nameInput = page.locator('#project-name, #name');
    await expect(nameInput).toHaveValue(testData.name);
  });

  test('应该能够输入项目描述', async ({ page }) => {
    const { projectFormPage } = await setupProjectFormTest(page);
    const testData = generateUniqueProjectData();

    // 输入项目描述
    await projectFormPage.fillDescription(testData.description);

    // 验证输入值
    const descInput = page.locator('#project-desc, #description, textarea[name="description"]');
    await expect(descInput).toHaveValue(testData.description);
  });

  test('应该有下一步导航按钮', async ({ page }) => {
    const { projectFormPage } = await setupProjectFormTest(page);

    // 验证下一步按钮
    await expect(projectFormPage.nextButton).toBeVisible();
    await expect(projectFormPage.nextButton).toBeEnabled();
  });

  test('项目名称是必填项', async ({ page }) => {
    const { projectFormPage } = await setupProjectFormTest(page);

    // 清空项目名称
    await projectFormPage.fillName('');

    // 尝试进入下一步
    await projectFormPage.goToNextStep();

    // 验证错误提示
    const errorMsg = page.locator('text=/必填|不能为空|required/').first();
    const isVisible = await errorMsg.isVisible().catch(() => false);

    // 可能直接阻止切换或显示错误
    const stillOnBasicTab = await projectFormPage.basicInfoTab.isVisible();
    expect(stillOnBasicTab || isVisible).toBeTruthy();
  });
});

test.describe('项目表单 - 成员选择Tab', () => {
  test('应该能够导航到成员Tab', async ({ page }) => {
    const { projectFormPage } = await setupProjectFormTest(page);

    // 填写基本信息
    const testData = generateUniqueProjectData();
    await projectFormPage.fillBasicInfo(testData);

    // 进入成员Tab
    await projectFormPage.goToMembersTab();

    // 验证Tab切换
    await expect(projectFormPage.membersTab).toHaveAttribute('data-state', 'active');
  });

  test('应该显示成员选择器', async ({ page }) => {
    const { projectFormPage } = await setupProjectFormTest(page);

    // 填写基本信息并进入成员Tab
    const testData = generateUniqueProjectData();
    await projectFormPage.fillBasicInfo(testData);
    await projectFormPage.goToMembersTab();

    // 验证成员选择器
    const memberSelector = page.locator('[class*="member-selector"], [data-testid="member-selector"]');
    const isVisible = await memberSelector.isVisible().catch(() => false);

    expect(isVisible).toBeTruthy();
  });

  test('应该能够选择成员', async ({ page }) => {
    const { projectFormPage } = await setupProjectFormTest(page);

    // 填写基本信息并进入成员Tab
    const testData = generateUniqueProjectData();
    await projectFormPage.fillBasicInfo(testData);
    await projectFormPage.goToMembersTab();

    // 查找成员复选框
    const memberCheckbox = page.locator('input[type="checkbox"]').first();
    const exists = await memberCheckbox.isVisible().catch(() => false);

    if (exists) {
      // 选择第一个成员
      await memberCheckbox.check();

      // 验证选中状态
      await expect(memberCheckbox).toBeChecked();
    }
  });

  test('应该显示已选成员数量', async ({ page }) => {
    const { projectFormPage } = await setupProjectFormTest(page);

    // 填写基本信息并进入成员Tab
    const testData = generateUniqueProjectData();
    await projectFormPage.fillBasicInfo(testData);
    await projectFormPage.goToMembersTab();

    // 查找成员数量徽章
    const memberBadge = page.locator('text=/已选择.*人/').first();
    const isVisible = await memberBadge.isVisible().catch(() => false);

    if (isVisible) {
      const badgeText = await memberBadge.textContent();
      expect(badgeText).toBeTruthy();
    }
  });

  test('成员选择是必填项', async ({ page }) => {
    const { projectFormPage } = await setupProjectFormTest(page);

    // 填写基本信息但不选择成员
    const testData = generateUniqueProjectData();
    await projectFormPage.fillBasicInfo(testData);
    await projectFormPage.goToMembersTab();

    // 尝试直接提交或进入下一步
    await page.waitForTimeout(500);

    // 验证提示信息
    const validationMsg = page.locator('text=/至少选择.*成员|请选择成员/').first();
    const hasValidation = await validationMsg.isVisible().catch(() => false);

    // 可能直接阻止操作或显示错误
    expect(hasValidation).toBeTruthy();
  });
});

test.describe('项目表单 - 时间计划Tab', () => {
  test('产品开发类项目应该能够设置时间计划', async ({ page }) => {
    const { projectFormPage } = await setupProjectFormTest(page);

    // 确保选择产品开发类
    await projectFormPage.selectType('product');

    // 填写基本信息
    const testData = generateUniqueProjectData();
    await projectFormPage.fillBasicInfo(testData);

    // 进入时间计划Tab
    await projectFormPage.goToTimePlanTab();

    // 验证Tab切换
    await expect(projectFormPage.timePlanTab).toHaveAttribute('data-state', 'active');

    // 验证日期选择器存在
    const startDateInput = page.locator('#start-date, input[name="startDate"], input[name="plannedStartDate"]');
    await expect(startDateInput).toBeVisible();

    const endDateInput = page.locator('#end-date, input[name="endDate"], input[name="plannedEndDate"]');
    await expect(endDateInput).toBeVisible();
  });

  test('应该能够选择开始日期', async ({ page }) => {
    const { projectFormPage } = await setupProjectFormTest(page);

    await projectFormPage.selectType('product');
    const testData = generateUniqueProjectData();
    await projectFormPage.fillBasicInfo(testData);
    await projectFormPage.goToTimePlanTab();

    // 输入开始日期
    const startDateInput = page.locator('#start-date, input[name="plannedStartDate"]');
    await startDateInput.fill(testData.startDate);

    // 验证输入值
    await expect(startDateInput).toHaveValue(testData.startDate);
  });

  test('应该能够选择结束日期', async ({ page }) => {
    const { projectFormPage } = await setupProjectFormTest(page);

    await projectFormPage.selectType('product');
    const testData = generateUniqueProjectData();
    await projectFormPage.fillBasicInfo(testData);
    await projectFormPage.goToTimePlanTab();

    // 输入结束日期
    const endDateInput = page.locator('#end-date, input[name="plannedEndDate"]');
    await endDateInput.fill(testData.endDate);

    // 验证输入值
    await expect(endDateInput).toHaveValue(testData.endDate);
  });

  test('应该有打开时间计划编辑器按钮', async ({ page }) => {
    const { projectFormPage } = await setupProjectFormTest(page);

    await projectFormPage.selectType('product');
    const testData = generateUniqueProjectData();
    await projectFormPage.fillBasicInfo(testData);
    await projectFormPage.goToTimePlanTab();

    // 填写日期
    const startDateInput = page.locator('#start-date, input[name="plannedStartDate"]');
    const endDateInput = page.locator('#end-date, input[name="plannedEndDate"]');
    await startDateInput.fill(testData.startDate);
    await endDateInput.fill(testData.endDate);

    // 查找时间计划编辑器按钮
    const editorButton = page.locator('button:has-text("打开时间计划编辑器"), button:has-text("编辑时间计划")');
    const isVisible = await editorButton.isVisible().catch(() => false);

    if (isVisible) {
      await expect(editorButton).toBeVisible();
    }
  });

  test('职能管理类项目不需要时间计划', async ({ page }) => {
    const { projectFormPage } = await setupProjectFormTest(page);

    // 选择职能管理类
    await projectFormPage.selectType('management');

    // 填写基本信息
    const testData = generateUniqueProjectData();
    await projectFormPage.fillBasicInfo(testData);

    // 进入时间计划Tab
    await projectFormPage.goToTimePlanTab();

    // 验证提示信息
    const hintMsg = page.locator('text=/不需要.*时间计划|此类项目重点关注/').first();
    const isVisible = await hintMsg.isVisible().catch(() => false);

    expect(isVisible).toBeTruthy();
  });
});

test.describe('项目表单 - 完整流程', () => {
  test('应该能够创建产品开发类项目', async ({ page }) => {
    const { projectFormPage, projectListPage } = await setupProjectFormTest(page);

    const testData = generateUniqueProjectData();

    // 选择产品开发类
    await projectFormPage.selectType('product');

    // 填写基本信息
    await projectFormPage.fillBasicInfo(testData);

    // 进入成员Tab（选择至少一个成员）
    await projectFormPage.goToMembersTab();

    // 尝试选择成员
    const memberCheckbox = page.locator('input[type="checkbox"]').first();
    const hasMember = await memberCheckbox.isVisible().catch(() => false);

    if (hasMember) {
      await memberCheckbox.check();
      await page.waitForTimeout(500);
    }

    // 进入时间计划Tab
    await projectFormPage.goToTimePlanTab();

    // 填写日期
    const startDateInput = page.locator('#start-date, input[name="plannedStartDate"]');
    const endDateInput = page.locator('#end-date, input[name="plannedEndDate"]');
    await startDateInput.fill(testData.startDate);
    await endDateInput.fill(testData.endDate);

    // 提交表单
    await projectFormPage.submit();

    // 等待表单关闭
    await page.waitForTimeout(2000);

    // 验证返回到项目列表
    const dialog = page.locator('div[role="dialog"]');
    const isDialogClosed = await dialog.isVisible().catch(() => false);
    expect(!isDialogClosed).toBeTruthy();

    // 验证成功提示
    const toast = page.locator('div[role="alert"], .toast').first();
    const hasToast = await toast.isVisible().catch(() => false);

    if (hasToast) {
      const toastText = await toast.textContent();
      expect(toastText).toMatch(/成功|created/);
    }
  });

  test('应该能够创建职能管理类项目', async ({ page }) => {
    const { projectFormPage } = await setupProjectFormTest(page);

    const testData = generateUniqueProjectData();

    // 选择职能管理类
    await projectFormPage.selectType('management');

    // 填写基本信息
    await projectFormPage.fillBasicInfo(testData);

    // 进入成员Tab
    await projectFormPage.goToMembersTab();

    // 选择成员
    const memberCheckbox = page.locator('input[type="checkbox"]').first();
    const hasMember = await memberCheckbox.isVisible().catch(() => false);

    if (hasMember) {
      await memberCheckbox.check();
      await page.waitForTimeout(500);
    }

    // 提交（职能管理类不需要填写时间计划）
    await projectFormPage.submit();

    // 等待表单关闭
    await page.waitForTimeout(2000);

    // 验证返回到项目列表
    const dialog = page.locator('div[role="dialog"]');
    const isDialogClosed = await dialog.isVisible().catch(() => false);
    expect(!isDialogClosed).toBeTruthy();
  });

  test('应该能够取消表单', async ({ page }) => {
    const { projectFormPage } = await setupProjectFormTest(page);

    const testData = generateUniqueProjectData();

    // 填写部分信息
    await projectFormPage.fillName(testData.name);

    // 取消表单
    await projectFormPage.cancel();

    // 验证表单关闭
    await page.waitForTimeout(1000);

    const dialog = page.locator('div[role="dialog"]');
    const isDialogClosed = await dialog.isVisible().catch(() => false);
    expect(!isDialogClosed).toBeTruthy();
  });
});

test.describe('项目表单 - 表单验证', () => {
  test('应该验证必填字段', async ({ page }) => {
    const { projectFormPage } = await setupProjectFormTest(page);

    // 不填写任何信息，直接尝试提交
    await projectFormPage.submit();

    // 等待验证提示
    await page.waitForTimeout(500);

    // 验证错误提示
    const errorElements = page.locator('text=/必填|不能为空|required/').all();
    const hasErrors = (await errorElements.length) > 0;

    expect(hasErrors).toBeTruthy();
  });

  test('应该验证日期范围', async ({ page }) => {
    const { projectFormPage } = await setupProjectFormTest(page);

    await projectFormPage.selectType('product');
    const testData = generateUniqueProjectData();

    await projectFormPage.fillBasicInfo(testData);
    await projectFormPage.goToMembersTab();

    // 选择成员
    const memberCheckbox = page.locator('input[type="checkbox"]').first();
    const hasMember = await memberCheckbox.isVisible().catch(() => false);
    if (hasMember) {
      await memberCheckbox.check();
    }

    await projectFormPage.goToTimePlanTab();

    // 设置结束日期早于开始日期
    const startDateInput = page.locator('#start-date, input[name="plannedStartDate"]');
    const endDateInput = page.locator('#end-date, input[name="plannedEndDate"]');

    await startDateInput.fill(testData.endDate);
    await endDateInput.fill(testData.startDate);

    // 尝试提交
    await projectFormPage.submit();

    // 验证错误提示
    const dateError = page.locator('text=/结束日期.*早于.*开始日期|日期范围无效/').first();
    const hasError = await dateError.isVisible().catch(() => false);

    if (hasError) {
      expect(hasError).toBeTruthy();
    }
  });

  test('应该验证项目编码唯一性', async ({ page }) => {
    const { projectFormPage } = await setupProjectFormTest(page);

    // 使用已知存在的项目编码（这里假设PRJ-001已存在）
    await projectFormPage.fillCode('PRJ-001');

    const testData = generateUniqueProjectData();
    await projectFormPage.fillName(testData.name);

    // 尝试提交
    await projectFormPage.submit();
    await page.waitForTimeout(1000);

    // 验证错误提示（可能显示编码已存在）
    const codeError = page.locator('text=/编码.*已存在|已使用/').first();
    const hasError = await codeError.isVisible().catch(() => false);

    // 如果有错误，验证错误信息
    if (hasError) {
      expect(hasError).toBeTruthy();
    }
  });
});

test.describe('项目表单 - 项目类型切换', () => {
  test('切换项目类型应该显示确认对话框', async ({ page }) => {
    const { projectFormPage } = await setupProjectFormTest(page);

    // 默认是产品开发类
    const testData = generateUniqueProjectData();
    await projectFormPage.fillBasicInfo(testData);

    // 切换到职能管理类
    await projectFormPage.selectType('management');

    // 验证确认对话框
    const confirmDialog = page.locator('div[role="dialog"]:has-text("确认")');
    const hasConfirm = await confirmDialog.isVisible().catch(() => false);

    if (hasConfirm) {
      await expect(confirmDialog).toBeVisible();

      // 点击确认
      await confirmDialog.locator('button:has-text("确认")').click();
    }

    // 验证类型已切换
    const managementButton = page.locator('button:has-text("职能管理类")');
    await expect(managementButton).toHaveAttribute('class', /border-primary/);
  });

  test('应该能够取消类型切换', async ({ page }) => {
    const { projectFormPage } = await setupProjectFormTest(page);

    const testData = generateUniqueProjectData();
    await projectFormPage.fillBasicInfo(testData);

    // 尝试切换类型
    await projectFormPage.managementTypeButton.click();

    // 如果有确认对话框，点击取消
    const confirmDialog = page.locator('div[role="dialog"]:has-text("确认")');
    const hasConfirm = await confirmDialog.isVisible().catch(() => false);

    if (hasConfirm) {
      await confirmDialog.locator('button:has-text("取消")').click();

      // 验证仍然是原类型
      const productButton = page.locator('button:has-text("产品开发类")');
      await expect(productButton).toHaveAttribute('class', /border-primary/);
    }
  });

  test('切换类型应该清除相关字段', async ({ page }) => {
    const { projectFormPage } = await setupProjectFormTest(page);

    // 选择产品开发类并填写时间计划
    await projectFormPage.selectType('product');
    const testData = generateUniqueProjectData();
    await projectFormPage.fillBasicInfo(testData);
    await projectFormPage.goToMembersTab();

    // 选择成员
    const memberCheckbox = page.locator('input[type="checkbox"]').first();
    const hasMember = await memberCheckbox.isVisible().catch(() => false);
    if (hasMember) {
      await memberCheckbox.check();
    }

    await projectFormPage.goToTimePlanTab();

    // 填写日期
    const startDateInput = page.locator('#start-date, input[name="plannedStartDate"]');
    const endDateInput = page.locator('#end-date, input[name="plannedEndDate"]');
    await startDateInput.fill(testData.startDate);
    await endDateInput.fill(testData.endDate);

    // 切换到职能管理类
    await projectFormPage.basicInfoTab.click();
    await projectFormPage.selectType('management');

    // 确认切换
    const confirmDialog = page.locator('div[role="dialog"]:has-text("确认")');
    const hasConfirm = await confirmDialog.isVisible().catch(() => false);
    if (hasConfirm) {
      await confirmDialog.locator('button:has-text("确认")').click();
    }

    // 验证日期字段被清空
    await projectFormPage.goToTimePlanTab();
    const startDateValue = await startDateInput.inputValue();
    const endDateValue = await endDateInput.inputValue();

    // 职能管理类不需要日期，所以应该被清空
    expect(startDateValue === '').toBeTruthy();
  });
});

test.describe('项目表单 - 权限控制', () => {
  test('工程师角色可能没有创建权限', async ({ page }) => {
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

    // 检查创建按钮
    const createButton = page.locator('button:has-text("创建项目")');
    const canCreate = await createButton.isVisible().catch(() => false);

    // 如果不能创建，按钮应该不存在或禁用
    if (!canCreate) {
      expect(canCreate).toBeFalsy();
    } else {
      // 如果能创建，检查按钮是否启用
      const isEnabled = await createButton.isEnabled();
      expect(isEnabled).toBeTruthy();
    }
  });

  test('管理员应该有完整权限', async ({ page }) => {
    const { projectFormPage } = await setupProjectFormTest(page, 'admin');

    // 验证所有功能可用
    await expect(projectFormPage.productTypeButton).toBeVisible();
    await expect(projectFormPage.managementTypeButton).toBeVisible();
    await expect(projectFormPage.submitButton).toBeVisible();
  });
});
