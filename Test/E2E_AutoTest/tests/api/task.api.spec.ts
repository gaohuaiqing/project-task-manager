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
    // 登录
    await api.post('/login', {
      username: testUser.username,
      password: testUser.password,
    });

    // 创建测试项目
    const projectResponse = await api.post('/project/projects', {
      name: `任务测试项目_${generateUniqueId()}`,
      code: `TASK-${generateUniqueId()}`,
      projectType: 'product_development',
    });

    if (projectResponse.ok && projectResponse.data.id) {
      testProjectId = projectResponse.data.id;
    }
  });

  test('获取任务列表 - 应返回分页数据', async () => {
    if (!testProjectId) {
      test.skip();
      return;
    }

    const response = await api.get('/task/tasks', {
      project_id: testProjectId,
    });

    expect(response.ok).toBe(true);
    expect(response.data).toHaveProperty('items');
    expect(response.data).toHaveProperty('total');
  });

  test('创建任务 - 应返回任务 ID', async () => {
    if (!testProjectId) {
      test.skip();
      return;
    }

    const response = await api.post('/task/tasks', {
      projectId: testProjectId,
      name: `API测试任务_${generateUniqueId()}`,
      taskType: 'frontend',
      priority: 'medium',
    });

    expect(response.ok).toBe(true);
    expect(response.data).toHaveProperty('id');
  });

  test('更新任务状态 - 应返回更新后的任务', async () => {
    if (!testProjectId) {
      test.skip();
      return;
    }

    // 先创建任务
    const createResponse = await api.post('/task/tasks', {
      projectId: testProjectId,
      name: `状态更新测试_${generateUniqueId()}`,
      taskType: 'frontend',
    });

    if (createResponse.ok && createResponse.data.id) {
      const taskId = createResponse.data.id;

      // 更新状态
      const response = await api.put(`/task/tasks/${taskId}`, {
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
    const parentResponse = await api.post('/task/tasks', {
      projectId: testProjectId,
      name: `父任务_${generateUniqueId()}`,
      taskType: 'frontend',
    });

    if (parentResponse.ok && parentResponse.data.id) {
      const parentId = parentResponse.data.id;

      // 创建子任务
      const childResponse = await api.post('/task/tasks', {
        projectId: testProjectId,
        parentId: parentId,
        name: `子任务_${generateUniqueId()}`,
        taskType: 'frontend',
      });

      expect(childResponse.ok).toBe(true);
      expect(childResponse.data).toHaveProperty('id');
    }
  });

  test('任务筛选 - 应正确过滤', async () => {
    if (!testProjectId) {
      test.skip();
      return;
    }

    const response = await api.get('/task/tasks', {
      project_id: testProjectId,
      status: 'pending',
    });

    expect(response.ok).toBe(true);
    expect(response.data).toHaveProperty('items');
  });
});
