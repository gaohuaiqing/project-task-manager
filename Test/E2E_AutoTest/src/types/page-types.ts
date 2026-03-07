/**
 * 页面对象类型定义
 */

import type { Page, Locator } from '@playwright/test';

/**
 * 页面对象基类接口
 */
export interface IBasePage {
  page: Page;
  url: string;
  goto(): Promise<void>;
  waitForLoad(): Promise<void>;
  screenshot(path?: string): Promise<Buffer>;
  isLoaded(): Promise<boolean>;
}

/**
 * 登录页面对象接口
 *
 * 使用统一登录架构，系统自动识别用户权限
 */
export interface ILoginPage extends IBasePage {
  // 统一登录表单元素
  usernameInput: Locator;
  passwordInput: Locator;
  passwordToggle: Locator;
  loginButton: Locator;

  // 操作方法
  login(username: string, password: string): Promise<void>;
  expectLoginError(): Promise<void>;
  expectLoggedIn(): Promise<void>;
}

/**
 * 仪表板页面对象接口
 */
export interface IDashboardPage extends IBasePage {
  pageTitle: Locator;
  statsCards: Locator;
  quickActions: Locator;
  recentProjects: Locator;

  waitForReady(): Promise<void>;
  getStats(): Promise<Map<string, string>>;
}

/**
 * 项目列表页面对象接口
 */
export interface IProjectListPage extends IBasePage {
  createProjectButton: Locator;
  searchInput: Locator;
  projectCards: Locator;
  viewToggle: Locator;

  createProject(): Promise<void>;
  searchProjects(query: string): Promise<void>;
  getProjectCount(): Promise<number>;
  openProject(projectName: string): Promise<void>;
}

/**
 * 项目表单页面对象接口
 */
export interface IProjectFormPage extends IBasePage {
  // Tab导航
  basicInfoTab: Locator;
  membersTab: Locator;
  timePlanTab: Locator;

  // 项目类型
  productTypeButton: Locator;
  managementTypeButton: Locator;

  // 基本信息字段
  codeInput: Locator;
  nameInput: Locator;
  descriptionInput: Locator;

  // 导航按钮
  nextButton: Locator;
  backButton: Locator;
  submitButton: Locator;
  cancelButton: Locator;

  // 操作方法
  selectType(type: 'product' | 'management'): Promise<void>;
  fillBasicInfo(data: { code?: string; name: string; description?: string }): Promise<void>;
  goToNextStep(): Promise<void>;
  goToPreviousStep(): Promise<void>;
  submit(): Promise<void>;
  cancel(): Promise<void>;
}

/**
 * 任务管理页面对象接口
 */
export interface ITaskManagementPage extends IBasePage {
  createTaskButton: Locator;
  searchInput: Locator;
  filterButton: Locator;
  taskList: Locator;
  taskRows: Locator;

  createTask(): Promise<void>;
  searchTasks(query: string): Promise<void>;
  getTaskCount(): Promise<number>;
  openTask(taskName: string): Promise<void>;
}

/**
 * 设置页面对象接口
 */
export interface ISettingsPage extends IBasePage {
  navigation: Locator;
  profileSection: Locator;
  projectTypesSection: Locator;
  taskTypesSection: Locator;
  systemLogsSection: Locator;

  navigateTo(section: 'profile' | 'project-types' | 'task-types' | 'system-logs'): Promise<void>;
}
