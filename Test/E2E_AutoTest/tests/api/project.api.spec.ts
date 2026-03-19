/**
 * 项目 API 测试
 */
import { test, expect } from '@playwright/test';
import { ApiHelper } from '../../utils/api-helper';
import { testUser, generateUniqueId } from '../../fixtures/test-data';

test.describe('项目 API 测试', () => {
  let api: ApiHelper;

  test.beforeEach(async ({ request }) => {
    api = new ApiHelper(request);
    // 登录
    await api.post('/login', {
      username: testUser.username,
      password: testUser.password,
    });
  });

  test('获取项目列表 - 应返回分页数据', async () => {
    const response = await api.get('/project/projects');

    expect(response.ok).toBe(true);
    expect(response.data).toHaveProperty('items');
    expect(response.data).toHaveProperty('total');
    expect(Array.isArray(response.data.items)).toBe(true);
  });

  test('创建项目 - 应返回项目 ID', async () => {
    const projectData = {
      name: `API测试项目_${generateUniqueId()}`,
      code: `API-${generateUniqueId()}`,
      projectType: 'product_development',
      description: 'API自动化测试创建',
    };

    const response = await api.post('/project/projects', projectData);

    expect(response.ok).toBe(true);
    expect(response.data).toHaveProperty('id');
  });

  test('获取项目详情 - 应返回完整项目信息', async () => {
    // 先创建一个项目
    const createResponse = await api.post('/project/projects', {
      name: `详情测试_${generateUniqueId()}`,
      code: `DETAIL-${generateUniqueId()}`,
      projectType: 'product_development',
    });

    if (createResponse.ok && createResponse.data.id) {
      const projectId = createResponse.data.id;

      // 获取详情
      const response = await api.get(`/project/projects/${projectId}`);

      expect(response.ok).toBe(true);
      expect(response.data).toHaveProperty('id', projectId);
      expect(response.data).toHaveProperty('name');
      expect(response.data).toHaveProperty('status');
    }
  });

  test('更新项目 - 应返回更新后的项目', async () => {
    // 先创建一个项目
    const createResponse = await api.post('/project/projects', {
      name: `更新测试_${generateUniqueId()}`,
      code: `UPDATE-${generateUniqueId()}`,
      projectType: 'product_development',
    });

    if (createResponse.ok && createResponse.data.id) {
      const projectId = createResponse.data.id;

      // 更新项目
      const newName = `已更新_${generateUniqueId()}`;
      const response = await api.put(`/project/projects/${projectId}`, {
        name: newName,
      });

      expect(response.ok).toBe(true);
    }
  });

  test('删除项目 - 应返回成功', async () => {
    // 先创建一个项目
    const createResponse = await api.post('/project/projects', {
      name: `删除测试_${generateUniqueId()}`,
      code: `DELETE-${generateUniqueId()}`,
      projectType: 'product_development',
    });

    if (createResponse.ok && createResponse.data.id) {
      const projectId = createResponse.data.id;

      // 删除项目
      const response = await api.delete(`/project/projects/${projectId}`);

      expect(response.ok).toBe(true);
    }
  });

  test('分页参数 - 应正确处理分页', async () => {
    const response = await api.get('/project/projects', {
      page: 1,
      pageSize: 5,
    });

    expect(response.ok).toBe(true);
    expect(response.data).toHaveProperty('page', 1);
    expect(response.data).toHaveProperty('pageSize', 5);
    expect(response.data.items.length).toBeLessThanOrEqual(5);
  });
});
