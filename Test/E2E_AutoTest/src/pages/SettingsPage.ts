/**
 * 设置页面对象 - 完整版
 *
 * 封装设置页面的所有元素和操作，包括：
 * - 设置页面导航
 * - 个人信息设置
 * - 密码修改
 * - 项目类型管理
 * - 任务类型管理
 * - 节假日管理
 * - 权限管理
 * - 系统日志
 * - 权限控制
 */

import type { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class SettingsPage extends BasePage {
  // 页面标题
  readonly pageTitle: Locator;

  // 侧边导航
  readonly navigation: Locator;
  readonly tabsNavigation: Locator;

  // 设置标签页
  readonly profileTab: Locator;
  readonly holidaysTab: Locator;
  readonly taskTypesTab: Locator;
  readonly projectTypesTab: Locator;
  readonly permissionsTab: Locator;
  readonly organizationTab: Locator;
  readonly logsTab: Locator;

  // 个人信息设置
  readonly profileForm: Locator;
  readonly userNameField: Locator;
  readonly userRoleField: Locator;
  readonly changePasswordButton: Locator;

  // 密码修改对话框
  readonly passwordDialog: Locator;
  readonly oldPasswordInput: Locator;
  readonly newPasswordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly savePasswordButton: Locator;
  readonly cancelPasswordButton: Locator;

  // 项目类型管理
  readonly projectTypeList: Locator;
  readonly addProjectTypeButton: Locator;
  readonly projectTypeDialog: Locator;
  readonly projectTypeCodeInput: Locator;
  readonly projectTypeNameInput: Locator;
  readonly projectTypeDescInput: Locator;
  readonly projectTypeSaveButton: Locator;
  readonly projectTypeCancelButton: Locator;

  // 任务类型管理
  readonly taskTypeList: Locator;
  readonly taskTypeInput: Locator;
  readonly taskTypeColorPicker: Locator;
  readonly addTaskTypeButton: Locator;
  readonly taskTypeBadges: Locator;

  // 节假日管理
  readonly holidayCalendar: Locator;
  readonly holidayList: Locator;
  readonly addHolidayButton: Locator;
  readonly holidayDialog: Locator;
  readonly holidayNameInput: Locator;
  readonly holidayDatePicker: Locator;
  readonly holidaySaveButton: Locator;
  readonly holidaySearchInput: Locator;
  readonly holidayYearFilter: Locator;

  // 权限管理
  readonly permissionConfig: Locator;
  readonly roleTabs: Locator;
  readonly permissionSwitches: Locator;
  readonly bulkPermissionButton: Locator;
  readonly savePermissionButton: Locator;
  readonly permissionHistoryButton: Locator;
  readonly permissionImportExportButton: Locator;

  // 系统日志
  readonly systemLogList: Locator;
  readonly logFilter: Locator;
  readonly logSearchInput: Locator;
  readonly logLevelFilter: Locator;
  readonly logTypeFilter: Locator;
  readonly logExportButton: Locator;
  readonly logClearButton: Locator;
  readonly logRefreshButton: Locator;
  readonly logAutoRefreshToggle: Locator;

  // 通用元素
  readonly contentArea: Locator;
  readonly successMessage: Locator;
  readonly errorMessage: Locator;
  readonly loadingIndicator: Locator;

  constructor(page: Page) {
    super(page, '/settings');
    this.pageTitle = page.locator('h1, h2').filter({ hasText: /设置|Settings/ });
    this.navigation = page.locator('[class*="nav"], [class*="sidebar"]');
    this.tabsNavigation = page.locator('[class*="tabs"], [class*="tab-list"], nav[class*="settings"]');

    // 设置标签页定位器
    this.profileTab = page.locator('button:has-text("个人信息"), a:has-text("个人信息")');
    this.holidaysTab = page.locator('button:has-text("节假日"), a:has-text("节假日")');
    this.taskTypesTab = page.locator('button:has-text("任务类型"), a:has-text("任务类型")');
    this.projectTypesTab = page.locator('button:has-text("项目类型"), a:has-text("项目类型")');
    this.permissionsTab = page.locator('button:has-text("权限"), a:has-text("权限")');
    this.organizationTab = page.locator('button:has-text("组织"), a:has-text("组织")');
    this.logsTab = page.locator('button:has-text("日志"), a:has-text("日志")');

    // 个人信息设置定位器
    this.profileForm = page.locator('[class*="profile"], [class*="user-info"]');
    this.userNameField = page.locator('[data-testid="user-name"], input[class*="name"]');
    this.userRoleField = page.locator('[class*="role"], [data-testid="user-role"]');
    this.changePasswordButton = page.locator('button:has-text("修改密码"), button:has-text("密码")');

    // 密码修改对话框定位器
    this.passwordDialog = page.locator('[role="dialog"]:has-text("密码"), [class*="password-dialog"]');
    this.oldPasswordInput = page.locator('[data-testid="old-password"], input[placeholder*="原密码"], input[placeholder*="旧密码"]');
    this.newPasswordInput = page.locator('[data-testid="new-password"], input[placeholder*="新密码"]');
    this.confirmPasswordInput = page.locator('[data-testid="confirm-password"], input[placeholder*="确认"]');
    this.savePasswordButton = page.locator('button:has-text("保存"), button[type="submit"]').filter({ hasText: /保存|提交/ });
    this.cancelPasswordButton = page.locator('button:has-text("取消")');

    // 项目类型管理定位器
    this.projectTypeList = page.locator('[class*="project-type"], [data-testid="project-type-list"]');
    this.addProjectTypeButton = page.locator('button:has-text("新建"), button:has-text("添加")');
    this.projectTypeDialog = page.locator('[role="dialog"]:has-text("项目类型")');
    this.projectTypeCodeInput = page.locator('#code, input[id*="code"]');
    this.projectTypeNameInput = page.locator('#name, input[id*="name"]');
    this.projectTypeDescInput = page.locator('#description, textarea[id*="desc"]');
    this.projectTypeSaveButton = page.locator('button:has-text("创建"), button:has-text("保存")');
    this.projectTypeCancelButton = page.locator('button:has-text("取消")');

    // 任务类型管理定位器
    this.taskTypeList = page.locator('[class*="task-type"], [data-testid="task-type-list"]');
    this.taskTypeInput = page.locator('input[placeholder*="任务类型"]');
    this.taskTypeColorPicker = page.locator('[class*="color"], [data-testid="color-picker"]');
    this.addTaskTypeButton = page.locator('button:has-text("添加")');
    this.taskTypeBadges = page.locator('[class*="badge"], [class*="task-type-badge"]');

    // 节假日管理定位器
    this.holidayCalendar = page.locator('[class*="calendar"], [data-testid="holiday-calendar"]');
    this.holidayList = page.locator('[class*="holiday-list"], [data-testid="holiday-list"]');
    this.addHolidayButton = page.locator('button:has-text("添加节假日")');
    this.holidayDialog = page.locator('[role="dialog"]:has-text("节假日")');
    this.holidayNameInput = page.locator('#holidayName, input[id*="holiday"], input[placeholder*="名称"]');
    this.holidayDatePicker = page.locator('[class*="calendar-picker"], [data-testid="date-picker"]');
    this.holidaySaveButton = page.locator('button:has-text("保存"), button:has-text("添加")');
    this.holidaySearchInput = page.locator('input[placeholder*="搜索"], input[id*="search"]');
    this.holidayYearFilter = page.locator('select, [role="combobox"]');

    // 权限管理定位器
    this.permissionConfig = page.locator('[class*="permission"], [data-testid="permission-config"]');
    this.roleTabs = page.locator('[class*="role-tab"], [data-testid="role-tab"]');
    this.permissionSwitches = page.locator('[type="checkbox"], [role="switch"]');
    this.bulkPermissionButton = page.locator('button:has-text("批量")');
    this.savePermissionButton = page.locator('button:has-text("保存")');
    this.permissionHistoryButton = page.locator('button:has-text("历史")');
    this.permissionImportExportButton = page.locator('button:has-text("导入"), button:has-text("导出")');

    // 系统日志定位器
    this.systemLogList = page.locator('[class*="log-list"], [data-testid="log-list"], table tbody tr');
    this.logFilter = page.locator('[data-testid="log-filter"], select[class*="filter"]');
    this.logSearchInput = page.locator('input[placeholder*="搜索"], input[id*="search"]');
    this.logLevelFilter = page.locator('[data-testid="log-level"], select[name*="level"]');
    this.logTypeFilter = page.locator('[data-testid="log-type"], select[name*="type"]');
    this.logExportButton = page.locator('button:has-text("导出")');
    this.logClearButton = page.locator('button:has-text("清空"), button:has-text("清除")');
    this.logRefreshButton = page.locator('button:has-text("刷新"), button[class*="refresh"]');
    this.logAutoRefreshToggle = page.locator('[type="checkbox"][id*="auto"], [role="switch"]');

    // 通用元素定位器
    this.contentArea = page.locator('main, [class*="content"]');
    this.successMessage = page.locator('[class*="success"], [role="status"]:has-text("成功")');
    this.errorMessage = page.locator('[class*="error"], [class*="alert"][class*="danger"]');
    this.loadingIndicator = page.locator('[class*="loading"], [role="progressbar"]');
  }

  /**
   * 等待设置页面加载完成
   */
  async waitForReady(): Promise<void> {
    await this.waitForLoad();
    await this.page.waitForTimeout(500);
  }

  /**
   * 切换到指定标签页
   */
  async switchToTab(tabName: 'profile' | 'holidays' | 'task-types' | 'project-types' | 'permissions' | 'organization' | 'logs'): Promise<void> {
    const tabMap = {
      'profile': this.profileTab,
      'holidays': this.holidaysTab,
      'task-types': this.taskTypesTab,
      'project-types': this.projectTypesTab,
      'permissions': this.permissionsTab,
      'organization': this.organizationTab,
      'logs': this.logsTab
    };

    const tab = tabMap[tabName];
    await tab.click();
    await this.page.waitForTimeout(500);

    // 验证URL参数
    const url = this.page.url();
    expect(url).toContain(tabName);
  }

  /**
   * 导航到个人资料
   */
  async goToProfile(): Promise<void> {
    await this.switchToTab('profile');
  }

  /**
   * 导航到项目类型设置
   */
  async goToProjectTypes(): Promise<void> {
    await this.switchToTab('project-types');
  }

  /**
   * 导航到任务类型设置
   */
  async goToTaskTypes(): Promise<void> {
    await this.switchToTab('task-types');
  }

  /**
   * 导航到系统日志
   */
  async goToSystemLogs(): Promise<void> {
    await this.switchToTab('logs');
  }

  /**
   * 导航到节假日管理
   */
  async goToHolidays(): Promise<void> {
    await this.switchToTab('holidays');
  }

  /**
   * 导航到权限管理
   */
  async goToPermissions(): Promise<void> {
    await this.switchToTab('permissions');
  }

  /**
   * 获取个人信息表单字段
   */
  getProfileField(fieldName: string): Locator {
    return this.page.locator(`[data-testid="${fieldName}"], input[name="${fieldName}"]`);
  }

  /**
   * 保存个人信息
   */
  async saveProfile(): Promise<void> {
    const saveButton = this.page.locator('button:has-text("保存"), button[type="submit"]').first();
    await saveButton.click();
  }

  /**
   * 打开密码修改对话框
   */
  async openChangePasswordDialog(): Promise<void> {
    await this.changePasswordButton.click();
    await this.passwordDialog.waitFor({ state: 'visible', timeout: 3000 });
  }

  /**
   * 修改密码
   */
  async changePassword(oldPassword: string, newPassword: string, confirmPassword: string): Promise<void> {
    await this.oldPasswordInput.fill(oldPassword);
    await this.newPasswordInput.fill(newPassword);
    await this.confirmPasswordInput.fill(confirmPassword);
    await this.savePasswordButton.click();
  }

  /**
   * 添加项目类型
   */
  async addProjectType(code: string, name: string, description: string): Promise<void> {
    await this.addProjectTypeButton.click();
    await this.projectTypeDialog.waitFor({ state: 'visible' });

    await this.projectTypeCodeInput.fill(code);
    await this.projectTypeNameInput.fill(name);
    await this.projectTypeDescInput.fill(description);
    await this.projectTypeSaveButton.click();
  }

  /**
   * 添加任务类型
   */
  async addTaskType(name: string, color?: string): Promise<void> {
    await this.taskTypeInput.fill(name);
    if (color) {
      const colorButton = this.taskTypeColorPicker.locator(`[style*="${color}"]`).first();
      await colorButton.click();
    }
    await this.addTaskTypeButton.click();
  }

  /**
   * 添加节假日
   */
  async addHoliday(name: string, date: string): Promise<void> {
    await this.addHolidayButton.click();
    await this.holidayDialog.waitFor({ state: 'visible' });

    await this.holidayNameInput.fill(name);

    // 选择日期
    const dateInput = this.page.locator('input[type="date"], input[id*="date"]');
    await dateInput.fill(date);

    await this.holidaySaveButton.click();
  }

  /**
   * 搜索节假日
   */
  async searchHoliday(keyword: string): Promise<void> {
    await this.holidaySearchInput.fill(keyword);
    await this.page.waitForTimeout(500);
  }

  /**
   * 按年份筛选节假日
   */
  async filterHolidayByYear(year: string): Promise<void> {
    await this.holidayYearFilter.selectOption(year);
    await this.page.waitForTimeout(500);
  }

  /**
   * 切换权限开关
   */
  async togglePermission(permissionIndex: number): Promise<void> {
    const switchElement = this.permissionSwitches.nth(permissionIndex);
    await switchElement.click();
  }

  /**
   * 保存权限配置
   */
  async savePermissions(): Promise<void> {
    await this.savePermissionButton.click();
  }

  /**
   * 搜索日志
   */
  async searchLogs(keyword: string): Promise<void> {
    await this.logSearchInput.fill(keyword);
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(1000);
  }

  /**
   * 按日志级别筛选
   */
  async filterLogsByLevel(level: string): Promise<void> {
    await this.logLevelFilter.selectOption(level);
    await this.page.waitForTimeout(500);
  }

  /**
   * 按日志类型筛选
   */
  async filterLogsByType(type: string): Promise<void> {
    await this.logTypeFilter.selectOption(type);
    await this.page.waitForTimeout(500);
  }

  /**
   * 刷新日志
   */
  async refreshLogs(): Promise<void> {
    await this.logRefreshButton.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * 切换自动刷新
   */
  async toggleAutoRefresh(): Promise<void> {
    await this.logAutoRefreshToggle.click();
  }

  /**
   * 导出日志
   */
  async exportLogs(): Promise<void> {
    await this.logExportButton.click();
  }

  /**
   * 清空日志
   */
  async clearLogs(): Promise<void> {
    await this.logClearButton.click();
    // 确认对话框
    const confirmButton = this.page.locator('button:has-text("确认"), button:has-text("确定")');
    await confirmButton.click();
  }

  /**
   * 验证是否在设置页
   */
  async isOnSettingsPage(): Promise<boolean> {
    const currentUrl = this.page.url();
    return currentUrl.includes('/settings');
  }

  /**
   * 获取可见的设置标签页
   */
  async getVisibleTabs(): Promise<string[]> {
    const tabs = await this.tabsNavigation.allTextContents();
    return tabs.map(text => text.trim()).filter(text => text.length > 0);
  }

  /**
   * 验证标签页是否可见
   */
  async isTabVisible(tabName: string): Promise<boolean> {
    const tab = this.page.locator(`button:has-text("${tabName}"), a:has-text("${tabName}")`);
    const count = await tab.count();
    if (count === 0) return false;

    try {
      await tab.first().waitFor({ state: 'visible', timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 验证权限提示是否显示
   */
  async hasPermissionAlert(): Promise<boolean> {
    const alert = this.page.locator('[class*="permission-alert"], [class*="alert"]:has-text("权限")');
    const count = await alert.count();
    return count > 0;
  }

  /**
   * 点击添加用户按钮
   */
  async clickAddUser(): Promise<void> {
    const addButton = this.page.locator('button:has-text("新建"), button:has-text("添加"), button:has-text("创建用户")').first();
    await addButton.click();
  }

  /**
   * 等待加载完成
   */
  async waitForLoading(): Promise<void> {
    try {
      await this.loadingIndicator.waitFor({ state: 'hidden', timeout: 5000 });
    } catch {
      // 如果没有加载指示器，继续执行
    }
  }

  /**
   * 获取成功消息
   */
  async getSuccessMessage(): Promise<string> {
    await this.successMessage.waitFor({ state: 'visible', timeout: 3000 });
    return await this.successMessage.textContent() || '';
  }

  /**
   * 获取错误消息
   */
  async getErrorMessage(): Promise<string> {
    await this.errorMessage.waitFor({ state: 'visible', timeout: 3000 });
    return await this.errorMessage.textContent() || '';
  }
}
