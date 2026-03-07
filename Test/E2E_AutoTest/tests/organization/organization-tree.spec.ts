/**
 * 组织架构树 E2E 测试
 *
 * 测试组织架构树的加载、显示、交互功能
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { OrganizationPage } from '../../src/pages/OrganizationPage';
import { Sidebar } from '../../src/components/Sidebar';
import { TEST_USERS } from '../../src/data/test-users';
import { TEST_ORGANIZATION, generateRandomOrganization } from '../../src/data/test-organization';

test.describe('组织架构树测试', () => {
  let loginPage: LoginPage;
  let organizationPage: OrganizationPage;
  let sidebar: Sidebar;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    organizationPage = new OrganizationPage(page);
    sidebar = new Sidebar(page);

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

  test.afterEach(async ({ page }) => {
    // 清理测试数据
    await page.evaluate(() => {
      localStorage.removeItem('org_structure');
      localStorage.removeItem('capability_models');
    });
  });

  test('应该显示组织架构树', async ({ page }) => {
    // 等待组织架构加载
    await organizationPage.waitForOrganizationLoad();

    // 验证树结构存在
    const treeExists = await organizationPage.hasElement('[class*="tree"], [class*="organization"]');
    expect(treeExists).toBeTruthy();

    // 验证页面标题
    const pageTitle = await organizationPage.getPageTitle();
    expect(pageTitle).toContain('组织');
  });

  test('应该正确显示部门节点', async ({ page }) => {
    await organizationPage.waitForOrganizationLoad();

    // 获取部门数量
    const deptCount = await organizationPage.getDepartmentCount();
    expect(deptCount).toBeGreaterThan(0);

    // 验证部门节点存在
    const hasDeptNode = await organizationPage.nodeExists('研发一部');
    expect(hasDeptNode).toBeTruthy();
  });

  test('应该正确显示技术组节点', async ({ page }) => {
    await organizationPage.waitForOrganizationLoad();

    // 获取技术组数量
    const groupCount = await organizationPage.getTechGroupCount();
    expect(groupCount).toBeGreaterThan(0);

    // 验证技术组节点存在
    const hasGroupNode = await organizationPage.nodeExists('前端组');
    expect(hasGroupNode).toBeTruthy();
  });

  test('应该正确显示成员节点', async ({ page }) => {
    await organizationPage.waitForOrganizationLoad();

    // 获取成员数量
    const memberCount = await organizationPage.getMemberCount();
    expect(memberCount).toBeGreaterThan(0);

    // 验证成员节点存在
    const hasMemberNode = await organizationPage.nodeExists('王小明');
    expect(hasMemberNode).toBeTruthy();
  });

  test('应该正确显示统计信息', async ({ page }) => {
    await organizationPage.waitForOrganizationLoad();

    // 获取统计信息
    const stats = await organizationPage.getStats();

    // 验证统计数据
    expect(stats.departments).toBeGreaterThan(0);
    expect(stats.techGroups).toBeGreaterThan(0);
    expect(stats.members).toBeGreaterThan(0);

    // 验证统计显示正确
    expect(stats.departments).toBe(1); // TEST_ORGANIZATION 有1个部门
    expect(stats.techGroups).toBe(2); // TEST_ORGANIZATION 有2个技术组
    expect(stats.members).toBe(3); // TEST_ORGANIZATION 有3个成员
  });

  test('应该能够展开和收起树节点', async ({ page }) => {
    await organizationPage.waitForOrganizationLoad();

    // 展开部门节点
    await organizationPage.toggleTreeNode('研发一部');
    await page.waitForTimeout(500);

    // 验证子节点可见
    const hasGroupNode = await organizationPage.nodeExists('前端组');
    expect(hasGroupNode).toBeTruthy();

    // 收起部门节点
    await organizationPage.toggleTreeNode('研发一部');
    await page.waitForTimeout(500);
  });

  test('应该能够选择树节点', async ({ page }) => {
    await organizationPage.waitForOrganizationLoad();

    // 选择部门节点
    await organizationPage.selectTreeNode('研发一部');

    // 验证节点被选中
    const isSelected = await organizationPage.isNodeSelected('研发一部');
    expect(isSelected).toBeTruthy();

    // 验证详情面板显示
    const detailPanelTitle = await organizationPage.getDetailPanelTitle();
    expect(detailPanelTitle).toContain('研发一部');
  });

  test('应该显示正确的节点图标', async ({ page }) => {
    await organizationPage.waitForOrganizationLoad();

    // 验证部门图标
    const deptIcon = page.locator('svg[data-lucide="building2"]');
    expect(await deptIcon.count()).toBeGreaterThan(0);

    // 验证技术组图标
    const groupIcon = page.locator('svg[data-lucide="users"]');
    expect(await groupIcon.count()).toBeGreaterThan(0);

    // 验证成员图标
    const memberIcon = page.locator('svg[data-lucide="user"]');
    expect(await memberIcon.count()).toBeGreaterThan(0);
  });

  test('应该在节点上显示人数统计', async ({ page }) => {
    await organizationPage.waitForOrganizationLoad();

    // 获取树节点文本
    const nodeTexts = await organizationPage.getTreeNodes();

    // 验证节点文本包含人数统计
    const hasCount = nodeTexts.some(text => text.includes('人') || text.includes('）'));
    expect(hasCount).toBeTruthy();
  });

  test('应该能够处理大量节点', async ({ page }) => {
    // 生成大型组织架构
    const largeOrg = generateRandomOrganization(5);
    await page.evaluate((org) => {
      localStorage.setItem('org_structure', JSON.stringify(org));
    }, largeOrg);

    // 刷新页面
    await organizationPage.refreshData();
    await organizationPage.waitForOrganizationLoad();

    // 验证树结构正常显示
    const treeExists = await organizationPage.hasElement('[class*="tree"]');
    expect(treeExists).toBeTruthy();

    // 验证统计信息正确
    const stats = await organizationPage.getStats();
    expect(stats.departments).toBe(5);
  });

  test('应该在空组织时显示初始状态', async ({ page }) => {
    // 清空组织架构
    await page.evaluate(() => {
      localStorage.removeItem('org_structure');
    });

    // 刷新页面
    await organizationPage.refreshData();

    // 验证显示初始状态
    const isInitial = await organizationPage.isInitialState();
    expect(isInitial).toBeTruthy();

    // 验证显示创建和导入按钮
    const hasCreateButton = await organizationPage.initialCreateButton.count() > 0;
    const hasImportButton = await organizationPage.initialImportButton.count() > 0;
    expect(hasCreateButton).toBeTruthy();
    expect(hasImportButton).toBeTruthy();
  });

  test('应该能够刷新组织架构数据', async ({ page }) => {
    await organizationPage.waitForOrganizationLoad();

    // 获取初始统计
    const initialStats = await organizationPage.getStats();

    // 更新组织架构数据
    const updatedOrg = { ...TEST_ORGANIZATION };
    updatedOrg.departments.push({
      id: 'dept_new_001',
      name: '新部门',
      level: 'department',
      parentId: null,
      description: '新增的部门',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      children: []
    });

    await page.evaluate((org) => {
      localStorage.setItem('org_structure', JSON.stringify(org));
    }, updatedOrg);

    // 刷新页面
    await organizationPage.refreshData();

    // 验证数据已更新
    const updatedStats = await organizationPage.getStats();
    expect(updatedStats.departments).toBe(initialStats.departments + 1);
  });

  test('应该支持树节点搜索', async ({ page }) => {
    await organizationPage.waitForOrganizationLoad();

    // 如果有搜索框，测试搜索功能
    const searchInput = page.locator('input[placeholder*="搜索"], input[type="search"]');
    if (await searchInput.count() > 0) {
      await searchInput.fill('前端');
      await page.waitForTimeout(500);

      // 验证搜索结果
      const hasResult = await organizationPage.nodeExists('前端组');
      expect(hasResult).toBeTruthy();
    }
  });

  test('应该显示加载状态', async ({ page }) => {
    // 清空组织架构以触发加载状态
    await page.evaluate(() => {
      localStorage.removeItem('org_structure');
    });

    // 导航到页面
    await organizationPage.navigateToOrganizationSettings();

    // 验证显示加载指示器
    const loader = page.locator('svg[class*="spin"], [class*="loading"]');
    const hasLoader = await loader.count() > 0;
    expect(hasLoader).toBeTruthy();
  });
});
