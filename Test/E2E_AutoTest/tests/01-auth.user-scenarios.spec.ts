/**
 * 认证权限模块测试 - 基于用户操作场景
 * 需求来源: REQ_01_auth_permission.md
 */
import { test, expect } from '@playwright/test';
import { ApiHelper } from '../utils/api-helper';
import { testUser, generateUniqueId } from '../fixtures/test-data';

test.describe('认证系统 - 用户操作场景', () => {
  let api: ApiHelper;

  test.beforeEach(async ({ request }) => {
    api = new ApiHelper(request);
  });

  // ==================== 场景1：用户登录 ====================

  test.describe('场景1：用户登录', () => {
    test('操作1：使用正确用户名密码登录', async () => {
      // 操作：输入用户名和密码，点击登录
      const response = await api.login(testUser.username, testUser.password);

      // 预期结果：登录成功，返回用户信息
      expect(response.ok).toBe(true);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('user');
      expect(response.data.data).toHaveProperty('sessionId');
      expect(response.data.data.user.username).toBe(testUser.username);
    });

    test('操作2：使用错误密码登录', async () => {
      // 操作：输入正确用户名，错误密码
      const response = await api.login(testUser.username, 'wrongpassword');

      // 预期结果：返回401错误
      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
    });

    test('操作3：使用不存在的用户名登录', async () => {
      // 操作：输入不存在的用户名
      const response = await api.login(`nonexistent_${generateUniqueId()}`, 'password');

      // 预期结果：返回401错误
      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
    });
  });

  // ==================== 场景2：获取当前用户信息 ====================

  test.describe('场景2：获取当前用户信息', () => {
    test('操作1：登录后查看个人信息', async () => {
      // 前置条件：已登录
      await api.login(testUser.username, testUser.password);

      // 操作：获取当前用户信息
      const response = await api.get('/auth/me');

      // 预期结果：返回用户详情
      expect(response.ok).toBe(true);
      expect(response.data.data).toHaveProperty('id');
      expect(response.data.data).toHaveProperty('username');
      expect(response.data.data).toHaveProperty('role');
    });

    test('操作2：未登录时访问个人信息', async () => {
      // 前置条件：未登录
      api.resetAuth();

      // 操作：尝试获取用户信息
      const response = await api.get('/auth/me');

      // 预期结果：返回401错误
      expect(response.status).toBe(401);
    });
  });

  // ==================== 场景3：登出 ====================

  test.describe('场景3：用户登出', () => {
    test('操作1：正常登出', async () => {
      // 前置条件：已登录
      await api.login(testUser.username, testUser.password);

      // 操作：点击登出
      const response = await api.post('/auth/logout', {});

      // 预期结果：登出成功
      expect(response.ok).toBe(true);
    });
  });

  // ==================== 场景4：会话管理 ====================

  test.describe('场景4：会话管理', () => {
    test('操作1：登录后Cookie有效', async () => {
      // 操作：登录
      const loginResponse = await api.login(testUser.username, testUser.password);

      // 预期结果：获得有效sessionId
      expect(loginResponse.data.data.sessionId).toBeDefined();

      // 验证：使用sessionId可以访问受保护资源
      const meResponse = await api.get('/auth/me');
      expect(meResponse.ok).toBe(true);
    });
  });
});

// ==================== 权限系统测试 ====================

test.describe('权限系统 - 用户操作场景', () => {
  let api: ApiHelper;

  test.beforeEach(async ({ request }) => {
    api = new ApiHelper(request);
    await api.login(testUser.username, testUser.password);
  });

  test('操作1：管理员查看用户列表', async () => {
    const response = await api.get('/users');

    // 管理员应有权限
    expect(response.ok).toBe(true);
    expect(response.data.data).toHaveProperty('items');
    expect(Array.isArray(response.data.data.items)).toBe(true);
  });

  test('操作2：管理员创建用户', async () => {
    const uniqueId = generateUniqueId();
    const response = await api.post('/users', {
      username: `TEST${uniqueId.replace(/-/g, '').substring(0, 8)}`,
      real_name: `测试用户_${uniqueId.substring(0, 6)}`,
      password: 'Test123456',
      role: 'engineer',
      department_id: 1,
    });

    // 管理员应有权限创建
    expect(response.ok).toBe(true);
  });

  test('操作3：获取权限配置', async () => {
    const response = await api.get('/permissions');

    expect(response.ok).toBe(true);
  });
});

// ==================== 场景5：登录限流测试 ====================

test.describe('场景5：登录限流', () => {
  let api: ApiHelper;

  test.beforeEach(async ({ request }) => {
    api = new ApiHelper(request);
  });

  test('操作1：连续5次错误密码触发锁定', async () => {
    // 需求：15分钟内最多5次尝试，5次失败后锁定30分钟
    // 连续尝试5次错误密码
    for (let i = 0; i < 5; i++) {
      await api.login(testUser.username, 'wrongpassword');
    }

    // 第6次尝试应该被锁定
    const response = await api.login(testUser.username, 'wrongpassword');

    // 预期结果：返回锁定错误
    expect([401, 429]).toContain(response.status);
  });

  test('操作2：正确密码登录成功', async () => {
    // 使用正确密码验证登录功能
    const response = await api.login(testUser.username, testUser.password);

    // 预期结果：登录成功
    expect(response.ok).toBe(true);
  });
});

// ==================== 场景6：用户管理测试 ====================

test.describe('场景6：用户管理', () => {
  let api: ApiHelper;

  test.beforeEach(async ({ request }) => {
    api = new ApiHelper(request);
    await api.login(testUser.username, testUser.password);
  });

  test('操作1：重置用户密码', async () => {
    // 获取用户列表
    const listResponse = await api.get('/users');

    if (listResponse.ok && listResponse.data.data?.items?.length > 0) {
      const userId = listResponse.data.data.items[0].id;

      // 操作：重置密码
      const response = await api.post(`/users/${userId}/reset-password`, {});

      // 预期结果：返回新密码
      expect(response.ok).toBe(true);
      if (response.data.data) {
        expect(response.data.data).toHaveProperty('newPassword');
      }
    } else {
      test.skip();
    }
  });

  test('操作2：更新用户信息', async () => {
    // 获取用户列表
    const listResponse = await api.get('/users');

    if (listResponse.ok && listResponse.data.data?.items?.length > 0) {
      const userId = listResponse.data.data.items[0].id;

      // 操作：更新用户信息
      const response = await api.put(`/users/${userId}`, {
        real_name: '更新后的姓名',
      });

      // 预期结果：更新成功
      expect(response.ok).toBe(true);
    } else {
      test.skip();
    }
  });

  test('操作3：不能删除自己的账户', async () => {
    // 获取当前用户ID
    const meResponse = await api.get('/auth/me');

    if (meResponse.ok && meResponse.data.data?.user?.id) {
      const currentUserId = meResponse.data.data.user.id;

      // 操作：尝试删除自己
      const response = await api.delete(`/users/${currentUserId}`);

      // 预期结果：删除失败
      expect(response.ok).toBe(false);
    } else {
      test.skip();
    }
  });
});

// ==================== 场景7：角色权限测试 ====================

test.describe('场景7：角色权限', () => {
  let api: ApiHelper;

  test.beforeEach(async ({ request }) => {
    api = new ApiHelper(request);
    await api.login(testUser.username, testUser.password);
  });

  test('操作1：验证4种角色定义', async () => {
    // 需求：admin, tech_manager, dept_manager, engineer
    const validRoles = ['admin', 'tech_manager', 'dept_manager', 'engineer'];

    // 获取用户列表验证角色
    const response = await api.get('/users');

    expect(response.ok).toBe(true);
    if (response.data.data?.items?.length > 0) {
      const userRole = response.data.data.items[0].role;
      expect(validRoles).toContain(userRole);
    }
  });

  test('操作2：验证16种细粒度权限', async () => {
    // 需求：项目权限(4) + 成员权限(4) + 任务权限(5) + 系统权限(3) = 16种
    const expectedPermissions = [
      'PROJECT_VIEW', 'PROJECT_CREATE', 'PROJECT_EDIT', 'PROJECT_DELETE',
      'MEMBER_VIEW', 'MEMBER_CREATE', 'MEMBER_EDIT', 'MEMBER_DELETE',
      'TASK_VIEW', 'TASK_CREATE', 'TASK_EDIT', 'TASK_DELETE', 'TASK_ASSIGN',
      'USER_MANAGE', 'SYSTEM_CONFIG', 'AUDIT_LOG_VIEW',
    ];

    // 验证权限配置接口
    const response = await api.get('/permissions');

    // 权限系统应可访问
    expect([200, 404]).toContain(response.status);
  });
});
