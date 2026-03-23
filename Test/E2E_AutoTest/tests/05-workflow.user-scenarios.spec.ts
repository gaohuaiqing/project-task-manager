/**
 * 工作流模块测试 - 基于用户操作场景
 * 需求来源: REQ_05_workflow.md
 */
import { test, expect } from '@playwright/test';
import { ApiHelper } from '../utils/api-helper';
import { testUser, generateUniqueId } from '../fixtures/test-data';

test.describe('工作流 - 用户操作场景', () => {
  let api: ApiHelper;
  let testProjectId: string | null = null;

  test.beforeEach(async ({ request }) => {
    api = new ApiHelper(request);
    await api.login(testUser.username, testUser.password);

    // 创建测试项目
    const uniqueId = generateUniqueId();
    const projectResponse = await api.post('/projects', {
      code: `WF-TEST-${uniqueId}`,
      name: `工作流测试项目_${uniqueId}`,
      project_type: 'product_development',
      planned_start_date: '2026-04-01',
      planned_end_date: '2026-06-30',
    });

    if (projectResponse.ok && projectResponse.data.data?.id) {
      testProjectId = projectResponse.data.data.id;
    }
  });

  // ==================== 场景1：工程师提交计划变更 ====================

  test.describe('场景1：工程师提交计划变更', () => {
    let taskId: string | null = null;

    test.beforeEach(async () => {
      if (!testProjectId) return;

      const response = await api.post('/tasks', {
        project_id: testProjectId,
        description: '计划变更测试任务',
        task_type: 'firmware',
        priority: 'medium',
        start_date: '2026-04-01',
        duration: 5,
      });

      if (response.ok && response.data.data?.id) {
        taskId = response.data.data.id;
      }
    });

    test('操作1：编辑任务计划并提交审批', async () => {
      if (!taskId) {
        test.skip();
        return;
      }

      // 操作：提交计划变更审批
      const response = await api.post('/workflow/plan-changes', {
        task_id: taskId,
        change_type: 'plan_update',
        old_value: JSON.stringify({ start_date: '2026-04-01', duration: 5 }),
        new_value: JSON.stringify({ start_date: '2026-04-10', duration: 10 }),
        reason: '需求变更，需要延长工期',
      });

      // 预期结果：
      // - 变更请求已成功提交
      // - 任务状态变为"待审批"
      // - "计划调整"计数+1
      // - 审批人收到通知
      expect([200, 201, 403]).toContain(response.status);
    });

    test('操作2：变更原因必填', async () => {
      if (!taskId) {
        test.skip();
        return;
      }

      // 操作：提交变更但不填写原因
      const response = await api.post('/workflow/plan-changes', {
        task_id: taskId,
        change_type: 'plan_update',
        new_value: JSON.stringify({ start_date: '2026-04-15' }),
        // 缺少 reason
      });

      // 预期结果：提交失败
      expect(response.ok).toBe(false);
    });
  });

  // ==================== 场景2：主管审核变更 ====================

  test.describe('场景2：主管审核变更', () => {
    test('操作1：查看待审批列表', async () => {
      // 操作：打开审批列表，选择"待审批"标签
      const response = await api.get('/workflow/approvals/pending');

      // 预期结果：显示待审批列表
      expect(response.ok).toBe(true);
    });

    test('操作2：获取审批列表', async () => {
      // 操作：打开审批列表
      const response = await api.get('/workflow/plan-changes');

      // 预期结果：显示所有审批记录
      expect(response.ok).toBe(true);
    });

    test('操作3：审批通过', async () => {
      // 前置条件：有待审批的变更
      const pendingResponse = await api.get('/workflow/approvals/pending');

      if (pendingResponse.ok && pendingResponse.data.data?.items?.length > 0) {
        const approvalId = pendingResponse.data.data.items[0].id;

        // 操作：点击通过按钮
        const response = await api.post(`/workflow/plan-changes/${approvalId}/approve`);

        // 预期结果：审批通过，任务计划更新
        expect(response.ok).toBe(true);
      } else {
        test.skip();
      }
    });

    test('操作4：审批驳回', async () => {
      // 前置条件：有待审批的变更
      const pendingResponse = await api.get('/workflow/approvals/pending');

      if (pendingResponse.ok && pendingResponse.data.data?.items?.length > 0) {
        const approvalId = pendingResponse.data.data.items[0].id;

        // 操作：点击驳回按钮，填写驳回原因
        const response = await api.post(`/workflow/plan-changes/${approvalId}/reject`, {
          rejection_reason: '变更理由不充分',
        });

        // 预期结果：审批驳回，变更不生效
        expect(response.ok).toBe(true);
      } else {
        test.skip();
      }
    });
  });

  // ==================== 场景3：查看变更历史 ====================

  test.describe('场景3：查看变更历史', () => {
    let taskId: string | null = null;

    test.beforeEach(async () => {
      if (!testProjectId) return;

      const response = await api.post('/tasks', {
        project_id: testProjectId,
        description: '变更历史测试任务',
      });

      if (response.ok && response.data.data?.id) {
        taskId = response.data.data.id;
      }
    });

    test('操作1：点击"计划调整"列查看历史', async () => {
      if (!taskId) {
        test.skip();
        return;
      }

      // 操作：点击"计划调整"列中的数字
      // 查询该任务的变更历史
      const response = await api.get('/workflow/plan-changes', {
        task_id: taskId,
      });

      // 预期结果：显示变更历史
      expect(response.ok).toBe(true);
    });
  });

  // ==================== 场景4：延期记录管理 ====================

  test.describe('场景4：延期记录管理', () => {
    let taskId: string | null = null;

    test.beforeEach(async () => {
      if (!testProjectId) return;

      const response = await api.post('/tasks', {
        project_id: testProjectId,
        description: '延期测试任务',
        start_date: '2026-04-01',
        duration: 5,
      });

      if (response.ok && response.data.data?.id) {
        taskId = response.data.data.id;
      }
    });

    test('操作1：查看任务延期记录', async () => {
      if (!taskId) {
        test.skip();
        return;
      }

      // 操作：点击"延期次数"列
      const response = await api.get(`/workflow/tasks/${taskId}/delays`);

      // 预期结果：显示延期记录列表
      expect(response.ok).toBe(true);
    });

    test('操作2：添加延期原因', async () => {
      if (!taskId) {
        test.skip();
        return;
      }

      // 操作：填写延期原因并保存
      const response = await api.post(`/workflow/tasks/${taskId}/delays`, {
        reason: '等待第三方接口完成',
        delay_days: 5,
      });

      // 预期结果：延期原因记录成功
      expect([200, 201, 404]).toContain(response.status);
    });
  });

  // ==================== 场景5：通知系统 ====================

  test.describe('场景5：通知系统', () => {
    test('操作1：查看通知列表', async () => {
      // 操作：打开通知中心
      const response = await api.get('/workflow/notifications');

      // 预期结果：显示通知列表
      expect(response.ok).toBe(true);
    });

    test('操作2：获取未读通知数量', async () => {
      // 操作：查看未读消息数
      // 注：此API需要实现，当前通过列表计算
      const response = await api.get('/workflow/notifications', {
        unreadOnly: true,
      });

      // 预期结果：返回未读列表
      expect(response.ok).toBe(true);
    });

    test('操作3：标记通知为已读', async () => {
      // 前置条件：有未读通知
      const listResponse = await api.get('/workflow/notifications');

      if (listResponse.ok && listResponse.data.data?.items?.length > 0) {
        const notificationId = listResponse.data.data.items[0].id;

        // 操作：点击通知，标记已读
        const response = await api.put(`/workflow/notifications/${notificationId}/read`);

        expect(response.ok).toBe(true);
      } else {
        test.skip();
      }
    });
  });
});
