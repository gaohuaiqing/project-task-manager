/**
 * 认证辅助函数
 *
 * 提供登录、登出等认证相关的辅助功能
 */

import type { Page } from '@playwright/test';
import { getTestUser } from '../data/test-users';
import { safeClick, safeType, waitForURL } from './TestHelpers';

/**
 * 通过UI登录系统（统一登录架构）
 *
 * 系统会根据用户凭据自动识别权限角色：
 * - admin: 管理员
 * - tech_manager: 技术经理
 * - dept_manager: 部门经理
 * - engineer: 工程师
 *
 * @param page Playwright Page对象
 * @param role 用户角色 ('admin' | 'tech_manager' | 'dept_manager' | 'engineer')
 */
export async function login(
  page: Page,
  role: 'admin' | 'tech_manager' | 'dept_manager' | 'engineer' = 'tech_manager'
): Promise<void> {
  const user = getTestUser(role);

  // 导航到登录页
  await page.goto('/');

  // 使用统一登录表单
  await safeType(page, '#username', user.username);
  await safeType(page, '#password', user.password);

  // 点击登录按钮
  await safeClick(page, 'button[type="submit"]');

  // 等待登录成功 - 应该重定向到仪表板
  await waitForURL(page, '**/dashboard', 30000);
}

/**
 * 通过UI登出系统
 *
 * @param page Playwright Page对象
 */
export async function logout(page: Page): Promise<void> {
  // 点击用户菜单展开下拉菜单
  await safeClick(page, 'button[aria-expanded="false"]');

  // 点击退出登录按钮
  await safeClick(page, 'button:has-text("退出登录")');

  // 等待跳转到登录页
  await waitForURL(page, '**/', 10000);
}


/**
 * 验证登录状态
 *
 * @param page Playwright Page对象
 * @returns 是否已登录
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  const currentUrl = page.url();
  // 如果不在登录页，认为已登录
  return !currentUrl.endsWith('/') && !currentUrl.includes('/login');
}

/**
 * 验证登录错误提示
 *
 * @param page Playwright Page对象
 * @returns 是否显示错误提示
 */
export async function hasLoginError(page: Page): Promise<boolean> {
  const errorAlert = page.locator('div[role="alert"]');
  return await errorAlert.isVisible();
}

/**
 * 获取登录错误消息
 *
 * @param page Playwright Page对象
 * @returns 错误消息文本
 */
export async function getLoginErrorMessage(page: Page): Promise<string> {
  const errorAlert = page.locator('div[role="alert"]');
  return await errorAlert.textContent() || '';
}

/**
 * 执行完整的登录测试流程
 *
 * @param page Playwright Page对象
 * @param role 用户角色
 */
export async function performLoginTest(
  page: Page,
  role: 'admin' | 'tech_manager' | 'dept_manager' | 'engineer'
): Promise<void> {
  // 1. 导航到登录页
  await page.goto('/');

  // 2. 验证统一登录表单元素存在
  await page.waitForSelector('#username', { state: 'visible' });
  await page.waitForSelector('#password', { state: 'visible' });

  // 3. 执行登录（系统自动识别权限）
  await login(page, role);

  // 4. 验证登录成功 - 应该在仪表板页面
  const currentUrl = page.url();
  if (!currentUrl.includes('/dashboard')) {
    throw new Error(`登录失败，未重定向到仪表板。当前URL: ${currentUrl}`);
  }
}

/**
 * 清理会话（用于测试隔离）
 *
 * @param page Playwright Page对象
 */
export async function clearSession(page: Page): Promise<void> {
  // 清除localStorage
  await page.evaluate(() => {
    localStorage.clear();
  });

  // 清除cookies
  const context = page.context();
  await context.clearCookies();

  // 重新加载页面
  await page.reload();
}
