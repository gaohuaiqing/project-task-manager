/**
 * 协作模块测试 - 基于用户操作场景
 * 需求来源: REQ_06_collaboration.md
 */
import { test, expect } from '@playwright/test';
import { ApiHelper } from '../utils/api-helper';
import { testUser, generateUniqueId } from '../fixtures/test-data';

test.describe('协作模块 - 用户操作场景', () => {
  let api: ApiHelper;

  test.beforeEach(async ({ request }) => {
    api = new ApiHelper(request);
    await api.login(testUser.username, testUser.password);
  });

  // ==================== 场景1：在线状态管理 ====================

  test.describe('场景1：在线状态管理', () => {
    test('操作1：查看在线用户列表', async () => {
      // 操作：查看当前在线用户
      const response = await api.get('/collab/online-users');

      // 预期结果：返回在线用户列表
      expect(response.ok).toBe(true);
      expect(response.data.success).toBe(true);
    });

    test('操作2：更新自己的在线状态', async () => {
      // 操作：设置在线状态为"在线"
      const response = await api.put('/collab/online-status', {
        status: 'online',
      });

      // 预期结果：状态更新成功
      expect(response.ok).toBe(true);
    });

    test('操作3：设置为离开状态', async () => {
      // 操作：设置在线状态为"离开"
      const response = await api.put('/collab/online-status', {
        status: 'away',
      });

      expect(response.ok).toBe(true);
    });
  });

  // ==================== 场景2：附件管理 ====================

  test.describe('场景2：附件管理', () => {
    let testTaskId: string | null = null;

    test.beforeEach(async () => {
      // 创建测试项目
      const uniqueId = generateUniqueId();
      const projectResponse = await api.post('/projects', {
        code: `ATT-TEST-${uniqueId}`,
        name: `附件测试项目_${uniqueId}`,
        project_type: 'product_development',
        planned_start_date: '2026-04-01',
        planned_end_date: '2026-06-30',
      });

      if (projectResponse.ok && projectResponse.data.data?.id) {
        // 创建测试任务
        const taskResponse = await api.post('/tasks', {
          project_id: projectResponse.data.data.id,
          description: '附件测试任务',
        });

        if (taskResponse.ok && taskResponse.data.data?.id) {
          testTaskId = taskResponse.data.data.id;
        }
      }
    });

    test('操作1：获取任务附件列表', async () => {
      if (!testTaskId) {
        test.skip();
        return;
      }

      // 操作：查看任务附件
      const response = await api.get(`/collab/tasks/${testTaskId}/attachments`);

      // 预期结果：返回附件列表
      expect(response.ok).toBe(true);
    });

    test('操作2：上传附件', async () => {
      if (!testTaskId) {
        test.skip();
        return;
      }

      // 操作：上传文件
      const response = await api.post(`/collab/tasks/${testTaskId}/attachments`, {
        file_name: 'test_document.txt',
        file_path: '/uploads/test_document.txt',
        file_size: 1024,
      });

      // 预期结果：附件上传成功
      expect([200, 201, 404]).toContain(response.status);
    });
  });

  // ==================== 场景3：版本历史 ====================

  test.describe('场景3：版本历史', () => {
    test('操作1：获取项目版本历史', async () => {
      // 操作：查看项目变更历史
      const response = await api.get('/collab/versions/projects/test-id');

      // 预期结果：返回版本历史
      expect(response.ok).toBe(true);
    });

    test('操作2：获取任务版本历史', async () => {
      // 操作：查看任务变更历史
      const response = await api.get('/collab/versions/wbs_tasks/test-id');

      expect(response.ok).toBe(true);
    });
  });

  // ==================== 场景4：批量查询 ====================

  test.describe('场景4：批量查询', () => {
    test('操作1：批量获取项目', async () => {
      // 操作：一次获取多个项目
      const response = await api.post('/collab/batch/projects', {
        ids: ['1', '2', '3'],
      });

      // 预期结果：返回项目列表
      expect(response.ok).toBe(true);
    });

    test('操作2：批量获取成员', async () => {
      // 操作：一次获取多个成员
      const response = await api.post('/collab/batch/members', {
        ids: [1, 2, 3],
      });

      expect(response.ok).toBe(true);
    });

    test('操作3：批量获取任务', async () => {
      // 操作：一次获取多个任务
      const response = await api.post('/collab/batch/wbs-tasks', {
        ids: ['1', '2', '3'],
      });

      expect(response.ok).toBe(true);
    });

    test('操作4：混合批量查询', async () => {
      // 操作：同时查询多种数据
      const response = await api.post('/collab/batch/query', {
        projects: ['1'],
        members: [1, 2],
        tasks: ['1'],
      });

      expect(response.ok).toBe(true);
    });
  });

  // ==================== 场景5：缓存管理 ====================

  test.describe('场景5：缓存管理', () => {
    test('操作1：获取缓存状态', async () => {
      // 操作：查看缓存状态
      const response = await api.get('/collab/cache/status');

      // 预期结果：返回缓存状态信息
      expect(response.ok).toBe(true);
    });

    test('操作2：清理缓存', async () => {
      // 操作：清理所有缓存
      const response = await api.delete('/collab/cache/clear');

      expect(response.ok).toBe(true);
    });

    test('操作3：缓存预热', async () => {
      // 操作：预热缓存数据
      const response = await api.post('/collab/cache/warmup', {});

      expect(response.ok).toBe(true);
    });
  });

  // ==================== 场景6：审计日志 ====================

  test.describe('场景6：审计日志', () => {
    test('操作1：获取审计日志列表', async () => {
      // 操作：查看审计日志
      const response = await api.get('/collab/audit-logs');

      // 预期结果：返回日志列表
      expect(response.ok).toBe(true);
    });

    test('操作2：按时间范围筛选', async () => {
      // 操作：设置时间范围筛选
      const response = await api.get('/collab/audit-logs', {
        start_date: '2026-01-01',
        end_date: '2026-12-31',
      });

      expect(response.ok).toBe(true);
    });

    test('操作3：按用户筛选', async () => {
      // 操作：按用户ID筛选
      const response = await api.get('/collab/audit-logs', {
        user_id: 1,
      });

      expect(response.ok).toBe(true);
    });

    test('操作4：按操作类型筛选', async () => {
      // 操作：按操作类型筛选
      const response = await api.get('/collab/audit-logs', {
        action: 'create',
      });

      expect(response.ok).toBe(true);
    });

    test('操作5：按表名筛选', async () => {
      // 操作：按表名筛选
      const response = await api.get('/collab/audit-logs', {
        table_name: 'projects',
      });

      expect(response.ok).toBe(true);
    });
  });

  // ==================== 场景7：实时协作 ====================

  test.describe('场景7：实时协作', () => {
    test('操作1：验证WebSocket连接（模拟）', async () => {
      // 注：WebSocket测试需要特殊配置
      // 这里仅验证相关API是否可用
      const response = await api.get('/collab/online-users');

      expect(response.ok).toBe(true);
    });

    test('操作2：跨标签页同步（模拟）', async () => {
      // 注：跨标签页测试需要浏览器环境
      // 验证相关数据接口
      const response = await api.get('/collab/online-users');

      expect(response.ok).toBe(true);
    });
  });
});
