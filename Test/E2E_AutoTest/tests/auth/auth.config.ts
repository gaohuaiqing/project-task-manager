/**
 * 认证模块测试配置
 *
 * 定义认证测试的配置、常量和辅助函数
 */

import { getTestUser } from '../../src/data/test-users';

/**
 * 测试配置
 */
export const AUTH_TEST_CONFIG = {
  // 超时设置
  timeouts: {
    login: 30000, // 登录操作超时
    navigation: 10000, // 页面导航超时
    elementVisible: 5000, // 元素可见超时
    sessionSync: 3000, // 会话同步超时
    apiResponse: 10000 // API响应超时
  },

  // 重试设置
  retries: {
    login: 2, // 登录失败重试次数
    api: 1 // API调用失败重试次数
  },

  // 会话设置
  session: {
    timeout: 8 * 60 * 60 * 1000, // 8小时会话超时
    refreshInterval: 60 * 1000, // 1分钟刷新间隔
    syncTimeout: 2000 // 会话同步超时
  },

  // 测试用户
  users: {
    admin: getTestUser('admin'),
    tech_manager: getTestUser('tech_manager'),
    dept_manager: getTestUser('dept_manager'),
    engineer: getTestUser('engineer')
  },

  // 测试URL
  urls: {
    login: '/',
    dashboard: '/dashboard',
    projects: '/projects',
    tasks: '/tasks',
    settings: '/settings'
  },

  // 存储键
  storageKeys: {
    authSession: 'auth_session',
    currentUser: 'currentUser',
    isAdmin: 'isAdmin',
    appUsers: 'app_users',
    activeSession: (username: string) => `active_session_${username}`,
    crossBrowserSession: (username: string) => `cross_browser_session_${username}`
  },

  // 错误消息
  errorMessages: {
    invalidCredentials: '工号或密码错误',
    adminInvalidCredentials: '管理员账号或密码错误',
    sessionExpired: '会话已过期',
    networkError: '网络错误',
    loginFailed: '登录失败'
  },

  // 选择器
  selectors: {
    // 统一登录表单
    usernameInput: '#username',
    passwordInput: '#password',
    passwordToggle: '#passwordToggle',
    loginButton: 'button[type="submit"]',

    // 错误提示
    errorAlert: 'div[role="alert"]',

    // 用户菜单
    userMenuButton: 'button[aria-expanded]',
    logoutButton: 'button:has-text("退出登录")',

    // 页面标题
    pageTitle: 'h1:has-text("技术团队管理智能平台")',
    cardTitle: 'text=用户登录'
  },

  // 会话验证选项
  sessionValidation: {
    checkInterval: 5 * 60 * 1000, // 5分钟检查一次
    warnBeforeExpiry: 15 * 60 * 1000, // 15分钟前警告
    autoExtend: true // 自动延长会话
  },

  // 安全设置
  security: {
    maxLoginAttempts: 5, // 最大登录尝试次数
    lockoutDuration: 15 * 60 * 1000, // 锁定15分钟
    passwordMinLength: 6, // 最小密码长度
    requireUppercase: false, // 是否要求大写字母
    requireLowercase: false, // 是否要求小写字母
    requireNumbers: false, // 是否要求数字
    requireSpecialChars: false // 是否要求特殊字符
  },

  // 测试数据
  testData: {
    validCredentials: [
      { username: 'admin', password: 'admin123', role: 'admin' },
      { username: 'tech_manager', password: '123456', role: 'tech_manager' },
      { username: 'dept_manager', password: '123456', role: 'dept_manager' },
      { username: 'engineer', password: '123456', role: 'engineer' }
    ],

    invalidCredentials: [
      { username: 'wrong_user', password: 'wrong_password' },
      { username: '', password: '' },
      { username: 'admin', password: 'wrong' },
      { username: 'wrong', password: 'admin123' }
    ],

    weakPasswords: [
      '123',
      'password',
      '123456',
      'abc'
    ],

    sqlInjectionAttempts: [
      "admin' OR '1'='1",
      "admin'; DROP TABLE users--",
      "' OR '1'='1--",
      "admin' UNION SELECT * FROM users--"
    ],

    xssAttempts: [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      '"><script>alert("XSS")</script>',
      '<svg onload=alert("XSS")>'
    ]
  }
};

/**
 * 等待会话同步
 *
 * @param page Playwright Page对象
 * @param timeout 超时时间
 */
export async function waitForSessionSync(page: any, timeout: number = AUTH_TEST_CONFIG.timeouts.sessionSync): Promise<void> {
  await page.waitForTimeout(timeout);
}

/**
 * 清除所有认证数据
 *
 * @param page Playwright Page对象
 */
export async function clearAuthData(page: any): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem('auth_session');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('app_users');

    // 清除所有活动会话
    Object.keys(localStorage)
      .filter(key => key.startsWith('active_session_'))
      .forEach(key => localStorage.removeItem(key));

    Object.keys(localStorage)
      .filter(key => key.startsWith('cross_browser_session_'))
      .forEach(key => localStorage.removeItem(key));
  });
}

/**
 * 获取会话数据
 *
 * @param page Playwright Page对象
 * @returns 会话数据
 */
export async function getSessionData(page: any): Promise<any> {
  return await page.evaluate(() => {
    const sessionStr = localStorage.getItem('auth_session');
    if (!sessionStr) return null;
    return JSON.parse(sessionStr);
  });
}

/**
 * 获取用户数据
 *
 * @param page Playwright Page对象
 * @returns 用户数据
 */
export async function getUserData(page: any): Promise<any> {
  return await page.evaluate(() => {
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) return null;
    return JSON.parse(userStr);
  });
}

/**
 * 检查是否已登录
 *
 * @param page Playwright Page对象
 * @returns 是否已登录
 */
export async function isLoggedIn(page: any): Promise<boolean> {
  const sessionData = await getSessionData(page);
  return sessionData !== null;
}

/**
 * 检查是否是管理员
 *
 * @param page Playwright Page对象
 * @returns 是否是管理员
 */
export async function isAdmin(page: any): Promise<boolean> {
  return await page.evaluate(() => {
    return localStorage.getItem('isAdmin') === 'true';
  });
}

/**
 * 验证会话有效性
 *
 * @param page Playwright Page对象
 * @returns 会话是否有效
 */
export async function validateSession(page: any): Promise<boolean> {
  const sessionData = await getSessionData(page);
  if (!sessionData) return false;

  const now = Date.now();
  const sessionTimeout = AUTH_TEST_CONFIG.session.timeout;

  return (now - sessionData.lastAccessed) < sessionTimeout;
}

/**
 * 模拟会话过期
 *
 * @param page Playwright Page对象
 */
export async function expireSession(page: any): Promise<void> {
  await page.evaluate((timeout) => {
    const sessionStr = localStorage.getItem('auth_session');
    if (!sessionStr) return;

    const session = JSON.parse(sessionStr);
    session.lastAccessed = Date.now() - timeout - 1000; // 设置为超时
    localStorage.setItem('auth_session', JSON.stringify(session));
  }, AUTH_TEST_CONFIG.session.timeout);
}

/**
 * 等待登录完成
 *
 * @param page Playwright Page对象
 * @param timeout 超时时间
 */
export async function waitForLogin(page: any, timeout: number = AUTH_TEST_CONFIG.timeouts.login): Promise<void> {
  await page.waitForURL('**/dashboard', { timeout });
}

/**
 * 等待登出完成
 *
 * @param page Playwright Page对象
 * @param timeout 超时时间
 */
export async function waitForLogout(page: any, timeout: number = AUTH_TEST_CONFIG.timeouts.navigation): Promise<void> {
  await page.waitForURL('**/', { timeout });
}

/**
 * 验证错误提示显示
 *
 * @param page Playwright Page对象
 * @param message 错误消息
 */
export async function expectError(page: any, message: string): Promise<void> {
  const errorAlert = page.locator(AUTH_TEST_CONFIG.selectors.errorAlert);
  await errorAlert.waitFor({ state: 'visible', timeout: 5000 });

  const errorMessage = await errorAlert.textContent();
  expect(errorMessage).toContain(message);
}

/**
 * 获取控制台日志
 *
 * @param page Playwright Page对象
 * @returns 控制台日志
 */
export async function getConsoleLogs(page: any): Promise<string[]> {
  const logs: string[] = [];

  page.on('console', msg => {
    logs.push(msg.text());
  });

  return logs;
}

/**
 * 验证密码不在日志中
 *
 * @param logs 日志数组
 * @param password 密码
 */
export function validatePasswordNotInLogs(logs: string[], password: string): boolean {
  return !logs.some(log => log.includes(password));
}

/**
 * 测试辅助函数：创建测试会话
 *
 * @param page Playwright Page对象
 * @param role 用户角色
 */
export async function createTestSession(page: any, role: keyof typeof AUTH_TEST_CONFIG.users): Promise<void> {
  const user = AUTH_TEST_CONFIG.users[role];

  await page.evaluate((userData) => {
    const session = {
      userId: `user_${Date.now()}`,
      username: userData.username,
      sessionId: crypto.randomUUID(),
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      deviceId: 'test-device'
    };

    localStorage.setItem('auth_session', JSON.stringify(session));
    localStorage.setItem('currentUser', JSON.stringify({
      id: session.userId,
      username: userData.username,
      role: userData.role,
      name: userData.name
    }));

    if (userData.role === 'admin') {
      localStorage.setItem('isAdmin', 'true');
    }
  }, user);
}

/**
 * 测试辅助函数：验证API调用
 *
 * @param page Playwright Page对象
 * @param url API URL
 * @param method HTTP方法
 */
export async function verifyApiCall(page: any, url: string, method: string): Promise<boolean> {
  return new Promise((resolve) => {
    let found = false;

    const listener = (request: any) => {
      if (request.url().includes(url) && request.method() === method) {
        found = true;
      }
    };

    page.on('request', listener);

    setTimeout(() => {
      page.off('request', listener);
      resolve(found);
    }, 2000);
  });
}

/**
 * 测试数据生成器
 */
export const testDataGenerator = {
  /**
   * 生成随机用户名
   */
  randomUsername(): string {
    return `test_user_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  },

  /**
   * 生成随机密码
   */
  randomPassword(length: number = 12): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  },

  /**
   * 生成随机邮箱
   */
  randomEmail(): string {
    return `test_${Date.now()}@example.com`;
  },

  /**
   * 生成随机工号
   */
  randomEmployeeId(): string {
    return `EMP${Date.now().toString().substring(8)}${Math.floor(Math.random() * 1000)}`;
  }
};
