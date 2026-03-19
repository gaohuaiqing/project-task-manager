/**
 * 认证 API 测试
 */
import { test, expect } from '@playwright/test';
import { ApiHelper } from '../../utils/api-helper';
import { testUser } from '../../fixtures/test-data';

test.describe('认证 API 测试', () => {
  let api: ApiHelper;

  test.beforeEach(async ({ request }) => {
    api = new ApiHelper(request);
  });

  test('登录 API - 应返回用户信息', async () => {
    const response = await api.post('/auth/login', {
      username: testUser.username,
      password: testUser.password,
    });

    // 验证响应状态
    expect([200, 201]).toContain(response.status);
    expect(response.ok).toBe(true);

    // 验证返回数据
    expect(response.data).toHaveProperty('user');
    expect(response.data.user).toHaveProperty('username');
  });

  test('登录 API - 错误密码应返回错误', async () => {
    const response = await api.post('/auth/login', {
      username: testUser.username,
      password: 'wrong_password_123',
    });

    // 验证返回错误
    expect(response.status).toBe(401);
    expect(response.ok).toBe(false);
    expect(response.data).toHaveProperty('code');
    expect(response.data).toHaveProperty('message');
  });

  test('获取当前用户 - 应返回用户信息', async () => {
    // 先登录
    await api.post('/auth/login', {
      username: testUser.username,
      password: testUser.password,
    });

    // 获取当前用户
    const response = await api.get('/auth/me');

    // 验证响应
    expect(response.ok).toBe(true);
    expect(response.data).toHaveProperty('id');
    expect(response.data).toHaveProperty('username');
  });

  test('未认证访问 - 应返回 401', async ({ request }) => {
    // 不登录，直接访问
    const newApi = new ApiHelper(request);
    const response = await newApi.get('/auth/me');

    expect(response.status).toBe(401);
    expect(response.ok).toBe(false);
  });
});
