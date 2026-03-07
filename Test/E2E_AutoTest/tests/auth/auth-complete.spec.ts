/**
 * 认证模块完整测试套件
 *
 * 覆盖场景：
 * 1. 用户登录（所有角色）
 * 2. 管理员登录
 * 3. 密码可见性切换
 * 4. 错误凭据验证
 * 5. 会话保持
 * 6. 会话超时
 * 7. 多角色切换
 * 8. UI元素验证
 * 9. 键盘交互
 * 10. 响应式布局
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { DashboardPage } from '../../src/pages/DashboardPage';
import { getTestUser, getAllTestUsers } from '../../src/data/test-users';

test.describe('认证模块 - 完整测试套件', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    // 清除会话以确保测试隔离
    await page.evaluate(() => {
      localStorage.clear();
    });
    await loginPage.goto();
  });

  test.describe('用户登录 - 所有角色', () => {
    test('技术经理账号应该能够成功登录', async ({ page }) => {
      const user = getTestUser('tech_manager');

      // 填写用户名
      await loginPage.fillUsername(user.username);
      await expect(page.locator('#username')).toHaveValue(user.username);

      // 填写密码
      await loginPage.fillPassword(user.password);
      await expect(page.locator('#password')).toHaveValue(user.password);

      // 点击登录
      await loginPage.clickLoginButton();

      // 验证跳转到仪表板
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });

      // 验证仪表板加载
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.waitForReady();
    });

    test('部门经理账号应该能够成功登录', async ({ page }) => {
      const user = getTestUser('dept_manager');

      await loginPage.fillUsername(user.username);
      await loginPage.fillPassword(user.password);
      await loginPage.clickLoginButton();

      await expect(page).toHaveURL(/\/dashboard/);

      const dashboardPage = new DashboardPage(page);
      await dashboardPage.waitForReady();
    });

    test('工程师账号应该能够成功登录', async ({ page }) => {
      const user = getTestUser('engineer');

      await loginPage.fillUsername(user.username);
      await loginPage.fillPassword(user.password);
      await loginPage.clickLoginButton();

      await expect(page).toHaveURL(/\/dashboard/);

      const dashboardPage = new DashboardPage(page);
      await dashboardPage.waitForReady();
    });

    test('所有预设用户账号都应该能够登录', async ({ page }) => {
      const users = getAllTestUsers();

      for (const user of users) {
        // 清除会话
        await page.evaluate(() => localStorage.clear());
        await loginPage.goto();

        // 执行统一登录（系统自动识别权限）
        await loginPage.fillUsername(user.username);
        await loginPage.fillPassword(user.password);
        await loginPage.clickLoginButton();

        // 验证登录成功
        await expect(page).toHaveURL(/\/dashboard/);

        // 验证用户信息
        const userInfo = await page.evaluate(() => {
          return {
            username: localStorage.getItem('currentUser'),
            role: localStorage.getItem('userRole')
          };
        });

        expect(userInfo.username).toContain(user.username);
        expect(userInfo.role).toBe(user.role);

        // 登出以便下一个测试
        await page.locator('button[aria-expanded"]').click();
        await page.locator('button:has-text("退出登录")').click();
        await page.waitForURL('**/');
      }
    });
  });


  test.describe('密码可见性切换', () => {
    test('统一密码字段应该支持显示/隐藏切换', async ({ page }) => {
      const passwordInput = page.locator('#password');
      const toggleButton = page.locator('#passwordToggle');

      // 初始状态：密码应该被隐藏
      await expect(passwordInput).toHaveAttribute('type', 'password');

      // 点击显示密码
      await toggleButton.click();

      // 密码应该可见
      await expect(passwordInput).toHaveAttribute('type', 'text');

      // 验证眼睛图标变化
      const eyeIcon = page.locator('#passwordToggle svg');
      await expect(eyeIcon).toBeVisible();
    });

    test('密码切换按钮应该有正确的可访问性属性', async ({ page }) => {
      const toggleButton = page.locator('#passwordToggle');

      // 点击切换
      await toggleButton.click();

      // 验证aria-pressed属性
      await expect(toggleButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  test.describe('错误凭据验证', () => {
    test('错误的用户名应该显示错误提示', async ({ page }) => {
      await loginPage.fillUsername('wrong_user');
      await loginPage.fillPassword('123456');
      await loginPage.clickLoginButton();

      await loginPage.expectLoginError();

      const errorMessage = await loginPage.getErrorMessage();
      expect(errorMessage).toContain('工号或密码错误');
    });

    test('错误的密码应该显示错误提示', async ({ page }) => {
      const user = getTestUser('tech_manager');

      await loginPage.fillUsername(user.username);
      await loginPage.fillPassword('wrong_password');
      await loginPage.clickLoginButton();

      await loginPage.expectLoginError();

      const errorMessage = await loginPage.getErrorMessage();
      expect(errorMessage).toContain('工号或密码错误');
    });

    test('空用户名和密码应该显示HTML5验证', async ({ page }) => {
      // 尝试直接提交空表单
      await loginPage.clickLoginButton();

      // 验证HTML5验证触发（不应该跳转）
      await expect(page).not.toHaveURL(/\/dashboard/);

      // 用户名输入框应该有required属性
      await expect(page.locator('#username')).toHaveAttribute('required', '');
    });

    test('输入错误凭据后应该能够重新登录', async ({ page }) => {
      const user = getTestUser('tech_manager');

      // 第一次尝试：错误密码
      await loginPage.fillUsername(user.username);
      await loginPage.fillPassword('wrong_password');
      await loginPage.clickLoginButton();

      await loginPage.expectLoginError();

      // 清空密码并重新输入正确密码
      await page.locator('#password').fill('');
      await loginPage.fillPassword(user.password);
      await loginPage.clickLoginButton();

      // 应该成功登录
      await expect(page).toHaveURL(/\/dashboard/);
    });

    test('连续多次错误登录应该每次都显示错误', async ({ page }) => {
      const attempts = 3;

      for (let i = 0; i < attempts; i++) {
        await loginPage.fillUsername(`wrong_user_${i}`);
        await loginPage.fillPassword('wrong_password');
        await loginPage.clickLoginButton();

        await loginPage.expectLoginError();

        // 清空表单
        await page.locator('#username').fill('');
        await page.locator('#password').fill('');
      }
    });
  });

  test.describe('会话保持', () => {
    test('登录后刷新页面应该保持会话', async ({ page }) => {
      const user = getTestUser('tech_manager');

      await loginPage.login(user.username, user.password);
      await expect(page).toHaveURL(/\/dashboard/);

      // 刷新页面
      await page.reload();

      // 应该仍然在仪表板
      await expect(page).toHaveURL(/\/dashboard/);

      // 验证会话信息仍然存在
      const sessionInfo = await page.evaluate(() => {
        return {
          sessionId: localStorage.getItem('auth_session'),
          currentUser: localStorage.getItem('currentUser')
        };
      });

      expect(sessionInfo.sessionId).not.toBeNull();
      expect(sessionInfo.currentUser).not.toBeNull();
    });

    test('登录后在新标签页应该共享会话', async ({ context }) => {
      const user = getTestUser('tech_manager');

      // 第一个标签页登录
      await loginPage.login(user.username, user.password);
      await expect(loginPage.page).toHaveURL(/\/dashboard/);

      // 打开第二个标签页
      const page2 = await context.newPage();
      await page2.goto('/dashboard');

      // 应该可以直接访问（共享会话）
      await expect(page2).toHaveURL(/\/dashboard/);

      await page2.close();
    });

    test('登录后导航到不同页面应该保持会话', async ({ page }) => {
      const user = getTestUser('tech_manager');

      await loginPage.login(user.username, user.password);

      // 导航到不同页面
      await page.goto('/projects');
      await expect(page).toHaveURL(/\/projects/);

      await page.goto('/tasks');
      await expect(page).toHaveURL(/\/tasks/);

      await page.goto('/settings');
      await expect(page).toHaveURL(/\/settings/);

      // 返回仪表板
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/\/dashboard/);
    });

    test('会话信息应该包含完整的用户数据', async ({ page }) => {
      const user = getTestUser('tech_manager');

      await loginPage.login(user.username, user.password);

      // 验证完整的会话信息
      const sessionData = await page.evaluate(() => {
        const sessionStr = localStorage.getItem('auth_session');
        if (!sessionStr) return null;

        const session = JSON.parse(sessionStr);
        return {
          userId: session.userId,
          username: session.username,
          sessionId: session.sessionId,
          createdAt: session.createdAt,
          lastAccessed: session.lastAccessed
        };
      });

      expect(sessionData).not.toBeNull();
      expect(sessionData!.username).toBe(user.username);
      expect(sessionData!.sessionId).toBeDefined();
      expect(sessionData!.createdAt).toBeDefined();
      expect(sessionData!.lastAccessed).toBeDefined();
    });
  });


  test.describe('UI元素验证', () => {
    test('登录页面应该显示所有必需的UI元素', async ({ page }) => {
      // 验证标题
      await expect(page.locator('h1:has-text("技术团队管理智能平台")')).toBeVisible();

      // 验证统一登录表单
      await expect(page.locator('label:has-text("工号")')).toBeVisible();
      await expect(page.locator('#username')).toBeVisible();
      await expect(page.locator('label:has-text("密码")')).toBeVisible();
      await expect(page.locator('#password')).toBeVisible();

      // 验证登录按钮
      await expect(page.locator('button[type="submit"]')).toBeVisible();

      // 验证卡片
      await expect(page.locator('.card')).toBeVisible();
    });

    test('登录按钮在加载时应该显示加载状态', async ({ page }) => {
      const user = getTestUser('tech_manager');

      // 填写表单
      await loginPage.fillUsername(user.username);
      await loginPage.fillPassword(user.password);

      // 点击登录并验证按钮状态
      const loginButton = page.locator('button[type="submit"]');
      await loginButton.click();

      // 按钮应该显示"登录中..."或被禁用
      await expect(loginButton).toBeDisabled();
    });

    test('错误提示应该有正确的样式', async ({ page }) => {
      await loginPage.fillUsername('wrong');
      await loginPage.fillPassword('wrong');
      await loginPage.clickLoginButton();

      // 等待错误提示显示
      const errorAlert = page.locator('div[role="alert"]');
      await expect(errorAlert).toBeVisible();

      // 验证错误图标
      await expect(errorAlert.locator('svg')).toBeVisible();

      // 验证错误文本
      const errorText = await errorAlert.textContent();
      expect(errorText).toContain('工号或密码错误');
    });
  });

  test.describe('键盘交互', () => {
    test('应该在密码字段按Enter键提交表单', async ({ page }) => {
      const user = getTestUser('tech_manager');

      await loginPage.fillUsername(user.username);
      await loginPage.fillPassword(user.password);

      // 在密码字段按Enter
      await page.locator('#password').press('Enter');

      // 应该提交表单
      await expect(page).toHaveURL(/\/dashboard/);
    });

    test('Tab键应该按正确顺序导航表单字段', async ({ page }) => {
      // 聚焦用户名
      await page.locator('#username').focus();
      let focusedElement = await page.evaluate(() => document.activeElement?.id);
      expect(focusedElement).toBe('username');

      // 按Tab到密码
      await page.keyboard.press('Tab');
      focusedElement = await page.evaluate(() => document.activeElement?.id);
      expect(focusedElement).toBe('password');

      // 按Tab到密码切换按钮
      await page.keyboard.press('Tab');
      const focusedTag = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedTag).toBe('BUTTON');
    });

    test('Escape键不应该提交表单', async ({ page }) => {
      await loginPage.fillUsername('test');
      await loginPage.fillPassword('test');

      // 按Escape
      await page.keyboard.press('Escape');

      // 不应该跳转
      await expect(page).not.toHaveURL(/\/dashboard/);
    });
  });

  test.describe('响应式布局', () => {
    test('登录页面在移动设备上应该正常显示', async ({ page }) => {
      // 设置移动设备视口
      await page.setViewportSize({ width: 375, height: 667 });

      // 验证元素可见
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('#username')).toBeVisible();
      await expect(page.locator('#password')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('登录页面在平板设备上应该正常显示', async ({ page }) => {
      // 设置平板设备视口
      await page.setViewportSize({ width: 768, height: 1024 });

      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('#username')).toBeVisible();
      await expect(page.locator('#password')).toBeVisible();
    });

    test('登录页面在桌面设备上应该居中显示', async ({ page }) => {
      // 设置桌面设备视口
      await page.setViewportSize({ width: 1920, height: 1080 });

      const loginCard = page.locator('.card').first();
      const box = await loginCard.boundingBox();

      expect(box).not.toBeNull();
      // 验证卡片水平居中（允许一定误差）
      if (box) {
        const centerX = box.x + box.width / 2;
        const pageCenter = 1920 / 2;
        expect(Math.abs(centerX - pageCenter)).toBeLessThan(100);
      }
    });
  });

  test.describe('可访问性', () => {
    test('表单字段应该有正确的标签关联', async ({ page }) => {
      // 验证用户名标签
      const usernameLabel = page.locator('label[for="username"]');
      await expect(usernameLabel).toBeVisible();
      await expect(usernameLabel).toContainText('工号');

      // 验证密码标签
      const passwordLabel = page.locator('label[for="password"]');
      await expect(passwordLabel).toBeVisible();
      await expect(passwordLabel).toContainText('密码');
    });

    test('错误提示应该对屏幕阅读器可访问', async ({ page }) => {
      await loginPage.fillUsername('wrong');
      await loginPage.fillPassword('wrong');
      await loginPage.clickLoginButton();

      const errorAlert = page.locator('div[role="alert"]');
      await expect(errorAlert).toBeVisible();
      await expect(errorAlert).toHaveAttribute('role', 'alert');
    });

    test('登录按钮应该有清晰的文本标签', async ({ page }) => {
      const loginButton = page.locator('button[type="submit"]');
      await expect(loginButton).toBeVisible();
      await expect(loginButton).toContainText('登录');
    });

    test('密码切换按钮应该有aria-pressed状态', async ({ page }) => {
      const toggleButton = page.locator('#passwordToggle');

      // 初始状态
      await expect(toggleButton).toHaveAttribute('aria-pressed', 'false');

      // 点击后
      await toggleButton.click();
      await expect(toggleButton).toHaveAttribute('aria-pressed', 'true');
    });
  });
});

test.describe('会话超时模拟', () => {
  test('会话过期后应该自动登出', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const user = getTestUser('tech_manager');

    // 登录
    await loginPage.goto();
    await loginPage.login(user.username, user.password);
    await expect(page).toHaveURL(/\/dashboard/);

    // 模拟会话过期（手动设置会话为过期状态）
    await page.evaluate(() => {
      const sessionStr = localStorage.getItem('auth_session');
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        // 设置会话为10小时前（超过8小时超时）
        session.lastAccessed = Date.now() - 10 * 60 * 60 * 1000;
        localStorage.setItem('auth_session', JSON.stringify(session));
      }
    });

    // 刷新页面
    await page.reload();

    // 应该重定向到登录页
    await expect(page).toHaveURL(/\/$/);
  });

  test('会话应该能够自动延期', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const user = getTestUser('tech_manager');

    // 登录
    await loginPage.goto();
    await loginPage.login(user.username, user.password);

    // 获取初始的lastAccessed时间
    const initialTime = await page.evaluate(() => {
      const sessionStr = localStorage.getItem('auth_session');
      if (!sessionStr) return 0;
      const session = JSON.parse(sessionStr);
      return session.lastAccessed;
    });

    // 等待一小段时间
    await page.waitForTimeout(2000);

    // 触发会话延期（通过页面交互）
    await page.reload();

    // 获取新的lastAccessed时间
    const newTime = await page.evaluate(() => {
      const sessionStr = localStorage.getItem('auth_session');
      if (!sessionStr) return 0;
      const session = JSON.parse(sessionStr);
      return session.lastAccessed;
    });

    // 新时间应该比初始时间晚
    expect(newTime).toBeGreaterThan(initialTime);
  });
});

test.describe('登出功能完整测试', () => {
  test('点击退出登录应该清除所有会话数据', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const user = getTestUser('tech_manager');

    // 登录
    await loginPage.goto();
    await loginPage.login(user.username, user.password);

    // 验证会话数据存在
    const beforeLogout = await page.evaluate(() => {
      return {
        authSession: !!localStorage.getItem('auth_session'),
        currentUser: !!localStorage.getItem('currentUser'),
        isAdmin: !!localStorage.getItem('isAdmin')
      };
    });

    expect(beforeLogout.authSession).toBe(true);
    expect(beforeLogout.currentUser).toBe(true);

    // 登出
    await page.locator('button[aria-expanded]').click();
    await page.locator('button:has-text("退出登录")').click();
    await page.waitForURL('**/');

    // 验证会话数据被清除
    const afterLogout = await page.evaluate(() => {
      return {
        authSession: localStorage.getItem('auth_session'),
        currentUser: localStorage.getItem('currentUser'),
        isAdmin: localStorage.getItem('isAdmin')
      };
    });

    expect(afterLogout.authSession).toBeNull();
    expect(afterLogout.currentUser).toBeNull();
    expect(afterLogout.isAdmin).toBeNull();
  });

  test('登出后不能通过浏览器后退按钮访问受保护页面', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const user = getTestUser('tech_manager');

    // 登录并访问仪表板
    await loginPage.goto();
    await loginPage.login(user.username, user.password);
    await expect(page).toHaveURL(/\/dashboard/);

    // 登出
    await page.locator('button[aria-expanded]').click();
    await page.locator('button:has-text("退出登录")').click();
    await page.waitForURL('**/');

    // 尝试使用后退按钮
    await page.goBack();

    // 应该仍然在登录页或被重定向到登录页
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/$/);
  });

  test('登出后尝试直接访问受保护页面应该重定向到登录页', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const user = getTestUser('tech_manager');

    // 登录
    await loginPage.goto();
    await loginPage.login(user.username, user.password);

    // 登出
    await page.locator('button[aria-expanded]').click();
    await page.locator('button:has-text("退出登录")').click();
    await page.waitForURL('**/');

    // 尝试直接访问各种受保护页面
    const protectedPages = ['/dashboard', '/projects', '/tasks', '/settings'];

    for (const path of protectedPages) {
      await page.goto(path);
      await page.waitForLoadState('load');

      // 应该重定向到登录页
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/\/$/);
    }
  });

  test('登出后可以重新登录', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const user = getTestUser('tech_manager');

    // 第一次登录
    await loginPage.goto();
    await loginPage.login(user.username, user.password);
    await expect(page).toHaveURL(/\/dashboard/);

    // 登出
    await page.locator('button[aria-expanded]').click();
    await page.locator('button:has-text("退出登录")').click();
    await page.waitForURL('**/');

    // 第二次登录
    await loginPage.goto();
    await loginPage.login(user.username, user.password);
    await expect(page).toHaveURL(/\/dashboard/);

    // 验证新会话已创建
    const sessionInfo = await page.evaluate(() => {
      const sessionStr = localStorage.getItem('auth_session');
      return sessionStr ? JSON.parse(sessionStr) : null;
    });

    expect(sessionInfo).not.toBeNull();
    expect(sessionInfo.username).toBe(user.username);
  });
});

test.describe('跨标签页会话同步', () => {
  test('在一个标签页登出应该同步到其他标签页', async ({ context }) => {
    const user = getTestUser('tech_manager');

    // 第一个标签页登录
    const page1 = await context.newPage();
    const loginPage1 = new LoginPage(page1);
    await loginPage1.goto();
    await loginPage1.login(user.username, user.password);
    await expect(page1).toHaveURL(/\/dashboard/);

    // 第二个标签页访问
    const page2 = await context.newPage();
    await page2.goto('/dashboard');
    await expect(page2).toHaveURL(/\/dashboard/);

    // 在第一个标签页登出
    await page1.locator('button[aria-expanded]').click();
    await page1.locator('button:has-text("退出登录")').click();
    await page1.waitForURL('**/');

    // 等待同步
    await page2.waitForTimeout(1000);

    // 第二个标签页应该也被登出
    await page2.reload();
    await expect(page2).toHaveURL(/\/$/);

    await page1.close();
    await page2.close();
  });

  test('新标签页应该能够访问已登录的会话', async ({ context }) => {
    const user = getTestUser('tech_manager');

    // 第一个标签页登录
    const page1 = await context.newPage();
    const loginPage1 = new LoginPage(page1);
    await loginPage1.goto();
    await loginPage1.login(user.username, user.password);

    // 等待会话建立
    await page1.waitForTimeout(1000);

    // 打开多个新标签页
    const pages = await Promise.all([
      context.newPage(),
      context.newPage(),
      context.newPage()
    ]);

    // 所有新标签页都应该能够直接访问受保护页面
    for (const page of pages) {
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/\/dashboard/);
    }

    // 清理
    await page1.close();
    for (const page of pages) {
      await page.close();
    }
  });
});
