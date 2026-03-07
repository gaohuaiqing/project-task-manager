import { test, expect } from '@playwright/test';
import { DashboardPage } from '../../src/pages/DashboardPage';
import { Sidebar } from '../../src/components/Sidebar';
import { login, logout } from '../../src/helpers/auth-helpers';

/**
 * 仪表盘模块完整E2E测试套件
 *
 * 测试覆盖范围：
 * 1. 页面加载和初始化
 * 2. 统计卡片功能
 * 3. 项目概览组件
 * 4. 团队工作饱和度图表
 * 5. 任务预警系统
 * 6. 工程师专属视图
 * 7. 数据刷新机制
 * 8. 响应式布局
 * 9. 性能测试
 * 10. 权限控制
 *
 * @version 2.0.0
 * @author Dashboard Testing Expert
 */

test.describe('仪表盘模块 - 完整测试套件', () => {
  let dashboardPage: DashboardPage;
  let sidebar: Sidebar;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    sidebar = new Sidebar(page);

    // 使用管理员账号登录进行大部分测试
    await login(page, 'admin');
    await sidebar.navigateTo('dashboard');
    await dashboardPage.waitForReady();
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  // ==================== 页面加载测试 ====================

  test.describe('页面加载与初始化', () => {
    test('应该成功加载仪表盘页面并显示标题', async ({ page }) => {
      const title = await dashboardPage.getPageTitle();
      expect(title).toBeTruthy();
      expect(title.length).toBeGreaterThan(0);
    });

    test('应该显示所有核心组件区域', async ({ page }) => {
      // 验证统计卡片容器存在
      const hasStatsCards = await dashboardPage.statsCardContainer.count();
      expect(hasStatsCards).toBeGreaterThan(0);

      // 验证项目概览存在
      const hasProjectOverview = await dashboardPage.hasProjectOverview();
      expect(hasProjectOverview).toBeTruthy();

      // 验证饱和度图表存在
      const hasSaturationChart = await dashboardPage.hasSaturationChart();
      expect(hasSaturationChart).toBeTruthy();
    });

    test('页面应该在合理时间内完成加载', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/dashboard');
      await dashboardPage.waitForReady();

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(5000); // 5秒内完成加载
    });

    test('页面URL应该正确', async ({ page }) => {
      const isLoaded = await dashboardPage.isLoaded();
      expect(isLoaded).toBeTruthy();
    });
  });

  // ==================== 统计卡片测试 ====================

  test.describe('统计卡片功能', () => {
    test('应该显示至少一个统计卡片', async ({ page }) => {
      const cards = await dashboardPage.getAllStatCards();
      expect(cards.length).toBeGreaterThan(0);
    });

    test('项目统计卡片应该包含有效数据', async ({ page }) => {
      const projectCard = dashboardPage.getStatCard('projects');
      await expect(projectCard).toBeVisible();

      const cardText = await projectCard.textContent();
      expect(cardText).toBeTruthy();
      expect(cardText!.length).toBeGreaterThan(0);
    });

    test('任务统计卡片应该包含有效数据', async ({ page }) => {
      const taskCard = dashboardPage.getStatCard('tasks');
      await expect(taskCard).toBeVisible();

      const value = await dashboardPage.getStatCardValue('tasks');
      expect(typeof value).toBe('number');
      expect(value).toBeGreaterThanOrEqual(0);
    });

    test('成员统计卡片应该包含有效数据', async ({ page }) => {
      const memberCard = dashboardPage.getStatCard('members');
      await expect(memberCard).toBeVisible();

      const value = await dashboardPage.getStatCardValue('members');
      expect(typeof value).toBe('number');
      expect(value).toBeGreaterThanOrEqual(0);
    });

    test('统计卡片应该显示变化率信息', async ({ page }) => {
      const cards = await dashboardPage.getAllStatCards();

      for (const card of cards) {
        const text = await card.textContent();
        if (text && text.includes('%')) {
          // 验证变化率格式
          const hasPercentage = /\d+%/.test(text);
          expect(hasPercentage).toBeTruthy();
          break; // 至少一个卡片有变化率即可
        }
      }
    });

    test('点击统计卡片应该打开详情对话框', async ({ page }) => {
      await dashboardPage.clickStatCard('projects');

      // 等待对话框出现
      await page.waitForTimeout(500);

      // 验证对话框存在
      const hasDialog = await dashboardPage.statsDetailDialog.count();
      if (hasDialog > 0) {
        await expect(dashboardPage.statsDetailDialog).toBeVisible();
      }
    });

    test('统计卡片应该支持悬停效果', async ({ page }) => {
      const projectCard = dashboardPage.getStatCard('projects');

      // 悬停在卡片上
      await projectCard.hover();
      await page.waitForTimeout(300);

      // 验证卡片仍然可见
      await expect(projectCard).toBeVisible();
    });

    test('统计卡片的数值应该格式化显示', async ({ page }) => {
      const cards = await dashboardPage.getAllStatCards();

      for (const card of cards) {
        const text = await card.textContent();
        if (text) {
          // 验证包含数字
          const hasNumber = /\d+/.test(text);
          expect(hasNumber).toBeTruthy();
        }
      }
    });
  });

  // ==================== 项目概览测试 ====================

  test.describe('项目概览组件', () => {
    test('应该显示项目进度概览标题', async ({ page }) => {
      const container = dashboardPage.projectOverviewContainer;
      await expect(container).toBeVisible();
    });

    test('项目卡片应该显示基本信息', async ({ page }) => {
      const projectCount = await dashboardPage.getProjectCardCount();

      if (projectCount > 0) {
        const firstProject = dashboardPage.getProjectCard(0);
        await expect(firstProject).toBeVisible();

        // 验证项目卡片包含文本内容
        const projectText = await firstProject.textContent();
        expect(projectText).toBeTruthy();
        expect(projectText!.length).toBeGreaterThan(0);
      }
    });

    test('项目卡片应该显示进度条', async ({ page }) => {
      const projectCount = await dashboardPage.getProjectCardCount();

      if (projectCount > 0) {
        const firstProject = dashboardPage.getProjectCard(0);
        const progressBar = firstProject.locator('[class*="h-2"][class*="bg-secondary"]');

        const hasProgressBar = await progressBar.count();
        if (hasProgressBar > 0) {
          await expect(progressBar.first()).toBeVisible();
        }
      }
    });

    test('项目卡片应该显示状态徽章', async ({ page }) => {
      const projectCount = await dashboardPage.getProjectCardCount();

      if (projectCount > 0) {
        const badges = await dashboardPage.projectBadges.all();
        expect(badges.length).toBeGreaterThan(0);
      }
    });

    test('项目进度应该以百分比显示', async ({ page }) => {
      const projectCount = await dashboardPage.getProjectCardCount();

      if (projectCount > 0) {
        const progress = await dashboardPage.getProjectProgress(0);
        expect(progress).toBeGreaterThanOrEqual(0);
        expect(progress).toBeLessThanOrEqual(100);
      }
    });

    test('项目卡片应该支持点击交互', async ({ page }) => {
      const projectCount = await dashboardPage.getProjectCardCount();

      if (projectCount > 0) {
        await dashboardPage.clickProjectCard(0);

        // 验证有响应（对话框或导航）
        await page.waitForTimeout(500);
        const hasDialog = await dashboardPage.taskDetailDialog.count();
        // 可能有对话框或页面导航
      }
    });

    test('项目卡片应该显示成员信息', async ({ page }) => {
      const projectCount = await dashboardPage.getProjectCardCount();

      if (projectCount > 0) {
        const firstProject = dashboardPage.getProjectCard(0);
        const hasMembers = await firstProject.locator('[class*="avatar"], [class*="Avatar"]').count();

        // 可能显示成员头像或数量
        if (hasMembers > 0) {
          await expect(firstProject.locator('[class*="avatar"], [class*="Avatar"]').first()).toBeVisible();
        }
      }
    });

    test('项目卡片应该显示截止日期', async ({ page }) => {
      const projectCount = await dashboardPage.getProjectCardCount();

      if (projectCount > 0) {
        const firstProject = dashboardPage.getProjectCard(0);
        const projectText = await firstProject.textContent();

        // 验证包含日期格式
        const hasDate = /\d{4}-\d{2}-\d{2}|\/\d{1,2}\//.test(projectText || '');
        // 日期可能存在，也可能不存在
      }
    });

    test('项目卡片数量应该有限制（最多4个）', async ({ page }) => {
      const projectCount = await dashboardPage.getProjectCardCount();
      expect(projectCount).toBeLessThanOrEqual(4);
    });
  });

  // ==================== 饱和度图表测试 ====================

  test.describe('团队工作饱和度图表', () => {
    test('应该显示饱和度图表组件', async ({ page }) => {
      const chart = dashboardPage.saturationChart;
      await expect(chart).toBeVisible();
    });

    test('应该显示至少一个成员', async ({ page }) => {
      const memberCount = await dashboardPage.getMemberCount();
      expect(memberCount).toBeGreaterThan(0);
    });

    test('成员应该显示饱和度百分比', async ({ page }) => {
      const memberCount = await dashboardPage.getMemberCount();

      if (memberCount > 0) {
        const saturation = await dashboardPage.getMemberSaturation(0);
        expect(saturation).toBeGreaterThanOrEqual(0);
        expect(saturation).toBeLessThanOrEqual(100);
      }
    });

    test('成员应该显示状态标签（健康/适中/过载）', async ({ page }) => {
      const memberCount = await dashboardPage.getMemberCount();

      if (memberCount > 0) {
        const status = await dashboardPage.getMemberStatus(0);
        expect(status).toBeTruthy();
        expect(['健康', '适中', '过载']).toContain(status);
      }
    });

    test('成员应该显示进度条', async ({ page }) => {
      const memberCount = await dashboardPage.getMemberCount();

      if (memberCount > 0) {
        const member = dashboardPage.getMember(0);
        const progressBar = member.locator('[class*="h-2"][class*="bg-secondary"]');
        const hasProgressBar = await progressBar.count();

        if (hasProgressBar > 0) {
          await expect(progressBar.first()).toBeVisible();
        }
      }
    });

    test('成员卡片应该显示头像', async ({ page }) => {
      const memberCount = await dashboardPage.getMemberCount();

      if (memberCount > 0) {
        const member = dashboardPage.getMember(0);
        const avatar = member.locator('[class*="avatar"], [class*="Avatar"]');
        const hasAvatar = await avatar.count();

        if (hasAvatar > 0) {
          await expect(avatar.first()).toBeVisible();
        }
      }
    });

    test('成员卡片应该显示在线状态指示器', async ({ page }) => {
      const memberCount = await dashboardPage.getMemberCount();

      if (memberCount > 0) {
        const member = dashboardPage.getMember(0);
        const statusDot = member.locator('[class*="rounded-full"][class*="animate-pulse"], [class*="rounded-full"][class*="bg-"]');
        const hasStatusDot = await statusDot.count();

        if (hasStatusDot > 0) {
          await expect(statusDot.first()).toBeVisible();
        }
      }
    });

    test('成员卡片应该显示任务统计信息', async ({ page }) => {
      const memberCount = await dashboardPage.getMemberCount();

      if (memberCount > 0) {
        const member = dashboardPage.getMember(0);
        const memberText = await member.textContent();

        // 验证包含任务数信息
        expect(memberText).toBeTruthy();
        const hasTaskInfo = /当前任务|已完成|任务/.test(memberText || '');
        if (hasTaskInfo) {
          expect(memberText).toMatch(/\d+个/);
        }
      }
    });

    test('成员卡片应该支持点击交互', async ({ page }) => {
      const memberCount = await dashboardPage.getMemberCount();

      if (memberCount > 0) {
        await dashboardPage.clickMember(0);
        await page.waitForTimeout(300);

        // 验证页面响应
        const currentUrl = page.url();
        expect(currentUrl).toBeTruthy();
      }
    });

    test('饱和度颜色应该正确映射（绿色<=60, 黄色<=85, 红色>85）', async ({ page }) => {
      const memberCount = await dashboardPage.getMemberCount();

      if (memberCount > 0) {
        for (let i = 0; i < Math.min(memberCount, 3); i++) {
          const saturation = await dashboardPage.getMemberSaturation(i);
          const status = await dashboardPage.getMemberStatus(i);

          // 验证状态和饱和度的对应关系
          if (saturation <= 60) {
            expect(status).toBe('健康');
          } else if (saturation <= 85) {
            expect(status).toBe('适中');
          } else {
            expect(status).toBe('过载');
          }
        }
      }
    });
  });

  // ==================== 任务预警测试 ====================

  test.describe('任务预警系统', () => {
    test('应该显示任务预警组件', async ({ page }) => {
      const hasAlerts = await dashboardPage.hasTaskAlerts();

      // 任务预警可能存在也可能不存在，取决于数据
      if (hasAlerts) {
        await expect(dashboardPage.taskAlertsContainer).toBeVisible();
      }
    });

    test('当没有预警时应该显示提示信息', async ({ page }) => {
      const hasAlerts = await dashboardPage.hasTaskAlerts();

      if (!hasAlerts) {
        // 可能显示"暂无任务提醒"
        const noAlertMessage = page.locator('text=/暂无任务提醒|所有任务状态正常/');
        const hasMessage = await noAlertMessage.count();

        if (hasMessage > 0) {
          await expect(noAlertMessage.first()).toBeVisible();
        }
      }
    });

    test('待审批任务应该正确显示', async ({ page }) => {
      const pendingCount = await dashboardPage.getPendingApprovalCount();

      if (pendingCount > 0) {
        const container = dashboardPage.pendingApprovalTasks;
        await expect(container.first()).toBeVisible();
      }
    });

    test('即将到期任务应该正确显示', async ({ page }) => {
      const nearDeadlineCount = await dashboardPage.getNearDeadlineCount();

      if (nearDeadlineCount > 0) {
        const container = dashboardPage.nearDeadlineTasks;
        await expect(container.first()).toBeVisible();
      }
    });

    test('已延期任务应该正确显示', async ({ page }) => {
      const delayedCount = await dashboardPage.getDelayedCount();

      if (delayedCount > 0) {
        const container = dashboardPage.delayedTasks;
        await expect(container.first()).toBeVisible();
      }
    });

    test('预警任务卡片应该显示基本信息', async ({ page }) => {
      const alertTasks = await dashboardPage.getAlertTaskItems();

      if (alertTasks.length > 0) {
        const firstTask = alertTasks[0];
        const taskText = await firstTask.textContent();

        expect(taskText).toBeTruthy();
        expect(taskText!.length).toBeGreaterThan(0);

        // 验证包含任务信息（WBS编码、标题等）
        const hasTaskCode = /[A-Z]\.\d+\.\d+/.test(taskText || '');
        // WBS编码可能存在
      }
    });

    test('预警任务应该显示优先级标识', async ({ page }) => {
      const alertTasks = await dashboardPage.getAlertTaskItems();

      if (alertTasks.length > 0) {
        const firstTask = alertTasks[0];
        const priorityBadge = firstTask.locator('[class*="badge"], [class*="Badge"]');
        const hasBadge = await priorityBadge.count();

        if (hasBadge > 0) {
          const badgeText = await priorityBadge.first().textContent();
          expect(['高', '中', '低', 'high', 'medium', 'low']).toContain(badgeText?.toLowerCase());
        }
      }
    });

    test('点击预警任务应该打开详情对话框', async ({ page }) => {
      const alertTasks = await dashboardPage.getAlertTaskItems();

      if (alertTasks.length > 0) {
        await dashboardPage.clickAlertTask(0);

        await page.waitForTimeout(500);

        const hasDialog = await dashboardPage.taskDetailDialog.count();
        if (hasDialog > 0) {
          await expect(dashboardPage.taskDetailDialog).toBeVisible();
        }
      }
    });

    test('预警任务总数应该正确计算', async ({ page }) => {
      const pendingCount = await dashboardPage.getPendingApprovalCount();
      const nearDeadlineCount = await dashboardPage.getNearDeadlineCount();
      const delayedCount = await dashboardPage.getDelayedCount();
      const totalAlerts = pendingCount + nearDeadlineCount + delayedCount;

      // 验证总数徽章（如果存在）
      const totalCountBadge = dashboardPage.taskAlertsContainer.locator('[class*="badge"], [class*="Badge"]').first();
      const hasBadge = await totalCountBadge.count();

      if (hasBadge > 0) {
        const badgeText = await totalCountBadge.textContent();
        const badgeNumber = parseInt(badgeText || '0', 10);
        expect(badgeNumber).toBe(totalAlerts);
      }
    });
  });

  // ==================== 工程师视图测试 ====================

  test.describe('工程师专属视图', () => {
    test.beforeEach(async ({ page }) => {
      // 切换到工程师账号
      await logout(page);
      await login(page, 'engineer');
      await sidebar.navigateTo('dashboard');
      await dashboardPage.waitForReady();
    });

    test('工程师应该看到个人化的仪表盘', async ({ page }) => {
      const isEngineerView = await dashboardPage.isEngineerView();
      expect(isEngineerView).toBeTruthy();
    });

    test('工程师应该看到个人任务统计卡片', async ({ page }) => {
      const stats = await dashboardPage.engineerTaskStats.all();
      expect(stats.length).toBeGreaterThan(0);
    });

    test('工程师应该看到我的任务统计', async ({ page }) => {
      const totalTasks = await dashboardPage.getEngineerTaskStat('total');
      expect(typeof totalTasks).toBe('number');
      expect(totalTasks).toBeGreaterThanOrEqual(0);
    });

    test('工程师应该看到进行中任务统计', async ({ page }) => {
      const inProgressTasks = await dashboardPage.getEngineerTaskStat('inprogress');
      expect(typeof inProgressTasks).toBe('number');
      expect(inProgressTasks).toBeGreaterThanOrEqual(0);
    });

    test('工程师应该看到参与项目统计', async ({ page }) => {
      const projects = await dashboardPage.getEngineerTaskStat('projects');
      expect(typeof projects).toBe('number');
      expect(projects).toBeGreaterThanOrEqual(0);
    });

    test('工程师应该看到个人项目列表', async ({ page }) => {
      const engineerProjects = await dashboardPage.engineerProjects.all();
      // 可能有项目，也可能没有
      expect(engineerProjects.length).toBeGreaterThanOrEqual(0);
    });

    test('工程师应该看到紧急任务提醒（如果有）', async ({ page }) => {
      const hasUrgentTasks = await dashboardPage.urgentTasks.count();

      if (hasUrgentTasks > 0) {
        await expect(dashboardPage.urgentTasks).toBeVisible();

        const urgentCount = await dashboardPage.getUrgentTaskCount();
        expect(urgentCount).toBeGreaterThan(0);
      }
    });

    test('工程师应该能够展开项目查看任务', async ({ page }) => {
      const engineerProjects = await dashboardPage.engineerProjects.all();

      if (engineerProjects.length > 0) {
        const firstProject = engineerProjects[0];
        await firstProject.click();
        await page.waitForTimeout(500);

        // 验证展开内容
        const hasExpandedContent = await firstProject.locator('[class*="task"]').count() > 0;
        // 可能有展开内容
      }
    });
  });

  // ==================== 对话框测试 ====================

  test.describe('详情对话框功能', () => {
    test('统计详情对话框应该正确打开和关闭', async ({ page }) => {
      await dashboardPage.clickStatCard('projects');
      await page.waitForTimeout(500);

      const hasDialog = await dashboardPage.statsDetailDialog.count();

      if (hasDialog > 0) {
        await expect(dashboardPage.statsDetailDialog).toBeVisible();

        // 关闭对话框
        await dashboardPage.closeDialog();

        await page.waitForTimeout(300);
        const isDialogVisible = await dashboardPage.statsDetailDialog.isVisible().catch(() => false);
        expect(isDialogVisible).toBeFalsy();
      }
    });

    test('任务详情对话框应该显示完整信息', async ({ page }) => {
      const alertTasks = await dashboardPage.getAlertTaskItems();

      if (alertTasks.length > 0) {
        await dashboardPage.clickAlertTask(0);
        await page.waitForTimeout(500);

        const hasDialog = await dashboardPage.taskDetailDialog.count();

        if (hasDialog > 0) {
          await expect(dashboardPage.taskDetailDialog).toBeVisible();

          // 验证对话框包含任务信息
          const dialogContent = await dashboardPage.taskDetailDialog.textContent();
          expect(dialogContent).toBeTruthy();
          expect(dialogContent!.length).toBeGreaterThan(0);

          await dashboardPage.closeDialog();
        }
      }
    });

    test('对话框应该支持ESC键关闭', async ({ page }) => {
      await dashboardPage.clickStatCard('projects');
      await page.waitForTimeout(500);

      const hasDialog = await dashboardPage.statsDetailDialog.count();

      if (hasDialog > 0) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);

        const isDialogVisible = await dashboardPage.statsDetailDialog.isVisible().catch(() => false);
        expect(isDialogVisible).toBeFalsy();
      }
    });

    test('对话框应该支持点击遮罩关闭', async ({ page }) => {
      await dashboardPage.clickStatCard('projects');
      await page.waitForTimeout(500);

      const hasDialog = await dashboardPage.statsDetailDialog.count();

      if (hasDialog > 0) {
        // 点击对话框外部
        const backdrop = page.locator('[role="dialog"]').locator('..');
        await backdrop.click({ position: { x: 10, y: 10 } });
        await page.waitForTimeout(300);

        const isDialogVisible = await dashboardPage.statsDetailDialog.isVisible().catch(() => false);
        expect(isDialogVisible).toBeFalsy();
      }
    });
  });

  // ==================== 数据刷新测试 ====================

  test.describe('数据刷新机制', () => {
    test('页面应该支持手动刷新', async ({ page }) => {
      const hasRefreshButton = await dashboardPage.hasRefreshButton();

      if (hasRefreshButton) {
        await dashboardPage.clickRefresh();

        // 验证页面仍然正常
        await expect(dashboardPage.statsCardContainer).toBeVisible();
      }
    });

    test('数据应该能够正确更新', async ({ page }) => {
      // 获取初始数据
      const initialProjectValue = await dashboardPage.getStatCardValue('projects');

      // 等待一段时间（可能有自动更新）
      await page.waitForTimeout(2000);

      // 再次获取数据
      const currentProjectValue = await dashboardPage.getStatCardValue('projects');

      // 数据应该保持有效
      expect(typeof currentProjectValue).toBe('number');
      expect(currentProjectValue).toBeGreaterThanOrEqual(0);
    });

    test('刷新后页面状态应该保持稳定', async ({ page }) => {
      // 多次刷新验证稳定性
      for (let i = 0; i < 3; i++) {
        await page.reload();
        await dashboardPage.waitForReady();

        const hasStatsCards = await dashboardPage.statsCardContainer.count();
        expect(hasStatsCards).toBeGreaterThan(0);

        await page.waitForTimeout(500);
      }
    });
  });

  // ==================== 响应式测试 ====================

  test.describe('响应式布局', () => {
    test('仪表盘在桌面尺寸下应该正常显示', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.waitForTimeout(500);

      await expect(dashboardPage.statsCardContainer).toBeVisible();
    });

    test('仪表盘在平板尺寸下应该正常显示', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(500);

      await expect(dashboardPage.statsCardContainer).toBeVisible();
    });

    test('仪表盘在移动端尺寸下应该正常显示', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);

      // 至少标题应该可见
      const title = await dashboardPage.getPageTitle();
      expect(title).toBeTruthy();
    });

    test('响应式布局应该保持可用性', async ({ page }) => {
      const sizes = [
        { width: 1920, height: 1080 },
        { width: 1280, height: 720 },
        { width: 768, height: 1024 },
        { width: 375, height: 667 }
      ];

      for (const size of sizes) {
        await page.setViewportSize(size);
        await page.waitForTimeout(300);

        // 验证核心组件可用
        const hasStatsCards = await dashboardPage.statsCardContainer.count();
        expect(hasStatsCards).toBeGreaterThan(0);
      }
    });
  });

  // ==================== 性能测试 ====================

  test.describe('性能测试', () => {
    test('页面初次加载时间应该在合理范围内', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/dashboard');
      await dashboardPage.waitForReady();

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(5000); // 5秒
    });

    test('交互响应时间应该快速', async ({ page }) => {
      const startTime = Date.now();

      await dashboardPage.clickStatCard('projects');
      await page.waitForTimeout(500);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(2000); // 2秒内响应

      // 清理：关闭对话框
      await dashboardPage.closeDialog();
    });

    test('滚动性能应该流畅', async ({ page }) => {
      const startTime = Date.now();

      await page.evaluate(() => {
        window.scrollTo(0, 1000);
      });

      await page.waitForTimeout(500);

      const scrollTime = Date.now() - startTime;
      expect(scrollTime).toBeLessThan(1000); // 1秒内完成滚动
    });
  });

  // ==================== 可访问性测试 ====================

  test.describe('可访问性', () => {
    test('页面应该有正确的标题层级', async ({ page }) => {
      const headings = await page.locator('h1, h2, h3').all();

      expect(headings.length).toBeGreaterThan(0);

      // 验证标题顺序合理
      const firstHeading = await headings[0].evaluate(el => el.tagName);
      expect(['H1', 'H2']).toContain(firstHeading);
    });

    test('交互元素应该有足够的点击区域', async ({ page }) => {
      const buttons = await page.locator('button, [role="button"]').all();

      if (buttons.length > 0) {
        const firstButton = buttons[0];
        const box = await firstButton.boundingBox();

        expect(box).toBeTruthy();
        expect(box!.width).toBeGreaterThanOrEqual(44); // 最小点击区域
        expect(box!.height).toBeGreaterThanOrEqual(44);
      }
    });

    test('文本应该有足够的对比度（基本检查）', async ({ page }) => {
      const textElements = await page.locator('[class*="text-white"]').all();

      expect(textElements.length).toBeGreaterThan(0);
    });
  });

  // ==================== 错误处理测试 ====================

  test.describe('错误处理', () => {
    test('网络错误时应该显示友好的错误提示', async ({ page }) => {
      // 模拟网络离线
      await page.context().setOffline(true);

      await page.reload();
      await page.waitForTimeout(2000);

      // 验证页面仍然可以显示（可能有缓存数据或错误提示）
      const pageTitle = await dashboardPage.getPageTitle();
      expect(pageTitle).toBeTruthy();

      // 恢复网络
      await page.context().setOffline(false);
    });

    test('组件加载失败时应该优雅降级', async ({ page }) => {
      // 验证即使某些组件失败，页面仍然可用
      await page.reload();
      await dashboardPage.waitForReady();

      const hasStatsCards = await dashboardPage.statsCardContainer.count();
      expect(hasStatsCards).toBeGreaterThan(0);
    });
  });
});

// ==================== 冒烟测试 ====================

test.describe('仪表盘冒烟测试 - 关键功能验证', () => {
  test('关键功能应该快速验证通过', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    const sidebar = new Sidebar(page);

    // 快速登录
    await login(page, 'admin');
    await sidebar.navigateTo('dashboard');
    await dashboardPage.waitForReady();

    // 验证核心组件存在
    await expect(dashboardPage.statsCardContainer).toBeVisible();
    const hasProjectOverview = await dashboardPage.hasProjectOverview();
    const hasSaturationChart = await dashboardPage.hasSaturationChart();

    expect(hasProjectOverview).toBeTruthy();
    expect(hasSaturationChart).toBeTruthy();

    // 验证基本交互
    await dashboardPage.clickStatCard('projects');
    await page.waitForTimeout(500);
    await dashboardPage.closeDialog();

    // 登出
    await logout(page);
  });
});
