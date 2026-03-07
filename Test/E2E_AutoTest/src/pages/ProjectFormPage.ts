/**
 * 项目表单页面对象
 *
 * 封装项目创建/编辑表单的所有元素和操作
 */

import type { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { waitForDialog, waitForDialogClosed } from '../helpers/TestHelpers';

export class ProjectFormPage extends BasePage {
  // Tab导航
  readonly basicInfoTab: Locator;
  readonly membersTab: Locator;
  readonly timePlanTab: Locator;

  // 项目类型按钮
  readonly productTypeButton: Locator;
  readonly managementTypeButton: Locator;

  // 基本信息字段
  readonly codeInput: Locator;
  readonly nameInput: Locator;
  readonly descriptionInput: Locator;

  // 导航按钮
  readonly nextButton: Locator;
  readonly backButton: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    super(page, '/projects');
    // Tab导航
    this.basicInfoTab = page.locator('button:has-text("基本信息")');
    this.membersTab = page.locator('button:has-text("项目成员")');
    this.timePlanTab = page.locator('button:has-text("时间计划")');

    // 项目类型（卡片式按钮）
    this.productTypeButton = page.locator('button:has-text("产品开发类")');
    this.managementTypeButton = page.locator('button:has-text("职能管理类")');

    // 基本信息字段（使用多个可能的选择器）
    this.codeInput = page.locator('#project-code, #code, input[name="code"]');
    this.nameInput = page.locator('#project-name, #name, input[name="name"]');
    this.descriptionInput = page.locator('#project-desc, #description, textarea[name="description"]');

    // 导航按钮
    this.nextButton = page.locator('button:has-text("下一步")');
    this.backButton = page.locator('button:has-text("上一步")');
    this.submitButton = page.locator('button:has-text("创建项目"), button:has-text("保存修改")');
    this.cancelButton = page.locator('button:has-text("取消")');
  }

  /**
   * 等待表单对话框出现
   */
  async waitForForm(): Promise<void> {
    await waitForDialog(this.page);
  }

  /**
   * 等待表单对话框关闭
   */
  async waitForFormClosed(): Promise<void> {
    await waitForDialogClosed(this.page);
  }

  /**
   * 选择项目类型
   */
  async selectType(type: 'product' | 'management'): Promise<void> {
    const button = type === 'product' ? this.productTypeButton : this.managementTypeButton;

    // 检查是否已选中
    const isSelected = await button.getAttribute('data-selected');

    if (!isSelected) {
      // 点击类型按钮（可能需要确认）
      await button.click();
      // 检查是否有确认对话框
      await this.wait(500);
      const confirmDialog = this.page.locator('div[role="dialog"]:has-text("确认切换")');
      if (await confirmDialog.isVisible()) {
        await this.clickElement('button:has-text("确认")');
      }
    }
  }

  /**
   * 填充项目编码
   */
  async fillCode(code: string): Promise<void> {
    await this.typeText('#project-code, #code, input[name="code"]', code);
  }

  /**
   * 填充项目名称
   */
  async fillName(name: string): Promise<void> {
    await this.typeText('#project-name, #name, input[name="name"]', name);
  }

  /**
   * 填充项目描述
   */
  async fillDescription(description: string): Promise<void> {
    await this.typeText('#project-desc, #description, textarea[name="description"]', description);
  }

  /**
   * 填充基本信息
   */
  async fillBasicInfo(data: { code?: string; name: string; description?: string }): Promise<void> {
    if (data.code) {
      await this.fillCode(data.code);
    }
    await this.fillName(data.name);
    if (data.description) {
      await this.fillDescription(data.description);
    }
  }

  /**
   * 切换到项目成员Tab
   */
  async goToMembersTab(): Promise<void> {
    await this.clickElement('button:has-text("项目成员")');
    await this.wait(500);
  }

  /**
   * 切换到时间计划Tab
   */
  async goToTimePlanTab(): Promise<void> {
    await this.clickElement('button:has-text("时间计划")');
    await this.wait(500);
  }

  /**
   * 切换到基本信息Tab
   */
  async goToBasicInfoTab(): Promise<void> {
    await this.clickElement('button:has-text("基本信息")');
    await this.wait(500);
  }

  /**
   * 点击下一步
   */
  async goToNextStep(): Promise<void> {
    await this.clickElement('button:has-text("下一步")');
  }

  /**
   * 点击上一步
   */
  async goToPreviousStep(): Promise<void> {
    await this.clickElement('button:has-text("上一步")');
  }

  /**
   * 提交表单
   */
  async submit(): Promise<void> {
    await this.clickElement('button:has-text("创建项目"), button:has-text("保存修改")');
    // 等待表单关闭
    await this.wait(1000);
  }

  /**
   * 取消表单
   */
  async cancel(): Promise<void> {
    await this.clickElement('button:has-text("取消")');
    await this.wait(500);
  }

  /**
   * 创建产品开发类项目（完整流程）
   */
  async createProductProject(data: {
    code?: string;
    name: string;
    description?: string;
  }): Promise<void> {
    await this.waitForForm();

    // 选择产品开发类
    await this.selectType('product');

    // 填充基本信息
    await this.fillBasicInfo(data);

    // 下一步（成员）
    await this.goToNextStep();

    // 下一步（时间计划）
    await this.goToNextStep();

    // 提交
    await this.submit();

    // 等待表单关闭
    await this.waitForFormClosed();
  }

  /**
   * 创建职能管理类项目（简化流程）
   */
  async createManagementProject(data: {
    code?: string;
    name: string;
    description?: string;
  }): Promise<void> {
    await this.waitForForm();

    // 选择职能管理类
    await this.selectType('management');

    // 填充基本信息
    await this.fillBasicInfo(data);

    // 提交（职能管理类可能不需要填写成员和时间计划）
    await this.submit();

    // 等待表单关闭
    await this.waitForFormClosed();
  }

  /**
   * 填充开始日期
   */
  async fillStartDate(date: string): Promise<void> {
    await this.typeText('#start-date, input[name="plannedStartDate"]', date);
  }

  /**
   * 填充结束日期
   */
  async fillEndDate(date: string): Promise<void> {
    await this.typeText('#end-date, input[name="plannedEndDate"]', date);
  }

  /**
   * 填充日期范围
   */
  async fillDateRange(startDate: string, endDate: string): Promise<void> {
    await this.fillStartDate(startDate);
    await this.fillEndDate(endDate);
  }

  /**
   * 选择项目成员
   */
  async selectMember(memberIndex: number): Promise<void> {
    const checkbox = this.page.locator('input[type="checkbox"]').nth(memberIndex);
    await checkbox.check();
  }

  /**
   * 选择多个成员
   */
  async selectMembers(indices: number[]): Promise<void> {
    for (const index of indices) {
      await this.selectMember(index);
      await this.wait(300);
    }
  }

  /**
   * 获取选中成员数量
   */
  async getSelectedMemberCount(): Promise<number> {
    const checkedCheckboxes = await this.page.locator('input[type="checkbox"]:checked').count();
    return checkedCheckboxes;
  }

  /**
   * 获取验证错误信息
   */
  async getValidationErrors(): Promise<{ [key: string]: string }> {
    const errors: { [key: string]: string } = {};

    const errorElements = await this.page.locator('text=/必填|不能为空|required/').all();
    for (const el of errorElements) {
      const text = await el.textContent();
      if (text) {
        errors['general'] = text;
      }
    }

    return errors;
  }

  /**
   * 检查是否有验证错误
   */
  async hasValidationErrors(): Promise<boolean> {
    const errorCount = await this.page.locator('text=/必填|不能为空|required/').count();
    return errorCount > 0;
  }

  /**
   * 等待表单提交完成
   */
  async waitForSubmit(timeout: number = 5000): Promise<void> {
    await this.wait(timeout);
  }

  /**
   * 获取表单当前数据
   */
  async getFormData(): Promise<{
    code?: string;
    name?: string;
    description?: string;
    projectType?: string;
  }> {
    const code = await this.page.locator('#project-code, #code').inputValue().catch(() => '');
    const name = await this.page.locator('#project-name, #name').inputValue().catch(() => '');
    const description = await this.page.locator('#project-desc, #description').inputValue().catch(() => '');

    return {
      code,
      name,
      description,
    };
  }
}
