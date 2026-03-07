/**
 * 任务管理页面对象
 *
 * 封装任务管理页面的所有元素和操作
 * 支持完整的任务管理功能测试
 */

import type { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { waitForDialog, waitForDialogClosed } from '../helpers/TestHelpers';

export class TaskManagementPage extends BasePage {
  // ========== 页面元素 ==========

  // 标题和主按钮
  readonly pageTitle: Locator;
  readonly createTaskButton: Locator;
  readonly refreshButton: Locator;
  readonly exportButton: Locator;

  // 搜索和筛选
  readonly searchInput: Locator;
  readonly projectFilter: Locator;
  readonly memberFilter: Locator;
  readonly statusFilter: Locator;
  readonly priorityFilter: Locator;
  readonly clearFiltersButton: Locator;

  // WBS 任务表格
  readonly wbsTaskTable: Locator;
  readonly taskTableBody: Locator;
  readonly taskRows: Locator;
  readonly emptyState: Locator;

  // 任务统计信息
  readonly taskStats: Locator;
  readonly totalTasksCount: Locator;
  readonly pendingApprovalCard: Locator;
  readonly approvalCountBadge: Locator;

  // ========== 创建任务对话框 ==========
  readonly createTaskDialog: Locator;
  readonly dialogTitle: Locator;
  readonly projectSelect: Locator;
  readonly memberSelect: Locator;
  readonly memberInputDisabled: Locator; // 工程师账号时禁用
  readonly descriptionTextarea: Locator;
  readonly predecessorSelect: Locator;
  readonly startDateInput: Locator;
  readonly endDateInput: Locator;
  readonly priorityLowButton: Locator;
  readonly priorityMediumButton: Locator;
  readonly priorityHighButton: Locator;
  readonly confirmCreateButton: Locator;
  readonly cancelButton: Locator;

  // ========== 编辑任务对话框 ==========
  readonly editTaskDialog: Locator;
  readonly editDialogTitle: Locator;
  readonly editDescriptionTextarea: Locator;
  readonly editPredecessorSelect: Locator;
  readonly editStartDateInput: Locator;
  readonly editEndDateInput: Locator;
  readonly editProgressSlider: Locator;
  readonly editProgressValue: Locator;
  readonly forceRefreshButton: Locator;
  readonly saveEditButton: Locator;

  // ========== 强行刷新对话框 ==========
  readonly forceRefreshDialog: Locator;
  readonly forceRefreshTitle: Locator;
  readonly forceRefreshDescriptionTextarea: Locator;
  readonly confirmForceRefreshButton: Locator;
  readonly cancelForceRefreshButton: Locator;

  // ========== 审批对话框 ==========
  readonly approvalDialog: Locator;
  readonly approvalDialogTitle: Locator;
  readonly approvalTaskInfo: Locator;
  readonly approvalCommentTextarea: Locator;
  readonly approveButton: Locator;
  readonly rejectButton: Locator;

  // ========== 权限提示 ==========
  readonly rolePermissionNotice: Locator;
  readonly permissionErrorAlert: Locator;
  readonly pendingApprovalCard: Locator;

  // ========== 任务行操作 ==========
  readonly taskStatusBadge: Locator;
  readonly taskEditButton: Locator;
  readonly taskDeleteButton: Locator;
  readonly taskExpandButton: Locator;
  readonly taskCollapseButton: Locator;

  // ========== 批量操作 ==========
  readonly selectAllCheckbox: Locator;
  readonly batchDeleteButton: Locator;
  readonly batchUpdateStatusButton: Locator;

  constructor(page: Page) {
    super(page, '/tasks');

    // 标题和主按钮
    this.pageTitle = page.locator('h1, h2').filter({ hasText: /任务管理|WBS|任务/ });
    this.createTaskButton = page.locator('button:has-text("新建任务"), button:has([data-lucide="plus"])');
    this.refreshButton = page.locator('button:has([data-lucide="refresh-cw"])');
    this.exportButton = page.locator('button:has-text("导出"), button:has([data-lucide="download"])');

    // 搜索和筛选
    this.searchInput = page.locator('input[placeholder*="搜索"], input[placeholder*="WBS"]').first();
    this.projectFilter = page.locator('div:has-text("所有项目")').or(page.locator('[data-testid="project-filter"]'));
    this.memberFilter = page.locator('div:has-text("所有成员")').or(page.locator('[data-testid="member-filter"]'));
    this.statusFilter = page.locator('div:has-text("全部状态")').or(page.locator('[data-testid="status-filter"]'));
    this.priorityFilter = page.locator('div:has-text("优先级")').or(page.locator('[data-testid="priority-filter"]'));
    this.clearFiltersButton = page.locator('button:has-text("清除筛选")');

    // WBS 任务表格
    this.wbsTaskTable = page.locator('[class*="wbs-table"], [data-testid="wbs-task-table"], table');
    this.taskTableBody = page.locator('tbody, [class*="task-list"]');
    this.taskRows = page.locator('[class*="task-row"], tr[class*="hover"], div[class*="grid-cols-12"]');
    this.emptyState = page.locator('[class*="empty"], [data-testid="empty-state"]');

    // 任务统计
    this.taskStats = page.locator('[class*="stats"], [data-testid="task-stats"]');
    this.totalTasksCount = page.locator('[class*="total"], [data-testid="total-count"]');
    this.pendingApprovalCard = page.locator('[class*="pending"], [class*="approval"]');
    this.approvalCountBadge = page.locator('div[class*="bg-amber"]').or(page.locator('[data-testid="approval-count"]'));

    // 创建任务对话框
    this.createTaskDialog = page.locator('div[role="dialog"]:has-text("新建任务")');
    this.dialogTitle = this.createTaskDialog.locator('h2, h3');
    this.projectSelect = this.createTaskDialog.locator('[role="combobox"]').first();
    this.memberSelect = this.createTaskDialog.locator('[role="combobox"]').nth(1);
    this.memberInputDisabled = this.createTaskDialog.locator('input[disabled][value*="工程师"]');
    this.descriptionTextarea = this.createTaskDialog.locator('textarea[placeholder*="任务"], textarea[placeholder*="描述"]');
    this.predecessorSelect = this.createTaskDialog.locator('[role="combobox"]:has-text("前置任务")');
    this.startDateInput = this.createTaskDialog.locator('input[type="date"]').first();
    this.endDateInput = this.createTaskDialog.locator('input[type="date"]').nth(1);
    this.priorityLowButton = this.createTaskDialog.locator('button:has-text("低")');
    this.priorityMediumButton = this.createTaskDialog.locator('button:has-text("中")');
    this.priorityHighButton = this.createTaskDialog.locator('button:has-text("高")');
    this.confirmCreateButton = this.createTaskDialog.locator('button:has-text("创建任务"), button[type="submit"]');
    this.cancelButton = this.createTaskDialog.locator('button:has-text("取消")').first();

    // 编辑任务对话框
    this.editTaskDialog = page.locator('div[role="dialog"]:has-text("编辑任务")');
    this.editDialogTitle = this.editTaskDialog.locator('h2, h3');
    this.editDescriptionTextarea = this.editTaskDialog.locator('textarea').first();
    this.editPredecessorSelect = this.editTaskDialog.locator('[role="combobox"]:has-text("前置任务")');
    this.editStartDateInput = this.editTaskDialog.locator('input[type="date"]').first();
    this.editEndDateInput = this.editTaskDialog.locator('input[type="date"]').nth(1);
    this.editProgressSlider = this.editTaskDialog.locator('input[type="range"]');
    this.editProgressValue = this.editTaskDialog.locator('text=/\\d+%/');
    this.forceRefreshButton = this.editTaskDialog.locator('button:has-text("强行刷新")');
    this.saveEditButton = this.editTaskDialog.locator('button:has-text("保存")');

    // 强行刷新对话框
    this.forceRefreshDialog = page.locator('div[role="dialog"]:has-text("强行刷新")');
    this.forceRefreshTitle = this.forceRefreshDialog.locator('h2, h3');
    this.forceRefreshDescriptionTextarea = this.forceRefreshDialog.locator('textarea');
    this.confirmForceRefreshButton = this.forceRefreshDialog.locator('button:has-text("确认刷新")');
    this.cancelForceRefreshButton = this.forceRefreshDialog.locator('button:has-text("取消")');

    // 审批对话框
    this.approvalDialog = page.locator('div[role="dialog"]:has-text("审批任务")');
    this.approvalDialogTitle = this.approvalDialog.locator('h2, h3');
    this.approvalTaskInfo = this.approvalDialog.locator('div[class*="slate"]');
    this.approvalCommentTextarea = this.approvalDialog.locator('textarea[placeholder*="审批"]');
    this.approveButton = this.approvalDialog.locator('button:has-text("通过"), button.bg-green');
    this.rejectButton = this.approvalDialog.locator('button:has-text("拒绝"), button.border-red');

    // 权限提示
    this.rolePermissionNotice = page.locator('div:has-text("当前角色"), div[class*="bg-blue"]');
    this.permissionErrorAlert = page.locator('div[class*="bg-red"]:has([data-lucide="alert-triangle"])');
    this.pendingApprovalCard = page.locator('div:has-text("待审批任务")');

    // 任务行操作
    this.taskStatusBadge = page.locator('[class*="bg-"].cursor-pointer, [data-testid="task-status"]');
    this.taskEditButton = page.locator('button:has([data-lucide="edit"])');
    this.taskDeleteButton = page.locator('button:has([data-lucide="trash"])');
    this.taskExpandButton = page.locator('button:has([data-lucide="chevron-right"])');
    this.taskCollapseButton = page.locator('button:has([data-lucide="chevron-down"])');

    // 批量操作
    this.selectAllCheckbox = page.locator('input[type="checkbox"]').first();
    this.batchDeleteButton = page.locator('button:has-text("批量删除")');
    this.batchUpdateStatusButton = page.locator('button:has-text("批量更新状态")');
  }

  // ========== 页面导航 ==========

  /**
   * 等待任务管理页面加载完成
   */
  async waitForReady(): Promise<void> {
    await this.waitForLoad();
    await this.page.waitForTimeout(500); // 等待列表加载

    // 等待表格或空状态出现
    try {
      await Promise.race([
        this.wbsTaskTable.waitFor({ state: 'visible', timeout: 5000 }),
        this.emptyState.waitFor({ state: 'visible', timeout: 5000 })
      ]);
    } catch {
      // 忽略，某些情况下可能没有这些元素
    }
  }

  /**
   * 导航到任务管理页面
   */
  async goto(): Promise<void> {
    await this.page.goto('/tasks');
    await this.waitForReady();
  }

  // ========== 创建任务 ==========

  /**
   * 点击创建任务按钮
   */
  async clickCreateTask(): Promise<void> {
    await this.clickElement('button:has-text("新建任务")');
    await waitForDialog(this.page);
    await this.createTaskDialog.waitFor({ state: 'visible' });
  }

  /**
   * 等待创建任务对话框出现
   */
  async waitForCreateDialog(): Promise<void> {
    await waitForDialog(this.page);
    await this.createTaskDialog.waitFor({ state: 'visible' });
  }

  /**
   * 等待创建任务对话框关闭
   */
  async waitForCreateDialogClosed(): Promise<void> {
    await waitForDialogClosed(this.page);
    await this.createTaskDialog.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }

  /**
   * 选择项目
   */
  async selectProject(projectName: string): Promise<void> {
    await this.projectSelect.click();
    await this.page.locator(`div[role="option"]:has-text("${projectName}")`).click();
  }

  /**
   * 选择成员
   */
  async selectMember(memberName: string): Promise<void> {
    await this.memberSelect.click();
    await this.page.locator(`div[role="option"]:has-text("${memberName}")`).click();
  }

  /**
   * 填充任务描述
   */
  async fillDescription(description: string): Promise<void> {
    await this.descriptionTextarea.fill(description);
  }

  /**
   * 选择前置任务
   */
  async selectPredecessor(taskTitle: string): Promise<void> {
    await this.predecessorSelect.click();
    await this.page.locator(`div[role="option"]:has-text("${taskTitle}")`).click();
  }

  /**
   * 选择开始日期
   */
  async selectStartDate(date: string): Promise<void> {
    await this.startDateInput.fill(date);
  }

  /**
   * 选择结束日期
   */
  async selectEndDate(date: string): Promise<void> {
    await this.endDateInput.fill(date);
  }

  /**
   * 选择优先级
   */
  async selectPriority(priority: 'high' | 'medium' | 'low'): Promise<void> {
    const buttonMap = {
      high: this.priorityHighButton,
      medium: this.priorityMediumButton,
      low: this.priorityLowButton
    };
    await buttonMap[priority].click();
  }

  /**
   * 确认创建任务
   */
  async confirmCreate(): Promise<void> {
    await this.confirmCreateButton.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * 取消创建任务
   */
  async cancelCreate(): Promise<void> {
    await this.cancelButton.click();
    await this.waitForCreateDialogClosed();
  }

  /**
   * 创建任务（完整流程）
   */
  async createTask(data: {
    projectName: string;
    memberName: string;
    description: string;
    predecessor?: string;
    startDate?: string;
    endDate?: string;
    priority?: 'high' | 'medium' | 'low';
  }): Promise<void> {
    await this.clickCreateTask();

    // 填写表单
    await this.selectProject(data.projectName);
    await this.selectMember(data.memberName);
    await this.fillDescription(data.description);

    if (data.predecessor) {
      await this.selectPredecessor(data.predecessor);
    }

    if (data.startDate) {
      await this.selectStartDate(data.startDate);
    }
    if (data.endDate) {
      await this.selectEndDate(data.endDate);
    }
    if (data.priority) {
      await this.selectPriority(data.priority);
    }

    // 确认创建
    await this.confirmCreate();
    await this.waitForCreateDialogClosed();
  }

  // ========== 编辑任务 ==========

  /**
   * 点击编辑任务
   */
  async clickEditTask(taskTitle: string): Promise<void> {
    const taskRow = this.page.locator(`div:has-text("${taskTitle}"), tr:has-text("${taskTitle}")`).first();
    const editButton = taskRow.locator('button:has([data-lucide="edit"])');
    await editButton.click();
    await this.editTaskDialog.waitFor({ state: 'visible' });
  }

  /**
   * 更新任务描述
   */
  async updateTaskDescription(newDescription: string): Promise<void> {
    await this.editDescriptionTextarea.clear();
    await this.editDescriptionTextarea.fill(newDescription);
  }

  /**
   * 更新任务日期
   */
  async updateTaskDates(startDate: string, endDate: string): Promise<void> {
    await this.editStartDateInput.fill(startDate);
    await this.editEndDateInput.fill(endDate);
  }

  /**
   * 更新任务进度
   */
  async updateTaskProgress(progress: number): Promise<void> {
    await this.editProgressSlider.fill(String(progress));
  }

  /**
   * 保存编辑
   */
  async saveEdit(): Promise<void> {
    await this.saveEditButton.click();
    await this.page.waitForTimeout(1000);
    await this.editTaskDialog.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }

  /**
   * 强行刷新任务计划
   */
  async forceRefreshPlan(description: string): Promise<void> {
    await this.forceRefreshButton.click();
    await this.forceRefreshDialog.waitFor({ state: 'visible' });
    await this.forceRefreshDescriptionTextarea.fill(description);
    await this.confirmForceRefreshButton.click();
    await this.page.waitForTimeout(1000);
    await this.forceRefreshDialog.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }

  // ========== 删除任务 ==========

  /**
   * 点击删除任务
   */
  async clickDeleteTask(taskTitle: string): Promise<void> {
    const taskRow = this.page.locator(`div:has-text("${taskTitle}"), tr:has-text("${taskTitle}")`).first();
    const deleteButton = taskRow.locator('button:has([data-lucide="trash"])');
    await deleteButton.click();
    await this.page.waitForTimeout(500); // 等待确认对话框

    // 确认删除
    const confirmButton = this.page.locator('button:has-text("确认"), button:has-text("删除")');
    await confirmButton.click();
    await this.page.waitForTimeout(1000);
  }

  // ========== 任务状态 ==========

  /**
   * 点击任务状态徽章（切换状态）
   */
  async clickTaskStatus(taskTitle: string): Promise<void> {
    const taskRow = this.page.locator(`div:has-text("${taskTitle}"), tr:has-text("${taskTitle}")`).first();
    const statusBadge = taskRow.locator('[class*="bg-"].cursor-pointer, span[class*="bg-"]');
    await statusBadge.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * 获取任务状态
   */
  async getTaskStatus(taskTitle: string): Promise<string> {
    const taskRow = this.page.locator(`div:has-text("${taskTitle}"), tr:has-text("${taskTitle}")`).first();
    const statusBadge = taskRow.locator('[class*="bg-"]');
    return await statusBadge.textContent() || '';
  }

  // ========== 搜索和筛选 ==========

  /**
   * 搜索任务
   */
  async searchTasks(query: string): Promise<void> {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(1000); // 等待搜索结果
  }

  /**
   * 按项目筛选
   */
  async filterByProject(projectName: string): Promise<void> {
    await this.projectFilter.click();
    await this.page.locator(`div[role="option"]:has-text("${projectName}")`).click();
    await this.page.waitForTimeout(500);
  }

  /**
   * 按成员筛选
   */
  async filterByMember(memberName: string): Promise<void> {
    await this.memberFilter.click();
    await this.page.locator(`div[role="option"]:has-text("${memberName}")`).click();
    await this.page.waitForTimeout(500);
  }

  /**
   * 按状态筛选
   */
  async filterByStatus(status: string): Promise<void> {
    await this.statusFilter.click();
    await this.page.locator(`div[role="option"]:has-text("${status}")`).click();
    await this.page.waitForTimeout(500);
  }

  /**
   * 按优先级筛选
   */
  async filterByPriority(priority: string): Promise<void> {
    await this.priorityFilter.click();
    await this.page.locator(`div[role="option"]:has-text("${priority}")`).click();
    await this.page.waitForTimeout(500);
  }

  /**
   * 清除所有筛选
   */
  async clearFilters(): Promise<void> {
    if (await this.clearFiltersButton.isVisible()) {
      await this.clearFiltersButton.click();
      await this.page.waitForTimeout(500);
    }
  }

  // ========== 任务列表 ==========

  /**
   * 获取任务数量
   */
  async getTaskCount(): Promise<number> {
    try {
      return await this.taskRows.count();
    } catch {
      return 0;
    }
  }

  /**
   * 检查任务是否存在
   */
  async hasTask(title: string): Promise<boolean> {
    try {
      return await this.page.locator(`text="${title}"`).isVisible();
    } catch {
      return false;
    }
  }

  /**
   * 等待任务出现
   */
  async waitForTask(title: string, timeout: number = 5000): Promise<void> {
    await this.page.locator(`text="${title}"`).waitFor({ state: 'visible', timeout });
  }

  /**
   * 等待任务消失
   */
  async waitForTaskDisappear(title: string, timeout: number = 5000): Promise<void> {
    await this.page.locator(`text="${title}"`).waitFor({ state: 'hidden', timeout });
  }

  // ========== 审批功能 ==========

  /**
   * 点击审批任务
   */
  async clickApproveTask(taskTitle: string): Promise<void> {
    const approvalCard = this.pendingApprovalCard.locator(`div:has-text("${taskTitle}")`);
    const approveButton = approvalCard.locator('button:has-text("审批")');
    await approveButton.click();
    await this.approvalDialog.waitFor({ state: 'visible' });
  }

  /**
   * 审批通过任务
   */
  async approveTask(comment?: string): Promise<void> {
    if (comment) {
      await this.approvalCommentTextarea.fill(comment);
    }
    await this.approveButton.click();
    await this.page.waitForTimeout(1000);
    await this.approvalDialog.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }

  /**
   * 拒绝任务
   */
  async rejectTask(comment: string): Promise<void> {
    await this.approvalCommentTextarea.fill(comment);
    await this.rejectButton.click();
    await this.page.waitForTimeout(1000);
    await this.approvalDialog.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }

  /**
   * 获取待审批任务数量
   */
  async getPendingApprovalCount(): Promise<number> {
    try {
      const text = await this.approvalCountBadge.textContent();
      return parseInt(text || '0', 10);
    } catch {
      return 0;
    }
  }

  // ========== 权限验证 ==========

  /**
   * 检查权限提示是否显示
   */
  async hasPermissionNotice(): Promise<boolean> {
    return await this.rolePermissionNotice.isVisible();
  }

  /**
   * 获取当前角色提示文本
   */
  async getRolePermissionText(): Promise<string> {
    return await this.rolePermissionNotice.textContent() || '';
  }

  /**
   * 检查是否有权限错误提示
   */
  async hasPermissionError(): Promise<boolean> {
    return await this.permissionErrorAlert.isVisible();
  }

  /**
   * 检查创建任务按钮是否可见（验证权限）
   */
  async canCreateTask(): Promise<boolean> {
    return await this.createTaskButton.isVisible();
  }

  // ========== 导出功能 ==========

  /**
   * 点击导出按钮
   */
  async clickExport(): Promise<void> {
    await this.exportButton.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * 刷新页面
   */
  async refresh(): Promise<void> {
    await this.page.reload();
    await this.waitForReady();
  }

  // ========== 批量操作 ==========

  /**
   * 选择所有任务
   */
  async selectAllTasks(): Promise<void> {
    await this.selectAllCheckbox.check();
    await this.page.waitForTimeout(500);
  }

  /**
   * 批量删除任务
   */
  async batchDelete(): Promise<void> {
    await this.batchDeleteButton.click();
    await this.page.waitForTimeout(500);

    // 确认删除
    const confirmButton = this.page.locator('button:has-text("确认"), button:has-text("删除")');
    await confirmButton.click();
    await this.page.waitForTimeout(1000);
  }
}
