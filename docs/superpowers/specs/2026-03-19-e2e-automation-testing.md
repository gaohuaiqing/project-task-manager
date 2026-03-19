# E2E 自动化联调测试设计

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan.

**Goal:** 建立完整的 E2E 自动化测试体系，验证前后端集成是否正确，测试代码完全独立于功能代码。

**Architecture:** 使用 Playwright 作为测试框架，测试代码放在独立目录 `Test/E2E_AutoTest/`，测试完成后生成问题报告，逐个确认后修复。

**Tech Stack:** Playwright + TypeScript

---

## 约束条件

1. **测试代码独立** - 不修改任何功能代码
2. **问题汇总报告** - 测试完成后统一输出问题列表
3. **确认后修复** - 每个问题需用户确认后再修复

---

## 目录结构

```
Test/E2E_AutoTest/
├── playwright.config.ts        # Playwright 配置
├── package.json                # 测试依赖（独立于主项目）
├── tsconfig.json               # TypeScript 配置
├── tests/
│   ├── setup/
│   │   └── auth.setup.ts       # 登录状态设置
│   ├── auth.spec.ts            # 认证流程测试
│   ├── projects.spec.ts        # 项目管理测试
│   ├── tasks.spec.ts           # 任务管理测试
│   ├── assignment.spec.ts      # 智能分配测试
│   └── api/
│       ├── auth.api.spec.ts    # 认证 API 测试
│       ├── project.api.spec.ts # 项目 API 测试
│       └── task.api.spec.ts    # 任务 API 测试
├── fixtures/
│   ├── test-data.ts            # 测试数据工厂
│   └── selectors/              # 页面选择器定义
├── utils/
│   ├── api-helper.ts           # API 请求辅助
│   └── db-helper.ts            # 数据库清理辅助
└── reports/                    # 测试报告输出（.gitignore）
```

---

## Playwright 配置

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // 串行执行，避免数据冲突
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // 单 worker，避免并发问题
  reporter: [
    ['html', { outputFolder: 'reports/html' }],
    ['json', { outputFile: 'reports/results.json' }],
    ['list']
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],
  webServer: [
    {
      command: 'cd ../../app && npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: 'cd ../../app/server && npm run dev',
      url: 'http://localhost:3001/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],
});
```

---

## 测试用例设计

### 1. 认证模块 (auth.spec.ts)

| 用例 | 描述 | 验证点 |
|------|------|--------|
| 登录成功 | 使用正确凭据登录 | 跳转到仪表板 |
| 登录失败 | 使用错误密码 | 显示错误提示 |
| 登出 | 点击登出按钮 | 跳转到登录页 |
| 未认证访问 | 未登录访问受保护页面 | 重定向到登录页 |

### 2. 项目管理模块 (projects.spec.ts)

| 用例 | 描述 | 验证点 |
|------|------|--------|
| 项目列表 | 访问项目页面 | 显示项目列表 |
| 创建项目 | 填写表单创建项目 | 项目出现在列表中 |
| 编辑项目 | 修改项目信息 | 信息更新成功 |
| 删除项目 | 删除项目 | 项目从列表消失 |
| 项目详情 | 点击项目卡片 | 显示项目详情页 |

### 3. 任务管理模块 (tasks.spec.ts)

| 用例 | 描述 | 验证点 |
|------|------|--------|
| 任务列表 | 访问任务页面 | 显示任务 WBS 树 |
| 创建任务 | 创建新任务 | 任务出现在列表中 |
| 创建子任务 | 在任务下创建子任务 | 形成层级结构 |
| 更新状态 | 更改任务状态 | 状态更新成功 |
| 任务分配 | 分配任务给成员 | 负责人更新 |

### 4. 智能分配模块 (assignment.spec.ts)

| 用例 | 描述 | 验证点 |
|------|------|--------|
| 页面加载 | 访问智能分配页面 | 显示成员能力矩阵 |
| 能力筛选 | 按技能类型筛选成员 | 显示符合条件的成员 |
| 负载查看 | 查看成员当前负载 | 显示任务数量和工时 |
| 分配建议 | 选择任务查看分配建议 | 显示推荐人员列表 |

### 5. 错误处理测试 (error-handling.spec.ts)

| 用例 | 描述 | 验证点 |
|------|------|--------|
| 网络断开 | 模拟网络断开 | 显示离线提示 |
| 表单验证 | 提交空表单 | 显示字段错误提示 |
| 权限不足 | 普通用户访问管理页面 | 显示权限拒绝提示 |
| API 超时 | 模拟 API 超时 | 显示加载超时提示 |

### 6. API 集成测试 (api/*.spec.ts)

| 用例 | 描述 | 验证点 |
|------|------|--------|
| API 响应格式 | 验证 API 返回格式 | 符合 TypeScript 接口 |
| 错误处理 | 触发错误场景 | 返回正确的错误码和消息 |
| 分页功能 | 请求分页数据 | 返回正确的分页信息 |

---

## 测试数据策略

```typescript
// fixtures/test-data.ts
export const testUser = {
  username: 'test_admin',
  password: 'Test@123456',
};

export const testProject = {
  name: 'E2E 测试项目',
  code: 'E2E-TEST',
  projectType: 'product_development',
  description: '自动化测试创建的项目',
};

export const testTask = {
  name: 'E2E 测试任务',
  taskType: 'frontend',
  priority: 'medium',
};
```

---

## 问题报告格式

测试完成后生成报告：

```markdown
# E2E 测试问题报告

**测试时间**: 2026-03-19 10:30:00
**测试环境**: Chromium
**通过/失败**: 15/3

---

## 问题列表

### 问题 1: 登录失败后错误提示未显示
- **严重程度**: High
- **测试用例**: auth.spec.ts:登录失败
- **预期**: 显示 "用户名或密码错误"
- **实际**: 无任何提示
- **截图**: reports/screenshots/auth-failure.png

### 问题 2: 创建项目后未刷新列表
- **严重程度**: Medium
- **测试用例**: projects.spec.ts:创建项目
- **预期**: 新项目出现在列表顶部
- **实际**: 需要手动刷新页面
- **截图**: reports/screenshots/project-create.png

### 问题 3: 任务状态更新 API 返回 500
- **严重程度**: Critical
- **测试用例**: api/task.api.spec.ts:更新状态
- **预期**: 返回 200 和更新后的任务
- **实际**: 返回 500 Internal Server Error
- **响应**: { "code": "INTERNAL_ERROR", "message": "Database connection failed" }
```

---

## 工作流程

```
┌─────────────────────────────────────────────────────────────┐
│                      E2E 自动化联调流程                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. 安装测试依赖                                            │
│     cd Test/E2E_AutoTest && npm install                    │
│                          ↓                                  │
│  2. 启动服务                                                │
│     Playwright 自动启动前后端服务                           │
│                          ↓                                  │
│  3. 执行测试                                                │
│     npx playwright test                                     │
│                          ↓                                  │
│  4. 生成报告                                                │
│     reports/results.json + reports/html/                   │
│                          ↓                                  │
│  5. 解析问题                                                │
│     提取失败用例，生成问题列表                              │
│                          ↓                                  │
│  6. 逐个确认                                                │
│     For each issue:                                         │
│       - 展示问题详情                                        │
│       - 用户确认是否修复                                    │
│       - 修复并验证                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 依赖安装

```json
// Test/E2E_AutoTest/package.json
{
  "name": "e2e-autotest",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "test": "playwright test",
    "test:ui": "playwright test --ui",
    "test:debug": "playwright test --debug",
    "report": "playwright show-report",
    "install-browsers": "playwright install chromium"
  },
  "devDependencies": {
    "@playwright/test": "^1.42.0",
    "@types/node": "^20.11.0",
    "typescript": "^5.3.0"
  }
}
```

---

## 执行命令

```bash
# 首次安装
cd Test/E2E_AutoTest
npm install
npx playwright install chromium

# 运行测试
npm run test

# 查看报告
npm run report
```

---

## 注意事项

1. **数据隔离**: 测试使用独立的测试账号和数据，不影响生产数据
2. **清理策略**: 每次测试前清理测试数据，确保测试可重复
3. **超时设置**: API 测试超时 10s，页面操作超时 30s
4. **并发控制**: 单 worker 执行，避免数据竞争

---

## 页面选择器定义

按页面组织选择器文件，便于维护和复用：

```
fixtures/selectors/
├── auth.selectors.ts
├── project.selectors.ts
├── task.selectors.ts
└── common.selectors.ts
```

```typescript
// fixtures/selectors/auth.selectors.ts
export const authSelectors = {
  loginForm: '[data-testid="login-form"]',
  usernameInput: '[data-testid="username-input"]',
  passwordInput: '[data-testid="password-input"]',
  submitButton: '[data-testid="login-button"]',
  errorMessage: '[data-testid="error-message"]',
};

// fixtures/selectors/project.selectors.ts
export const projectSelectors = {
  listContainer: '[data-testid="project-list"]',
  projectCard: '[data-testid="project-card"]',
  createButton: '[data-testid="create-project-btn"]',
  editButton: '[data-testid="edit-project-btn"]',
  deleteButton: '[data-testid="delete-project-btn"]',
};

// 命名规范：[data-testid="组件名-元素类型"]
// 例如：login-form, username-input, project-card
```

---

## 数据库清理辅助

```typescript
// utils/db-helper.ts
import mysql from 'mysql2/promise';

interface DbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

// 从环境变量读取配置
const getTestDbConfig = (): DbConfig => ({
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || '3306'),
  user: process.env.TEST_DB_USER || 'root',
  password: process.env.TEST_DB_PASSWORD || '',
  database: process.env.TEST_DB_NAME || 'task_manager_test',
});

// 清理测试数据（按外键依赖顺序）
export async function cleanupTestData(): Promise<void> {
  const connection = await mysql.createConnection(getTestDbConfig());

  try {
    await connection.beginTransaction();

    // 按外键依赖顺序删除（子表先删）
    const tables = [
      'task_dependencies',
      'progress_records',
      'tasks',
      'timeline_tasks',
      'timelines',
      'milestones',
      'project_members',
      'projects',
      // 用户表保留测试账号
    ];

    for (const table of tables) {
      // 只删除测试数据（以 E2E- 或 test_ 开头）
      await connection.execute(
        `DELETE FROM ${table} WHERE id LIKE 'E2E-%' OR name LIKE 'E2E%' OR code LIKE 'E2E-%'`
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

// 清理时机：每个测试文件 beforeEach 钩子
```

---

## 测试环境配置

```bash
# .env.test - 测试环境配置文件

# 前端服务
FRONTEND_URL=http://localhost:5173

# 后端服务
API_BASE_URL=http://localhost:3001/api

# 测试数据库（独立于开发数据库）
TEST_DB_HOST=localhost
TEST_DB_PORT=3306
TEST_DB_USER=root
TEST_DB_PASSWORD=
TEST_DB_NAME=task_manager_test

# 测试账号
TEST_ADMIN_USERNAME=test_admin
TEST_ADMIN_PASSWORD=Test@123456

# Redis（可选，用于缓存测试）
TEST_REDIS_HOST=localhost
TEST_REDIS_PORT=6379
```

```typescript
// 在 playwright.config.ts 中加载环境变量
import { config } from 'dotenv';
config({ path: '.env.test' });
```

---

## CI/CD 集成（可选）

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: test
          MYSQL_DATABASE: task_manager_test
        ports:
          - 3306:3306

      redis:
        image: redis:7
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: |
          cd app && npm ci
          cd ../app/server && npm ci
          cd ../../Test/E2E_AutoTest && npm ci
          npx playwright install chromium

      - name: Run E2E tests
        run: cd Test/E2E_AutoTest && npm test
        env:
          TEST_DB_HOST: localhost
          TEST_DB_PASSWORD: test

      - name: Upload test report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: Test/E2E_AutoTest/reports/html/
```

---

**文档版本**: 1.0
**创建时间**: 2026-03-19
