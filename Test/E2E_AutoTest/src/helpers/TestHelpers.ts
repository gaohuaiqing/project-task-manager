/**
 * 测试辅助工具函数
 *
 * 提供通用的测试辅助功能，如等待、点击、输入等
 */

import type { Page, Locator } from '@playwright/test';

/**
 * 等待元素可见
 */
export async function waitForVisible(
  page: Page,
  selector: string,
  timeout: number = 10000
): Promise<void> {
  await page.waitForSelector(selector, { state: 'visible', timeout });
}

/**
 * 等待元素可点击
 */
export async function waitForClickable(
  page: Page,
  selector: string,
  timeout: number = 10000
): Promise<void> {
  await page.waitForSelector(selector, { state: 'attached', timeout });
  const element = page.locator(selector);
  await element.waitFor({ state: 'visible', timeout });
}

/**
 * 安全点击（等待元素可交互后点击）
 */
export async function safeClick(
  page: Page,
  selector: string,
  timeout: number = 10000
): Promise<void> {
  await waitForClickable(page, selector, timeout);
  await page.locator(selector).click();
}

/**
 * 安全输入（清空后输入）
 */
export async function safeType(
  page: Page,
  selector: string,
  text: string,
  timeout: number = 10000
): Promise<void> {
  await waitForVisible(page, selector, timeout);
  const input = page.locator(selector);
  await input.clear();
  await input.fill(text);
}

/**
 * 等待导航完成
 */
export async function waitForNavigation(
  page: Page,
  timeout: number = 30000
): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * 等待URL变化
 */
export async function waitForURL(
  page: Page,
  url: string | RegExp,
  timeout: number = 30000
): Promise<void> {
  await page.waitForURL(url, { timeout });
}

/**
 * 等待对话框出现
 */
export async function waitForDialog(
  page: Page,
  timeout: number = 10000
): Promise<void> {
  await page.waitForSelector('div[role="dialog"]:visible', { timeout });
}

/**
 * 等待对话框消失
 */
export async function waitForDialogClosed(
  page: Page,
  timeout: number = 10000
): Promise<void> {
  await page.waitForSelector('div[role="dialog"]', { state: 'hidden', timeout })
    .catch(() => {
      // 对话框可能已从DOM移除
      return page.waitForSelector('div[role="dialog"]', { state: 'detached', timeout });
    });
}

/**
 * 等待提示消息出现
 */
export async function waitForToast(
  page: Page,
  timeout: number = 5000
): Promise<void> {
  // 等待提示消息出现（可能是 div[role="alert"] 或类似元素）
  await page.waitForSelector('div[role="alert"]:visible, .toast:visible, [data-testid="toast"]', { timeout })
    .catch(() => {}); // 如果没有提示也不报错
}

/**
 * 等待提示消息消失
 */
export async function waitForToastHidden(
  page: Page,
  timeout: number = 5000
): Promise<void> {
  await page.waitForSelector('div[role="alert"], .toast, [data-testid="toast"]', {
    state: 'hidden',
    timeout
  }).catch(() => {});
}

/**
 * 获取提示消息文本
 */
export async function getToastText(page: Page): Promise<string> {
  const toast = page.locator('div[role="alert"]:visible, .toast:visible, [data-testid="toast"]').first();
  return await toast.textContent() || '';
}

/**
 * 截图（用于调试）
 */
export async function takeScreenshot(
  page: Page,
  name: string
): Promise<void> {
  await page.screenshot({
    path: `reports/screenshots/${name}.png`,
    fullPage: true
  });
}

/**
 * 等待选择器出现
 */
export async function waitForSelector(
  page: Page,
  selector: string,
  options: { state?: 'attached' | 'detached' | 'visible' | 'hidden'; timeout?: number } = {}
): Promise<void> {
  await page.waitForSelector(selector, options);
}

/**
 * 检查元素是否存在
 */
export async function elementExists(
  page: Page,
  selector: string,
  timeout: number = 5000
): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { state: 'attached', timeout });
    return true;
  } catch {
    return false;
  }
}

/**
 * 检查元素是否可见
 */
export async function elementVisible(
  page: Page,
  selector: string,
  timeout: number = 5000
): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
}

/**
 * 获取元素文本
 */
export async function getText(
  page: Page,
  selector: string
): Promise<string> {
  const element = page.locator(selector);
  return await element.textContent() || '';
}

/**
 * 获取多个元素的文本
 */
export async function getTexts(
  page: Page,
  selector: string
): Promise<string[]> {
  const elements = page.locator(selector).all();
  const texts: string[] = [];
  for (const element of await elements) {
    texts.push(await element.textContent() || '');
  }
  return texts;
}

/**
 * 滚动到元素
 */
export async function scrollToElement(
  page: Page,
  selector: string
): Promise<void> {
  await page.locator(selector).scrollIntoViewIfNeeded();
}

/**
 * 等待一段时间
 */
export async function wait(ms: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 重试执行函数
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await wait(delay);
      }
    }
  }
  throw lastError;
}
