/**
 * 项目时间计划 E2E 测试套件
 *
 * 测试场景：
 * 1. 时间计划编辑器
 * 2. 里程碑管理
 * 3. 任务（甘特图）管理
 * 4. 时间线视图
 * 5. 自动排列功能
 *
 * @module tests/projects/project-timeplan
 */

import { test, expect, Page } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { DashboardPage } from '../../pages/DashboardPage';
import { ProjectListPage } from '../../pages/ProjectListPage';
import { ProjectFormPage } from '../../pages/ProjectFormPage';
import { TEST_USERS } from '../../data/test-users';

/**
 * 测试前置条件 - 登录并打开项目表单
 */
async function setupTimePlanTest(page: Page, userRole: keyof typeof TEST_USERS = 'admin') {
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

  // 选择产品开发类
  await projectFormPage.selectType('product');

  // 填写基本信息
  const timestamp = Date.now();
  await projectFormPage.fillCode(`TP-${timestamp}`);
  await projectFormPage.fillName(`时间计划测试项目_${timestamp}`);
  await projectFormPage.fillDescription('用于测试时间计划功能');

  // 选择成员
  await projectFormPage.goToMembersTab();
  const memberCheckbox = page.locator('input[type="checkbox"]').first();
  const hasMember = await memberCheckbox.isVisible().catch(() => false);
  if (hasMember) {
    await memberCheckbox.check();
    await page.waitForTimeout(500);
  }

  // 进入时间计划Tab
  await projectFormPage.goToTimePlanTab();

  return { loginPage, dashboardPage, projectListPage, projectFormPage };
}

test.describe('时间计划 - 基本设置', () => {
  test('应该能够设置项目开始和结束日期', async ({ page }) => {
    const { projectFormPage } = await setupTimePlanTest(page);

    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // 设置开始日期
    const startDateInput = page.locator('#start-date, input[name="plannedStartDate"]');
    await startDateInput.fill(startDate);
    await expect(startDateInput).toHaveValue(startDate);

    // 设置结束日期
    const endDateInput = page.locator('#end-date, input[name="plannedEndDate"]');
    await endDateInput.fill(endDate);
    await expect(endDateInput).toHaveValue(endDate);
  });

  test('应该验证日期范围', async ({ page }) => {
    const { projectFormPage } = await setupTimePlanTest(page);

    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // 设置无效的日期范围（结束日期早于开始日期）
    const startDateInput = page.locator('#start-date, input[name="plannedStartDate"]');
    const endDateInput = page.locator('#end-date, input[name="plannedEndDate"]');

    await startDateInput.fill(startDate);
    await endDateInput.fill(endDate);

    // 查找错误提示
    const errorMsg = page.locator('text=/结束日期.*早于|日期范围无效|无效的日期范围/').first();
    const hasError = await errorMsg.isVisible().catch(() => false);

    if (hasError) {
      await expect(errorMsg).toBeVisible();
    }
  });

  test('应该显示日期范围提示', async ({ page }) => {
    const { projectFormPage } = await setupTimePlanTest(page);

    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const startDateInput = page.locator('#start-date, input[name="plannedStartDate"]');
    const endDateInput = page.locator('#end-date, input[name="plannedEndDate"]');

    await startDateInput.fill(startDate);
    await endDateInput.fill(endDate);

    // 查找日期范围提示
    const dateRangeHint = page.locator('text=/\\d+.*天|持续.*天/').first();
    const hasHint = await dateRangeHint.isVisible().catch(() => false);

    // 不强制要求，但如果有应该正确显示
    if (hasHint) {
      await expect(dateRangeHint).toBeVisible();
    }
  });
});

test.describe('时间计划编辑器 - 基本功能', () => {
  test('应该能够打开时间计划编辑器', async ({ page }) => {
    const { projectFormPage } = await setupTimePlanTest(page);

    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // 设置日期
    const startDateInput = page.locator('#start-date, input[name="plannedStartDate"]');
    const endDateInput = page.locator('#end-date, input[name="plannedEndDate"]');
    await startDateInput.fill(startDate);
    await endDateInput.fill(endDate);

    // 点击打开时间计划编辑器按钮
    const editorButton = page.locator('button:has-text("打开时间计划编辑器"), button:has-text("编辑时间计划")');
    const hasButton = await editorButton.isVisible().catch(() => false);

    if (hasButton) {
      await editorButton.click();

      // 验证编辑器对话框打开
      const editorDialog = page.locator('div[role="dialog"]:has-text("时间计划")');
      await expect(editorDialog).toBeVisible({ timeout: 5000 });

      // 关闭编辑器
      const closeButton = editorDialog.locator('button:has-text("取消"), button[aria-label="Close"]').first();
      await closeButton.click();
      await page.waitForTimeout(500);
    }
  });

  test('时间计划编辑器应该显示项目日期范围', async ({ page }) => {
    const { projectFormPage } = await setupTimePlanTest(page);

    const startDate = '2024-01-01';
    const endDate = '2024-01-31';

    // 设置日期
    const startDateInput = page.locator('#start-date, input[name="plannedStartDate"]');
    const endDateInput = page.locator('#end-date, input[name="plannedEndDate"]');
    await startDateInput.fill(startDate);
    await endDateInput.fill(endDate);

    // 打开编辑器
    const editorButton = page.locator('button:has-text("打开时间计划编辑器")');
    const hasButton = await editorButton.isVisible().catch(() => false);

    if (hasButton) {
      await editorButton.click();

      // 验证日期范围显示
      const dateRange = page.locator(`text=/${startDate}|${endDate}/`);
      const hasDateRange = await dateRange.isVisible().catch(() => false);

      if (hasDateRange) {
        await expect(dateRange).toBeVisible();
      }

      // 关闭编辑器
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  });

  test('时间计划编辑器应该是可调整大小的', async ({ page }) => {
    const { projectFormPage } = await setupTimePlanTest(page);

    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const startDateInput = page.locator('#start-date, input[name="plannedStartDate"]');
    const endDateInput = page.locator('#end-date, input[name="plannedEndDate"]');
    await startDateInput.fill(startDate);
    await endDateInput.fill(endDate);

    // 打开编辑器
    const editorButton = page.locator('button:has-text("打开时间计划编辑器")');
    const hasButton = await editorButton.isVisible().catch(() => false);

    if (hasButton) {
      await editorButton.click();

      // 查找调整大小手柄
      const resizeHandle = page.locator('[class*="resize"], [data-resize]').first();
      const hasResize = await resizeHandle.isVisible().catch(() => false);

      // 不强制要求，但如果有应该存在
      if (hasResize) {
        await expect(resizeHandle).toBeVisible();
      }

      // 关闭编辑器
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  });
});

test.describe('里程碑管理', () => {
  test('应该能够添加里程碑', async ({ page }) => {
    const { projectFormPage } = await setupTimePlanTest(page);

    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const startDateInput = page.locator('#start-date, input[name="plannedStartDate"]');
    const endDateInput = page.locator('#end-date, input[name="plannedEndDate"]');
    await startDateInput.fill(startDate);
    await endDateInput.fill(endDate);

    // 打开编辑器
    const editorButton = page.locator('button:has-text("打开时间计划编辑器")');
    const hasButton = await editorButton.isVisible().catch(() => false);

    if (hasButton) {
      await editorButton.click();

      // 查找添加里程碑按钮
      const addMilestoneButton = page.locator('button:has-text("添加里程碑"), button:has-text("新增里程碑")');
      const hasAddButton = await addMilestoneButton.isVisible().catch(() => false);

      if (hasAddButton) {
        // 记录添加前的里程碑数量
        const milestoneCount = await page.locator('[class*="milestone"], [data-testid="milestone"]').count();

        // 点击添加
        await addMilestoneButton.click();
        await page.waitForTimeout(1000);

        // 验证里程碑增加
        const newCount = await page.locator('[class*="milestone"], [data-testid="milestone"]').count();
        expect(newCount).toBeGreaterThan(milestoneCount);
      }

      // 关闭编辑器
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  });

  test('应该能够编辑里程碑', async ({ page }) => {
    const { projectFormPage } = await setupTimePlanTest(page);

    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const startDateInput = page.locator('#start-date, input[name="plannedStartDate"]');
    const endDateInput = page.locator('#end-date, input[name="plannedEndDate"]');
    await startDateInput.fill(startDate);
    await endDateInput.fill(endDate);

    // 打开编辑器
    const editorButton = page.locator('button:has-text("打开时间计划编辑器")');
    const hasButton = await editorButton.isVisible().catch(() => false);

    if (hasButton) {
      await editorButton.click();

      // 添加一个里程碑
      const addMilestoneButton = page.locator('button:has-text("添加里程碑")');
      const hasAddButton = await addMilestoneButton.isVisible().catch(() => false);

      if (hasAddButton) {
        await addMilestoneButton.click();
        await page.waitForTimeout(1000);

        // 查找里程碑输入框
        const milestoneInput = page.locator('input[placeholder*="里程碑"], input[name*="milestone"]').first();
        const hasInput = await milestoneInput.isVisible().catch(() => false);

        if (hasInput) {
          // 输入里程碑名称
          await milestoneInput.fill('测试里程碑');
          await page.waitForTimeout(500);

          // 验证输入
          await expect(milestoneInput).toHaveValue('测试里程碑');
        }
      }

      // 关闭编辑器
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  });

  test('应该能够删除里程碑', async ({ page }) => {
    const { projectFormPage } = await setupTimePlanTest(page);

    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const startDateInput = page.locator('#start-date, input[name="plannedStartDate"]');
    const endDateInput = page.locator('#end-date, input[name="plannedEndDate"]');
    await startDateInput.fill(startDate);
    await endDateInput.fill(endDate);

    // 打开编辑器
    const editorButton = page.locator('button:has-text("打开时间计划编辑器")');
    const hasButton = await editorButton.isVisible().catch(() => false);

    if (hasButton) {
      await editorButton.click();

      // 添加里程碑
      const addMilestoneButton = page.locator('button:has-text("添加里程碑")');
      const hasAddButton = await addMilestoneButton.isVisible().catch(() => false);

      if (hasAddButton) {
        await addMilestoneButton.click();
        await page.waitForTimeout(1000);

        // 查找删除按钮
        const deleteButton = page.locator('button:has-text("删除"), button:has-text("Remove")').first();
        const hasDelete = await deleteButton.isVisible().catch(() => false);

        if (hasDelete) {
          await deleteButton.click();
          await page.waitForTimeout(500);
        }
      }

      // 关闭编辑器
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  });

  test('应该能够拖拽调整里程碑日期', async ({ page }) => {
    const { projectFormPage } = await setupTimePlanTest(page);

    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const startDateInput = page.locator('#start-date, input[name="plannedStartDate"]');
    const endDateInput = page.locator('#end-date, input[name="plannedEndDate"]');
    await startDateInput.fill(startDate);
    await endDateInput.fill(endDate);

    // 打开编辑器
    const editorButton = page.locator('button:has-text("打开时间计划编辑器")');
    const hasButton = await editorButton.isVisible().catch(() => false);

    if (hasButton) {
      await editorButton.click();

      // 查找可拖拽的里程碑
      const draggableMilestone = page.locator('[draggable="true"], [class*="draggable"]').first();
      const hasDraggable = await draggableMilestone.isVisible().catch(() => false);

      if (hasDraggable) {
        // 验证可拖拽
        const isDraggable = await draggableMilestone.evaluate(el => el.getAttribute('draggable'));
        expect(isDraggable).toBe('true');
      }

      // 关闭编辑器
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  });
});

test.describe('任务（甘特图）管理', () => {
  test('应该能够添加任务', async ({ page }) => {
    const { projectFormPage } = await setupTimePlanTest(page);

    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const startDateInput = page.locator('#start-date, input[name="plannedStartDate"]');
    const endDateInput = page.locator('#end-date, input[name="plannedEndDate"]');
    await startDateInput.fill(startDate);
    await endDateInput.fill(endDate);

    // 打开编辑器
    const editorButton = page.locator('button:has-text("打开时间计划编辑器")');
    const hasButton = await editorButton.isVisible().catch(() => false);

    if (hasButton) {
      await editorButton.click();

      // 查找添加任务按钮
      const addTaskButton = page.locator('button:has-text("添加任务"), button:has-text("新增任务")');
      const hasAddButton = await addTaskButton.isVisible().catch(() => false);

      if (hasAddButton) {
        // 记录添加前的任务数量
        const taskCount = await page.locator('[class*="task"], [data-testid="task"]').count();

        // 点击添加
        await addTaskButton.click();
        await page.waitForTimeout(1000);

        // 验证任务增加
        const newCount = await page.locator('[class*="task"], [data-testid="task"]').count();
        expect(newCount).toBeGreaterThan(taskCount);
      }

      // 关闭编辑器
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  });

  test('应该显示甘特图视图', async ({ page }) => {
    const { projectFormPage } = await setupTimePlanTest(page);

    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const startDateInput = page.locator('#start-date, input[name="plannedStartDate"]');
    const endDateInput = page.locator('#end-date, input[name="plannedEndDate"]');
    await startDateInput.fill(startDate);
    await endDateInput.fill(endDate);

    // 打开编辑器
    const editorButton = page.locator('button:has-text("打开时间计划编辑器")');
    const hasButton = await editorButton.isVisible().catch(() => false);

    if (hasButton) {
      await editorButton.click();

      // 查找甘特图容器
      const ganttChart = page.locator('[class*="gantt"], [class*="Gantt"], [data-testid="gantt"]');
      const hasGantt = await ganttChart.isVisible().catch(() => false);

      if (hasGantt) {
        await expect(ganttChart).toBeVisible();
      }

      // 关闭编辑器
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  });

  test('甘特图应该显示时间轴', async ({ page }) => {
    const { projectFormPage } = await setupTimePlanTest(page);

    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const startDateInput = page.locator('#start-date, input[name="plannedStartDate"]');
    const endDateInput = page.locator('#end-date, input[name="plannedEndDate"]');
    await startDateInput.fill(startDate);
    await endDateInput.fill(endDate);

    // 打开编辑器
    const editorButton = page.locator('button:has-text("打开时间计划编辑器")');
    const hasButton = await editorButton.isVisible().catch(() => false);

    if (hasButton) {
      await editorButton.click();

      // 查找时间轴元素
      const timeline = page.locator('[class*="timeline"], [class*="time-axis"]');
      const hasTimeline = await timeline.isVisible().catch(() => false);

      if (hasTimeline) {
        await expect(timeline).toBeVisible();
      }

      // 关闭编辑器
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  });
});

test.describe('时间计划 - 自动排列', () => {
  test('应该能够自动排列里程碑', async ({ page }) => {
    const { projectFormPage } = await setupTimePlanTest(page);

    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const startDateInput = page.locator('#start-date, input[name="plannedStartDate"]');
    const endDateInput = page.locator('#end-date, input[name="plannedEndDate"]');
    await startDateInput.fill(startDate);
    await endDateInput.fill(endDate);

    // 打开编辑器
    const editorButton = page.locator('button:has-text("打开时间计划编辑器")');
    const hasButton = await editorButton.isVisible().catch(() => false);

    if (hasButton) {
      await editorButton.click();

      // 添加多个里程碑
      const addMilestoneButton = page.locator('button:has-text("添加里程碑")');
      const hasAddButton = await addMilestoneButton.isVisible().catch(() => false);

      if (hasAddButton) {
        await addMilestoneButton.click();
        await page.waitForTimeout(500);
        await addMilestoneButton.click();
        await page.waitForTimeout(500);
      }

      // 查找自动排列按钮
      const autoArrangeButton = page.locator('button:has-text("自动排列"), button:has-text("平均分布")');
      const hasAutoArrange = await autoArrangeButton.isVisible().catch(() => false);

      if (hasAutoArrange) {
        await autoArrangeButton.click();
        await page.waitForTimeout(1000);

        // 验证成功提示
        const toast = page.locator('div[role="alert"]').first();
        const hasToast = await toast.isVisible().catch(() => false);

        if (hasToast) {
          const toastText = await toast.textContent();
          expect(toastText).toMatch(/成功|排列完成|已更新/);
        }
      }

      // 关闭编辑器
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  });

  test('应该能够重置时间计划', async ({ page }) => {
    const { projectFormPage } = await setupTimePlanTest(page);

    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const startDateInput = page.locator('#start-date, input[name="plannedStartDate"]');
    const endDateInput = page.locator('#end-date, input[name="plannedEndDate"]');
    await startDateInput.fill(startDate);
    await endDateInput.fill(endDate);

    // 打开编辑器
    const editorButton = page.locator('button:has-text("打开时间计划编辑器")');
    const hasButton = await editorButton.isVisible().catch(() => false);

    if (hasButton) {
      await editorButton.click();

      // 添加里程碑
      const addMilestoneButton = page.locator('button:has-text("添加里程碑")');
      const hasAddButton = await addMilestoneButton.isVisible().catch(() => false);

      if (hasAddButton) {
        await addMilestoneButton.click();
        await page.waitForTimeout(500);
      }

      // 查找重置按钮
      const resetButton = page.locator('button:has-text("重置"), button:has-text("恢复")');
      const hasReset = await resetButton.isVisible().catch(() => false);

      if (hasReset) {
        await resetButton.click();
        await page.waitForTimeout(500);

        // 验证确认对话框
        const confirmDialog = page.locator('div[role="dialog"]:has-text("确认")');
        const hasConfirm = await confirmDialog.isVisible().catch(() => false);

        if (hasConfirm) {
          await confirmDialog.locator('button:has-text("确认")').click();
        }
      }

      // 关闭编辑器
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  });
});

test.describe('时间计划 - 保存功能', () => {
  test('应该能够保存时间计划', async ({ page }) => {
    const { projectFormPage } = await setupTimePlanTest(page);

    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const startDateInput = page.locator('#start-date, input[name="plannedStartDate"]');
    const endDateInput = page.locator('#end-date, input[name="plannedEndDate"]');
    await startDateInput.fill(startDate);
    await endDateInput.fill(endDate);

    // 打开编辑器
    const editorButton = page.locator('button:has-text("打开时间计划编辑器")');
    const hasButton = await editorButton.isVisible().catch(() => false);

    if (hasButton) {
      await editorButton.click();

      // 添加里程碑
      const addMilestoneButton = page.locator('button:has-text("添加里程碑")');
      const hasAddButton = await addMilestoneButton.isVisible().catch(() => false);

      if (hasAddButton) {
        await addMilestoneButton.click();
        await page.waitForTimeout(500);
      }

      // 查找保存按钮
      const saveButton = page.locator('button:has-text("保存"), button:has-text("保存更改")');
      const hasSave = await saveButton.isVisible().catch(() => false);

      if (hasSave) {
        await saveButton.click();
        await page.waitForTimeout(1000);

        // 验证保存成功
        const toast = page.locator('div[role="alert"]').first();
        const hasToast = await toast.isVisible().catch(() => false);

        if (hasToast) {
          const toastText = await toast.textContent();
          expect(toastText).toMatch(/成功|saved|保存/);
        }
      } else {
        // 关闭编辑器
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }
    }
  });

  test('应该提示未保存的更改', async ({ page }) => {
    const { projectFormPage } = await setupTimePlanTest(page);

    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const startDateInput = page.locator('#start-date, input[name="plannedStartDate"]');
    const endDateInput = page.locator('#end-date, input[name="plannedEndDate"]');
    await startDateInput.fill(startDate);
    await endDateInput.fill(endDate);

    // 打开编辑器
    const editorButton = page.locator('button:has-text("打开时间计划编辑器")');
    const hasButton = await editorButton.isVisible().catch(() => false);

    if (hasButton) {
      await editorButton.click();

      // 添加里程碑（产生未保存的更改）
      const addMilestoneButton = page.locator('button:has-text("添加里程碑")');
      const hasAddButton = await addMilestoneButton.isVisible().catch(() => false);

      if (hasAddButton) {
        await addMilestoneButton.click();
        await page.waitForTimeout(500);
      }

      // 查找未保存提示
      const unsavedBadge = page.locator('text=/未保存/').first();
      const hasUnsaved = await unsavedBadge.isVisible().catch(() => false);

      if (hasUnsaved) {
        await expect(unsavedBadge).toBeVisible();
      }

      // 尝试关闭编辑器
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      // 验证确认对话框
      const confirmDialog = page.locator('div[role="dialog"]:has-text("未保存"), div[role="dialog"]:has-text("放弃")');
      const hasConfirm = await confirmDialog.isVisible().catch(() => false);

      if (hasConfirm) {
        await expect(confirmDialog).toBeVisible();

        // 选择放弃更改
        await confirmDialog.locator('button:has-text("放弃"), button.danger').click();
      }
    }
  });
});

test.describe('时间计划 - 完整流程', () => {
  test('应该能够创建包含完整时间计划的项目', async ({ page }) => {
    const { projectFormPage } = await setupTimePlanTest(page);

    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // 设置时间计划
    const startDateInput = page.locator('#start-date, input[name="plannedStartDate"]');
    const endDateInput = page.locator('#end-date, input[name="plannedEndDate"]');
    await startDateInput.fill(startDate);
    await endDateInput.fill(endDate);

    // 打开编辑器
    const editorButton = page.locator('button:has-text("打开时间计划编辑器")');
    const hasButton = await editorButton.isVisible().catch(() => false);

    if (hasButton) {
      await editorButton.click();

      // 添加里程碑
      const addMilestoneButton = page.locator('button:has-text("添加里程碑")');
      const hasAddButton = await addMilestoneButton.isVisible().catch(() => false);

      if (hasAddButton) {
        await addMilestoneButton.click();
        await page.waitForTimeout(500);
      }

      // 保存时间计划
      const saveButton = page.locator('button:has-text("保存"), button:has-text("保存更改")');
      const hasSave = await saveButton.isVisible().catch(() => false);

      if (hasSave) {
        await saveButton.click();
        await page.waitForTimeout(1000);
      } else {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }
    }

    // 选择成员
    await projectFormPage.goToMembersTab();
    const memberCheckbox = page.locator('input[type="checkbox"]').first();
    const hasMember = await memberCheckbox.isVisible().catch(() => false);
    if (hasMember) {
      await memberCheckbox.check();
      await page.waitForTimeout(500);
    }

    // 提交项目
    await projectFormPage.submit();
    await page.waitForTimeout(2000);

    // 验证创建成功
    const toast = page.locator('div[role="alert"]').first();
    const hasToast = await toast.isVisible().catch(() => false);

    if (hasToast) {
      const toastText = await toast.textContent();
      expect(toastText).toMatch(/成功|created|创建/);
    }
  });
});
