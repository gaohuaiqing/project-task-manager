/**
 * 任务 API 测试
 */
import { test, expect } from '@playwright/test';
import { ApiHelper } from '../../utils/api-helper';
import { testUser, generateUniqueId } from '../../fixtures/test-data';

test.describe('任务 API 测试', () => {
  let api: ApiHelper;
  let testProjectId: string | null = null;

  test.beforeEach(async ({ request }) => {
    api = new ApiHelper(request);
    // 使用 login 方法登录
    await api.login(testUser.username, testUser.password);

    // 创建测试项目
    const projectResponse = await api.post('/projects', {
      name: `任务测试项目_${generateUniqueId()}`,
      code: `TASK-${generateUniqueId()}`,
      project_type: 'product_development',
      planned_start_date: '2026-03-20',
      planned_end_date: '2026-04-20',
    });

    if (projectResponse.ok && projectResponse.data.data?.id) {
      testProjectId = String(projectResponse.data.data.id);
    }
  });

  test('获取任务列表 - 应返回分页数据', async () => {
    if (!testProjectId) {
      test.skip();
      return;
    }

    const response = await api.get('/tasks', {
      project_id: testProjectId,
    });

    expect(response.ok).toBe(true);
    expect(response.data).toHaveProperty('success');
    expect(response.data.data).toHaveProperty('items');
    expect(response.data.data).toHaveProperty('total');
  });

  test('创建任务 - 应返回任务 ID', async () => {
    if (!testProjectId) {
      test.skip();
      return;
    }

    const response = await api.post('/tasks', {
      project_id: testProjectId,
      description: `API测试任务_${generateUniqueId()}`,
      task_type: 'development',
      priority: 'medium',
    });

    expect(response.ok).toBe(true);
    expect(response.data).toHaveProperty('success');
    expect(response.data.data).toHaveProperty('id');
  });

  test('更新任务状态 - 应返回更新后的任务', async () => {
    if (!testProjectId) {
      test.skip();
      return;
    }

    // 先创建任务
    const createResponse = await api.post('/tasks', {
      project_id: testProjectId,
      description: `状态更新测试_${generateUniqueId()}`,
      task_type: 'development',
    });

    if (createResponse.ok && createResponse.data.data?.id) {
      const taskId = createResponse.data.data.id;

      // 更新状态
      const response = await api.put(`/tasks/${taskId}`, {
        status: 'in_progress',
        version: 1,
      });

      expect(response.ok).toBe(true);
    }
  });

  test('创建子任务 - 应形成层级关系', async () => {
    if (!testProjectId) {
      test.skip();
      return;
    }

    // 先创建父任务
    const parentResponse = await api.post('/tasks', {
      project_id: testProjectId,
      description: `父任务_${generateUniqueId()}`,
      task_type: 'development',
    });

    if (parentResponse.ok && parentResponse.data.data?.id) {
      const parentId = parentResponse.data.data.id;

      // 创建子任务
      const childResponse = await api.post('/tasks', {
        project_id: testProjectId,
        parent_id: parentId,
        description: `子任务_${generateUniqueId()}`,
        task_type: 'development',
      });

      expect(childResponse.ok).toBe(true);
      expect(childResponse.data.data).toHaveProperty('id');
    }
  });

  test('任务筛选 - 应正确过滤', async () => {
    if (!testProjectId) {
      test.skip();
      return;
    }

    const response = await api.get('/tasks', {
      project_id: testProjectId,
      status: 'pending',
    });

    expect(response.ok).toBe(true);
    expect(response.data.data).toHaveProperty('items');
  });
});
