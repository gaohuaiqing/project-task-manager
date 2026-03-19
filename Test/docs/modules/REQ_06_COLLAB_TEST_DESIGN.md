# 模块测试设计：协作模块

> **模块编号**: 06
> **模块名称**: 协作模块
> **需求文档**: REQ_06_collaboration.md
> **创建日期**: 2026-03-20
> **版本**: 1.0

---

## 1. 模块概述

### 1.1 功能范围

| 子模块 | 功能描述 | 测试用例数 |
|--------|----------|------------|
| 实时协作 | 数据同步、在线状态 | 5 |
| 版本控制 | 乐观锁、冲突检测 | 4 |
| 批量操作 | 批量查询、缓存预热 | 4 |
| 缓存管理 | Redis、LRU降级 | 4 |
| **总计** | | **17** |

---

## 2. API 测试设计

### 2.1 实时协作 API

#### API-COLL-001~003

```typescript
describe('API-COLL: 实时协作', () => {
  test('API-COLL-001: 数据同步延迟 < 300ms', async () => {
    const ws1 = await connectWebSocket('user1');
    const ws2 = await connectWebSocket('user2');

    // user1 修改任务
    const startTime = Date.now();
    await request.put('/api/tasks/1', { status: 'in_progress' });

    // user2 收到更新
    const message = await ws2.waitForMessage('task_updated', { timeout: 500 });
    const latency = Date.now() - startTime;

    expect(latency).toBeLessThan(300);
    expect(message.data.status).toBe('in_progress');

    ws1.close();
    ws2.close();
  });

  test('API-COLL-002: 消息去重', async () => {
    const ws = await connectWebSocket('user1');

    // user1 自己修改任务
    await request.put('/api/tasks/1', { status: 'in_progress' });

    // 不应该收到自己发出的消息
    const message = await ws.waitForMessage('task_updated', { timeout: 1000 });
    expect(message).toBeNull(); // 不应该收到

    ws.close();
  });

  test('API-COLL-003: 在线状态', async () => {
    // 用户登录
    const ws = await connectWebSocket('user1');

    // 检查在线状态
    const response = await request.get('/api/online-users');
    expect(response.data.data).toContainEqual(
      expect.objectContaining({ user_id: 'user1', status: 'online' })
    );

    // 5分钟无操作 → 离开
    mockTime.advance(5 * 60 * 1000);
    const response2 = await request.get('/api/online-users');
    expect(response2.data.data).toContainEqual(
      expect.objectContaining({ user_id: 'user1', status: 'away' })
    );

    // 断开连接 → 离线
    ws.close();
    const response3 = await request.get('/api/online-users');
    expect(response3.data.data).not.toContainEqual(
      expect.objectContaining({ user_id: 'user1' })
    );
  });
});
```

### 2.2 版本控制 API

#### API-VER-001~003

```typescript
describe('API-VER: 版本控制', () => {
  test('API-VER-001: 乐观锁机制', async () => {
    const task = await createTask({ version: 1 });

    // 带正确版本号更新
    const response = await request.put(`/api/tasks/${task.id}`, {
      status: 'in_progress',
      version: 1
    });

    expect(response.status).toBe(200);
    expect(response.data.data.version).toBe(2); // 版本号+1
  });

  test('API-VER-002: 冲突检测(409)', async () => {
    const task = await createTask({ version: 1 });

    // 两个请求同时更新（版本冲突）
    const [r1, r2] = await Promise.all([
      request.put(`/api/tasks/${task.id}`, { status: 'in_progress', version: 1 }),
      request.put(`/api/tasks/${task.id}`, { status: 'completed', version: 1 })
    ]);

    // 一个成功，一个冲突
    const statuses = [r1.status, r2.status].sort();
    expect(statuses).toEqual([200, 409]);

    // 409响应应包含当前最新数据
    const conflictResponse = r1.status === 409 ? r1 : r2;
    expect(conflictResponse.data).toHaveProperty('current_data');
    expect(conflictResponse.data.current_data.version).toBe(2);
  });

  test('API-VER-003: 版本历史记录', async () => {
    const task = await createTask();

    // 多次更新
    await request.put(`/api/tasks/${task.id}`, { status: 'in_progress', version: 1 });
    await request.put(`/api/tasks/${task.id}`, { status: 'completed', version: 2 });

    // 查询版本历史
    const response = await request.get(`/api/tasks/${task.id}/versions`);

    expect(response.data.data.items.length).toBe(2);
    expect(response.data.data.items[0].version).toBe(3);
    expect(response.data.data.items[1].version).toBe(2);
  });
});
```

### 2.3 批量操作 API

#### API-BATCH-001~004

```typescript
describe('API-BATCH: 批量操作', () => {
  test('API-BATCH-001: 批量获取项目', async () => {
    const projectIds = ['p1', 'p2', 'p3'];

    const response = await request.post('/api/batch/projects', {
      ids: projectIds
    });

    expect(response.status).toBe(200);
    expect(response.data.data.items.length).toBe(3);
    expect(response.data.data.items.map(p => p.id)).toEqual(projectIds);
  });

  test('API-BATCH-002: 批量获取任务', async () => {
    const taskIds = ['t1', 't2', 't3', 't4', 't5'];

    const response = await request.post('/api/batch/wbs-tasks', {
      ids: taskIds
    });

    expect(response.status).toBe(200);
    expect(response.data.data.items.length).toBe(5);
  });

  test('API-BATCH-003: 混合批量查询', async () => {
    const response = await request.post('/api/batch/mixed', {
      projects: ['p1', 'p2'],
      tasks: ['t1', 't2'],
      members: ['m1']
    });

    expect(response.status).toBe(200);
    expect(response.data.data).toMatchObject({
      projects: expect.any(Array),
      tasks: expect.any(Array),
      members: expect.any(Array)
    });
  });

  test('API-BATCH-004: 缓存预热', async () => {
    const response = await request.post('/api/batch/cache/warmup', {
      project_ids: ['p1', 'p2'],
      member_ids: ['m1', 'm2']
    });

    expect(response.status).toBe(200);

    // 验证缓存已预热
    const cacheStatus = await request.get('/api/cache/status');
    expect(cacheStatus.data.data.warmed_keys).toContain('project:p1');
  });
});
```

### 2.4 缓存管理 API

#### API-CACHE-001~002

```typescript
describe('API-CACHE: 缓存管理', () => {
  test('API-CACHE-001: Redis主缓存', async () => {
    // 首次查询
    const start1 = Date.now();
    await request.get('/api/projects');
    const time1 = Date.now() - start1;

    // 第二次查询（应命中缓存）
    const start2 = Date.now();
    await request.get('/api/projects');
    const time2 = Date.now() - start2;

    // 缓存命中应更快
    expect(time2).toBeLessThan(time1);
  });

  test('API-CACHE-002: LRU降级', async () => {
    // 模拟Redis不可用
    await mockRedisDown();

    // 请求仍应成功（使用内存缓存）
    const response = await request.get('/api/projects');
    expect(response.status).toBe(200);

    // 验证使用了降级缓存
    const cacheStatus = await request.get('/api/cache/status');
    expect(cacheStatus.data.data.fallback_mode).toBe(true);
    expect(cacheStatus.data.data.cache_type).toBe('lru');
  });
});
```

---

## 3. UI/E2E 测试设计

### 3.1 实时协作

#### UI-COLL-001

```typescript
describe('UI-COLL: 实时协作', () => {
  test('UI-COLL-001: 多人在线状态', async ({ browser }) => {
    // 打开两个浏览器上下文
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // 两个用户登录
    await loginAs(page1, 'user1');
    await loginAs(page2, 'user2');

    // user2 查看在线用户
    await page2.click('[data-testid="online-users"]');
    await expect(page2.locator('text=user1')).toBeVisible();

    // user1 修改任务
    await page1.goto('/tasks/1');
    await page1.fill('[name="description"]', '修改后的描述');
    await page1.click('button:has-text("保存")');

    // user2 应看到更新
    await page2.goto('/tasks/1');
    await expect(page2.locator('.task-description')).toHaveText('修改后的描述');

    await context1.close();
    await context2.close();
  });
});
```

### 3.2 冲突处理

#### UI-VER-001~002

```typescript
describe('UI-VER: 冲突处理', () => {
  test('UI-VER-001: 版本冲突对话框', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // 两个用户同时编辑
    await loginAs(page1, 'user1');
    await loginAs(page2, 'user2');

    await page1.goto('/tasks/1/edit');
    await page2.goto('/tasks/1/edit');

    // user1 先保存
    await page1.fill('[name="description"]', 'user1的修改');
    await page1.click('button:has-text("保存")');

    // user2 后保存（应触发冲突）
    await page2.fill('[name="description"]', 'user2的修改');
    await page2.click('button:has-text("保存")');

    // 应显示冲突对话框
    await expect(page2.locator('text=数据已被其他用户修改')).toBeVisible();
    await expect(page2.locator('button:has-text("覆盖")')).toBeVisible();
    await expect(page2.locator('button:has-text("放弃")')).toBeVisible();

    await context1.close();
    await context2.close();
  });
});
```

---

## 4. 集成测试设计

### 4.1 INT-COLL-001: 实时同步

```typescript
describe('INT-COLL-001: 实时同步', () => {
  test('跨标签页同步', async () => {
    // 使用 BroadcastChannel 实现跨标签页同步
    const ws = await connectWebSocket('user1');

    // 模拟另一个标签页的修改
    await request.put('/api/tasks/1', { status: 'in_progress' });

    // 当前标签页应收到更新
    const message = await ws.waitForMessage('task_updated', { timeout: 500 });

    expect(message).not.toBeNull();
    expect(message.broadcast_source).toBe('cross_tab'); // 标识跨标签页
  });
});
```

### 4.2 INT-CACHE-001: 缓存降级

```typescript
describe('INT-CACHE-001: 缓存降级', () => {
  test('Redis故障自动降级', async () => {
    // 正常操作
    const response1 = await request.get('/api/projects');
    expect(response1.headers['x-cache-type']).toBe('redis');

    // 模拟Redis故障
    await stopRedis();

    // 请求仍应成功
    const response2 = await request.get('/api/projects');
    expect(response2.status).toBe(200);
    expect(response2.headers['x-cache-type']).toBe('lru');

    // Redis恢复后自动切换回来
    await startRedis();
    const response3 = await request.get('/api/projects');
    expect(response3.headers['x-cache-type']).toBe('redis');
  });
});
```

---

## 5. 测试数据

```typescript
export const testCollab = {
  ws: {
    url: 'ws://localhost:3000/ws',
    reconnectInterval: 3000,
    heartbeatInterval: 30000
  },
  cache: {
    ttl: {
      projects: 5 * 60 * 1000,  // 5分钟
      members: 10 * 60 * 1000, // 10分钟
      tasks: 2 * 60 * 1000     // 2分钟
    }
  }
};
```

---

**相关文档**:
- [需求文档](../../requirements/modules/REQ_06_collaboration.md)
- [需求-测试映射](../REQUIREMENT_TRACEABILITY.md)
