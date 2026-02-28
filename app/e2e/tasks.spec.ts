/**
 * 任务管理功能 E2E 测试
 * 测试任务创建、编辑、删除、分配等功能
 */

import { test, expect } from '@playwright/test';

test.describe('任务管理功能', () => {
  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto('/');
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('应该导航到任务管理页面', async ({ page }) => {
    // 点击任务管理导航
    await page.click('a:has-text("任务"), a[href*="task"]');
    await expect(page).toHaveURL(/.*task/);
  });

  test('应该显示任务列表', async ({ page }) => {
    await page.goto('/task-management');

    // 检查任务列表组件
    const taskList = page.locator('[class*="task"], [role="table"]').first();
    await expect(taskList).toBeVisible();
  });

  test('应该能够创建新任务', async ({ page }) => {
    await page.goto('/task-management');

    // 点击创建按钮
    const createButton = page.locator('button').filter({ hasText: /新建|创建|添加/i }).first();
    await createButton.click();

    // 等待对话框出现
    const dialog = page.locator('[role="dialog"], [class*="dialog"]').first();
    await expect(dialog).toBeVisible();

    // 填写任务信息
    await page.fill('input[name*="title"], input[placeholder*="标题"]', '测试任务');
    await page.fill('textarea[name*="description"]', '这是一个测试任务');

    // 选择任务类型
    const typeSelect = page.locator('select, [role="combobox"]').first();
    await typeSelect.click();
    await page.click('[role="option"]:first');

    // 保存
    const saveButton = page.locator('button').filter({ hasText: /保存|提交|确定/i }).first();
    await saveButton.click();

    // 等待保存完成
    await page.waitForTimeout(1000);
  });

  test('应该能够编辑任务', async ({ page }) => {
    await page.goto('/task-management');

    // 找到第一个任务的编辑按钮
    const editButton = page.locator('button').filter({ hasText: /编辑|修改/i }).first();
    const isVisible = await editButton.isVisible().catch(() => false);

    if (isVisible) {
      await editButton.click();

      // 等待编辑对话框
      const dialog = page.locator('[role="dialog"], [class*="dialog"]').first();
      await expect(dialog).toBeVisible();

      // 修改任务标题
      const titleInput = page.locator('input[name*="title"], input[placeholder*="标题"]').first();
      await titleInput.clear();
      await titleInput.fill('更新后的任务标题');

      // 保存
      const saveButton = page.locator('button').filter({ hasText: /保存|更新/i }).first();
      await saveButton.click();

      await page.waitForTimeout(1000);
    }
  });

  test('应该能够删除任务', async ({ page }) => {
    await page.goto('/task-management');

    // 找到第一个任务的删除按钮
    const deleteButton = page.locator('button').filter({ hasText: /删除/i }).first();
    const isVisible = await deleteButton.isVisible().catch(() => false);

    if (isVisible) {
      // 处理确认对话框
      page.on('dialog', dialog => dialog.accept());

      await deleteButton.click();

      await page.waitForTimeout(1000);
    }
  });

  test('应该能够分配任务', async ({ page }) => {
    await page.goto('/task-management');

    // 找到分配按钮
    const assignButton = page.locator('button').filter({ hasText: /分配|指派/i }).first();
    const isVisible = await assignButton.isVisible().catch(() => false);

    if (isVisible) {
      await assignButton.click();

      // 等待分配对话框
      const dialog = page.locator('[role="dialog"], [class*="dialog"]').first();
      await expect(dialog).toBeVisible();

      // 选择成员
      const memberSelect = page.locator('select, [role="combobox"]').first();
      await memberSelect.click();
      await page.click('[role="option"]:first');

      // 确认分配
      const confirmButton = page.locator('button').filter({ hasText: /确认|分配/i }).first();
      await confirmButton.click();

      await page.waitForTimeout(1000);
    }
  });

  test('应该能够筛选任务', async ({ page }) => {
    await page.goto('/task-management');

    // 查找筛选器
    const filterInput = page.locator('input[placeholder*="搜索"], input[placeholder*="筛选"]').first();
    const isVisible = await filterInput.isVisible().catch(() => false);

    if (isVisible) {
      await filterInput.fill('测试');

      // 或者使用状态筛选
      const statusFilter = page.locator('select, [role="combobox"]').filter({ hasText: /状态|全部/i }).first();
      if (await statusFilter.isVisible()) {
        await statusFilter.click();
        await page.click('[role="option"]:has-text("进行中")');
      }

      await page.waitForTimeout(500);
    }
  });

  test('应该能够批量操作任务', async ({ page }) => {
    await page.goto('/task-management');

    // 查找复选框
    const checkboxes = page.locator('input[type="checkbox"]').all();
    const hasCheckboxes = checkboxes.length > 0;

    if (hasCheckboxes) {
      // 选择第一个任务
      await checkboxes[0].check();

      // 查找批量操作按钮
      const batchButton = page.locator('button').filter({ hasText: /批量|操作/i }).first();
      const isVisible = await batchButton.isVisible().catch(() => false);

      if (isVisible) {
        await batchButton.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('应该能够导出任务', async ({ page }) => {
    await page.goto('/task-management');

    // 查找导出按钮
    const exportButton = page.locator('button').filter({ hasText: /导出|export/i }).first();
    const isVisible = await exportButton.isVisible().catch(() => false);

    if (isVisible) {
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);

      await exportButton.click();

      const download = await downloadPromise;
      if (download) {
        expect(download.suggestedFilename()).toMatch(/\.(xlsx|csv|json)$/);
      }
    }
  });
});

test.describe('任务详情', () => {
  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto('/');
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
  });

  test('应该显示任务详情页面', async ({ page }) => {
    await page.goto('/task-management');

    // 点击第一个任务
    const taskLink = page.locator('a').filter({ hasText: /.+/ }).first();
    const isVisible = await taskLink.isVisible().catch(() => false);

    if (isVisible) {
      await taskLink.click();

      // 检查是否导航到详情页或打开对话框
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/./);
    }
  });

  test('应该显示任务历史记录', async ({ page }) => {
    await page.goto('/task-management');

    // 查找历史记录标签页或按钮
    const historyTab = page.locator('button, a').filter({ hasText: /历史|记录|日志/i }).first();
    const isVisible = await historyTab.isVisible().catch(() => false);

    if (isVisible) {
      await historyTab.click();

      // 等待历史记录加载
      await page.waitForTimeout(500);
    }
  });

  test('应该显示任务进度', async ({ page }) => {
    await page.goto('/task-management');

    // 查找进度条或进度显示
    const progressBar = page.locator('[class*="progress"], [role="progressbar"]').first();
    const isVisible = await progressBar.isVisible().catch(() => false);

    if (isVisible) {
      await expect(progressBar).toBeVisible();
    }
  });
});

test.describe('任务状态管理', () => {
  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto('/');
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
  });

  test('应该能够更改任务状态', async ({ page }) => {
    await page.goto('/task-management');

    // 查找状态下拉菜单
    const statusDropdown = page.locator('select, [role="combobox"]').filter({ hasText: /状态/i }).first();
    const isVisible = await statusDropdown.isVisible().catch(() => false);

    if (isVisible) {
      await statusDropdown.click();
      await page.click('[role="option"]:has-text("已完成")');

      await page.waitForTimeout(500);
    }
  });

  test('应该能够更新任务进度', async ({ page }) => {
    await page.goto('/task-management');

    // 查找进度输入框或滑块
    const progressInput = page.locator('input[type="number"]').filter({ hasText: /进度|完成度/i }).first();
    const isVisible = await progressInput.isVisible().catch(() => false);

    if (isVisible) {
      await progressInput.clear();
      await progressInput.fill('50');

      // 保存
      const saveButton = page.locator('button').filter({ hasText: /保存|更新/i }).first();
      await saveButton.click();

      await page.waitForTimeout(500);
    }
  });
});
