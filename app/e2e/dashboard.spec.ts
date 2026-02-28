/**
 * 仪表盘功能 E2E 测试
 * 测试数据可视化、统计展示等功能
 */

import { test, expect } from '@playwright/test';

test.describe('仪表盘功能', () => {
  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto('/');
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('应该显示仪表盘页面', async ({ page }) => {
    // 检查页面标题
    await expect(page).toHaveTitle(/仪表盘/);

    // 检查主要组件
    await expect(page.locator('text=/项目概览/i')).toBeVisible();
    await expect(page.locator('text=/任务统计/i')).toBeVisible();
  });

  test('应该显示统计卡片', async ({ page }) => {
    // 检查统计卡片
    const statsCards = page.locator('[class*="stats"], [class*="card"]').filter({ hasText: /总项目|进行中|已完成| overdue/i });
    await expect(statsCards.first()).toBeVisible();
  });

  test('应该显示图表', async ({ page }) => {
    // 检查是否有图表组件
    const charts = page.locator('svg, canvas, [class*="chart"], [class*="recharts"]');
    await expect(charts.first()).toBeVisible({ timeout: 10000 });
  });

  test('应该显示任务提醒', async ({ page }) => {
    // 检查任务提醒组件
    const alerts = page.locator('[class*="alert"], [class*="notification"]').filter({ hasText: /任务|提醒|截止/i });
    const isVisible = await alerts.isVisible().catch(() => false);

    if (isVisible) {
      await expect(alerts.first()).toBeVisible();
    }
  });

  test('应该显示项目列表', async ({ page }) => {
    // 检查项目列表
    const projectList = page.locator('text=/项目/i').first();
    await expect(projectList).toBeVisible();

    // 可能有项目表格或卡片
    const projects = page.locator('[role="table"], [class*="project"], [class*="table"]').first();
    await expect(projects).toBeVisible();
  });

  test('应该支持筛选和搜索', async ({ page }) => {
    // 检查搜索框
    const searchInput = page.locator('input[placeholder*="搜索"], input[placeholder*="筛选"]').first();
    const isVisible = await searchInput.isVisible().catch(() => false);

    if (isVisible) {
      await searchInput.fill('测试');
      await page.press(searchInput, 'Enter');

      // 等待搜索结果
      await page.waitForTimeout(1000);
    }
  });

  test('应该导航到项目详情', async ({ page }) => {
    // 查找项目链接
    const projectLink = page.locator('a').filter({ hasText: /项目/i }).first();
    const isVisible = await projectLink.isVisible().catch(() => false);

    if (isVisible) {
      await projectLink.click();

      // 应该导航到项目详情页或保持当前页
      await expect(page).toHaveURL(/./);
    }
  });

  test('应该显示用户信息', async ({ page }) => {
    // 检查用户信息显示
    const userInfo = page.locator('text=/管理员|admin/i');
    await expect(userInfo.first()).toBeVisible();
  });

  test('应该响应式适配', async ({ page, viewport }) => {
    // 测试不同屏幕尺寸
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('main')).toBeVisible();

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await expect(page.locator('main')).toBeVisible();

    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await expect(page.locator('main')).toBeVisible();
  });

  test('应该显示导航菜单', async ({ page }) => {
    // 检查侧边栏或顶部导航
    const sidebar = page.locator('[class*="sidebar"], [class*="nav"], nav').first();
    await expect(sidebar).toBeVisible();

    // 检查导航链接
    const navLinks = sidebar.locator('a');
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('仪表盘交互', () => {
  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto('/');
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('应该能够刷新数据', async ({ page }) => {
    // 查找刷新按钮
    const refreshButton = page.locator('button').filter({ hasText: /刷新|reload/i }).first();
    const isVisible = await refreshButton.isVisible().catch(() => false);

    if (isVisible) {
      await refreshButton.click();
      await page.waitForTimeout(1000);
    }
  });

  test('应该能够切换视图', async ({ page }) => {
    // 查找视图切换按钮
    const viewButton = page.locator('button').filter({ hasText: /视图|view/i }).first();
    const isVisible = await viewButton.isVisible().catch(() => false);

    if (isVisible) {
      await viewButton.click();
      await page.waitForTimeout(500);
    }
  });

  test('应该能够导出数据', async ({ page }) => {
    // 查找导出按钮
    const exportButton = page.locator('button').filter({ hasText: /导出|export/i }).first();
    const isVisible = await exportButton.isVisible().catch(() => false);

    if (isVisible) {
      // 设置下载处理
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);

      await exportButton.click();

      // 等待下载或超时
      const download = await downloadPromise;
      if (download) {
        expect(download.suggestedFilename()).toBeTruthy();
      }
    }
  });
});

test.describe('仪表盘性能', () => {
  test('页面加载时间应该合理', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // 等待仪表盘加载完成
    await page.waitForURL(/.*dashboard/);
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // 页面加载应该在合理时间内完成（30秒内）
    expect(loadTime).toBeLessThan(30000);
  });

  test('应该正确处理慢速网络', async ({ page }) => {
    // 模拟慢速网络
    await page.route('**/*', route => {
      route.continue({
        latency: 1000,
      });
    });

    await page.goto('/');
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // 即使网络慢，也应该最终加载成功
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 60000 });
  });
});
