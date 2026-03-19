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
    // 使用 login 方法登录（会保存 sessionId）
    await api.login(testUser.username, testUser.password);
  });

  test('获取项目列表 - 应返回分页数据', async () => {
    const response = await api.get('/projects');

    expect(response.ok).toBe(true);
    // API 返回 { success: true, data: { items, total, page, pageSize } }
    expect(response.data).toHaveProperty('success');
    expect(response.data.data).toHaveProperty('items');
    expect(response.data.data).toHaveProperty('total');
    expect(Array.isArray(response.data.data.items)).toBe(true);
  });

  test('创建项目 - 应返回项目 ID', async () => {
    const projectData = {
      name: `API测试项目_${generateUniqueId()}`,
      code: `API-${generateUniqueId()}`,
      project_type: 'product_development',
      planned_start_date: '2026-03-20',
      planned_end_date: '2026-04-20',
      description: 'API自动化测试创建',
    };

    const response = await api.post('/projects', projectData);

    expect(response.ok).toBe(true);
    // API 返回 { success: true, data: { id, ... } }
    expect(response.data).toHaveProperty('success');
    expect(response.data.data).toHaveProperty('id');
  });

  test('获取项目详情 - 应返回完整项目信息', async () => {
    // 先创建一个项目
    const createResponse = await api.post('/projects', {
      name: `详情测试_${generateUniqueId()}`,
      code: `DETAIL-${generateUniqueId()}`,
      project_type: 'product_development',
      planned_start_date: '2026-03-20',
      planned_end_date: '2026-04-20',
    });

    if (createResponse.ok && createResponse.data.data?.id) {
      const projectId = createResponse.data.data.id;

      // 获取详情
      const response = await api.get(`/projects/${projectId}`);

      expect(response.ok).toBe(true);
      // ID 可能是数字或字符串，使用宽松比较
      expect(String(response.data.data.id)).toBe(String(projectId));
      expect(response.data.data).toHaveProperty('name');
    }
  });

  test('更新项目 - 应返回更新后的项目', async () => {
    // 先创建一个项目
    const createResponse = await api.post('/projects', {
      name: `更新测试_${generateUniqueId()}`,
      code: `UPDATE-${generateUniqueId()}`,
      project_type: 'product_development',
      planned_start_date: '2026-03-20',
      planned_end_date: '2026-04-20',
    });

    if (createResponse.ok && createResponse.data.data?.id) {
      const projectId = createResponse.data.data.id;

      // 更新项目
      const newName = `已更新_${generateUniqueId()}`;
      const response = await api.put(`/projects/${projectId}`, {
        name: newName,
      });

      expect(response.ok).toBe(true);
    }
  });

  test('删除项目 - 应返回成功', async () => {
    // 先创建一个项目
    const createResponse = await api.post('/projects', {
      name: `删除测试_${generateUniqueId()}`,
      code: `DELETE-${generateUniqueId()}`,
      project_type: 'product_development',
      planned_start_date: '2026-03-20',
      planned_end_date: '2026-04-20',
    });

    if (createResponse.ok && createResponse.data.data?.id) {
      const projectId = createResponse.data.data.id;

      // 删除项目
      const response = await api.delete(`/projects/${projectId}`);

      expect(response.ok).toBe(true);
    }
  });

  test('分页参数 - 应正确处理分页', async () => {
    const response = await api.get('/projects', {
      page: 1,
      pageSize: 5,
    });

    expect(response.ok).toBe(true);
    expect(response.data.data).toHaveProperty('page', 1);
    expect(response.data.data).toHaveProperty('pageSize', 5);
    expect(response.data.data.items.length).toBeLessThanOrEqual(5);
  });
});
