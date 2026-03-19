/**
 * 工作流 API 测试
 */
import { test, expect } from '@playwright/test';
import { ApiHelper } from '../../utils/api-helper';
import { testUser, generateUniqueId } from '../../fixtures/test-data';

test.describe('工作流 API 测试', () => {
  let api: ApiHelper;
  let testProjectId: string | null = null;

  test.beforeEach(async ({ request }) => {
    api = new ApiHelper(request);
    await api.login(testUser.username, testUser.password);

    // 创建测试项目
    const projectResponse = await api.post('/projects', {
      name: `工作流测试项目_${generateUniqueId()}`,
      code: `WF-${generateUniqueId()}`,
      project_type: 'product_dev',
      planned_start_date: '2026-04-01',
      planned_end_date: '2026-06-30',
    });

    if (projectResponse.ok && projectResponse.data.data?.id) {
      testProjectId = String(projectResponse.data.data.id);
    }
  });

  // ==================== 审批流程 ====================

  test.describe('审批流程', () => {
    test('获取审批列表 - 应返回分页数据', async () => {
      const response = await api.get('/approvals');

      expect(response.ok).toBe(true);
      expect(response.data).toHaveProperty('success');
      expect(response.data.data).toHaveProperty('items');
      expect(Array.isArray(response.data.data.items)).toBe(true);
    });

    test('获取待审批列表 - 应返回待处理数据', async () => {
      const response = await api.get('/approvals/pending');

      expect(response.ok).toBe(true);
      expect(response.data).toHaveProperty('success');
    });

    test('提交任务变更审批', async () => {
      if (!testProjectId) {
        test.skip();
        return;
      }

      // 创建任务
      const taskResponse = await api.post('/tasks', {
        project_id: testProjectId,
        description: `审批测试任务_${generateUniqueId()}`,
        task_type: 'firmware',
        priority: 'medium',
        start_date: '2026-04-01',
        duration: 5,
      });

      if (taskResponse.ok && taskResponse.data.data?.id) {
        const taskId = taskResponse.data.data.id;

        // 提交变更
        const changeResponse = await api.post(`/tasks/${taskId}/changes`, {
          changes: { start_date: '2026-04-10' },
          reason: '需求变更测试',
        });

        // 验证结果（取决于角色权限）
        expect([200, 201, 403]).toContain(changeResponse.status);
      }
    });
  });

  // ==================== 延期管理 ====================

  test.describe('延期管理', () => {
    test('获取延期记录列表', async () => {
      if (!testProjectId) {
        test.skip();
        return;
      }

      // 创建任务
      const taskResponse = await api.post('/tasks', {
        project_id: testProjectId,
        description: `延期测试任务_${generateUniqueId()}`,
        task_type: 'firmware',
        priority: 'high',
      });

      if (taskResponse.ok && taskResponse.data.data?.id) {
        const taskId = taskResponse.data.data.id;

        // 获取延期记录
        const response = await api.get(`/tasks/${taskId}/delays`);

        expect(response.ok).toBe(true);
        expect(response.data).toHaveProperty('success');
      }
    });

    test('添加延期原因', async () => {
      if (!testProjectId) {
        test.skip();
        return;
      }

      // 创建任务
      const taskResponse = await api.post('/tasks', {
        project_id: testProjectId,
        description: `延期原因测试_${generateUniqueId()}`,
        task_type: 'firmware',
      });

      if (taskResponse.ok && taskResponse.data.data?.id) {
        const taskId = taskResponse.data.data.id;

        // 添加延期原因
        const response = await api.post(`/tasks/${taskId}/delays`, {
          reason: '等待第三方接口',
          delay_days: 5,
        });

        // 验证结果
        expect([200, 201, 403, 404]).toContain(response.status);
      }
    });
  });

  // ==================== 计划变更历史 ====================

  test.describe('计划变更历史', () => {
    test('获取任务变更历史', async () => {
      if (!testProjectId) {
        test.skip();
        return;
      }

      // 创建任务
      const taskResponse = await api.post('/tasks', {
        project_id: testProjectId,
        description: `变更历史测试_${generateUniqueId()}`,
        task_type: 'firmware',
      });

      if (taskResponse.ok && taskResponse.data.data?.id) {
        const taskId = taskResponse.data.data.id;

        // 获取变更历史
        const response = await api.get(`/tasks/${taskId}/changes`);

        expect(response.ok).toBe(true);
        expect(response.data).toHaveProperty('success');
      }
    });
  });

  // ==================== 通知系统 ====================

  test.describe('通知系统', () => {
    test('获取通知列表', async () => {
      const response = await api.get('/notifications');

      expect(response.ok).toBe(true);
      expect(response.data).toHaveProperty('success');
      expect(response.data.data).toHaveProperty('items');
    });

    test('获取未读通知数量', async () => {
      const response = await api.get('/notifications/unread-count');

      expect(response.ok).toBe(true);
      expect(response.data).toHaveProperty('success');
    });

    test('标记通知为已读', async () => {
      // 先获取通知列表
      const listResponse = await api.get('/notifications');

      if (listResponse.ok && listResponse.data.data?.items?.length > 0) {
        const notificationId = listResponse.data.data.items[0].id;

        const response = await api.put(`/notifications/${notificationId}/read`);

        expect(response.ok).toBe(true);
      }
    });
  });
});
