# 模块测试设计：任务管理模块

> **模块编号**: 04
> **模块名称**: 任务管理模块
> **需求文档**: REQ_04_task.md
> **创建日期**: 2026-03-20
> **版本**: 1.0

---

## 1. 模块概述

### 1.1 功能范围

| 子模块 | 功能描述 | 测试用例数 |
|--------|----------|------------|
| WBS任务CRUD | 24列规格、创建、编辑、删除 | 20 |
| 9种任务状态 | 状态判断、颜色、自动流转 | 12 |
| 日期计算 | 开始/结束/工期/周期计算 | 10 |
| 任务依赖 | 4种依赖类型、循环检测、级联 | 6 |
| 增强功能 | 拖拽、批量、进度聚合 | 5 |
| **总计** | | **53** |

---

## 2. API 测试设计

### 2.1 24列规格验证

#### API-TASK-001~024

```typescript
describe('API-TASK: 24列规格', () => {
  const columns24 = [
    { name: 'wbs_level', editable: true, type: 'number', range: '1-10' },
    { name: 'wbs_code', editable: false, type: 'string', pattern: /^\d+(\.\d+)*$/ },
    { name: 'description', editable: true, type: 'string', required: true },
    { name: 'status', editable: false, type: 'enum', values: 9 },
    { name: 'redmine_link', editable: true, type: 'url', rootOnly: true },
    { name: 'assignee_id', editable: true, type: 'reference' },
    { name: 'task_type', editable: true, type: 'enum', values: 12, inherit: true },
    { name: 'priority', editable: true, type: 'enum', values: ['urgent', 'high', 'medium', 'low'] },
    { name: 'predecessor_id', editable: true, type: 'reference' },
    { name: 'lag_days', editable: true, type: 'number' },
    { name: 'start_date', editable: 'conditional', type: 'date' },
    { name: 'duration', editable: true, type: 'number', min: 1 },
    { name: 'end_date', editable: false, type: 'date', calculated: true },
    { name: 'planned_duration', editable: false, type: 'number', calculated: true },
    { name: 'warning_days', editable: true, type: 'number', default: 3 },
    { name: 'actual_start_date', editable: true, type: 'date' },
    { name: 'actual_end_date', editable: true, type: 'date' },
    { name: 'actual_duration', editable: false, type: 'number', calculated: true },
    { name: 'full_time_ratio', editable: true, type: 'number', range: '0-100', default: 100 },
    { name: 'actual_cycle', editable: false, type: 'number', calculated: true },
    { name: 'project_id', editable: true, type: 'reference', required: true },
    { name: 'delay_count', editable: false, type: 'number' },
    { name: 'plan_change_count', editable: false, type: 'number' },
    { name: 'progress_record_count', editable: false, type: 'number' }
  ];

  test.each(columns24)('列 $name 规格正确', async ({ name, editable, type, required }) => {
    const task = await createTask();

    if (required) {
      // 缺少必填字段应失败
      const response = await request.post('/api/tasks', omit(taskData, name));
      expect(response.status).toBe(400);
    }

    if (!editable) {
      // 尝试修改只读字段应被忽略或失败
      const response = await request.put(`/api/tasks/${task.id}`, { [name]: 'modified' });
      expect(response.data.data[name]).toBe(task[name]); // 值不变
    }
  });
});
```

### 2.2 9种任务状态

#### API-STAT-001~009

```typescript
describe('API-STAT: 9种任务状态', () => {
  test('API-STAT-001: 待审批 - 计划变更等待审批', async () => {
    await loginAs('engineer');
    const task = await createTask({ start_date: '2026-04-01' });

    // 工程师修改计划
    await request.put(`/api/tasks/${task.id}`, {
      start_date: '2026-04-10',
      change_reason: '需求变更'
    });

    const response = await request.get(`/api/tasks/${task.id}`);
    expect(response.data.data.status).toBe('pending_approval');
    expect(response.data.data.plan_change_count).toBe(1);
  });

  test('API-STAT-002: 已驳回 - 变更被驳回', async () => {
    const task = await createPendingApprovalTask();

    // 审批人驳回
    await loginAs('tech_manager');
    await request.post(`/api/approvals/${task.approval_id}/reject`, {
      reason: '理由不充分'
    });

    const response = await request.get(`/api/tasks/${task.id}`);
    expect(response.data.data.status).toBe('rejected');
  });

  test('API-STAT-003: 未开始 - 无实际开始日期', async () => {
    const task = await createTask({
      start_date: '2026-04-01',
      actual_start_date: null
    });

    expect(task.status).toBe('not_started');
  });

  test('API-STAT-004: 进行中 - 有实际开始，无实际结束', async () => {
    const task = await createTask({
      start_date: '2026-04-01',
      end_date: '2026-04-10',
      actual_start_date: '2026-04-01',
      actual_end_date: null
    });

    expect(task.status).toBe('in_progress');
  });

  test('API-STAT-005: 提前完成 - 实际结束早于计划', async () => {
    const task = await createTask({
      end_date: '2026-04-10',
      actual_start_date: '2026-04-01',
      actual_end_date: '2026-04-08' // 早于计划
    });

    expect(task.status).toBe('early_completed');
  });

  test('API-STAT-006: 按时完成 - 实际等于计划', async () => {
    const task = await createTask({
      end_date: '2026-04-10',
      actual_start_date: '2026-04-01',
      actual_end_date: '2026-04-10' // 等于计划
    });

    expect(task.status).toBe('on_time_completed');
  });

  test('API-STAT-007: 延期预警 - 剩余<=预警天数', async () => {
    // 设置今天为 2026-04-08
    mockDate('2026-04-08');

    const task = await createTask({
      end_date: '2026-04-10',
      warning_days: 3,
      actual_end_date: null
    });

    // 剩余2天 <= 预警3天
    expect(task.status).toBe('delay_warning');
  });

  test('API-STAT-008: 已延迟 - 超过计划结束日期', async () => {
    // 设置今天为 2026-04-15
    mockDate('2026-04-15');

    const task = await createTask({
      end_date: '2026-04-10',
      actual_end_date: null
    });

    expect(task.status).toBe('delayed');
  });

  test('API-STAT-009: 超期完成 - 实际晚于计划', async () => {
    const task = await createTask({
      end_date: '2026-04-10',
      actual_end_date: '2026-04-15' // 晚于计划
    });

    expect(task.status).toBe('overdue_completed');
  });
});
```

### 2.3 WBS编码自动生成

#### API-TASK-025

```typescript
describe('API-TASK-025: WBS编码生成', () => {
  test('根任务编码从1开始', async () => {
    const project = await createProject();
    await clearTasks(project.id);

    const task = await createTask({ project_id: project.id, wbs_level: 1 });

    expect(task.wbs_code).toBe('1');
  });

  test('子任务编码格式为父编号.序号', async () => {
    const parent = await createTask({ wbs_code: '1' });

    const child1 = await createTask({ parent_id: parent.id, wbs_level: 2 });
    const child2 = await createTask({ parent_id: parent.id, wbs_level: 2 });

    expect(child1.wbs_code).toBe('1.1');
    expect(child2.wbs_code).toBe('1.2');
  });

  test('支持最多10级嵌套', async () => {
    let parentId = null;
    let wbsCode = '';

    for (let level = 1; level <= 10; level++) {
      const task = await createTask({ parent_id: parentId, wbs_level: level });
      wbsCode = task.wbs_code;
      parentId = task.id;
    }

    // 验证第10级编码格式
    expect(wbsCode.split('.').length).toBe(10);
  });

  test('删除任务后编号不重排', async () => {
    const t1 = await createTask({ wbs_level: 1 });
    const t2 = await createTask({ wbs_level: 1 });
    const t3 = await createTask({ wbs_level: 1 });

    expect([t1, t2, t3].map(t => t.wbs_code)).toEqual(['1', '2', '3']);

    // 删除 t2
    await request.delete(`/api/tasks/${t2.id}`);

    // 新任务应为 4，而不是重用 2
    const t4 = await createTask({ wbs_level: 1 });
    expect(t4.wbs_code).toBe('4');
  });
});
```

### 2.4 日期计算

#### API-DATE-001~005

```typescript
describe('API-DATE: 日期计算', () => {
  test('API-DATE-001: 有前置任务时开始日期自动计算', async () => {
    const predecessor = await createTask({
      start_date: '2026-04-01',
      duration: 5,
      end_date: '2026-04-05'
    });

    const task = await createTask({
      predecessor_id: predecessor.id,
      lag_days: 2
    });

    // 开始日期 = 前置结束 + lag_days = 2026-04-05 + 2 = 2026-04-07
    expect(task.start_date).toBe('2026-04-07');
    expect(task.is_start_date_editable).toBe(false);
  });

  test('API-DATE-002: 结束日期计算（跳过周末节假日）', async () => {
    // 设置节假日
    await setHolidays(['2026-04-06']); // 周一放假

    const task = await createTask({
      start_date: '2026-04-04', // 周六
      duration: 5,
      is_six_day_week: false
    });

    // 4/4(六)跳过, 4/5(日)跳过, 4/6(一)放假跳过
    // 4/7(二), 4/8(三), 4/9(四), 4/10(五), 4/11(六)跳过
    // 4/12(日)跳过, 4/13(一) -> 5个工作日
    expect(task.end_date).toBe('2026-04-13');
  });

  test('API-DATE-004: 实际工期（工作日）', async () => {
    const task = await createTask({
      actual_start_date: '2026-04-01', // 周二
      actual_end_date: '2026-04-06'    // 周日
    });

    // 工作日: 4/1, 4/2, 4/3 = 3天
    expect(task.actual_duration).toBe(3);
  });

  test('API-DATE-005: 实际周期（日历天）', async () => {
    const task = await createTask({
      actual_start_date: '2026-04-01',
      actual_end_date: '2026-04-06'
    });

    // 日历天: 6 - 1 + 1 = 6天
    expect(task.actual_cycle).toBe(6);
  });
});
```

### 2.5 任务依赖

#### API-DEP-001~006

```typescript
describe('API-DEP: 任务依赖', () => {
  test('API-DEP-005: 循环依赖检测', async () => {
    const t1 = await createTask();
    const t2 = await createTask({ predecessor_id: t1.id });
    const t3 = await createTask({ predecessor_id: t2.id });

    // 尝试创建循环: t3 -> t1
    const response = await request.put(`/api/tasks/${t1.id}`, {
      predecessor_id: t3.id
    });

    expect(response.status).toBe(400);
    expect(response.data.error.code).toBe('CIRCULAR_DEPENDENCY');
  });

  test('API-DEP-006: 级联更新', async () => {
    const t1 = await createTask({
      start_date: '2026-04-01',
      duration: 5,
      end_date: '2026-04-05'
    });
    const t2 = await createTask({
      predecessor_id: t1.id
      // start_date 应为 2026-04-05 + 1 = 2026-04-06
    });

    // 修改前置任务工期
    await request.put(`/api/tasks/${t1.id}`, {
      duration: 10,
      end_date: '2026-04-10'
    });

    // 验证后续任务自动调整
    const updated = await request.get(`/api/tasks/${t2.id}`);
    expect(updated.data.data.start_date).toBe('2026-04-11');
  });
});
```

---

## 3. UI/E2E 测试设计

### 3.1 WBS表格

#### UI-TASK-001~012

```typescript
describe('UI-TASK: WBS表格', () => {
  test('UI-TASK-001: 24列显示正确', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/projects/1/tasks');

    const table = page.locator('[data-testid="wbs-table"]');

    // 验证可编辑列有蓝色边框
    const editableCells = table.locator('.editable-column');
    await expect(editableCells.first()).toHaveCSS('border-left-color', /blue/);

    // 验证只读列有灰色边框
    const readonlyCells = table.locator('.readonly-column');
    await expect(readonlyCells.first()).toHaveCSS('border-left-color', /gray/);
  });

  test('UI-TASK-002: WBS编码自动显示', async ({ page }) => {
    await page.goto('/projects/1/tasks');

    // 点击添加根任务
    await page.click('[data-testid="add-root-task"]');
    await page.fill('[name="description"]', '新任务');
    await page.click('[type="submit"]');

    // 验证WBS编码自动生成
    const wbsCode = page.locator('.wbs-code').last();
    await expect(wbsCode).not.toBeEmpty();
  });

  test('UI-STAT: 9种状态颜色', async ({ page }) => {
    await page.goto('/projects/1/tasks');

    const statusColors = {
      'pending_approval': /purple/,   // 紫色
      'rejected': /red/,             // 红色
      'not_started': /gray/,         // 灰色
      'in_progress': /blue/,         // 蓝色
      'early_completed': /green/,    // 绿色
      'on_time_completed': /cyan/,   // 青色
      'delay_warning': /orange/,     // 橙色
      'delayed': /red/,              // 红色
      'overdue_completed': /orange/  // 橙色
    };

    for (const [status, colorPattern] of Object.entries(statusColors)) {
      const cell = page.locator(`[data-status="${status}"]`);
      if (await cell.count() > 0) {
        await expect(cell).toHaveCSS('background-color', colorPattern);
      }
    }
  });

  test('UI-ENH-001: 拖拽排序', async ({ page }) => {
    await page.goto('/projects/1/tasks');

    const row1 = page.locator('.task-row').first();
    const row2 = page.locator('.task-row').nth(1);

    await row1.dragTo(row2);

    // 验证顺序已交换
    await expect(page.locator('.task-row').first()).toHaveText(/原第二行的内容/);
  });

  test('UI-ENH-003: 列显示/隐藏', async ({ page }) => {
    await page.goto('/projects/1/tasks');

    // 打开列配置
    await page.click('[data-testid="column-config-btn"]');

    // 隐藏某列
    await page.uncheck('checkbox[value="redmine_link"]');
    await page.click('button:has-text("应用")');

    // 验证列已隐藏
    await expect(page.locator('th:has-text("Redmine链接")')).not.toBeVisible();
  });
});
```

---

## 4. 集成测试设计

### 4.1 INT-STAT-001: 状态自动流转

```typescript
describe('INT-STAT-001: 状态流转', () => {
  test('工程师修改 → 待审批 → 审批通过 → 状态更新', async () => {
    // 工程师修改任务
    await loginAs('engineer');
    const task = await createTask({ start_date: '2026-04-01' });

    await request.put(`/api/tasks/${task.id}`, {
      start_date: '2026-04-10',
      change_reason: '需求变更'
    });

    // 验证状态变为待审批
    let response = await request.get(`/api/tasks/${task.id}`);
    expect(response.data.data.status).toBe('pending_approval');

    // 技术经理审批通过
    await loginAs('tech_manager');
    const approvals = await request.get('/api/approvals/pending');
    const approval = approvals.data.data.items.find(a => a.task_id === task.id);

    await request.post(`/api/approvals/${approval.id}/approve`);

    // 验证状态恢复，计划更新
    await loginAs('engineer');
    response = await request.get(`/api/tasks/${task.id}`);
    expect(response.data.data.status).toBe('not_started');
    expect(response.data.data.start_date).toBe('2026-04-10');
  });
});
```

### 4.2 INT-DEP-001: 依赖级联更新

```typescript
describe('INT-DEP-001: 依赖级联', () => {
  test('修改前置任务日期，后续任务自动调整', async () => {
    // 创建依赖链: t1 -> t2 -> t3
    const t1 = await createTask({ duration: 5, end_date: '2026-04-05' });
    const t2 = await createTask({ predecessor_id: t1.id });
    const t3 = await createTask({ predecessor_id: t2.id });

    // 修改 t1 工期
    await request.put(`/api/tasks/${t1.id}`, {
      duration: 10,
      end_date: '2026-04-10'
    });

    // 验证 t2, t3 都自动调整
    const updatedT2 = await request.get(`/api/tasks/${t2.id}`);
    const updatedT3 = await request.get(`/api/tasks/${t3.id}`);

    expect(updatedT2.data.data.start_date).toBe('2026-04-11');
    // t3 应该也更新
  });
});
```

### 4.3 INT-ENH-001: 进度自动聚合

```typescript
describe('INT-ENH-001: 进度聚合', () => {
  test('子任务完成 → 父任务进度聚合', async () => {
    const parent = await createTask();
    const child1 = await createTask({ parent_id: parent.id, duration: 5 });
    const child2 = await createTask({ parent_id: parent.id, duration: 5 });

    // 完成子任务1
    await request.put(`/api/tasks/${child1.id}`, {
      actual_end_date: '2026-04-05',
      status: 'on_time_completed'
    });

    // 验证父任务进度 = 50%
    const response = await request.get(`/api/tasks/${parent.id}`);
    expect(response.data.data.progress).toBe(50);
  });
});
```

---

## 5. 测试数据

```typescript
export const testTasks = {
  standard: {
    wbs_level: 1,
    description: '标准测试任务',
    task_type: 'firmware',
    priority: 'medium',
    start_date: '2026-04-01',
    duration: 5,
    project_id: 'TEST-PROJECT'
  },

  statusScenarios: {
    pendingApproval: {
      status: 'pending_approval',
      // 有未完成的变更申请
    },
    delayed: {
      start_date: '2026-03-01',
      end_date: '2026-03-10',
      actual_end_date: null,
      // 今天 > 2026-03-10
    },
    // ... 其他状态场景
  },

  edgeCases: {
    maxLevel: { wbs_level: 10 },
    maxDuration: { duration: 365 },
    circularDependency: [
      { id: 't1', predecessor_id: 't3' },
      { id: 't2', predecessor_id: 't1' },
      { id: 't3', predecessor_id: 't2' }
    ]
  }
};
```

---

## 6. 验收标准

| 需求ID | 验收标准 | 优先级 |
|--------|----------|--------|
| TASK-001 | 24列数据正确显示和编辑 | P0 |
| TASK-002 | WBS编码自动生成，格式正确 | P0 |
| STATUS-ALL | 9种状态判断正确 | P0 |
| DATE-001 | 有前置任务时开始日期自动计算 | P0 |
| DATE-002 | 结束日期计算跳过周末节假日 | P0 |
| DEP-005 | 循环依赖检测正确 | P0 |

---

**相关文档**:
- [需求文档](../../requirements/modules/REQ_04_task.md)
- [需求-测试映射](../REQUIREMENT_TRACEABILITY.md)
