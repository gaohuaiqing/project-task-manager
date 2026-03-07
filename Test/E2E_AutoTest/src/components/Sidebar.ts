/**
 * 侧边栏组件对象
 *
 * 封装侧边栏导航的所有元素和操作
 */

import type { Page, Locator } from '@playwright/test';

export class Sidebar {
  readonly page: Page;
  readonly sidebar: Locator;

  // 主导航菜单
  readonly dashboardNav: Locator;
  readonly projectsNav: Locator;
  readonly tasksNav: Locator;
  readonly organizationNav: Locator;
  readonly settingsNav: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sidebar = page.locator('[class*="sidebar"], nav, aside');

    // 主导航菜单项
    this.dashboardNav = page.locator('button:has-text("仪表板"), a:has-text("仪表板")');
    this.projectsNav = page.locator('button:has-text("项目管理"), a:has-text("项目管理")');
    this.tasksNav = page.locator('button:has-text("任务管理"), a:has-text("任务管理")');
    this.organizationNav = page.locator('button:has-text("组织架构"), a:has-text("组织架构")');
    this.settingsNav = page.locator('button:has-text("设置"), a:has-text("设置")');
  }

  /**
   * 等待侧边栏可见
   */
  async waitForVisible(): Promise<void> {
    await this.sidebar.waitFor({ state: 'visible' });
  }

  /**
   * 导航到仪表板
   */
  async navigateToDashboard(): Promise<void> {
    await this.dashboardNav.click();
    await this.page.waitForURL('**/dashboard');
  }

  /**
   * 导航到项目管理
   */
  async navigateToProjects(): Promise<void> {
    await this.projectsNav.click();
    await this.page.waitForURL('**/projects');
  }

  /**
   * 导航到任务管理
   */
  async navigateToTasks(): Promise<void> {
    await this.tasksNav.click();
    await this.page.waitForURL('**/tasks');
  }

  /**
   * 导航到组织架构
   */
  async navigateToOrganization(): Promise<void> {
    await this.organizationNav.click();
    await this.page.waitForURL('**/organization');
  }

  /**
   * 导航到设置
   */
  async navigateToSettings(): Promise<void> {
    await this.settingsNav.click();
    await this.page.waitForURL('**/settings');
  }

  /**
   * 检查菜单项是否可见（用于权限验证）
   */
  async isMenuVisible(menuName: string): Promise<boolean> {
    const menuItem = this.page.locator(`button:has-text("${menuName}"), a:has-text("${menuName}")`);
    try {
      await menuItem.waitFor({ state: 'visible', timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 检查菜单项是否存在
   */
  async menuExists(menuName: string): Promise<boolean> {
    const menuItem = this.page.locator(`button:has-text("${menuName}"), a:has-text("${menuName}")`);
    const count = await menuItem.count();
    return count > 0;
  }

  /**
   * 获取所有可见菜单项的文本
   */
  async getVisibleMenus(): Promise<string[]> {
    const menuItems = await this.sidebar.locator('button, a').allTextContents();
    return menuItems.filter(text => text.trim().length > 0);
  }
}
