/**
 * 表单组件集合
 *
 * 封装系统中各种表单的通用操作
 */

import type { Page, Locator } from '@playwright/test';

export class FormHelper {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * 填充输入框
   */
  async fillInput(selector: string, value: string): Promise<void> {
    const input = this.page.locator(selector);
    await input.clear();
    await input.fill(value);
  }

  /**
   * 选择下拉选项
   */
  async selectOption(selector: string, value: string | { label: string }): Promise<void> {
    const select = this.page.locator(selector);
    await select.selectOption(value);
  }

  /**
   * 勾选复选框
   */
  async checkCheckbox(selector: string): Promise<void> {
    const checkbox = this.page.locator(selector);
    await checkbox.check();
  }

  /**
   * 取消勾选复选框
   */
  async uncheckCheckbox(selector: string): Promise<void> {
    const checkbox = this.page.locator(selector);
    await checkbox.uncheck();
  }

  /**
   * 选择单选按钮
   */
  async selectRadio(selector: string): Promise<void> {
    const radio = this.page.locator(selector);
    await radio.check();
  }

  /**
   * 填充日期
   */
  async fillDate(selector: string, date: string): Promise<void> {
    const input = this.page.locator(selector);
    await input.fill(date);
  }

  /**
   * 填充文本域
   */
  async fillTextarea(selector: string, text: string): Promise<void> {
    const textarea = this.page.locator(selector);
    await textarea.clear();
    await textarea.fill(text);
  }

  /**
   * 点击按钮
   */
  async clickButton(buttonText: string): Promise<void> {
    const button = this.page.locator(`button:has-text("${buttonText}")`);
    await button.click();
  }

  /**
   * 获取表单错误信息
   */
  async getErrorMessages(): Promise<string[]> {
    const errors = this.page.locator('[class*="error"], [role="alert"]');
    const count = await errors.count();
    const messages: string[] = [];

    for (let i = 0; i < count; i++) {
      const text = await errors.nth(i).textContent();
      if (text) messages.push(text);
    }

    return messages;
  }

  /**
   * 检查表单是否有错误
   */
  async hasErrors(): Promise<boolean> {
    const errors = this.page.locator('[class*="error"], [role="alert"]');
    const count = await errors.count();
    return count > 0;
  }
}

/**
 * 项目表单助手
 */
export class ProjectFormHelper extends FormHelper {
  constructor(page: Page) {
    super(page);
  }

  /**
   * 填充项目基本信息
   */
  async fillBasicInfo(data: {
    code?: string;
    name: string;
    description?: string;
  }): Promise<void> {
    if (data.code) {
      await this.fillInput('#project-code, #code, input[name="code"]', data.code);
    }
    await this.fillInput('#project-name, #name, input[name="name"]', data.name);
    if (data.description) {
      await this.fillTextarea('#project-desc, #description, textarea[name="description"]', data.description);
    }
  }

  /**
   * 选择项目类型
   */
  async selectProjectType(type: 'product' | 'management'): Promise<void> {
    const buttonText = type === 'product' ? '产品开发类' : '职能管理类';
    await this.clickButton(buttonText);
  }
}

/**
 * 任务表单助手
 */
export class TaskFormHelper extends FormHelper {
  constructor(page: Page) {
    super(page);
  }

  /**
   * 选择项目
   */
  async selectProject(projectName: string): Promise<void> {
    const dialog = this.page.locator('div[role="dialog"]');
    const select = dialog.locator('select, [role="combobox"]').first();
    await select.selectOption({ label: projectName });
  }

  /**
   * 选择成员
   */
  async selectMember(memberName: string): Promise<void> {
    const dialog = this.page.locator('div[role="dialog"]');
    const selects = dialog.locator('select, [role="combobox"]');
    // 通常第二个选择器是成员选择
    await selects.nth(1).selectOption({ label: memberName });
  }

  /**
   * 选择优先级
   */
  async selectPriority(priority: 'high' | 'medium' | 'low'): Promise<void> {
    const priorityMap = {
      high: '高',
      medium: '中',
      low: '低'
    };
    await this.selectOption('select[name="priority"]', { label: priorityMap[priority] });
  }

  /**
   * 填充任务信息
   */
  async fillTaskInfo(data: {
    projectName: string;
    memberName: string;
    description: string;
    startDate?: string;
    endDate?: string;
    priority?: 'high' | 'medium' | 'low';
  }): Promise<void> {
    await this.selectProject(data.projectName);
    await this.selectMember(data.memberName);
    await this.fillTextarea('textarea[placeholder*="任务"]', data.description);

    if (data.startDate) {
      await this.fillDate('input[type="date"]', data.startDate);
    }
    if (data.endDate) {
      const dateInputs = this.page.locator('input[type="date"]');
      await dateInputs.nth(1).fill(data.endDate);
    }
    if (data.priority) {
      await this.selectPriority(data.priority);
    }
  }
}
