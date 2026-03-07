# 认证模块E2E测试 - 快速参考指南

## 快速开始

### 安装依赖

```bash
cd Test/E2E_AutoTest
npm install
```

### 运行测试

```bash
# 运行所有认证测试
npx playwright test tests/auth/

# 以 headed 模式运行（显示浏览器）
npx playwright test tests/auth/ --headed

# 调试模式
npx playwright test tests/auth/ --debug

# 生成测试报告
npx playwright test tests/auth/ --reporter=html
npx playwright show-report
```

## 测试文件结构

```
Test/E2E_AutoTest/
├── tests/
│   └── auth/
│       ├── auth-complete.spec.ts      # 完整功能测试（80+用例）
│       ├── auth-data.spec.ts          # 数据验证测试（30+用例）
│       ├── auth-api.spec.ts           # API端点测试（20+用例）
│       └── auth-security.spec.ts      # 安全测试（40+用例）
├── src/
│   ├── pages/
│   │   └── LoginPage.ts               # 登录页面对象
│   ├── helpers/
│   │   └── auth-helpers.ts            # 认证辅助函数
│   └── data/
│       └── test-users.ts              # 测试用户数据
└── playwright.config.ts               # Playwright配置
```

## 测试用户凭据

| 角色 | 用户名 | 密码 | 说明 |
|------|--------|------|------|
| 管理员 | `admin` | `admin123` | 管理员模式登录 |
| 技术经理 | `tech_manager` | `123456` | 普通用户登录 |
| 部门经理 | `dept_manager` | `123456` | 普通用户登录 |
| 工程师 | `engineer` | `123456` | 普通用户登录 |

## 核心测试场景

### 1. 用户登录

```typescript
// 基本登录
await loginPage.login('tech_manager', '123456');
await expect(page).toHaveURL(/\/dashboard/);

// 带验证的登录
await loginPage.fillUsername('tech_manager');
await loginPage.fillPassword('123456');
await loginPage.clickLoginButton();
await expect(page).toHaveURL(/\/dashboard/);
```

### 2. 管理员登录

```typescript
// 切换到管理员模式
await loginPage.switchToAdminMode();
await loginPage.adminLogin('admin', 'admin123');
await expect(page).toHaveURL(/\/dashboard/);

// 验证管理员权限
const isAdmin = await page.evaluate(() =>
  localStorage.getItem('isAdmin') === 'true'
);
expect(isAdmin).toBe(true);
```

### 3. 密码可见性切换

```typescript
// 切换密码可见性
await loginPage.fillPassword('123456');
await loginPage.togglePasswordVisibility();

// 验证密码可见
const inputType = await loginPage.getPasswordInputType();
expect(inputType).toBe('text');

// 切换回隐藏
await loginPage.togglePasswordVisibility();
expect(await loginPage.getPasswordInputType()).toBe('password');
```

### 4. 错误处理

```typescript
// 测试错误凭据
await loginPage.fillUsername('wrong_user');
await loginPage.fillPassword('wrong_password');
await loginPage.clickLoginButton();

// 验证错误提示
await loginPage.expectLoginError();
const errorMsg = await loginPage.getErrorMessage();
expect(errorMsg).toContain('工号或密码错误');
```

### 5. 会话验证

```typescript
// 验证会话创建
await loginPage.login('tech_manager', '123456');
const sessionData = await getSessionData(page);
expect(sessionData).not.toBeNull();
expect(sessionData.username).toBe('tech_manager');

// 验证会话保持
await page.reload();
await expect(page).toHaveURL(/\/dashboard/);

// 模拟会话过期
await expireSession(page);
await page.reload();
await expect(page).toHaveURL(/\/$/);
```

### 6. 登出

```typescript
// 执行登出
await page.locator('button[aria-expanded]').click();
await page.locator('button:has-text("退出登录")').click();
await expect(page).toHaveURL(/\/$/);

// 验证会话清除
const sessionData = await getSessionData(page);
expect(sessionData).toBeNull();
```

## 选择器参考

### 登录表单元素

```typescript
// 用户登录模式
#username                      // 用户名输入框
#password                      // 密码输入框
#passwordToggle                // 密码可见性切换按钮
form button[type="submit"]     // 登录按钮

// 管理员登录模式
#adminUsername                 // 管理员账号输入框
#adminPassword                 // 管理员密码输入框
#adminPasswordToggle           // 管理员密码切换按钮
button:has-text("管理员登录")  // 切换到管理员模式
button:has-text("返回用户登录") // 返回用户模式

// 错误提示
div[role="alert"]              // 错误提示框

// 用户菜单
button[aria-expanded]          // 用户菜单按钮
button:has-text("退出登录")    // 退出登录按钮
```

## LocalStorage键

```typescript
'auth_session'                 // 会话数据
'currentUser'                  // 当前用户信息
'isAdmin'                      // 管理员标志
'app_users'                    // 用户列表
'active_session_${username}'    // 活动会话
```

## 常见测试模式

### 测试前准备

```typescript
test.beforeEach(async ({ page }) => {
  loginPage = new LoginPage(page);
  // 清除会话以确保测试隔离
  await page.evaluate(() => localStorage.clear());
  await loginPage.goto();
});
```

### 等待元素

```typescript
// 等待元素可见
await page.waitForSelector('#username', { state: 'visible' });

// 等待URL变化
await page.waitForURL('**/dashboard');

// 等待导航完成
await page.waitForLoadState('load');
```

### 验证状态

```typescript
// 验证URL
await expect(page).toHaveURL(/\/dashboard/);

// 验证元素可见
await expect(page.locator('#username')).toBeVisible();

// 验证元素值
await expect(page.locator('#username')).toHaveValue('tech_manager');

// 验证元素属性
await expect(page.locator('#password')).toHaveAttribute('type', 'password');
```

### 数据验证

```typescript
// 获取LocalStorage数据
const data = await page.evaluate(() => {
  return JSON.parse(localStorage.getItem('auth_session') || '{}');
});

// 验证数据结构
expect(data).toHaveProperty('sessionId');
expect(data).toHaveProperty('username');
```

## 调试技巧

### 截图

```typescript
// 失败时自动截图（在playwright.config.ts中配置）
// 手动截图
await page.screenshot({ path: 'debug.png' });
await loginPage.screenshot('login-state.png');
```

### 查看控制台日志

```typescript
// 监听控制台消息
page.on('console', msg => {
  console.log('Browser console:', msg.text());
});

// 监听网络请求
page.on('request', request => {
  console.log('Request:', request.url());
});
```

### 慢动作模式

```typescript
// 以慢动作模式运行
npx playwright test --slowmo=1000
```

### 等待和超时

```typescript
// 自定义超时
await page.waitForSelector('#element', { timeout: 30000 });

// 等待指定时间
await page.waitForTimeout(2000);
```

## 测试配置

### 超时设置

```typescript
// 在playwright.config.ts中配置
{
  timeout: 60 * 1000,              // 全局超时
  actionTimeout: 15000,            // 操作超时
  navigationTimeout: 60000         // 导航超时
}
```

### 浏览器配置

```typescript
// 支持的浏览器
projects: [
  { name: 'chrome', use: { channel: 'chrome' } },
  { name: 'edge', use: { channel: 'msedge' } }
]
```

## 故障排查

### 常见问题

1. **测试超时**
   - 检查网络连接
   - 确认后端服务运行
   - 增加超时时间

2. **元素未找到**
   - 确认选择器正确
   - 等待元素加载
   - 检查元素是否在iframe中

3. **登录失败**
   - 验证测试用户存在
   - 检查密码是否正确
   - 确认后端服务可用

4. **会话问题**
   - 清除浏览器缓存
   - 重启测试服务器
   - 检查LocalStorage

## 测试最佳实践

1. **测试隔离**: 每个测试前清除会话
2. **等待策略**: 使用明确的等待而非固定延迟
3. **选择器**: 使用稳定的、语义化的选择器
4. **断言**: 提供明确的断言消息
5. **清理**: 测试后清理创建的数据
6. **重试**: 配置适当的重试次数
7. **并行**: 利用并行测试提高速度

## 相关资源

- [Playwright文档](https://playwright.dev/)
- [项目README](Test/E2E_AutoTest/README.md)
- [测试配置](Test/E2E_AutoTest/playwright.config.ts)
- [完整测试报告](docs/reports/E2E_AUTH_TEST_REPORT.md)

---

**更新时间**: 2025-03-04
**版本**: 1.0.0
