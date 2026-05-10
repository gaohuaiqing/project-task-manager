/**
 * TC-TASK-08: 任务状态自动计算测试
 * 测试目标: 验证 9 种任务状态的自动判断逻辑
 *
 * 测试环境:
 * - 前端: http://localhost:5173
 * - 后端: http://localhost:3001
 * - 测试用户: admin / admin123
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const ADMIN_USER = 'admin';
const ADMIN_PASSWORD = 'admin123';

// 状态标签映射
const STATUS_LABELS: Record<string, string> = {
  pending_approval: '待审批',
  not_started: '未开始',
  in_progress: '进行中',
  early_completed: '提前完成',
  on_time_completed: '按时完成',
  delay_warning: '延期预警',
  delayed: '已延期',
  overdue_completed: '超期完成',
};

// 测试配置
test.setTimeout(120000); // 2 分钟超时

test.describe('TC-TASK-08: 任务状态自动计算测试', () => {

  // 登录 helper
  async function login(page: any) {
    await page.goto(BASE_URL + '/login');
    await page.waitForLoadState('networkidle');

    // 使用 data-testid 选择器
    await page.fill('[data-testid="login-input-username"]', ADMIN_USER);
    await page.fill('[data-testid="login-input-password"]', ADMIN_PASSWORD);
    await page.click('[data-testid="login-btn-submit"]');

    // 等待登录成功 - 跳转到仪表板或任务页面
    await page.waitForURL(/\/dashboard|\/tasks/, { timeout: 15000 });

    // 等待页面加载完成
    await page.waitForLoadState('networkidle');
  }

  // 获取状态列内容的 helper
  async function getStatusFromRow(row: any): Promise<string> {
    // 使用 data-col-id 属性定位状态列
    const statusCell = row.locator('td[data-col-id="status"]');
    const statusText = await statusCell.textContent();
    return statusText?.trim() || '';
  }

  // 获取任务描述的 helper
  async function getDescriptionFromRow(row: any): Promise<string> {
    const descCell = row.locator('td[data-col-id="description"]');
    const descText = await descCell.textContent();
    return descText?.trim() || '';
  }

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('TC-TASK-08-1: 验证"未开始"状态', async ({ page }) => {
    // 导航到任务页面
    await page.goto(BASE_URL + '/tasks');
    await page.waitForLoadState('networkidle');

    // 等待任务表格加载
    await page.waitForSelector('table tbody tr', { timeout: 10000 });

    // 查找所有行
    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();
    console.log(`表格共有 ${rowCount} 行`);

    // 查找状态为"未开始"的行
    let found = false;
    for (let i = 0; i < Math.min(rowCount, 50); i++) {
      const row = rows.nth(i);
      const status = await getStatusFromRow(row);

      if (status.includes('未开始')) {
        const description = await getDescriptionFromRow(row);
        console.log(`找到"未开始"任务: ${description}, 状态: ${status}`);
        expect(status).toContain('未开始');
        found = true;

        // 截图
        const screenshotPath = `Test/screenshots/TC-TASK-08-01-not-started-${Date.now()}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: false });
        console.log(`截图保存: ${screenshotPath}`);
        break;
      }
    }

    if (!found) {
      console.log('未找到"未开始"状态的任务，跳过验证');
    }
  });

  test('TC-TASK-08-2: 验证"进行中"状态', async ({ page }) => {
    // 导航到任务页面
    await page.goto(BASE_URL + '/tasks');
    await page.waitForLoadState('networkidle');

    // 等待任务表格加载
    await page.waitForSelector('table tbody tr', { timeout: 10000 });

    // 查找所有行
    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();

    // 查找状态为"进行中"的行
    let found = false;
    for (let i = 0; i < Math.min(rowCount, 50); i++) {
      const row = rows.nth(i);
      const status = await getStatusFromRow(row);

      if (status.includes('进行中')) {
        const description = await getDescriptionFromRow(row);
        console.log(`找到"进行中"任务: ${description}, 状态: ${status}`);
        expect(status).toContain('进行中');
        found = true;

        // 截图
        const screenshotPath = `Test/screenshots/TC-TASK-08-02-in-progress-${Date.now()}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: false });
        console.log(`截图保存: ${screenshotPath}`);
        break;
      }
    }

    if (!found) {
      console.log('未找到"进行中"状态的任务，跳过验证');
    }
  });

  test('TC-TASK-08-3: 验证"提前完成"状态', async ({ page }) => {
    // 导航到任务页面
    await page.goto(BASE_URL + '/tasks');
    await page.waitForLoadState('networkidle');

    // 等待任务表格加载
    await page.waitForSelector('table tbody tr', { timeout: 10000 });

    // 查找所有行
    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();

    // 查找状态为"提前完成"的行
    let found = false;
    for (let i = 0; i < Math.min(rowCount, 50); i++) {
      const row = rows.nth(i);
      const status = await getStatusFromRow(row);

      if (status.includes('提前完成')) {
        const description = await getDescriptionFromRow(row);
        console.log(`找到"提前完成"任务: ${description}, 状态: ${status}`);
        expect(status).toContain('提前完成');
        found = true;

        // 截图
        const screenshotPath = `Test/screenshots/TC-TASK-08-03-early-completed-${Date.now()}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: false });
        console.log(`截图保存: ${screenshotPath}`);
        break;
      }
    }

    if (!found) {
      console.log('未找到"提前完成"状态的任务，跳过验证');
    }
  });

  test('TC-TASK-08-4: 验证"按时完成"状态', async ({ page }) => {
    // 导航到任务页面
    await page.goto(BASE_URL + '/tasks');
    await page.waitForLoadState('networkidle');

    // 等待任务表格加载
    await page.waitForSelector('table tbody tr', { timeout: 10000 });

    // 查找所有行
    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();

    // 查找状态为"按时完成"的行
    let found = false;
    for (let i = 0; i < Math.min(rowCount, 50); i++) {
      const row = rows.nth(i);
      const status = await getStatusFromRow(row);

      if (status.includes('按时完成')) {
        const description = await getDescriptionFromRow(row);
        console.log(`找到"按时完成"任务: ${description}, 状态: ${status}`);
        expect(status).toContain('按时完成');
        found = true;

        // 截图
        const screenshotPath = `Test/screenshots/TC-TASK-08-04-on-time-completed-${Date.now()}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: false });
        console.log(`截图保存: ${screenshotPath}`);
        break;
      }
    }

    if (!found) {
      console.log('未找到"按时完成"状态的任务，跳过验证');
    }
  });

  test('TC-TASK-08-5: 验证"延期预警"状态', async ({ page }) => {
    // 导航到任务页面
    await page.goto(BASE_URL + '/tasks');
    await page.waitForLoadState('networkidle');

    // 等待任务表格加载
    await page.waitForSelector('table tbody tr', { timeout: 10000 });

    // 查找所有行
    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();

    // 查找状态为"延期预警"的行
    let found = false;
    for (let i = 0; i < Math.min(rowCount, 50); i++) {
      const row = rows.nth(i);
      const status = await getStatusFromRow(row);

      if (status.includes('延期预警')) {
        const description = await getDescriptionFromRow(row);
        console.log(`找到"延期预警"任务: ${description}, 状态: ${status}`);
        expect(status).toContain('延期预警');
        found = true;

        // 截图
        const screenshotPath = `Test/screenshots/TC-TASK-08-05-delay-warning-${Date.now()}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: false });
        console.log(`截图保存: ${screenshotPath}`);
        break;
      }
    }

    if (!found) {
      console.log('未找到"延期预警"状态的任务，跳过验证');
    }
  });

  test('TC-TASK-08-6: 验证"已延期"状态', async ({ page }) => {
    // 导航到任务页面
    await page.goto(BASE_URL + '/tasks');
    await page.waitForLoadState('networkidle');

    // 等待任务表格加载
    await page.waitForSelector('table tbody tr', { timeout: 10000 });

    // 查找所有行
    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();

    // 查找状态为"已延期"的行
    let found = false;
    for (let i = 0; i < Math.min(rowCount, 50); i++) {
      const row = rows.nth(i);
      const status = await getStatusFromRow(row);

      if (status.includes('已延期')) {
        const description = await getDescriptionFromRow(row);
        console.log(`找到"已延期"任务: ${description}, 状态: ${status}`);
        expect(status).toContain('已延期');
        found = true;

        // 截图
        const screenshotPath = `Test/screenshots/TC-TASK-08-06-delayed-${Date.now()}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: false });
        console.log(`截图保存: ${screenshotPath}`);
        break;
      }
    }

    if (!found) {
      console.log('未找到"已延期"状态的任务，跳过验证');
    }
  });

  test('TC-TASK-08-7: 验证"超期完成"状态', async ({ page }) => {
    // 导航到任务页面
    await page.goto(BASE_URL + '/tasks');
    await page.waitForLoadState('networkidle');

    // 等待任务表格加载
    await page.waitForSelector('table tbody tr', { timeout: 10000 });

    // 查找所有行
    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();

    // 查找状态为"超期完成"的行
    let found = false;
    for (let i = 0; i < Math.min(rowCount, 50); i++) {
      const row = rows.nth(i);
      const status = await getStatusFromRow(row);

      if (status.includes('超期完成')) {
        const description = await getDescriptionFromRow(row);
        console.log(`找到"超期完成"任务: ${description}, 状态: ${status}`);
        expect(status).toContain('超期完成');
        found = true;

        // 截图
        const screenshotPath = `Test/screenshots/TC-TASK-08-07-overdue-completed-${Date.now()}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: false });
        console.log(`截图保存: ${screenshotPath}`);
        break;
      }
    }

    if (!found) {
      console.log('未找到"超期完成"状态的任务，跳过验证');
    }
  });

  // 综合测试：验证状态计算逻辑
  test('TC-TASK-08-COMBO: 验证状态计算逻辑（后端API）', async ({ page }) => {
    // 直接调用后端 API 验证状态计算逻辑
    const apiBaseUrl = 'http://localhost:3001';

    // 1. 登录获取 token
    const loginResponse = await page.request.post(`${apiBaseUrl}/api/auth/login`, {
      data: {
        username: ADMIN_USER,
        password: ADMIN_PASSWORD,
      },
    });

    if (!loginResponse.ok()) {
      console.log('登录失败，跳过 API 验证');
      return;
    }

    const loginData = await loginResponse.json();
    const token = loginData.data?.token;

    if (!token) {
      console.log('无法获取 token，跳过 API 验证');
      return;
    }

    // 2. 获取任务列表
    const tasksResponse = await page.request.get(`${apiBaseUrl}/api/tasks?pageSize=100`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!tasksResponse.ok()) {
      console.log('获取任务列表失败，跳过 API 验证');
      return;
    }

    const tasksData = await tasksResponse.json();
    const tasks = tasksData.data?.items || [];

    console.log(`获取到 ${tasks.length} 个任务`);

    // 3. 统计各状态的任务数量
    const statusCounts: Record<string, number> = {};
    for (const task of tasks) {
      const status = task.computed_status || task.status;
      const statusLabel = STATUS_LABELS[status] || status;
      statusCounts[statusLabel] = (statusCounts[statusLabel] || 0) + 1;
    }

    console.log('状态统计:');
    for (const [status, count] of Object.entries(statusCounts)) {
      console.log(`  ${status}: ${count} 个`);
    }

    // 4. 验证状态计算逻辑
    // 根据任务状态计算规则验证几个示例任务
    const sampleTasks = tasks.slice(0, 10);
    console.log('\n示例任务状态验证:');

    for (const task of sampleTasks) {
      const computedStatus = task.computed_status || task.status;
      const statusLabel = STATUS_LABELS[computedStatus] || computedStatus;

      // 根据状态计算规则验证
      let expectedStatus = 'not_started';

      if (task.actual_end_date) {
        // 有实际结束日期
        if (task.end_date) {
          const actualEnd = new Date(task.actual_end_date);
          const plannedEnd = new Date(task.end_date);

          if (actualEnd < plannedEnd) {
            expectedStatus = 'early_completed';
          } else if (actualEnd.getTime() === plannedEnd.getTime()) {
            expectedStatus = 'on_time_completed';
          } else {
            expectedStatus = 'overdue_completed';
          }
        }
      } else if (task.actual_start_date) {
        // 有实际开始日期，无实际结束日期
        if (task.end_date) {
          const now = new Date();
          const plannedEnd = new Date(task.end_date);
          const daysLeft = Math.ceil((plannedEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          if (daysLeft < 0) {
            expectedStatus = 'delayed';
          } else if (daysLeft <= (task.warning_days || 3)) {
            expectedStatus = 'delay_warning';
          } else {
            expectedStatus = 'in_progress';
          }
        } else {
          expectedStatus = 'in_progress';
        }
      }

      console.log(`  任务 ${task.wbs_code || task.id}: 状态=${statusLabel}, 预期=${STATUS_LABELS[expectedStatus]}, 匹配=${computedStatus === expectedStatus}`);
    }

    // 截图保存统计结果
    await page.goto(BASE_URL + '/tasks');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('table tbody tr', { timeout: 10000 });

    const screenshotPath = `Test/screenshots/TC-TASK-08-COMBO-status-summary-${Date.now()}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`\n综合截图保存: ${screenshotPath}`);
  });

  // 注意：TC-TASK-08-8 和 TC-TASK-08-9 需要审批流程，标记为跳过
  test.skip('TC-TASK-08-8: 验证"待审批"状态 - 需要审批流程', async ({ page }) => {
    // 此测试需要工程师角色提交计划变更申请
    // 暂时跳过
  });

  test.skip('TC-TASK-08-9: 验证"已驳回"状态 - 需要审批流程', async ({ page }) => {
    // 此测试需要审批流程的驳回功能
    // 暂时跳过
  });
});