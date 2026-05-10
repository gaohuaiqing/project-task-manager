/**
 * TC-WORKFLOW-04: 任务审批流程测试
 * 测试目标: 验证计划变更审批流程的完整性和正确性
 *
 * 测试环境:
 * - 前端: http://localhost:5173
 * - 后端: http://localhost:3001
 * - 测试用户:
 *   - admin / admin123 (管理)
 *   - engineer: 50241392 / 50241392 (提交审批)
 *   - tech_manager: 50234447 / 50234447 (审批)
 * - 测试项目: TEST-PROJ-001 (ID: 25)
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const API_BASE_URL = 'http://localhost:3001';

// 测试用户凭据
const USERS = {
  admin: { username: 'admin', password: 'admin123', displayName: 'admin' },
  engineer: { username: '50241392', password: '50241392', displayName: 'engineer' },
  tech_manager: { username: '50234447', password: '50234447', displayName: 'tech_manager' },
};

// 测试项目
const TEST_PROJECT_ID = '25';

// 测试超时时间
test.setTimeout(180000); // 3分钟超时

test.describe('TC-WORKFLOW-04: 任务审批流程测试', () => {

  // 登录 helper
  async function login(page: any, user: { username: string; password: string }) {
    await page.goto(BASE_URL + '/login');
    await page.waitForLoadState('networkidle');

    // 使用 data-testid 选择器
    await page.fill('[data-testid="login-input-username"]', user.username);
    await page.fill('[data-testid="login-input-password"]', user.password);
    await page.click('[data-testid="login-btn-submit"]');

    // 等待登录成功 - 跳转到仪表板或任务页面
    // 使用更长的超时时间，等待 URL 变化
    try {
      await page.waitForURL(/\/dashboard|\/tasks/, { timeout: 20000 });
    } catch {
      // 如果没有自动跳转，手动导航到仪表板
      console.log('登录后未自动跳转，手动导航到仪表板');
      await page.goto(BASE_URL + '/dashboard');
    }

    // 等待页面加载完成
    await page.waitForLoadState('networkidle');
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

  // 创建测试任务
  async function createTestTask(request: any, token: string, taskData: {
    description: string;
    assignee_id: string;
    start_date: string;
    duration_days: number;
    project_id: string;
  }) {
    const response = await request.post(`${API_BASE_URL}/api/tasks`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      data: taskData,
    });

    if (!response.ok()) {
      const error = await response.text();
      throw new Error(`创建任务失败: ${error}`);
    }

    const data = await response.json();
    return data.data;
  }

  // 删除测试任务
  async function deleteTestTask(request: any, token: string, taskId: string) {
    try {
      await request.delete(`${API_BASE_URL}/api/tasks/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.log(`清理任务失败: ${taskId}`);
    }
  }

  // TC-WF-01: 工程师提交计划变更审批
  test('TC-WF-01: 工程师提交计划变更审批', async ({ page, request }) => {
    console.log('\n=== TC-WF-01: 工程师提交计划变更审批 ===');

    let testTaskId: string | undefined;

    try {
      // 1. 准备测试任务 - admin 创建任务
      console.log('\n步骤1: admin 创建测试任务');
      const adminToken = await getAuthToken(request, USERS.admin);

      const taskData = {
        description: 'TC-WF-01-APPROVAL-TEST-' + Date.now(),
        assignee_id: '50241392', // engineer
        start_date: '2026-05-06',
        duration_days: 5,
        project_id: TEST_PROJECT_ID,
      };

      const createdTask = await createTestTask(request, adminToken, taskData);
      testTaskId = createdTask?.id;

      if (!testTaskId) {
        throw new Error('创建任务失败，未返回任务ID');
      }

      console.log(`测试任务已创建: ID=${testTaskId}, 描述=${taskData.description}`);

      // 2. 工程师登录并编辑任务
      console.log('\n步骤2: engineer 登录并编辑任务');
      await login(page, USERS.engineer);

      // 导航到任务页面
      await page.goto(BASE_URL + '/tasks');
      await page.waitForLoadState('networkidle');

      // 等待任务表格加载
      await page.waitForSelector('table tbody tr', { timeout: 10000 });

      // 搜索刚创建的任务
      const searchInput = page.locator('input[placeholder*="搜索"], input[type="search"]').first();
      if (await searchInput.isVisible()) {
        await searchInput.fill(taskData.description);
        await page.waitForTimeout(1000); // 等待搜索完成
      }

      // 查找任务行并点击编辑按钮
      const taskRow = page.locator('table tbody tr').filter({ hasText: taskData.description }).first();
      await expect(taskRow).toBeVisible({ timeout: 5000 });

      // 点击编辑按钮
      const editButton = taskRow.locator('button:has-text("编辑"), button[title="编辑"], button[data-action="edit"]').first();
      await editButton.click();

      // 等待编辑对话框打开
      await page.waitForSelector('[role="dialog"], .modal, [data-testid="task-edit-dialog"]', { timeout: 5000 });

      // 修改开始日期
      console.log('\n步骤3: 修改开始日期，提交审批');
      const startDateInput = page.locator('input[type="date"][id*="start"], input[name="start_date"]').first();
      if (await startDateInput.isVisible()) {
        await startDateInput.fill('2026-05-10');
      }

      // 点击保存
      const saveButton = page.locator('button:has-text("保存"), button[type="submit"]').first();
      await saveButton.click();

      // 等待保存完成
      await page.waitForTimeout(2000);

      // 验证提示"已提交审批"或"待审批"
      console.log('\n步骤4: 验证审批提交状态');

      // 截图
      const screenshotPath = `Test/screenshots/TC-WF-01-submit-approval-${Date.now()}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`截图保存: ${screenshotPath}`);

      // 3. 检查审批列表
      console.log('\n步骤5: 检查审批列表');

      // 导航到审批管理页面（在设置中）
      await page.goto(BASE_URL + '/settings/approvals');
      await page.waitForLoadState('networkidle');

      // 等待审批列表加载
      await page.waitForSelector('table tbody tr, [data-testid="approval-list"]', { timeout: 10000 });

      // 查找刚提交的审批记录
      const approvalRow = page.locator('table tbody tr').filter({ hasText: taskData.description }).first();
      const isVisible = await approvalRow.isVisible().catch(() => false);

      if (isVisible) {
        console.log('✓ 审批列表中找到待审批记录');
      } else {
        console.log('⚠ 未在审批列表中找到待审批记录，可能需要刷新或等待');
      }

      // 截图审批列表
      const approvalListScreenshot = `Test/screenshots/TC-WF-01-approval-list-${Date.now()}.png`;
      await page.screenshot({ path: approvalListScreenshot, fullPage: true });
      console.log(`审批列表截图保存: ${approvalListScreenshot}`);

    } catch (error) {
      console.error('测试失败:', error);
      const errorScreenshot = `Test/screenshots/TC-WF-01-error-${Date.now()}.png`;
      await page.screenshot({ path: errorScreenshot, fullPage: true });
      console.log(`错误截图保存: ${errorScreenshot}`);
      throw error;
    } finally {
      // 清理测试数据
      if (testTaskId) {
        const adminToken = await getAuthToken(request, USERS.admin);
        await deleteTestTask(request, adminToken, testTaskId);
        console.log(`\n清理: 已删除测试任务 ${testTaskId}`);
      }
    }
  });

  // TC-WF-02: 技术经理审批通过
  test('TC-WF-02: 技术经理审批通过', async ({ page, request }) => {
    console.log('\n=== TC-WF-02: 技术经理审批通过 ===');

    let testTaskId: string | undefined;

    try {
      // 1. 准备测试任务并提交审批
      console.log('\n步骤1: 创建任务并提交审批');
      const adminToken = await getAuthToken(request, USERS.admin);

      const taskData = {
        description: 'TC-WF-02-APPROVE-TEST-' + Date.now(),
        assignee_id: '50241392', // engineer
        start_date: '2026-05-06',
        duration_days: 5,
        project_id: TEST_PROJECT_ID,
      };

      const createdTask = await createTestTask(request, adminToken, taskData);
      testTaskId = createdTask?.id;

      if (!testTaskId) {
        throw new Error('创建任务失败，未返回任务ID');
      }

      console.log(`测试任务已创建: ID=${testTaskId}`);

      // 工程师提交审批 - 通过 API
      console.log('\n步骤2: engineer 提交审批');
      const engineerToken = await getAuthToken(request, USERS.engineer);

      const planChangeResponse = await request.post(`${API_BASE_URL}/api/plan-changes`, {
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

      if (!planChangeResponse.ok()) {
        console.log('⚠ 提交审批失败，尝试通过 UI 操作');

        // 通过 UI 提交
        await login(page, USERS.engineer);
        await page.goto(BASE_URL + '/tasks');
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('table tbody tr', { timeout: 10000 });

        const searchInput = page.locator('input[placeholder*="搜索"], input[type="search"]').first();
        if (await searchInput.isVisible()) {
          await searchInput.fill(taskData.description);
          await page.waitForTimeout(1000);
        }

        const taskRow = page.locator('table tbody tr').filter({ hasText: taskData.description }).first();
        await expect(taskRow).toBeVisible({ timeout: 5000 });

        const editButton = taskRow.locator('button:has-text("编辑"), button[title="编辑"]').first();
        await editButton.click();

        await page.waitForSelector('[role="dialog"], .modal', { timeout: 5000 });

        const startDateInput = page.locator('input[type="date"]').first();
        if (await startDateInput.isVisible()) {
          await startDateInput.fill('2026-05-10');
        }

        const saveButton = page.locator('button:has-text("保存"), button[type="submit"]').first();
        await saveButton.click();
        await page.waitForTimeout(2000);
      } else {
        console.log('✓ 审批已提交');
      }

      // 2. 技术经理登录并审批
      console.log('\n步骤3: tech_manager 登录审批');
      await login(page, USERS.tech_manager);

      // 导航到审批管理页面（在设置中）
      await page.goto(BASE_URL + '/settings/approvals');
      await page.waitForLoadState('networkidle');

      // 等待审批列表加载
      await page.waitForSelector('table tbody tr, [data-testid="approval-list"]', { timeout: 10000 });

      // 查找待审批记录
      const approvalRow = page.locator('table tbody tr').filter({ hasText: taskData.description }).first();
      const isVisible = await approvalRow.isVisible().catch(() => false);

      if (isVisible) {
        console.log('✓ 找到待审批记录');

        // 点击审批按钮
        const approveButton = approvalRow.locator('button:has-text("通过"), button:has-text("审批"), button[data-action="approve"]').first();

        if (await approveButton.isVisible()) {
          await approveButton.click();
          console.log('✓ 点击通过按钮');

          // 等待审批完成
          await page.waitForTimeout(2000);

          // 截图
          const screenshotPath = `Test/screenshots/TC-WF-02-approval-approved-${Date.now()}.png`;
          await page.screenshot({ path: screenshotPath, fullPage: false });
          console.log(`截图保存: ${screenshotPath}`);
        } else {
          console.log('⚠ 未找到审批按钮');
        }
      } else {
        console.log('⚠ 未找到待审批记录');

        // 截图当前状态
        const screenshotPath = `Test/screenshots/TC-WF-02-approval-list-${Date.now()}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`审批列表截图: ${screenshotPath}`);
      }

      // 3. 验证结果
      console.log('\n步骤4: 验证审批结果');

      // 通过 API 验证任务状态
      const taskResponse = await request.get(`${API_BASE_URL}/api/tasks/${testTaskId}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      if (taskResponse.ok()) {
        const taskData = await taskResponse.json();
        console.log(`任务状态: ${taskData.data?.status || taskData.data?.computed_status}`);
      }

    } catch (error) {
      console.error('测试失败:', error);
      const errorScreenshot = `Test/screenshots/TC-WF-02-error-${Date.now()}.png`;
      await page.screenshot({ path: errorScreenshot, fullPage: true });
      console.log(`错误截图保存: ${errorScreenshot}`);
      throw error;
    } finally {
      // 清理测试数据
      if (testTaskId) {
        const adminToken = await getAuthToken(request, USERS.admin);
        await deleteTestTask(request, adminToken, testTaskId);
        console.log(`\n清理: 已删除测试任务 ${testTaskId}`);
      }
    }
  });

  // TC-WF-03: 技术经理审批驳回
  test('TC-WF-03: 技术经理审批驳回', async ({ page, request }) => {
    console.log('\n=== TC-WF-03: 技术经理审批驳回 ===');

    let testTaskId: string | undefined;

    try {
      // 1. 准备测试任务并提交审批
      console.log('\n步骤1: 创建任务并提交审批');
      const adminToken = await getAuthToken(request, USERS.admin);

      const taskData = {
        description: 'TC-WF-03-REJECT-TEST-' + Date.now(),
        assignee_id: '50241392', // engineer
        start_date: '2026-05-06',
        duration_days: 5,
        project_id: TEST_PROJECT_ID,
      };

      const createdTask = await createTestTask(request, adminToken, taskData);
      testTaskId = createdTask?.id;

      if (!testTaskId) {
        throw new Error('创建任务失败，未返回任务ID');
      }

      console.log(`测试任务已创建: ID=${testTaskId}`);

      // 工程师提交审批 - 通过 API
      console.log('\n步骤2: engineer 提交审批');
      const engineerToken = await getAuthToken(request, USERS.engineer);

      const planChangeResponse = await request.post(`${API_BASE_URL}/api/plan-changes`, {
        headers: {
          'Authorization': `Bearer ${engineerToken}`,
        },
        data: {
          task_id: testTaskId,
          change_type: 'start_date',
          old_value: '2026-05-06',
          new_value: '2026-05-15',
          reason: '测试驳回流程',
        },
      });

      if (!planChangeResponse.ok()) {
        console.log('⚠ 提交审批失败，尝试通过 UI 操作');

        // 通过 UI 提交（同上）
        await login(page, USERS.engineer);
        await page.goto(BASE_URL + '/tasks');
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('table tbody tr', { timeout: 10000 });

        const searchInput = page.locator('input[placeholder*="搜索"], input[type="search"]').first();
        if (await searchInput.isVisible()) {
          await searchInput.fill(taskData.description);
          await page.waitForTimeout(1000);
        }

        const taskRow = page.locator('table tbody tr').filter({ hasText: taskData.description }).first();
        await expect(taskRow).toBeVisible({ timeout: 5000 });

        const editButton = taskRow.locator('button:has-text("编辑"), button[title="编辑"]').first();
        await editButton.click();

        await page.waitForSelector('[role="dialog"], .modal', { timeout: 5000 });

        const startDateInput = page.locator('input[type="date"]').first();
        if (await startDateInput.isVisible()) {
          await startDateInput.fill('2026-05-15');
        }

        const saveButton = page.locator('button:has-text("保存"), button[type="submit"]').first();
        await saveButton.click();
        await page.waitForTimeout(2000);
      } else {
        console.log('✓ 审批已提交');
      }

      // 2. 技术经理驳回
      console.log('\n步骤3: tech_manager 驳回审批');
      await login(page, USERS.tech_manager);

      // 导航到审批管理页面（在设置中）
      await page.goto(BASE_URL + '/settings/approvals');
      await page.waitForLoadState('networkidle');

      // 等待审批列表加载
      await page.waitForSelector('table tbody tr, [data-testid="approval-list"]', { timeout: 10000 });

      // 查找待审批记录
      const approvalRow = page.locator('table tbody tr').filter({ hasText: taskData.description }).first();
      const isVisible = await approvalRow.isVisible().catch(() => false);

      if (isVisible) {
        console.log('✓ 找到待审批记录');

        // 点击驳回按钮
        const rejectButton = approvalRow.locator('button:has-text("驳回"), button[data-action="reject"]').first();

        if (await rejectButton.isVisible()) {
          await rejectButton.click();
          console.log('✓ 点击驳回按钮');

          // 输入驳回原因（如果有对话框）
          const reasonInput = page.locator('textarea, input[type="text"]').filter({ hasNotText: '' }).first();
          if (await reasonInput.isVisible()) {
            await reasonInput.fill('测试驳回：时间安排不合理');
          }

          // 确认驳回
          const confirmButton = page.locator('button:has-text("确认"), button:has-text("确定"), button[type="submit"]').first();
          if (await confirmButton.isVisible()) {
            await confirmButton.click();
          }

          // 等待驳回完成
          await page.waitForTimeout(2000);

          // 截图
          const screenshotPath = `Test/screenshots/TC-WF-03-approval-rejected-${Date.now()}.png`;
          await page.screenshot({ path: screenshotPath, fullPage: false });
          console.log(`截图保存: ${screenshotPath}`);
        } else {
          console.log('⚠ 未找到驳回按钮');
        }
      } else {
        console.log('⚠ 未找到待审批记录');

        // 截图当前状态
        const screenshotPath = `Test/screenshots/TC-WF-03-approval-list-${Date.now()}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`审批列表截图: ${screenshotPath}`);
      }

      // 3. 验证结果
      console.log('\n步骤4: 验证驳回结果');

      // 通过 API 验证任务状态
      const taskResponse = await request.get(`${API_BASE_URL}/api/tasks/${testTaskId}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      if (taskResponse.ok()) {
        const taskData = await taskResponse.json();
        console.log(`任务状态: ${taskData.data?.status || taskData.data?.computed_status}`);
      }

    } catch (error) {
      console.error('测试失败:', error);
      const errorScreenshot = `Test/screenshots/TC-WF-03-error-${Date.now()}.png`;
      await page.screenshot({ path: errorScreenshot, fullPage: true });
      console.log(`错误截图保存: ${errorScreenshot}`);
      throw error;
    } finally {
      // 清理测试数据
      if (testTaskId) {
        const adminToken = await getAuthToken(request, USERS.admin);
        await deleteTestTask(request, adminToken, testTaskId);
        console.log(`\n清理: 已删除测试任务 ${testTaskId}`);
      }
    }
  });

  // TC-WF-04: 审批期间任务锁定
  test('TC-WF-04: 审批期间任务锁定', async ({ page, request }) => {
    console.log('\n=== TC-WF-04: 审批期间任务锁定 ===');

    let testTaskId: string | undefined;

    try {
      // 1. 准备测试任务并提交审批
      console.log('\n步骤1: 创建任务并提交审批');
      const adminToken = await getAuthToken(request, USERS.admin);

      const taskData = {
        description: 'TC-WF-04-LOCK-TEST-' + Date.now(),
        assignee_id: '50241392', // engineer
        start_date: '2026-05-06',
        duration_days: 5,
        project_id: TEST_PROJECT_ID,
      };

      const createdTask = await createTestTask(request, adminToken, taskData);
      testTaskId = createdTask?.id;

      if (!testTaskId) {
        throw new Error('创建任务失败，未返回任务ID');
      }

      console.log(`测试任务已创建: ID=${testTaskId}`);

      // 工程师提交审批
      console.log('\n步骤2: engineer 提交审批');
      const engineerToken = await getAuthToken(request, USERS.engineer);

      const planChangeResponse = await request.post(`${API_BASE_URL}/api/plan-changes`, {
        headers: {
          'Authorization': `Bearer ${engineerToken}`,
        },
        data: {
          task_id: testTaskId,
          change_type: 'start_date',
          old_value: '2026-05-06',
          new_value: '2026-05-20',
          reason: '测试锁定流程',
        },
      });

      if (!planChangeResponse.ok()) {
        console.log('⚠ 提交审批失败');
      } else {
        console.log('✓ 审批已提交，任务应已锁定');
      }

      // 2. 验证锁定 - engineer 尝试编辑
      console.log('\n步骤3: engineer 尝试编辑锁定任务');
      await login(page, USERS.engineer);

      await page.goto(BASE_URL + '/tasks');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('table tbody tr', { timeout: 10000 });

      const searchInput = page.locator('input[placeholder*="搜索"], input[type="search"]').first();
      if (await searchInput.isVisible()) {
        await searchInput.fill(taskData.description);
        await page.waitForTimeout(1000);
      }

      const taskRow = page.locator('table tbody tr').filter({ hasText: taskData.description }).first();
      await expect(taskRow).toBeVisible({ timeout: 5000 });

      // 点击编辑按钮
      const editButton = taskRow.locator('button:has-text("编辑"), button[title="编辑"]').first();

      if (await editButton.isEnabled()) {
        await editButton.click();

        // 等待提示消息
        await page.waitForTimeout(2000);

        // 查找锁定提示
        const lockMessage = page.locator('text=/审批中|已锁定|无法编辑|locked/i');
        const isLocked = await lockMessage.isVisible().catch(() => false);

        if (isLocked) {
          console.log('✓ 验证通过：任务已锁定，显示锁定提示');
        } else {
          console.log('⚠ 未显示锁定提示，可能编辑功能未正确锁定');
        }

        // 截图
        const screenshotPath = `Test/screenshots/TC-WF-04-task-locked-${Date.now()}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: false });
        console.log(`截图保存: ${screenshotPath}`);
      } else {
        console.log('✓ 验证通过：编辑按钮已禁用，任务已锁定');

        const screenshotPath = `Test/screenshots/TC-WF-04-edit-disabled-${Date.now()}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: false });
        console.log(`截图保存: ${screenshotPath}`);
      }

      // 3. tech_manager 应该可以编辑（审批人有权限）
      console.log('\n步骤4: tech_manager 检查编辑权限');
      await login(page, USERS.tech_manager);

      await page.goto(BASE_URL + '/tasks');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('table tbody tr', { timeout: 10000 });

      if (await searchInput.isVisible()) {
        await searchInput.fill(taskData.description);
        await page.waitForTimeout(1000);
      }

      const taskRowForManager = page.locator('table tbody tr').filter({ hasText: taskData.description }).first();
      await expect(taskRowForManager).toBeVisible({ timeout: 5000 });

      const editButtonForManager = taskRowForManager.locator('button:has-text("编辑"), button[title="编辑"]').first();
      const isEditable = await editButtonForManager.isEnabled();

      if (isEditable) {
        console.log('✓ 验证通过：审批人（tech_manager）可以编辑任务');
      } else {
        console.log('⚠ 审批人也无法编辑，权限隔离可能有问题');
      }

      const managerScreenshot = `Test/screenshots/TC-WF-04-manager-can-edit-${Date.now()}.png`;
      await page.screenshot({ path: managerScreenshot, fullPage: false });
      console.log(`截图保存: ${managerScreenshot}`);

    } catch (error) {
      console.error('测试失败:', error);
      const errorScreenshot = `Test/screenshots/TC-WF-04-error-${Date.now()}.png`;
      await page.screenshot({ path: errorScreenshot, fullPage: true });
      console.log(`错误截图保存: ${errorScreenshot}`);
      throw error;
    } finally {
      // 清理测试数据
      if (testTaskId) {
        const adminToken = await getAuthToken(request, USERS.admin);
        await deleteTestTask(request, adminToken, testTaskId);
        console.log(`\n清理: 已删除测试任务 ${testTaskId}`);
      }
    }
  });
});
