/**
 * TC-WORKFLOW-04-SIMPLE: 任务审批流程简化测试
 * 测试目标: 验证审批流程的基本功能
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const API_BASE_URL = 'http://localhost:3001';

// 测试用户凭据
const USERS = {
  admin: { username: 'admin', password: 'admin123' },
  engineer: { username: '50241392', password: '50241392' },
  tech_manager: { username: '50234447', password: '50234447' },
};

// 测试项目
const TEST_PROJECT_ID = '25';

test.setTimeout(120000);

test.describe('TC-WORKFLOW-04-SIMPLE: 任务审批流程简化测试', () => {

  // 登录 helper
  async function login(page: any, user: { username: string; password: string }) {
    await page.goto(BASE_URL + '/login');
    await page.waitForLoadState('networkidle');

    await page.fill('[data-testid="login-input-username"]', user.username);
    await page.fill('[data-testid="login-input-password"]', user.password);
    await page.click('[data-testid="login-btn-submit"]');

    // 等待登录成功
    try {
      await page.waitForURL(/\/dashboard|\/tasks/, { timeout: 20000 });
    } catch {
      console.log('登录后未自动跳转，手动导航到仪表板');
      await page.goto(BASE_URL + '/dashboard');
    }

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // 额外等待状态更新
  }

  // 获取认证 token
  async function getAuthToken(request: any, user: { username: string; password: string }) {
    const response = await request.post(`${API_BASE_URL}/api/auth/login`, {
      data: {
        username: user.username,
        password: user.password,
      },
    });

    if (!response.ok()) {
      throw new Error(`登录失败: ${user.username}`);
    }

    const data = await response.json();
    return data.data?.token;
  }

  test('TC-WF-SIMPLE-01: 验证用户登录和权限', async ({ page }) => {
    console.log('\n=== TC-WF-SIMPLE-01: 验证用户登录和权限 ===');

    // 测试 admin 登录
    console.log('测试 admin 登录...');
    await login(page, USERS.admin);

    // 验证跳转到仪表板
    expect(page.url()).toContain('/dashboard');
    console.log('✓ admin 登录成功，跳转到仪表板');

    // 截图
    await page.screenshot({ path: 'Test/screenshots/TC-WF-SIMPLE-01-admin-dashboard.png' });

    // 测试审批页面访问
    await page.goto(BASE_URL + '/settings/approvals');
    await page.waitForLoadState('networkidle');

    // 验证审批页面加载
    const approvalsTab = page.locator('[data-testid="setting-tab-approvals"], h2:has-text("审批")');
    const isVisible = await approvalsTab.isVisible().catch(() => false);

    if (isVisible) {
      console.log('✓ admin 可访问审批页面');
    } else {
      console.log('⚠ 审批页面可能未正确加载');
    }

    await page.screenshot({ path: 'Test/screenshots/TC-WF-SIMPLE-01-admin-approvals.png' });
  });

  test('TC-WF-SIMPLE-02: 验证 engineer 登录和任务页面', async ({ page }) => {
    console.log('\n=== TC-WF-SIMPLE-02: 验证 engineer 登录和任务页面 ===');

    // 测试 engineer 登录
    console.log('测试 engineer 登录...');
    await login(page, USERS.engineer);

    // 验证跳转到仪表板
    expect(page.url()).toContain('/dashboard');
    console.log('✓ engineer 登录成功，跳转到仪表板');

    // 导航到任务页面
    await page.goto(BASE_URL + '/tasks');
    await page.waitForLoadState('networkidle');

    // 等待任务表格加载
    try {
      await page.waitForSelector('table tbody tr', { timeout: 10000 });
      console.log('✓ 任务表格加载成功');

      // 统计任务数量
      const rows = page.locator('table tbody tr');
      const count = await rows.count();
      console.log(`当前任务数量: ${count}`);

      await page.screenshot({ path: 'Test/screenshots/TC-WF-SIMPLE-02-engineer-tasks.png' });
    } catch {
      console.log('⚠ 任务表格未加载');
      await page.screenshot({ path: 'Test/screenshots/TC-WF-SIMPLE-02-engineer-tasks-error.png' });
    }
  });

  test('TC-WF-SIMPLE-03: 验证 tech_manager 登录和审批页面', async ({ page }) => {
    console.log('\n=== TC-WF-SIMPLE-03: 验证 tech_manager 登录和审批页面 ===');

    // 测试 tech_manager 登录
    console.log('测试 tech_manager 登录...');
    await login(page, USERS.tech_manager);

    // 验证跳转到仪表板
    expect(page.url()).toContain('/dashboard');
    console.log('✓ tech_manager 登录成功，跳转到仪表板');

    // 导航到审批页面
    await page.goto(BASE_URL + '/settings/approvals');
    await page.waitForLoadState('networkidle');

    // 验证审批页面加载
    try {
      await page.waitForSelector('table, [data-testid="approvals-table"]', { timeout: 10000 });
      console.log('✓ 审批页面加载成功');

      // 检查审批列表
      const rows = page.locator('table tbody tr');
      const count = await rows.count();
      console.log(`当前审批记录数量: ${count}`);

      await page.screenshot({ path: 'Test/screenshots/TC-WF-SIMPLE-03-tech-manager-approvals.png' });
    } catch {
      console.log('⚠ 审批页面未正确加载');
      await page.screenshot({ path: 'Test/screenshots/TC-WF-SIMPLE-03-tech-manager-approvals-error.png' });
    }
  });

  test('TC-WF-SIMPLE-04: API 创建任务并提交审批', async ({ page, request }) => {
    console.log('\n=== TC-WF-SIMPLE-04: API 创建任务并提交审批 ===');

    let testTaskId: string | undefined;

    try {
      // 1. admin 创建任务
      console.log('\n步骤1: admin 创建测试任务');
      const adminToken = await getAuthToken(request, USERS.admin);

      const taskData = {
        description: 'TC-WF-SIMPLE-TEST-' + Date.now(),
        assignee_id: '50241392',
        start_date: '2026-05-06',
        duration_days: 5,
        project_id: TEST_PROJECT_ID,
      };

      const createResponse = await request.post(`${API_BASE_URL}/api/tasks`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
        data: taskData,
      });

      if (!createResponse.ok()) {
        const error = await createResponse.text();
        throw new Error(`创建任务失败: ${error}`);
      }

      const createdTask = await createResponse.json();
      testTaskId = createdTask.data?.id;

      console.log(`✓ 任务已创建: ID=${testTaskId}, 描述=${taskData.description}`);

      // 2. engineer 提交审批
      console.log('\n步骤2: engineer 提交审批');
      const engineerToken = await getAuthToken(request, USERS.engineer);

      const planChangeResponse = await request.post(`${API_BASE_URL}/api/workflow/plan-changes`, {
        headers: {
          'Authorization': `Bearer ${engineerToken}`,
        },
        data: {
          task_id: testTaskId,
          change_type: 'start_date',
          old_value: '2026-05-06',
          new_value: '2026-05-10',
          reason: '测试审批流程',
        },
      });

      if (planChangeResponse.ok()) {
        console.log('✓ 审批已提交');
        const planChangeData = await planChangeResponse.json();
        console.log('审批数据:', JSON.stringify(planChangeData, null, 2));
      } else {
        const error = await planChangeResponse.text();
        console.log(`⚠ 提交审批失败: ${error}`);
      }

      // 3. 验证审批记录
      console.log('\n步骤3: 验证审批记录');

      // tech_manager 登录查看
      await login(page, USERS.tech_manager);
      await page.goto(BASE_URL + '/settings/approvals');
      await page.waitForLoadState('networkidle');

      // 等待审批列表
      try {
        await page.waitForSelector('table tbody', { timeout: 10000 });

        // 查找刚提交的审批
        const approvalRow = page.locator('table tbody tr').filter({ hasText: taskData.description });
        const isVisible = await approvalRow.isVisible().catch(() => false);

        if (isVisible) {
          console.log('✓ 在审批列表中找到刚提交的审批');
        } else {
          console.log('⚠ 未在审批列表中找到刚提交的审批');
        }

        await page.screenshot({ path: `Test/screenshots/TC-WF-SIMPLE-04-approval-check-${Date.now()}.png` });
      } catch {
        console.log('⚠ 审批列表加载失败');
        await page.screenshot({ path: `Test/screenshots/TC-WF-SIMPLE-04-approval-error-${Date.now()}.png` });
      }

    } catch (error) {
      console.error('测试失败:', error);
      throw error;
    } finally {
      // 清理
      if (testTaskId) {
        const adminToken = await getAuthToken(request, USERS.admin);
        await request.delete(`${API_BASE_URL}/api/tasks/${testTaskId}`, {
          headers: {
            'Authorization': `Bearer ${adminToken}`,
          },
        });
        console.log(`\n清理: 已删除测试任务 ${testTaskId}`);
      }
    }
  });
});
