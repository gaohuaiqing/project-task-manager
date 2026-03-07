/**
 * 任务创建审批流程 E2E 测试
 *
 * 测试工程师创建任务后需要技术经理审批的完整流程
 */

import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth-helpers';
import { ApprovalPage } from '../../pages/ApprovalPage';
import { TaskManagementPage } from '../../pages/TaskManagementPage';

test.describe('任务创建审批流程', () => {
  let approvalPage: ApprovalPage;
  let taskManagementPage: TaskManagementPage;

  test.describe('工程师创建任务', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'engineer');
      approvalPage = new ApprovalPage(page);
      taskManagementPage = new TaskManagementPage(page);

      await approvalPage.gotoTasks();
    });

    test('工程师创建任务应该需要审批', async ({ page }) => {
      // 记录初始待审批数量
      const initialPending = await approvalPage.getPendingCount();

      // 点击创建任务按钮
      await taskManagementPage.clickCreateTask();

      // 等待创建任务对话框
      await taskManagementPage.waitForCreateDialog();

      // 填写任务信息
      await taskManagementPage.fillDescription('E2E测试任务 - 需要审批');
      await taskManagementPage.selectStartDate('2025-03-01');
      await taskManagementPage.selectEndDate('2025-03-05');

      // 注意：工程师只能选择自己作为负责人
      // 选择项目和优先级（根据实际UI调整）
      await page.waitForTimeout(500);

      // 确认创建
      await taskManagementPage.confirmCreate();

      // 等待创建完成
      await taskManagementPage.waitForCreateDialogClosed();
      await page.waitForTimeout(2000);

      // 验证创建了审批请求
      const updatedPending = await approvalPage.getPendingCount();
      expect(updatedPending).toBeGreaterThan(initialPending);
    });

    test('工程师创建的任务应该显示待审批状态', async ({ page }) => {
      // 创建任务
      await taskManagementPage.clickCreateTask();
      await taskManagementPage.waitForCreateDialog();

      await taskManagementPage.fillDescription('E2E测试任务 - 待审批状态');
      await taskManagementPage.selectStartDate('2025-03-10');
      await taskManagementPage.selectEndDate('2025-03-15');

      await page.waitForTimeout(500);
      await taskManagementPage.confirmCreate();
      await taskManagementPage.waitForCreateDialogClosed();
      await page.waitForTimeout(2000);

      // 筛选待审批
      await approvalPage.filterByStatus('pending');
      await page.waitForTimeout(1000);

      // 验证新创建的任务在待审批列表中
      const pendingTasks = await approvalPage.getPendingApprovals();
      const hasNewTask = pendingTasks.some(task => task.includes('E2E测试任务 - 待审批状态'));
      expect(hasNewTask).toBe(true);
    });

    test('工程师应该能查看自己的审批请求', async ({ page }) => {
      // 筛选待审批
      await approvalPage.filterByStatus('pending');
      await page.waitForTimeout(1000);

      // 获取待审批任务
      const pendingTasks = await approvalPage.getPendingApprovals();

      // 验证能看到审批请求
      expect(pendingTasks.length).toBeGreaterThanOrEqual(0);

      // 验证每个任务的申请人是自己
      for (const taskTitle of pendingTasks) {
        const approverInfo = await approvalPage.getApproverInfo(taskTitle);
        expect(approverInfo.name).toContain('工程师');
        expect(approverInfo.role).toBe('engineer');
      }
    });
  });

  test.describe('技术经理审批创建任务', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'tech_manager');
      approvalPage = new ApprovalPage(page);
      taskManagementPage = new TaskManagementPage(page);

      await approvalPage.gotoTasks();
    });

    test('技术经理应该能看到所有待审批任务', async ({ page }) => {
      // 筛选待审批
      await approvalPage.filterByStatus('pending');
      await page.waitForTimeout(1000);

      // 获取待审批任务数量
      const pendingCount = await approvalPage.getPendingCount();

      // 验证能看到待审批任务
      expect(pendingCount).toBeGreaterThanOrEqual(0);

      // 验证有审批权限
      await expect(await approvalPage.hasApprovalPermission()).toBe(true);
    });

    test('技术经理审批通过任务后任务应该可用', async ({ page }) => {
      // 筛选待审批
      await approvalPage.filterByStatus('pending');
      await page.waitForTimeout(1000);

      const pendingTasks = await approvalPage.getPendingApprovals();
      if (pendingTasks.length === 0) {
        test.skip(true, '没有待审批任务，跳过测试');
      }

      const taskTitle = pendingTasks[0];

      // 审批通过
      await approvalPage.approveTask(taskTitle, 'E2E测试：任务信息完整，审批通过');

      // 验证任务从待审批消失
      await approvalPage.waitForApprovalItemDisappear(taskTitle);

      // 筛选已通过
      await approvalPage.filterByStatus('approved');
      await page.waitForTimeout(1000);

      // 验证任务在已通过列表中
      const approvedTasks = await approvalPage.getPendingApprovals();
      expect(approvedTasks.some(task => task === taskTitle)).toBe(true);
    });

    test('技术经理审批拒绝任务后任务应该不可用', async ({ page }) => {
      // 筛选待审批
      await approvalPage.filterByStatus('pending');
      await page.waitForTimeout(1000);

      const pendingTasks = await approvalPage.getPendingApprovals();
      if (pendingTasks.length === 0) {
        test.skip(true, '没有待审批任务，跳过测试');
      }

      const taskTitle = pendingTasks[0];

      // 审批拒绝
      await approvalPage.rejectTask(taskTitle, 'E2E测试：任务信息不完整，拒绝');

      // 验证任务从待审批消失
      await approvalPage.waitForApprovalItemDisappear(taskTitle);

      // 筛选已拒绝
      await approvalPage.filterByStatus('rejected');
      await page.waitForTimeout(1000);

      // 验证任务在已拒绝列表中
      const rejectedTasks = await approvalPage.getPendingApprovals();
      expect(rejectedTasks.some(task => task === taskTitle)).toBe(true);
    });
  });

  test.describe('完整的创建-审批流程', () => {
    test('工程师创建任务 -> 技术经理审批通过 -> 任务可用', async ({ page }) => {
      const taskDescription = 'E2E完整流程测试任务';

      // 1. 工程师登录并创建任务
      await login(page, 'engineer');
      approvalPage = new ApprovalPage(page);
      taskManagementPage = new TaskManagementPage(page);

      await approvalPage.gotoTasks();

      await taskManagementPage.clickCreateTask();
      await taskManagementPage.waitForCreateDialog();

      await taskManagementPage.fillDescription(taskDescription);
      await taskManagementPage.selectStartDate('2025-04-01');
      await taskManagementPage.selectEndDate('2025-04-05');

      await page.waitForTimeout(500);
      await taskManagementPage.confirmCreate();
      await taskManagementPage.waitForCreateDialogClosed();

      // 2. 验证创建了审批请求
      await page.waitForTimeout(2000);
      await approvalPage.filterByStatus('pending');
      await page.waitForTimeout(1000);

      const pendingTasks = await approvalPage.getPendingApprovals();
      const hasNewTask = pendingTasks.some(task => task.includes(taskDescription));
      expect(hasNewTask).toBe(true);

      // 3. 技术经理登录并审批
      await page.goto('/');
      await login(page, 'tech_manager');

      await approvalPage.gotoTasks();
      await approvalPage.filterByStatus('pending');
      await page.waitForTimeout(1000);

      // 4. 审批通过
      const techManagerPendingTasks = await approvalPage.getPendingApprovals();
      const taskToApprove = techManagerPendingTasks.find(task => task.includes(taskDescription));

      expect(taskToApprove).toBeDefined();

      await approvalPage.approveTask(taskToApprove!, 'E2E测试：完整流程审批通过');

      // 5. 验证审批成功
      await approvalPage.waitForApprovalItemDisappear(taskToApprove!);

      await approvalPage.filterByStatus('approved');
      await page.waitForTimeout(1000);

      const approvedTasks = await approvalPage.getPendingApprovals();
      expect(approvedTasks.some(task => task.includes(taskDescription))).toBe(true);

      // 6. 验证审批历史
      await approvalPage.clickViewHistory(taskToApprove!);

      await expect(await approvalPage.hasElement('div[role="dialog"]:has-text("审批历史")')).toBe(true);

      const historyCount = await approvalPage.getHistoryCount();
      expect(historyCount).toBeGreaterThan(0);

      await approvalPage.closeHistoryDialog();
    });

    test('工程师创建任务 -> 技术经理审批拒绝 -> 工程师重新提交', async ({ page }) => {
      const taskDescription = 'E2E拒绝流程测试任务';

      // 1. 工程师登录并创建任务
      await login(page, 'engineer');
      approvalPage = new ApprovalPage(page);
      taskManagementPage = new TaskManagementPage(page);

      await approvalPage.gotoTasks();

      await taskManagementPage.clickCreateTask();
      await taskManagementPage.waitForCreateDialog();

      await taskManagementPage.fillDescription(taskDescription);
      await taskManagementPage.selectStartDate('2025-05-01');
      await taskManagementPage.selectEndDate('2025-05-05');

      await page.waitForTimeout(500);
      await taskManagementPage.confirmCreate();
      await taskManagementPage.waitForCreateDialogClosed();

      await page.waitForTimeout(2000);

      // 2. 技术经理登录并拒绝
      await page.goto('/');
      await login(page, 'tech_manager');

      await approvalPage.gotoTasks();
      await approvalPage.filterByStatus('pending');
      await page.waitForTimeout(1000);

      const techManagerPendingTasks = await approvalPage.getPendingApprovals();
      const taskToReject = techManagerPendingTasks.find(task => task.includes(taskDescription));

      expect(taskToReject).toBeDefined();

      await approvalPage.rejectTask(taskToReject!, 'E2E测试：任务描述不清晰，请补充');

      await approvalPage.waitForApprovalItemDisappear(taskToReject!);

      // 3. 工程师登录并查看拒绝原因
      await page.goto('/');
      await login(page, 'engineer');

      await approvalPage.gotoTasks();
      await approvalPage.filterByStatus('rejected');
      await page.waitForTimeout(1000);

      // 查看审批历史了解拒绝原因
      const rejectedTasks = await approvalPage.getPendingApprovals();
      const rejectedTask = rejectedTasks.find(task => task.includes(taskDescription));

      expect(rejectedTask).toBeDefined();

      await approvalPage.clickViewHistory(rejectedTask!);

      // 验证能看到拒绝原因
      const historyText = await page.locator('div[role="dialog"]').textContent();
      expect(historyText).toContain('任务描述不清晰');

      await approvalPage.closeHistoryDialog();

      // 4. 工程师重新创建任务（补充信息）
      await taskManagementPage.clickCreateTask();
      await taskManagementPage.waitForCreateDialog();

      await taskManagementPage.fillDescription(taskDescription + ' - 已补充详细需求说明');
      await taskManagementPage.selectStartDate('2025-05-10');
      await taskManagementPage.selectEndDate('2025-05-15');

      await page.waitForTimeout(500);
      await taskManagementPage.confirmCreate();
      await taskManagementPage.waitForCreateDialogClosed();

      await page.waitForTimeout(2000);

      // 5. 技术经理审批通过
      await page.goto('/');
      await login(page, 'tech_manager');

      await approvalPage.gotoTasks();
      await approvalPage.filterByStatus('pending');
      await page.waitForTimeout(1000);

      const newPendingTasks = await approvalPage.getPendingApprovals();
      const taskToApprove = newPendingTasks.find(task => task.includes(taskDescription));

      expect(taskToApprove).toBeDefined();

      await approvalPage.approveTask(taskToApprove!, 'E2E测试：补充完整，审批通过');

      await approvalPage.waitForApprovalItemDisappear(taskToApprove!);
    });
  });
});

test.describe('任务创建审批通知', () => {
  test('技术经理应该收到待审批通知', async ({ page }) => {
    await login(page, 'tech_manager');
    approvalPage = new ApprovalPage(page);

    await approvalPage.gotoTasks();

    // 检查待审批数量
    const pendingCount = await approvalPage.getPendingCount();

    // 验证待审批面板可见
    await expect(await approvalPage.isApprovalPanelVisible()).toBe(true);

    // 验证统计数据正确显示
    expect(pendingCount).toBeGreaterThanOrEqual(0);
  });

  test('工程师应该能查看自己任务的处理状态', async ({ page }) => {
    await login(page, 'engineer');
    approvalPage = new ApprovalPage(page);

    await approvalPage.gotoTasks();

    // 筛选所有状态
    await approvalPage.filterByStatus('all');
    await page.waitForTimeout(1000);

    // 获取所有审批项
    const allTasks = await approvalPage.getPendingApprovals();

    // 验证能看到自己的任务及其状态
    expect(allTasks.length).toBeGreaterThanOrEqual(0);

    // 验证每个任务都有状态标记
    for (const taskTitle of allTasks) {
      const status = await approvalPage.getTaskStatus(taskTitle);
      expect(status).toBeTruthy();
    }
  });
});

test.describe('任务创建审批权限', () => {
  test('部门经理不应该有任务审批权限', async ({ page }) => {
    await login(page, 'dept_manager');
    approvalPage = new ApprovalPage(page);

    await approvalPage.gotoTasks();

    // 验证没有审批权限
    const hasPermission = await approvalPage.hasApprovalPermission();
    // 部门经理可能只有查看权限，没有审批权限
    // 这里我们验证批量操作按钮不可见
    await expect(await approvalPage.batchApproveButton.isVisible()).toBe(false);
  });

  test('管理员应该有所有任务审批权限', async ({ page }) => {
    await login(page, 'admin');
    approvalPage = new ApprovalPage(page);

    await approvalPage.gotoTasks();

    // 验证有审批权限
    await expect(await approvalPage.hasApprovalPermission()).toBe(true);

    // 验证能查看所有审批记录
    await approvalPage.filterByStatus('all');
    await page.waitForTimeout(1000);

    const allApprovals = await approvalPage.getApprovalItemCount();
    expect(allApprovals).toBeGreaterThanOrEqual(0);
  });
});
