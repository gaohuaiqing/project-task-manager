/**
 * 基础页面类
 *
 * 提供所有页面对象的通用功能
 */

import type { Page, Locator } from '@playwright/test';
import {
  waitForVisible,
  waitForClickable,
  safeClick,
  safeType,
  waitForURL,
  takeScreenshot,
  wait
} from '../helpers/TestHelpers';

export class BasePage {
  readonly page: Page;
  readonly url: string;

  constructor(page: Page, url: string = '/') {
    this.page = page;
    this.url = url;
  }

  /**
   * 导航到页面
   */
  async goto(): Promise<void> {
    // 如果是相对路径，添加 baseURL
    let url = this.url;
    if (url.startsWith('/')) {
      url = 'http://10.8.180.55:5173' + url;
    }
    await this.page.goto(url);
    await this.waitForLoad();
  }

  /**
   * 等待页面加载完成
   *
   * 注意：开发环境下使用 'load' 而不是 'networkidle'
   * 因为 Vite HMR 会持续发送 WebSocket 消息，导致 networkidle 永远无法满足
   */
  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('load');
  }

  /**
   * 等待元素可见
   */
  async waitForElementVisible(selector: string, timeout: number = 10000): Promise<void> {
    await waitForVisible(this.page, selector, timeout);
  }

  /**
   * 等待元素可点击
   */
  async waitForElementClickable(selector: string, timeout: number = 10000): Promise<void> {
    await waitForClickable(this.page, selector, timeout);
  }

  /**
   * 安全点击元素
   */
  async clickElement(selector: string, timeout: number = 10000): Promise<void> {
    await safeClick(this.page, selector, timeout);
  }

  /**
   * 安全输入文本
   */
  async typeText(selector: string, text: string, timeout: number = 10000): Promise<void> {
    await safeType(this.page, selector, text, timeout);
  }

  /**
   * 获取元素文本
   */
  async getText(selector: string): Promise<string> {
    const element = this.page.locator(selector);
    return await element.textContent() || '';
  }

  /**
   * 检查元素是否存在
   */
  async hasElement(selector: string): Promise<boolean> {
    try {
      await this.page.waitForSelector(selector, { state: 'attached', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 检查元素是否可见
   */
  async isElementVisible(selector: string): Promise<boolean> {
    try {
      await this.page.waitForSelector(selector, { state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 等待URL变化
   */
  async waitForPageURL(url: string | RegExp, timeout: number = 30000): Promise<void> {
    await waitForURL(this.page, url, timeout);
  }

  /**
   * 获取当前URL
   */
  getCurrentURL(): string {
    return this.page.url();
  }

  /**
   * 刷新页面
   */
  async reload(): Promise<void> {
    await this.page.reload();
    await this.waitForLoad();
  }

  /**
   * 截图
   */
  async screenshot(filename: string): Promise<void> {
    await takeScreenshot(this.page, filename);
  }

  /**
   * 等待指定时间
   */
  async wait(ms: number): Promise<void> {
    await wait(ms);
  }

  /**
   * 滚动到元素
   */
  async scrollToElement(selector: string): Promise<void> {
    await this.page.locator(selector).scrollIntoViewIfNeeded();
  }

  /**
   * 检查页面是否加载完成
   */
  async isLoaded(): Promise<boolean> {
    const currentURL = this.page.url();
    return currentURL.includes(this.url) || currentURL.endsWith('/');
  }
}
