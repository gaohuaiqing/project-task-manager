# 模块测试设计：组织架构模块

> **模块编号**: 02
> **模块名称**: 组织架构模块
> **需求文档**: REQ_02_organization.md
> **创建日期**: 2026-03-20
> **版本**: 1.0

---

## 1. 模块概述

### 1.1 功能范围

| 子模块 | 功能描述 | 测试用例数 |
|--------|----------|------------|
| 部门管理 | 部门树CRUD、层级管理 | 8 |
| 成员管理 | 成员CRUD、工号管理、状态 | 9 |
| 能力模型 | 模型配置、成员评定、智能推荐 | 4 |
| **总计** | | **21** |

---

## 2. API 测试设计

### 2.1 部门管理 API

#### API-ORG-001~007: 部门CRUD

```typescript
describe('API-ORG: 部门管理', () => {
  test('API-ORG-001: 获取部门树', async () => {
    const response = await request.get('/api/departments');

    expect(response.status).toBe(200);
    expect(response.data.data).toBeInstanceOf(Array);
    // 验证树形结构
    expect(response.data.data[0]).toHaveProperty('children');
  });

  test('API-ORG-002: 创建部门', async () => {
    const response = await request.post('/api/departments', {
      name: '测试部门',
      parent_id: null
    });

    expect(response.status).toBe(201);
    expect(response.data.data).toHaveProperty('id');
  });

  test('API-ORG-003: 部门层级无限嵌套', async () => {
    // 创建多级部门
    let parentId = null;
    for (let i = 0; i < 10; i++) {
      const response = await request.post('/api/departments', {
        name: `层级${i}`,
        parent_id: parentId
      });
      parentId = response.data.data.id;
    }

    // 验证10级都创建成功
    const tree = await request.get('/api/departments');
    expect(getMaxDepth(tree.data.data)).toBeGreaterThanOrEqual(10);
  });

  test('API-ORG-007: 删除有成员的部门应失败', async () => {
    // 先创建部门和成员
    const dept = await createDepartment();
    await createMember({ department_id: dept.id });

    const response = await request.delete(`/api/departments/${dept.id}`);
    expect(response.status).toBe(400);
    expect(response.data.error.code).toBe('DEPARTMENT_NOT_EMPTY');
  });
});
```

### 2.2 成员管理 API

#### API-MEM-001~005: 成员CRUD

```typescript
describe('API-MEM: 成员管理', () => {
  test('API-MEM-001: 添加成员自动创建账户', async () => {
    const response = await request.post('/api/members', {
      username: 'EMP001',
      real_name: '测试员工',
      role: 'engineer',
      department_id: 1
    });

    expect(response.status).toBe(201);
    // 返回初始密码
    expect(response.data.data).toHaveProperty('initial_password');
  });

  test('API-MEM-002: 工号格式验证', async () => {
    // 8位数字
    let response = await request.post('/api/members', {
      username: '12345678',
      ...
    });
    expect(response.status).toBe(201);

    // 6位字母+数字
    response = await request.post('/api/members', {
      username: 'ABC123',
      ...
    });
    expect(response.status).toBe(201);

    // 无效格式
    response = await request.post('/api/members', {
      username: 'invalid!',
      ...
    });
    expect(response.status).toBe(400);
  });

  test('API-MEM-003: 工号唯一性', async () => {
    await createMember({ username: 'UNIQUE001' });

    const response = await request.post('/api/members', {
      username: 'UNIQUE001', // 重复
      ...
    });

    expect(response.status).toBe(409);
    expect(response.data.error.code).toBe('USERNAME_EXISTS');
  });

  test('API-MEM-004: 成员状态切换', async () => {
    const member = await createMember();

    // 停用
    await request.put(`/api/members/${member.id}`, { is_active: false });

    // 验证无法登录
    const response = await request.post('/api/auth/login', {
      username: member.username,
      password: member.password
    });
    expect(response.status).toBe(401);
  });
});
```

### 2.3 能力模型 API

#### API-CAP-001~007

```typescript
describe('API-CAP: 能力模型', () => {
  test('API-CAP-001: 创建能力模型', async () => {
    const response = await request.post('/api/capability-models', {
      name: '嵌入式开发能力',
      dimensions: [
        { name: '固件开发', weight: 35 },
        { name: '驱动开发', weight: 30 },
        { name: '系统设计', weight: 20 },
        { name: '问题分析', weight: 15 }
      ]
    });

    expect(response.status).toBe(201);
  });

  test('API-CAP-002: 权重之和必须等于100%', async () => {
    const response = await request.post('/api/capability-models', {
      name: '测试模型',
      dimensions: [
        { name: '维度1', weight: 50 },
        { name: '维度2', weight: 40 } // 总和90%
      ]
    });

    expect(response.status).toBe(400);
  });

  test('API-CAP-006: 智能推荐', async () => {
    // 创建能力模型和成员评定
    await setupCapabilityData();

    const response = await request.get('/api/tasks/recommend-assignee', {
      task_type: 'firmware'
    });

    expect(response.status).toBe(200);
    expect(response.data.data).toBeInstanceOf(Array);
    // 按综合分数降序
    expect(response.data.data[0].score).toBeGreaterThanOrEqual(
      response.data.data[1]?.score || 0
    );
  });
});
```

---

## 3. UI/E2E 测试设计

### 3.1 组织架构树

#### UI-ORG-001: 树形展示

```typescript
test('UI-ORG-001: 组织架构树', async ({ page }) => {
  await loginAs(page, 'admin');
  await page.goto('/settings/organization');

  // 验证树形结构
  const tree = page.locator('[data-testid="org-tree"]');
  await expect(tree).toBeVisible();

  // 展开子节点
  await tree.locator('.expand-icon').first().click();
  await expect(tree.locator('.child-node')).toBeVisible();
});
```

### 3.2 成员管理

#### UI-MEM-001: 添加成员流程

```typescript
test('UI-MEM-001: 添加成员', async ({ page }) => {
  await loginAs(page, 'admin');
  await page.goto('/settings/members');

  // 点击添加
  await page.click('[data-testid="add-member-btn"]');

  // 填写表单
  await page.fill('[name="username"]', 'TEST001');
  await page.fill('[name="real_name"]', '测试员工');
  await page.selectOption('[name="role"]', 'engineer');

  // 提交
  await page.click('[type="submit"]');

  // 验证显示初始密码
  await expect(page.locator('.initial-password')).toBeVisible();
  await expect(page.locator('.copy-password-btn')).toBeVisible();
});
```

---

## 4. 集成测试设计

### 4.1 INT-MEM-001: 成员创建账户联动

```typescript
describe('INT-MEM-001: 成员账户联动', () => {
  test('添加成员自动创建登录账户', async () => {
    const memberData = {
      username: 'INTEGRATION001',
      real_name: '集成测试',
      role: 'engineer',
      department_id: 1
    };

    // 添加成员
    const memberResponse = await request.post('/api/members', memberData);
    const initialPassword = memberResponse.data.data.initial_password;

    // 验证可以登录
    const loginResponse = await request.post('/api/auth/login', {
      username: memberData.username,
      password: initialPassword
    });

    expect(loginResponse.status).toBe(200);
  });
});
```

---

## 5. 测试数据

```typescript
export const testDepartments = {
  root: { name: '技术部', parent_id: null },
  child: { name: '开发组', parent_id: 'ROOT_ID' }
};

export const testMembers = {
  engineer: {
    username: 'TEST_ENG',
    real_name: '测试工程师',
    role: 'engineer'
  },
  manager: {
    username: 'TEST_MGR',
    real_name: '测试经理',
    role: 'tech_manager'
  }
};
```

---

**相关文档**:
- [需求文档](../../requirements/modules/REQ_02_organization.md)
- [需求-测试映射](../REQUIREMENT_TRACEABILITY.md)
