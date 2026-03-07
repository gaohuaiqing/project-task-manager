/**
 * 头部组件对象
 *
 * 封装页面头部的所有元素和操作
 */

import type { Page, Locator } from '@playwright/test';

export class Header {
  readonly page: Page;
  readonly header: Locator;

  // 用户菜单相关
  readonly userMenuButton: Locator;
  readonly userDropdown: Locator;
  readonly logoutButton: Locator;
  readonly profileButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.header = page.locator('header, [class*="header"]');

    // 用户菜单
    this.userMenuButton = page.locator('button[aria-expanded]');
    this.userDropdown = page.locator('[role="menu"], [class*="dropdown"]');
    this.logoutButton = page.locator('button:has-text("退出登录"), a:has-text("退出登录")');
    this.profileButton = page.locator('button:has-text("个人资料"), a:has-text("个人资料")');
  }

  /**
   * 等待头部可见
   */
  async waitForVisible(): Promise<void> {
    await this.header.waitFor({ state: 'visible' });
  }

  /**
   * 点击用户菜单按钮展开下拉菜单
   */
  async openUserMenu(): Promise<void> {
    await this.userMenuButton.click();
    await this.userDropdown.waitFor({ state: 'visible' });
  }

  /**
   * 点击退出登录
   */
  async clickLogout(): Promise<void> {
    await this.openUserMenu();
    await this.logoutButton.click();
  }

  /**
   * 点击个人资料
   */
  async clickProfile(): Promise<void> {
    await this.openUserMenu();
    await this.profileButton.click();
  }

  /**
   * 获取用户名称
   */
  async getUserName(): Promise<string> {
    return await this.userMenuButton.textContent() || '';
  }

  /**
   * 检查用户菜单是否打开
   */
  async isUserMenuOpen(): Promise<boolean> {
    const isExpanded = await this.userMenuButton.getAttribute('aria-expanded');
    return isExpanded === 'true';
  }

  /**
   * 关闭用户菜单
   */
  async closeUserMenu(): Promise<void> {
    if (await this.isUserMenuOpen()) {
      await this.userMenuButton.click();
    }
  }
}
