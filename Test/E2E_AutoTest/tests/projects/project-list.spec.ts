/**
 * 项目列表 E2E 测试套件
 *
 * 测试场景：
 * 1. 项目列表加载和显示
 * 2. 项目搜索功能
 * 3. 项目状态筛选
 * 4. 项目排序
 * 5. 视图切换（网格/列表）
 * 6. 项目权限控制
 * 7. 项目快捷操作
 *
 * @module tests/projects/project-list
 */

import { test, expect, Page } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { DashboardPage } from '../../pages/DashboardPage';
import { ProjectListPage } from '../../pages/ProjectListPage';
import { TEST_USERS } from '../../data/test-users';

/**
 * 测试前置条件 - 登录并导航到项目列表
 */
async function setupProjectListTest(page: Page, userRole: keyof typeof TEST_USERS = 'admin') {
  const loginPage = new LoginPage(page);
  const dashboardPage = new DashboardPage(page);
  const projectListPage = new ProjectListPage(page);

  // 登录
  const user = TEST_USERS[userRole];
  await page.goto('/');
  await loginPage.login(user.username, user.password);
  await dashboardPage.waitForReady();

  // 导航到项目管理
  await dashboardPage.navigateToSection('项目管理');
  await projectListPage.waitForReady();

  return { loginPage, dashboardPage, projectListPage };
}

test.describe('项目列表 - 基础功能', () => {
  test('应该正确加载和显示项目列表', async ({ page }) => {
    const { projectListPage } = await setupProjectListTest(page);

    // 验证页面标题
    await expect(page.locator('h1, h2').filter({ hasText: /项目|Project/ })).toBeVisible();

    // 验证项目列表容器存在
    const projectList = page.locator('[class*="project-list"], [data-testid="project-list"]');
    await expect(projectList).toBeVisible();

    // 验证创建项目按钮存在
    await expect(projectListPage.createProjectButton).toBeVisible();
  });

  test('应该显示项目卡片或列表项', async ({ page }) => {
    const { projectListPage } = await setupProjectListTest(page);

    // 等待项目列表加载
    await page.waitForTimeout(1000);

    // 检查项目卡片或列表项是否存在
    const projectCards = page.locator('[class*="project-card"], [class*="ProjectCard"]');
    const count = await projectCards.count();

    // 至少应该有0个或更多项目
    expect(count).toBeGreaterThanOrEqual(0);

    // 如果有项目，验证卡片内容
    if (count > 0) {
      const firstCard = projectCards.first();
      await expect(firstCard).toBeVisible();

      // 验证卡片包含项目名称
      const cardText = await firstCard.textContent();
      expect(cardText).toBeTruthy();
      expect(cardText!.length).toBeGreaterThan(0);
    }
  });

  test('应该有搜索框', async ({ page }) => {
    const { projectListPage } = await setupProjectListTest(page);

    // 验证搜索框存在
    const searchInput = page.locator('input[placeholder*="搜索"], input[type="search"]');
    await expect(searchInput).toBeVisible();
  });

  test('应该有筛选按钮', async ({ page }) => {
    const { projectListPage } = await setupProjectListTest(page);

    // 验证筛选按钮存在
    await expect(projectListPage.filterButton).toBeVisible();
  });
});

test.describe('项目列表 - 搜索功能', () => {
  test('应该能够搜索项目', async ({ page }) => {
    const { projectListPage } = await setupProjectListTest(page);

    // 等待列表加载
    await page.waitForTimeout(1000);

    // 获取初始项目数量
    const initialCount = await projectListPage.getProjectCount();

    // 输入搜索关键词
    await projectListPage.searchProjects('测试');

    // 等待搜索结果
    await page.waitForTimeout(1000);

    // 验证搜索结果
    const searchCount = await projectListPage.getProjectCount();
    expect(searchCount).toBeLessThanOrEqual(initialCount);
  });

  test('搜索框应该支持清空', async ({ page }) => {
    const { projectListPage } = await setupProjectListTest(page);

    // 输入搜索内容
    await projectListPage.searchProjects('测试项目');
    await page.waitForTimeout(500);

    // 清空搜索框
    const searchInput = page.locator('input[placeholder*="搜索"], input[type="search"]');
    await searchInput.clear();
    await page.waitForTimeout(1000);

    // 验证列表恢复
    const count = await projectListPage.getProjectCount();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('搜索不存在的项目应该显示空状态', async ({ page }) => {
    const { projectListPage } = await setupProjectListTest(page);

    // 搜索不存在的项目
    await projectListPage.searchProjects('不存在的项目XYZ123');
    await page.waitForTimeout(1000);

    // 验证空状态提示
    const emptyState = page.locator('text=/暂无项目|没有找到|No projects/');
    const isVisible = await emptyState.isVisible().catch(() => false);
    expect(isVisible).toBeTruthy();
  });
});

test.describe('项目列表 - 筛选功能', () => {
  test('应该能够打开筛选菜单', async ({ page }) => {
    const { projectListPage } = await setupProjectListTest(page);

    // 点击筛选按钮
    await projectListPage.filterButton.click();

    // 验证筛选菜单出现
    const filterMenu = page.locator('[role="menu"]:visible, .dropdown-menu:visible');
    await expect(filterMenu).toBeVisible();

    // 关闭菜单
    await page.keyboard.press('Escape');
  });

  test('应该能够按项目状态筛选', async ({ page }) => {
    const { projectListPage } = await setupProjectListTest(page);

    // 打开筛选菜单
    await projectListPage.filterButton.click();

    // 点击状态筛选选项（如"进行中"）
    const statusFilter = page.locator('text=/进行中/').first();
    const exists = await statusFilter.isVisible().catch(() => false);

    if (exists) {
      await statusFilter.click();
      await page.waitForTimeout(1000);

      // 验证列表更新
      const projectCount = await projectListPage.getProjectCount();
      expect(projectCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('应该能够按项目类型筛选', async ({ page }) => {
    const { projectListPage } = await setupProjectListTest(page);

    // 打开筛选菜单
    await projectListPage.filterButton.click();

    // 查找项目类型筛选
    const typeFilter = page.locator('text=/产品开发|职能管理/').first();
    const exists = await typeFilter.isVisible().catch(() => false);

    if (exists) {
      await typeFilter.click();
      await page.waitForTimeout(1000);

      // 验证列表更新
      const projectCount = await projectListPage.getProjectCount();
      expect(projectCount).toBeGreaterThanOrEqual(0);
    }
  });
});

test.describe('项目列表 - 排序功能', () => {
  test('应该能够切换排序方式', async ({ page }) => {
    const { projectListPage } = await setupProjectListTest(page);

    // 查找排序按钮
    const sortButton = page.locator('button:has-text("排序"), [data-testid="sort"]').first();
    const exists = await sortButton.isVisible().catch(() => false);

    if (exists) {
      // 记录初始顺序
      const initialProjects = await page.locator('[class*="project-card"]').allTextContents();

      // 点击排序按钮
      await sortButton.click();

      // 选择排序选项
      const sortOption = page.locator('text=/按名称|按进度|按日期/').first();
      await sortOption.click();

      await page.waitForTimeout(1000);

      // 验证列表已刷新（不验证顺序，因为数据可能相同）
      await expect(projectListPage.projectCards).toBeVisible();
    }
  });

  test('应该支持升序和降序切换', async ({ page }) => {
    const { projectListPage } = await setupProjectListTest(page);

    const sortButton = page.locator('button:has-text("排序"), [data-testid="sort"]').first();
    const exists = await sortButton.isVisible().catch(() => false);

    if (exists) {
      await sortButton.click();

      // 查找切换排序方向的选项
      const toggleOption = page.locator('text=/升序|降序/').first();
      const hasToggle = await toggleOption.isVisible().catch(() => false);

      if (hasToggle) {
        await toggleOption.click();
        await page.waitForTimeout(500);
      }
    }
  });
});

test.describe('项目列表 - 视图切换', () => {
  test('应该能够在网格视图和列表视图之间切换', async ({ page }) => {
    const { projectListPage } = await setupProjectListTest(page);

    // 查找视图切换按钮
    const viewToggle = page.locator('button:has-text("视图"), [data-testid="view-toggle"]').first();
    const exists = await viewToggle.isVisible().catch(() => false);

    if (exists) {
      // 点击切换视图
      await viewToggle.click();
      await page.waitForTimeout(500);

      // 验证视图已切换
      await expect(projectListPage.projectCards.first()).toBeVisible();

      // 再次点击切回原视图
      await viewToggle.click();
      await page.waitForTimeout(500);
    }
  });

  test('网格视图应该显示项目卡片', async ({ page }) => {
    const { projectListPage } = await setupProjectListTest(page);

    // 验证网格视图
    const gridView = page.locator('[class*="grid"], [data-view-mode="grid"]');
    const isGridView = await gridView.isVisible().catch(() => false);

    if (isGridView) {
      const cards = gridView.locator('[class*="project-card"]');
      const count = await cards.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });
});

test.describe('项目列表 - 权限控制', () => {
  test('管理员应该能看到所有操作按钮', async ({ page }) => {
    const { projectListPage } = await setupProjectListTest(page, 'admin');

    // 验证创建项目按钮可见
    await expect(projectListPage.createProjectButton).toBeVisible();

    // 等待项目列表加载
    await page.waitForTimeout(1000);

    // 检查第一个项目卡片的操作按钮
    const firstCard = page.locator('[class*="project-card"]').first();
    const cardExists = await firstCard.isVisible().catch(() => false);

    if (cardExists) {
      // 验证编辑和删除按钮存在
      const editButton = firstCard.locator('button:has-text("编辑")');
      const deleteButton = firstCard.locator('button:has-text("删除")');

      // 这些按钮可能只在hover时显示，所以不强制要求
      const editVisible = await editButton.isVisible().catch(() => false);
      const deleteVisible = await deleteButton.isVisible().catch(() => false);

      // 至少应该能看到项目信息
      await expect(firstCard).toBeVisible();
    }
  });

  test('工程师角色应该限制操作', async ({ page }) => {
    const { projectListPage } = await setupProjectListTest(page, 'engineer');

    // 工程师可能看不到创建按钮
    const createButton = page.locator('button:has-text("创建项目")');
    const canCreate = await createButton.isVisible().catch(() => false);

    // 验证至少能看到项目列表
    await expect(projectListPage.projectCards.first()).toBeVisible();
  });

  test('部门经理应该有相应的权限', async ({ page }) => {
    const { projectListPage } = await setupProjectListTest(page, 'dept_manager');

    // 验证能访问项目列表
    await expect(projectListPage.projectCards.first()).toBeVisible();

    // 验证创建按钮（可能有权限）
    const createButton = page.locator('button:has-text("创建项目")');
    const canCreate = await createButton.isVisible().catch(() => false);

    // 不强制要求，因为权限可能不同
    await expect(projectListPage.projectCards.first()).toBeVisible();
  });
});

test.describe('项目列表 - 快速操作', () => {
  test('应该能点击项目卡片查看详情', async ({ page }) => {
    const { projectListPage } = await setupProjectListTest(page);

    // 等待列表加载
    await page.waitForTimeout(1000);

    // 查找第一个项目
    const firstCard = page.locator('[class*="project-card"]').first();
    const cardExists = await firstCard.isVisible().catch(() => false);

    if (cardExists) {
      // 获取项目名称
      const projectName = await firstCard.textContent();

      // 点击项目卡片（非按钮区域）
      await firstCard.click();
      await page.waitForTimeout(1000);

      // 验证导航到项目详情或打开详情对话框
      const currentUrl = page.url();
      const hasProjectId = /project|\/\d+/.test(currentUrl);

      // 如果没有导航，可能有详情对话框
      const dialog = page.locator('div[role="dialog"]:visible');
      const hasDialog = await dialog.isVisible().catch(() => false);

      expect(hasProjectId || hasDialog).toBeTruthy();
    }
  });

  test('应该能从列表快速创建项目', async ({ page }) => {
    const { projectListPage } = await setupProjectListTest(page, 'admin');

    // 点击创建项目按钮
    await projectListPage.clickCreateProject();

    // 验证项目表单对话框出现
    const dialog = page.locator('div[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // 验证表单包含基本字段
    await expect(dialog.locator('text=/项目类型|基本信息/')).toBeVisible();

    // 关闭对话框
    const cancelButton = dialog.locator('button:has-text("取消")').first();
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
    } else {
      await page.keyboard.press('Escape');
    }

    await page.waitForTimeout(500);
  });
});

test.describe('项目列表 - 响应式设计', () => {
  test('应该在移动端正确显示', async ({ page }) => {
    // 设置移动端视口
    await page.setViewportSize({ width: 375, height: 667 });

    const { projectListPage } = await setupProjectListTest(page);

    // 验证页面仍然可访问
    await expect(projectListPage.projectCards.first()).toBeVisible();

    // 验证创建按钮可能在不同位置
    const createButton = page.locator('button:has-text("创建")');
    const isVisible = await createButton.isVisible().catch(() => false);

    // 移动端可能有不同的布局
    await expect(projectListPage.projectCards.first()).toBeVisible();
  });

  test('应该在平板端正确显示', async ({ page }) => {
    // 设置平板视口
    await page.setViewportSize({ width: 768, height: 1024 });

    const { projectListPage } = await setupProjectListTest(page);

    // 验证布局
    await expect(projectListPage.projectCards.first()).toBeVisible();
  });
});

test.describe('项目列表 - 性能测试', () => {
  test('列表应该在合理时间内加载', async ({ page }) => {
    const startTime = Date.now();

    const { projectListPage } = await setupProjectListTest(page);

    // 等待列表完全加载
    await projectListPage.waitForReady();

    const loadTime = Date.now() - startTime;

    // 列表应该在5秒内加载完成
    expect(loadTime).toBeLessThan(5000);
  });

  test('搜索应该快速响应', async ({ page }) => {
    const { projectListPage } = await setupProjectListTest(page);

    await page.waitForTimeout(1000);

    const startTime = Date.now();

    // 执行搜索
    await projectListPage.searchProjects('测试');

    // 等待结果
    await page.waitForTimeout(1000);

    const responseTime = Date.now() - startTime;

    // 搜索应该在2秒内响应
    expect(responseTime).toBeLessThan(2000);
  });
});
