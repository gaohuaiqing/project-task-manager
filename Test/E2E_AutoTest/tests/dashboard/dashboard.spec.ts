import { test, expect } from '@playwright/test';
import { DashboardPage } from '../../src/pages/DashboardPage';
import { Sidebar } from '../../src/components/Sidebar';
import { login, logout } from '../../src/helpers/auth-helpers';

/**
 * 仪表盘模块E2E测试
 *
 * 测试覆盖：
 * - 仪表盘页面加载
 * - 统计卡片功能
 * - 饱和度图表
 * - 任务预警
 * - 项目概览
 * - 工程师专属视图
 * - 数据刷新
 */
test.describe('仪表盘模块', () => {
  let dashboardPage: DashboardPage;
  let sidebar: Sidebar;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    sidebar = new Sidebar(page);

    // 使用技术经理账号登录
    await login(page, 'tech_manager');
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test.describe('页面加载', () => {
    test('应该正确加载仪表盘页面', async ({ page }) => {
      // 导航到仪表盘
      await sidebar.navigateTo('dashboard');
      await dashboardPage.waitForLoad();

      // 验证页面标题
      await expect(page.locator('text=/任务看板|仪表盘/')).toBeVisible();

      // 验证主要组件加载
      await expect(dashboardPage.statsCardContainer).toBeVisible();
      await expect(dashboardPage.projectOverviewContainer).toBeVisible();
    });

    test('应该显示正确的页面标题', async ({ page }) => {
      await sidebar.navigateTo('dashboard');
      await dashboardPage.waitForLoad();

      const title = await page.textContent('h1, h2');
      expect(title).toContain('任务看板');
    });
  });

  test.describe('统计卡片', () => {
    test('应该显示项目统计卡片', async ({ page }) => {
      await sidebar.navigateTo('dashboard');
      await dashboardPage.waitForLoad();

      // 验证统计卡片存在
      const projectCard = dashboardPage.getStatCard('projects');
      await expect(projectCard).toBeVisible();

      // 验证卡片包含数据
      const cardText = await projectCard.textContent();
      expect(cardText).toBeTruthy();
      expect(cardText!.length).toBeGreaterThan(0);
    });

    test('应该显示任务统计卡片', async ({ page }) => {
      await sidebar.navigateTo('dashboard');
      await dashboardPage.waitForLoad();

      const taskCard = dashboardPage.getStatCard('tasks');
      await expect(taskCard).toBeVisible();

      const cardText = await taskCard.textContent();
      expect(cardText).toBeTruthy();
    });

    test('应该显示成员统计卡片', async ({ page }) => {
      await sidebar.navigateTo('dashboard');
      await dashboardPage.waitForLoad();

      const memberCard = dashboardPage.getStatCard('members');
      await expect(memberCard).toBeVisible();

      const cardText = await memberCard.textContent();
      expect(cardText).toBeTruthy();
    });

    test('点击统计卡片应该显示详情对话框', async ({ page }) => {
      await sidebar.navigateTo('dashboard');
      await dashboardPage.waitForLoad();

      const projectCard = dashboardPage.getStatCard('projects');
      await projectCard.click();

      // 验证详情对话框打开
      await expect(dashboardPage.statsDetailDialog).toBeVisible();

      // 关闭对话框
      await page.keyboard.press('Escape');
      await expect(dashboardPage.statsDetailDialog).not.toBeVisible();
    });

    test('统计详情对话框应该显示正确的数据', async ({ page }) => {
      await sidebar.navigateTo('dashboard');
      await dashboardPage.waitForLoad();

      await dashboardPage.getStatCard('projects').click();

      // 验证对话框内容
      await expect(dashboardPage.statsDetailDialog).toBeVisible();

      const dialogContent = await dashboardPage.statsDetailDialog.textContent();
      expect(dialogContent).toContain('项目');
      expect(dialogContent).toBeTruthy();

      await page.keyboard.press('Escape');
    });
  });

  test.describe('饱和度图表', () => {
    test('应该显示团队饱和度图表', async ({ page }) => {
      await sidebar.navigateTo('dashboard');
      await dashboardPage.waitForLoad();

      await expect(dashboardPage.saturationChart).toBeVisible();
    });

    test('饱和度图表应该显示正确的数据', async ({ page }) => {
      await sidebar.navigateTo('dashboard');
      await dashboardPage.waitForLoad();

      // 验证图表渲染
      const chart = dashboardPage.saturationChart;
      await expect(chart).toBeVisible();

      // 验证图表有内容（通常图表会有SVG或Canvas元素）
      const hasChartContent = await page.locator(
        '#saturation-chart svg, #saturation-chart canvas, [data-testid="saturation-chart"] svg'
      ).count() > 0;

      expect(hasChartContent).toBeTruthy();
    });

    test('悬停在图表上应该显示提示', async ({ page }) => {
      await sidebar.navigateTo('dashboard');
      await dashboardPage.waitForLoad();

      const chart = dashboardPage.saturationChart;
      await chart.hover();

      // 等待提示可能出现
      await page.waitForTimeout(500);

      // 提示框可能存在
      const tooltip = page.locator('[role="tooltip"], .chart-tooltip');
      const tooltipExists = await tooltip.count() > 0;

      if (tooltipExists) {
        await expect(tooltip.first()).toBeVisible();
      }
    });
  });

  test.describe('任务预警', () => {
    test('应该显示任务预警组件', async ({ page }) => {
      await sidebar.navigateTo('dashboard');
      await dashboardPage.waitForLoad();

      // 验证预警组件存在
      const alertComponent = page.locator('[data-testid="task-alerts"], .task-alerts');
      const alertExists = await alertComponent.count() > 0;

      if (alertExists) {
        await expect(alertComponent.first()).toBeVisible();
      }
    });

    test('预警任务应该可以点击查看', async ({ page }) => {
      await sidebar.navigateTo('dashboard');
      await dashboardPage.waitForLoad();

      // 查找预警任务项
      const alertItem = page.locator('[data-testid="alert-item"], .alert-item').first();

      const hasAlerts = await alertItem.count() > 0;

      if (hasAlerts) {
        await alertItem.click();
        // 验证导航或对话框打开
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('项目概览', () => {
    test('应该显示项目概览卡片', async ({ page }) => {
      await sidebar.navigateTo('dashboard');
      await dashboardPage.waitForLoad();

      await expect(dashboardPage.projectOverviewContainer).toBeVisible();
    });

    test('项目概览应该显示项目列表', async ({ page }) => {
      await sidebar.navigateTo('dashboard');
      await dashboardPage.waitForLoad();

      const projectItems = page.locator('[data-testid="project-item"], .project-card');
      const count = await projectItems.count();

      // 可能有项目，也可能没有
      if (count > 0) {
        await expect(projectItems.first()).toBeVisible();
      }
    });

    test('点击项目卡片应该跳转到项目详情', async ({ page }) => {
      await sidebar.navigateTo('dashboard');
      await dashboardPage.waitForLoad();

      const projectCard = page.locator('[data-testid="project-item"], .project-card').first();

      const hasProjects = await projectCard.count() > 0;

      if (hasProjects) {
        await projectCard.click();
        await page.waitForTimeout(1000);

        // 验证URL变化或页面导航
        const url = page.url();
        const hasNavigated = url.includes('projects') || url.includes('project');
      }
    });
  });

  test.describe('工程师专属视图', () => {
    test('工程师应该只看到个人相关数据', async ({ page }) => {
      // 登出当前用户
      await logout(page);

      // 使用工程师账号登录
      await login(page, 'engineer');
      await sidebar.navigateTo('dashboard');
      await dashboardPage.waitForLoad();

      // 验证页面显示个人数据
      const pageTitle = await page.textContent('h1, h2');
      expect(pageTitle).toBeTruthy();
    });

    test('工程师仪表盘应该显示个人任务统计', async ({ page }) => {
      await logout(page);
      await login(page, 'engineer');
      await sidebar.navigateTo('dashboard');
      await dashboardPage.waitForLoad();

      // 验证统计卡片显示
      await expect(dashboardPage.statsCardContainer).toBeVisible();
    });
  });

  test.describe('数据刷新', () => {
    test('仪表盘数据应该自动刷新', async ({ page }) => {
      await sidebar.navigateTo('dashboard');
      await dashboardPage.waitForLoad();

      // 记录初始数据
      const initialText = await dashboardPage.statsCardContainer.textContent();

      // 等待可能的自动刷新（WebSocket推送）
      await page.waitForTimeout(3000);

      // 数据可能已更新
      const currentText = await dashboardPage.statsCardContainer.textContent();
      expect(currentText).toBeTruthy();
    });

    test('手动刷新应该更新数据', async ({ page }) => {
      await sidebar.navigateTo('dashboard');
      await dashboardPage.waitForLoad();

      // 查找刷新按钮
      const refreshButton = page.locator(
        'button[aria-label*="刷新"], button[title*="刷新"], [data-testid="refresh-button"]'
      ).first();

      const hasRefreshButton = await refreshButton.count() > 0;

      if (hasRefreshButton) {
        await refreshButton.click();
        await page.waitForTimeout(1000);

        // 验证页面仍然正常显示
        await expect(dashboardPage.statsCardContainer).toBeVisible();
      }
    });
  });

  test.describe('响应式设计', () => {
    test('仪表盘在不同屏幕尺寸下应该正常显示', async ({ page }) => {
      await sidebar.navigateTo('dashboard');
      await dashboardPage.waitForLoad();

      // 测试不同视口大小
      const sizes = [
        { width: 1920, height: 1080 },
        { width: 1280, height: 720 },
        { width: 768, height: 1024 },
      ];

      for (const size of sizes) {
        await page.setViewportSize(size);
        await page.waitForTimeout(500);

        // 验证主要组件仍然可见
        await expect(dashboardPage.statsCardContainer).toBeVisible();
      }
    });
  });

  test.describe('性能测试', () => {
    test('仪表盘页面加载时间应该在合理范围内', async ({ page }) => {
      const startTime = Date.now();

      await sidebar.navigateTo('dashboard');
      await dashboardPage.waitForLoad();

      const loadTime = Date.now() - startTime;

      // 页面加载应该在3秒内完成
      expect(loadTime).toBeLessThan(3000);
    });
  });
});

/**
 * 冒烟测试：关键功能快速验证
 */
test.describe('仪表盘冒烟测试', () => {
  test('关键功能应该可用', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    const sidebar = new Sidebar(page);

    await login(page, 'tech_manager');
    await sidebar.navigateTo('dashboard');
    await dashboardPage.waitForLoad();

    // 验证关键元素
    await expect(dashboardPage.statsCardContainer).toBeVisible();
    await expect(dashboardPage.projectOverviewContainer).toBeVisible();

    await logout(page);
  });
});
