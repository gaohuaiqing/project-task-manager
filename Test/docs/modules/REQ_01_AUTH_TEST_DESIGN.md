# 模块测试设计：认证权限模块

> **模块编号**: 01
> **模块名称**: 认证权限模块
> **需求文档**: REQ_01_auth_permission.md
> **创建日期**: 2026-03-20
> **版本**: 1.0

---

## 1. 模块概述

### 1.1 功能范围

| 子模块 | 功能描述 | 测试用例数 |
|--------|----------|------------|
| 认证系统 | 登录、登出、会话管理 | 10 |
| 权限系统 | 角色权限、数据隔离 | 12 |
| 审计日志 | 日志记录、查询、告警 | 5 |
| **总计** | | **27** |

### 1.2 测试覆盖

| 测试类型 | 用例数 | 占比 |
|----------|--------|------|
| API 测试 | 18 | 67% |
| UI 测试 | 6 | 22% |
| 集成测试 | 3 | 11% |

---

## 2. API 测试设计

### 2.1 认证 API

#### API-AUTH-001: 用户登录 - 正确凭据

```typescript
describe('API-AUTH-001: 用户登录', () => {
  test('正确用户名密码 - 返回用户信息和sessionId', async () => {
    const response = await request.post('/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });

    expect(response.status).toBe(200);
    expect(response.data).toMatchObject({
      success: true,
      data: {
        user: expect.objectContaining({
          username: 'admin',
          role: 'admin'
        }),
        sessionId: expect.any(String)
      }
    });
  });

  test('错误密码 - 返回401', async () => {
    const response = await request.post('/api/auth/login', {
      username: 'admin',
      password: 'wrongpassword'
    });

    expect(response.status).toBe(401);
    expect(response.data).toMatchObject({
      success: false,
      error: {
        code: 'AUTH_FAILED'
      }
    });
  });

  test('不存在的用户 - 返回401', async () => {
    const response = await request.post('/api/auth/login', {
      username: 'nonexistent',
      password: 'anypassword'
    });

    expect(response.status).toBe(401);
  });
});
```

#### API-AUTH-002: 密码校验

```typescript
describe('API-AUTH-002: bcrypt密码校验', () => {
  test('密码使用bcrypt 10轮加密', async () => {
    // 验证数据库中存储的密码是bcrypt加密的
    const user = await db.query('SELECT password FROM users WHERE username = ?', ['admin']);
    expect(user.password).toMatch(/^\$2b\$10\$/); // bcrypt 10轮格式
  });
});
```

#### API-AUTH-003: 登录限流

```typescript
describe('API-AUTH-003: 登录限流', () => {
  test('15分钟内5次失败后锁定', async () => {
    // 连续5次错误登录
    for (let i = 0; i < 5; i++) {
      await request.post('/api/auth/login', {
        username: 'admin',
        password: 'wrong'
      });
    }

    // 第6次应返回锁定
    const response = await request.post('/api/auth/login', {
      username: 'admin',
      password: 'admin123' // 正确密码
    });

    expect(response.status).toBe(429);
    expect(response.data.error.code).toBe('ACCOUNT_LOCKED');
  });

  test('锁定30分钟后自动解锁', async () => {
    // 模拟30分钟后
    await mockTime.advance(30 * 60 * 1000);

    const response = await request.post('/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });

    expect(response.status).toBe(200);
  });
});
```

#### API-AUTH-004~009: 会话管理

```typescript
describe('API-AUTH-004: 会话管理', () => {
  test('Cookie有效期7天', async () => {
    const response = await request.post('/api/auth/login', {...});
    const cookie = response.headers['set-cookie'];
    expect(cookie).toMatch(/Max-Age=604800/); // 7天
  });

  test('同账号最多10设备', async () => {
    // 创建10个会话
    for (let i = 0; i < 10; i++) {
      await request.post('/api/auth/login', {...});
    }

    // 第11个设备应踢出最早的
    const response = await request.post('/api/auth/login', {...});
    expect(response.data.data.kickedSession).toBeDefined();
  });

  test('会话自动续期', async () => {
    // 登录后等待接近过期时间
    await login();
    await mockTime.advance(6 * 24 * 60 * 60 * 1000); // 6天

    // 有活动时应续期
    const response = await request.get('/api/auth/me');
    expect(response.headers['set-cookie']).toBeDefined(); // 更新了cookie
  });
});
```

### 2.2 权限 API

#### API-PERM-001~004: 角色定义

```typescript
describe('API-PERM: 角色权限', () => {
  const roles = ['admin', 'tech_manager', 'dept_manager', 'engineer'];

  test.each(roles)('角色 %s 可以登录', async (role) => {
    const user = testUsers[role];
    const response = await request.post('/api/auth/login', {
      username: user.username,
      password: user.password
    });
    expect(response.status).toBe(200);
  });
});
```

#### API-PERM-005~020: 16种细粒度权限

```typescript
describe('API-PERM: 细粒度权限', () => {
  const permissions = [
    'PROJECT_VIEW', 'PROJECT_CREATE', 'PROJECT_EDIT', 'PROJECT_DELETE',
    'MEMBER_VIEW', 'MEMBER_CREATE', 'MEMBER_EDIT', 'MEMBER_DELETE',
    'TASK_VIEW', 'TASK_CREATE', 'TASK_EDIT', 'TASK_DELETE', 'TASK_ASSIGN',
    'USER_MANAGE', 'SYSTEM_CONFIG', 'AUDIT_LOG_VIEW'
  ];

  test.each(permissions)('admin 拥有权限 %s', async (perm) => {
    await loginAs('admin');
    const response = await request.get('/api/auth/me');
    expect(response.data.data.permissions).toContain(perm);
  });

  test('engineer 不能删除项目', async () => {
    await loginAs('engineer');
    const response = await request.delete('/api/projects/1');
    expect(response.status).toBe(403);
  });
});
```

#### API-PERM-021~084: 权限矩阵验证

```typescript
describe('API-PERM: 权限矩阵', () => {
  const matrix = {
    admin: { PROJECT_CREATE: true, USER_MANAGE: true, ... },
    tech_manager: { PROJECT_CREATE: true, USER_MANAGE: false, ... },
    dept_manager: { PROJECT_CREATE: false, USER_MANAGE: false, ... },
    engineer: { PROJECT_CREATE: false, USER_MANAGE: false, ... }
  };

  test.each(Object.entries(matrix))('角色 %s 权限正确', async (role, perms) => {
    await loginAs(role);
    const response = await request.get('/api/auth/me');
    const actualPerms = response.data.data.permissions;

    for (const [perm, expected] of Object.entries(perms)) {
      const hasPerm = actualPerms.includes(perm);
      expect(hasPerm).toBe(expected);
    }
  });
});
```

### 2.3 审计日志 API

#### API-AUDIT-001~004

```typescript
describe('API-AUDIT: 审计日志', () => {
  test('操作记录包含12个字段', async () => {
    await loginAs('admin');
    await request.post('/api/projects', {...}); // 执行操作

    const logs = await request.get('/api/audit-logs');
    const log = logs.data.data.items[0];

    const requiredFields = [
      'id', 'user_id', 'action', 'table_name', 'record_id',
      'old_value', 'new_value', 'ip_address', 'user_agent',
      'created_at', 'node_id', 'session_id'
    ];

    requiredFields.forEach(field => {
      expect(log).toHaveProperty(field);
    });
  });

  test('新设备登录发送通知', async () => {
    // 模拟新设备登录
    const response = await request.post('/api/auth/login', {
      ...credentials,
      'User-Agent': 'NewDevice/1.0'
    });

    // 验证通知已发送
    const notifications = await request.get('/api/notifications');
    expect(notifications.data.data.items).toContainEqual(
      expect.objectContaining({ type: 'NEW_DEVICE_LOGIN' })
    );
  });
});
```

---

## 3. UI/E2E 测试设计

### 3.1 登录流程

#### UI-AUTH-001: 登录页面

| 步骤 | 操作 | 预期结果 |
|------|------|----------|
| 1 | 打开登录页面 | 显示用户名、密码输入框 |
| 2 | 输入正确凭据 | 登录成功，跳转到仪表板 |
| 3 | 输入错误密码 | 显示错误提示 |
| 4 | 连续5次失败 | 显示账户锁定提示 |

```typescript
test('UI-AUTH-001: 登录流程', async ({ page }) => {
  const loginPage = new LoginPage(page);

  // 正确登录
  await loginPage.goto();
  await loginPage.login('admin', 'admin123');
  await expect(page).toHaveURL(/\/dashboard/);

  // 错误密码
  await loginPage.goto();
  await loginPage.login('admin', 'wrong');
  await expect(loginPage.errorMessage).toContainText('密码错误');
});
```

### 3.2 权限控制

#### UI-PERM-001: 角色界面差异

| 角色 | 可见菜单 | 不可见菜单 |
|------|----------|------------|
| admin | 全部 | 无 |
| tech_manager | 项目、任务、报表、设置 | 用户管理 |
| engineer | 项目、任务 | 设置、用户管理 |

```typescript
test('UI-PERM-001: 角色界面差异', async ({ page }) => {
  // 工程师登录
  await loginAs(page, 'engineer');
  const sidebar = new Sidebar(page);

  // 验证不可见菜单
  await expect(sidebar.userManagementLink).not.toBeVisible();
  await expect(sidebar.settingsLink).not.toBeVisible();

  // 验证可见菜单
  await expect(sidebar.projectsLink).toBeVisible();
});
```

---

## 4. 集成测试设计

### 4.1 跨模块场景

#### INT-AUTH-001: 全设备登出

```typescript
describe('INT-AUTH-001: 全设备登出', () => {
  test('管理员强制登出所有设备', async () => {
    // 1. 用户在多设备登录
    const session1 = await login('engineer');
    const session2 = await login('engineer');

    // 2. 管理员强制登出
    await loginAs('admin');
    await request.delete(`/api/users/${engineerId}/sessions/all`);

    // 3. 验证所有会话失效
    const response1 = await session1.get('/api/auth/me');
    const response2 = await session2.get('/api/auth/me');

    expect(response1.status).toBe(401);
    expect(response2.status).toBe(401);
  });
});
```

#### INT-PERM-001: 权限矩阵集成

```typescript
describe('INT-PERM-001: 权限矩阵', () => {
  test('工程师修改任务触发审批流程', async () => {
    await loginAs('engineer');
    await request.put('/api/tasks/1', { start_date: '2026-04-01' });

    // 验证任务状态变为待审批
    const task = await request.get('/api/tasks/1');
    expect(task.data.data.status).toBe('pending_approval');
  });
});
```

---

## 5. 测试数据

### 5.1 测试用户

```typescript
export const testUsers = {
  admin: {
    username: 'admin',
    password: 'admin123',
    role: 'admin'
  },
  tech_manager: {
    username: 'tech_manager',
    password: '123456',
    role: 'tech_manager'
  },
  dept_manager: {
    username: 'dept_manager',
    password: '123456',
    role: 'dept_manager'
  },
  engineer: {
    username: 'engineer',
    password: '123456',
    role: 'engineer'
  }
};
```

---

## 6. 验收标准

| 需求ID | 验收标准 | 优先级 |
|--------|----------|--------|
| AUTH-001 | 登录成功返回用户信息和sessionId | P0 |
| AUTH-002 | 错误密码返回401，不泄露用户存在性 | P0 |
| AUTH-003 | 5次失败后锁定30分钟 | P0 |
| PERM-001 | 4种角色权限正确区分 | P0 |
| PERM-002 | 16种权限正确验证 | P0 |
| AUDIT-001 | 所有操作记录到审计日志 | P1 |

---

**相关文档**:
- [需求文档](../../requirements/modules/REQ_01_auth_permission.md)
- [需求-测试映射](../REQUIREMENT_TRACEABILITY.md)
