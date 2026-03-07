# E2E 测试指南

## 📋 目录

- [快速开始](#快速开始)
- [环境准备](#环境准备)
- [安装步骤](#安装步骤)
- [运行测试](#运行测试)
- [查看报告](#查看报告)
- [常见问题](#常见问题)
- [最佳实践](#最佳实践)

---

## 🚀 快速开始

### 前置要求

- Node.js 18+ 已安装
- Chrome 和 Edge 浏览器已安装
- 前端开发服务器运行在 `http://localhost:5173`

### 五步快速开始

```bash
# 1. 进入测试目录
cd Test/E2E_AutoTest

# 2. 安装依赖
npm install

# 3. 安装浏览器
npm run test:install

# 4. 运行测试
npm test

# 5. 查看报告
npm run test:report
```

---

## 🔧 环境准备

### 1. 确保前端服务运行

```bash
# 在项目根目录
cd app
npm run dev
```

前端应该运行在 `http://localhost:5173`

### 2. 验证测试账号

系统默认提供以下测试账号（密码已在系统中预设）：

| 角色 | 用户名 | 密码 | 权限 |
|------|--------|------|------|
| 管理员 | admin | admin123 | 全部权限 |
| 技术经理 | tech_manager | 123456 | 任务审批 |
| 部门经理 | dept_manager | 123456 | 项目管理 |
| 工程师 | engineer | 123456 | 查看个人任务 |

### 3. 配置环境变量（可选）

编辑 `.env` 文件自定义配置：

```env
BASE_URL=http://localhost:5173
TEST_DEFAULT_TIMEOUT=10000
TEST_NAVIGATION_TIMEOUT=30000
```

---

## 📦 安装步骤

### 安装依赖

```bash
cd Test/E2E_AutoTest
npm install
```

### 安装 Playwright 浏览器

```bash
# 安装 Chrome 和 Edge
npm run test:install

# 或使用 Playwright 命令
npx playwright install --with-deps chrome msedge
```

### 验证安装

```bash
# 检查 Playwright 版本
npx playwright --version

# 列出已安装的浏览器
npx playwright install --help
```

---

## 🏃 运行测试

### 基本命令

```bash
# 运行所有测试
npm test

# 运行特定测试文件
npm test login.spec.ts

# 运行特定测试套件
npm test -- --grep "认证"
npm test -- --grep "项目管理"
```

### 调试模式

```bash
# UI 模式（推荐）
npm run test:ui

# 调试模式（带断点）
npm run test:debug

# 有头模式（可以看到浏览器）
npm run test:headed
```

### 单浏览器测试

```bash
# 只在 Chrome 上运行
npm run test:chrome

# 只在 Edge 上运行
npm run test:edge
```

### 并行测试

```bash
# 最大并行（8 workers）
npm run test:parallel

# 自定义 worker 数量
npm test -- --workers=6

# 禁用并行（调试用）
npm test -- --workers=1
```

### 运行特定项目

```bash
# 只运行认证测试
npm test tests/auth/

# 只运行冒烟测试
npm test tests/smoke/
```

---

## 📊 查看报告

### HTML 报告

```bash
# 自动打开报告
npm run test:report

# 或手动打开
start reports/html-report/index.html  # Windows
open reports/html-report/index.html   # macOS
xdg-open reports/html-report/index.html # Linux
```

### JSON 报告

```bash
# 查看测试结果
cat reports/test-results.json
```

### JUnit 报告

```bash
# 用于 CI/CD 集成
cat reports/junit-results.xml
```

### 失败截图

```bash
# 查看失败测试的截图
ls reports/screenshots/
```

---

## ❓ 常见问题

### Q1: 浏览器未安装错误

**问题：** `Executable doesn't exist at ...`

**解决方案：**
```bash
npm run test:install
```

### Q2: 连接被拒绝

**问题：** `Failed to launch, connect to localhost:5173`

**解决方案：**
1. 确保前端开发服务器正在运行
2. 检查 `.env` 中的 `BASE_URL` 配置
3. 验证端口是否正确

### Q3: 元素未找到

**问题：** `Timeout waiting for selector ...`

**解决方案：**
1. 增加超时时间：修改 `playwright.config.ts`
2. 检查选择器是否正确
3. 使用 UI 模式查看页面状态

### Q4: 测试账号无法登录

**问题：** 登录测试失败

**解决方案：**
1. 验证测试账号在系统中存在
2. 检查密码是否正确（参考测试账号表）
3. 确认前端登录功能正常

### Q5: 并行测试数据冲突

**问题：** 并行测试时数据互相干扰

**解决方案：**
1. 使用时间戳生成唯一数据
2. 减少并行 worker 数量
3. 在测试前后清理数据

---

## 🎯 最佳实践

### 1. 编写稳定的选择器

```typescript
// ✅ 好：使用稳定的属性
page.locator('#username')
page.locator('button:has-text("登录")')

// ❌ 差：使用易变的 CSS 类
page.locator('.bg-blue-500')
```

### 2. 等待策略

```typescript
// ✅ 好：使用自动等待
await expect(page.locator('#username')).toBeVisible();

// ❌ 差：使用固定等待
await page.waitForTimeout(3000);
```

### 3. 数据隔离

```typescript
// ✅ 好：使用唯一数据
const projectName = `测试项目_${Date.now()}`;

// ❌ 差：使用固定数据
const projectName = '测试项目';
```

### 4. 测试清理

```typescript
test.afterEach(async ({ page }) => {
  // 清理测试数据
  await cleanupTestData(page);
});
```

### 5. 使用页面对象

```typescript
// ✅ 好：封装在页面对象中
const loginPage = new LoginPage(page);
await loginPage.login('username', 'password');

// ❌ 差：直接操作元素
await page.locator('#username').fill('username');
await page.locator('#password').fill('password');
await page.locator('button').click();
```

---

## 📁 项目结构

```
Test/E2E_AutoTest/
├── src/
│   ├── pages/          # 页面对象模型
│   ├── components/     # UI 组件对象
│   ├── helpers/        # 辅助函数
│   ├── fixtures/       # 测试夹具
│   ├── data/          # 测试数据
│   └── types/         # 类型定义
├── tests/             # 测试用例
│   ├── auth/          # 认证测试
│   ├── projects/      # 项目管理测试
│   ├── tasks/         # 任务管理测试
│   ├── permissions/   # 权限测试
│   └── smoke/         # 冒烟测试
├── docs/              # 文档
├── reports/           # 测试报告（自动生成）
├── playwright.config.ts
├── package.json
├── tsconfig.json
└── .env
```

---

## 🔗 相关文档

- [Playwright 官方文档](https://playwright.dev/docs/intro)
- [页面对象文档](./PAGE_OBJECTS.md)
- [测试数据说明](./TEST_DATA.md)
- [项目 README](../../../README.md)
