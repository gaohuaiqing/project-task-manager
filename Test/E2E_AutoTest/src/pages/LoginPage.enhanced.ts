/**
 * 增强版登录页面对象
 *
 * 提供更完整的登录页面操作封装
 * 使用统一登录架构，系统自动识别用户权限
 */

import type { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { waitForURL } from '../helpers/TestHelpers';

export class LoginPage extends BasePage {
  // 统一登录表单元素
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly passwordToggle: Locator;
  readonly loginButton: Locator;

  // 错误提示
  readonly errorAlert: Locator;

  // 页面标题
  readonly pageTitle: Locator;
  readonly cardTitle: Locator;
  readonly cardDescription: Locator;

  // 图标
  readonly shieldIcon: Locator;
  readonly lockIcon: Locator;
  readonly eyeIcon: Locator;
  readonly eyeOffIcon: Locator;

  constructor(page: Page) {
    super(page, '/');
    this.usernameInput = page.locator('#username');
    this.passwordInput = page.locator('#password');
    this.passwordToggle = page.locator('#passwordToggle');
    this.loginButton = page.locator('form button[type="submit"]');

    this.errorAlert = page.locator('div[role="alert"]');

    this.pageTitle = page.locator('h1');
    this.cardTitle = page.locator('.card h2');
    this.cardDescription = page.locator('.card p');

    this.shieldIcon = page.locator('svg[data-lucide="shield"]');
    this.lockIcon = page.locator('svg[data-lucide="lock"]');
    this.eyeIcon = page.locator('svg[data-lucide="eye"]');
    this.eyeOffIcon = page.locator('svg[data-lucide="eye-off"]');
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
   * 点击登录按钮
   */
  async clickLoginButton(): Promise<void> {
    await this.clickElement('form button[type="submit"]');
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

  /**
   * 获取页面标题
   */
  async getPageTitle(): Promise<string> {
    return await this.pageTitle.textContent() || '';
  }

  /**
   * 获取卡片标题
   */
  async getCardTitle(): Promise<string> {
    return await this.cardTitle.textContent() || '';
  }

  /**
   * 获取卡片描述
   */
  async getCardDescription(): Promise<string> {
    return await this.cardDescription.textContent() || '';
  }

  /**
   * 检查错误提示是否可见
   */
  async isErrorVisible(): Promise<boolean> {
    return await this.errorAlert.isVisible().catch(() => false);
  }

  /**
   * 清空用户名字段
   */
  async clearUsername(): Promise<void> {
    await this.usernameInput.fill('');
  }

  /**
   * 清空密码字段
   */
  async clearPassword(): Promise<void> {
    await this.passwordInput.fill('');
  }

  /**
   * 清空所有表单字段
   */
  async clearForm(): Promise<void> {
    await this.clearUsername();
    await this.clearPassword();
  }

  /**
   * 按Enter键提交登录表单
   */
  async submitByEnter(): Promise<void> {
    await this.passwordInput.press('Enter');
  }

  /**
   * 验证密码可见性图标状态
   */
  async getPasswordIconState(): Promise<'visible' | 'hidden'> {
    const eyeVisible = await this.eyeIcon.isVisible().catch(() => false);
    const eyeOffVisible = await this.eyeOffIcon.isVisible().catch(() => false);

    if (eyeOffVisible) {
      return 'visible'; // 密码可见，显示eye-off图标
    } else if (eyeVisible) {
      return 'hidden'; // 密码隐藏，显示eye图标
    }

    throw new Error('无法确定密码图标状态');
  }

  /**
   * 检查登录按钮是否被禁用
   */
  async isLoginButtonDisabled(): Promise<boolean> {
    const disabled = await this.loginButton.getAttribute('disabled');
    return disabled !== null;
  }

  /**
   * 获取登录按钮文本
   */
  async getLoginButtonText(): Promise<string> {
    return await this.loginButton.textContent() || '';
  }

  /**
   * 验证所有必需的UI元素存在
   */
  async verifyRequiredElements(): Promise<boolean> {
    try {
      await this.pageTitle.waitFor({ state: 'visible', timeout: 5000 });
      await this.usernameInput.waitFor({ state: 'visible', timeout: 5000 });
      await this.passwordInput.waitFor({ state: 'visible', timeout: 5000 });
      await this.loginButton.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取表单当前值
   */
  async getFormValues(): Promise<{ username: string; password: string }> {
    return {
      username: await this.usernameInput.inputValue(),
      password: await this.passwordInput.inputValue()
    };
  }

  /**
   * 等待登录完成
   */
  async waitForLogin(timeout: number = 30000): Promise<void> {
    await waitForURL(this.page, '**/dashboard', timeout);
  }

  /**
   * 截图（用于调试）
   */
  async screenshot(filename: string): Promise<void> {
    await this.page.screenshot({
      path: filename,
      fullPage: true
    });
  }

  /**
   * 验证页面响应式布局
   */
  async verifyResponsiveLayout(): Promise<boolean> {
    // 验证卡片在不同视口大小下都可见
    const viewports = [
      { width: 375, height: 667 },  // 移动设备
      { width: 768, height: 1024 }, // 平板
      { width: 1920, height: 1080 } // 桌面
    ];

    for (const viewport of viewports) {
      await this.page.setViewportSize(viewport);
      const cardVisible = await this.page.locator('.card').isVisible().catch(() => false);
      if (!cardVisible) {
        return false;
      }
    }

    return true;
  }

  /**
   * 检查可访问性属性
   */
  async verifyAccessibility(): Promise<{
    hasUsernameLabel: boolean;
    hasPasswordLabel: boolean;
    hasPasswordToggleAria: boolean;
    hasErrorRole: boolean;
  }> {
    const hasUsernameLabel = await this.page.locator('label[for="username"]').isVisible().catch(() => false);
    const hasPasswordLabel = await this.page.locator('label[for="password"]').isVisible().catch(() => false);
    const passwordToggleHasAria = await this.passwordToggle.getAttribute('aria-label') !== null;
    const errorHasRole = await this.errorAlert.getAttribute('role') === 'alert';

    return {
      hasUsernameLabel,
      hasPasswordLabel,
      hasPasswordToggleAria: passwordToggleHasAria,
      hasErrorRole: errorHasRole
    };
  }

  /**
   * 验证错误提示内容
   */
  async verifyErrorMessage(expectedMessage: string): Promise<boolean> {
    if (!await this.isErrorVisible()) {
      return false;
    }

    const actualMessage = await this.getErrorMessage();
    return actualMessage.includes(expectedMessage);
  }


  /**
   * 模拟用户输入延迟（更真实的测试）
   */
  async humanTypeUsername(username: string, delay: number = 50): Promise<void> {
    await this.usernameInput.click();
    for (const char of username) {
      await this.page.keyboard.type(char, { delay });
    }
  }

  /**
   * 模拟用户输入密码延迟
   */
  async humanTypePassword(password: string, delay: number = 50): Promise<void> {
    await this.passwordInput.click();
    for (const char of password) {
      await this.page.keyboard.type(char, { delay });
    }
  }

  /**
   * 检查表单验证状态
   */
  async getFormValidationState(): Promise<{
    usernameValid: boolean;
    passwordValid: boolean;
  }> {
    const usernameValid = await this.usernameInput.evaluate(el =>
      !(el as HTMLInputElement).validity.valueMissing
    );

    const passwordValid = await this.passwordInput.evaluate(el =>
      !(el as HTMLInputElement).validity.valueMissing
    );

    return {
      usernameValid,
      passwordValid
    };
  }

  /**
   * 验证页面加载完成
   */
  async isPageReady(): Promise<boolean> {
    try {
      await this.page.waitForLoadState('domcontentloaded', { timeout: 5000 });
      await this.page.waitForLoadState('load', { timeout: 5000 });
      return await this.verifyRequiredElements();
    } catch {
      return false;
    }
  }
}

// 导出增强版LoginPage，覆盖原有导出
export default LoginPage;
