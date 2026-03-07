# E2E 自动化测试

> 使用 Playwright 框架构建的端到端测试套件

## 📋 概述

这是企业级项目管理系统的 E2E 自动化测试项目，使用 Playwright 框架实现，支持多浏览器并行测试，覆盖认证、项目管理、任务管理等核心功能。

### 核心特性

- ✅ **纯 UI 测试** - 完全模拟真实用户操作
- ✅ **多浏览器支持** - Chrome 和 Edge 并行测试
- ✅ **页面对象模型** - 易于维护和扩展
- ✅ **并行执行** - 支持多线程并发测试
- ✅ **详细报告** - HTML、JSON、JUnit 多种报告格式
- ✅ **失败截图** - 自动截图辅助调试

### 测试覆盖

| 模块 | 测试场景 | 状态 |
|------|----------|------|
| 用户认证 | 登录、登出、会话管理 | ✅ |
| 项目管理 | 创建、编辑、删除项目 | ✅ |
| 任务管理 | 创建、编辑、状态更新 | ✅ |
| 权限控制 | 基于角色的访问控制 | ✅ |
| 冒烟测试 | 关键业务流程 | ✅ |

---

## 🚀 快速开始

### 前置要求

```bash
# 检查 Node.js 版本（需要 18+）
node --version

# 确保前端服务运行在 http://localhost:5173
cd ../../app
npm run dev
```

### 安装和运行

```bash
# 进入测试目录
cd Test/E2E_AutoTest

# 安装依赖
npm install

# 安装浏览器
npm run test:install

# 运行测试
npm test

# 查看报告
npm run test:report
```

---

## 📖 文档

- [测试指南](./docs/TEST_GUIDE.md) - 完整的测试使用指南
- [页面对象文档](./docs/PAGE_OBJECTS.md) - 页面对象模型说明
- [测试数据说明](./docs/TEST_DATA.md) - 测试数据管理

---

## 🧪 运行测试

### 基本命令

```bash
# 运行所有测试
npm test

# 运行特定文件
npm test login.spec.ts

# UI 模式（推荐用于调试）
npm run test:ui

# 调试模式
npm run test:debug

# 有头模式（显示浏览器）
npm run test:headed
```

### 单浏览器测试

```bash
# 仅 Chrome
npm run test:chrome

# 仅 Edge
npm run test:edge
```

### 并行控制

```bash
# 最大并行（8 workers）
npm run test:parallel

# 自定义 worker 数量
npm test -- --workers=4

# 禁用并行（调试）
npm test -- --workers=1
```

---

## 📊 测试账号

| 角色 | 用户名 | 密码 | 权限 |
|------|--------|------|------|
| 管理员 | `admin` | `admin123` | 全部权限 |
| 技术经理 | `tech_manager` | `123456` | 任务审批 |
| 部门经理 | `dept_manager` | `123456` | 项目管理 |
| 工程师 | `engineer` | `123456` | 个人任务 |

---

## 📁 项目结构

```
Test/E2E_AutoTest/
├── src/
│   ├── pages/          # 页面对象模型
│   │   ├── BasePage.ts
│   │   ├── LoginPage.ts
│   │   ├── DashboardPage.ts
│   │   ├── ProjectListPage.ts
│   │   ├── ProjectFormPage.ts
│   │   └── TaskManagementPage.ts
│   ├── components/     # UI 组件对象
│   │   ├── Sidebar.ts
│   │   ├── Header.ts
│   │   ├── Dialogs.ts
│   │   └── Forms.ts
│   ├── helpers/        # 辅助函数
│   │   ├── TestHelpers.ts
│   │   ├── auth-helpers.ts
│   │   ├── DataGenerator.ts
│   │   └── ScreenshotHelpers.ts
│   ├── fixtures/       # 测试夹具
│   │   ├── test-fixtures.ts
│   │   ├── global-setup.ts
│   │   └── global-teardown.ts
│   ├── data/          # 测试数据
│   │   ├── test-users.ts
│   │   ├── test-projects.ts
│   │   └── test-tasks.ts
│   └── types/         # 类型定义
│       ├── test-types.ts
│       └── page-types.ts
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

## 🔧 配置

### Playwright 配置

`playwright.config.ts` 包含以下关键配置：

- **测试文件位置**: `./tests`
- **并行 worker 数量**: 4
- **多浏览器项目**: Chrome 和 Edge
- **报告格式**: HTML + JSON + JUnit
- **失败重试**: CI 环境 2 次，本地 1 次
- **超时设置**: 操作 10s，导航 30s

### 环境变量

编辑 `.env` 文件自定义配置：

```env
BASE_URL=http://localhost:5173
TEST_DEFAULT_TIMEOUT=10000
TEST_NAVIGATION_TIMEOUT=30000
```

---

## 🛠️ 开发指南

### 添加新测试

1. 在 `tests/` 相应目录下创建测试文件
2. 使用页面对象封装页面操作
3. 确保测试数据唯一（使用时间戳）
4. 添加适当的断言

示例：

```typescript
import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';

test('新功能测试', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('username', 'password');

  // 测试逻辑
  await expect(page).toHaveURL(/\/dashboard/);
});
```

### 添加页面对象

1. 在 `src/pages/` 创建新文件
2. 继承 `BasePage`
3. 定义元素选择器
4. 实现页面操作方法

---

## 📈 CI/CD 集成

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
          node-version: 18
      - name: Install dependencies
        run: npm ci
        working-directory: ./Test/E2E_AutoTest
      - name: Install Playwright
        run: npx playwright install --with-deps
        working-directory: ./Test/E2E_AutoTest
      - name: Run tests
        run: npm test
        working-directory: ./Test/E2E_AutoTest
      - name: Upload report
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: Test/E2E_AutoTest/reports/html-report/
```

---

## ❓ 常见问题

### 浏览器未安装

```bash
npm run test:install
```

### 连接被拒绝

确保前端服务运行在 `http://localhost:5173`

### 元素未找到

1. 检查选择器是否正确
2. 增加等待时间
3. 使用 UI 模式调试

---

## 📄 许可证

MIT

---

## 🔗 相关链接

- [Playwright 官方文档](https://playwright.dev/docs/intro)
- [项目主 README](../../../README.md)
- [开发规范](../../../CLAUDE.md)
