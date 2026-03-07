/**
 * 截图辅助函数
 *
 * 提供测试失败时的截图功能
 */

import type { Page, Locator } from '@playwright/test';
import path from 'path';
import fs from 'fs';

/**
 * 确保截图目录存在
 */
export function ensureScreenshotDir(): void {
  const dir = path.join(process.cwd(), 'reports', 'screenshots');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * 生成截图文件名
 */
export function generateScreenshotName(
  testName: string,
  suffix: string = ''
): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sanitizedName = testName.replace(/[^a-zA-Z0-9]/g, '_');
  return `${sanitizedName}${suffix ? '_' + suffix : ''}_${timestamp}.png`;
}

/**
 * 截取整个页面
 */
export async function screenshotPage(
  page: Page,
  testName: string,
  suffix: string = ''
): Promise<void> {
  ensureScreenshotDir();
  const filename = generateScreenshotName(testName, suffix);
  const filepath = path.join(process.cwd(), 'reports', 'screenshots', filename);

  await page.screenshot({
    path: filepath,
    fullPage: true
  });
}

/**
 * 截取指定元素
 */
export async function screenshotElement(
  page: Page,
  locator: Locator,
  testName: string,
  suffix: string = ''
): Promise<void> {
  ensureScreenshotDir();
  const filename = generateScreenshotName(testName, suffix);
  const filepath = path.join(process.cwd(), 'reports', 'screenshots', filename);

  await locator.screenshot({
    path: filepath
  });
}

/**
 * 截取可见区域
 */
export async function screenshotViewport(
  page: Page,
  testName: string,
  suffix: string = ''
): Promise<void> {
  ensureScreenshotDir();
  const filename = generateScreenshotName(testName, suffix);
  const filepath = path.join(process.cwd(), 'reports', 'screenshots', filename);

  await page.screenshot({
    path: filepath,
    fullPage: false
  });
}

/**
 * 测试失败时自动截图
 */
export async function captureFailure(
  page: Page,
  testName: string,
  error?: Error
): Promise<void> {
  ensureScreenshotDir();
  const filename = generateScreenshotName(testName, 'failure');
  const filepath = path.join(process.cwd(), 'reports', 'screenshots', filename);

  await page.screenshot({
    path: filepath,
    fullPage: true
  });

  // 如果有错误信息，可以记录到文件
  if (error) {
    const errorLogPath = path.join(
      process.cwd(),
      'reports',
      'screenshots',
      `${testName}_error.txt`
    );
    fs.writeFileSync(errorLogPath, `${error.message}\n\n${error.stack}`);
  }
}

/**
 * 在关键步骤截图（用于调试）
 */
export async function captureStep(
  page: Page,
  testName: string,
  stepName: string
): Promise<void> {
  // 只在启用截图时才保存（可以通过环境变量控制）
  if (process.env.CAPTURE_STEPS === 'true') {
    await screenshotPage(page, testName, `step_${stepName}`);
  }
}
