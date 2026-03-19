# 模块测试设计：项目管理模块

> **模块编号**: 03
> **模块名称**: 项目管理模块
> **需求文档**: REQ_03_project.md
> **创建日期**: 2026-03-20
> **版本**: 1.0

---

## 1. 模块概述

### 1.1 功能范围

| 子模块 | 功能描述 | 测试用例数 |
|--------|----------|------------|
| 项目CRUD | 创建、编辑、删除、列表、详情 | 12 |
| 项目成员 | 添加、移除、数据隔离 | 6 |
| 里程碑 | CRUD、状态管理 | 6 |
| 时间线 | 时间轴、任务节点、拖拽 | 8 |
| 节假日 | CRUD、批量设置 | 4 |
| **总计** | | **36** |

---

## 2. API 测试设计

### 2.1 项目 CRUD

#### API-PROJ-001~007

```typescript
describe('API-PROJ: 项目CRUD', () => {
  test('API-PROJ-001: 创建项目 - 必填字段验证', async () => {
    const response = await request.post('/api/projects', {
      code: 'PRJ-001',
      name: '测试项目',
      project_type: 'product_dev',
      planned_start_date: '2026-04-01',
      planned_end_date: '2026-06-30'
    });

    expect(response.status).toBe(201);
    expect(response.data.data).toMatchObject({
      id: expect.any(String),
      code: 'PRJ-001',
      version: 1
    });
  });

  test('API-PROJ-002: 项目代号全局唯一', async () => {
    await createProject({ code: 'UNIQUE-001' });

    const response = await request.post('/api/projects', {
      code: 'UNIQUE-001', // 重复
      ...
    });

    expect(response.status).toBe(409);
  });

  test('API-PROJ-003: 结束日期不能早于开始日期', async () => {
    const response = await request.post('/api/projects', {
      planned_start_date: '2026-06-01',
      planned_end_date: '2026-04-01', // 早于开始
      ...
    });

    expect(response.status).toBe(400);
  });

  test('API-PROJ-004: 版本控制 - 冲突返回409', async () => {
    const project = await createProject();

    // 两个请求同时更新
    const [r1, r2] = await Promise.all([
      request.put(`/api/projects/${project.id}`, { name: '更新1', version: 1 }),
      request.put(`/api/projects/${project.id}`, { name: '更新2', version: 1 })
    ]);

    // 一个成功，一个冲突
    expect([r1.status, r2.status]).toContain(409);
  });

  test('API-PROJ-005: 有任务的项目不能删除', async () => {
    const project = await createProject();
    await createTask({ project_id: project.id });

    const response = await request.delete(`/api/projects/${project.id}`);

    expect(response.status).toBe(400);
    expect(response.data.error.code).toBe('PROJECT_HAS_TASKS');
  });
});
```

### 2.2 里程碑 API

#### API-MILE-001~006

```typescript
describe('API-MILE: 里程碑', () => {
  test('API-MILE-001: 创建里程碑', async () => {
    const project = await createProject();

    const response = await request.post(`/api/projects/${project.id}/milestones`, {
      name: '需求确认',
      target_date: '2026-04-15',
      completion_percentage: 0
    });

    expect(response.status).toBe(201);
  });

  test('API-MILE-003: 状态自动判断', async () => {
    // 待处理: 0%
    // 进行中: 1-99%
    // 已达成: 100%
    // 已逾期: 目标日期 < 今天 且 < 100%
  });
});
```

### 2.3 时间线 API

#### API-TL-001~004

```typescript
describe('API-TL: 时间线', () => {
  test('API-TL-001: 创建时间轴', async () => {
    const project = await createProject();

    const response = await request.post(`/api/projects/${project.id}/timelines`, {
      name: '开发进度',
      start_date: '2026-04-01',
      end_date: '2026-06-30',
      type: 'tech_stack'
    });

    expect(response.status).toBe(201);
  });

  test('API-TL-002: 拖拽更新任务时间', async () => {
    const { timeline, task } = await createTimelineWithTask();

    const response = await request.put(`/api/timeline-tasks/${task.id}`, {
      start_date: '2026-04-10', // 拖拽后新日期
      end_date: '2026-04-20'
    });

    expect(response.status).toBe(200);
  });

  test('API-TL-004: 任务条状态映射', async () => {
    // WBS 9种状态 → 时间线 5种状态
    const mapping = {
      'pending_approval': 'not_started',
      'rejected': 'not_started',
      'not_started': 'not_started',
      'in_progress': 'in_progress',
      'early_completed': 'completed',
      'on_time_completed': 'completed',
      'overdue_completed': 'completed',
      'delay_warning': 'delayed',
      'delayed': 'delayed'
    };

    for (const [wbsStatus, timelineStatus] of Object.entries(mapping)) {
      const task = await createTask({ status: wbsStatus });
      const response = await request.get(`/api/timeline-tasks/${task.id}`);
      expect(response.data.data.display_status).toBe(timelineStatus);
    }
  });
});
```

---

## 3. UI/E2E 测试设计

### 3.1 项目列表

#### UI-PROJ-001~004

```typescript
describe('UI-PROJ: 项目管理', () => {
  test('UI-PROJ-001: 项目卡片网格展示', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/projects');

    // 验证网格布局
    const grid = page.locator('[data-testid="project-grid"]');
    await expect(grid).toHaveCSS('display', 'grid');

    // 验证卡片内容
    const card = grid.locator('.project-card').first();
    await expect(card.locator('.project-code')).toBeVisible();
    await expect(card.locator('.project-status')).toBeVisible();
    await expect(card.locator('.progress-bar')).toBeVisible();
  });

  test('UI-PROJ-002: 创建项目对话框', async ({ page }) => {
    await page.goto('/projects');
    await page.click('[data-testid="new-project-btn"]');

    // 验证分组表单
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog.locator('text=基本信息')).toBeVisible();
    await expect(dialog.locator('text=时间规划')).toBeVisible();
  });

  test('UI-PROJ-003: 删除项目二次确认', async ({ page }) => {
    await page.goto('/projects/1');

    // 点击删除
    await page.click('[data-testid="delete-project-btn"]');

    // 验证确认对话框
    await expect(page.locator('text=确认删除')).toBeVisible();
    await page.click('button:has-text("取消")');
    // 项目仍然存在
  });
});
```

### 3.2 时间线

#### UI-TL-001~006

```typescript
describe('UI-TL: 时间线', () => {
  test('UI-TL-003: 拖拽任务条', async ({ page }) => {
    await page.goto('/projects/1/timeline');

    const taskBar = page.locator('.timeline-task-bar').first();
    const initialPosition = await taskBar.boundingBox();

    // 拖拽
    await taskBar.dragTo(page.locator('.timeline-day-column').nth(5));

    const newPosition = await taskBar.boundingBox();
    expect(newPosition.x).not.toBe(initialPosition.x);
  });

  test('UI-TL-005: 缩放视图切换', async ({ page }) => {
    await page.goto('/projects/1/timeline');

    // 日视图
    await page.click('button:has-text("日视图")');
    await expect(page.locator('.day-width-60')).toBeVisible();

    // 周视图
    await page.click('button:has-text("周视图")');
    await expect(page.locator('.day-width-25')).toBeVisible();

    // 月视图
    await page.click('button:has-text("月视图")');
    await expect(page.locator('.day-width-8')).toBeVisible();
  });
});
```

---

## 4. 集成测试设计

### 4.1 INT-PROJ-001: 数据隔离

```typescript
describe('INT-PROJ-001: 项目数据隔离', () => {
  test('用户只能看到参与的项目', async () => {
    // 创建两个项目
    const project1 = await createProject({ member_ids: ['user1', 'user2'] });
    const project2 = await createProject({ member_ids: ['user3'] });

    // user1 登录
    await loginAs('user1');
    const response = await request.get('/api/projects');

    // 只能看到 project1
    const projectIds = response.data.data.items.map(p => p.id);
    expect(projectIds).toContain(project1.id);
    expect(projectIds).not.toContain(project2.id);
  });
});
```

---

## 5. 测试数据

```typescript
export const testProjects = {
  standard: {
    code: 'TEST-PRJ',
    name: '测试项目',
    project_type: 'product_dev',
    planned_start_date: '2026-04-01',
    planned_end_date: '2026-06-30'
  },
  milestones: [
    { name: '需求确认', target_date: '2026-04-15', completion_percentage: 0 },
    { name: '设计完成', target_date: '2026-05-01', completion_percentage: 0 },
    { name: '开发完成', target_date: '2026-06-01', completion_percentage: 0 },
    { name: '测试完成', target_date: '2026-06-20', completion_percentage: 0 }
  ]
};
```

---

**相关文档**:
- [需求文档](../../requirements/modules/REQ_03_project.md)
- [需求-测试映射](../REQUIREMENT_TRACEABILITY.md)
