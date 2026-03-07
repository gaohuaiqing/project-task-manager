/**
 * 组织架构页面对象
 *
 * 封装组织架构页面的所有元素和操作
 */

import type { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class OrganizationPage extends BasePage {
  // 页面标题和统计
  readonly pageTitle: Locator;
  readonly statsDepartments: Locator;
  readonly statsTechGroups: Locator;
  readonly statsMembers: Locator;

  // 工具栏按钮
  readonly importButton: Locator;
  readonly exportButton: Locator;
  readonly capabilitySettingsButton: Locator;
  readonly deleteOrganizationButton: Locator;

  // 组织架构树
  readonly organizationTree: Locator;
  readonly treeNodes: Locator;

  // 详情面板
  readonly detailPanel: Locator;
  readonly detailPanelTitle: Locator;
  readonly detailPanelDescription: Locator;
  readonly editButton: Locator;
  readonly deleteButton: Locator;

  // 添加按钮
  readonly addSubDepartmentButton: Locator;
  readonly addTechGroupButton: Locator;
  readonly addMemberButton: Locator;

  // 对话框
  readonly createOrganizationDialog: Locator;
  readonly importDialog: Locator;
  readonly capabilitySettingsDialog: Locator;
  readonly addDepartmentDialog: Locator;
  readonly addTechGroupDialog: Locator;
  readonly addMemberDialog: Locator;

  // 初始状态（无组织架构时）
  readonly initialCreateButton: Locator;
  readonly initialImportButton: Locator;

  constructor(page: Page) {
    super(page, '/settings');
    this.pageTitle = page.locator('h1, h2').filter({ hasText: /组织及人员设置|组织架构|Organization/ });

    // 统计信息
    this.statsDepartments = page.locator('span:has-text("部门:")').or(page.locator('text=/部门.*\\d+/'));
    this.statsTechGroups = page.locator('span:has-text("技术组:")').or(page.locator('text=/技术组.*\\d+/'));
    this.statsMembers = page.locator('span:has-text("成员:")').or(page.locator('text=/成员.*\\d+'));

    // 工具栏按钮
    this.importButton = page.locator('button:has-text("导入")');
    this.exportButton = page.locator('button:has-text("导出")');
    this.capabilitySettingsButton = page.locator('button:has-text("能力模型设置")');
    this.deleteOrganizationButton = page.locator('button:has-text("删除组织")');

    // 组织架构树
    this.organizationTree = page.locator('[class*="tree"], [class*="organization"]');
    this.treeNodes = page.locator('[class*="tree"] [class*="node"], [class*="organization"] [role="button"]');

    // 详情面板
    this.detailPanel = page.locator('[class*="detail"], [class*="panel"]').filter({ hasText: /详情|Detail/ });
    this.detailPanelTitle = page.locator('[class*="detail"] h2, [class*="detail"] h3, [class*="panel"] h2');
    this.detailPanelDescription = page.locator('[class*="detail"] [class*="description"]');
    this.editButton = page.locator('button:has-text("编辑"), button svg[data-lucide="edit3"]');
    this.deleteButton = page.locator('button:has-text("删除"), button svg[data-lucide="trash2"]');

    // 添加按钮
    this.addSubDepartmentButton = page.locator('button:has-text("添加子部门")');
    this.addTechGroupButton = page.locator('button:has-text("添加技术组")');
    this.addMemberButton = page.locator('button:has-text("添加成员")');

    // 对话框
    this.createOrganizationDialog = page.locator('div[role="dialog"]').filter({ hasText: /新建组织架构/ });
    this.importDialog = page.locator('div[role="dialog"]').filter({ hasText: /导入组织架构/ });
    this.capabilitySettingsDialog = page.locator('div[role="dialog"]').filter({ hasText: /能力模型设置/ });
    this.addDepartmentDialog = page.locator('div[role="dialog"]').filter({ hasText: /添加子部门/ });
    this.addTechGroupDialog = page.locator('div[role="dialog"]').filter({ hasText: /添加技术组/ });
    this.addMemberDialog = page.locator('div[role="dialog"]').filter({ hasText: /添加成员/ });

    // 初始状态按钮
    this.initialCreateButton = page.locator('button:has-text("新建组织架构"), button:has-text("开始创建")');
    this.initialImportButton = page.locator('button:has-text("导入组织架构"), button:has-text("选择文件")');
  }

  /**
   * 等待组织架构页面加载完成
   */
  async waitForReady(): Promise<void> {
    await this.waitForLoad();
    await this.waitForElementVisible('h1, h2', 10000);
  }

  /**
   * 导航到组织架构页面（通过设置菜单）
   */
  async navigateToOrganizationSettings(): Promise<void> {
    // 先导航到设置页面
    await this.page.goto('/settings');

    // 等待页面加载
    await this.waitForLoad();

    // 点击组织架构菜单项（如果存在）
    const orgNav = this.page.locator('button:has-text("组织及人员"), a:has-text("组织及人员")');
    const orgNavExists = await orgNav.count() > 0;

    if (orgNavExists) {
      await orgNav.click();
    }
  }

  /**
   * 检查是否显示初始状态（无组织架构）
   */
  async isInitialState(): Promise<boolean> {
    const createButtonVisible = await this.initialCreateButton.count() > 0;
    const importButtonVisible = await this.initialImportButton.count() > 0;
    return createButtonVisible && importButtonVisible;
  }

  /**
   * 点击新建组织架构按钮
   */
  async clickCreateOrganization(): Promise<void> {
    await this.clickElement('button:has-text("新建组织架构"), button:has-text("开始创建")');
  }

  /**
   * 点击导入按钮
   */
  async clickImport(): Promise<void> {
    await this.importButton.click();
  }

  /**
   * 点击导出按钮
   */
  async clickExport(): Promise<void> {
    await this.exportButton.click();
  }

  /**
   * 点击能力模型设置按钮
   */
  async clickCapabilitySettings(): Promise<void> {
    await this.capabilitySettingsButton.click();
  }

  /**
   * 点击删除组织按钮
   */
  async clickDeleteOrganization(): Promise<void> {
    await this.deleteOrganizationButton.click();
  }

  /**
   * 选择树节点
   */
  async selectTreeNode(nodeName: string): Promise<void> {
    const node = this.page.locator(`[class*="tree"] [role="button"]:has-text("${nodeName}")`).first();
    await node.click();
  }

  /**
   * 获取所有树节点文本
   */
  async getTreeNodes(): Promise<string[]> {
    const nodes = await this.treeNodes.allTextContents();
    return nodes.map(text => text.trim()).filter(text => text.length > 0);
  }

  /**
   * 获取部门节点数量
   */
  async getDepartmentCount(): Promise<number> {
    const deptNodes = this.page.locator('[class*="tree"] [class*="department"], svg[data-lucide="building2"]');
    return await deptNodes.count();
  }

  /**
   * 获取技术组节点数量
   */
  async getTechGroupCount(): Promise<number> {
    const groupNodes = this.page.locator('[class*="tree"] [class*="tech-group"], svg[data-lucide="users"]');
    return await groupNodes.count();
  }

  /**
   * 获取成员节点数量
   */
  async getMemberCount(): Promise<number> {
    const memberNodes = this.page.locator('[class*="tree"] [class*="member"], svg[data-lucide="user"]');
    return await memberNodes.count();
  }

  /**
   * 点击添加子部门按钮
   */
  async clickAddSubDepartment(): Promise<void> {
    await this.addSubDepartmentButton.click();
  }

  /**
   * 点击添加技术组按钮
   */
  async clickAddTechGroup(): Promise<void> {
    await this.addTechGroupButton.click();
  }

  /**
   * 点击添加成员按钮
   */
  async clickAddMember(): Promise<void> {
    await this.addMemberButton.click();
  }

  /**
   * 填写部门表单
   */
  async fillDepartmentForm(data: {
    name: string;
    managerEmployeeId: string;
    managerName: string;
    description?: string;
  }): Promise<void> {
    await this.typeText('input[placeholder*="部门名称"], input[id*="deptName"]', data.name);
    await this.typeText('input[placeholder*="部门经理工号"]', data.managerEmployeeId);
    await this.typeText('input[placeholder*="部门经理姓名"]', data.managerName);
    if (data.description) {
      await this.typeText('textarea[placeholder*="描述"]', data.description);
    }
  }

  /**
   * 填写技术组表单
   */
  async fillTechGroupForm(data: {
    name: string;
    leaderEmployeeId: string;
    leaderName: string;
    description?: string;
  }): Promise<void> {
    await this.typeText('input[placeholder*="技术组名称"]', data.name);
    await this.typeText('input[placeholder*="技术经理工号"]', data.leaderEmployeeId);
    await this.typeText('input[placeholder*="技术经理姓名"]', data.leaderName);
    if (data.description) {
      await this.typeText('textarea[placeholder*="描述"]', data.description);
    }
  }

  /**
   * 填写成员表单
   */
  async fillMemberForm(data: {
    name: string;
    employeeId: string;
    role?: string;
    email?: string;
  }): Promise<void> {
    await this.typeText('input[placeholder*="成员姓名"], input[id*="memberName"]', data.name);
    await this.typeText('input[placeholder*="成员工号"]', data.employeeId);

    if (data.role) {
      await this.clickElement('[role="combobox"], [class*="select"]');
      await this.clickElement(`[role="option"]:has-text("${data.role}")`);
    }

    if (data.email) {
      await this.typeText('input[placeholder*="邮箱"]', data.email);
    }
  }

  /**
   * 点击表单提交按钮
   */
  async clickFormSubmit(buttonText: string = '添加'): Promise<void> {
    await this.clickElement(`button:has-text("${buttonText}")`);
  }

  /**
   * 点击表单取消按钮
   */
  async clickFormCancel(): Promise<void> {
    await this.clickElement('button:has-text("取消")');
  }

  /**
   * 等待对话框显示
   */
  async waitForDialog(dialogType: 'create' | 'import' | 'capability' | 'department' | 'tech-group' | 'member'): Promise<void> {
    const dialogSelectors = {
      create: 'div[role="dialog"]:has-text("新建组织架构")',
      import: 'div[role="dialog"]:has-text("导入组织架构")',
      capability: 'div[role="dialog"]:has-text("能力模型设置")',
      department: 'div[role="dialog"]:has-text("添加子部门")',
      'tech-group': 'div[role="dialog"]:has-text("添加技术组")',
      member: 'div[role="dialog"]:has-text("添加成员")'
    };

    await this.waitForElementVisible(dialogSelectors[dialogType]);
  }

  /**
   * 等待对话框关闭
   */
  async waitForDialogClosed(): Promise<void> {
    await this.wait(500);
    const dialogVisible = await this.page.locator('div[role="dialog"]').count() > 0;
    if (dialogVisible) {
      await this.page.waitForSelector('div[role="dialog"]', { state: 'hidden', timeout: 5000 })
        .catch(() => {});
    }
  }

  /**
   * 获取详情面板标题
   */
  async getDetailPanelTitle(): Promise<string> {
    return await this.detailPanelTitle.textContent() || '';
  }

  /**
   * 获取详情面板描述
   */
  async getDetailPanelDescription(): Promise<string> {
    return await this.detailPanelDescription.textContent() || '';
  }

  /**
   * 点击编辑按钮
   */
  async clickEdit(): Promise<void> {
    await this.editButton.first().click();
  }

  /**
   * 点击删除按钮
   */
  async clickDelete(): Promise<void> {
    await this.deleteButton.first().click();
  }

  /**
   * 确认删除对话框
   */
  async confirmDelete(): Promise<void> {
    const confirmButton = this.page.locator('div[role="dialog"] button:has-text("确定"), div[role="dialog"] button:has-text("确认")');
    await confirmButton.click();
  }

  /**
   * 取消删除对话框
   */
  async cancelDelete(): Promise<void> {
    const cancelButton = this.page.locator('div[role="dialog"] button:has-text("取消")');
    await cancelButton.click();
  }

  /**
   * 展开/收起树节点
   */
  async toggleTreeNode(nodeName: string): Promise<void> {
    const expandButton = this.page.locator(`[class*="tree"] [role="button"]:has-text("${nodeName}")`).first()
      .locator('button svg[data-lucide="chevron-down"], button svg[data-lucide="chevron-right"]');
    await expandButton.click();
  }

  /**
   * 验证节点是否选中
   */
  async isNodeSelected(nodeName: string): Promise<boolean> {
    const node = this.page.locator(`[class*="tree"] [role="button"]:has-text("${nodeName}")`).first();
    const className = await node.getAttribute('class') || '';
    return className.includes('selected') || className.includes('active');
  }

  /**
   * 验证是否在组织架构页面
   */
  async isOnOrganizationPage(): Promise<boolean> {
    const currentUrl = this.getCurrentURL();
    return currentUrl.includes('/settings') || currentUrl.includes('/organization');
  }

  /**
   * 获取统计信息
   */
  async getStats(): Promise<{
    departments: number;
    techGroups: number;
    members: number;
  }> {
    const deptText = await this.statsDepartments.textContent() || '部门: 0';
    const techText = await this.statsTechGroups.textContent() || '技术组: 0';
    const memberText = await this.statsMembers.textContent() || '成员: 0';

    const extractNumber = (text: string): number => {
      const match = text.match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    };

    return {
      departments: extractNumber(deptText),
      techGroups: extractNumber(techText),
      members: extractNumber(memberText)
    };
  }

  /**
   * 检查操作按钮是否可见（用于权限测试）
   */
  async areActionButtonsVisible(): Promise<boolean> {
    const editVisible = await this.editButton.count() > 0;
    const deleteVisible = await this.deleteButton.count() > 0;
    return editVisible || deleteVisible;
  }

  /**
   * 等待组织架构加载
   */
  async waitForOrganizationLoad(): Promise<void> {
    await this.waitForElementVisible('[class*="tree"], [class*="organization"]', 15000);
  }

  /**
   * 创建部门（完整流程）
   */
  async createDepartment(data: {
    name: string;
    managerEmployeeId: string;
    managerName: string;
    description?: string;
  }): Promise<void> {
    await this.clickAddSubDepartment();
    await this.waitForDialog('department');
    await this.fillDepartmentForm(data);
    await this.clickFormSubmit('添加');
    await this.waitForDialogClosed();
    await this.wait(1000);
  }

  /**
   * 创建技术组（完整流程）
   */
  async createTechGroup(data: {
    name: string;
    leaderEmployeeId: string;
    leaderName: string;
    description?: string;
  }): Promise<void> {
    await this.clickAddTechGroup();
    await this.waitForDialog('tech-group');
    await this.fillTechGroupForm(data);
    await this.clickFormSubmit('添加');
    await this.waitForDialogClosed();
    await this.wait(1000);
  }

  /**
   * 创建成员（完整流程）
   */
  async createMember(data: {
    name: string;
    employeeId: string;
    role?: string;
    email?: string;
  }): Promise<void> {
    await this.clickAddMember();
    await this.waitForDialog('member');
    await this.fillMemberForm(data);
    await this.clickFormSubmit('添加');
    await this.waitForDialogClosed();
    await this.wait(1000);
  }

  /**
   * 验证树节点是否存在
   */
  async nodeExists(nodeName: string): Promise<boolean> {
    const node = this.page.locator(`[class*="tree"] [role="button"]:has-text("${nodeName}")`);
    return await node.count() > 0;
  }

  /**
   * 获取所有错误消息
   */
  async getErrorMessages(): Promise<string[]> {
    const errors = this.page.locator('div[role="alert"], [class*="error"], [class*="alert"]');
    const count = await errors.count();
    const messages: string[] = [];

    for (let i = 0; i < count; i++) {
      const error = errors.nth(i);
      const text = await error.textContent();
      if (text && text.trim().length > 0) {
        messages.push(text.trim());
      }
    }

    return messages;
  }

  /**
   * 等待成功提示
   */
  async waitForSuccessMessage(): Promise<void> {
    await this.waitForElementVisible('div[role="alert"]:has-text("成功"), [class*="success"]', 5000);
  }

  /**
   * 刷新组织架构数据
   */
  async refreshData(): Promise<void> {
    await this.reload();
    await this.waitForOrganizationLoad();
  }
}
