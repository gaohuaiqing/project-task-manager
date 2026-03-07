# 测试数据说明

## 📋 目录

- [测试账号](#测试账号)
- [数据生成策略](#数据生成策略)
- [数据清理策略](#数据清理策略)
- [测试数据模板](#测试数据模板)

---

## 👤 测试账号

### 系统默认测试账号

系统提供以下测试账号，密码已预设（使用 bcrypt 哈希）：

| 角色 | 用户名 | 密码 | 权限说明 |
|------|--------|------|----------|
| **管理员** | `admin` | `admin123` | 全部权限，可以访问所有功能 |
| **技术经理** | `tech_manager` | `123456` | 任务审批权限，可以创建和审批任务 |
| **部门经理** | `dept_manager` | `123456` | 项目管理权限，可以创建、编辑、删除项目 |
| **工程师** | `engineer` | `123456` | 基础权限，只能查看和操作自己的任务 |

### 权限对照表

| 功能 | admin | tech_manager | dept_manager | engineer |
|------|-------|--------------|--------------|----------|
| 创建项目 | ✅ | ❌ | ✅ | ❌ |
| 编辑项目 | ✅ | ❌ | ✅ | ❌ |
| 删除项目 | ✅ | ❌ | ✅ | ❌ |
| 创建任务 | ✅ | ✅ | ✅ | ✅ |
| 编辑任务 | ✅ | ✅ | ✅ | 仅自己 |
| 删除任务 | ✅ | ✅ | ✅ | 仅自己 |
| 审批任务 | ✅ | ✅ | ❌ | ❌ |
| 组织架构 | ✅ | ❌ | ✅ | ❌ |
| 系统设置 | ✅ | ❌ | ❌ | ❌ |

### 获取测试账号

在测试中使用 `getTestUser` 函数获取测试账号：

```typescript
import { getTestUser } from '../../src/data/test-users';

// 获取管理员账号
const admin = getTestUser('admin');

// 获取技术经理账号
const techManager = getTestUser('tech_manager');

// 使用
await loginPage.login(admin.username, admin.password);
```

---

## 🎲 数据生成策略

### 唯一性保证

为避免测试数据冲突，所有生成的数据都包含时间戳：

```typescript
// ✅ 好：使用时间戳
const projectName = `测试项目_${Date.now()}`;

// ❌ 差：固定名称
const projectName = '测试项目';
```

### 随机数据生成

使用 `DataGenerator` 生成随机数据：

```typescript
import { generateUniqueId, generateProjectCode, generateDateRange } from '../../src/helpers/DataGenerator';

// 生成唯一ID
const id = generateUniqueId('PREFIX');

// 生成项目编码
const code = generateProjectCode();

// 生成日期范围
const { startDate, endDate } = generateDateRange(0, 7);
```

### Faker 集成

使用 `@faker-js/faker` 生成真实感数据：

```typescript
import { faker } from '@faker-js/faker';

const projectName = faker.company.buzzNoun();
const taskDescription = faker.lorem.sentence();
```

---

## 📦 测试数据模板

### 项目数据模板

**位置：** `src/data/test-projects.ts`

```typescript
export const PRODUCT_PROJECT_TEMPLATE: ProjectData = {
  name: '产品开发测试项目',
  description: '用于测试产品开发类项目功能',
  type: 'product'
};

export const MANAGEMENT_PROJECT_TEMPLATE: ProjectData = {
  name: '职能管理测试项目',
  description: '用于测试职能管理类项目功能',
  type: 'management'
};
```

**使用示例：**

```typescript
import { generateProjectData } from '../../src/data/test-projects';

const projectData = generateProjectData({
  name: '自定义项目名称',
  type: 'product'
});
```

### 任务数据模板

**位置：** `src/data/test-tasks.ts`

```typescript
export const BASIC_TASK_TEMPLATE: TaskData = {
  description: '基础测试任务',
  priority: 'medium',
  status: 'not_started'
};

export const HIGH_PRIORITY_TASK_TEMPLATE: TaskData = {
  description: '高优先级紧急任务',
  priority: 'high',
  status: 'not_started'
};
```

**使用示例：**

```typescript
import { generateTaskData } from '../../src/data/test-projects';

const taskData = generateTaskData({
  description: '自定义任务',
  priority: 'high'
});
```

---

## 🧹 数据清理策略

### 测试前清理

在每个测试前清理可能存在的数据：

```typescript
test.beforeEach(async ({ page }) => {
  // 登录
  await login(page, 'dept_manager');

  // 清理可能存在的测试数据
  await cleanupTestData(page);
});
```

### 测试后清理

在每个测试后清理创建的数据：

```typescript
test.afterEach(async ({ page }) => {
  // 通过 UI 删除测试创建的项目和任务
  await deleteTestProjects(page);
  await deleteTestTasks(page);
});
```

### 唯一数据策略

推荐使用唯一数据，避免清理：

```typescript
test('创建项目', async ({ page }) => {
  // 使用时间戳确保数据唯一
  const projectName = `测试项目_${Date.now()}`;

  // 创建项目
  await createProject(page, projectName);

  // 不需要清理，因为每次都是新数据
});
```

---

## 📝 数据类型定义

### ProjectData

```typescript
interface ProjectData {
  code?: string;           // 项目编码
  name: string;            // 项目名称（必填）
  description?: string;    // 项目描述
  type: 'product' | 'management';  // 项目类型
  members?: number[];      // 项目成员ID列表
  startDate?: string;      // 计划开始日期 (YYYY-MM-DD)
  endDate?: string;        // 计划结束日期 (YYYY-MM-DD)
}
```

### TaskData

```typescript
interface TaskData {
  projectId?: string;      // 项目ID
  memberId?: number;       // 负责人ID
  description: string;     // 任务描述（必填）
  startDate?: string;      // 计划开始日期
  endDate?: string;        // 计划结束日期
  priority?: 'high' | 'medium' | 'low';  // 优先级
  status?: 'not_started' | 'in_progress' | 'completed';  // 状态
  approvalStatus?: 'pending' | 'approved' | 'rejected';  // 审批状态
}
```

### TestUser

```typescript
interface TestUser {
  username: string;        // 用户名
  password: string;        // 密码
  role: 'admin' | 'tech_manager' | 'dept_manager' | 'engineer';  // 角色
  name?: string;          // 显示名称
}
```

---

## 🎯 实践建议

### 1. 使用数据工厂

```typescript
// ✅ 好：使用数据工厂
const project = generateProjectData({ name: '特殊项目' });

// ❌ 差：硬编码数据
const project = { name: '项目', code: 'PRJ001' };
```

### 2. 数据命名规范

```typescript
// 项目命名：包含类型和时间戳
`项目类型_描述_时间戳`
示例：`product_test_project_1640000000000`

// 任务命名：包含操作和时间戳
`操作_任务_时间戳`
示例：`create_test_task_1640000000000`
```

### 3. 日期处理

```typescript
// ✅ 好：使用相对日期
const { startDate, endDate } = generateDateRange(0, 7);

// ❌ 差：使用固定日期
const startDate = '2024-01-01';  // 可能会过期
```

### 4. 环境变量

敏感数据（如测试账号密码）通过环境变量配置：

```env
# .env
TEST_ADMIN_USERNAME=admin
TEST_ADMIN_PASSWORD=admin123
```

```typescript
// 读取环境变量
const username = process.env.TEST_ADMIN_USERNAME;
```

---

## 🔗 相关文档

- [测试指南](./TEST_GUIDE.md)
- [页面对象文档](./PAGE_OBJECTS.md)
- [数据生成器源码](../src/helpers/DataGenerator.ts)
