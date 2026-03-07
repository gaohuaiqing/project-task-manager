/**
 * 成员管理 E2E 测试
 *
 * 测试成员的创建、编辑、删除功能
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { OrganizationPage } from '../../src/pages/OrganizationPage';
import { TEST_USERS } from '../../src/data/test-users';
import { TEST_DEPARTMENTS, TEST_TECH_GROUPS, TEST_MEMBERS } from '../../src/data/test-organization';

test.describe('成员管理测试', () => {
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

    // 创建测试组织架构（部门 + 技术组）
    await page.evaluate(async (data) => {
      const org = {
        version: 1,
        lastUpdated: Date.now(),
        lastUpdatedBy: 'test',
        departments: [{
          id: 'dept_parent_001',
          name: data.deptData.name,
          level: 'department' as const,
          parentId: null,
          managerName: data.deptData.managerName,
          description: data.deptData.description,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          children: [
            {
              id: 'member_manager_001',
              employeeId: data.deptData.managerEmployeeId,
              name: data.deptData.managerName,
              level: 'member' as const,
              parentId: 'dept_parent_001',
              role: 'dept_manager' as const,
              createdAt: Date.now(),
              updatedAt: Date.now()
            },
            {
              id: 'tech_group_001',
              name: data.groupData.name,
              level: 'tech_group' as const,
              parentId: 'dept_parent_001',
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
            }
          ]
        }]
      };

      const users = JSON.parse(localStorage.getItem('app_users') || '{}');
      users[data.deptData.managerEmployeeId] = {
        password: 'test123',
        role: 'dept_manager',
        name: data.deptData.managerName
      };
      users[data.groupData.leaderEmployeeId] = {
        password: 'test123',
        role: 'tech_manager',
        name: data.groupData.leaderName
      };
      localStorage.setItem('app_users', JSON.stringify(users));
      localStorage.setItem('org_structure', JSON.stringify(org));
    }, { deptData: TEST_DEPARTMENTS[0], groupData: TEST_TECH_GROUPS[0] });

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

  test('应该能够创建工程师成员', async ({ page }) => {
    await organizationPage.waitForOrganizationLoad();

    // 选择技术组
    await organizationPage.selectTreeNode(TEST_TECH_GROUPS[0].name);

    // 点击添加成员
    await organizationPage.clickAddMember();
    await organizationPage.waitForDialog('member');

    // 填写成员信息
    const memberData = TEST_MEMBERS[0];
    await organizationPage.fillMemberForm(memberData);

    // 提交表单
    await organizationPage.clickFormSubmit('添加');

    // 等待对话框关闭
    await organizationPage.waitForDialogClosed();

    // 验证成员创建成功
    await page.waitForTimeout(1000);
    const hasMember = await organizationPage.nodeExists(memberData.name);
    expect(hasMember).toBeTruthy();

    // 验证统计信息更新
    const stats = await organizationPage.getStats();
    expect(stats.members).toBe(3); // 部门经理 + 技术经理 + 工程师
  });

  test('应该能够创建技术经理成员', async ({ page }) => {
    await organizationPage.waitForOrganizationLoad();

    // 选择技术组
    await organizationPage.selectTreeNode(TEST_TECH_GROUPS[0].name);

    // 点击添加成员
    await organizationPage.clickAddMember();
    await organizationPage.waitForDialog('member');

    // 填写成员信息（技术经理）
    const memberData = { ...TEST_MEMBERS[2] }; // 技术经理
    await organizationPage.fillMemberForm(memberData);

    // 提交表单
    await organizationPage.clickFormSubmit('添加');

    // 等待对话框关闭
    await organizationPage.waitForDialogClosed();

    // 验证成员创建成功
    await page.waitForTimeout(1000);
    const hasMember = await organizationPage.nodeExists(memberData.name);
    expect(hasMember).toBeTruthy();
  });

  test('应该能够编辑成员信息', async ({ page }) => {
    // 先创建成员
    await page.evaluate(async (memberData) => {
      const org = JSON.parse(localStorage.getItem('org_structure') || '{}');
      const group = org.departments[0].children.find(c => c.level === 'tech_group');

      group.children.push({
        id: 'member_001',
        employeeId: memberData.employeeId,
        name: memberData.name,
        level: 'member' as const,
        parentId: group.id,
        role: memberData.role as any,
        email: memberData.email,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      group.memberIds.push('member_001');

      const users = JSON.parse(localStorage.getItem('app_users') || '{}');
      users[memberData.employeeId] = {
        password: 'test123',
        role: memberData.role,
        name: memberData.name
      };
      localStorage.setItem('app_users', JSON.stringify(users));
      localStorage.setItem('org_structure', JSON.stringify(org));
    }, TEST_MEMBERS[0]);

    await organizationPage.refreshData();
    await organizationPage.waitForOrganizationLoad();

    // 选择成员
    await organizationPage.selectTreeNode(TEST_MEMBERS[0].name);

    // 点击编辑按钮
    await organizationPage.clickEdit();

    // 等待编辑模式
    await page.waitForTimeout(500);

    // 修改成员姓名
    const newName = '王小明（已更新）';
    await organizationPage.typeText('input[value*="王小明"]', newName);

    // 保存修改
    await organizationPage.clickElement('button:has-text("保存")');
    await page.waitForTimeout(1000);

    // 验证修改成功
    const hasUpdated = await organizationPage.nodeExists(newName);
    expect(hasUpdated).toBeTruthy();
  });

  test('应该能够删除成员', async ({ page }) => {
    // 先创建成员
    await page.evaluate(async (memberData) => {
      const org = JSON.parse(localStorage.getItem('org_structure') || '{}');
      const group = org.departments[0].children.find(c => c.level === 'tech_group');

      group.children.push({
        id: 'member_001',
        employeeId: memberData.employeeId,
        name: memberData.name,
        level: 'member' as const,
        parentId: group.id,
        role: memberData.role as any,
        email: memberData.email,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      group.memberIds.push('member_001');

      const users = JSON.parse(localStorage.getItem('app_users') || '{}');
      users[memberData.employeeId] = {
        password: 'test123',
        role: memberData.role,
        name: memberData.name
      };
      localStorage.setItem('app_users', JSON.stringify(users));
      localStorage.setItem('org_structure', JSON.stringify(org));
    }, TEST_MEMBERS[0]);

    await organizationPage.refreshData();
    await organizationPage.waitForOrganizationLoad();

    // 选择成员
    await organizationPage.selectTreeNode(TEST_MEMBERS[0].name);

    // 点击删除按钮
    await organizationPage.clickDelete();

    // 确认删除
    await organizationPage.confirmDelete();
    await page.waitForTimeout(1000);

    // 验证删除成功
    const hasMember = await organizationPage.nodeExists(TEST_MEMBERS[0].name);
    expect(hasMember).toBeFalsy();
  });

  test('应该验证成员姓名必填', async ({ page }) => {
    await organizationPage.waitForOrganizationLoad();

    // 选择技术组
    await organizationPage.selectTreeNode(TEST_TECH_GROUPS[0].name);

    // 点击添加成员
    await organizationPage.clickAddMember();
    await organizationPage.waitForDialog('member');

    // 只填写工号，不填写姓名
    await organizationPage.typeText('input[placeholder*="成员工号"]', TEST_MEMBERS[0].employeeId);
    await organizationPage.clickFormSubmit('添加');

    // 验证错误提示
    const errors = await organizationPage.getErrorMessages();
    const hasError = errors.some(msg => msg.includes('姓名') || msg.includes('必填'));
    expect(hasError).toBeTruthy();
  });

  test('应该验证成员工号必填', async ({ page }) => {
    await organizationPage.waitForOrganizationLoad();

    // 选择技术组
    await organizationPage.selectTreeNode(TEST_TECH_GROUPS[0].name);

    // 点击添加成员
    await organizationPage.clickAddMember();
    await organizationPage.waitForDialog('member');

    // 只填写姓名，不填写工号
    await organizationPage.typeText('input[placeholder*="成员姓名"]', TEST_MEMBERS[0].name);
    await organizationPage.clickFormSubmit('添加');

    // 验证错误提示
    const errors = await organizationPage.getErrorMessages();
    const hasError = errors.some(msg => msg.includes('工号') || msg.includes('必填'));
    expect(hasError).toBeTruthy();
  });

  test('应该验证工号唯一性', async ({ page }) => {
    // 先创建成员
    await page.evaluate(async (memberData) => {
      const org = JSON.parse(localStorage.getItem('org_structure') || '{}');
      const group = org.departments[0].children.find(c => c.level === 'tech_group');

      group.children.push({
        id: 'member_001',
        employeeId: memberData.employeeId,
        name: memberData.name,
        level: 'member' as const,
        parentId: group.id,
        role: memberData.role as any,
        email: memberData.email,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      group.memberIds.push('member_001');

      const users = JSON.parse(localStorage.getItem('app_users') || '{}');
      users[memberData.employeeId] = {
        password: 'test123',
        role: memberData.role,
        name: memberData.name
      };
      localStorage.setItem('app_users', JSON.stringify(users));
      localStorage.setItem('org_structure', JSON.stringify(org));
    }, TEST_MEMBERS[0]);

    await organizationPage.refreshData();
    await organizationPage.waitForOrganizationLoad();

    // 尝试添加相同工号的成员
    await organizationPage.selectTreeNode(TEST_TECH_GROUPS[0].name);
    await organizationPage.clickAddMember();
    await organizationPage.waitForDialog('member');

    // 填写相同工号
    await organizationPage.fillMemberForm({
      name: '新成员',
      employeeId: TEST_MEMBERS[0].employeeId // 相同工号
    });

    await organizationPage.clickFormSubmit('添加');

    // 验证错误提示
    await page.waitForTimeout(500);
    const errors = await organizationPage.getErrorMessages();
    const hasError = errors.some(msg => msg.includes('工号') || msg.includes('已存在'));
    expect(hasError).toBeTruthy();
  });

  test('应该能够添加多个成员到技术组', async ({ page }) => {
    await organizationPage.waitForOrganizationLoad();

    // 选择技术组
    await organizationPage.selectTreeNode(TEST_TECH_GROUPS[0].name);

    // 添加第一个成员
    await organizationPage.clickAddMember();
    await organizationPage.waitForDialog('member');
    await organizationPage.fillMemberForm(TEST_MEMBERS[0]);
    await organizationPage.clickFormSubmit('添加');
    await organizationPage.waitForDialogClosed();
    await page.waitForTimeout(1000);

    // 添加第二个成员
    await organizationPage.selectTreeNode(TEST_TECH_GROUPS[0].name);
    await organizationPage.clickAddMember();
    await organizationPage.waitForDialog('member');
    await organizationPage.fillMemberForm(TEST_MEMBERS[1]);
    await organizationPage.clickFormSubmit('添加');
    await organizationPage.waitForDialogClosed();
    await page.waitForTimeout(1000);

    // 验证两个成员都创建成功
    const hasMember1 = await organizationPage.nodeExists(TEST_MEMBERS[0].name);
    const hasMember2 = await organizationPage.nodeExists(TEST_MEMBERS[1].name);
    expect(hasMember1).toBeTruthy();
    expect(hasMember2).toBeTruthy();

    // 验证统计信息
    const stats = await organizationPage.getStats();
    expect(stats.members).toBe(4); // 部门经理 + 技术经理 + 2个工程师
  });

  test('应该显示成员的角色标签', async ({ page }) => {
    // 先创建成员
    await page.evaluate(async (memberData) => {
      const org = JSON.parse(localStorage.getItem('org_structure') || '{}');
      const group = org.departments[0].children.find(c => c.level === 'tech_group');

      group.children.push({
        id: 'member_001',
        employeeId: memberData.employeeId,
        name: memberData.name,
        level: 'member' as const,
        parentId: group.id,
        role: memberData.role as any,
        email: memberData.email,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      group.memberIds.push('member_001');

      const users = JSON.parse(localStorage.getItem('app_users') || '{}');
      users[memberData.employeeId] = {
        password: 'test123',
        role: memberData.role,
        name: memberData.name
      };
      localStorage.setItem('app_users', JSON.stringify(users));
      localStorage.setItem('org_structure', JSON.stringify(org));
    }, TEST_MEMBERS[0]);

    await organizationPage.refreshData();
    await organizationPage.waitForOrganizationLoad();

    // 选择成员
    await organizationPage.selectTreeNode(TEST_MEMBERS[0].name);

    // 验证详情面板显示角色
    const detailText = await organizationPage.detailPanel.textContent();
    expect(detailText).toContain('角色');
  });

  test('应该显示成员的能力模型', async ({ page }) => {
    // 先创建带能力模型的成员
    await page.evaluate(async (memberData) => {
      const org = JSON.parse(localStorage.getItem('org_structure') || '{}');
      const group = org.departments[0].children.find(c => c.level === 'tech_group');

      group.children.push({
        id: 'member_001',
        employeeId: memberData.employeeId,
        name: memberData.name,
        level: 'member' as const,
        parentId: group.id,
        role: memberData.role as any,
        email: memberData.email,
        capabilities: {
          boardDev: 7,
          firmwareDev: 8,
          componentImport: 6,
          systemDesign: 9,
          driverInterface: 7
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      group.memberIds.push('member_001');

      const users = JSON.parse(localStorage.getItem('app_users') || '{}');
      users[memberData.employeeId] = {
        password: 'test123',
        role: memberData.role,
        name: memberData.name
      };
      localStorage.setItem('app_users', JSON.stringify(users));
      localStorage.setItem('org_structure', JSON.stringify(org));
    }, TEST_MEMBERS[0]);

    await organizationPage.refreshData();
    await organizationPage.waitForOrganizationLoad();

    // 选择成员
    await organizationPage.selectTreeNode(TEST_MEMBERS[0].name);

    // 验证详情面板显示能力模型
    const detailText = await organizationPage.detailPanel.textContent();
    expect(detailText).toContain('能力模型');
  });

  test('应该能够取消成员创建', async ({ page }) => {
    await organizationPage.waitForOrganizationLoad();

    // 选择技术组
    await organizationPage.selectTreeNode(TEST_TECH_GROUPS[0].name);

    // 点击添加成员
    await organizationPage.clickAddMember();
    await organizationPage.waitForDialog('member');

    // 填写表单
    await organizationPage.fillMemberForm(TEST_MEMBERS[0]);

    // 点击取消
    await organizationPage.clickFormCancel();
    await organizationPage.waitForDialogClosed();

    // 验证成员未创建
    const hasMember = await organizationPage.nodeExists(TEST_MEMBERS[0].name);
    expect(hasMember).toBeFalsy();
  });
});
