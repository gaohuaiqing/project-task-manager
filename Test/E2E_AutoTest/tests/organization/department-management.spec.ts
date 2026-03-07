/**
 * 部门管理 E2E 测试
 *
 * 测试部门的创建、编辑、删除功能
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { OrganizationPage } from '../../src/pages/OrganizationPage';
import { TEST_USERS } from '../../src/data/test-users';
import { TEST_DEPARTMENTS } from '../../src/data/test-organization';

test.describe('部门管理测试', () => {
  let loginPage: LoginPage;
  let organizationPage: OrganizationPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    organizationPage = new OrganizationPage(page);

    // 登录为管理员
    await page.goto('/');
    await loginPage.login(TEST_USERS.admin.username, TEST_USERS.admin.password);

    // 清理测试数据
    await page.evaluate(() => {
      localStorage.removeItem('org_structure');
      localStorage.removeItem('capability_models');
    });

    // 导航到组织架构页面
    await organizationPage.navigateToOrganizationSettings();
    await organizationPage.waitForReady();
  });

  test.afterEach(async ({ page }) => {
    // 清理测试数据
    await page.evaluate(() => {
      localStorage.removeItem('org_structure');
      localStorage.removeItem('capability_models');
    });
  });

  test('应该能够创建第一个部门（初始状态）', async ({ page }) => {
    // 验证处于初始状态
    const isInitial = await organizationPage.isInitialState();
    expect(isInitial).toBeTruthy();

    // 点击新建组织架构
    await organizationPage.clickCreateOrganization();
    await organizationPage.waitForDialog('create');

    // 填写部门信息
    const deptData = TEST_DEPARTMENTS[0];
    await organizationPage.fillDepartmentForm(deptData);

    // 提交表单
    await organizationPage.clickFormSubmit('创建组织');

    // 等待对话框关闭
    await organizationPage.waitForDialogClosed();

    // 验证部门创建成功
    await organizationPage.waitForOrganizationLoad();
    const hasDept = await organizationPage.nodeExists(deptData.name);
    expect(hasDept).toBeTruthy();

    // 验证统计信息更新
    const stats = await organizationPage.getStats();
    expect(stats.departments).toBe(1);
    expect(stats.members).toBe(1); // 部门经理自动创建为成员
  });

  test('应该能够添加子部门', async ({ page }) => {
    // 先创建一个父部门
    await page.evaluate(async (deptData) => {
      // 创建基础组织架构
      const org = {
        version: 1,
        lastUpdated: Date.now(),
        lastUpdatedBy: 'test',
        departments: [{
          id: 'dept_parent_001',
          name: deptData.name,
          level: 'department' as const,
          parentId: null,
          managerName: deptData.managerName,
          description: deptData.description,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          children: [{
            id: 'member_manager_001',
            employeeId: deptData.managerEmployeeId,
            name: deptData.managerName,
            level: 'member' as const,
            parentId: 'dept_parent_001',
            role: 'dept_manager' as const,
            createdAt: Date.now(),
            updatedAt: Date.now()
          }]
        }]
      };

      // 创建用户账号
      const users = JSON.parse(localStorage.getItem('app_users') || '{}');
      users[deptData.managerEmployeeId] = {
        password: 'test123',
        role: 'dept_manager',
        name: deptData.managerName
      };
      localStorage.setItem('app_users', JSON.stringify(users));
      localStorage.setItem('org_structure', JSON.stringify(org));
    }, TEST_DEPARTMENTS[0]);

    // 刷新页面
    await organizationPage.refreshData();
    await organizationPage.waitForOrganizationLoad();

    // 选择父部门
    await organizationPage.selectTreeNode(TEST_DEPARTMENTS[0].name);

    // 点击添加子部门
    await organizationPage.clickAddSubDepartment();
    await organizationPage.waitForDialog('department');

    // 填写子部门信息
    const subDeptData = TEST_DEPARTMENTS[1];
    await organizationPage.fillDepartmentForm(subDeptData);

    // 提交表单
    await organizationPage.clickFormSubmit('添加');

    // 等待对话框关闭
    await organizationPage.waitForDialogClosed();

    // 验证子部门创建成功
    await page.waitForTimeout(1000);
    const hasSubDept = await organizationPage.nodeExists(subDeptData.name);
    expect(hasSubDept).toBeTruthy();

    // 验证统计信息更新
    const stats = await organizationPage.getStats();
    expect(stats.departments).toBe(2);
  });

  test('应该能够编辑部门信息', async ({ page }) => {
    // 创建测试部门
    await page.evaluate(async (deptData) => {
      const org = {
        version: 1,
        lastUpdated: Date.now(),
        lastUpdatedBy: 'test',
        departments: [{
          id: 'dept_test_001',
          name: deptData.name,
          level: 'department' as const,
          parentId: null,
          managerName: deptData.managerName,
          description: deptData.description,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          children: [{
            id: 'member_manager_001',
            employeeId: deptData.managerEmployeeId,
            name: deptData.managerName,
            level: 'member' as const,
            parentId: 'dept_test_001',
            role: 'dept_manager' as const,
            createdAt: Date.now(),
            updatedAt: Date.now()
          }]
        }]
      };

      const users = JSON.parse(localStorage.getItem('app_users') || '{}');
      users[deptData.managerEmployeeId] = {
        password: 'test123',
        role: 'dept_manager',
        name: deptData.managerName
      };
      localStorage.setItem('app_users', JSON.stringify(users));
      localStorage.setItem('org_structure', JSON.stringify(org));
    }, TEST_DEPARTMENTS[0]);

    await organizationPage.refreshData();
    await organizationPage.waitForOrganizationLoad();

    // 选择部门
    await organizationPage.selectTreeNode(TEST_DEPARTMENTS[0].name);

    // 点击编辑按钮
    await organizationPage.clickEdit();

    // 等待编辑模式
    await page.waitForTimeout(500);

    // 修改部门名称
    const newName = '研发一部（已更新）';
    await organizationPage.typeText('input[value*="研发一部"]', newName);

    // 保存修改
    await organizationPage.clickElement('button:has-text("保存")');
    await page.waitForTimeout(1000);

    // 验证修改成功
    const hasUpdated = await organizationPage.nodeExists(newName);
    expect(hasUpdated).toBeTruthy();
  });

  test('应该能够删除部门', async ({ page }) => {
    // 创建测试部门
    await page.evaluate(async (deptData) => {
      const org = {
        version: 1,
        lastUpdated: Date.now(),
        lastUpdatedBy: 'test',
        departments: [{
          id: 'dept_test_001',
          name: deptData.name,
          level: 'department' as const,
          parentId: null,
          managerName: deptData.managerName,
          description: deptData.description,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          children: [{
            id: 'member_manager_001',
            employeeId: deptData.managerEmployeeId,
            name: deptData.managerName,
            level: 'member' as const,
            parentId: 'dept_test_001',
            role: 'dept_manager' as const,
            createdAt: Date.now(),
            updatedAt: Date.now()
          }]
        }]
      };

      const users = JSON.parse(localStorage.getItem('app_users') || '{}');
      users[deptData.managerEmployeeId] = {
        password: 'test123',
        role: 'dept_manager',
        name: deptData.managerName
      };
      localStorage.setItem('app_users', JSON.stringify(users));
      localStorage.setItem('org_structure', JSON.stringify(org));
    }, TEST_DEPARTMENTS[0]);

    await organizationPage.refreshData();
    await organizationPage.waitForOrganizationLoad();

    // 选择部门
    await organizationPage.selectTreeNode(TEST_DEPARTMENTS[0].name);

    // 点击删除按钮
    await organizationPage.clickDelete();

    // 确认删除
    await organizationPage.confirmDelete();
    await page.waitForTimeout(1000);

    // 验证删除成功
    const hasDept = await organizationPage.nodeExists(TEST_DEPARTMENTS[0].name);
    expect(hasDept).toBeFalsy();
  });

  test('应该验证部门名称必填', async ({ page }) => {
    // 创建父部门
    await page.evaluate(async (deptData) => {
      const org = {
        version: 1,
        lastUpdated: Date.now(),
        lastUpdatedBy: 'test',
        departments: [{
          id: 'dept_parent_001',
          name: deptData.name,
          level: 'department' as const,
          parentId: null,
          managerName: deptData.managerName,
          description: deptData.description,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          children: [{
            id: 'member_manager_001',
            employeeId: deptData.managerEmployeeId,
            name: deptData.managerName,
            level: 'member' as const,
            parentId: 'dept_parent_001',
            role: 'dept_manager' as const,
            createdAt: Date.now(),
            updatedAt: Date.now()
          }]
        }]
      };

      const users = JSON.parse(localStorage.getItem('app_users') || '{}');
      users[deptData.managerEmployeeId] = {
        password: 'test123',
        role: 'dept_manager',
        name: deptData.managerName
      };
      localStorage.setItem('app_users', JSON.stringify(users));
      localStorage.setItem('org_structure', JSON.stringify(org));
    }, TEST_DEPARTMENTS[0]);

    await organizationPage.refreshData();
    await organizationPage.waitForOrganizationLoad();

    // 选择父部门
    await organizationPage.selectTreeNode(TEST_DEPARTMENTS[0].name);

    // 点击添加子部门
    await organizationPage.clickAddSubDepartment();
    await organizationPage.waitForDialog('department');

    // 不填写名称直接提交
    await organizationPage.clickFormSubmit('添加');

    // 验证错误提示
    const errors = await organizationPage.getErrorMessages();
    const hasError = errors.some(msg => msg.includes('名称') || msg.includes('必填'));
    expect(hasError).toBeTruthy();
  });

  test('应该验证工号唯一性', async ({ page }) => {
    // 创建已有部门
    const existingDept = TEST_DEPARTMENTS[0];
    await page.evaluate(async (deptData) => {
      const org = {
        version: 1,
        lastUpdated: Date.now(),
        lastUpdatedBy: 'test',
        departments: [{
          id: 'dept_parent_001',
          name: deptData.name,
          level: 'department' as const,
          parentId: null,
          managerName: deptData.managerName,
          description: deptData.description,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          children: [{
            id: 'member_manager_001',
            employeeId: deptData.managerEmployeeId,
            name: deptData.managerName,
            level: 'member' as const,
            parentId: 'dept_parent_001',
            role: 'dept_manager' as const,
            createdAt: Date.now(),
            updatedAt: Date.now()
          }]
        }]
      };

      const users = JSON.parse(localStorage.getItem('app_users') || '{}');
      users[deptData.managerEmployeeId] = {
        password: 'test123',
        role: 'dept_manager',
        name: deptData.managerName
      };
      localStorage.setItem('app_users', JSON.stringify(users));
      localStorage.setItem('org_structure', JSON.stringify(org));
    }, existingDept);

    await organizationPage.refreshData();
    await organizationPage.waitForOrganizationLoad();

    // 选择部门
    await organizationPage.selectTreeNode(existingDept.name);

    // 尝试添加使用相同工号的子部门
    await organizationPage.clickAddSubDepartment();
    await organizationPage.waitForDialog('department');

    // 填写相同工号
    await organizationPage.fillDepartmentForm({
      name: '新部门',
      managerEmployeeId: existingDept.managerEmployeeId, // 相同工号
      managerName: '新经理'
    });

    // 提交表单
    await organizationPage.clickFormSubmit('添加');

    // 验证错误提示
    await page.waitForTimeout(500);
    const errors = await organizationPage.getErrorMessages();
    const hasError = errors.some(msg => msg.includes('工号') || msg.includes('已存在'));
    expect(hasError).toBeTruthy();
  });

  test('应该能够取消部门创建', async ({ page }) => {
    // 创建父部门
    await page.evaluate(async (deptData) => {
      const org = {
        version: 1,
        lastUpdated: Date.now(),
        lastUpdatedBy: 'test',
        departments: [{
          id: 'dept_parent_001',
          name: deptData.name,
          level: 'department' as const,
          parentId: null,
          managerName: deptData.managerName,
          description: deptData.description,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          children: [{
            id: 'member_manager_001',
            employeeId: deptData.managerEmployeeId,
            name: deptData.managerName,
            level: 'member' as const,
            parentId: 'dept_parent_001',
            role: 'dept_manager' as const,
            createdAt: Date.now(),
            updatedAt: Date.now()
          }]
        }]
      };

      const users = JSON.parse(localStorage.getItem('app_users') || '{}');
      users[deptData.managerEmployeeId] = {
        password: 'test123',
        role: 'dept_manager',
        name: deptData.managerName
      };
      localStorage.setItem('app_users', JSON.stringify(users));
      localStorage.setItem('org_structure', JSON.stringify(org));
    }, TEST_DEPARTMENTS[0]);

    await organizationPage.refreshData();
    await organizationPage.waitForOrganizationLoad();

    // 选择部门
    await organizationPage.selectTreeNode(TEST_DEPARTMENTS[0].name);

    // 点击添加子部门
    await organizationPage.clickAddSubDepartment();
    await organizationPage.waitForDialog('department');

    // 填写表单
    await organizationPage.fillDepartmentForm(TEST_DEPARTMENTS[1]);

    // 点击取消
    await organizationPage.clickFormCancel();
    await organizationPage.waitForDialogClosed();

    // 验证部门未创建
    const hasDept = await organizationPage.nodeExists(TEST_DEPARTMENTS[1].name);
    expect(hasDept).toBeFalsy();
  });

  test('应该显示部门的统计信息', async ({ page }) => {
    // 创建包含技术组的部门
    await page.evaluate(async (deptData) => {
      const org = {
        version: 1,
        lastUpdated: Date.now(),
        lastUpdatedBy: 'test',
        departments: [{
          id: 'dept_test_001',
          name: deptData.name,
          level: 'department' as const,
          parentId: null,
          managerName: deptData.managerName,
          description: deptData.description,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          children: [
            {
              id: 'member_manager_001',
              employeeId: deptData.managerEmployeeId,
              name: deptData.managerName,
              level: 'member' as const,
              parentId: 'dept_test_001',
              role: 'dept_manager' as const,
              createdAt: Date.now(),
              updatedAt: Date.now()
            },
            {
              id: 'tech_group_001',
              name: '前端组',
              level: 'tech_group' as const,
              parentId: 'dept_test_001',
              description: '前端开发组',
              memberIds: [],
              createdAt: Date.now(),
              updatedAt: Date.now(),
              children: []
            }
          ]
        }]
      };

      const users = JSON.parse(localStorage.getItem('app_users') || '{}');
      users[deptData.managerEmployeeId] = {
        password: 'test123',
        role: 'dept_manager',
        name: deptData.managerName
      };
      localStorage.setItem('app_users', JSON.stringify(users));
      localStorage.setItem('org_structure', JSON.stringify(org));
    }, TEST_DEPARTMENTS[0]);

    await organizationPage.refreshData();
    await organizationPage.waitForOrganizationLoad();

    // 选择部门
    await organizationPage.selectTreeNode(TEST_DEPARTMENTS[0].name);

    // 验证详情面板显示统计信息
    const detailText = await organizationPage.detailPanel.textContent();
    expect(detailText).toContain('技术组');
    expect(detailText).toContain('成员');
  });
});
