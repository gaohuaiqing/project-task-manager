/**
 * API 健康检查测试
 * 独立于 UI 测试，不需要 setup
 */
import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api';

test.describe('API 健康检查', () => {
  test('后端服务应可访问', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/health`);
    
    // 验证服务响应（可能是 200 或 404，取决于是否有 health 端点）
    expect([200, 404]).toContain(response.status());
  });

  test('登录接口应存在', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/auth/login`, {
      data: { username: 'test', password: 'test' },
    });

    // 验证接口存在（可能是 401 错误，但不应该是 404）
    expect(response.status()).not.toBe(404);
  });
});
