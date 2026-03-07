/**
 * 技术组管理 E2E 测试
 *
 * 测试技术组的创建、编辑、删除功能
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { OrganizationPage } from '../../src/pages/OrganizationPage';
import { TEST_USERS } from '../../src/data/test-users';
import { TEST_DEPARTMENTS, TEST_TECH_GROUPS } from '../../src/data/test-organization';

test.describe('技术组管理测试', () => {
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

    // 创建测试部门
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

  test('应该能够创建技术组', async ({ page }) => {
    await organizationPage.waitForOrganizationLoad();

    // 选择部门
    await organizationPage.selectTreeNode(TEST_DEPARTMENTS[0].name);

    // 点击添加技术组
    await organizationPage.clickAddTechGroup();
    await organizationPage.waitForDialog('tech-group');

    // 填写技术组信息
    const groupData = TEST_TECH_GROUPS[0];
    await organizationPage.fillTechGroupForm(groupData);

    // 提交表单
    await organizationPage.clickFormSubmit('添加');

    // 等待对话框关闭
    await organizationPage.waitForDialogClosed();

    // 验证技术组创建成功
    await page.waitForTimeout(1000);
    const hasGroup = await organizationPage.nodeExists(groupData.name);
    expect(hasGroup).toBeTruthy();

    // 验证统计信息更新
    const stats = await organizationPage.getStats();
    expect(stats.techGroups).toBe(1);
    expect(stats.members).toBe(2); // 部门经理 + 技术经理
  });

  test('应该能够编辑技术组信息', async ({ page }) => {
    // 先创建技术组
    await page.evaluate(async (data) => {
      const org = JSON.parse(localStorage.getItem('org_structure') || '{}');
      const dept = org.departments[0];

      dept.children.push({
        id: 'tech_group_001',
        name: data.groupData.name,
        level: 'tech_group' as const,
        parentId: dept.id,
        leaderName: data.groupData.leaderName,
        description: data.groupData.description,
        memberIds: ['member_leader_001'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        children: [{
          id: 'member_leader_001',
          employeeId: data.groupData.leaderEmployeeId,
          name: data.groupData.leaderName,
          level: 'member' as const,
          parentId: 'tech_group_001',
          role: 'tech_manager' as const,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }]
      });

      const users = JSON.parse(localStorage.getItem('app_users') || '{}');
      users[data.groupData.leaderEmployeeId] = {
        password: 'test123',
        role: 'tech_manager',
        name: data.groupData.leaderName
      };
      localStorage.setItem('app_users', JSON.stringify(users));
      localStorage.setItem('org_structure', JSON.stringify(org));
    }, { groupData: TEST_TECH_GROUPS[0] });

    await organizationPage.refreshData();
    await organizationPage.waitForOrganizationLoad();

    // 选择技术组
    await organizationPage.selectTreeNode(TEST_TECH_GROUPS[0].name);

    // 点击编辑按钮
    await organizationPage.clickEdit();

    // 等待编辑模式
    await page.waitForTimeout(500);

    // 修改技术组名称
    const newName = '前端组（已更新）';
    await organizationPage.typeText('input[value*="前端组"]', newName);

    // 保存修改
    await organizationPage.clickElement('button:has-text("保存")');
    await page.waitForTimeout(1000);

    // 验证修改成功
    const hasUpdated = await organizationPage.nodeExists(newName);
    expect(hasUpdated).toBeTruthy();
  });

  test('应该能够删除技术组', async ({ page }) => {
    // 先创建技术组
    await page.evaluate(async (data) => {
      const org = JSON.parse(localStorage.getItem('org_structure') || '{}');
      const dept = org.departments[0];

      dept.children.push({
        id: 'tech_group_001',
        name: data.groupData.name,
        level: 'tech_group' as const,
        parentId: dept.id,
        leaderName: data.groupData.leaderName,
        description: data.groupData.description,
        memberIds: ['member_leader_001'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        children: [{
          id: 'member_leader_001',
          employeeId: data.groupData.leaderEmployeeId,
          name: data.groupData.leaderName,
          level: 'member' as const,
          parentId: 'tech_group_001',
          role: 'tech_manager' as const,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }]
      });

      const users = JSON.parse(localStorage.getItem('app_users') || '{}');
      users[data.groupData.leaderEmployeeId] = {
        password: 'test123',
        role: 'tech_manager',
        name: data.groupData.leaderName
      };
      localStorage.setItem('app_users', JSON.stringify(users));
      localStorage.setItem('org_structure', JSON.stringify(org));
    }, { groupData: TEST_TECH_GROUPS[0] });

    await organizationPage.refreshData();
    await organizationPage.waitForOrganizationLoad();

    // 选择技术组
    await organizationPage.selectTreeNode(TEST_TECH_GROUPS[0].name);

    // 点击删除按钮
    await organizationPage.clickDelete();

    // 确认删除
    await organizationPage.confirmDelete();
    await page.waitForTimeout(1000);

    // 验证删除成功
    const hasGroup = await organizationPage.nodeExists(TEST_TECH_GROUPS[0].name);
    expect(hasGroup).toBeFalsy();
  });

  test('应该验证技术组名称必填', async ({ page }) => {
    await organizationPage.waitForOrganizationLoad();

    // 选择部门
    await organizationPage.selectTreeNode(TEST_DEPARTMENTS[0].name);

    // 点击添加技术组
    await organizationPage.clickAddTechGroup();
    await organizationPage.waitForDialog('tech-group');

    // 不填写名称直接提交
    await organizationPage.clickFormSubmit('添加');

    // 验证错误提示
    const errors = await organizationPage.getErrorMessages();
    const hasError = errors.some(msg => msg.includes('名称') || msg.includes('必填'));
    expect(hasError).toBeTruthy();
  });

  test('应该验证技术经理工号必填', async ({ page }) => {
    await organizationPage.waitForOrganizationLoad();

    // 选择部门
    await organizationPage.selectTreeNode(TEST_DEPARTMENTS[0].name);

    // 点击添加技术组
    await organizationPage.clickAddTechGroup();
    await organizationPage.waitForDialog('tech-group');

    // 只填写名称，不填写工号
    await organizationPage.typeText('input[placeholder*="技术组名称"]', TEST_TECH_GROUPS[0].name);
    await organizationPage.clickFormSubmit('添加');

    // 验证错误提示
    const errors = await organizationPage.getErrorMessages();
    const hasError = errors.some(msg => msg.includes('工号') || msg.includes('必填'));
    expect(hasError).toBeTruthy();
  });

  test('应该能够为部门创建多个技术组', async ({ page }) => {
    await organizationPage.waitForOrganizationLoad();

    // 选择部门
    await organizationPage.selectTreeNode(TEST_DEPARTMENTS[0].name);

    // 创建第一个技术组
    await organizationPage.clickAddTechGroup();
    await organizationPage.waitForDialog('tech-group');
    await organizationPage.fillTechGroupForm(TEST_TECH_GROUPS[0]);
    await organizationPage.clickFormSubmit('添加');
    await organizationPage.waitForDialogClosed();
    await page.waitForTimeout(1000);

    // 创建第二个技术组
    await organizationPage.selectTreeNode(TEST_DEPARTMENTS[0].name);
    await organizationPage.clickAddTechGroup();
    await organizationPage.waitForDialog('tech-group');
    await organizationPage.fillTechGroupForm(TEST_TECH_GROUPS[1]);
    await organizationPage.clickFormSubmit('添加');
    await organizationPage.waitForDialogClosed();
    await page.waitForTimeout(1000);

    // 验证两个技术组都创建成功
    const hasGroup1 = await organizationPage.nodeExists(TEST_TECH_GROUPS[0].name);
    const hasGroup2 = await organizationPage.nodeExists(TEST_TECH_GROUPS[1].name);
    expect(hasGroup1).toBeTruthy();
    expect(hasGroup2).toBeTruthy();

    // 验证统计信息
    const stats = await organizationPage.getStats();
    expect(stats.techGroups).toBe(2);
  });

  test('应该能够展开技术组查看成员', async ({ page }) => {
    // 创建包含成员的技术组
    await page.evaluate(async (data) => {
      const org = JSON.parse(localStorage.getItem('org_structure') || '{}');
      const dept = org.departments[0];

      dept.children.push({
        id: 'tech_group_001',
        name: data.groupData.name,
        level: 'tech_group' as const,
        parentId: dept.id,
        leaderName: data.groupData.leaderName,
        description: data.groupData.description,
        memberIds: ['member_leader_001', 'member_001'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        children: [
          {
            id: 'member_leader_001',
            employeeId: data.groupData.leaderEmployeeId,
            name: data.groupData.leaderName,
            level: 'member' as const,
            parentId: 'tech_group_001',
            role: 'tech_manager' as const,
            createdAt: Date.now(),
            updatedAt: Date.now()
          },
          {
            id: 'member_001',
            employeeId: 'E100',
            name: '测试工程师',
            level: 'member' as const,
            parentId: 'tech_group_001',
            role: 'engineer' as const,
            createdAt: Date.now(),
            updatedAt: Date.now()
          }
        ]
      });

      const users = JSON.parse(localStorage.getItem('app_users') || '{}');
      users[data.groupData.leaderEmployeeId] = {
        password: 'test123',
        role: 'tech_manager',
        name: data.groupData.leaderName
      };
      users['E100'] = {
        password: 'test123',
        role: 'engineer',
        name: '测试工程师'
      };
      localStorage.setItem('app_users', JSON.stringify(users));
      localStorage.setItem('org_structure', JSON.stringify(org));
    }, { groupData: TEST_TECH_GROUPS[0] });

    await organizationPage.refreshData();
    await organizationPage.waitForOrganizationLoad();

    // 展开部门节点
    await organizationPage.toggleTreeNode(TEST_DEPARTMENTS[0].name);
    await page.waitForTimeout(500);

    // 展开技术组节点
    await organizationPage.toggleTreeNode(TEST_TECH_GROUPS[0].name);
    await page.waitForTimeout(500);

    // 验证成员可见
    const hasMember = await organizationPage.nodeExists('测试工程师');
    expect(hasMember).toBeTruthy();
  });

  test('应该显示技术组的成员列表', async ({ page }) => {
    // 创建包含成员的技术组
    await page.evaluate(async (data) => {
      const org = JSON.parse(localStorage.getItem('org_structure') || '{}');
      const dept = org.departments[0];

      dept.children.push({
        id: 'tech_group_001',
        name: data.groupData.name,
        level: 'tech_group' as const,
        parentId: dept.id,
        leaderName: data.groupData.leaderName,
        description: data.groupData.description,
        memberIds: ['member_leader_001', 'member_001'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        children: [
          {
            id: 'member_leader_001',
            employeeId: data.groupData.leaderEmployeeId,
            name: data.groupData.leaderName,
            level: 'member' as const,
            parentId: 'tech_group_001',
            role: 'tech_manager' as const,
            createdAt: Date.now(),
            updatedAt: Date.now()
          },
          {
            id: 'member_001',
            employeeId: 'E100',
            name: '测试工程师',
            level: 'member' as const,
            parentId: 'tech_group_001',
            role: 'engineer' as const,
            createdAt: Date.now(),
            updatedAt: Date.now()
          }
        ]
      });

      const users = JSON.parse(localStorage.getItem('app_users') || '{}');
      users[data.groupData.leaderEmployeeId] = {
        password: 'test123',
        role: 'tech_manager',
        name: data.groupData.leaderName
      };
      users['E100'] = {
        password: 'test123',
        role: 'engineer',
        name: '测试工程师'
      };
      localStorage.setItem('app_users', JSON.stringify(users));
      localStorage.setItem('org_structure', JSON.stringify(org));
    }, { groupData: TEST_TECH_GROUPS[0] });

    await organizationPage.refreshData();
    await organizationPage.waitForOrganizationLoad();

    // 选择技术组
    await organizationPage.selectTreeNode(TEST_TECH_GROUPS[0].name);

    // 验证详情面板显示成员列表
    const detailText = await organizationPage.detailPanel.textContent();
    expect(detailText).toContain('成员列表');
  });
});
