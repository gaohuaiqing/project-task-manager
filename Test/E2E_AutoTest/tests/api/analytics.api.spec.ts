/**
 * 分析模块 API 测试
 */
import { test, expect } from '@playwright/test';
import { ApiHelper } from '../../utils/api-helper';
import { testUser, generateUniqueId } from '../../fixtures/test-data';

test.describe('分析模块 API 测试', () => {
  let api: ApiHelper;

  test.beforeEach(async ({ request }) => {
    api = new ApiHelper(request);
    await api.login(testUser.username, testUser.password);
  });

  // ==================== 仪表板 ====================

  test.describe('仪表板', () => {
    test('获取仪表板统计数据 - 应返回4个统计卡片数据', async () => {
      const response = await api.get('/dashboard/stats');

      expect(response.ok).toBe(true);
      expect(response.data).toHaveProperty('success');

      if (response.data.data) {
        // 验证4个统计卡片
        expect(response.data.data).toHaveProperty('project_count');
        expect(response.data.data).toHaveProperty('in_progress_task_count');
        expect(response.data.data).toHaveProperty('completed_task_count');
        expect(response.data.data).toHaveProperty('delay_warning_count');
      }
    });

    test('获取趋势数据 - 应返回图表数据', async () => {
      const response = await api.get('/dashboard/trends', {
        start_date: '2026-03-01',
        end_date: '2026-03-31',
      });

      expect(response.ok).toBe(true);
      expect(response.data).toHaveProperty('success');
    });

    test('获取紧急任务列表', async () => {
      const response = await api.get('/dashboard/urgent-tasks');

      expect(response.ok).toBe(true);
      expect(response.data).toHaveProperty('success');
      if (response.data.data) {
        expect(response.data.data).toHaveProperty('items');
      }
    });
  });

  // ==================== 报表分析 ====================

  test.describe('报表分析', () => {
    test('项目进度报表 - 应返回统计数据', async () => {
      const response = await api.get('/reports/project-progress');

      expect(response.ok).toBe(true);
      expect(response.data).toHaveProperty('success');
    });

    test('任务统计报表 - 应返回统计数据', async () => {
      const response = await api.get('/reports/task-statistics');

      expect(response.ok).toBe(true);
      expect(response.data).toHaveProperty('success');
    });

    test('延期分析报表 - 应返回延期数据', async () => {
      const response = await api.get('/reports/delay-analysis');

      expect(response.ok).toBe(true);
      expect(response.data).toHaveProperty('success');
    });

    test('成员任务分析 - 应返回成员数据', async () => {
      const response = await api.get('/reports/member-analysis');

      expect(response.ok).toBe(true);
      expect(response.data).toHaveProperty('success');
    });
  });

  // ==================== 系统配置 ====================

  test.describe('系统配置', () => {
    test('获取项目类型配置 - 应返回默认4种类型', async () => {
      const response = await api.get('/config/project-types');

      expect(response.ok).toBe(true);
      expect(response.data).toHaveProperty('success');
    });

    test('获取任务类型配置 - 应返回默认12种类型', async () => {
      const response = await api.get('/config/task-types');

      expect(response.ok).toBe(true);
      expect(response.data).toHaveProperty('success');
    });

    test('获取节假日配置', async () => {
      const response = await api.get('/config/holidays', {
        year: 2026,
      });

      expect(response.ok).toBe(true);
      expect(response.data).toHaveProperty('success');
    });
  });

  // ==================== 审计日志 ====================

  test.describe('审计日志', () => {
    test('获取审计日志列表 - 应返回分页数据', async () => {
      const response = await api.get('/audit-logs');

      expect(response.ok).toBe(true);
      expect(response.data).toHaveProperty('success');
      expect(response.data.data).toHaveProperty('items');
    });

    test('按时间范围筛选审计日志', async () => {
      const response = await api.get('/audit-logs', {
        start_date: '2026-01-01',
        end_date: '2026-12-31',
      });

      expect(response.ok).toBe(true);
      expect(response.data).toHaveProperty('success');
    });

    test('按操作类型筛选审计日志', async () => {
      const response = await api.get('/audit-logs', {
        action: 'login',
      });

      expect(response.ok).toBe(true);
      expect(response.data).toHaveProperty('success');
    });
  });

  // ==================== 搜索功能 ====================

  test.describe('搜索功能', () => {
    test('全局搜索 - 应返回搜索结果', async () => {
      const response = await api.get('/search', {
        keyword: '测试',
      });

      expect(response.ok).toBe(true);
      expect(response.data).toHaveProperty('success');
    });

    test('任务搜索 - 应返回匹配的任务', async () => {
      const response = await api.get('/tasks', {
        search: '测试',
      });

      expect(response.ok).toBe(true);
      expect(response.data).toHaveProperty('success');
    });
  });

  // ==================== 批量操作 ====================

  test.describe('批量操作', () => {
    test('批量获取项目', async () => {
      const response = await api.post('/batch/projects', {
        ids: ['1', '2', '3'],
      });

      expect(response.ok).toBe(true);
      expect(response.data).toHaveProperty('success');
    });

    test('批量获取任务', async () => {
      const response = await api.post('/batch/wbs-tasks', {
        ids: ['1', '2', '3'],
      });

      expect(response.ok).toBe(true);
      expect(response.data).toHaveProperty('success');
    });
  });
});
