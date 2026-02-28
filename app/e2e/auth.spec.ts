/**
 * 认证功能 E2E 测试
 * 测试用户登录、登出、权限验证等流程
 */

import { test, expect } from '@playwright/test';

test.describe('认证功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('应该显示登录页面', async ({ page }) => {
    await expect(page).toHaveTitle(/Project Task Manager/);
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('input[type="text"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('应该成功登录', async ({ page }) => {
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');

    await page.click('button[type="submit"]');

    // 等待导航到仪表盘
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('text=/欢迎/i')).toBeVisible();
  });

  test('登录失败应该显示错误消息', async ({ page }) => {
    await page.fill('input[type="text"]', 'invalid');
    await page.fill('input[type="password"]', 'wrong');

    await page.click('button[type="submit"]');

    // 应该显示错误消息
    await expect(page.locator('text=/用户名或密码错误/i')).toBeVisible();
    // 仍然在登录页面
    await expect(page).toHaveURL('/');
  });

  test('空用户名和密码应该显示验证错误', async ({ page }) => {
    await page.click('button[type="submit"]');

    // 应该显示验证错误
    await expect(page.locator('text=/请输入用户名/i')).toBeVisible();
  });

  test('应该支持记住我功能', async ({ page }) => {
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');

    // 勾选记住我
    const rememberCheckbox = page.locator('input[type="checkbox"]');
    if (await rememberCheckbox.isVisible()) {
      await rememberCheckbox.check();
    }

    await page.click('button[type="submit"]');

    // 验证登录成功
    await expect(page).toHaveURL(/.*dashboard/);

    // 刷新页面应该保持登录状态
    await page.reload();
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('应该成功登出', async ({ page }) => {
    // 先登录
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/);

    // 登出
    await page.click('[aria-label="登出"]');
    await expect(page).toHaveURL('/');

    // 验证已登出
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/');
  });

  test('未登录时访问受保护页面应该重定向到登录页', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/');
  });

  test('应该支持不同角色登录', async ({ page }) => {
    // 测试技术经理登录
    await page.fill('input[type="text"]', 'tech_manager');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*dashboard/);

    // 登出
    await page.click('[aria-label="登出"]');

    // 测试部门经理登录
    await page.fill('input[type="text"]', 'dept_manager');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('应该显示系统信息', async ({ page }) => {
    // 检查登录页面是否有系统标题
    await expect(page.locator('h1, h2').filter({ hasText: /项目任务管理系统/i })).toBeVisible();
  });

  test('应该支持回车键登录', async ({ page }) => {
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');

    // 按回车键
    await page.press('input[type="password"]', 'Enter');

    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('应该正确处理会话过期', async ({ page, context }) => {
    // 登录
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/);

    // 清除会话存储
    await context.clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // 刷新页面
    await page.reload();

    // 应该重定向到登录页
    await expect(page).toHaveURL('/');
  });
});

test.describe('密码安全', () => {
  test('密码输入框应该隐藏密码', async ({ page }) => {
    await page.goto('/');

    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('应该支持显示/隐藏密码', async ({ page }) => {
    await page.goto('/');

    // 检查是否有显示/隐藏密码按钮
    const toggleButton = page.locator('button[aria-label*="显示"], button[aria-label*="隐藏"]');
    const isVisible = await toggleButton.isVisible();

    if (isVisible) {
      await page.fill('input[type="text"]', 'admin');
      await page.fill('input[type="password"]', 'admin123');

      // 点击显示密码
      await toggleButton.first().click();

      const passwordInput = page.locator('input');
      await expect(passwordInput.nth(1)).toHaveAttribute('type', 'text');

      // 再次点击隐藏密码
      await toggleButton.first().click();
      await expect(passwordInput.nth(1)).toHaveAttribute('type', 'password');
    }
  });
});

test.describe('响应式设计', () => {
  test('移动端登录页面应该正确显示', async ({ page, viewport }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // 检查移动端布局
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('input[type="text"]')).toBeVisible();
  });

  test('应该自适应不同屏幕尺寸', async ({ page }) => {
    // 桌面尺寸
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await expect(page.locator('form')).toBeVisible();

    // 平板尺寸
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await expect(page.locator('form')).toBeVisible();

    // 移动尺寸
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await expect(page.locator('form')).toBeVisible();
  });
});
