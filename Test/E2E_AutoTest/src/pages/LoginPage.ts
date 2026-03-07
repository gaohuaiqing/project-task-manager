/**
 * 登录页面对象
 *
 * 封装登录页面的所有元素和操作
 */

import type { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { waitForURL } from '../helpers/TestHelpers';

/**
 * 登录页面对象
 *
 * 封装统一登录页面的所有元素和操作
 * 系统通过后端根据登录凭据自动识别用户权限（管理员/技术经理/部门经理/工程师）
 * 符合 KISS 原则：使用单一登录表单，无需手动切换登录模式
 */
export class LoginPage extends BasePage {
  // 统一登录表单元素
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly passwordToggle: Locator;
  readonly loginButton: Locator;

  // 错误提示
  readonly errorAlert: Locator;

  constructor(page: Page) {
    super(page, '/');
    this.usernameInput = page.locator('#username');
    this.passwordInput = page.locator('#password');
    this.passwordToggle = page.locator('#passwordToggle');
    this.loginButton = page.locator('button[type="submit"]');
    this.errorAlert = page.locator('div[role="alert"]');
  }

  /**
   * 填充用户名（用户登录模式）
   */
  async fillUsername(username: string): Promise<void> {
    await this.typeText('#username', username);
  }

  /**
   * 填充密码（用户登录模式）
   */
  async fillPassword(password: string): Promise<void> {
    await this.typeText('#password', password);
  }

  /**
   * 切换密码可见性
   */
  async togglePasswordVisibility(): Promise<void> {
    await this.clickElement('#passwordToggle');
  }

  /**
   * 点击登录按钮（用户登录模式）
   */
  async clickLoginButton(): Promise<void> {
    await this.clickElement('button[type="submit"]');
  }

  /**
   * 执行统一登录
   *
   * 系统会根据用户凭据自动识别权限角色：
   * - admin: 管理员
   * - tech_manager: 技术经理
   * - dept_manager: 部门经理
   * - engineer: 工程师
   *
   * @param username 用户名/工号
   * @param password 密码
   */
  async login(username: string, password: string): Promise<void> {
    await this.fillUsername(username);
    await this.fillPassword(password);
    await this.clickLoginButton();
    // 等待跳转到仪表板
    await waitForURL(this.page, '**/dashboard', 30000);
  }

  /**
   * 验证登录错误提示显示
   */
  async expectLoginError(): Promise<void> {
    await this.waitForElementVisible('div[role="alert"]');
  }

  /**
   * 获取错误消息文本
   */
  async getErrorMessage(): Promise<string> {
    return await this.getText('div[role="alert"]');
  }

  /**
   * 验证密码输入框类型
   */
  async getPasswordInputType(): Promise<string> {
    return await this.passwordInput.getAttribute('type') || 'text';
  }

  /**
   * 检查是否在登录页
   */
  async isOnLoginPage(): Promise<boolean> {
    const currentUrl = this.getCurrentURL();
    return currentUrl === '/' || currentUrl.endsWith('/');
  }
}
