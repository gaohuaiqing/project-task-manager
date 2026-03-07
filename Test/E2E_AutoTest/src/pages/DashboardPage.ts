/**
 * 仪表板页面对象
 *
 * 封装仪表板页面的所有元素和操作
 * 支持管理员和工程师两种视图模式
 */

import type { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  // ==================== 页面标题 ====================
  readonly pageTitle: Locator;
  readonly dashboardTitle: Locator;

  // ==================== 统计卡片容器 ====================
  readonly statsCardContainer: Locator;
  readonly statsCards: Locator;

  // ==================== 项目概览 ====================
  readonly projectOverviewContainer: Locator;
  readonly projectCards: Locator;
  readonly projectProgressBars: Locator;
  readonly projectBadges: Locator;

  // ==================== 饱和度图表 ====================
  readonly saturationChart: Locator;
  readonly saturationMembers: Locator;
  readonly saturationProgressBars: Locator;
  readonly saturationBadges: Locator;

  // ==================== 任务预警 ====================
  readonly taskAlertsContainer: Locator;
  readonly pendingApprovalTasks: Locator;
  readonly nearDeadlineTasks: Locator;
  readonly delayedTasks: Locator;
  readonly alertTaskItems: Locator;

  // ==================== 工程师专属视图 ====================
  readonly engineerDashboard: Locator;
  readonly engineerTaskStats: Locator;
  readonly urgentTasks: Locator;
  readonly pendingTasks: Locator;
  readonly engineerProjects: Locator;
  readonly projectTimeline: Locator;

  // ==================== 详情对话框 ====================
  readonly statsDetailDialog: Locator;
  readonly taskDetailDialog: Locator;
  readonly dialogTitle: Locator;
  readonly dialogCloseButton: Locator;

  // ==================== 刷新和操作 ====================
  readonly refreshButton: Locator;
  readonly filterButton: Locator;
  readonly viewToggleButton: Locator;

  constructor(page: Page) {
    super(page, '/dashboard');

    // 页面标题选择器
    this.pageTitle = page.locator('h1, h2').filter({ hasText: /任务看板|仪表盘|Dashboard|概览/ });
    this.dashboardTitle = page.locator('text=/任务看板/');

    // 统计卡片容器 - 查找包含多个卡片的容器
    this.statsCardContainer = page.locator('div.grid').filter({ has: page.locator('[class*="stat"]') }).first();
    this.statsCards = page.locator('[class*="card"][class*="cursor-pointer"], [class*="hover-lift"]');

    // 项目概览组件
    this.projectOverviewContainer = page.locator('text=/项目进度概览/').locator('..').locator('..');
    this.projectCards = this.projectOverviewContainer.locator('[class*="group"]');
    this.projectProgressBars = this.projectOverviewContainer.locator('[class*="h-2"][class*="bg-secondary"]');
    this.projectBadges = this.projectOverviewContainer.locator('[class*="badge"], [class*="Badge"]');

    // 饱和度图表组件
    this.saturationChart = page.locator('text=/团队工作饱和度/').locator('..').locator('..');
    this.saturationMembers = this.saturationChart.locator('[class*="group"]');
    this.saturationProgressBars = this.saturationChart.locator('[class*="h-2"][class*="bg-secondary"]');
    this.saturationBadges = this.saturationChart.locator('[class*="badge"], [class*="Badge"]');

    // 任务预警组件
    this.taskAlertsContainer = page.locator('text=/任务提醒/').locator('..').locator('..').locator('..');
    this.pendingApprovalTasks = this.taskAlertsContainer.locator('text=/待审批任务/').locator('..').locator('..').locator('..');
    this.nearDeadlineTasks = this.taskAlertsContainer.locator('text=/即将延期任务/').locator('..').locator('..').locator('..');
    this.delayedTasks = this.taskAlertsContainer.locator('text=/已延期任务/').locator('..').locator('..').locator('..');
    this.alertTaskItems = this.taskAlertsContainer.locator('[class*="cursor-pointer"][class*="rounded-lg"]');

    // 工程师专属视图
    this.engineerDashboard = page.locator('div:has(h2:has-text("我的项目"))');
    this.engineerTaskStats = page.locator('[class*="grid-cols-1"][class*="sm:grid-cols-2"]');
    this.urgentTasks = page.locator('text=/紧急待办任务/').locator('..').locator('..');
    this.pendingTasks = page.locator('text=/待办任务/').locator('..').locator('..');
    this.engineerProjects = this.engineerDashboard.locator('[class*="project"]');
    this.projectTimeline = this.engineerDashboard.locator('[class*="timeline"]');

    // 详情对话框
    this.statsDetailDialog = page.locator('[role="dialog"]').filter({ hasText: /详情|Detail/ });
    this.taskDetailDialog = page.locator('[role="dialog"]').filter({ hasText: /任务详情/ });
    this.dialogTitle = page.locator('[role="dialog"] h2, [role="dialog"] h3');
    this.dialogCloseButton = page.locator('[aria-label="close"], button:has-text("×")');

    // 操作按钮
    this.refreshButton = page.locator('button[aria-label*="刷新"], button[title*="刷新"], [data-testid="refresh-button"]');
    this.filterButton = page.locator('button[aria-label*="筛选"], button[title*="筛选"]');
    this.viewToggleButton = page.locator('button[aria-label*="视图"], button[title*="视图"]');
  }

  // ==================== 页面导航 ====================

  /**
   * 等待仪表板加载完成
   */
  async waitForReady(): Promise<void> {
    await this.waitForLoad();
    await this.page.waitForTimeout(500); // 等待动画

    // 等待至少一个关键组件加载
    try {
      await Promise.race([
        this.statsCardContainer.waitFor({ state: 'visible', timeout: 5000 }),
        this.dashboardTitle.waitFor({ state: 'visible', timeout: 5000 })
      ]);
    } catch (error) {
      // 页面可能使用不同的布局，继续执行
    }
  }

  /**
   * 获取页面标题
   */
  async getPageTitle(): Promise<string> {
    const title = await this.dashboardTitle.textContent();
    return title || await this.pageTitle.textContent() || '';
  }

  // ==================== 统计卡片操作 ====================

  /**
   * 获取所有统计卡片
   */
  async getAllStatCards(): Promise<Locator[]> {
    const cards = await this.statsCards.all();
    return cards;
  }

  /**
   * 获取指定类型的统计卡片
   * @param type - 卡片类型: 'projects' | 'tasks' | 'members' | 'completion' | 'delayed'
   */
  getStatCard(type: string): Locator {
    const typeMap: Record<string, string> = {
      'projects': '项目|Projects',
      'tasks': '任务|Tasks',
      'members': '成员|Members',
      'completion': '完成|Completion',
      'delayed': '延期|Delayed',
      'inprogress': '进行中'
    };

    const pattern = typeMap[type] || type;
    return this.statsCards.filter({ hasText: new RegExp(pattern, 'i') }).first();
  }

  /**
   * 获取统计卡片的数值
   * @param type - 卡片类型
   */
  async getStatCardValue(type: string): Promise<number> {
    const card = this.getStatCard(type);
    const text = await card.textContent() || '0';

    // 提取数字（支持千分位）
    const match = text.match(/[\d,]+/);
    if (match) {
      return parseInt(match[0].replace(/,/g, ''), 10);
    }

    return 0;
  }

  /**
   * 获取统计卡片的变化率
   * @param type - 卡片类型
   */
  async getStatCardChange(type: string): Promise<number> {
    const card = this.getStatCard(type);
    const text = await card.textContent() || '';

    // 查找百分比
    const match = text.match(/(\d+)%/);
    if (match) {
      return parseInt(match[1], 10);
    }

    return 0;
  }

  /**
   * 点击统计卡片查看详情
   * @param type - 卡片类型
   */
  async clickStatCard(type: string): Promise<void> {
    const card = this.getStatCard(type);
    await card.click();
    await this.page.waitForTimeout(300); // 等待对话框动画
  }

  // ==================== 项目概览操作 ====================

  /**
   * 获取项目卡片数量
   */
  async getProjectCardCount(): Promise<number> {
    return await this.projectCards.count();
  }

  /**
   * 获取所有项目卡片
   */
  async getProjectCards(): Promise<Locator[]> {
    return await this.projectCards.all();
  }

  /**
   * 获取指定索引的项目卡片
   * @param index - 项目索引（从0开始）
   */
  getProjectCard(index: number): Locator {
    return this.projectCards.nth(index);
  }

  /**
   * 获取项目进度
   * @param index - 项目索引
   */
  async getProjectProgress(index: number): Promise<number> {
    const card = this.getProjectCard(index);
    const progressText = await card.locator('[class*="font-semibold"]').filter({ hasText: '%' }).textContent();
    const match = progressText?.match(/(\d+)%/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * 点击项目卡片
   * @param index - 项目索引
   */
  async clickProjectCard(index: number): Promise<void> {
    const card = this.getProjectCard(index);
    await card.click();
    await this.page.waitForTimeout(500);
  }

  // ==================== 饱和度图表操作 ====================

  /**
   * 获取成员数量
   */
  async getMemberCount(): Promise<number> {
    return await this.saturationMembers.count();
  }

  /**
   * 获取所有成员
   */
  async getMembers(): Promise<Locator[]> {
    return await this.saturationMembers.all();
  }

  /**
   * 获取指定索引的成员
   * @param index - 成员索引
   */
  getMember(index: number): Locator {
    return this.saturationMembers.nth(index);
  }

  /**
   * 获取成员饱和度值
   * @param index - 成员索引
   */
  async getMemberSaturation(index: number): Promise<number> {
    const member = this.getMember(index);
    const saturationText = await member.locator('[class*="font-semibold"]').filter({ hasText: '%' }).textContent();
    const match = saturationText?.match(/(\d+)%/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * 获取成员状态（健康/适中/过载）
   * @param index - 成员索引
   */
  async getMemberStatus(index: number): Promise<string> {
    const member = this.getMember(index);
    const badge = member.locator('[class*="badge"], [class*="Badge"]').first();
    return await badge.textContent() || '';
  }

  /**
   * 点击成员查看详情
   * @param index - 成员索引
   */
  async clickMember(index: number): Promise<void> {
    const member = this.getMember(index);
    await member.click();
    await this.page.waitForTimeout(300);
  }

  // ==================== 任务预警操作 ====================

  /**
   * 获取待审批任务数量
   */
  async getPendingApprovalCount(): Promise<number> {
    const container = this.pendingApprovalTasks.first();
    const count = await container.count();
    if (count === 0) return 0;

    const badge = container.locator('[class*="badge"], [class*="Badge"]');
    const badgeText = await badge.textContent();
    const match = badgeText?.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  /**
   * 获取即将到期任务数量
   */
  async getNearDeadlineCount(): Promise<number> {
    const container = this.nearDeadlineTasks.first();
    const count = await container.count();
    if (count === 0) return 0;

    const badge = container.locator('[class*="badge"], [class*="Badge"]');
    const badgeText = await badge.textContent();
    const match = badgeText?.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  /**
   * 获取已延期任务数量
   */
  async getDelayedCount(): Promise<number> {
    const container = this.delayedTasks.first();
    const count = await container.count();
    if (count === 0) return 0;

    const badge = container.locator('[class*="badge"], [class*="Badge"]');
    const badgeText = await badge.textContent();
    const match = badgeText?.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  /**
   * 获取所有预警任务项
   */
  async getAlertTaskItems(): Promise<Locator[]> {
    return await this.alertTaskItems.all();
  }

  /**
   * 点击指定索引的预警任务
   * @param index - 任务索引
   */
  async clickAlertTask(index: number): Promise<void> {
    const tasks = await this.getAlertTaskItems();
    if (index < tasks.length) {
      await tasks[index].click();
      await this.page.waitForTimeout(500);
    }
  }

  // ==================== 工程师视图操作 ====================

  /**
   * 检查是否为工程师视图
   */
  async isEngineerView(): Promise<boolean> {
    const count = await this.engineerDashboard.count();
    return count > 0;
  }

  /**
   * 获取工程师任务统计
   * @param statType - 统计类型: 'total' | 'inprogress' | 'neareadline' | 'projects'
   */
  async getEngineerTaskStat(statType: string): Promise<number> {
    const statMap: Record<string, string> = {
      'total': '我的任务',
      'inprogress': '进行中',
      'neareadline': '即将到期',
      'projects': '参与项目'
    };

    const pattern = statMap[statType];
    const card = this.engineerTaskStats.locator('text=/' + pattern + '/').locator('..').locator('..');
    const valueText = await card.locator('[class*="font-bold"]').textContent();
    const match = valueText?.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  /**
   * 获取紧急任务数量
   */
  async getUrgentTaskCount(): Promise<number> {
    const badge = this.urgentTasks.locator('[class*="badge"], [class*="Badge"]');
    const count = await badge.count();
    if (count === 0) return 0;

    const text = await badge.first().textContent();
    const match = text?.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  /**
   * 点击紧急任务
   * @param index - 任务索引
   */
  async clickUrgentTask(index: number): Promise<void> {
    const tasks = this.urgentTasks.locator('[class*="cursor-pointer"]');
    const count = await tasks.count();
    if (index < count) {
      await tasks.nth(index).click();
      await this.page.waitForTimeout(500);
    }
  }

  // ==================== 对话框操作 ====================

  /**
   * 等待详情对话框打开
   */
  async waitForDetailDialog(): Promise<void> {
    await this.statsDetailDialog.waitFor({ state: 'visible', timeout: 3000 });
  }

  /**
   * 等待任务详情对话框打开
   */
  async waitForTaskDetailDialog(): Promise<void> {
    await this.taskDetailDialog.waitFor({ state: 'visible', timeout: 3000 });
  }

  /**
   * 关闭对话框
   */
  async closeDialog(): Promise<void> {
    // 尝试多种关闭方式
    try {
      await this.dialogCloseButton.first().click();
    } catch {
      await this.page.keyboard.press('Escape');
    }
    await this.page.waitForTimeout(300);
  }

  /**
   * 获取对话框标题
   */
  async getDialogTitle(): Promise<string> {
    return await this.dialogTitle.textContent() || '';
  }

  // ==================== 刷新和筛选 ====================

  /**
   * 点击刷新按钮
   */
  async clickRefresh(): Promise<void> {
    const count = await this.refreshButton.count();
    if (count > 0) {
      await this.refreshButton.first().click();
      await this.page.waitForTimeout(1000);
    }
  }

  /**
   * 检查是否有刷新按钮
   */
  async hasRefreshButton(): Promise<boolean> {
    return await this.refreshButton.count() > 0;
  }

  // ==================== 验证方法 ====================

  /**
   * 验证页面是否已加载
   */
  async isLoaded(): Promise<boolean> {
    const currentUrl = this.getCurrentURL();
    return currentUrl.includes('/dashboard');
  }

  /**
   * 验证是否有任务预警
   */
  async hasTaskAlerts(): Promise<boolean> {
    return await this.taskAlertsContainer.count() > 0;
  }

  /**
   * 验证是否有项目概览
   */
  async hasProjectOverview(): Promise<boolean> {
    return await this.projectOverviewContainer.count() > 0;
  }

  /**
   * 验证是否有饱和度图表
   */
  async hasSaturationChart(): Promise<boolean> {
    return await this.saturationChart.count() > 0;
  }
}
