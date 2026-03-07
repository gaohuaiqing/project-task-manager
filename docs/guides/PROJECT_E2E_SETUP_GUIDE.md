# 项目管理 E2E 测试配置指南

> **详细的环境配置、依赖安装和测试执行说明**

---

## 📋 目录

1. [环境要求](#环境要求)
2. [安装步骤](#安装步骤)
3. [配置说明](#配置说明)
4. [执行测试](#执行测试)
5. [故障排查](#故障排查)
6. [最佳实践](#最佳实践)

---

## 环境要求

### 系统要求

- **操作系统**: Windows 10+, macOS 10.15+, Linux
- **Node.js**: v18.0.0 或更高版本
- **npm**: v9.0.0 或更高版本
- **内存**: 至少 4GB RAM
- **磁盘**: 至少 2GB 可用空间

### 浏览器要求

- **Google Chrome**: 最新版本
- **Microsoft Edge**: 最新版本
- **其他**: Chromium 系浏览器

---

## 安装步骤

### 1. 安装 Node.js 依赖

```bash
# 进入测试目录
cd Test/E2E_AutoTest

# 安装依赖
npm install
```

**预期输出**:
```
added 200+ packages, and audited 201 packages in 30s
found 0 vulnerabilities
```

### 2. 安装 Playwright 浏览器

```bash
# 安装 Chromium 浏览器
npx playwright install chromium

# 安装 Chrome 和 Edge（推荐）
npx playwright install --with-deps chrome msedge
```

**预期输出**:
```
Chromium 123.0.6312.0 downloaded to /path/to/cache
Chrome 123.0.6312.0 downloaded to /path/to/cache
msedge 123.0.6312.0 downloaded to /path/to/cache
```

### 3. 验证安装

```bash
# 运行验证命令
npx playwright --version

# 应显示: 1.50.0 或更高版本
```

---

## 配置说明

### Playwright 配置文件

位置: `Test/E2E_AutoTest/playwright.config.ts`

**关键配置项**:

```typescript
{
  // 测试文件位置
  testDir: './tests',

  // 完全并行运行
  fullyParallel: true,

  // 失败重试次数
  retries: process.env.CI ? 2 : 1,

  // 并发worker数量
  workers: 4,

  // 全局超时
  timeout: 60 * 1000,

  // 基础URL
  baseURL: 'http://localhost:5173',

  // 报告配置
  reporter: [
    ['html', { outputFolder: 'reports/html-report' }],
    ['json', { outputFile: 'reports/test-results.json' }],
    ['junit', { outputFile: 'reports/junit-results.xml' }]
  ]
}
```

### TypeScript 配置

位置: `Test/E2E_AutoTest/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "types": ["node", "@playwright/test"]
  }
}
```

---

## 执行测试

### 启动应用

**重要**: 在运行测试前，必须先启动应用。

```bash
# 在项目根目录
cd app

# 启动开发服务器
npm run dev

# 确保运行在 localhost:5173
```

**预期输出**:
```
  VITE v5.0.0  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### 运行测试

#### 基础命令

```bash
# 运行所有项目管理测试
npm run test -- tests/projects

# 运行特定测试文件
npm run test -- tests/projects/project-list.spec.ts

# 运行特定测试用例
npm run test -- tests/projects/project-list.spec.ts -g "应该能够搜索项目"
```

#### 调试命令

```bash
# UI模式（推荐用于调试）
npm run test:ui -- tests/projects

# 调试模式（逐步执行）
npm run test:debug -- tests/projects/project-form.spec.ts

# 有头模式（显示浏览器）
npm run test:headed -- tests/projects
```

#### 浏览器特定命令

```bash
# 仅Chrome
npm run test:chrome -- tests/projects

# 仅Edge
npm run test:edge -- tests/projects

# Chrome和Edge同时运行
npm run test:both -- tests/projects
```

#### 性能命令

```bash
# 并行执行（8个worker）
npm run test:parallel -- tests/projects

# 查看测试报告
npm run test:report
```

---

## 故障排查

### 常见问题

#### 1. "Browser not found" 错误

**问题**:
```
Error: Executable doesn't exist at /path/to/chrome
```

**解决方案**:
```bash
# 重新安装浏览器
npx playwright install --with-deps chrome msedge
```

#### 2. "Connect ECONNREFUSED" 错误

**问题**:
```
Error: connect ECONNREFUSED 127.0.0.1:5173
```

**解决方案**:
```bash
# 确保应用正在运行
cd app
npm run dev

# 或修改配置中的 baseURL
```

#### 3. 测试超时

**问题**:
```
Error: Test timeout of 60000ms exceeded
```

**解决方案**:
```typescript
// 在测试中增加超时时间
test.setTimeout(120000);

// 或在 playwright.config.ts 中增加
timeout: 120 * 1000
```

#### 4. 元素找不到

**问题**:
```
Error: locator.click: Target closed
```

**解决方案**:
```typescript
// 增加等待时间
await waitForVisible(page, selector, 30000);

// 或使用更精确的选择器
page.locator('[data-testid="submit-button"]')
```

#### 5. 测试数据冲突

**问题**: 测试失败，提示数据已存在

**解决方案**:
```typescript
// 使用唯一数据
const timestamp = Date.now();
const projectName = `测试项目_${timestamp}_${Math.random()}`;
```

### 调试技巧

#### 1. 使用截图

```typescript
// 失败时自动截图
test('示例测试', async ({ page }) => {
  await page.screenshot({ path: 'debug.png' });
});
```

#### 2. 使用日志

```typescript
// 输出调试信息
console.log('项目名称:', projectName);

// 或使用 page.pause()
await page.pause();
```

#### 3. 使用 Playwright Inspector

```bash
# 启动 Inspector
npx playwright codegen http://localhost:5173

# 选择元素并生成代码
```

---

## 最佳实践

### 1. 测试组织

```typescript
// ✅ 好的组织
test.describe('项目创建', () => {
  test.beforeEach(async ({ page }) => {
    // 每个测试前的准备
  });

  test('应该创建产品开发类项目', async ({ page }) => {
    // 测试代码
  });

  test('应该创建职能管理类项目', async ({ page }) => {
    // 测试代码
  });

  test.afterEach(async ({ page }) => {
    // 每个测试后的清理
  });
});
```

### 2. 选择器使用

```typescript
// ✅ 推荐使用
page.locator('[data-testid="submit-button"]')
page.locator('button:has-text("提交")')
page.locator('#project-name')

// ❌ 避免使用
page.locator('.css-123456')
page.locator('div > div > button')
page.locator('button').nth(5)
```

### 3. 等待策略

```typescript
// ✅ 智能等待
await waitForVisible(page, selector);
await waitForDialog(page);
await page.waitForURL(/\/projects/);

// ❌ 固定延迟
await page.waitForTimeout(5000);
```

### 4. 数据管理

```typescript
// ✅ 使用唯一数据
const timestamp = Date.now();
const data = {
  name: `测试项目_${timestamp}`,
  code: `TEST-${timestamp}`
};

// ✅ 清理测试数据
test.afterEach(async () => {
  await cleanupTestData();
});
```

### 5. 错误处理

```typescript
// ✅ 柔性断言
const isVisible = await element.isVisible().catch(() => false);
if (isVisible) {
  await expect(element).toBeVisible();
}

// ✅ 多次尝试
await retry(async () => {
  await element.click();
}, 3);
```

---

## CI/CD 集成

### GitHub Actions 示例

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd Test/E2E_AutoTest
          npm install

      - name: Install Playwright browsers
        run: |
          cd Test/E2E_AutoTest
          npx playwright install --with-deps

      - name: Start application
        run: |
          cd app
          npm run dev &
          npx wait-on http://localhost:5173

      - name: Run tests
        run: |
          cd Test/E2E_AutoTest
          npm run test -- tests/projects

      - name: Upload test report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-report
          path: Test/E2E_AutoTest/reports/html-report/
```

---

## 性能优化

### 1. 并行执行

```typescript
// playwright.config.ts
export default defineConfig({
  workers: process.env.CI ? 4 : 8, // CI环境使用4个，本地使用8个
});
```

### 2. 测试分组

```bash
# 只运行冒烟测试
npm run test -- tests/projects --grep "@smoke"

# 只运行特定功能的测试
npm.run test -- tests/projects --grep "项目创建"
```

### 3. 减少视频录制

```typescript
// playwright.config.ts
use: {
  video: 'retain-on-failure', // 只在失败时保留
}
```

---

## 附录

### A. 环境变量

创建 `.env` 文件:

```bash
# 应用配置
BASE_URL=http://localhost:5173

# 测试配置
TEST_TIMEOUT=60000
TEST_RETRIES=1

# 测试用户
TEST_ADMIN_USERNAME=admin
TEST_ADMIN_PASSWORD=admin123
```

### B. 测试命令速查

```bash
# 安装
npm install
npx playwright install --with-deps chrome msedge

# 运行
npm run test -- tests/projects
npm run test:ui -- tests/projects
npm run test:debug -- tests/projects

# 报告
npm run test:report

# 清理
rm -rf Test/E2E_AutoTest/reports/
```

### C. 有用资源

- [Playwright 文档](https://playwright.dev/)
- [测试最佳实践](https://playwright.dev/docs/best-practices)
- [调试指南](https://playwright.dev/docs/debug)
- [CI/CD 配置](https://playwright.dev/docs/ci)

---

**文档版本**: 1.0.0
**最后更新**: 2025-03-04
