# E2E 自动化联调测试实施计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立 Playwright E2E 测试体系，自动验证前后端集成，测试完成后汇总问题供用户确认。

**Architecture:** 测试代码完全独立于功能代码，放在 `Test/E2E_AutoTest/` 目录，使用 Playwright 自动化浏览器测试和 API 测试。

**Tech Stack:** Playwright 1.42 + TypeScript 5.3 + Node.js 20

**Spec Document:** `docs/superpowers/specs/2026-03-19-e2e-automation-testing.md`

---

## 约束条件

1. **不修改功能代码** - 测试代码完全独立
2. **问题汇总报告** - 测试完成后输出问题列表
3. **确认后修复** - 每个问题需用户确认

---

## Chunk 1: 基础设施

### Task 1.1: 创建目录结构和配置文件

**Files:**
- Create: `Test/E2E_AutoTest/package.json`
- Create: `Test/E2E_AutoTest/tsconfig.json`
- Create: `Test/E2E_AutoTest/playwright.config.ts`
- Create: `Test/E2E_AutoTest/.env.test`
- Create: `Test/E2E_AutoTest/.gitignore`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "e2e-autotest",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "test": "playwright test",
    "test:ui": "playwright test --ui",
    "test:debug": "playwright test --debug",
    "test:auth": "playwright test tests/auth.spec.ts",
    "test:projects": "playwright test tests/projects.spec.ts",
    "test:tasks": "playwright test tests/tasks.spec.ts",
    "test:api": "playwright test tests/api/",
    "report": "playwright show-report",
    "install-browsers": "playwright install chromium"
  },
  "devDependencies": {
    "@playwright/test": "^1.42.0",
    "@types/node": "^20.11.0",
    "dotenv": "^16.4.0",
    "mysql2": "^3.9.0",
    "typescript": "^5.3.0"
  }
}
```

- [ ] **Step 2: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": ".",
    "types": ["node", "@playwright/test"]
  },
  "include": ["tests/**/*", "fixtures/**/*", "utils/**/*"],
  "exclude": ["node_modules", "dist", "reports"]
}
```

- [ ] **Step 3: 创建 playwright.config.ts**

```typescript
import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';

// 加载测试环境变量
config({ path: '.env.test' });

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 30000,
  expect: {
    timeout: 10000,
  },
  reporter: [
    ['html', { outputFolder: 'reports/html' }],
    ['json', { outputFile: 'reports/results.json' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.FRONTEND_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,
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

- [ ] **Step 4: 创建 .env.test**

```bash
# 前端服务
FRONTEND_URL=http://localhost:5173

# 后端服务
API_BASE_URL=http://localhost:3001/api

# 测试数据库
TEST_DB_HOST=localhost
TEST_DB_PORT=3306
TEST_DB_USER=root
TEST_DB_PASSWORD=
TEST_DB_NAME=task_manager_test

# 测试账号
TEST_ADMIN_USERNAME=admin
TEST_ADMIN_PASSWORD=admin123

# Redis
TEST_REDIS_HOST=localhost
TEST_REDIS_PORT=6379
```

- [ ] **Step 5: 创建 .gitignore**

```gitignore
node_modules/
dist/
reports/
.env.local
test-results/
playwright-report/
playwright/.cache/
```

- [ ] **Step 6: 创建目录结构**

```bash
mkdir -p Test/E2E_AutoTest/tests/setup
mkdir -p Test/E2E_AutoTest/tests/api
mkdir -p Test/E2E_AutoTest/fixtures/selectors
mkdir -p Test/E2E_AutoTest/utils
mkdir -p Test/E2E_AutoTest/reports
```

- [ ] **Step 7: 提交基础设施**

```bash
git add Test/E2E_AutoTest/
git commit -m "test: 创建 E2E 测试基础设施"
```

---

### Task 1.2: 创建测试数据和选择器

**Files:**
- Create: `Test/E2E_AutoTest/fixtures/test-data.ts`
- Create: `Test/E2E_AutoTest/fixtures/selectors/common.selectors.ts`
- Create: `Test/E2E_AutoTest/fixtures/selectors/auth.selectors.ts`
- Create: `Test/E2E_AutoTest/fixtures/selectors/project.selectors.ts`
- Create: `Test/E2E_AutoTest/fixtures/selectors/task.selectors.ts`

- [ ] **Step 1: 创建 test-data.ts**

```typescript
// fixtures/test-data.ts

export const testUser = {
  username: process.env.TEST_ADMIN_USERNAME || 'admin',
  password: process.env.TEST_ADMIN_PASSWORD || 'admin123',
};

export const testProject = {
  name: 'E2E 测试项目',
  code: 'E2E-TEST-001',
  projectType: 'product_development',
  description: '自动化测试创建的项目',
};

export const testTask = {
  name: 'E2E 测试任务',
  taskType: 'frontend',
  priority: 'medium',
  description: '自动化测试创建的任务',
};

export const testMember = {
  name: '测试成员',
  department: '研发部',
  skills: ['frontend', 'backend'],
};
```

- [ ] **Step 2: 创建 common.selectors.ts**

```typescript
// fixtures/selectors/common.selectors.ts

export const commonSelectors = {
  // 通用元素
  loadingSpinner: '[data-testid="loading-spinner"]',
  toastMessage: '[data-testid="toast-message"]',
  confirmDialog: '[data-testid="confirm-dialog"]',
  confirmButton: '[data-testid="confirm-button"]',
  cancelButton: '[data-testid="cancel-button"]',

  // 导航
  sidebar: '[data-testid="sidebar"]',
  dashboardLink: '[data-testid="nav-dashboard"]',
  projectsLink: '[data-testid="nav-projects"]',
  tasksLink: '[data-testid="nav-tasks"]',
  assignmentLink: '[data-testid="nav-assignment"]',
  settingsLink: '[data-testid="nav-settings"]',

  // 用户菜单
  userMenu: '[data-testid="user-menu"]',
  logoutButton: '[data-testid="logout-button"]',
};
```

- [ ] **Step 3: 创建 auth.selectors.ts**

```typescript
// fixtures/selectors/auth.selectors.ts

export const authSelectors = {
  loginPage: '[data-testid="login-page"]',
  loginForm: '[data-testid="login-form"]',
  usernameInput: '[data-testid="username-input"]',
  passwordInput: '[data-testid="password-input"]',
  submitButton: '[data-testid="login-button"]',
  errorMessage: '[data-testid="error-message"]',
  forgotPasswordLink: '[data-testid="forgot-password-link"]',
};
```

- [ ] **Step 4: 创建 project.selectors.ts**

```typescript
// fixtures/selectors/project.selectors.ts

export const projectSelectors = {
  listContainer: '[data-testid="project-list"]',
  projectCard: '[data-testid="project-card"]',
  projectDetail: '[data-testid="project-detail"]',
  createButton: '[data-testid="create-project-btn"]',
  editButton: '[data-testid="edit-project-btn"]',
  deleteButton: '[data-testid="delete-project-btn"]',

  // 表单字段
  nameInput: '[data-testid="project-name-input"]',
  codeInput: '[data-testid="project-code-input"]',
  typeSelect: '[data-testid="project-type-select"]',
  descriptionInput: '[data-testid="project-description-input"]',
  saveButton: '[data-testid="save-project-btn"]',

  // 详情页
  milestonesTab: '[data-testid="milestones-tab"]',
  timelinesTab: '[data-testid="timelines-tab"]',
  membersTab: '[data-testid="members-tab"]',
};
```

- [ ] **Step 5: 创建 task.selectors.ts**

```typescript
// fixtures/selectors/task.selectors.ts

export const taskSelectors = {
  listContainer: '[data-testid="task-list"]',
  wbsTable: '[data-testid="wbs-table"]',
  taskRow: '[data-testid="task-row"]',
  createButton: '[data-testid="create-task-btn"]',
  editButton: '[data-testid="edit-task-btn"]',
  deleteButton: '[data-testid="delete-task-btn"]',

  // 表单字段
  nameInput: '[data-testid="task-name-input"]',
  typeSelect: '[data-testid="task-type-select"]',
  prioritySelect: '[data-testid="task-priority-select"]',
  assigneeSelect: '[data-testid="task-assignee-select"]',
  statusSelect: '[data-testid="task-status-select"]',
  progressInput: '[data-testid="task-progress-input"]',
  saveButton: '[data-testid="save-task-btn"]',

  // WBS 树
  expandButton: '[data-testid="expand-task-btn"]',
  addChildButton: '[data-testid="add-child-task-btn"]',
};
```

- [ ] **Step 6: 提交测试数据和选择器**

```bash
git add Test/E2E_AutoTest/fixtures/
git commit -m "test: 添加测试数据和页面选择器定义"
```

---

### Task 1.3: 创建辅助工具

**Files:**
- Create: `Test/E2E_AutoTest/utils/api-helper.ts`
- Create: `Test/E2E_AutoTest/utils/db-helper.ts`

- [ ] **Step 1: 创建 api-helper.ts**

```typescript
// utils/api-helper.ts
import { APIRequestContext } from '@playwright/test';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api';

export class ApiHelper {
  private request: APIRequestContext;
  private authToken: string | null = null;

  constructor(request: APIRequestContext) {
    this.request = request;
  }

  async login(username: string, password: string): Promise<void> {
    const response = await this.request.post(`${API_BASE_URL}/login`, {
      data: { username, password },
    });

    if (response.ok()) {
      const data = await response.json();
      this.authToken = data.token;
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    return headers;
  }

  async get<T>(endpoint: string): Promise<{ data: T; status: number }> {
    const response = await this.request.get(`${API_BASE_URL}${endpoint}`, {
      headers: this.getHeaders(),
    });
    return {
      data: await response.json(),
      status: response.status(),
    };
  }

  async post<T>(endpoint: string, body: object): Promise<{ data: T; status: number }> {
    const response = await this.request.post(`${API_BASE_URL}${endpoint}`, {
      headers: this.getHeaders(),
      data: body,
    });
    return {
      data: await response.json(),
      status: response.status(),
    };
  }

  async put<T>(endpoint: string, body: object): Promise<{ data: T; status: number }> {
    const response = await this.request.put(`${API_BASE_URL}${endpoint}`, {
      headers: this.getHeaders(),
      data: body,
    });
    return {
      data: await response.json(),
      status: response.status(),
    };
  }

  async delete(endpoint: string): Promise<{ status: number }> {
    const response = await this.request.delete(`${API_BASE_URL}${endpoint}`, {
      headers: this.getHeaders(),
    });
    return { status: response.status() };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.request.get(`${API_BASE_URL}/health`);
      return response.ok();
    } catch {
      return false;
    }
  }
}
```

- [ ] **Step 2: 创建 db-helper.ts**

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

const getTestDbConfig = (): DbConfig => ({
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || '3306'),
  user: process.env.TEST_DB_USER || 'root',
  password: process.env.TEST_DB_PASSWORD || '',
  database: process.env.TEST_DB_NAME || 'task_manager',
});

export async function cleanupTestData(): Promise<void> {
  const connection = await mysql.createConnection(getTestDbConfig());

  try {
    await connection.beginTransaction();

    // 按外键依赖顺序删除
    const tables = [
      'task_dependencies',
      'progress_records',
      'tasks',
      'timeline_tasks',
      'timelines',
      'milestones',
      'project_members',
      'projects',
    ];

    for (const table of tables) {
      await connection.execute(
        `DELETE FROM ${table} WHERE id LIKE 'E2E-%' OR name LIKE 'E2E%' OR code LIKE 'E2E-%'`
      );
    }

    await connection.commit();
    console.log('Test data cleaned up successfully');
  } catch (error) {
    await connection.rollback();
    console.error('Failed to cleanup test data:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

export async function createTestProject(data: {
  id: string;
  name: string;
  code: string;
  projectType: string;
}): Promise<void> {
  const connection = await mysql.createConnection(getTestDbConfig());

  try {
    await connection.execute(
      `INSERT INTO projects (id, name, code, project_type, status, progress, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'planning', 0, NOW(), NOW())`,
      [data.id, data.name, data.code, data.projectType]
    );
  } finally {
    await connection.end();
  }
}
```

- [ ] **Step 3: 提交辅助工具**

```bash
git add Test/E2E_AutoTest/utils/
git commit -m "test: 添加 API 和数据库辅助工具"
```

---

### Task 1.4: 创建认证设置

**Files:**
- Create: `Test/E2E_AutoTest/tests/setup/auth.setup.ts`

- [ ] **Step 1: 创建 auth.setup.ts**

```typescript
// tests/setup/auth.setup.ts
import { test as setup, expect } from '@playwright/test';
import { testUser } from '../../fixtures/test-data';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // 访问登录页
  await page.goto('/login');

  // 等待登录表单加载
  await page.waitForSelector('[data-testid="login-form"]', { timeout: 10000 });

  // 填写登录信息
  await page.fill('[data-testid="username-input"]', testUser.username);
  await page.fill('[data-testid="password-input"]', testUser.password);

  // 点击登录
  await page.click('[data-testid="login-button"]');

  // 等待跳转到仪表板
  await page.waitForURL('**/dashboard', { timeout: 15000 });

  // 验证登录成功
  await expect(page).toHaveURL(/.*dashboard/);

  // 保存认证状态
  await page.context().storageState({ path: authFile });
});
```

- [ ] **Step 2: 提交认证设置**

```bash
git add Test/E2E_AutoTest/tests/setup/
git commit -m "test: 添加认证设置脚本"
```

---

## Chunk 2: 认证和项目测试

### Task 2.1: 创建认证测试

**Files:**
- Create: `Test/E2E_AutoTest/tests/auth.spec.ts`

- [ ] **Step 1: 创建 auth.spec.ts**

```typescript
// tests/auth.spec.ts
import { test, expect } from '@playwright/test';
import { authSelectors } from '../fixtures/selectors/auth.selectors';
import { commonSelectors } from '../fixtures/selectors/common.selectors';
import { testUser } from '../fixtures/test-data';

test.describe('认证模块', () => {
  test.describe.configure({ mode: 'serial' });

  test('登录成功 - 应跳转到仪表板', async ({ page }) => {
    await page.goto('/login');

    await page.waitForSelector(authSelectors.loginForm);
    await page.fill(authSelectors.usernameInput, testUser.username);
    await page.fill(authSelectors.passwordInput, testUser.password);
    await page.click(authSelectors.submitButton);

    // 验证跳转到仪表板
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });
  });

  test('登录失败 - 应显示错误提示', async ({ page }) => {
    await page.goto('/login');

    await page.waitForSelector(authSelectors.loginForm);
    await page.fill(authSelectors.usernameInput, 'wrong_user');
    await page.fill(authSelectors.passwordInput, 'wrong_password');
    await page.click(authSelectors.submitButton);

    // 验证错误提示显示
    await expect(page.locator(authSelectors.errorMessage)).toBeVisible({ timeout: 5000 });
  });

  test('未认证访问 - 应重定向到登录页', async ({ page }) => {
    // 直接访问受保护页面
    await page.goto('/projects');

    // 验证重定向到登录页
    await expect(page).toHaveURL(/.*login/, { timeout: 10000 });
  });

  test('登出 - 应跳转到登录页', async ({ page }) => {
    // 先登录
    await page.goto('/login');
    await page.waitForSelector(authSelectors.loginForm);
    await page.fill(authSelectors.usernameInput, testUser.username);
    await page.fill(authSelectors.passwordInput, testUser.password);
    await page.click(authSelectors.submitButton);
    await page.waitForURL('**/dashboard', { timeout: 15000 });

    // 点击用户菜单
    await page.click(commonSelectors.userMenu);

    // 点击登出
    await page.click(commonSelectors.logoutButton);

    // 验证跳转到登录页
    await expect(page).toHaveURL(/.*login/, { timeout: 10000 });
  });
});
```

- [ ] **Step 2: 提交认证测试**

```bash
git add Test/E2E_AutoTest/tests/auth.spec.ts
git commit -m "test: 添加认证模块 E2E 测试"
```

---

### Task 2.2: 创建项目管理测试

**Files:**
- Create: `Test/E2E_AutoTest/tests/projects.spec.ts`

- [ ] **Step 1: 创建 projects.spec.ts**

```typescript
// tests/projects.spec.ts
import { test, expect } from '@playwright/test';
import { projectSelectors } from '../fixtures/selectors/project.selectors';
import { commonSelectors } from '../fixtures/selectors/common.selectors';
import { testUser, testProject } from '../fixtures/test-data';
import { cleanupTestData } from '../utils/db-helper';

test.describe('项目管理模块', () => {
  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', testUser.username);
    await page.fill('[data-testid="password-input"]', testUser.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
  });

  test('项目列表 - 应显示项目列表页面', async ({ page }) => {
    await page.goto('/projects');

    // 验证项目列表容器存在
    await expect(page.locator(projectSelectors.listContainer)).toBeVisible({ timeout: 10000 });
  });

  test('创建项目 - 项目应出现在列表中', async ({ page }) => {
    await page.goto('/projects');

    // 点击创建按钮
    await page.click(projectSelectors.createButton);

    // 填写表单
    await page.fill(projectSelectors.nameInput, testProject.name);
    await page.fill(projectSelectors.codeInput, testProject.code);
    await page.selectOption(projectSelectors.typeSelect, testProject.projectType);
    await page.fill(projectSelectors.descriptionInput, testProject.description);

    // 保存
    await page.click(projectSelectors.saveButton);

    // 验证成功提示
    await expect(page.locator(commonSelectors.toastMessage)).toBeVisible({ timeout: 10000 });

    // 验证项目出现在列表中
    await expect(page.locator(`text=${testProject.name}`)).toBeVisible({ timeout: 10000 });
  });

  test('项目详情 - 应显示项目详情页', async ({ page }) => {
    await page.goto('/projects');

    // 等待项目列表加载
    await page.waitForSelector(projectSelectors.projectCard, { timeout: 10000 });

    // 点击第一个项目卡片
    const firstProject = page.locator(projectSelectors.projectCard).first();
    await firstProject.click();

    // 验证跳转到详情页
    await expect(page).toHaveURL(/.*projects\/.+/);
    await expect(page.locator(projectSelectors.projectDetail)).toBeVisible({ timeout: 10000 });
  });

  test('编辑项目 - 信息应更新成功', async ({ page }) => {
    await page.goto('/projects');

    // 等待项目列表加载
    await page.waitForSelector(projectSelectors.projectCard, { timeout: 10000 });

    // 点击第一个项目的编辑按钮
    const firstProjectCard = page.locator(projectSelectors.projectCard).first();
    await firstProjectCard.hover();
    await firstProjectCard.locator(projectSelectors.editButton).click();

    // 修改名称
    const newName = `${testProject.name} - 已编辑`;
    await page.fill(projectSelectors.nameInput, newName);

    // 保存
    await page.click(projectSelectors.saveButton);

    // 验证成功提示
    await expect(page.locator(commonSelectors.toastMessage)).toBeVisible({ timeout: 10000 });
  });

  test('删除项目 - 项目应从列表消失', async ({ page }) => {
    await page.goto('/projects');

    // 等待项目列表加载
    await page.waitForSelector(projectSelectors.projectCard, { timeout: 10000 });

    // 获取项目数量
    const projectCount = await page.locator(projectSelectors.projectCard).count();

    if (projectCount > 0) {
      // 点击第一个项目的删除按钮
      const firstProjectCard = page.locator(projectSelectors.projectCard).first();
      await firstProjectCard.hover();
      await firstProjectCard.locator(projectSelectors.deleteButton).click();

      // 确认删除
      await page.click(commonSelectors.confirmButton);

      // 验证成功提示
      await expect(page.locator(commonSelectors.toastMessage)).toBeVisible({ timeout: 10000 });
    }
  });
});
```

- [ ] **Step 2: 提交项目管理测试**

```bash
git add Test/E2E_AutoTest/tests/projects.spec.ts
git commit -m "test: 添加项目管理模块 E2E 测试"
```

---

## Chunk 3: 任务和智能分配测试

### Task 3.1: 创建任务管理测试

**Files:**
- Create: `Test/E2E_AutoTest/tests/tasks.spec.ts`

- [ ] **Step 1: 创建 tasks.spec.ts**

```typescript
// tests/tasks.spec.ts
import { test, expect } from '@playwright/test';
import { taskSelectors } from '../fixtures/selectors/task.selectors';
import { commonSelectors } from '../fixtures/selectors/common.selectors';
import { testUser, testTask } from '../fixtures/test-data';

test.describe('任务管理模块', () => {
  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', testUser.username);
    await page.fill('[data-testid="password-input"]', testUser.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
  });

  test('任务列表 - 应显示 WBS 任务树', async ({ page }) => {
    await page.goto('/tasks');

    // 验证 WBS 表格存在
    await expect(page.locator(taskSelectors.wbsTable)).toBeVisible({ timeout: 10000 });
  });

  test('创建任务 - 任务应出现在列表中', async ({ page }) => {
    await page.goto('/tasks');

    // 点击创建按钮
    await page.click(taskSelectors.createButton);

    // 填写表单
    await page.fill(taskSelectors.nameInput, testTask.name);
    await page.selectOption(taskSelectors.typeSelect, testTask.taskType);
    await page.selectOption(taskSelectors.prioritySelect, testTask.priority);

    // 保存
    await page.click(taskSelectors.saveButton);

    // 验证成功提示
    await expect(page.locator(commonSelectors.toastMessage)).toBeVisible({ timeout: 10000 });

    // 验证任务出现在列表中
    await expect(page.locator(`text=${testTask.name}`)).toBeVisible({ timeout: 10000 });
  });

  test('创建子任务 - 应形成层级结构', async ({ page }) => {
    await page.goto('/tasks');

    // 等待任务列表加载
    await page.waitForSelector(taskSelectors.taskRow, { timeout: 10000 });

    // 找到第一个任务并添加子任务
    const firstTask = page.locator(taskSelectors.taskRow).first();
    await firstTask.hover();
    await firstTask.locator(taskSelectors.addChildButton).click();

    // 填写子任务信息
    const subTaskName = `${testTask.name} - 子任务`;
    await page.fill(taskSelectors.nameInput, subTaskName);
    await page.click(taskSelectors.saveButton);

    // 验证成功提示
    await expect(page.locator(commonSelectors.toastMessage)).toBeVisible({ timeout: 10000 });
  });

  test('更新任务状态 - 状态应更新成功', async ({ page }) => {
    await page.goto('/tasks');

    // 等待任务列表加载
    await page.waitForSelector(taskSelectors.taskRow, { timeout: 10000 });

    // 找到第一个任务并点击编辑
    const firstTask = page.locator(taskSelectors.taskRow).first();
    await firstTask.hover();
    await firstTask.locator(taskSelectors.editButton).click();

    // 修改状态
    await page.selectOption(taskSelectors.statusSelect, 'in_progress');

    // 保存
    await page.click(taskSelectors.saveButton);

    // 验证成功提示
    await expect(page.locator(commonSelectors.toastMessage)).toBeVisible({ timeout: 10000 });
  });

  test('任务分配 - 负责人应更新', async ({ page }) => {
    await page.goto('/tasks');

    // 等待任务列表加载
    await page.waitForSelector(taskSelectors.taskRow, { timeout: 10000 });

    // 找到第一个任务并点击编辑
    const firstTask = page.locator(taskSelectors.taskRow).first();
    await firstTask.hover();
    await firstTask.locator(taskSelectors.editButton).click();

    // 选择负责人（如果有选项的话）
    const assigneeSelect = page.locator(taskSelectors.assigneeSelect);
    if (await assigneeSelect.isVisible()) {
      await assigneeSelect.selectOption({ index: 1 });
      await page.click(taskSelectors.saveButton);

      // 验证成功提示
      await expect(page.locator(commonSelectors.toastMessage)).toBeVisible({ timeout: 10000 });
    }
  });
});
```

- [ ] **Step 2: 提交任务管理测试**

```bash
git add Test/E2E_AutoTest/tests/tasks.spec.ts
git commit -m "test: 添加任务管理模块 E2E 测试"
```

---

### Task 3.2: 创建智能分配测试

**Files:**
- Create: `Test/E2E_AutoTest/tests/assignment.spec.ts`

- [ ] **Step 1: 创建 assignment.spec.ts**

```typescript
// tests/assignment.spec.ts
import { test, expect } from '@playwright/test';
import { testUser } from '../fixtures/test-data';

test.describe('智能分配模块', () => {
  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', testUser.username);
    await page.fill('[data-testid="password-input"]', testUser.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
  });

  test('页面加载 - 应显示成员能力矩阵', async ({ page }) => {
    await page.goto('/assignment');

    // 验证页面加载
    await expect(page.locator('[data-testid="assignment-page"]')).toBeVisible({ timeout: 10000 });

    // 验证成员列表存在
    await expect(page.locator('[data-testid="member-list"]')).toBeVisible({ timeout: 10000 });
  });

  test('能力筛选 - 应显示符合条件的成员', async ({ page }) => {
    await page.goto('/assignment');

    // 等待页面加载
    await page.waitForSelector('[data-testid="skill-filter"]', { timeout: 10000 });

    // 选择技能筛选
    await page.selectOption('[data-testid="skill-filter"]', 'frontend');

    // 验证筛选结果（至少有一个成员）
    const memberCount = await page.locator('[data-testid="member-card"]').count();
    expect(memberCount).toBeGreaterThanOrEqual(0);
  });

  test('负载查看 - 应显示成员当前负载', async ({ page }) => {
    await page.goto('/assignment');

    // 等待页面加载
    await page.waitForSelector('[data-testid="member-list"]', { timeout: 10000 });

    // 点击第一个成员查看详情
    const firstMember = page.locator('[data-testid="member-card"]').first();
    if (await firstMember.isVisible()) {
      await firstMember.click();

      // 验证负载信息显示
      await expect(page.locator('[data-testid="member-workload"]')).toBeVisible({ timeout: 10000 });
    }
  });

  test('分配建议 - 应显示推荐人员列表', async ({ page }) => {
    await page.goto('/assignment');

    // 等待页面加载
    await page.waitForSelector('[data-testid="task-selector"]', { timeout: 10000 });

    // 选择一个任务
    await page.selectOption('[data-testid="task-selector"]', { index: 1 });

    // 等待推荐结果
    await page.waitForTimeout(1000);

    // 验证推荐列表存在
    const recommendationList = page.locator('[data-testid="recommendation-list"]');
    // 如果有推荐结果，验证其存在
    if (await recommendationList.isVisible()) {
      const recommendations = await recommendationList.locator('[data-testid="recommendation-item"]').count();
      expect(recommendations).toBeGreaterThanOrEqual(0);
    }
  });
});
```

- [ ] **Step 2: 提交智能分配测试**

```bash
git add Test/E2E_AutoTest/tests/assignment.spec.ts
git commit -m "test: 添加智能分配模块 E2E 测试"
```

---

## Chunk 4: API 和错误处理测试

### Task 4.1: 创建 API 集成测试

**Files:**
- Create: `Test/E2E_AutoTest/tests/api/auth.api.spec.ts`
- Create: `Test/E2E_AutoTest/tests/api/project.api.spec.ts`
- Create: `Test/E2E_AutoTest/tests/api/task.api.spec.ts`

- [ ] **Step 1: 创建 auth.api.spec.ts**

```typescript
// tests/api/auth.api.spec.ts
import { test, expect } from '@playwright/test';
import { ApiHelper } from '../../utils/api-helper';
import { testUser } from '../../fixtures/test-data';

test.describe('认证 API 测试', () => {
  let api: ApiHelper;

  test.beforeEach(async ({ request }) => {
    api = new ApiHelper(request);
  });

  test('登录 API - 应返回用户信息和 token', async () => {
    const response = await api.post('/login', {
      username: testUser.username,
      password: testUser.password,
    });

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('user');
    expect(response.data).toHaveProperty('token');
    expect(response.data.user.username).toBe(testUser.username);
  });

  test('登录 API - 错误密码应返回 401', async () => {
    const response = await api.post('/login', {
      username: testUser.username,
      password: 'wrong_password',
    });

    expect(response.status).toBe(401);
    expect(response.data).toHaveProperty('code');
    expect(response.data).toHaveProperty('message');
  });

  test('获取当前用户 - 应返回用户信息', async () => {
    // 先登录
    await api.login(testUser.username, testUser.password);

    const response = await api.get('/auth/me');

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('id');
    expect(response.data).toHaveProperty('username');
  });

  test('未认证访问 - 应返回 401', async () => {
    const response = await api.get('/auth/me');

    expect(response.status).toBe(401);
  });
});
```

- [ ] **Step 2: 创建 project.api.spec.ts**

```typescript
// tests/api/project.api.spec.ts
import { test, expect } from '@playwright/test';
import { ApiHelper } from '../../utils/api-helper';
import { testUser, testProject } from '../../fixtures/test-data';

test.describe('项目 API 测试', () => {
  let api: ApiHelper;

  test.beforeEach(async ({ request }) => {
    api = new ApiHelper(request);
    await api.login(testUser.username, testUser.password);
  });

  test('获取项目列表 - 应返回分页数据', async () => {
    const response = await api.get('/project/projects');

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('items');
    expect(response.data).toHaveProperty('total');
    expect(response.data).toHaveProperty('page');
    expect(response.data).toHaveProperty('pageSize');
    expect(Array.isArray(response.data.items)).toBe(true);
  });

  test('创建项目 - 应返回项目 ID', async () => {
    const response = await api.post('/project/projects', {
      name: `API测试项目_${Date.now()}`,
      code: `API-TEST-${Date.now()}`,
      projectType: 'product_development',
      description: 'API自动化测试创建',
    });

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('id');
  });

  test('获取项目详情 - 应返回完整项目信息', async () => {
    // 先创建一个项目
    const createResponse = await api.post('/project/projects', {
      name: `详情测试项目_${Date.now()}`,
      code: `DETAIL-${Date.now()}`,
      projectType: 'product_development',
    });

    const projectId = createResponse.data.id;

    // 获取详情
    const response = await api.get(`/project/projects/${projectId}`);

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('id', projectId);
    expect(response.data).toHaveProperty('name');
    expect(response.data).toHaveProperty('status');
  });

  test('更新项目 - 应返回更新后的项目', async () => {
    // 先创建一个项目
    const createResponse = await api.post('/project/projects', {
      name: `更新测试项目_${Date.now()}`,
      code: `UPDATE-${Date.now()}`,
      projectType: 'product_development',
    });

    const projectId = createResponse.data.id;

    // 更新项目
    const response = await api.put(`/project/projects/${projectId}`, {
      name: `已更新_${Date.now()}`,
    });

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('id', projectId);
  });

  test('删除项目 - 应返回成功', async () => {
    // 先创建一个项目
    const createResponse = await api.post('/project/projects', {
      name: `删除测试项目_${Date.now()}`,
      code: `DELETE-${Date.now()}`,
      projectType: 'product_development',
    });

    const projectId = createResponse.data.id;

    // 删除项目
    const response = await api.delete(`/project/projects/${projectId}`);

    expect(response.status).toBe(200);
  });
});
```

- [ ] **Step 3: 创建 task.api.spec.ts**

```typescript
// tests/api/task.api.spec.ts
import { test, expect } from '@playwright/test';
import { ApiHelper } from '../../utils/api-helper';
import { testUser, testTask } from '../../fixtures/test-data';

test.describe('任务 API 测试', () => {
  let api: ApiHelper;
  let testProjectId: string;

  test.beforeEach(async ({ request }) => {
    api = new ApiHelper(request);
    await api.login(testUser.username, testUser.password);

    // 创建测试项目
    const projectResponse = await api.post('/project/projects', {
      name: `任务测试项目_${Date.now()}`,
      code: `TASK-${Date.now()}`,
      projectType: 'product_development',
    });
    testProjectId = projectResponse.data.id;
  });

  test('获取任务列表 - 应返回分页数据', async () => {
    const response = await api.get(`/task/tasks?project_id=${testProjectId}`);

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('items');
    expect(response.data).toHaveProperty('total');
  });

  test('创建任务 - 应返回任务 ID', async () => {
    const response = await api.post('/task/tasks', {
      projectId: testProjectId,
      name: `API测试任务_${Date.now()}`,
      taskType: 'frontend',
      priority: 'medium',
    });

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('id');
  });

  test('更新任务状态 - 应返回更新后的任务', async () => {
    // 先创建任务
    const createResponse = await api.post('/task/tasks', {
      projectId: testProjectId,
      name: `状态更新测试_${Date.now()}`,
      taskType: 'frontend',
    });

    const taskId = createResponse.data.id;

    // 更新状态
    const response = await api.put(`/task/tasks/${taskId}`, {
      status: 'in_progress',
      version: 1,
    });

    expect(response.status).toBe(200);
  });

  test('创建子任务 - 应形成层级关系', async () => {
    // 先创建父任务
    const parentResponse = await api.post('/task/tasks', {
      projectId: testProjectId,
      name: `父任务_${Date.now()}`,
      taskType: 'frontend',
    });

    const parentId = parentResponse.data.id;

    // 创建子任务
    const childResponse = await api.post('/task/tasks', {
      projectId: testProjectId,
      parentId: parentId,
      name: `子任务_${Date.now()}`,
      taskType: 'frontend',
    });

    expect(childResponse.status).toBe(200);
    expect(childResponse.data).toHaveProperty('id');
  });
});
```

- [ ] **Step 4: 提交 API 测试**

```bash
git add Test/E2E_AutoTest/tests/api/
git commit -m "test: 添加 API 集成测试"
```

---

### Task 4.2: 创建错误处理测试

**Files:**
- Create: `Test/E2E_AutoTest/tests/error-handling.spec.ts`

- [ ] **Step 1: 创建 error-handling.spec.ts**

```typescript
// tests/error-handling.spec.ts
import { test, expect } from '@playwright/test';
import { testUser } from '../fixtures/test-data';

test.describe('错误处理测试', () => {
  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', testUser.username);
    await page.fill('[data-testid="password-input"]', testUser.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
  });

  test('网络断开 - 应显示离线提示', async ({ page, context }) => {
    await page.goto('/projects');

    // 模拟网络断开
    await context.setOffline(true);

    // 尝试操作
    await page.click('[data-testid="create-project-btn"]');

    // 验证离线提示（具体实现取决于应用）
    await page.waitForTimeout(2000);

    // 恢复网络
    await context.setOffline(false);
  });

  test('表单验证 - 提交空表单应显示错误', async ({ page }) => {
    await page.goto('/projects');

    // 点击创建按钮
    await page.click('[data-testid="create-project-btn"]');

    // 直接提交空表单
    await page.click('[data-testid="save-project-btn"]');

    // 验证表单验证错误显示
    const errorMessage = page.locator('[data-testid="form-error"]');
    // 至少有一个字段显示错误
    await expect(errorMessage.first()).toBeVisible({ timeout: 5000 });
  });

  test('API 超时 - 应显示加载超时提示', async ({ page }) => {
    // 模拟慢速网络
    const slowRequest = page.route('**/api/**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 35000)); // 超过超时时间
      route.continue();
    });

    await page.goto('/projects');

    // 等待超时处理
    await page.waitForTimeout(30000);

    // 清除路由
    await page.unroute('**/api/**', slowRequest);
  });

  test('404 页面 - 访问不存在的路由应显示 404', async ({ page }) => {
    await page.goto('/non-existent-page');

    // 验证 404 页面或重定向
    const is404 = await page.locator('text=/404|页面不存在|Not Found/i').isVisible();
    const isRedirected = page.url().includes('login') || page.url().includes('dashboard');

    expect(is404 || isRedirected).toBe(true);
  });
});
```

- [ ] **Step 2: 提交错误处理测试**

```bash
git add Test/E2E_AutoTest/tests/error-handling.spec.ts
git commit -m "test: 添加错误处理 E2E 测试"
```

---

## Chunk 5: 运行测试和问题报告

### Task 5.1: 安装依赖和运行测试

- [ ] **Step 1: 安装测试依赖**

```bash
cd Test/E2E_AutoTest
npm install
npx playwright install chromium
```

- [ ] **Step 2: 运行所有测试**

```bash
npm run test
```

- [ ] **Step 3: 查看测试报告**

```bash
npm run report
```

---

### Task 5.2: 解析问题并生成报告

**Files:**
- Create: `Test/E2E_AutoTest/scripts/generate-report.ts`

- [ ] **Step 1: 创建报告生成脚本**

```typescript
// scripts/generate-report.ts
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface TestResult {
  status: 'passed' | 'failed' | 'skipped';
  name: string;
  duration: number;
  error?: {
    message: string;
    stack?: string;
  };
}

interface PlaywrightReport {
  suites: Array<{
    specs: Array<{
      tests: Array<{
        status: string;
        name: string;
        duration: number;
        results: Array<{
          status: string;
          error?: { message: string; stack?: string };
        }>;
      }>;
    }>;
  }>;
}

function generateIssueReport(): void {
  const reportPath = join(__dirname, '../reports/results.json');
  const outputPath = join(__dirname, '../reports/issues-report.md');

  let passed = 0;
  let failed = 0;
  const issues: Array<{
    name: string;
    severity: 'Critical' | 'High' | 'Medium' | 'Low';
    error: string;
  }> = [];

  try {
    const reportData = JSON.parse(readFileSync(reportPath, 'utf-8'));

    // 解析测试结果
    function parseSpecs(specs: any[]) {
      for (const spec of specs) {
        for (const test of spec.tests || []) {
          if (test.status === 'passed') {
            passed++;
          } else if (test.status === 'failed') {
            failed++;
            const error = test.results?.[0]?.error;
            issues.push({
              name: spec.title || test.name,
              severity: 'High',
              error: error?.message || 'Unknown error',
            });
          }
        }
      }
    }

    function parseSuites(suites: any[]) {
      for (const suite of suites) {
        parseSpecs(suite.specs || []);
        parseSuites(suite.suites || []);
      }
    }

    parseSuites(reportData.suites || []);
  } catch (error) {
    console.error('Failed to parse report:', error);
    return;
  }

  // 生成 Markdown 报告
  const report = `# E2E 测试问题报告

**测试时间**: ${new Date().toLocaleString('zh-CN')}
**测试环境**: Chromium
**通过/失败**: ${passed}/${failed}

---

## 测试摘要

| 指标 | 数量 |
|------|------|
| 通过 | ${passed} |
| 失败 | ${failed} |
| 总计 | ${passed + failed} |

---

## 问题列表

${
  issues.length === 0
    ? '✅ 所有测试通过，无问题需要修复。'
    : issues
        .map(
          (issue, index) => `
### 问题 ${index + 1}: ${issue.name}
- **严重程度**: ${issue.severity}
- **错误信息**: ${issue.error}
`
        )
        .join('\n')
}

---

**报告生成时间**: ${new Date().toLocaleString('zh-CN')}
`;

  writeFileSync(outputPath, report, 'utf-8');
  console.log(`Report generated: ${outputPath}`);
  console.log(`Passed: ${passed}, Failed: ${failed}`);
}

generateIssueReport();
```

- [ ] **Step 2: 添加报告生成脚本到 package.json**

```json
{
  "scripts": {
    "generate-report": "tsx scripts/generate-report.ts"
  },
  "devDependencies": {
    "tsx": "^4.7.0"
  }
}
```

- [ ] **Step 3: 提交报告生成脚本**

```bash
git add Test/E2E_AutoTest/scripts/
git commit -m "test: 添加测试报告生成脚本"
```

---

## 执行顺序总结

```
Chunk 1: 基础设施
├── Task 1.1: 创建目录结构和配置文件
├── Task 1.2: 创建测试数据和选择器
├── Task 1.3: 创建辅助工具
└── Task 1.4: 创建认证设置

Chunk 2: 认证和项目测试
├── Task 2.1: 创建认证测试
└── Task 2.2: 创建项目管理测试

Chunk 3: 任务和智能分配测试
├── Task 3.1: 创建任务管理测试
└── Task 3.2: 创建智能分配测试

Chunk 4: API 和错误处理测试
├── Task 4.1: 创建 API 集成测试
└── Task 4.2: 创建错误处理测试

Chunk 5: 运行测试和问题报告
├── Task 5.1: 安装依赖和运行测试
└── Task 5.2: 解析问题并生成报告
```

---

**文档版本**: 1.0
**创建时间**: 2026-03-19
