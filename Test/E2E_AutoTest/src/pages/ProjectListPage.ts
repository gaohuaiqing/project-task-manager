/**
 * 项目列表页面对象
 *
 * 封装项目列表页面的所有元素和操作
 */

import type { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class ProjectListPage extends BasePage {
  // 页面元素
  readonly pageTitle: Locator;
  readonly createProjectButton: Locator;
  readonly searchInput: Locator;
  readonly filterButton: Locator;
  readonly viewToggle: Locator;

  // 项目列表
  readonly projectCards: Locator;
  readonly projectList: Locator;

  constructor(page: Page) {
    super(page, '/projects');
    this.pageTitle = page.locator('h1, h2').filter({ hasText: /项目|Project/ });
    this.createProjectButton = page.locator('button:has-text("创建项目")');
    this.searchInput = page.locator('input[placeholder*="搜索"], input[type="search"], [data-testid="search"]');
    this.filterButton = page.locator('button:has-text("筛选"), [data-testid="filter"]');
    this.viewToggle = page.locator('button:has-text("视图")');

    // 项目列表（可能是卡片或列表视图）
    this.projectCards = page.locator('[class*="project-card"], [data-testid="project-card"]');
    this.projectList = page.locator('[class*="project-list"], [data-testid="project-list"]');
  }

  /**
   * 等待项目列表加载完成
   */
  async waitForReady(): Promise<void> {
    await this.waitForLoad();
    await this.waitForElementVisible('h1, h2', 10000);
  }

  /**
   * 点击创建项目按钮
   */
  async clickCreateProject(): Promise<void> {
    await this.clickElement('button:has-text("创建项目")');
    // 等待项目表单对话框或页面出现
    await this.wait(1000);
  }

  /**
   * 搜索项目
   */
  async searchProjects(query: string): Promise<void> {
    await this.typeText('input[placeholder*="搜索"], input[type="search"]', query);
    await this.wait(1000); // 等待搜索结果
  }

  /**
   * 获取项目数量
   */
  async getProjectCount(): Promise<number> {
    return await this.projectCards.count();
  }

  /**
   * 打开指定项目
   */
  async openProject(projectName: string): Promise<void> {
    const projectCard = this.page.locator(`text="${projectName}"`);
    await this.clickElement(projectCard);
  }

  /**
   * 检查项目是否存在
   */
  async hasProject(projectName: string): Promise<boolean> {
    return await this.isElementVisible(`text="${projectName}"`);
  }

  /**
   * 点击项目上的编辑按钮
   */
  async clickEditProject(projectName: string): Promise<void> {
    // 查找项目卡片并点击编辑按钮
    const projectCard = this.page.locator(`text="${projectName}"`).locator('..');
    const editButton = projectCard.locator('button:has-text("编辑")');
    await editButton.click();
  }

  /**
   * 点击项目上的删除按钮
   */
  async clickDeleteProject(projectName: string): Promise<void> {
    // 查找项目卡片并点击删除按钮
    const projectCard = this.page.locator(`text="${projectName}"`).locator('..');
    const deleteButton = projectCard.locator('button:has-text("删除")');
    await deleteButton.click();
  }

  /**
   * 切换视图（网格/列表）
   */
  async toggleView(): Promise<void> {
    await this.clickElement('button:has-text("视图")');
  }

  /**
   * 验证是否在项目列表页
   */
  async isOnProjectListPage(): Promise<boolean> {
    const currentUrl = this.getCurrentURL();
    return currentUrl.includes('/projects');
  }

  /**
   * 等待项目列表加载
   */
  async waitForProjectsToLoad(timeout: number = 10000): Promise<void> {
    await this.wait(1000);
    await this.waitForElementVisible('[class*="project-list"], [class*="project-card"]', timeout);
  }

  /**
   * 获取所有项目名称
   */
  async getProjectNames(): Promise<string[]> {
    const names: string[] = [];
    const cards = await this.projectCards.all();

    for (const card of cards) {
      const name = await card.textContent();
      if (name) {
        names.push(name.trim());
      }
    }

    return names;
  }

  /**
   * 根据状态筛选项目
   */
  async filterByStatus(status: string): Promise<void> {
    await this.clickElement('button:has-text("筛选")');
    await this.wait(500);

    const statusFilter = this.page.locator(`text="${status}"`).first();
    await statusFilter.click();
    await this.wait(1000);
  }

  /**
   * 根据类型筛选项目
   */
  async filterByType(type: string): Promise<void> {
    await this.clickElement('button:has-text("筛选")');
    await this.wait(500);

    const typeFilter = this.page.locator(`text="${type}"`).first();
    await typeFilter.click();
    await this.wait(1000);
  }

  /**
   * 清除所有筛选
   */
  async clearFilters(): Promise<void> {
    const clearButton = this.page.locator('button:has-text("清除"), button:has-text("重置")');
    const exists = await clearButton.isVisible().catch(() => false);

    if (exists) {
      await clearButton.click();
      await this.wait(1000);
    }
  }

  /**
   * 排序项目
   */
  async sortBy(sortOption: string): Promise<void> {
    const sortButton = this.page.locator('button:has-text("排序"), [data-testid="sort"]');
    await sortButton.click();
    await this.wait(500);

    const option = this.page.locator(`text="${sortOption}"`).first();
    await option.click();
    await this.wait(1000);
  }

  /**
   * 切换视图模式
   */
  async switchViewMode(mode: 'grid' | 'list'): Promise<void> {
    const viewToggle = this.page.locator('button:has-text("视图"), [data-testid="view-toggle"]');

    const currentModeClass = await viewToggle.getAttribute('class');
    const isGrid = currentModeClass?.includes('grid');

    if ((mode === 'list' && isGrid) || (mode === 'grid' && !isGrid)) {
      await viewToggle.click();
      await this.wait(500);
    }
  }

  /**
   * 获取项目状态
   */
  async getProjectStatus(projectName: string): Promise<string | null> {
    const projectCard = this.page.locator(`text="${projectName}"`).locator('..');
    const statusBadge = projectCard.locator('[class*="status"], .badge').first();

    const isVisible = await statusBadge.isVisible().catch(() => false);
    if (isVisible) {
      return await statusBadge.textContent();
    }

    return null;
  }

  /**
   * 检查项目是否存在
   */
  async projectExists(projectName: string): Promise<boolean> {
    return await this.hasProject(projectName);
  }

  /**
   * 点击项目卡片查看详情
   */
  async viewProjectDetails(projectName: string): Promise<void> {
    const projectCard = this.page.locator(`text="${projectName}"`).locator('..');

    // 点击卡片（排除按钮）
    await projectCard.click();
    await this.wait(1000);
  }

  /**
   * 等待项目创建完成
   */
  async waitForProjectCreated(projectName: string, timeout: number = 10000): Promise<boolean> {
    try {
      await this.page.waitForSelector(`text="${projectName}"`, { timeout });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 等待项目删除完成
   */
  async waitForProjectDeleted(projectName: string, timeout: number = 10000): Promise<boolean> {
    try {
      await this.page.waitForSelector(`text="${projectName}"`, { state: 'detached', timeout });
      return true;
    } catch {
      return false;
    }
  }
}
