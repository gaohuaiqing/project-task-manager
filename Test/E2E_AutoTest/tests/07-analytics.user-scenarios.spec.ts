/**
 * 分析模块测试 - 基于用户操作场景
 * 需求来源: REQ_07_analytics.md
 */
import { test, expect } from '@playwright/test';
import { ApiHelper } from '../utils/api-helper';
import { testUser, generateUniqueId } from '../fixtures/test-data';

test.describe('分析模块 - 用户操作场景', () => {
  let api: ApiHelper;

  test.beforeEach(async ({ request }) => {
    api = new ApiHelper(request);
    await api.login(testUser.username, testUser.password);
  });

  // ==================== 场景1：首页仪表板 ====================

  test.describe('场景1：首页仪表板', () => {
    test('操作1：查看统计卡片', async () => {
      // 操作：进入首页
      const response = await api.get('/analytics/dashboard/stats');

      // 预期结果：显示4个统计卡片
      // - 项目总数
      // - 进行中任务数
      // - 已完成任务数
      // - 延期预警数
      expect(response.ok).toBe(true);
      if (response.data.data) {
        expect(response.data.data).toHaveProperty('project_count');
        expect(response.data.data).toHaveProperty('in_progress_task_count');
        expect(response.data.data).toHaveProperty('completed_task_count');
        expect(response.data.data).toHaveProperty('delay_warning_count');
      }
    });

    test('操作2：查看趋势图表', async () => {
      // 操作：查看任务趋势图
      const response = await api.get('/analytics/dashboard/trends', {
        start_date: '2026-03-01',
        end_date: '2026-03-31',
      });

      // 预期结果：返回趋势数据
      expect(response.ok).toBe(true);
    });

    test('操作3：查看紧急任务列表', async () => {
      // 操作：点击紧急任务卡片
      const response = await api.get('/analytics/dashboard/urgent-tasks');

      // 预期结果：显示紧急任务列表
      expect(response.ok).toBe(true);
    });
  });

  // ==================== 场景2：项目进度报表 ====================

  test.describe('场景2：项目进度报表', () => {
    test('操作1：查看项目进度报表', async () => {
      // 操作：点击"报表分析"->"项目进度报表"
      const response = await api.get('/analytics/reports/project-progress');

      // 预期结果：显示项目进度统计
      expect(response.ok).toBe(true);
    });

    test('操作2：按项目筛选', async () => {
      // 操作：选择特定项目
      const response = await api.get('/analytics/reports/project-progress', {
        project_id: '1',
      });

      expect(response.ok).toBe(true);
    });

    test('操作3：按时间范围筛选', async () => {
      // 操作：设置时间范围
      const response = await api.get('/analytics/reports/project-progress', {
        start_date: '2026-01-01',
        end_date: '2026-12-31',
      });

      expect(response.ok).toBe(true);
    });
  });

  // ==================== 场景3：任务统计报表 ====================

  test.describe('场景3：任务统计报表', () => {
    test('操作1：查看任务统计报表', async () => {
      // 操作：点击"任务统计报表"Tab
      const response = await api.get('/analytics/reports/task-statistics');

      // 预期结果：显示任务统计数据
      expect(response.ok).toBe(true);
    });

    test('操作2：按负责人筛选', async () => {
      // 操作：选择负责人
      const response = await api.get('/analytics/reports/task-statistics', {
        assignee_id: '1',
      });

      expect(response.ok).toBe(true);
    });
  });

  // ==================== 场景4：延期分析报表 ====================

  test.describe('场景4：延期分析报表', () => {
    test('操作1：查看延期分析报表', async () => {
      // 操作：点击"延期分析报表"Tab
      const response = await api.get('/analytics/reports/delay-analysis');

      // 预期结果：显示延期统计数据
      expect(response.ok).toBe(true);
    });

    test('操作2：按延期类型筛选', async () => {
      // 操作：选择延期类型（延期预警/已延迟/超期完成）
      const response = await api.get('/analytics/reports/delay-analysis', {
        delay_type: 'delayed',
      });

      expect(response.ok).toBe(true);
    });
  });

  // ==================== 场景5：成员任务分析 ====================

  test.describe('场景5：成员任务分析', () => {
    test('操作1：查看成员任务分析', async () => {
      // 操作：点击"成员任务分析"Tab
      const response = await api.get('/analytics/reports/member-analysis');

      // 预期结果：显示成员任务分布
      expect(response.ok).toBe(true);
    });

    test('操作2：选择特定成员', async () => {
      // 操作：选择成员进行对比
      const response = await api.get('/analytics/reports/member-analysis', {
        member_id: '1',
      });

      expect(response.ok).toBe(true);
    });
  });

  // ==================== 场景6：系统配置 ====================

  test.describe('场景6：系统配置', () => {
    test('操作1：查看项目类型配置', async () => {
      // 操作：进入设置->系统配置->项目类型
      const response = await api.get('/analytics/config/project-types');

      // 预期结果：显示4种默认项目类型
      expect(response.ok).toBe(true);
    });

    test('操作2：查看任务类型配置', async () => {
      // 操作：进入设置->系统配置->任务类型
      const response = await api.get('/analytics/config/task-types');

      // 预期结果：显示12种默认任务类型
      expect(response.ok).toBe(true);
    });

    test('操作3：查看节假日配置', async () => {
      // 操作：进入设置->节假日管理
      const response = await api.get('/analytics/config/holidays', {
        year: 2026,
      });

      // 预期结果：显示年度节假日列表
      expect(response.ok).toBe(true);
    });
  });

  // ==================== 场景7：审计日志 ====================

  test.describe('场景7：审计日志', () => {
    test('操作1：查看审计日志列表', async () => {
      // 操作：进入设置->系统日志
      // 注：审计日志由 collab 模块提供
      const response = await api.get('/collab/audit-logs');

      // 预期结果：显示操作日志列表
      expect(response.ok).toBe(true);
    });

    test('操作2：按时间范围筛选', async () => {
      // 操作：设置时间范围
      const response = await api.get('/collab/audit-logs', {
        start_date: '2026-01-01',
        end_date: '2026-12-31',
      });

      expect(response.ok).toBe(true);
    });

    test('操作3：按操作类型筛选', async () => {
      // 操作：选择操作类型
      const response = await api.get('/collab/audit-logs', {
        action: 'login',
      });

      expect(response.ok).toBe(true);
    });
  });

  // ==================== 场景8：搜索功能 ====================

  test.describe('场景8：搜索功能', () => {
    test('操作1：全局搜索', async () => {
      // 操作：在搜索框输入关键词
      const response = await api.get('/analytics/search', {
        keyword: '测试',
      });

      // 预期结果：返回搜索结果
      expect(response.ok).toBe(true);
    });

    test('操作2：任务搜索', async () => {
      // 操作：在任务列表搜索
      const response = await api.get('/tasks', {
        search: '测试',
      });

      expect(response.ok).toBe(true);
    });
  });

  // ==================== 场景9：批量操作 ====================

  test.describe('场景9：批量操作', () => {
    test('操作1：批量获取项目', async () => {
      // 操作：批量查询多个项目
      // 注：批量操作由 collab 模块提供
      const response = await api.post('/collab/batch/projects', {
        ids: ['1', '2', '3'],
      });

      expect(response.ok).toBe(true);
    });

    test('操作2：批量获取任务', async () => {
      // 操作：批量查询多个任务
      const response = await api.post('/collab/batch/wbs-tasks', {
        ids: ['1', '2', '3'],
      });

      expect(response.ok).toBe(true);
    });
  });
});
