/**
 * 能力模型设置 E2E 测试
 *
 * 测试能力模型的创建、编辑、删除和应用
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { OrganizationPage } from '../../src/pages/OrganizationPage';
import { TEST_USERS } from '../../src/data/test-users';
import { TEST_CAPABILITIES, TEST_DEPARTMENTS, TEST_TECH_GROUPS } from '../../src/data/test-organization';

test.describe('能力模型设置测试', () => {
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

    // 创建测试组织架构
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

  test('应该能够打开能力模型设置对话框', async ({ page }) => {
    await organizationPage.waitForOrganizationLoad();

    // 点击能力模型设置按钮
    await organizationPage.clickCapabilitySettings();

    // 验证对话框打开
    await organizationPage.waitForDialog('capability');

    // 验证对话框标题
    const dialogTitle = await organizationPage.getText('div[role="dialog"] h2, div[role="dialog"] h3');
    expect(dialogTitle).toContain('能力模型设置');
  });

  test('应该能够创建新的能力模型组', async ({ page }) => {
    await organizationPage.waitForOrganizationLoad();

    // 打开能力模型设置
    await organizationPage.clickCapabilitySettings();
    await organizationPage.waitForDialog('capability');

    // 点击添加模型组按钮
    await organizationPage.clickElement('button:has-text("添加模型组")');
    await page.waitForTimeout(500);

    // 填写模型组信息
    await organizationPage.typeText('input[placeholder*="模型组名称"]', TEST_CAPABILITIES.frontend.name);
    await organizationPage.typeText('textarea[placeholder*="描述"]', TEST_CAPABILITIES.frontend.description);

    // 填写能力维度
    const dimensionInputs = page.locator('input[placeholder*="维度名称"]');
    await dimensionInputs.nth(0).fill(TEST_CAPABILITIES.frontend.dimensions[0].name);

    // 保存模型组
    await organizationPage.clickElement('button:has-text("创建")');
    await page.waitForTimeout(1000);

    // 验证模型组创建成功
    const hasModel = await organizationPage.hasElement(`text=${TEST_CAPABILITIES.frontend.name}`);
    expect(hasModel).toBeTruthy();
  });

  test('应该能够编辑能力模型组', async ({ page }) => {
    // 先创建能力模型
    await page.evaluate((capabilityData) => {
      const models = [{
        id: 'model_test_001',
        name: capabilityData.name,
        description: capabilityData.description,
        dimensions: capabilityData.dimensions.map((d, i) => ({
          key: `dim_${i}`,
          name: d.name,
          description: d.description,
          color: d.color
        })),
        techGroupIds: [],
        isDefault: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }];
      localStorage.setItem('capability_models', JSON.stringify(models));
    }, TEST_CAPABILITIES.frontend);

    await organizationPage.refreshData();
    await organizationPage.waitForOrganizationLoad();

    // 打开能力模型设置
    await organizationPage.clickCapabilitySettings();
    await organizationPage.waitForDialog('capability');

    // 点击编辑按钮
    await organizationPage.clickElement('button:has-text("编辑"), svg[data-lucide="edit3"]');
    await page.waitForTimeout(500);

    // 修改模型组名称
    const newName = '前端开发能力模型（已更新）';
    await organizationPage.typeText('input[value*="前端开发"]', newName);

    // 保存修改
    await organizationPage.clickElement('button:has-text("更新")');
    await page.waitForTimeout(1000);

    // 验证修改成功
    const hasUpdated = await organizationPage.hasElement(`text=${newName}`);
    expect(hasUpdated).toBeTruthy();
  });

  test('应该能够删除自定义能力模型组', async ({ page }) => {
    // 先创建能力模型
    await page.evaluate((capabilityData) => {
      const models = [{
        id: 'model_test_001',
        name: capabilityData.name,
        description: capabilityData.description,
        dimensions: capabilityData.dimensions.map((d, i) => ({
          key: `dim_${i}`,
          name: d.name,
          description: d.description,
          color: d.color
        })),
        techGroupIds: [],
        isDefault: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }];
      localStorage.setItem('capability_models', JSON.stringify(models));
    }, TEST_CAPABILITIES.frontend);

    await organizationPage.refreshData();
    await organizationPage.waitForOrganizationLoad();

    // 打开能力模型设置
    await organizationPage.clickCapabilitySettings();
    await organizationPage.waitForDialog('capability');

    // 点击删除按钮
    await organizationPage.clickElement('button:has-text("删除"), svg[data-lucide="trash2"]');
    await page.waitForTimeout(500);

    // 确认删除
    await organizationPage.confirmDelete();
    await page.waitForTimeout(1000);

    // 验证删除成功
    const hasModel = await organizationPage.hasElement(`text=${TEST_CAPABILITIES.frontend.name}`);
    expect(hasModel).toBeFalsy();
  });

  test('应该不能删除默认能力模型组', async ({ page }) => {
    // 先创建默认能力模型
    await page.evaluate(() => {
      const models = [{
        id: 'model_default_001',
        name: '默认能力模型',
        description: '系统默认模型',
        dimensions: [
          { key: 'dim1', name: '维度1', description: '测试维度', color: '#3b82f6' }
        ],
        techGroupIds: [],
        isDefault: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }];
      localStorage.setItem('capability_models', JSON.stringify(models));
    });

    await organizationPage.refreshData();
    await organizationPage.waitForOrganizationLoad();

    // 打开能力模型设置
    await organizationPage.clickCapabilitySettings();
    await organizationPage.waitForDialog('capability');

    // 查找默认模型的删除按钮
    const deleteButton = page.locator('div[role="dialog"] button:has-text("删除")');
    const count = await deleteButton.count();

    // 验证默认模型的删除按钮被禁用或不存在
    expect(count).toBe(0);
  });

  test('应该能够添加能力维度', async ({ page }) => {
    await organizationPage.waitForOrganizationLoad();

    // 打开能力模型设置
    await organizationPage.clickCapabilitySettings();
    await organizationPage.waitForDialog('capability');

    // 点击添加模型组按钮
    await organizationPage.clickElement('button:has-text("添加模型组")');
    await page.waitForTimeout(500);

    // 填写基本信息
    await organizationPage.typeText('input[placeholder*="模型组名称"]', '测试模型');
    await organizationPage.typeText('textarea[placeholder*="描述"]', '测试描述');

    // 添加第一个维度
    await organizationPage.typeText('input[placeholder*="维度名称"]', '维度1');

    // 点击添加维度按钮
    await organizationPage.clickElement('button:has-text("添加维度")');
    await page.waitForTimeout(500);

    // 验证第二个维度输入框出现
    const dimensionCount = await page.locator('input[placeholder*="维度名称"]').count();
    expect(dimensionCount).toBe(2);
  });

  test('应该能够移除能力维度', async ({ page }) => {
    await organizationPage.waitForOrganizationLoad();

    // 打开能力模型设置
    await organizationPage.clickCapabilitySettings();
    await organizationPage.waitForDialog('capability');

    // 点击添加模型组按钮
    await organizationPage.clickElement('button:has-text("添加模型组")');
    await page.waitForTimeout(500);

    // 填写基本信息
    await organizationPage.typeText('input[placeholder*="模型组名称"]', '测试模型');
    await organizationPage.typeText('textarea[placeholder*="描述"]', '测试描述');

    // 添加第二个维度
    await organizationPage.clickElement('button:has-text("添加维度")');
    await page.waitForTimeout(500);

    // 移除第一个维度
    await organizationPage.clickElement('button:has-text("删除"), svg[data-lucide="trash2"]');
    await page.waitForTimeout(500);

    // 验证只剩一个维度
    const dimensionCount = await page.locator('input[placeholder*="维度名称"]').count();
    expect(dimensionCount).toBe(1);
  });

  test('应该能够设置维度颜色', async ({ page }) => {
    await organizationPage.waitForOrganizationLoad();

    // 打开能力模型设置
    await organizationPage.clickCapabilitySettings();
    await organizationPage.waitForDialog('capability');

    // 点击添加模型组按钮
    await organizationPage.clickElement('button:has-text("添加模型组")');
    await page.waitForTimeout(500);

    // 填写基本信息
    await organizationPage.typeText('input[placeholder*="模型组名称"]', '测试模型');

    // 点击颜色选择按钮
    const colorButton = page.locator('button[style*="background-color"]').first();
    await colorButton.click();
    await page.waitForTimeout(500);

    // 验证颜色被选中
    const selectedColor = await colorButton.getAttribute('class');
    expect(selectedColor).toContain('border-white');
  });

  test('应该能够将能力模型应用到技术组', async ({ page }) => {
    // 先创建能力模型
    await page.evaluate((capabilityData) => {
      const models = [{
        id: 'model_test_001',
        name: capabilityData.name,
        description: capabilityData.description,
        dimensions: capabilityData.dimensions.map((d, i) => ({
          key: `dim_${i}`,
          name: d.name,
          description: d.description,
          color: d.color
        })),
        techGroupIds: [],
        isDefault: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }];
      localStorage.setItem('capability_models', JSON.stringify(models));
    }, TEST_CAPABILITIES.frontend);

    await organizationPage.refreshData();
    await organizationPage.waitForOrganizationLoad();

    // 打开能力模型设置
    await organizationPage.clickCapabilitySettings();
    await organizationPage.waitForDialog('capability');

    // 点击编辑按钮
    await organizationPage.clickElement('button:has-text("编辑"), svg[data-lucide="edit3"]');
    await page.waitForTimeout(500);

    // 选择技术组复选框
    const techGroupCheckbox = page.locator('input[type="checkbox"]').first();
    await techGroupCheckbox.check();
    await page.waitForTimeout(500);

    // 保存修改
    await organizationPage.clickElement('button:has-text("更新")');
    await page.waitForTimeout(1000);

    // 验证应用成功
    const hasTechGroup = await organizationPage.hasElement('text=应用于');
    expect(hasTechGroup).toBeTruthy();
  });

  test('应该能够重置为默认能力模型', async ({ page }) => {
    // 先创建自定义模型
    await page.evaluate(() => {
      const models = [{
        id: 'model_custom_001',
        name: '自定义模型',
        description: '自定义模型描述',
        dimensions: [
          { key: 'dim1', name: '自定义维度', description: '测试', color: '#3b82f6' }
        ],
        techGroupIds: [],
        isDefault: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }];
      localStorage.setItem('capability_models', JSON.stringify(models));
    });

    await organizationPage.refreshData();
    await organizationPage.waitForOrganizationLoad();

    // 打开能力模型设置
    await organizationPage.clickCapabilitySettings();
    await organizationPage.waitForDialog('capability');

    // 点击重置默认按钮
    await organizationPage.clickElement('button:has-text("重置默认")');
    await page.waitForTimeout(500);

    // 确认重置
    await organizationPage.confirmDelete();
    await page.waitForTimeout(1000);

    // 验证重置成功（应该有默认模型）
    const hasDefaultModel = await organizationPage.hasElement('text=默认');
    expect(hasDefaultModel).toBeTruthy();
  });

  test('应该显示能力维度列表', async ({ page }) => {
    // 先创建能力模型
    await page.evaluate((capabilityData) => {
      const models = [{
        id: 'model_test_001',
        name: capabilityData.name,
        description: capabilityData.description,
        dimensions: capabilityData.dimensions.map((d, i) => ({
          key: `dim_${i}`,
          name: d.name,
          description: d.description,
          color: d.color
        })),
        techGroupIds: [],
        isDefault: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }];
      localStorage.setItem('capability_models', JSON.stringify(models));
    }, TEST_CAPABILITIES.frontend);

    await organizationPage.refreshData();
    await organizationPage.waitForOrganizationLoad();

    // 打开能力模型设置
    await organizationPage.clickCapabilitySettings();
    await organizationPage.waitForDialog('capability');

    // 验证显示能力维度
    const hasDimension = await organizationPage.hasElement(`text=${TEST_CAPABILITIES.frontend.dimensions[0].name}`);
    expect(hasDimension).toBeTruthy();
  });

  test('应该能够取消能力模型创建', async ({ page }) => {
    await organizationPage.waitForOrganizationLoad();

    // 打开能力模型设置
    await organizationPage.clickCapabilitySettings();
    await organizationPage.waitForDialog('capability');

    // 点击添加模型组按钮
    await organizationPage.clickElement('button:has-text("添加模型组")');
    await page.waitForTimeout(500);

    // 填写表单
    await organizationPage.typeText('input[placeholder*="模型组名称"]', '测试模型');

    // 点击取消
    await organizationPage.clickElement('button:has-text("取消")');
    await page.waitForTimeout(500);

    // 验证对话框仍打开，但表单关闭
    const hasModel = await organizationPage.hasElement('text=测试模型');
    expect(hasModel).toBeFalsy();
  });
});
