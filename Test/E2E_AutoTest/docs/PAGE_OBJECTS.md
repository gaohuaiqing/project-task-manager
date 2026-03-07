# 页面对象文档

## 📋 目录

- [页面对象模型简介](#页面对象模型简介)
- [基础页面类](#基础页面类)
- [认证页面对象](#认证页面对象)
- [项目页面对象](#项目页面对象)
- [任务页面对象](#任务页面对象)
- [组件对象](#组件对象)
- [使用示例](#使用示例)

---

## 🎨 页面对象模型简介

页面对象模型（Page Object Model）是一种设计模式，用于创建可维护的 E2E 测试。它将页面元素和操作封装在对象中，使测试代码更清晰、更易维护。

### 优势

- **代码复用**：页面对象可在多个测试中复用
- **易于维护**：UI 变更只需修改页面对象
- **清晰分离**：测试逻辑与页面操作分离
- **可读性强**：测试代码更接近业务语言

---

## 📄 基础页面类

### BasePage

所有页面对象的基类，提供通用功能。

**位置：** `src/pages/BasePage.ts`

**主要方法：**

```typescript
class BasePage {
  // 导航到页面
  async goto(): Promise<void>

  // 等待页面加载
  async waitForLoad(): Promise<void>

  // 安全点击元素
  async clickElement(selector: string): Promise<void>

  // 安全输入文本
  async typeText(selector: string, text: string): Promise<void>

  // 获取元素文本
  async getText(selector: string): Promise<string>

  // 检查元素是否存在
  async hasElement(selector: string): Promise<boolean>

  // 截图
  async screenshot(filename: string): Promise<void>
}
```

**使用示例：**

```typescript
const basePage = new BasePage(page, '/dashboard');
await basePage.goto();
await basePage.clickElement('button:has-text("提交")');
```

---

## 🔐 认证页面对象

### LoginPage

封装登录页面的所有元素和操作。

**位置：** `src/pages/LoginPage.ts`

**主要元素：**

| 元素 | 选择器 |
|------|--------|
| 用户名输入框 | `#username` |
| 密码输入框 | `#password` |
| 密码切换按钮 | `#passwordToggle` |
| 登录按钮 | `button[type="submit"]` |
| 管理员用户名 | `#adminUsername` |
| 管理员密码 | `#adminPassword` |
| 错误提示 | `div[role="alert"]` |

**主要方法：**

```typescript
class LoginPage extends BasePage {
  // 填充用户名
  async fillUsername(username: string): Promise<void>

  // 填充密码
  async fillPassword(password: string): Promise<void>

  // 切换密码可见性
  async togglePasswordVisibility(): Promise<void>

  // 点击登录按钮
  async clickLoginButton(): Promise<void>

  // 切换到管理员登录模式
  async switchToAdminMode(): Promise<void>

  // 执行用户登录
  async login(username: string, password: string): Promise<void>

  // 执行管理员登录
  async adminLogin(username: string, password: string): Promise<void>

  // 验证登录错误提示
  async expectLoginError(): Promise<void>
}
```

**使用示例：**

```typescript
const loginPage = new LoginPage(page);

// 用户登录
await loginPage.goto();
await loginPage.login('tech_manager', '123456');

// 管理员登录
await loginPage.goto();
await loginPage.adminLogin('admin', 'admin123');
```

---

## 📊 仪表板页面对象

### DashboardPage

封装仪表板页面的所有元素和操作。

**位置：** `src/pages/DashboardPage.ts`

**主要方法：**

```typescript
class DashboardPage extends BasePage {
  // 等待仪表板加载完成
  async waitForReady(): Promise<void>

  // 获取页面标题
  async getPageTitle(): Promise<string>

  // 获取项目统计数量
  async getProjectCount(): Promise<string>

  // 获取任务统计数量
  async getTaskCount(): Promise<string>

  // 点击创建项目按钮
  async clickCreateProject(): Promise<void>
}
```

---

## 📁 项目页面对象

### ProjectListPage

封装项目列表页面的所有元素和操作。

**位置：** `src/pages/ProjectListPage.ts`

**主要选择器：**

| 元素 | 选择器 |
|------|--------|
| 创建项目按钮 | `button:has-text("创建项目")` |
| 搜索输入框 | `input[placeholder*="搜索"]` |
| 项目卡片 | `[class*="project-card"]` |

**主要方法：**

```typescript
class ProjectListPage extends BasePage {
  // 点击创建项目按钮
  async clickCreateProject(): Promise<void>

  // 搜索项目
  async searchProjects(query: string): Promise<void>

  // 获取项目数量
  async getProjectCount(): Promise<number>

  // 打开指定项目
  async openProject(projectName: string): Promise<void>

  // 检查项目是否存在
  async hasProject(projectName: string): Promise<boolean>

  // 点击编辑项目
  async clickEditProject(projectName: string): Promise<void>

  // 点击删除项目
  async clickDeleteProject(projectName: string): Promise<void>
}
```

### ProjectFormPage

封装项目创建/编辑表单的所有元素和操作。

**位置：** `src/pages/ProjectFormPage.ts`

**主要选择器：**

| 元素 | 选择器 |
|------|--------|
| 基本信息Tab | `button:has-text("基本信息")` |
| 项目成员Tab | `button:has-text("项目成员")` |
| 时间计划Tab | `button:has-text("时间计划")` |
| 产品开发类按钮 | `button:has-text("产品开发类")` |
| 职能管理类按钮 | `button:has-text("职能管理类")` |
| 项目编码 | `#project-code, #code` |
| 项目名称 | `#project-name, #name` |
| 项目描述 | `#project-desc, #description` |

**主要方法：**

```typescript
class ProjectFormPage extends BasePage {
  // 等待表单对话框出现
  async waitForForm(): Promise<void>

  // 选择项目类型
  async selectType(type: 'product' | 'management'): Promise<void>

  // 填充基本信息
  async fillBasicInfo(data: {
    code?: string;
    name: string;
    description?: string;
  }): Promise<void>

  // 切换Tab
  async goToMembersTab(): Promise<void>
  async goToTimePlanTab(): Promise<void>
  async goToBasicInfoTab(): Promise<void>

  // 提交表单
  async submit(): Promise<void>

  // 创建产品开发类项目
  async createProductProject(data: ProjectData): Promise<void>

  // 创建职能管理类项目
  async createManagementProject(data: ProjectData): Promise<void>
}
```

**使用示例：**

```typescript
const projectFormPage = new ProjectFormPage(page);

// 创建职能管理类项目
await projectFormPage.createManagementProject({
  name: '测试项目',
  description: '这是一个测试项目'
});
```

---

## ✅ 任务页面对象

### TaskManagementPage

封装任务管理页面的所有元素和操作。

**位置：** `src/pages/TaskManagementPage.ts`

**主要选择器：**

| 元素 | 选择器 |
|------|--------|
| 创建任务按钮 | `button:has-text("新建任务")` |
| 任务列表 | `[class*="task-list"]` |
| 任务行 | `[class*="task-row"]` |

**主要方法：**

```typescript
class TaskManagementPage extends BasePage {
  // 点击创建任务按钮
  async clickCreateTask(): Promise<void>

  // 等待创建任务对话框出现
  async waitForCreateDialog(): Promise<void>

  // 选择项目
  async selectProject(projectName: string): Promise<void>

  // 选择成员
  async selectMember(memberName: string): Promise<void>

  // 填充任务描述
  async fillDescription(description: string): Promise<void>

  // 选择日期
  async selectStartDate(date: string): Promise<void>
  async selectEndDate(date: string): Promise<void>

  // 选择优先级
  async selectPriority(priority: 'high' | 'medium' | 'low'): Promise<void>

  // 确认创建
  async confirmCreate(): Promise<void>

  // 创建任务
  async createTask(data: TaskData): Promise<void>

  // 点击任务状态徽章
  async clickTaskStatus(taskDescription: string): Promise<void>

  // 检查任务是否存在
  async hasTask(description: string): Promise<boolean>
}
```

**使用示例：**

```typescript
const taskPage = new TaskManagementPage(page);

// 创建任务
await taskPage.createTask({
  projectName: '测试项目',
  memberName: '张三',
  description: '测试任务',
  priority: 'high'
});

// 更新任务状态
await taskPage.clickTaskStatus('测试任务');
```

---

## 🧩 组件对象

### Sidebar

侧边栏导航组件。

**位置：** `src/components/Sidebar.ts`

**主要方法：**

```typescript
class Sidebar {
  // 导航到仪表板
  async navigateToDashboard(): Promise<void>

  // 导航到项目管理
  async navigateToProjects(): Promise<void>

  // 导航到任务管理
  async navigateToTasks(): Promise<void>

  // 导航到组织架构
  async navigateToOrganization(): Promise<void>

  // 检查菜单是否可见
  async isMenuVisible(menuName: string): Promise<boolean>
}
```

### Header

页面头部组件。

**位置：** `src/components/Header.ts`

**主要方法：**

```typescript
class Header {
  // 点击用户菜单
  async openUserMenu(): Promise<void>

  // 点击退出登录
  async clickLogout(): Promise<void>

  // 获取用户名称
  async getUserName(): Promise<string>
}
```

---

## 💡 使用示例

### 完整测试示例

```typescript
import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { ProjectListPage } from '../../src/pages/ProjectListPage';
import { ProjectFormPage } from '../../src/pages/ProjectFormPage';

test('创建项目', async ({ page }) => {
  // 1. 登录
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('dept_manager', '123456');

  // 2. 导航到项目列表
  const projectListPage = new ProjectListPage(page);
  await page.goto('/projects');
  await projectListPage.waitForReady();

  // 3. 点击创建项目
  await projectListPage.clickCreateProject();

  // 4. 填写表单
  const projectFormPage = new ProjectFormPage(page);
  await projectFormPage.waitForForm();

  await projectFormPage.selectType('management');
  await projectFormPage.fillBasicInfo({
    name: `测试项目_${Date.now()}`,
    description: '这是一个测试项目'
  });

  // 5. 提交
  await projectFormPage.submit();
  await projectFormPage.waitForFormClosed();
});
```

---

## 📚 扩展页面对象

### 添加新页面对象

1. 创建新文件 `src/pages/NewPage.ts`
2. 继承 `BasePage`
3. 定义元素选择器
4. 实现页面操作方法

```typescript
import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class NewPage extends BasePage {
  // 定义元素
  readonly someButton: Locator;

  constructor(page: Page) {
    super(page, '/new-page');
    this.someButton = page.locator('button:has-text("按钮")');
  }

  // 实现方法
  async doSomething(): Promise<void> {
    await this.clickElement('button');
  }
}
```

---

## 🔗 相关文档

- [测试指南](./TEST_GUIDE.md)
- [测试数据说明](./TEST_DATA.md)
- [Playwright 官方文档](https://playwright.dev/docs/page-object-model)
