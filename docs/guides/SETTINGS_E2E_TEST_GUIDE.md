# 设置管理模块 E2E 测试执行指南

> 本指南提供设置管理模块E2E测试的详细执行说明、故障排查和最佳实践。

---

## 📋 目录

1. [环境准备](#环境准备)
2. [测试执行](#测试执行)
3. [测试结果解读](#测试结果解读)
4. [故障排查](#故障排查)
5. [测试维护](#测试维护)

---

## 🔧 环境准备

### 前置条件

确保以下环境已准备就绪：

```bash
# 1. Node.js 环境（v18+）
node --version

# 2. 后端服务运行中（端口 3001）
curl http://localhost:3001/api/health

# 3. 前端应用运行中（默认端口）
# 或使用构建后的版本

# 4. 测试依赖已安装
cd Test/E2E_AutoTest
npm install
```

### 测试环境配置

```bash
# Playwright 配置文件
 playwright.config.ts

# 环境变量（可选）
 .env.test
```

---

## 🚀 测试执行

### 快速开始

```bash
# 1. 进入测试目录
cd Test/E2E_AutoTest

# 2. 运行所有设置模块测试
npx playwright test tests/settings/

# 3. 查看测试报告
npx playwright show-report
```

### 分模块执行

#### 导航和标签切换测试

```bash
# 测试设置页面导航功能
npx playwright test tests/settings/settings-navigation.spec.ts

# 验证内容：
# ✅ 设置页面加载
# ✅ 标签页显示和切换
# ✅ URL参数同步
# ✅ 权限控制
```

#### 个人信息设置测试

```bash
# 测试个人信息管理
npx playwright test tests/settings/settings-profile.spec.ts

# 验证内容：
# ✅ 用户信息显示
# ✅ 姓名编辑
# ✅ 密码修改流程
# ✅ 表单验证
```

#### 项目类型管理测试

```bash
# 测试项目类型CRUD
npx playwright test tests/settings/settings-project-types.spec.ts

# 验证内容：
# ✅ 项目类型列表
# ✅ 创建新类型
# ✅ 编辑类型
# ✅ 删除类型
# ✅ 表单验证
```

#### 任务类型管理测试

```bash
# 测试任务类型管理
npx playwright test tests/settings/settings-task-types.spec.ts

# 验证内容：
# ✅ 任务类型列表
# ✅ 添加任务类型
# ✅ 删除任务类型
# ✅ 颜色选择
```

#### 节假日管理测试

```bash
# 测试节假日功能
npx playwright test tests/settings/settings-holidays.spec.ts

# 验证内容：
# ✅ 节假日列表
# ✅ 添加节假日
# ✅ 编辑和删除
# ✅ 搜索筛选
# ✅ 导入导出
```

#### 权限管理测试

```bash
# 测试权限配置
npx playwright test tests/settings/settings-permissions.spec.ts

# 验证内容：
# ✅ 权限配置界面
# ✅ 角色切换
# ✅ 权限开关
# ✅ 批量设置
# ✅ 保存配置
```

#### 系统日志测试

```bash
# 测试日志查看
npx playwright test tests/settings/settings-system-logs.spec.ts

# 验证内容：
# ✅ 日志列表
# ✅ 日志筛选
# ✅ 日志搜索
# ✅ 导出清空
```

#### 冒烟测试

```bash
# 运行冒烟测试
npx playwright test tests/settings/settings-smoke.spec.ts

# 验证内容：
# ✅ 核心功能快速验证
# ✅ 关键路径测试
# ✅ 权限控制验证
```

### 调试模式

```bash
# 显示浏览器窗口
npx playwright test tests/settings/ --headed

# 调试模式（逐步执行）
npx playwright test tests/settings/ --debug

# 单个文件调试
npx playwright test tests/settings/settings-profile.spec.ts --debug

# 保留浏览器窗口（用于手动检查）
npx playwright test tests/settings/ --headed --project=chromium
```

### 不同浏览器执行

```bash
# Chrome/Chromium
npx playwright test tests/settings/ --project=chromium

# Firefox
npx playwright test tests/settings/ --project=firefox

# WebKit（Safari）
npx playwright test tests/settings/ --project=webkit

# 所有浏览器
npx playwright test tests/settings/ --project=all
```

### 并行执行

```bash
# 默认并行执行
npx playwright test tests/settings/

# 指定并行度
npx playwright test tests/settings/ --workers=4

# 串行执行（避免数据冲突）
npx playwright test tests/settings/ --workers=1
```

---

## 📊 测试结果解读

### 命令行输出

```
Running 8 tests using 4 workers

✓ settings-navigation.spec.ts:14:3 › should display all settings tabs (admin)
✓ settings-profile.spec.ts:13:3 › should display user basic information
✓ settings-project-types.spec.ts:14:3 › should display project type list
✗ settings-task-types.spec.ts:13:3 › should display task type list

  8 passed (15.3s)
  1 failed
  87 skipped
```

### HTML 报告

```bash
# 生成并查看HTML报告
npx playwright test tests/settings/ --reporter=html
npx playwright show-report

# 报告包含：
# - 测试执行时间
# - 失败截图
# - 视频录制
# - 详细错误信息
# - 网络请求日志
```

### JSON 报告

```bash
# 生成JSON报告（用于CI/CD集成）
npx playwright test tests/settings/ --reporter=json > test-results.json
```

---

## 🔍 故障排查

### 常见问题

#### 1. 后端连接失败

**症状**: 测试失败，显示连接错误

**解决方案**:
```bash
# 检查后端服务状态
curl http://localhost:3001/api/health

# 启动后端服务
cd app/server
npm start

# 或使用PM2
pm2 restart backend
```

#### 2. 元素找不到

**症状**: `TimeoutError: locator.click: Timeout 30000ms exceeded`

**解决方案**:
```bash
# 1. 检查页面URL是否正确
# 2. 增加等待时间
await page.waitForTimeout(2000)

# 3. 使用更宽松的选择器
# 4. 检查元素是否在iframe中
```

#### 3. 登录失败

**症状**: 无法登录或登录后跳转错误

**解决方案**:
```bash
# 1. 验证测试用户账号
# 2. 检查AuthContext配置
# 3. 确认后端认证接口正常
# 4. 清除浏览器状态
await page.context().clearCookies()
```

#### 4. 权限测试失败

**症状**: 权限验证与预期不符

**解决方案**:
```bash
# 1. 检查Sidebar.constants.ts中的权限配置
# 2. 验证角色定义（types/auth.ts）
# 3. 确认PermissionAlert组件正确显示
# 4. 使用调试模式查看实际UI
```

#### 5. 数据冲突

**症状**: 测试相互影响，运行顺序不同结果不同

**解决方案**:
```bash
# 1. 使用串行执行
npx playwright test tests/settings/ --workers=1

# 2. 添加数据清理逻辑
afterEach(async ({ page }) => {
  await cleanupTestData()
})

# 3. 使用时间戳生成唯一数据
const uniqueName = `test_${Date.now()}`
```

---

## 📈 测试维护

### 添加新测试用例

```typescript
// 1. 在对应的测试文件中添加测试
test.describe('新功能测试', () => {
  test('应该能够XXX', async ({ page }) => {
    // 测试逻辑
  });
});

// 2. 运行新测试
npx playwright test tests/settings/your-test.spec.ts -g "应该能够XXX"
```

### 更新页面对象

```typescript
// 1. 在 SettingsPage.ts 中添加新定位器
readonly newFeatureButton: Locator;

// 2. 在构造函数中初始化
this.newFeatureButton = page.locator('[data-testid="new-feature"]');

// 3. 添加操作方法
async clickNewFeature(): Promise<void> {
  await this.newFeatureButton.click();
}
```

### 测试数据管理

```typescript
// 1. 使用测试数据文件
import { getTestUser } from '../data/test-users';
const user = getTestUser('admin');

// 2. 生成唯一数据
const uniqueId = Date.now().toString(36);
const testName = `测试_${uniqueId}`;

// 3. 清理测试数据
afterAll(async () => {
  await cleanupTestData();
});
```

### 持续集成配置

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - name: Install dependencies
        run: npm ci
        working-directory: ./Test/E2E_AutoTest
      - name: Install Playwright
        run: npx playwright install --with-deps
        working-directory: ./Test/E2E_AutoTest
      - name: Run tests
        run: npx playwright test tests/settings/
        working-directory: ./Test/E2E_AutoTest
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: Test/E2E_AutoTest/playwright-report/
```

---

## 🎯 最佳实践

### 1. 测试编写原则

```typescript
// ✅ 好的实践
test('应该能够添加任务类型', async ({ page }) => {
  const settingsPage = new SettingsPage(page);
  await settingsPage.goToTaskTypes();

  const typeName = `测试_${Date.now()}`;
  await settingsPage.addTaskType(typeName);

  await expect(page.locator(`text=/${typeName}/`)).toBeVisible();
});

// ❌ 避免的实践
test('添加任务类型测试', async ({ page }) => {
  // 硬编码选择器，缺少封装
  await page.click('.task-type-input');
  await page.fill('.task-type-input', '测试');
  // 没有验证
});
```

### 2. 等待策略

```typescript
// ✅ 使用明确的等待
await page.waitForURL('**/settings');
await element.waitFor({ state: 'visible' });
await page.waitForSelector('[data-testid="saved"]');

// ⚠️ 谨慎使用固定等待
await page.waitForTimeout(1000); // 仅在必要时使用
```

### 3. 选择器策略

```typescript
// 优先级：
// 1. data-testid（最稳定）
await page.click('[data-testid="save-button"]');

// 2. aria-label（可访问性）
await page.click('button[aria-label="保存"]');

// 3. 文本内容（次稳定）
await page.click('button:has-text("保存")');

// 4. CSS类（最不稳定，尽量避免）
await page.click('.btn.btn-primary');
```

### 4. 测试隔离

```typescript
// 每个测试独立的设置
test.beforeEach(async ({ page }) => {
  await login(page, 'admin');
  await page.goto('/settings');
});

test.afterEach(async ({ page }) => {
  await logout(page);
});
```

---

## 📚 相关文档

- [Playwright官方文档](https://playwright.dev/)
- [测试报告](./SETTINGS_E2E_TEST_REPORT.md)
- [AI快速参考](./AI_QUICK_REFERENCE.md)
- [项目README](../../README.md)

---

**文档版本**: 1.0
**最后更新**: 2026-03-04
