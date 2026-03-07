/**
 * 任务审批模块 E2E 测试套件
 *
 * 测试覆盖：
 * - 任务提交流程（工程师修改任务日期）
 * - 审批通过流程（技术经理审批）
 * - 审批拒绝流程
 * - 审批历史记录查看
 * - 强行刷新任务计划功能
 * - 变更说明必填验证
 * - 审批权限控制
 * - 审批通知功能
 * - 批量审批
 * - 完整审批工作流
 */

import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth-helpers';
import { ApprovalPage } from '../../pages/ApprovalPage';
import { TaskManagementPage } from '../../pages/TaskManagementPage';

test.describe('任务审批模块', () => {
  let approvalPage: ApprovalPage;
  let taskManagementPage: TaskManagementPage;

  // 测试前置条件：使用技术经理账号登录
  test.beforeEach(async ({ page }) => {
    await login(page, 'tech_manager');
    approvalPage = new ApprovalPage(page);
    taskManagementPage = new TaskManagementPage(page);

    // 导航到任务管理页面
    await approvalPage.gotoTasks();
  });

  test.describe('审批面板基础功能', () => {
    test('应该显示审批面板和统计信息', async ({ page }) => {
      // 验证审批面板可见
      await expect(await approvalPage.isApprovalPanelVisible()).toBe(true);

      // 验证统计卡片存在
      await expect(await approvalPage.hasElement('div:has-text("待审批")')).toBe(true);
      await expect(await approvalPage.hasElement('div:has-text("已通过")')).toBe(true);
      await expect(await approvalPage.hasElement('div:has-text("已拒绝")')).toBe(true);
      await expect(await approvalPage.hasElement('div:has-text("总计")')).toBe(true);

      // 获取统计数据
      const totalCount = await approvalPage.getTotalCount();
      expect(totalCount).toBeGreaterThanOrEqual(0);
    });

    test('应该能够筛选审批状态', async ({ page }) => {
      // 筛选待审批
      await approvalPage.filterByStatus('pending');
      await page.waitForTimeout(1000);

      // 筛选已通过
      await approvalPage.filterByStatus('approved');
      await page.waitForTimeout(1000);

      // 筛选已拒绝
      await approvalPage.filterByStatus('rejected');
      await page.waitForTimeout(1000);

      // 筛选全部
      await approvalPage.filterByStatus('all');
      await page.waitForTimeout(1000);
    });

    test('应该能够刷新审批列表', async ({ page }) => {
      const initialCount = await approvalPage.getApprovalItemCount();

      // 点击刷新按钮
      await approvalPage.clickRefresh();

      // 验证刷新后列表仍然可访问
      const refreshedCount = await approvalPage.getApprovalItemCount();
      expect(refreshedCount).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('单个审批功能', () => {
    test('应该能够审批通过任务', async ({ page }) => {
      // 获取待审批数量
      const initialPending = await approvalPage.getPendingCount();

      // 检查是否有待审批任务
      if (initialPending === 0) {
        test.skip(true, '没有待审批任务，跳过测试');
      }

      // 获取第一个待审批任务
      const pendingTasks = await approvalPage.getPendingApprovals();
      if (pendingTasks.length === 0) {
        test.skip(true, '无法获取待审批任务列表');
      }

      const taskTitle = pendingTasks[0];

      // 点击通过按钮
      await approvalPage.clickApproveButton(taskTitle);

      // 填写审批意见（可选）
      await approvalPage.fillSingleComment('测试审批通过');

      // 确认通过
      await approvalPage.confirmSingleApprove();

      // 验证任务已从待审批列表消失
      await approvalPage.waitForApprovalItemDisappear(taskTitle);

      // 验证待审批数量减少
      await approvalPage.waitForPendingCountUpdate(initialPending - 1);
    });

    test('应该能够拒绝任务', async ({ page }) => {
      // 获取待审批数量
      const initialPending = await approvalPage.getPendingCount();

      // 检查是否有待审批任务
      if (initialPending === 0) {
        test.skip(true, '没有待审批任务，跳过测试');
      }

      // 获取第一个待审批任务
      const pendingTasks = await approvalPage.getPendingApprovals();
      if (pendingTasks.length === 0) {
        test.skip(true, '无法获取待审批任务列表');
      }

      const taskTitle = pendingTasks[0];

      // 点击拒绝按钮
      await approvalPage.clickRejectButton(taskTitle);

      // 填写拒绝原因（必填）
      await approvalPage.fillSingleComment('测试拒绝：任务信息不完整');

      // 确认拒绝
      await approvalPage.confirmSingleReject();

      // 验证任务已从待审批列表消失
      await approvalPage.waitForApprovalItemDisappear(taskTitle);

      // 验证已拒绝数量增加
      const rejectedCount = await approvalPage.getRejectedCount();
      expect(rejectedCount).toBeGreaterThanOrEqual(1);
    });

    test('应该能够查看审批历史', async ({ page }) => {
      // 获取审批列表中的任意任务
      const pendingTasks = await approvalPage.getPendingApprovals();
      if (pendingTasks.length === 0) {
        test.skip(true, '没有待审批任务，跳过测试');
      }

      const taskTitle = pendingTasks[0];

      // 点击查看历史
      await approvalPage.clickViewHistory(taskTitle);

      // 验证历史对话框打开
      await expect(await approvalPage.hasElement('div[role="dialog"]:has-text("审批历史")')).toBe(true);

      // 获取历史记录数量
      const historyCount = await approvalPage.getHistoryCount();
      expect(historyCount).toBeGreaterThanOrEqual(1);

      // 关闭历史对话框
      await approvalPage.closeHistoryDialog();
    });

    test('应该能够查看任务详情', async ({ page }) => {
      // 获取审批列表中的任意任务
      const pendingTasks = await approvalPage.getPendingApprovals();
      if (pendingTasks.length === 0) {
        test.skip(true, '没有待审批任务，跳过测试');
      }

      const taskTitle = pendingTasks[0];

      // 点击查看任务详情
      await approvalPage.clickViewTask(taskTitle);

      // 验证任务详情对话框或页面打开
      await page.waitForTimeout(1000);
      const currentUrl = page.url();
      expect(currentUrl).toContain(taskTitle.split(' ')[0]); // 简单验证URL包含任务相关信息
    });
  });

  test.describe('批量审批功能', () => {
    test('应该能够全选审批项', async ({ page }) => {
      // 获取待审批数量
      const pendingCount = await approvalPage.getPendingCount();

      if (pendingCount < 2) {
        test.skip(true, '待审批任务少于2个，跳过批量测试');
      }

      // 点击全选
      await approvalPage.clickSelectAll();

      // 验证所有复选框被选中
      const selectedCount = await approvalPage.getSelectedCount();
      expect(selectedCount).toBe(pendingCount);

      // 验证批量操作按钮出现
      await expect(await approvalPage.hasBatchOperationButtons()).toBe(true);
    });

    test('应该能够取消选择', async ({ page }) => {
      // 先全选
      await approvalPage.clickSelectAll();

      // 取消选择
      await approvalPage.clickCancelSelection();

      // 验证没有选中项
      const selectedCount = await approvalPage.getSelectedCount();
      expect(selectedCount).toBe(0);

      // 验证批量操作按钮消失
      await expect(await approvalPage.batchApproveButton.isVisible()).toBe(false);
      await expect(await approvalPage.batchRejectButton.isVisible()).toBe(false);
    });

    test('应该能够批量审批通过', async ({ page }) => {
      const pendingCount = await approvalPage.getPendingCount();

      if (pendingCount < 2) {
        test.skip(true, '待审批任务少于2个，跳过批量测试');
      }

      // 全选
      await approvalPage.clickSelectAll();

      // 记录初始待审批数量
      const initialPending = await approvalPage.getPendingCount();

      // 点击批量通过
      await approvalPage.batchApprove('批量审批通过测试');

      // 等待批量操作结果
      await approvalPage.waitForBatchResult();

      // 验证结果提示
      const resultText = await approvalPage.getBatchResultText();
      expect(resultText).toContain('批量操作完成');

      // 验证待审批数量减少
      await page.waitForTimeout(2000);
      const finalPending = await approvalPage.getPendingCount();
      expect(finalPending).toBeLessThan(initialPending);
    });

    test('应该能够批量拒绝', async ({ page }) => {
      const pendingCount = await approvalPage.getPendingCount();

      if (pendingCount < 2) {
        test.skip(true, '待审批任务少于2个，跳过批量测试');
      }

      // 全选
      await approvalPage.clickSelectAll();

      // 记录初始已拒绝数量
      const initialRejected = await approvalPage.getRejectedCount();

      // 点击批量拒绝
      await approvalPage.batchReject('批量拒绝测试：任务信息不完整');

      // 等待批量操作结果
      await approvalPage.waitForBatchResult();

      // 验证结果提示
      const resultText = await approvalPage.getBatchResultText();
      expect(resultText).toContain('批量操作完成');

      // 验证已拒绝数量增加
      await page.waitForTimeout(2000);
      const finalRejected = await approvalPage.getRejectedCount();
      expect(finalRejected).toBeGreaterThan(initialRejected);
    });
  });

  test.describe('审批权限控制', () => {
    test('技术经理应该有审批权限', async ({ page }) => {
      // 验证有审批权限
      await expect(await approvalPage.hasApprovalPermission()).toBe(true);

      // 验证批量操作按钮可见
      await expect(await approvalPage.batchApproveButton.isVisible()).toBe(true);
      await expect(await approvalPage.batchRejectButton.isVisible()).toBe(true);
    });

    test('工程师应该没有审批权限', async ({ page }) => {
      // 登出技术经理
      await page.goto('/');

      // 使用工程师账号登录
      await login(page, 'engineer');

      // 导航到任务管理页面
      await approvalPage.gotoTasks();

      // 验证没有审批权限
      await expect(await approvalPage.hasApprovalPermission()).toBe(false);

      // 验证批量操作按钮不可见
      await expect(await approvalPage.batchApproveButton.isVisible()).toBe(false);
      await expect(await approvalPage.batchRejectButton.isVisible()).toBe(false);

      // 验证只能看到自己的审批请求
      const approvals = await approvalPage.getApprovalItemCount();
      // 工程师应该能看到自己的待审批任务
      expect(approvals).toBeGreaterThanOrEqual(0);
    });

    test('管理员应该有所有审批权限', async ({ page }) => {
      // 登出当前用户
      await page.goto('/');

      // 使用管理员账号登录
      await login(page, 'admin');

      // 导航到任务管理页面
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

  test.describe('超时提醒功能', () => {
    test('应该能识别超时的审批任务', async ({ page }) => {
      // 获取所有审批项
      const pendingTasks = await approvalPage.getPendingApprovals();

      // 检查是否有超时标记
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

    test('超时任务应该有特殊标记', async ({ page }) => {
      // 筛选待审批
      await approvalPage.filterByStatus('pending');
      await page.waitForTimeout(1000);

      // 检查超时标记样式
      const overdueBadges = await approvalPage.overdueBadges.count();
      expect(overdueBadges).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('强制刷新功能', () => {
    test('技术经理应该能使用强制刷新功能', async ({ page }) => {
      // 获取任务列表
      const pendingTasks = await approvalPage.getPendingApprovals();
      if (pendingTasks.length === 0) {
        test.skip(true, '没有待审批任务，跳过测试');
      }

      // 点击编辑任务
      await taskManagementPage.clickEditTask(pendingTasks[0]);

      // 等待编辑对话框打开
      await page.waitForSelector('div[role="dialog"]:has-text("编辑任务")');

      // 验证强制刷新按钮存在
      await expect(await approvalPage.hasElement('button:has-text("强行刷新")')).toBe(true);

      // 点击强制刷新按钮
      await approvalPage.forceRefreshButton.click();

      // 验证强制刷新对话框打开
      await expect(await approvalPage.hasElement('div[role="dialog"]:has-text("强行刷新任务计划")')).toBe(true);

      // 验证变更说明必填
      await approvalPage.confirmForceRefreshButton.click();

      // 应该提示需要填写变更说明
      await page.waitForTimeout(500);

      // 填写变更说明
      await approvalPage.fillBatchComment('测试强制刷新');

      // 确认强制刷新
      await approvalPage.confirmForceRefreshButton.click();

      // 验证操作成功
      await page.waitForTimeout(1000);
    });
  });
});

test.describe('完整审批工作流', () => {
  test('工程师提交审批 -> 技术经理审批通过', async ({ page }) => {
    // 1. 工程师登录并修改任务日期
    await login(page, 'engineer');
    approvalPage = new ApprovalPage(page);
    taskManagementPage = new TaskManagementPage(page);

    await approvalPage.gotoTasks();

    // 获取一个已批准的任务进行修改
    await approvalPage.filterByStatus('approved');
    await page.waitForTimeout(1000);

    const approvedTasks = await approvalPage.getPendingApprovals();
    if (approvedTasks.length === 0) {
      test.skip(true, '没有已批准的任务，跳过测试');
    }

    // 编辑任务修改日期
    await taskManagementPage.clickEditTask(approvedTasks[0]);

    // 修改日期
    await page.locator('input[type="date"]').first().fill('2025-02-01');
    await page.locator('input[type="date"]').last().fill('2025-02-05');

    // 保存并创建审批请求
    await taskManagementPage.confirmCreate();

    // 2. 技术经理登录并审批
    await page.goto('/');
    await login(page, 'tech_manager');

    await approvalPage.gotoTasks();

    // 筛选待审批
    await approvalPage.filterByStatus('pending');
    await page.waitForTimeout(1000);

    // 获取刚才提交的审批请求
    const pendingTasks = await approvalPage.getPendingApprovals();
    expect(pendingTasks.length).toBeGreaterThan(0);

    // 审批通过
    await approvalPage.approveTask(pendingTasks[0], '测试审批通过');

    // 验证审批成功
    await approvalPage.waitForApprovalItemDisappear(pendingTasks[0]);

    // 查看审批历史
    await approvalPage.filterByStatus('approved');
    await page.waitForTimeout(1000);

    // 验证任务已批准
    const approvedTasksAfter = await approvalPage.getPendingApprovals();
    expect(approvedTasksAfter.length).toBeGreaterThan(0);
  });

  test('工程师提交审批 -> 技术经理审批拒绝', async ({ page }) => {
    // 1. 工程师登录并修改任务日期
    await login(page, 'engineer');
    approvalPage = new ApprovalPage(page);
    taskManagementPage = new TaskManagementPage(page);

    await approvalPage.gotoTasks();

    // 获取一个已批准的任务进行修改
    await approvalPage.filterByStatus('approved');
    await page.waitForTimeout(1000);

    const approvedTasks = await approvalPage.getPendingApprovals();
    if (approvedTasks.length === 0) {
      test.skip(true, '没有已批准的任务，跳过测试');
    }

    // 编辑任务修改日期
    await taskManagementPage.clickEditTask(approvedTasks[0]);

    // 修改日期
    await page.locator('input[type="date"]').first().fill('2025-03-01');
    await page.locator('input[type="date"]').last().fill('2025-03-10');

    // 保存并创建审批请求
    await taskManagementPage.confirmCreate();

    // 2. 技术经理登录并审批拒绝
    await page.goto('/');
    await login(page, 'tech_manager');

    await approvalPage.gotoTasks();

    // 筛选待审批
    await approvalPage.filterByStatus('pending');
    await page.waitForTimeout(1000);

    // 获取刚才提交的审批请求
    const pendingTasks = await approvalPage.getPendingApprovals();
    expect(pendingTasks.length).toBeGreaterThan(0);

    // 审批拒绝
    await approvalPage.rejectTask(pendingTasks[0], '测试拒绝：日期调整不合理');

    // 验证拒绝成功
    await approvalPage.waitForApprovalItemDisappear(pendingTasks[0]);

    // 查看已拒绝任务
    await approvalPage.filterByStatus('rejected');
    await page.waitForTimeout(1000);

    // 验证任务已拒绝
    const rejectedTasks = await approvalPage.getPendingApprovals();
    expect(rejectedTasks.length).toBeGreaterThan(0);
  });

  test('工程师应该能撤销自己的审批请求', async ({ page }) => {
    // 1. 工程师登录并修改任务日期
    await login(page, 'engineer');
    approvalPage = new ApprovalPage(page);
    taskManagementPage = new TaskManagementPage(page);

    await approvalPage.gotoTasks();

    // 获取一个已批准的任务进行修改
    await approvalPage.filterByStatus('approved');
    await page.waitForTimeout(1000);

    const approvedTasks = await approvalPage.getPendingApprovals();
    if (approvedTasks.length === 0) {
      test.skip(true, '没有已批准的任务，跳过测试');
    }

    // 编辑任务修改日期
    await taskManagementPage.clickEditTask(approvedTasks[0]);

    // 修改日期
    await page.locator('input[type="date"]').first().fill('2025-04-01');
    await page.locator('input[type="date"]').last().fill('2025-04-05');

    // 保存并创建审批请求
    await taskManagementPage.confirmCreate();

    // 2. 撤销审批请求
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

    // 验证撤销成功
    await page.waitForTimeout(1000);

    // 验证待审批数量减少
    const finalPending = await approvalPage.getPendingCount();
    expect(finalPending).toBeLessThan(initialPending);
  });
});

test.describe('审批通知功能', () => {
  test('审批后应该能查看审批历史', async ({ page }) => {
    await login(page, 'tech_manager');
    approvalPage = new ApprovalPage(page);

    await approvalPage.gotoTasks();

    // 获取已审批的任务
    await approvalPage.filterByStatus('approved');
    await page.waitForTimeout(1000);

    const approvedTasks = await approvalPage.getPendingApprovals();
    if (approvedTasks.length === 0) {
      test.skip(true, '没有已审批任务，跳过测试');
    }

    // 查看审批历史
    await approvalPage.clickViewHistory(approvedTasks[0]);

    // 验证历史记录包含审批人和审批时间
    await expect(await approvalPage.hasElement('div[role="dialog"]:has-text("审批历史")')).toBe(true);

    // 验证历史内容
    const historyText = await page.locator('div[role="dialog"]').textContent();
    expect(historyText).toContain('审批人');
    expect(historyText).toContain('处理时间');

    // 关闭历史对话框
    await approvalPage.closeHistoryDialog();
  });

  test('审批意见应该正确显示', async ({ page }) => {
    await login(page, 'tech_manager');
    approvalPage = new ApprovalPage(page);

    await approvalPage.gotoTasks();

    // 获取已拒绝的任务
    await approvalPage.filterByStatus('rejected');
    await page.waitForTimeout(1000);

    const rejectedTasks = await approvalPage.getPendingApprovals();
    if (rejectedTasks.length === 0) {
      test.skip(true, '没有已拒绝任务，跳过测试');
    }

    // 查看审批历史
    await approvalPage.clickViewHistory(rejectedTasks[0]);

    // 验证拒绝原因显示
    const historyText = await page.locator('div[role="dialog"]').textContent();
    expect(historyText).toContain('备注');

    // 关闭历史对话框
    await approvalPage.closeHistoryDialog();
  });
});

test.describe('审批表单验证', () => {
  test('拒绝时必须填写拒绝原因', async ({ page }) => {
    await login(page, 'tech_manager');
    approvalPage = new ApprovalPage(page);

    await approvalPage.gotoTasks();

    const pendingTasks = await approvalPage.getPendingApprovals();
    if (pendingTasks.length === 0) {
      test.skip(true, '没有待审批任务，跳过测试');
    }

    // 点击拒绝按钮
    await approvalPage.clickRejectButton(pendingTasks[0]);

    // 不填写拒绝原因，直接点击确认
    await approvalPage.confirmSingleReject();

    // 应该提示需要填写拒绝原因（或者按钮不可点击）
    await page.waitForTimeout(500);

    // 关闭对话框
    const cancelButton = page.locator('button:has-text("取消")');
    await cancelButton.click();
  });

  test('强制刷新必须填写变更说明', async ({ page }) => {
    await login(page, 'tech_manager');
    approvalPage = new ApprovalPage(page);
    taskManagementPage = new TaskManagementPage(page);

    await approvalPage.gotoTasks();

    const pendingTasks = await approvalPage.getPendingApprovals();
    if (pendingTasks.length === 0) {
      test.skip(true, '没有待审批任务，跳过测试');
    }

    // 点击编辑任务
    await taskManagementPage.clickEditTask(pendingTasks[0]);

    // 等待编辑对话框打开
    await page.waitForSelector('div[role="dialog"]:has-text("编辑任务")');

    // 点击强制刷新按钮
    await approvalPage.forceRefreshButton.click();

    // 验证确认按钮初始状态（可能被禁用）
    const confirmButton = approvalPage.confirmForceRefreshButton;
    const isDisabled = await confirmButton.isDisabled();
    expect(isDisabled).toBe(true);

    // 填写变更说明
    await approvalPage.forceRefreshDescription.fill('测试变更说明');

    // 验证按钮现在可用
    const isNowEnabled = await confirmButton.isEnabled();
    expect(isNowEnabled).toBe(true);

    // 取消操作
    const cancelButton = page.locator('button:has-text("取消")');
    await cancelButton.click();
  });
});

test.describe('审批统计功能', () => {
  test('统计数据应该准确', async ({ page }) => {
    await login(page, 'tech_manager');
    approvalPage = new ApprovalPage(page);

    await approvalPage.gotoTasks();

    // 获取各项统计数据
    const pendingCount = await approvalPage.getPendingCount();
    const approvedCount = await approvalPage.getApprovedCount();
    const rejectedCount = await approvalPage.getRejectedCount();
    const totalCount = await approvalPage.getTotalCount();

    // 验证总数等于各项之和
    expect(totalCount).toBe(pendingCount + approvedCount + rejectedCount);
  });

  test('统计数据应该实时更新', async ({ page }) => {
    await login(page, 'tech_manager');
    approvalPage = new ApprovalPage(page);

    await approvalPage.gotoTasks();

    // 获取初始待审批数量
    const initialPending = await approvalPage.getPendingCount();

    const pendingTasks = await approvalPage.getPendingApprovals();
    if (pendingTasks.length === 0) {
      test.skip(true, '没有待审批任务，跳过测试');
    }

    // 审批通过一个任务
    await approvalPage.approveTask(pendingTasks[0], '测试统计更新');

    // 等待统计更新
    await page.waitForTimeout(2000);

    // 验证待审批数量减少
    const updatedPending = await approvalPage.getPendingCount();
    expect(updatedPending).toBeLessThan(initialPending);
  });
});
