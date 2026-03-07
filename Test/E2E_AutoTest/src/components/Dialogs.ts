/**
 * 对话框组件集合
 *
 * 封装系统中各种对话框的通用操作
 */

import type { Page, Locator } from '@playwright/test';
import { waitForDialog, waitForDialogClosed } from '../helpers/TestHelpers';

export class Dialog {
  readonly page: Page;
  readonly dialog: Locator;
  readonly title: Locator;
  readonly content: Locator;
  readonly confirmButton: Locator;
  readonly cancelButton: Locator;
  readonly closeButton: Locator;

  constructor(page: Page, selector: string = 'div[role="dialog"]') {
    this.page = page;
    this.dialog = page.locator(selector);
    this.title = this.dialog.locator('[class*="title"], h2, h3');
    this.content = this.dialog.locator('[class*="content"]');
    this.confirmButton = this.dialog.locator('button:has-text("确认"), button:has-text("确定"), button[type="submit"]');
    this.cancelButton = this.dialog.locator('button:has-text("取消")');
    this.closeButton = this.dialog.locator('button[aria-label="关闭"], button:has-text("×")');
  }

  /**
   * 等待对话框出现
   */
  async waitForOpen(): Promise<void> {
    await waitForDialog(this.page);
  }

  /**
   * 等待对话框关闭
   */
  async waitForClosed(): Promise<void> {
    await waitForDialogClosed(this.page);
  }

  /**
   * 获取对话框标题
   */
  async getTitle(): Promise<string> {
    return await this.title.textContent() || '';
  }

  /**
   * 点击确认按钮
   */
  async confirm(): Promise<void> {
    await this.confirmButton.click();
  }

  /**
   * 点击取消按钮
   */
  async cancel(): Promise<void> {
    await this.cancelButton.click();
  }

  /**
   * 点击关闭按钮
   */
  async close(): Promise<void> {
    await this.closeButton.click();
  }

  /**
   * 检查对话框是否可见
   */
  async isVisible(): Promise<boolean> {
    try {
      await this.dialog.waitFor({ state: 'visible', timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * 创建任务对话框
 */
export class CreateTaskDialog extends Dialog {
  constructor(page: Page) {
    super(page, 'div[role="dialog"]:has-text("新建任务")');
  }
}

/**
 * 编辑任务对话框
 */
export class EditTaskDialog extends Dialog {
  constructor(page: Page) {
    super(page, 'div[role="dialog"]:has-text("编辑任务")');
  }
}

/**
 * 删除确认对话框
 */
export class DeleteConfirmDialog extends Dialog {
  constructor(page: Page) {
    super(page, 'div[role="dialog"]:has-text("确认删除"), div[role="alert"]:has-text("确认删除")');
  }
}

/**
 * 项目类型切换确认对话框
 */
export class ProjectTypeSwitchDialog extends Dialog {
  constructor(page: Page) {
    super(page, 'div[role="dialog"]:has-text("确认切换")');
  }
}

/**
 * 任务审批对话框
 */
export class TaskApprovalDialog extends Dialog {
  constructor(page: Page) {
    super(page, 'div[role="dialog"]:has-text("审批"), div[role="dialog"]:has-text("批准")');
  }

  // 审批相关按钮
  readonly approveButton = this.dialog.locator('button:has-text("批准"), button:has-text("通过")');
  readonly rejectButton = this.dialog.locator('button:has-text("拒绝"), button:has-text("驳回")');

  /**
   * 批准任务
   */
  async approve(): Promise<void> {
    await this.approveButton.click();
  }

  /**
   * 拒绝任务
   */
  async reject(): Promise<void> {
    await this.rejectButton.click();
  }
}
