/**
 * 测试夹具 (Test Fixtures)
 *
 * 扩展 Playwright 的测试夹具，提供自定义的测试工具和页面对象
 */

import { test as base } from '@playwright/test';
import type { Page } from '@playwright/test';

// 导入辅助函数
import { login, logout, clearSession } from '../helpers/auth-helpers';
import { captureFailure, screenshotPage } from '../helpers/ScreenshotHelpers';

// 定义测试夹具类型
type TestFixtures = {
  loggedInPage: Page;
  authenticatedPage: (role?: 'admin' | 'tech_manager' | 'dept_manager' | 'engineer') => Promise<Page>;
};

// 扩展测试夹具
export const test = base.extend<TestFixtures>({
  // 已登录的页面
  loggedInPage: async ({ page }, use) => {
    // 默认使用 tech_manager 角色登录
    await login(page, 'tech_manager');
    await use(page);
    // 测试后自动登出
    await logout(page);
  },

  // 可指定角色的认证页面
  authenticatedPage: async ({ page }, use) => {
    const authPage = async (role: 'admin' | 'tech_manager' | 'dept_manager' | 'engineer' = 'tech_manager') => {
      await login(page, role);
      return page;
    };
    await use(authPage);
  },
});

// 添加测试失败时的自动截图
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    // 测试失败时截图
    const testName = testInfo.title.replace(/[^a-zA-Z0-9]/g, '_');
    await captureFailure(page, testName);
  }
});

// 导出 expect
export const expect = test.expect;
