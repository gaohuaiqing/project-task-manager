/**
 * 任务审批页面对象
 *
 * 封装任务审批面板的所有元素和操作
 */

import type { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { waitForDialog, waitForDialogClosed } from '../helpers/TestHelpers';

export class ApprovalPage extends BasePage {
  // 页面元素
  readonly pageTitle: Locator;
  readonly approvalPanel: Locator;
  readonly approvalList: Locator;

  // 统计卡片
  readonly pendingStatCard: Locator;
  readonly approvedStatCard: Locator;
  readonly rejectedStatCard: Locator;
  readonly totalStatCard: Locator;

  // 待审批任务相关
  readonly pendingApprovals: Locator;
  readonly approvalItems: Locator;

  // 批量操作相关
  readonly selectAllCheckbox: Locator;
  readonly batchApproveButton: Locator;
  readonly batchRejectButton: Locator;
  readonly cancelSelectionButton: Locator;
  readonly refreshButton: Locator;

  // 筛选相关
  readonly filterSelect: Locator;

  // 单个审批相关
  readonly approveButtons: Locator;
  readonly rejectButtons: Locator;
  readonly historyButtons: Locator;
  readonly viewTaskButtons: Locator;
  readonly withdrawButtons: Locator;

  // 对话框相关
  readonly approveDialog: Locator;
  readonly rejectDialog: Locator;
  readonly batchApproveDialog: Locator;
  readonly batchRejectDialog: Locator;
  readonly historyDialog: Locator;

  // 对话框内的元素
  readonly commentTextarea: Locator;
  readonly confirmApproveButton: Locator;
  readonly confirmRejectButton: Locator;
  readonly dialogCancelButton: Locator;
  readonly dialogCloseButton: Locator;

  // 强行刷新相关（在TaskManagement中）
  readonly forceRefreshButton: Locator;
  readonly forceRefreshDialog: Locator;
  readonly forceRefreshDescription: Locator;
  readonly confirmForceRefreshButton: Locator;

  // 超时标记
  readonly overdueBadges: Locator;

  // 审批状态徽章
  readonly statusBadges: Locator;

  // 批量操作结果提示
  readonly batchResultAlert: Locator;

  constructor(page: Page) {
    super(page, '/tasks');
    this.pageTitle = page.locator('h1, h2').filter({ hasText: /任务|Task/ });

    // 审批面板
    this.approvalPanel = page.locator('div[class*="approval-panel"], div:has-text("待审批任务")');
    this.approvalList = page.locator('[class*="approval-list"], div[class*="task-list"]');

    // 统计卡片
    this.pendingStatCard = page.locator('div:has-text("待审批")').first();
    this.approvedStatCard = page.locator('div:has-text("已通过")').first();
    this.rejectedStatCard = page.locator('div:has-text("已拒绝")').first();
    this.totalStatCard = page.locator('div:has-text("总计")').first();

    // 待审批任务
    this.pendingApprovals = page.locator('[class*="approval-item"], div:has-text("申请人:")');
    this.approvalItems = page.locator('[class*="approval-item"]');

    // 批量操作
    this.selectAllCheckbox = page.locator('button:has-text("全选")');
    this.batchApproveButton = page.locator('button:has-text("批量通过")');
    this.batchRejectButton = page.locator('button:has-text("批量拒绝")');
    this.cancelSelectionButton = page.locator('button:has-text("取消选择")');
    this.refreshButton = page.locator('button:has-text("刷新")');

    // 筛选
    this.filterSelect = page.locator('select, [role="combobox"]').filter({ hasText: /筛选|全部/ });

    // 单个审批按钮
    this.approveButtons = page.locator('button:has-text("通过")');
    this.rejectButtons = page.locator('button:has-text("拒绝")');
    this.historyButtons = page.locator('button:has(svg[class*="history"]), button[aria-label="历史"]');
    this.viewTaskButtons = page.locator('button:has(svg[class*="eye"])');
    this.withdrawButtons = page.locator('button:has-text("撤销")');

    // 对话框
    this.approveDialog = page.locator('div[role="dialog"]:has-text("审批通过")');
    this.rejectDialog = page.locator('div[role="dialog"]:has-text("拒绝任务")');
    this.batchApproveDialog = page.locator('div[role="dialog"]:has-text("批量审批通过")');
    this.batchRejectDialog = page.locator('div[role="dialog"]:has-text("批量拒绝")');
    this.historyDialog = page.locator('div[role="dialog"]:has-text("审批历史")');

    // 对话框内的元素
    this.commentTextarea = page.locator('div[role="dialog"] textarea[id*="comment"]');
    this.confirmApproveButton = page.locator('button:has-text("通过"), button:has-text("确认通过")');
    this.confirmRejectButton = page.locator('button:has-text("确认拒绝")');
    this.dialogCancelButton = page.locator('button:has-text("取消")');
    this.dialogCloseButton = page.locator('button[aria-label="Close"]');

    // 强行刷新（编辑任务对话框中）
    this.forceRefreshButton = page.locator('button:has-text("强行刷新")');
    this.forceRefreshDialog = page.locator('div[role="dialog"]:has-text("强行刷新任务计划")');
    this.forceRefreshDescription = this.forceRefreshDialog.locator('textarea[placeholder*="变更说明"]');
    this.confirmForceRefreshButton = this.forceRefreshDialog.locator('button:has-text("确认刷新")');

    // 超时标记
    this.overdueBadges = page.locator('[class*="overdue"], span:has-text("超时")');

    // 状态徽章
    this.statusBadges = page.locator('[class*="status-badge"], [class*="bg-orange-500"], [class*="bg-green-500"], [class*="bg-red-500"]');

    // 批量操作结果提示
    this.batchResultAlert = page.locator('div[class*="alert"], div[class*="result"]').filter({ hasText: /批量操作完成/ });
  }

  /**
   * 等待审批页面加载完成
   */
  async waitForReady(): Promise<void> {
    await this.waitForLoad();
    await this.waitForElementVisible('h1, h2', 10000);
  }

  /**
   * 导航到任务管理页面（包含审批功能）
   */
  async gotoTasks(): Promise<void> {
    await this.page.goto('/tasks');
    await this.waitForReady();
  }

  /**
   * 获取待审批数量
   */
  async getPendingCount(): Promise<number> {
    const card = this.pendingStatCard.first();
    const countText = await card.locator('p[class*="font-bold"]').textContent();
    return parseInt(countText || '0');
  }

  /**
   * 获取已通过数量
   */
  async getApprovedCount(): Promise<number> {
    const card = this.approvedStatCard.first();
    const countText = await card.locator('p[class*="font-bold"]').textContent();
    return parseInt(countText || '0');
  }

  /**
   * 获取已拒绝数量
   */
  async getRejectedCount(): Promise<number> {
    const card = this.rejectedStatCard.first();
    const countText = await card.locator('p[class*="font-bold"]').textContent();
    return parseInt(countText || '0');
  }

  /**
   * 获取总计数量
   */
  async getTotalCount(): Promise<number> {
    const card = this.totalStatCard.first();
    const countText = await card.locator('p[class*="font-bold"]').textContent();
    return parseInt(countText || '0');
  }

  /**
   * 获取审批项目数量
   */
  async getApprovalItemCount(): Promise<number> {
    return await this.approvalItems.count();
  }

  /**
   * 获取所有待审批任务
   */
  async getPendingApprovals(): Promise<string[]> {
    const items = await this.pendingApprovals.all();
    const titles: string[] = [];
    for (const item of items) {
      const title = await item.locator('span[class*="font-medium"]').textContent();
      if (title) titles.push(title);
    }
    return titles;
  }

  /**
   * 筛选审批状态
   */
  async filterByStatus(status: 'all' | 'pending' | 'approved' | 'rejected'): Promise<void> {
    await this.filterSelect.click();
    const statusMap = {
      all: '全部',
      pending: '待审批',
      approved: '已通过',
      rejected: '已拒绝'
    };
    await this.page.locator(`[role="option"]:has-text("${statusMap[status]}")`).click();
    await this.wait(1000);
  }

  /**
   * 点击全选按钮
   */
  async clickSelectAll(): Promise<void> {
    await this.selectAllCheckbox.click();
    await this.wait(500);
  }

  /**
   * 取消选择
   */
  async clickCancelSelection(): Promise<void> {
    await this.cancelSelectionButton.click();
    await this.wait(500);
  }

  /**
   * 刷新审批列表
   */
  async clickRefresh(): Promise<void> {
    await this.refreshButton.click();
    await this.wait(1000);
  }

  /**
   * 选中指定索引的审批项
   */
  async selectApprovalByIndex(index: number): Promise<void> {
    const checkboxes = this.page.locator('input[type="checkbox"]');
    await checkboxes.nth(index).check();
    await this.wait(500);
  }

  /**
   * 获取选中的审批项数量
   */
  async getSelectedCount(): Promise<number> {
    const checkboxes = this.page.locator('input[type="checkbox"]:checked');
    return await checkboxes.count();
  }

  /**
   * 点击批量通过按钮
   */
  async clickBatchApprove(): Promise<void> {
    await this.batchApproveButton.click();
    await waitForDialog(this.page);
  }

  /**
   * 点击批量拒绝按钮
   */
  async clickBatchReject(): Promise<void> {
    await this.batchRejectButton.click();
    await waitForDialog(this.page);
  }

  /**
   * 填写批量审批意见
   */
  async fillBatchComment(comment: string): Promise<void> {
    await this.commentTextarea.fill(comment);
  }

  /**
   * 确认批量通过
   */
  async confirmBatchApprove(): Promise<void> {
    const confirmButton = this.batchApproveDialog.locator('button:has-text("确认通过")');
    await confirmButton.click();
    await waitForDialogClosed(this.page);
    await this.wait(1000);
  }

  /**
   * 确认批量拒绝
   */
  async confirmBatchReject(): Promise<void> {
    const confirmButton = this.batchRejectDialog.locator('button:has-text("确认拒绝")');
    await confirmButton.click();
    await waitForDialogClosed(this.page);
    await this.wait(1000);
  }

  /**
   * 批量审批（完整流程）
   */
  async batchApprove(comment?: string): Promise<void> {
    await this.clickBatchApprove();
    if (comment) {
      await this.fillBatchComment(comment);
    }
    await this.confirmBatchApprove();
  }

  /**
   * 批量拒绝（完整流程）
   */
  async batchReject(comment: string): Promise<void> {
    await this.clickBatchReject();
    await this.fillBatchComment(comment);
    await this.confirmBatchReject();
  }

  /**
   * 点击单个任务的通过按钮
   */
  async clickApproveButton(taskTitle: string): Promise<void> {
    const approvalItem = this.page.locator(`[class*="approval-item"]:has-text("${taskTitle}")`);
    const approveButton = approvalItem.locator('button:has-text("通过")');
    await approveButton.click();
    await waitForDialog(this.page);
  }

  /**
   * 点击单个任务的拒绝按钮
   */
  async clickRejectButton(taskTitle: string): Promise<void> {
    const approvalItem = this.page.locator(`[class*="approval-item"]:has-text("${taskTitle}")`);
    const rejectButton = approvalItem.locator('button:has-text("拒绝")');
    await rejectButton.click();
    await waitForDialog(this.page);
  }

  /**
   * 填写单个审批意见
   */
  async fillSingleComment(comment: string): Promise<void> {
    const textarea = this.approveDialog.locator('textarea').or(this.rejectDialog.locator('textarea'));
    await textarea.fill(comment);
  }

  /**
   * 确认单个通过
   */
  async confirmSingleApprove(): Promise<void> {
    const confirmButton = this.approveDialog.locator('button:has-text("通过")');
    await confirmButton.click();
    await waitForDialogClosed(this.page);
    await this.wait(1000);
  }

  /**
   * 确认单个拒绝
   */
  async confirmSingleReject(): Promise<void> {
    const confirmButton = this.rejectDialog.locator('button:has-text("确认拒绝")');
    await confirmButton.click();
    await waitForDialogClosed(this.page);
    await this.wait(1000);
  }

  /**
   * 单个审批通过（完整流程）
   */
  async approveTask(taskTitle: string, comment?: string): Promise<void> {
    await this.clickApproveButton(taskTitle);
    if (comment) {
      await this.fillSingleComment(comment);
    }
    await this.confirmSingleApprove();
  }

  /**
   * 单个审批拒绝（完整流程）
   */
  async rejectTask(taskTitle: string, comment: string): Promise<void> {
    await this.clickRejectButton(taskTitle);
    await this.fillSingleComment(comment);
    await this.confirmSingleReject();
  }

  /**
   * 点击查看审批历史
   */
  async clickViewHistory(taskTitle: string): Promise<void> {
    const approvalItem = this.page.locator(`[class*="approval-item"]:has-text("${taskTitle}")`);
    const historyButton = approvalItem.locator('button:has(svg)').filter({ hasText: '' });
    await historyButton.nth(-2).click(); // 历史按钮通常是倒数第二个
    await waitForDialog(this.page);
  }

  /**
   * 关闭历史对话框
   */
  async closeHistoryDialog(): Promise<void> {
    const closeButton = this.historyDialog.locator('button:has-text("关闭")');
    await closeButton.click();
    await waitForDialogClosed(this.page);
  }

  /**
   * 获取审批历史记录数量
   */
  async getHistoryCount(): Promise<number> {
    const historyItems = this.historyDialog.locator('div[class*="history-item"]');
    return await historyItems.count();
  }

  /**
   * 点击查看任务详情
   */
  async clickViewTask(taskTitle: string): Promise<void> {
    const approvalItem = this.page.locator(`[class*="approval-item"]:has-text("${taskTitle}")`);
    const viewButton = approvalItem.locator('button').last();
    await viewButton.click();
  }

  /**
   * 点击撤销申请（工程师）
   */
  async clickWithdraw(taskTitle: string): Promise<void> {
    const approvalItem = this.page.locator(`[class*="approval-item"]:has-text("${taskTitle}")`);
    const withdrawButton = approvalItem.locator('button:has-text("撤销")');
    await withdrawButton.click();
    await this.wait(1000);
  }

  /**
   * 检查任务是否有超时标记
   */
  async hasOverdueBadge(taskTitle: string): Promise<boolean> {
    const approvalItem = this.page.locator(`[class*="approval-item"]:has-text("${taskTitle}")`);
    const overdueBadge = approvalItem.locator('[class*="overdue"], span:has-text("超时")');
    return await overdueBadge.isVisible();
  }

  /**
   * 获取任务审批状态
   */
  async getTaskStatus(taskTitle: string): Promise<string> {
    const approvalItem = this.page.locator(`[class*="approval-item"]:has-text("${taskTitle}")`);
    const statusBadge = approvalItem.locator('[class*="status-badge"], span[class*="bg-"]');
    return await statusBadge.textContent() || '';
  }

  /**
   * 等待批量操作结果提示
   */
  async waitForBatchResult(): Promise<void> {
    await this.page.waitForSelector('div[class*="alert"]:has-text("批量操作完成")', { timeout: 10000 });
  }

  /**
   * 获取批量操作结果文本
   */
  async getBatchResultText(): Promise<string> {
    return await this.batchResultAlert.textContent() || '';
  }

  /**
   * 等待待审批数量更新
   */
  async waitForPendingCountUpdate(expectedCount: number, timeout: number = 5000): Promise<void> {
    await this.page.waitForFunction(
      (count) => {
        const card = document.querySelector('div:has-text("待审批")');
        if (card) {
          const countElement = card.querySelector('p[class*="font-bold"]');
          if (countElement) {
            return parseInt(countElement.textContent || '0') === count;
          }
        }
        return false;
      },
      expectedCount,
      { timeout }
    );
  }

  /**
   * 检查审批项是否存在
   */
  async hasApprovalItem(taskTitle: string): Promise<boolean> {
    const item = this.page.locator(`[class*="approval-item"]:has-text("${taskTitle}")`);
    return await item.isVisible();
  }

  /**
   * 等待审批项消失
   */
  async waitForApprovalItemDisappear(taskTitle: string, timeout: number = 5000): Promise<void> {
    const item = this.page.locator(`[class*="approval-item"]:has-text("${taskTitle}")`);
    await item.waitFor({ state: 'hidden', timeout });
  }

  /**
   * 获取申请人信息
   */
  async getApproverInfo(taskTitle: string): Promise<{ name: string; role: string }> {
    const approvalItem = this.page.locator(`[class*="approval-item"]:has-text("${taskTitle}")`);
    const text = await approvalItem.textContent() || '';
    const nameMatch = text.match(/申请人:\s*(\S+)/);
    const roleMatch = text.match(/角色:\s*(\S+)/);
    return {
      name: nameMatch?.[1] || '',
      role: roleMatch?.[1] || ''
    };
  }

  /**
   * 验证审批面板是否可见
   */
  async isApprovalPanelVisible(): Promise<boolean> {
    return await this.approvalPanel.isVisible();
  }

  /**
   * 验证是否有批量操作按钮
   */
  async hasBatchOperationButtons(): Promise<boolean> {
    return await this.batchApproveButton.isVisible() && await this.batchRejectButton.isVisible();
  }

  /**
   * 验证是否有审批权限
   */
  async hasApprovalPermission(): Promise<boolean> {
    return await this.hasBatchOperationButtons();
  }

  /**
   * 获取所有审批项的状态
   */
  async getAllApprovalStatuses(): Promise<string[]> {
    const badges = await this.statusBadges.all();
    const statuses: string[] = [];
    for (const badge of badges) {
      const text = await badge.textContent();
      if (text) statuses.push(text);
    }
    return statuses;
  }

  /**
   * 点击刷新按钮并等待更新
   */
  async refreshAndWaitForUpdate(): Promise<void> {
    const initialCount = await this.getApprovalItemCount();
    await this.clickRefresh();
    await this.page.waitForFunction(
      (initial) => {
        const items = document.querySelectorAll('[class*="approval-item"]');
        return items.length !== initial;
      },
      initialCount,
      { timeout: 5000 }
    );
  }
}
