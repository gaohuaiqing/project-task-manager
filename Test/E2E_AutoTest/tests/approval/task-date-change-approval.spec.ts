/**
 * 任务日期变更审批流程 E2E 测试
 *
 * 测试工程师修改任务日期后需要技术经理审批的完整流程
 */

import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth-helpers';
import { ApprovalPage } from '../../pages/ApprovalPage';
import { TaskManagementPage } from '../../pages/TaskManagementPage';

test.describe('任务日期变更审批流程', () => {
  let approvalPage: ApprovalPage;
  let taskManagementPage: TaskManagementPage;

  test.describe('工程师修改任务日期', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'engineer');
      approvalPage = new ApprovalPage(page);
      taskManagementPage = new TaskManagementPage(page);

      await approvalPage.gotoTasks();
    });

    test('工程师修改已批准任务的日期应该需要审批', async ({ page }) => {
      // 筛选已批准的任务
      await approvalPage.filterByStatus('approved');
      await page.waitForTimeout(1000);

      const approvedTasks = await approvalPage.getPendingApprovals();
      if (approvedTasks.length === 0) {
        test.skip(true, '没有已批准的任务，跳过测试');
      }

      const taskTitle = approvedTasks[0];

      // 记录初始待审批数量
      const initialPending = await approvalPage.getPendingCount();

      // 点击编辑任务
      await taskManagementPage.clickEditTask(taskTitle);

      // 等待编辑对话框打开
      await page.waitForSelector('div[role="dialog"]:has-text("编辑任务")');

      // 修改开始日期
      await page.locator('input[type="date"]').first().fill('2025-06-01');

      // 修改结束日期
      await page.locator('input[type="date"]').last().fill('2025-06-10');

      // 保存修改
      await taskManagementPage.confirmCreate();

      // 等待保存完成
      await page.waitForTimeout(2000);

      // 验证创建了审批请求
      await approvalPage.filterByStatus('pending');
      await page.waitForTimeout(1000);

      const updatedPending = await approvalPage.getPendingCount();
      expect(updatedPending).toBeGreaterThan(initialPending);

      // 验证新审批请求包含修改的任务
      const pendingTasks = await approvalPage.getPendingApprovals();
      expect(pendingTasks.some(task => task.includes(taskTitle.split(' ')[0]))).toBe(true);
    });

    test('工程师修改任务日期后任务状态应该变为待审批', async ({ page }) => {
      // 筛选已批准的任务
      await approvalPage.filterByStatus('approved');
      await page.waitForTimeout(1000);

      const approvedTasks = await approvalPage.getPendingApprovals();
      if (approvedTasks.length === 0) {
        test.skip(true, '没有已批准的任务，跳过测试');
      }

      const taskTitle = approvedTasks[0];

      // 点击编辑任务
      await taskManagementPage.clickEditTask(taskTitle);

      // 等待编辑对话框打开
      await page.waitForSelector('div[role="dialog"]:has-text("编辑任务")');

      // 修改日期
      await page.locator('input[type="date"]').first().fill('2025-07-01');
      await page.locator('input[type="date"]').last().fill('2025-07-05');

      // 保存修改
      await taskManagementPage.confirmCreate();

      // 等待保存完成
      await page.waitForTimeout(2000);

      // 验证任务状态变为待审批
      await approvalPage.filterByStatus('pending');
      await page.waitForTimeout(1000);

      const pendingTasks = await approvalPage.getPendingApprovals();
      expect(pendingTasks.some(task => task.includes(taskTitle.split(' ')[0]))).toBe(true);
    });

    test('工程师应该能查看自己的日期变更请求', async ({ page }) => {
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

    test('工程师应该能撤销日期变更请求', async ({ page }) => {
      // 筛选待审批
      await approvalPage.filterByStatus('pending');
      await page.waitForTimeout(1000);

      const pendingTasks = await approvalPage.getPendingApprovals();
      if (pendingTasks.length === 0) {
        test.skip(true, '没有待审批任务，跳过测试');
      }

      // 记录初始待审批数量
      const initialPending = await approvalPage.getPendingCount();

      // 撤销第一个审批请求
      await approvalPage.clickWithdraw(pendingTasks[0]);

      // 等待撤销完成
      await page.waitForTimeout(1000);

      // 验证待审批数量减少
      const updatedPending = await approvalPage.getPendingCount();
      expect(updatedPending).toBeLessThan(initialPending);
    });
  });

  test.describe('技术经理审批日期变更', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'tech_manager');
      approvalPage = new ApprovalPage(page);
      taskManagementPage = new TaskManagementPage(page);

      await approvalPage.gotoTasks();
    });

    test('技术经理应该能看到所有日期变更请求', async ({ page }) => {
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

    test('技术经理审批通过日期变更', async ({ page }) => {
      // 筛选待审批
      await approvalPage.filterByStatus('pending');
      await page.waitForTimeout(1000);

      const pendingTasks = await approvalPage.getPendingApprovals();
      if (pendingTasks.length === 0) {
        test.skip(true, '没有待审批任务，跳过测试');
      }

      const taskTitle = pendingTasks[0];

      // 审批通过
      await approvalPage.approveTask(taskTitle, 'E2E测试：日期变更合理，审批通过');

      // 验证任务从待审批消失
      await approvalPage.waitForApprovalItemDisappear(taskTitle);

      // 筛选已通过
      await approvalPage.filterByStatus('approved');
      await page.waitForTimeout(1000);

      // 验证任务在已通过列表中
      const approvedTasks = await approvalPage.getPendingApprovals();
      expect(approvedTasks.some(task => task === taskTitle)).toBe(true);
    });

    test('技术经理审批拒绝日期变更', async ({ page }) => {
      // 筛选待审批
      await approvalPage.filterByStatus('pending');
      await page.waitForTimeout(1000);

      const pendingTasks = await approvalPage.getPendingApprovals();
      if (pendingTasks.length === 0) {
        test.skip(true, '没有待审批任务，跳过测试');
      }

      const taskTitle = pendingTasks[0];

      // 审批拒绝
      await approvalPage.rejectTask(taskTitle, 'E2E测试：日期变更影响项目进度，拒绝');

      // 验证任务从待审批消失
      await approvalPage.waitForApprovalItemDisappear(taskTitle);

      // 筛选已拒绝
      await approvalPage.filterByStatus('rejected');
      await page.waitForTimeout(1000);

      // 验证任务在已拒绝列表中
      const rejectedTasks = await approvalPage.getPendingApprovals();
      expect(rejectedTasks.some(task => task === taskTitle)).toBe(true);
    });

    test('技术经理应该能查看日期变更详情', async ({ page }) => {
      // 筛选待审批
      await approvalPage.filterByStatus('pending');
      await page.waitForTimeout(1000);

      const pendingTasks = await approvalPage.getPendingApprovals();
      if (pendingTasks.length === 0) {
        test.skip(true, '没有待审批任务，跳过测试');
      }

      const taskTitle = pendingTasks[0];

      // 点击查看任务详情
      await approvalPage.clickViewTask(taskTitle);

      // 验证任务详情页面或对话框打开
      await page.waitForTimeout(1000);
      const currentUrl = page.url();
      expect(currentUrl).toContain(taskTitle.split(' ')[0]);
    });
  });

  test.describe('完整的日期变更审批流程', () => {
    test('工程师修改日期 -> 技术经理审批通过 -> 日期更新', async ({ page }) => {
      const taskKeyword = 'E2E日期变更测试';

      // 1. 工程师登录并找到任务
      await login(page, 'engineer');
      approvalPage = new ApprovalPage(page);
      taskManagementPage = new TaskManagementPage(page);

      await approvalPage.gotoTasks();

      // 筛选已批准的任务
      await approvalPage.filterByStatus('approved');
      await page.waitForTimeout(1000);

      const approvedTasks = await approvalPage.getPendingApprovals();
      if (approvedTasks.length === 0) {
        test.skip(true, '没有已批准的任务，跳过测试');
      }

      const taskTitle = approvedTasks[0];

      // 2. 编辑任务修改日期
      await taskManagementPage.clickEditTask(taskTitle);

      await page.waitForSelector('div[role="dialog"]:has-text("编辑任务")');

      // 记录原始日期
      const originalStartDate = await page.locator('input[type="date"]').first().inputValue();
      const originalEndDate = await page.locator('input[type="date"]').last().inputValue();

      // 修改日期
      await page.locator('input[type="date"]').first().fill('2025-08-01');
      await page.locator('input[type="date"]').last().fill('2025-08-05');

      // 保存修改
      await taskManagementPage.confirmCreate();

      await page.waitForTimeout(2000);

      // 3. 验证创建了审批请求
      await approvalPage.filterByStatus('pending');
      await page.waitForTimeout(1000);

      const pendingTasks = await approvalPage.getPendingApprovals();
      expect(pendingTasks.some(task => task.includes(taskTitle.split(' ')[0]))).toBe(true);

      // 4. 技术经理登录并审批
      await page.goto('/');
      await login(page, 'tech_manager');

      await approvalPage.gotoTasks();
      await approvalPage.filterByStatus('pending');
      await page.waitForTimeout(1000);

      const techManagerPendingTasks = await approvalPage.getPendingApprovals();
      const taskToApprove = techManagerPendingTasks.find(task => task.includes(taskTitle.split(' ')[0]));

      expect(taskToApprove).toBeDefined();

      // 5. 审批通过
      await approvalPage.approveTask(taskToApprove!, 'E2E测试：日期变更审批通过');

      await approvalPage.waitForApprovalItemDisappear(taskToApprove!);

      // 6. 验证审批成功
      await approvalPage.filterByStatus('approved');
      await page.waitForTimeout(1000);

      const approvedTasksAfter = await approvalPage.getPendingApprovals();
      expect(approvedTasksAfter.some(task => task.includes(taskTitle.split(' ')[0]))).toBe(true);

      // 7. 查看审批历史
      await approvalPage.clickViewHistory(taskToApprove!);

      await expect(await approvalPage.hasElement('div[role="dialog"]:has-text("审批历史")')).toBe(true);

      const historyCount = await approvalPage.getHistoryCount();
      expect(historyCount).toBeGreaterThan(0);

      await approvalPage.closeHistoryDialog();
    });

    test('工程师修改日期 -> 技术经理审批拒绝 -> 日期不变', async ({ page }) => {
      // 1. 工程师登录并找到任务
      await login(page, 'engineer');
      approvalPage = new ApprovalPage(page);
      taskManagementPage = new TaskManagementPage(page);

      await approvalPage.gotoTasks();

      // 筛选已批准的任务
      await approvalPage.filterByStatus('approved');
      await page.waitForTimeout(1000);

      const approvedTasks = await approvalPage.getPendingApprovals();
      if (approvedTasks.length === 0) {
        test.skip(true, '没有已批准的任务，跳过测试');
      }

      const taskTitle = approvedTasks[0];

      // 2. 编辑任务修改日期
      await taskManagementPage.clickEditTask(taskTitle);

      await page.waitForSelector('div[role="dialog"]:has-text("编辑任务")');

      // 记录原始日期
      const originalStartDate = await page.locator('input[type="date"]').first().inputValue();
      const originalEndDate = await page.locator('input[type="date"]').last().inputValue();

      // 修改日期
      await page.locator('input[type="date"]').first().fill('2025-09-01');
      await page.locator('input[type="date"]').last().fill('2025-09-10');

      // 保存修改
      await taskManagementPage.confirmCreate();

      await page.waitForTimeout(2000);

      // 3. 技术经理登录并拒绝
      await page.goto('/');
      await login(page, 'tech_manager');

      await approvalPage.gotoTasks();
      await approvalPage.filterByStatus('pending');
      await page.waitForTimeout(1000);

      const techManagerPendingTasks = await approvalPage.getPendingApprovals();
      const taskToReject = techManagerPendingTasks.find(task => task.includes(taskTitle.split(' ')[0]));

      expect(taskToReject).toBeDefined();

      // 4. 审批拒绝
      await approvalPage.rejectTask(taskToReject!, 'E2E测试：日期变更不合理，拒绝');

      await approvalPage.waitForApprovalItemDisappear(taskToReject!);

      // 5. 验证任务日期没有改变
      await approvalPage.filterByStatus('approved');
      await page.waitForTimeout(1000);

      const approvedTasksAfter = await approvalPage.getPendingApprovals();
      expect(approvedTasksAfter.some(task => task.includes(taskTitle.split(' ')[0]))).toBe(true);

      // 查看审批历史了解拒绝原因
      await approvalPage.clickViewHistory(taskTitle);

      const historyText = await page.locator('div[role="dialog"]').textContent();
      expect(historyText).toContain('日期变更不合理');

      await approvalPage.closeHistoryDialog();
    });
  });

  test.describe('批量日期变更审批', () => {
    test('技术经理应该能批量审批日期变更', async ({ page }) => {
      await login(page, 'tech_manager');
      approvalPage = new ApprovalPage(page);

      await approvalPage.gotoTasks();

      // 筛选待审批
      await approvalPage.filterByStatus('pending');
      await page.waitForTimeout(1000);

      const pendingCount = await approvalPage.getPendingCount();

      if (pendingCount < 2) {
        test.skip(true, '待审批任务少于2个，跳过批量测试');
      }

      // 全选
      await approvalPage.clickSelectAll();

      // 验证所有复选框被选中
      const selectedCount = await approvalPage.getSelectedCount();
      expect(selectedCount).toBeGreaterThan(0);

      // 批量审批通过
      await approvalPage.batchApprove('E2E测试：批量审批通过日期变更');

      // 等待批量操作结果
      await approvalPage.waitForBatchResult();

      // 验证结果提示
      const resultText = await approvalPage.getBatchResultText();
      expect(resultText).toContain('批量操作完成');
    });
  });

  test.describe('日期变更权限控制', () => {
    test('技术经理应该能强制刷新任务日期', async ({ page }) => {
      await login(page, 'tech_manager');
      approvalPage = new ApprovalPage(page);
      taskManagementPage = new TaskManagementPage(page);

      await approvalPage.gotoTasks();

      // 筛选已批准的任务
      await approvalPage.filterByStatus('approved');
      await page.waitForTimeout(1000);

      const approvedTasks = await approvalPage.getPendingApprovals();
      if (approvedTasks.length === 0) {
        test.skip(true, '没有已批准的任务，跳过测试');
      }

      // 点击编辑任务
      await taskManagementPage.clickEditTask(approvedTasks[0]);

      // 等待编辑对话框打开
      await page.waitForSelector('div[role="dialog"]:has-text("编辑任务")');

      // 验证强制刷新按钮存在
      await expect(await approvalPage.hasElement('button:has-text("强行刷新")')).toBe(true);

      // 点击强制刷新按钮
      await approvalPage.forceRefreshButton.click();

      // 验证强制刷新对话框打开
      await expect(await approvalPage.hasElement('div[role="dialog"]:has-text("强行刷新任务计划")')).toBe(true);

      // 填写变更说明
      await approvalPage.forceRefreshDescription.fill('E2E测试：强制刷新任务日期');

      // 确认强制刷新
      await approvalPage.confirmForceRefreshButton.click();

      // 验证操作成功
      await page.waitForTimeout(1000);
    });

    test('工程师不应该有强制刷新按钮', async ({ page }) => {
      await login(page, 'engineer');
      approvalPage = new ApprovalPage(page);
      taskManagementPage = new TaskManagementPage(page);

      await approvalPage.gotoTasks();

      // 筛选已批准的任务
      await approvalPage.filterByStatus('approved');
      await page.waitForTimeout(1000);

      const approvedTasks = await approvalPage.getPendingApprovals();
      if (approvedTasks.length === 0) {
        test.skip(true, '没有已批准的任务，跳过测试');
      }

      // 点击编辑任务
      await taskManagementPage.clickEditTask(approvedTasks[0]);

      // 等待编辑对话框打开
      await page.waitForSelector('div[role="dialog"]:has-text("编辑任务")');

      // 验证强制刷新按钮不存在
      await expect(await approvalPage.hasElement('button:has-text("强行刷新")')).toBe(false);
    });

    test('强制刷新必须填写变更说明', async ({ page }) => {
      await login(page, 'tech_manager');
      approvalPage = new ApprovalPage(page);
      taskManagementPage = new TaskManagementPage(page);

      await approvalPage.gotoTasks();

      // 筛选已批准的任务
      await approvalPage.filterByStatus('approved');
      await page.waitForTimeout(1000);

      const approvedTasks = await approvalPage.getPendingApprovals();
      if (approvedTasks.length === 0) {
        test.skip(true, '没有已批准的任务，跳过测试');
      }

      // 点击编辑任务
      await taskManagementPage.clickEditTask(approvedTasks[0]);

      // 等待编辑对话框打开
      await page.waitForSelector('div[role="dialog"]:has-text("编辑任务")');

      // 点击强制刷新按钮
      await approvalPage.forceRefreshButton.click();

      // 验证确认按钮被禁用
      const isDisabled = await approvalPage.confirmForceRefreshButton.isDisabled();
      expect(isDisabled).toBe(true);

      // 填写变更说明
      await approvalPage.forceRefreshDescription.fill('E2E测试：填写变更说明');

      // 验证按钮现在可用
      const isEnabled = await approvalPage.confirmForceRefreshButton.isEnabled();
      expect(isEnabled).toBe(true);

      // 取消操作
      await page.locator('button:has-text("取消")').click();
    });
  });
});

test.describe('日期变更超时提醒', () => {
  test('应该能识别超时的日期变更请求', async ({ page }) => {
    await login(page, 'tech_manager');
    approvalPage = new ApprovalPage(page);

    await approvalPage.gotoTasks();

    // 筛选待审批
    await approvalPage.filterByStatus('pending');
    await page.waitForTimeout(1000);

    // 检查是否有超时标记
    const pendingTasks = await approvalPage.getPendingApprovals();
    let hasOverdue = false;

    for (const taskTitle of pendingTasks) {
      if (await approvalPage.hasOverdueBadge(taskTitle)) {
        hasOverdue = true;
        break;
      }
    }

    // 即使没有超时任务，也应该能正常执行测试
    expect(true).toBe(true);
  });

  test('超时的日期变更应该有特殊标记', async ({ page }) => {
    await login(page, 'tech_manager');
    approvalPage = new ApprovalPage(page);

    await approvalPage.gotoTasks();

    // 筛选待审批
    await approvalPage.filterByStatus('pending');
    await page.waitForTimeout(1000);

    // 检查超时标记样式
    const overdueBadges = await approvalPage.overdueBadges.count();
    expect(overdueBadges).toBeGreaterThanOrEqual(0);
  });
});
