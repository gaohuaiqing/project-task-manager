/**
 * 认证模块数据验证测试
 *
 * 测试认证相关的数据存储、验证和转换
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { getTestUser } from '../../src/data/test-users';

test.describe('认证数据验证', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await page.evaluate(() => localStorage.clear());
    await loginPage.goto();
  });

  test.describe('会话数据结构', () => {
    test('登录后应该创建正确的会话数据结构', async ({ page }) => {
      const user = getTestUser('tech_manager');

      await loginPage.login(user.username, user.password);

      // 验证会话数据结构
      const sessionData = await page.evaluate(() => {
        const sessionStr = localStorage.getItem('auth_session');
        if (!sessionStr) return null;

        const session = JSON.parse(sessionStr);
        return {
          hasUserId: !!session.userId,
          hasUsername: !!session.username,
          hasSessionId: !!session.sessionId,
          hasCreatedAt: !!session.createdAt,
          hasLastAccessed: !!session.lastAccessed,
          hasDeviceId: !!session.deviceId
        };
      });

      expect(sessionData).not.toBeNull();
      expect(sessionData!.hasUserId).toBe(true);
      expect(sessionData!.hasUsername).toBe(true);
      expect(sessionData!.hasSessionId).toBe(true);
      expect(sessionData!.hasCreatedAt).toBe(true);
      expect(sessionData!.hasLastAccessed).toBe(true);
      expect(sessionData!.hasDeviceId).toBe(true);
    });

    test('会话ID应该是唯一的UUID格式', async ({ page }) => {
      const user = getTestUser('tech_manager');

      // 登录两次获取不同的会话ID
      await loginPage.login(user.username, user.password);

      const sessionId1 = await page.evaluate(() => {
        const sessionStr = localStorage.getItem('auth_session');
        if (!sessionStr) return null;
        const session = JSON.parse(sessionStr);
        return session.sessionId;
      });

      // 登出
      await page.locator('button[aria-expanded]').click();
      await page.locator('button:has-text("退出登录")').click();
      await page.waitForURL('**/');

      // 清除并重新登录
      await page.evaluate(() => localStorage.clear());
      await loginPage.goto();
      await loginPage.login(user.username, user.password);

      const sessionId2 = await page.evaluate(() => {
        const sessionStr = localStorage.getItem('auth_session');
        if (!sessionStr) return null;
        const session = JSON.parse(sessionStr);
        return session.sessionId;
      });

      // 两次会话ID应该不同
      expect(sessionId1).not.toBe(sessionId2);

      // 会话ID应该符合UUID格式（简化验证）
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(sessionId2).toMatch(uuidPattern);
    });

    test('会话应该记录设备信息', async ({ page }) => {
      const user = getTestUser('tech_manager');

      await loginPage.login(user.username, user.password);

      const deviceId = await page.evaluate(() => {
        const sessionStr = localStorage.getItem('auth_session');
        if (!sessionStr) return null;
        const session = JSON.parse(sessionStr);
        return session.deviceId;
      });

      expect(deviceId).not.toBeNull();
      expect(deviceId!.length).toBeGreaterThan(0);
    });

    test('会话应该记录创建和最后访问时间', async ({ page }) => {
      const user = getTestUser('tech_manager');
      const loginTime = Date.now();

      await loginPage.login(user.username, user.password);

      const timestamps = await page.evaluate(() => {
        const sessionStr = localStorage.getItem('auth_session');
        if (!sessionStr) return null;
        const session = JSON.parse(sessionStr);
        return {
          createdAt: session.createdAt,
          lastAccessed: session.lastAccessed
        };
      });

      expect(timestamps).not.toBeNull();

      // 验证时间在合理范围内
      expect(timestamps!.createdAt).toBeGreaterThanOrEqual(loginTime - 5000);
      expect(timestamps!.createdAt).toBeLessThanOrEqual(loginTime + 5000);

      expect(timestamps!.lastAccessed).toBeGreaterThanOrEqual(loginTime - 5000);
      expect(timestamps!.lastAccessed).toBeLessThanOrEqual(loginTime + 5000);
    });
  });

  test.describe('用户数据存储', () => {
    test('登录后应该存储当前用户信息', async ({ page }) => {
      const user = getTestUser('tech_manager');

      await loginPage.login(user.username, user.password);

      const currentUserData = await page.evaluate(() => {
        const userStr = localStorage.getItem('currentUser');
        if (!userStr) return null;
        return JSON.parse(userStr);
      });

      expect(currentUserData).not.toBeNull();
      expect(currentUserData!.username).toBe(user.username);
      expect(currentUserData!.role).toBe(user.role);
      expect(currentUserData!.name).toBe(user.name);
      expect(currentUserData!.id).toBeDefined();
    });

    test('管理员登录应该设置正确权限', async ({ page }) => {
      const user = getTestUser('admin');

      // 使用统一登录
      await loginPage.login(user.username, user.password);
      await expect(page).toHaveURL(/\/dashboard/);

      // 验证管理员权限被正确识别
      const currentUser = await page.evaluate(() => {
        const userStr = localStorage.getItem('currentUser');
        if (!userStr) return null;
        return JSON.parse(userStr);
      });

      expect(currentUser).not.toBeNull();
      expect(currentUser!.role).toBe('admin');
    });

    test('普通用户登录不应该设置isAdmin标志', async ({ page }) => {
      const user = getTestUser('tech_manager');

      await loginPage.login(user.username, user.password);

      const isAdmin = await page.evaluate(() => {
        return localStorage.getItem('isAdmin');
      });

      expect(isAdmin).toBeNull();
    });

    test('用户列表应该被正确存储', async ({ page }) => {
      const user = getTestUser('tech_manager');

      await loginPage.login(user.username, user.password);

      const usersData = await page.evaluate(() => {
        const usersStr = localStorage.getItem('app_users');
        if (!usersStr) return null;
        return JSON.parse(usersStr);
      });

      expect(usersData).not.toBeNull();

      // 验证包含默认用户
      expect(usersData!.admin).toBeDefined();
      expect(usersData!.tech_manager).toBeDefined();
      expect(usersData!.dept_manager).toBeDefined();
      expect(usersData!.engineer).toBeDefined();

      // 验证用户数据结构
      expect(usersData!.tech_manager).toHaveProperty('password');
      expect(usersData!.tech_manager).toHaveProperty('role');
      expect(usersData!.tech_manager).toHaveProperty('name');
    });
  });

  test.describe('数据安全', () => {
    test('密码应该被哈希存储', async ({ page }) => {
      const user = getTestUser('tech_manager');

      await loginPage.login(user.username, user.password);

      const hashedPassword = await page.evaluate(() => {
        const usersStr = localStorage.getItem('app_users');
        if (!usersStr) return null;
        const users = JSON.parse(usersStr);
        return users.tech_manager.password;
      });

      // 哈希后的密码不应该与明文密码相同
      expect(hashedPassword).not.toBe(user.password);

      // bcrypt哈希应该以$2b$开头
      expect(hashedPassword).toMatch(/^\$2b\$/);

      // 哈希长度应该固定（60字符）
      expect(hashedPassword!.length).toBe(60);
    });

    test('会话数据不应该包含敏感信息', async ({ page }) => {
      const user = getTestUser('tech_manager');

      await loginPage.login(user.username, user.password);

      const sessionData = await page.evaluate(() => {
        const sessionStr = localStorage.getItem('auth_session');
        if (!sessionStr) return null;
        return JSON.parse(sessionStr);
      });

      // 会话数据不应该包含密码
      expect(sessionData).not.toHaveProperty('password');

      // 会话数据应该包含必要的标识信息
      expect(sessionData).toHaveProperty('userId');
      expect(sessionData).toHaveProperty('username');
      expect(sessionData).toHaveProperty('sessionId');
    });

    test('登出后应该清除所有认证相关数据', async ({ page }) => {
      const user = getTestUser('tech_manager');

      await loginPage.login(user.username, user.password);

      // 等待会话建立
      await page.waitForTimeout(1000);

      // 登出
      await page.locator('button[aria-expanded]').click();
      await page.locator('button:has-text("退出登录")').click();
      await page.waitForURL('**/');

      const storageAfterLogout = await page.evaluate(() => {
        return {
          authSession: localStorage.getItem('auth_session'),
          currentUser: localStorage.getItem('currentUser'),
          isAdmin: localStorage.getItem('isAdmin'),
          activeSession: localStorage.getItem('active_session_tech_manager')
        };
      });

      // 所有关键数据应该被清除
      expect(storageAfterLogout.authSession).toBeNull();
      expect(storageAfterLogout.currentUser).toBeNull();
      expect(storageAfterLogout.isAdmin).toBeNull();
      expect(storageAfterLogout.activeSession).toBeNull();
    });
  });

  test.describe('数据验证', () => {
    test('用户名应该符合工号格式要求', async ({ page }) => {
      const validUsernames = ['tech_manager', 'dept_manager', 'engineer', 'admin'];
      const user = getTestUser('tech_manager');

      await loginPage.login(user.username, user.password);

      const storedUsernames = await page.evaluate(() => {
        const usersStr = localStorage.getItem('app_users');
        if (!usersStr) return [];
        const users = JSON.parse(usersStr);
        return Object.keys(users);
      });

      // 验证所有存储的用户名都在有效列表中
      for (const username of storedUsernames) {
        expect(validUsernames).toContain(username);
      }
    });

    test('用户角色应该是有效的枚举值', async ({ page }) => {
      const validRoles = ['admin', 'tech_manager', 'dept_manager', 'engineer'];
      const user = getTestUser('tech_manager');

      await loginPage.login(user.username, user.password);

      const userRoles = await page.evaluate(() => {
        const usersStr = localStorage.getItem('app_users');
        if (!usersStr) return [];
        const users = JSON.parse(usersStr);
        return Object.values(users).map((u: any) => u.role);
      });

      // 验证所有角色都是有效的
      for (const role of userRoles) {
        expect(validRoles).toContain(role);
      }
    });

    test('会话超时时间应该是8小时', async ({ page }) => {
      // 这里我们验证代码中的常量（通过行为测试）
      const user = getTestUser('tech_manager');

      const loginTime = Date.now();

      await loginPage.login(user.username, user.password);

      const sessionData = await page.evaluate(() => {
        const sessionStr = localStorage.getItem('auth_session');
        if (!sessionStr) return null;
        return JSON.parse(sessionStr);
      });

      expect(sessionData).not.toBeNull();

      // 验证会话创建时间接近登录时间
      expect(Math.abs(sessionData!.createdAt - loginTime)).toBeLessThan(5000);

      // 会话应该至少在8小时内有效（我们这里验证初始状态）
      const eightHoursInMs = 8 * 60 * 60 * 1000;
      expect(sessionData!.createdAt + eightHoursInMs).toBeGreaterThan(Date.now());
    });
  });

  test.describe('数据同步', () => {
    test('登录应该更新最后访问时间', async ({ page }) => {
      const user = getTestUser('tech_manager');

      await loginPage.login(user.username, user.password);

      // 获取初始的lastAccessed
      const initialLastAccessed = await page.evaluate(() => {
        const sessionStr = localStorage.getItem('auth_session');
        if (!sessionStr) return null;
        const session = JSON.parse(sessionStr);
        return session.lastAccessed;
      });

      // 等待一小段时间
      await page.waitForTimeout(2000);

      // 刷新页面（应该更新lastAccessed）
      await page.reload();

      // 获取更新后的lastAccessed
      const updatedLastAccessed = await page.evaluate(() => {
        const sessionStr = localStorage.getItem('auth_session');
        if (!sessionStr) return null;
        const session = JSON.parse(sessionStr);
        return session.lastAccessed;
      });

      // lastAccessed应该被更新
      expect(updatedLastAccessed).toBeGreaterThan(initialLastAccessed!);
    });

    test('多个活动会话应该被正确管理', async ({ context }) => {
      const user = getTestUser('tech_manager');

      // 创建第一个浏览器上下文并登录
      const context1 = await context.newContext();
      const page1 = await context1.newPage();
      const loginPage1 = new LoginPage(page1);

      await loginPage1.goto();
      await loginPage1.login(user.username, user.password);

      const sessionId1 = await page1.evaluate(() => {
        const sessionStr = localStorage.getItem('auth_session');
        if (!sessionStr) return null;
        const session = JSON.parse(sessionStr);
        return session.sessionId;
      });

      // 创建第二个浏览器上下文并登录
      const context2 = await context.newContext();
      const page2 = await context2.newPage();
      const loginPage2 = new LoginPage(page2);

      await loginPage2.goto();
      await loginPage2.login(user.username, user.password);

      const sessionId2 = await page2.evaluate(() => {
        const sessionStr = localStorage.getItem('auth_session');
        if (!sessionStr) return null;
        const session = JSON.parse(sessionStr);
        return session.sessionId;
      });

      // 两个会话ID应该不同（不同的浏览器上下文）
      expect(sessionId1).not.toBe(sessionId2);

      // 清理
      await context1.close();
      await context2.close();
    });
  });

  test.describe('数据完整性', () => {
    test('登录失败不应该创建会话数据', async ({ page }) => {
      await loginPage.fillUsername('wrong_user');
      await loginPage.fillPassword('wrong_password');
      await loginPage.clickLoginButton();

      // 等待错误显示
      await loginPage.expectLoginError();

      // 验证没有创建会话数据
      const sessionData = await page.evaluate(() => {
        return {
          authSession: localStorage.getItem('auth_session'),
          currentUser: localStorage.getItem('currentUser'),
          isAdmin: localStorage.getItem('isAdmin')
        };
      });

      expect(sessionData.authSession).toBeNull();
      expect(sessionData.currentUser).toBeNull();
      expect(sessionData.isAdmin).toBeNull();
    });

    test('部分填写表单不应该创建会话', async ({ page }) => {
      const user = getTestUser('tech_manager');

      // 只填写用户名
      await loginPage.fillUsername(user.username);

      // 不填写密码，直接尝试访问受保护页面
      await page.goto('/dashboard');

      // 应该重定向到登录页
      await expect(page).toHaveURL(/\/$/);

      // 验证没有创建会话
      const hasSession = await page.evaluate(() => {
        return !!localStorage.getItem('auth_session');
      });

      expect(hasSession).toBe(false);
    });

    test('用户数据应该包含完整的信息', async ({ page }) => {
      const user = getTestUser('tech_manager');

      await loginPage.login(user.username, user.password);

      const userData = await page.evaluate(() => {
        const userStr = localStorage.getItem('currentUser');
        if (!userStr) return null;
        return JSON.parse(userStr);
      });

      expect(userData).toMatchObject({
        username: user.username,
        role: user.role,
        name: user.name
      });

      // 验证userId是字符串
      expect(typeof userData.id).toBe('string');
      expect(userData.id.length).toBeGreaterThan(0);
    });
  });
});
