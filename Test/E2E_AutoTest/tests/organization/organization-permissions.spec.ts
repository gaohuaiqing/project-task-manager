/**
 * 组织架构权限控制 E2E 测试
 *
 * 测试不同角色对组织架构的访问和操作权限
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { OrganizationPage } from '../../src/pages/OrganizationPage';
import { Sidebar } from '../../src/components/Sidebar';
import { TEST_USERS } from '../../src/data/test-users';
import { TEST_ORGANIZATION, TEST_DEPARTMENTS } from '../../src/data/test-organization';

test.describe('组织架构权限控制测试', () => {
  let loginPage: LoginPage;
  let organizationPage: OrganizationPage;
  let sidebar: Sidebar;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    organizationPage = new OrganizationPage(page);
    sidebar = new Sidebar(page);
  });

  test.afterEach(async ({ page }) => {
    // 清理测试数据
    await page.evaluate(() => {
      localStorage.removeItem('org_structure');
      localStorage.removeItem('capability_models');
    });
  });

  test.describe('管理员权限', () => {
    test.beforeEach(async ({ page }) => {
      // 登录为管理员
      await page.goto('/');
      await loginPage.login(TEST_USERS.admin.username, TEST_USERS.admin.password);

      // 清理并设置测试数据
      await page.evaluate(() => {
        localStorage.removeItem('org_structure');
        localStorage.removeItem('capability_models');
      });

      // 设置测试组织架构
      await page.evaluate((org) => {
        localStorage.setItem('org_structure', JSON.stringify(org));
      }, TEST_ORGANIZATION);

      // 导航到组织架构页面
      await organizationPage.navigateToOrganizationSettings();
      await organizationPage.waitForReady();
    });

    test('管理员应该能够查看组织架构', async ({ page }) => {
      await organizationPage.waitForOrganizationLoad();

      // 验证组织架构树显示
      const treeExists = await organizationPage.hasElement('[class*="tree"]');
      expect(treeExists).toBeTruthy();

      // 验证统计信息显示
      const stats = await organizationPage.getStats();
      expect(stats.departments).toBeGreaterThan(0);
    });

    test('管理员应该能够添加部门', async ({ page }) => {
      await organizationPage.waitForOrganizationLoad();

      // 选择部门节点
      await organizationPage.selectTreeNode('研发一部');

      // 验证添加子部门按钮可见
      const hasAddButton = await organizationPage.addSubDepartmentButton.count() > 0;
      expect(hasAddButton).toBeTruthy();
    });

    test('管理员应该能够编辑组织架构', async ({ page }) => {
      await organizationPage.waitForOrganizationLoad();

      // 选择节点
      await organizationPage.selectTreeNode('研发一部');

      // 验证编辑按钮可见
      const hasEditButton = await organizationPage.editButton.count() > 0;
      expect(hasEditButton).toBeTruthy();
    });

    test('管理员应该能够删除组织架构', async ({ page }) => {
      await organizationPage.waitForOrganizationLoad();

      // 验证删除组织按钮可见
      const hasDeleteButton = await organizationPage.deleteOrganizationButton.count() > 0;
      expect(hasDeleteButton).toBeTruthy();
    });

    test('管理员应该能够导入导出组织架构', async ({ page }) => {
      await organizationPage.waitForOrganizationLoad();

      // 验证导入导出按钮可见
      const hasImportButton = await organizationPage.importButton.count() > 0;
      const hasExportButton = await organizationPage.exportButton.count() > 0;
      expect(hasImportButton).toBeTruthy();
      expect(hasExportButton).toBeTruthy();
    });

    test('管理员应该能够访问能力模型设置', async ({ page }) => {
      await organizationPage.waitForOrganizationLoad();

      // 验证能力模型设置按钮可见
      const hasCapabilityButton = await organizationPage.capabilitySettingsButton.count() > 0;
      expect(hasCapabilityButton).toBeTruthy();
    });

    test('管理员应该能够重置成员密码', async ({ page }) => {
      await organizationPage.waitForOrganizationLoad();

      // 选择成员节点
      await organizationPage.selectTreeNode('王小明');

      // 验证重置密码按钮可见
      const resetPasswordButton = page.locator('button[title*="重置密码"], svg[data-lucide="key-round"]');
      const hasResetButton = await resetPasswordButton.count() > 0;
      expect(hasResetButton).toBeTruthy();
    });
  });

  test.describe('部门经理权限', () => {
    test.beforeEach(async ({ page }) => {
      // 登录为部门经理
      await page.goto('/');
      await loginPage.login(TEST_USERS.dept_manager.username, TEST_USERS.dept_manager.password);

      // 设置测试组织架构
      await page.evaluate((org) => {
        localStorage.setItem('org_structure', JSON.stringify(org));
      }, TEST_ORGANIZATION);

      // 导航到组织架构页面
      await organizationPage.navigateToOrganizationSettings();
      await organizationPage.waitForReady();
    });

    test('部门经理应该能够查看组织架构', async ({ page }) => {
      await organizationPage.waitForOrganizationLoad();

      // 验证组织架构树显示
      const treeExists = await organizationPage.hasElement('[class*="tree"]');
      expect(treeExists).toBeTruthy();
    });

    test('部门经理应该能够添加技术组', async ({ page }) => {
      await organizationPage.waitForOrganizationLoad();

      // 选择部门节点
      await organizationPage.selectTreeNode('研发一部');

      // 验证添加技术组按钮可见
      const hasAddButton = await organizationPage.addTechGroupButton.count() > 0;
      expect(hasAddButton).toBeTruthy();
    });

    test('部门经理应该能够添加成员', async ({ page }) => {
      await organizationPage.waitForOrganizationLoad();

      // 选择技术组节点
      await organizationPage.selectTreeNode('前端组');

      // 验证添加成员按钮可见
      const hasAddButton = await organizationPage.addMemberButton.count() > 0;
      expect(hasAddButton).toBeTruthy();
    });

    test('部门经理应该能够编辑成员信息', async ({ page }) => {
      await organizationPage.waitForOrganizationLoad();

      // 选择成员节点
      await organizationPage.selectTreeNode('王小明');

      // 验证编辑按钮可见
      const hasEditButton = await organizationPage.editButton.count() > 0;
      expect(hasEditButton).toBeTruthy();
    });

    test('部门经理应该能够编辑能力模型', async ({ page }) => {
      await organizationPage.waitForOrganizationLoad();

      // 选择成员节点
      await organizationPage.selectTreeNode('王小明');

      // 点击编辑
      await organizationPage.clickEdit();
      await page.waitForTimeout(500);

      // 验证能力模型编辑区域可见
      const hasCapability = await organizationPage.hasElement('text=能力模型');
      expect(hasCapability).toBeTruthy();
    });

    test('部门经理不应该能够删除整个组织', async ({ page }) => {
      await organizationPage.waitForOrganizationLoad();

      // 验证删除组织按钮不可见或禁用
      const hasDeleteButton = await organizationPage.deleteOrganizationButton.count() > 0;
      expect(hasDeleteButton).toBeFalsy();
    });

    test('部门经理应该能够重置成员密码', async ({ page }) => {
      await organizationPage.waitForOrganizationLoad();

      // 选择成员节点
      await organizationPage.selectTreeNode('李小红');

      // 验证重置密码按钮可见
      const resetPasswordButton = page.locator('button[title*="重置密码"], svg[data-lucide="key-round"]');
      const hasResetButton = await resetPasswordButton.count() > 0;
      expect(hasResetButton).toBeTruthy();
    });
  });

  test.describe('技术经理权限', () => {
    test.beforeEach(async ({ page }) => {
      // 登录为技术经理
      await page.goto('/');
      await loginPage.login(TEST_USERS.tech_manager.username, TEST_USERS.tech_manager.password);

      // 设置测试组织架构
      await page.evaluate((org) => {
        localStorage.setItem('org_structure', JSON.stringify(org));
      }, TEST_ORGANIZATION);

      // 导航到组织架构页面
      await organizationPage.navigateToOrganizationSettings();
      await organizationPage.waitForReady();
    });

    test('技术经理应该能够查看组织架构', async ({ page }) => {
      await organizationPage.waitForOrganizationLoad();

      // 验证组织架构树显示
      const treeExists = await organizationPage.hasElement('[class*="tree"]');
      expect(treeExists).toBeTruthy();
    });

    test('技术经理应该能够添加成员', async ({ page }) => {
      await organizationPage.waitForOrganizationLoad();

      // 选择技术组节点
      await organizationPage.selectTreeNode('前端组');

      // 验证添加成员按钮可见
      const hasAddButton = await organizationPage.addMemberButton.count() > 0;
      expect(hasAddButton).toBeTruthy();
    });

    test('技术经理不应该能够添加部门或技术组', async ({ page }) => {
      await organizationPage.waitForOrganizationLoad();

      // 选择部门节点
      await organizationPage.selectTreeNode('研发一部');

      // 验证添加子部门和技术组按钮不可见
      const hasAddDept = await organizationPage.addSubDepartmentButton.count() > 0;
      const hasAddGroup = await organizationPage.addTechGroupButton.count() > 0;
      expect(hasAddDept).toBeFalsy();
      expect(hasAddGroup).toBeFalsy();
    });

    test('技术经理不应该能够编辑能力模型', async ({ page }) => {
      await organizationPage.waitForOrganizationLoad();

      // 选择成员节点
      await organizationPage.selectTreeNode('李小红');

      // 点击编辑
      const editCount = await organizationPage.editButton.count();
      if (editCount > 0) {
        await organizationPage.clickEdit();
        await page.waitForTimeout(500);

        // 验证能力模型编辑区域不可见或只读
        const readonlyHint = await organizationPage.hasElement('text=只读');
        // 如果没有只读提示，验证编辑控件不可用
        const hasEditableCapability = await organizationPage.hasElement('input[type="range"]');
        expect(hasEditableCapability).toBeFalsy();
      }
    });

    test('技术经理不应该能够重置成员密码', async ({ page }) => {
      await organizationPage.waitForOrganizationLoad();

      // 选择成员节点
      await organizationPage.selectTreeNode('李小红');

      // 验证重置密码按钮不可见
      const resetPasswordButton = page.locator('button[title*="重置密码"], svg[data-lucide="key-round"]');
      const hasResetButton = await resetPasswordButton.count() > 0;
      expect(hasResetButton).toBeFalsy();
    });
  });

  test.describe('工程师权限', () => {
    test.beforeEach(async ({ page }) => {
      // 登录为工程师
      await page.goto('/');
      await loginPage.login(TEST_USERS.engineer.username, TEST_USERS.engineer.password);

      // 设置测试组织架构
      await page.evaluate((org) => {
        localStorage.setItem('org_structure', JSON.stringify(org));
      }, TEST_ORGANIZATION);

      // 导航到组织架构页面
      await organizationPage.navigateToOrganizationSettings();
      await organizationPage.waitForReady();
    });

    test('工程师应该能够查看组织架构', async ({ page }) => {
      await organizationPage.waitForOrganizationLoad();

      // 验证组织架构树显示
      const treeExists = await organizationPage.hasElement('[class*="tree"]');
      expect(treeExists).toBeTruthy();
    });

    test('工程师不应该看到操作按钮', async ({ page }) => {
      await organizationPage.waitForOrganizationLoad();

      // 选择任意节点
      await organizationPage.selectTreeNode('研发一部');

      // 验证添加、编辑、删除按钮不可见
      const hasActionButtons = await organizationPage.areActionButtonsVisible();
      expect(hasActionButtons).toBeFalsy();
    });

    test('工程师不应该能够添加节点', async ({ page }) => {
      await organizationPage.waitForOrganizationLoad();

      // 选择部门节点
      await organizationPage.selectTreeNode('研发一部');

      // 验证所有添加按钮不可见
      const hasAddDept = await organizationPage.addSubDepartmentButton.count() > 0;
      const hasAddGroup = await organizationPage.addTechGroupButton.count() > 0;
      const hasAddMember = await organizationPage.addMemberButton.count() > 0;
      expect(hasAddDept).toBeFalsy();
      expect(hasAddGroup).toBeFalsy();
      expect(hasAddMember).toBeFalsy();
    });

    test('工程师不应该能够访问管理功能', async ({ page }) => {
      await organizationPage.waitForOrganizationLoad();

      // 验证管理按钮不可见
      const hasImport = await organizationPage.importButton.count() > 0;
      const hasExport = await organizationPage.exportButton.count() > 0;
      const hasCapability = await organizationPage.capabilitySettingsButton.count() > 0;
      const hasDelete = await organizationPage.deleteOrganizationButton.count() > 0;

      expect(hasImport).toBeFalsy();
      expect(hasExport).toBeFalsy();
      expect(hasCapability).toBeFalsy();
      expect(hasDelete).toBeFalsy();
    });

    test('工程师查看组织架构时应该是只读模式', async ({ page }) => {
      await organizationPage.waitForOrganizationLoad();

      // 选择任意节点
      await organizationPage.selectTreeNode('王小明');

      // 验证详情面板显示，但没有编辑按钮
      const hasDetailPanel = await organizationPage.detailPanel.count() > 0;
      const hasEditButton = await organizationPage.editButton.count() > 0;

      expect(hasDetailPanel).toBeTruthy();
      expect(hasEditButton).toBeFalsy();
    });
  });

  test.describe('菜单访问权限', () => {
    test('管理员应该能看到组织架构菜单', async ({ page }) => {
      await page.goto('/');
      await loginPage.login(TEST_USERS.admin.username, TEST_USERS.admin.password);

      await sidebar.waitForVisible();

      const hasOrgMenu = await sidebar.menuExists('组织架构');
      expect(hasOrgMenu).toBeTruthy();
    });

    test('部门经理应该能看到组织架构菜单', async ({ page }) => {
      await page.goto('/');
      await loginPage.login(TEST_USERS.dept_manager.username, TEST_USERS.dept_manager.password);

      await sidebar.waitForVisible();

      const hasOrgMenu = await sidebar.menuExists('组织架构');
      expect(hasOrgMenu).toBeTruthy();
    });

    test('技术经理应该能看到组织架构菜单', async ({ page }) => {
      await page.goto('/');
      await loginPage.login(TEST_USERS.tech_manager.username, TEST_USERS.tech_manager.password);

      await sidebar.waitForVisible();

      const hasOrgMenu = await sidebar.menuExists('组织架构');
      expect(hasOrgMenu).toBeTruthy();
    });

    test('工程师不应该看到组织架构菜单', async ({ page }) => {
      await page.goto('/');
      await loginPage.login(TEST_USERS.engineer.username, TEST_USERS.engineer.password);

      await sidebar.waitForVisible();

      const hasOrgMenu = await sidebar.menuExists('组织架构');
      expect(hasOrgMenu).toBeFalsy();
    });
  });

  test.describe('跨权限操作测试', () => {
    test('管理员创建部门后部门经理应该能看到', async ({ page }) => {
      // 管理员登录并创建部门
      await page.goto('/');
      await loginPage.login(TEST_USERS.admin.username, TEST_USERS.admin.password);

      await page.evaluate(() => {
        localStorage.removeItem('org_structure');
      });

      await organizationPage.navigateToOrganizationSettings();
      await organizationPage.waitForReady();

      // 创建部门
      await organizationPage.clickCreateOrganization();
      await organizationPage.waitForDialog('create');
      await organizationPage.fillDepartmentForm(TEST_DEPARTMENTS[0]);
      await organizationPage.clickFormSubmit('创建组织');
      await organizationPage.waitForDialogClosed();
      await organizationPage.waitForOrganizationLoad();

      // 登出并切换到部门经理
      await page.goto('/');
      await loginPage.login(TEST_USERS.dept_manager.username, TEST_USERS.dept_manager.password);

      await organizationPage.navigateToOrganizationSettings();
      await organizationPage.waitForOrganizationLoad();

      // 验证部门经理能看到新创建的部门
      const hasDept = await organizationPage.nodeExists(TEST_DEPARTMENTS[0].name);
      expect(hasDept).toBeTruthy();
    });
  });
});
