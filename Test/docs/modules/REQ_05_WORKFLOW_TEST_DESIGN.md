# 模块测试设计：工作流模块

> **模块编号**: 05
> **模块名称**: 工作流模块
> **需求文档**: REQ_05_workflow.md
> **创建日期**: 2026-03-20
> **版本**: 1.0

---

## 1. 模块概述

### 1.1 功能范围

| 子模块 | 功能描述 | 测试用例数 |
|--------|----------|------------|
| 计划变更管理 | 变更记录、审批规则 | 6 |
| 审批流程 | 提交、审批、超时 | 8 |
| 延期管理 | 自动判断、原因记录 | 6 |
| **总计** | | **20** |

---

## 2. API 测试设计

### 2.1 计划变更 API

#### API-CHG-001~006

```typescript
describe('API-CHG: 计划变更', () => {
  test('API-CHG-001: 记录哪些字段变更', async () => {
    const task = await createTask({
      start_date: '2026-04-01',
      end_date: '2026-04-10'
    });

    await loginAs('tech_manager');
    await request.put(`/api/tasks/${task.id}`, {
      start_date: '2026-04-05',
      end_date: '2026-04-15'
    });

    const changes = await request.get(`/api/tasks/${task.id}/changes`);

    // 应记录开始日期和结束日期的变更
    expect(changes.data.data.items).toContainEqual(
      expect.objectContaining({
        field: 'start_date',
        old_value: '2026-04-01',
        new_value: '2026-04-05'
      })
    );
  });

  test('API-CHG-002: 工程师修改需审批', async () => {
    await loginAs('engineer');
    const task = await createTask();

    const response = await request.put(`/api/tasks/${task.id}`, {
      start_date: '2026-04-10',
      change_reason: '需求变更'
    });

    // 返回待审批状态
    expect(response.data.data.status).toBe('pending_approval');
    expect(response.data.data.plan_change_count).toBe(1);
  });

  test('API-CHG-003: 技术经理直接生效', async () => {
    await loginAs('tech_manager');
    const task = await createTask();

    const response = await request.put(`/api/tasks/${task.id}`, {
      start_date: '2026-04-10'
    });

    // 直接生效，无需审批
    expect(response.data.data.status).toBe('not_started');
    expect(response.data.data.start_date).toBe('2026-04-10');
  });

  test('API-CHG-004: 变更原因必填（工程师）', async () => {
    await loginAs('engineer');
    const task = await createTask();

    const response = await request.put(`/api/tasks/${task.id}`, {
      start_date: '2026-04-10'
      // 缺少 change_reason
    });

    expect(response.status).toBe(400);
    expect(response.data.error.code).toBe('CHANGE_REASON_REQUIRED');
  });

  test('API-CHG-005: 变更次数统计', async () => {
    const task = await createTask({ plan_change_count: 0 });

    // 提交变更（无论通过还是驳回，都计数）
    await request.put(`/api/tasks/${task.id}`, { start_date: '2026-04-10', change_reason: '...' });
    await request.put(`/api/tasks/${task.id}`, { start_date: '2026-04-15', change_reason: '...' });

    const response = await request.get(`/api/tasks/${task.id}`);
    expect(response.data.data.plan_change_count).toBe(2);
  });
});
```

### 2.2 审批流程 API

#### API-APRV-001~005

```typescript
describe('API-APRV: 审批流程', () => {
  test('API-APRV-001: 提交审批', async () => {
    await loginAs('engineer');
    const task = await createTask();

    const response = await request.post(`/api/tasks/${task.id}/changes`, {
      changes: { start_date: '2026-04-10' },
      reason: '需求变更'
    });

    expect(response.status).toBe(201);
    expect(response.data.data).toMatchObject({
      status: 'pending',
      approver_id: expect.any(Number)
    });
  });

  test('API-APRV-002: 审批通过', async () => {
    const { task, approval } = await createPendingApproval();

    await loginAs('tech_manager');
    const response = await request.post(`/api/approvals/${approval.id}/approve`);

    expect(response.status).toBe(200);

    // 验证任务已更新
    const taskResponse = await request.get(`/api/tasks/${task.id}`);
    expect(taskResponse.data.data.start_date).toBe(approval.new_value.start_date);
  });

  test('API-APRV-003: 审批驳回', async () => {
    const { task, approval } = await createPendingApproval();

    await loginAs('tech_manager');
    const response = await request.post(`/api/approvals/${approval.id}/reject`, {
      reason: '理由不充分'
    });

    expect(response.status).toBe(200);

    // 验证任务保持原值
    const taskResponse = await request.get(`/api/tasks/${task.id}`);
    expect(taskResponse.data.data.status).toBe('rejected');
    expect(taskResponse.data.data.start_date).toBe(task.original_start_date);
  });

  test('API-APRV-004: 审批超时(7天)', async () => {
    const { approval } = await createPendingApproval();

    // 模拟8天后
    mockDate.addDays(8);

    const response = await request.get('/api/approvals/pending');
    const pending = response.data.data.items.find(a => a.id === approval.id);

    expect(pending.is_timeout).toBe(true);
    expect(pending.timeout_days).toBe(1);
  });

  test('API-APRV-005: 批量审批', async () => {
    // 创建多个待审批
    const approvals = await Promise.all([
      createPendingApproval(),
      createPendingApproval(),
      createPendingApproval()
    ]);

    await loginAs('tech_manager');
    const response = await request.post('/api/approvals/batch-approve', {
      approval_ids: approvals.map(a => a.approval.id)
    });

    expect(response.status).toBe(200);
    expect(response.data.data.approved_count).toBe(3);
  });
});
```

### 2.3 延期管理 API

#### API-DELAY-001~004

```typescript
describe('API-DELAY: 延期管理', () => {
  test('API-DELAY-001: 延期自动判断', async () => {
    // 今天是 2026-04-15
    mockDate('2026-04-15');

    const task = await createTask({
      end_date: '2026-04-10',
      actual_end_date: null
    });

    // 运行延期检测任务
    await runScheduledTask('check-delayed-tasks');

    const response = await request.get(`/api/tasks/${task.id}`);
    expect(response.data.data.status).toBe('delayed');
    expect(response.data.data.delay_count).toBe(1);
  });

  test('API-DELAY-002: 延期次数智能累计', async () => {
    const task = await createTask({ end_date: '2026-04-10', delay_count: 1 });

    // 刷新计划后再次延期
    await request.put(`/api/tasks/${task.id}`, {
      end_date: '2026-04-20',
      version: task.version
    });

    mockDate('2026-04-25');
    await runScheduledTask('check-delayed-tasks');

    const response = await request.get(`/api/tasks/${task.id}`);
    expect(response.data.data.delay_count).toBe(2); // 增加了
  });

  test('API-DELAY-003: 延期原因记录', async () => {
    const task = await createTask({ status: 'delayed' });

    const response = await request.post(`/api/tasks/${task.id}/delays`, {
      reason: '等待第三方接口',
      delay_days: 5
    });

    expect(response.status).toBe(201);

    // 延期原因只能增加，不能删除
    const delays = await request.get(`/api/tasks/${task.id}/delays`);
    expect(delays.data.data.items.length).toBe(1);
  });

  test('API-DELAY-004: 延期通知规则', async () => {
    const task = await createTask({ end_date: '2026-04-10' });

    mockDate('2026-04-11');
    await runScheduledTask('check-delayed-tasks');

    // 首次延期应发送通知
    const notifications = await request.get('/api/notifications', {
      type: 'delay',
      task_id: task.id
    });
    expect(notifications.data.data.items.length).toBe(1);

    // 每增加7天再通知
    mockDate('2026-04-18');
    await runScheduledTask('check-delayed-tasks');
    // 应该有第二条通知
  });
});
```

---

## 3. UI/E2E 测试设计

### 3.1 审批界面

#### UI-APRV-001~003

```typescript
describe('UI-APRV: 审批界面', () => {
  test('UI-APRV-001: 待审批列表', async ({ page }) => {
    await loginAs(page, 'tech_manager');
    await page.goto('/approvals');

    // 验证Tab导航
    await expect(page.locator('text=待审批')).toBeVisible();
    await expect(page.locator('text=我发起的')).toBeVisible();
    await expect(page.locator('text=已处理')).toBeVisible();

    // 点击待审批
    await page.click('text=待审批');
    await expect(page.locator('[data-testid="approval-list"]')).toBeVisible();
  });

  test('UI-APRV-002: 审批操作', async ({ page }) => {
    await loginAs(page, 'tech_manager');
    await page.goto('/approvals');

    // 点击审批项
    await page.click('.approval-item:first-child');

    // 验证变更对比显示
    await expect(page.locator('.change-comparison')).toBeVisible();

    // 通过
    await page.click('button:has-text("通过")');
    await expect(page.locator('text=审批成功')).toBeVisible();
  });

  test('UI-APRV-003: 批量审批', async ({ page }) => {
    await loginAs(page, 'tech_manager');
    await page.goto('/approvals');

    // 全选
    await page.click('[data-testid="select-all"]');

    // 批量通过
    await page.click('button:has-text("批量通过")');
    await expect(page.locator('text=已批量处理')).toBeVisible();
  });
});
```

---

## 4. 集成测试设计

### 4.1 INT-CHG-001: 完整审批流程

```typescript
describe('INT-CHG-001: 完整审批流程', () => {
  test('工程师提交 → 技术经理审批 → 通知 → 状态更新', async () => {
    // 1. 工程师提交变更
    await loginAs('engineer');
    const task = await createTask({ start_date: '2026-04-01' });

    await request.put(`/api/tasks/${task.id}`, {
      start_date: '2026-04-10',
      change_reason: '需求变更'
    });

    // 2. 验证任务状态
    let response = await request.get(`/api/tasks/${task.id}`);
    expect(response.data.data.status).toBe('pending_approval');

    // 3. 技术经理收到通知
    await loginAs('tech_manager');
    const notifications = await request.get('/api/notifications');
    expect(notifications.data.data.items).toContainEqual(
      expect.objectContaining({
        type: 'APPROVAL_PENDING',
        task_id: task.id
      })
    );

    // 4. 技术经理审批通过
    const approvals = await request.get('/api/approvals/pending');
    const approval = approvals.data.data.items.find(a => a.task_id === task.id);

    await request.post(`/api/approvals/${approval.id}/approve`);

    // 5. 工程师收到结果通知
    await loginAs('engineer');
    const resultNotifications = await request.get('/api/notifications');
    expect(resultNotifications.data.data.items).toContainEqual(
      expect.objectContaining({
        type: 'APPROVAL_APPROVED'
      })
    );

    // 6. 验证任务已更新
    response = await request.get(`/api/tasks/${task.id}`);
    expect(response.data.data.start_date).toBe('2026-04-10');
    expect(response.data.data.status).toBe('not_started');
  });
});
```

---

## 5. 测试数据

```typescript
export const testWorkflows = {
  approval: {
    changeRequest: {
      changes: { start_date: '2026-04-10', end_date: '2026-04-20' },
      reason: '需求变更，工期延长'
    },
    rejection: {
      reason: '变更理由不充分，请补充说明'
    }
  },
  delay: {
    reasons: [
      '等待第三方接口',
      '需求变更',
      '技术难点攻关',
      '资源不足'
    ]
  }
};
```

---

**相关文档**:
- [需求文档](../../requirements/modules/REQ_05_workflow.md)
- [需求-测试映射](../REQUIREMENT_TRACEABILITY.md)
