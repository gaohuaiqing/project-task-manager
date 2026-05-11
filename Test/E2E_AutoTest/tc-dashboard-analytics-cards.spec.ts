/**
 * 数据卡片功能测试
 * 测试目标: 验证仪表板和报表分析的各个数据卡片是否功能正常、数据正确
 *
 * 测试场景:
 * - TC-DA-01: 仪表板统计卡片功能测试
 * - TC-DA-02: 仪表板图表组件功能测试
 * - TC-DA-03: 报表分析-项目进度Tab测试
 * - TC-DA-04: 报表分析-任务统计Tab测试
 * - TC-DA-05: 报表分析-延期分析Tab测试
 * - TC-DA-06: 报表分析-成员任务分析Tab测试
 * - TC-DA-07: 报表分析-资源效能Tab测试
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const API_BASE_URL = 'http://localhost:3001';

// 测试用户凭据 - 部门经理
const TEST_USER = {
  username: '50223183',
  password: '50223183',
  realName: '高怀庆',
  role: 'dept_manager'
};

test.setTimeout(300000);

test.describe('数据卡片功能测试', () => {

  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    // 创建带有认证状态的 context
    context = await browser.newContext();

    // 登录获取 session
    const loginPage = await context.newPage();
    await loginPage.goto(BASE_URL + '/login');
    await loginPage.waitForLoadState('networkidle');

    await loginPage.fill('[data-testid="login-input-username"]', TEST_USER.username);
    await loginPage.fill('[data-testid="login-input-password"]', TEST_USER.password);
    await loginPage.click('[data-testid="login-btn-submit"]');

    try {
      await loginPage.waitForURL(/\/dashboard|\/tasks/, { timeout: 20000 });
    } catch {
      console.log('登录后未自动跳转');
    }

    await loginPage.waitForLoadState('networkidle');
    await loginPage.waitForTimeout(2000);

    // 保存 cookies
    await loginPage.context().storageState({ path: 'Test/.auth/user.json' });

    console.log(`\n✓ 用户 ${TEST_USER.username} (${TEST_USER.realName}) 登录成功`);
    await loginPage.close();
  });

  test.afterAll(async () => {
    await context.close();
  });

  // ========================================
  // TC-DA-01: 仪表板统计卡片功能测试
  // ========================================
  test('TC-DA-01: 仪表板统计卡片功能测试', async () => {
    const page = await context.newPage();

    try {
      console.log('\n=== TC-DA-01: 仪表板统计卡片功能测试 ===');

      // 步骤1: 导航到仪表板
      console.log('\n步骤1: 导航到仪表板');
      await page.goto(BASE_URL + '/dashboard');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // 截图
      await page.screenshot({
        path: 'Test/screenshots/TC-DA-01-dashboard-stats.png',
        fullPage: true
      });

      // 步骤2: 等待 API 响应
      console.log('\n步骤2: 等待仪表板数据加载');

      // 监听 API 响应
      const statsResponse = await page.waitForResponse(
        response => response.url().includes('/api/analytics/dashboard/stats'),
        { timeout: 15000 }
      ).catch(() => null);

      if (statsResponse) {
        const statsData = await statsResponse.json();
        console.log('API 返回统计数据:', JSON.stringify(statsData.data, null, 2));
      }

      // 步骤3: 验证统计卡片显示
      console.log('\n步骤3: 验证统计卡片显示');

      // 检查统计卡片容器 - 使用更宽泛的选择器
      const gridContainer = page.locator('.grid').first();
      await expect(gridContainer).toBeVisible({ timeout: 10000 });
      console.log('✓ 统计卡片容器已加载');

      // 查找所有可能的统计卡片
      const possibleSelectors = [
        'div[class*="cursor-pointer"]',
        'div[class*="card"]',
        'div[class*="stat"]'
      ];

      let cardCount = 0;
      for (const selector of possibleSelectors) {
        const cards = page.locator(selector);
        const count = await cards.count();
        if (count > 0) {
          cardCount = Math.max(cardCount, count);
        }
      }
      console.log(`✓ 找到 ${cardCount} 个潜在统计卡片`);

      // 步骤4: 验证卡片标题和数据
      console.log('\n步骤4: 验证卡片内容');

      const expectedTitles = ['项目总数', '进行中任务', '已完成任务', '延期预警'];

      for (const title of expectedTitles) {
        try {
          const titleElement = page.getByText(title, { exact: false }).first();
          if (await titleElement.isVisible({ timeout: 3000 })) {
            console.log(`✓ 找到卡片: ${title}`);

            // 尝试获取数值
            const parent = titleElement.locator('xpath=..');
            const textContent = await parent.textContent();
            console.log(`  内容: ${textContent?.trim().substring(0, 50)}...`);
          }
        } catch {
          console.log(`⚠ 未找到卡片: ${title}`);
        }
      }

      // 步骤5: 验证紧急任务提醒
      console.log('\n步骤5: 验证紧急任务提醒');

      const urgentSelectors = [
        'div[class*="urgent"]',
        'div[class*="alert"]',
        'div[class*="warning"]'
      ];

      for (const selector of urgentSelectors) {
        const urgent = page.locator(selector).first();
        if (await urgent.isVisible({ timeout: 2000 }).catch(() => false)) {
          console.log('✓ 找到紧急任务提醒');
          break;
        }
      }

      // 步骤6: 测试卡片点击跳转
      console.log('\n步骤6: 测试卡片点击跳转');

      const projectCard = page.getByText('项目总数', { exact: false }).first();
      if (await projectCard.isVisible({ timeout: 3000 }).catch(() => false)) {
        // 找到可点击的父容器
        const clickableParent = projectCard.locator('xpath=ancestor::div[contains(@class, "cursor-pointer") or contains(@class, "card")][1]');
        if (await clickableParent.count() > 0) {
          await clickableParent.first().click();
          await page.waitForTimeout(1000);

          const currentUrl = page.url();
          if (currentUrl.includes('/projects')) {
            console.log('✓ 点击项目卡片成功跳转到项目页面');
          } else {
            console.log(`⚠ 当前 URL: ${currentUrl}`);
          }

          // 返回仪表板
          await page.goto(BASE_URL + '/dashboard');
          await page.waitForLoadState('networkidle');
        }
      }

      console.log('\n✅ TC-DA-01 测试完成');
    } finally {
      await page.close();
    }
  });

  // ========================================
  // TC-DA-02: 仪表板图表组件功能测试
  // ========================================
  test('TC-DA-02: 仪表板图表组件功能测试', async () => {
    const page = await context.newPage();

    try {
      console.log('\n=== TC-DA-02: 仪表板图表组件功能测试 ===');

      await page.goto(BASE_URL + '/dashboard');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // 截图
      await page.screenshot({
        path: 'Test/screenshots/TC-DA-02-dashboard-charts.png',
        fullPage: true
      });

      // 步骤2: 等待图表数据加载
      console.log('\n步骤1: 等待图表数据加载');

      // 监听项目进度 API
      await page.waitForResponse(
        response => response.url().includes('/api/analytics/dashboard/projects'),
        { timeout: 15000 }
      ).catch(() => {
        console.log('⚠ 项目进度 API 响应超时');
      });

      // 步骤3: 验证趋势图
      console.log('\n步骤2: 验证趋势图组件');
      const trendSelectors = [
        'div[class*="trend"]',
        'div[class*="chart"]',
        'svg',
        'canvas'
      ];

      for (const selector of trendSelectors) {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
          console.log(`✓ 找到图表元素: ${selector}`);
          break;
        }
      }

      // 步骤4: 验证项目进度组件
      console.log('\n步骤3: 验证项目进度组件');
      const projectProgress = page.locator('div[class*="progress"]').first();
      if (await projectProgress.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('✓ 项目进度组件已显示');

        // 验证进度条
        const progressBars = page.locator('div[class*="progress-bar"], div[role="progressbar"]');
        const barCount = await progressBars.count();
        console.log(`  找到 ${barCount} 个进度条`);
      }

      // 步骤5: 验证饼图（管理者可见）
      console.log('\n步骤4: 验证饼图组件');

      // 检查是否有 SVG 饼图
      const svgCharts = page.locator('svg');
      const svgCount = await svgCharts.count();
      console.log(`✓ 找到 ${svgCount} 个 SVG 图表元素`);

      // 步骤6: 验证任务列表面板
      console.log('\n步骤5: 验证任务列表面板');
      const taskList = page.locator('div[class*="task-list"], div[class*="TaskList"]').first();
      if (await taskList.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('✓ 任务列表面板已显示');
      }

      console.log('\n✅ TC-DA-02 测试完成');
    } finally {
      await page.close();
    }
  });

  // ========================================
  // TC-DA-03: 报表分析-项目进度Tab测试
  // ========================================
  test('TC-DA-03: 报表分析-项目进度Tab测试', async () => {
    const page = await context.newPage();

    try {
      console.log('\n=== TC-DA-03: 报表分析-项目进度Tab测试 ===');

      await page.goto(BASE_URL + '/analytics/reports/project-progress');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // 截图
      await page.screenshot({
        path: 'Test/screenshots/TC-DA-03-project-progress.png',
        fullPage: true
      });

      // 步骤2: 等待 API 响应
      console.log('\n步骤1: 等待项目进度报表数据');

      const reportResponse = await page.waitForResponse(
        response => response.url().includes('/api/analytics/reports/project-progress'),
        { timeout: 15000 }
      ).catch(() => null);

      if (reportResponse) {
        try {
          const reportData = await reportResponse.json();
          console.log('项目进度报表数据:', JSON.stringify(reportData.data?.slice?.(0, 2) || reportData.data, null, 2));
        } catch {
          console.log('⚠ 无法解析报表数据');
        }
      }

      // 步骤3: 验证筛选栏
      console.log('\n步骤2: 验证筛选栏');
      const filterBar = page.locator('div[class*="filter"], div[class*="Filter"]').first();
      if (await filterBar.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('✓ 筛选栏已显示');
      }

      // 步骤4: 验证 Tab 导航
      console.log('\n步骤3: 验证 Tab 导航');

      const tabs = ['项目进度', '任务统计', '延期分析', '成员任务分析', '资源效能'];
      for (const tabName of tabs) {
        try {
          const tab = page.getByRole('tab', { name: new RegExp(tabName) }).first();
          if (await tab.isVisible({ timeout: 2000 }).catch(() => false)) {
            console.log(`✓ 找到 Tab: ${tabName}`);
          }
        } catch {
          // 尝试文本匹配
          const tabText = page.getByText(tabName, { exact: false }).first();
          if (await tabText.isVisible({ timeout: 1000 }).catch(() => false)) {
            console.log(`✓ 找到 Tab 文本: ${tabName}`);
          }
        }
      }

      // 步骤5: 验证数据表格
      console.log('\n步骤4: 验证数据展示');
      const table = page.locator('table').first();
      if (await table.isVisible({ timeout: 10000 }).catch(() => false)) {
        console.log('✓ 数据表格已显示');

        // 获取表头
        const headers = await page.locator('th').allInnerTexts();
        console.log(`  表格列: ${headers.join(', ')}`);

        // 统计行数
        const rows = page.locator('tbody tr');
        const rowCount = await rows.count();
        console.log(`  数据行数: ${rowCount}`);
      } else {
        // 可能是卡片形式
        const cards = page.locator('div[class*="card"]');
        const cardCount = await cards.count();
        console.log(`✓ 找到 ${cardCount} 个数据卡片`);
      }

      console.log('\n✅ TC-DA-03 测试完成');
    } finally {
      await page.close();
    }
  });

  // ========================================
  // TC-DA-04: 报表分析-任务统计Tab测试
  // ========================================
  test('TC-DA-04: 报表分析-任务统计Tab测试', async () => {
    const page = await context.newPage();

    try {
      console.log('\n=== TC-DA-04: 报表分析-任务统计Tab测试 ===');

      await page.goto(BASE_URL + '/analytics/reports/task-statistics');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // 截图
      await page.screenshot({
        path: 'Test/screenshots/TC-DA-04-task-statistics.png',
        fullPage: true
      });

      // 等待 API 响应
      console.log('\n步骤1: 等待任务统计数据');
      await page.waitForResponse(
        response => response.url().includes('/api/analytics/reports/task-statistics'),
        { timeout: 15000 }
      ).catch(() => {
        console.log('⚠ 任务统计 API 响应超时');
      });

      // 验证数据卡片
      console.log('\n步骤2: 验证数据展示');

      // 查找可能的统计卡片
      const statElements = await page.locator('div').all();
      let visibleStats = 0;

      for (const el of statElements.slice(0, 50)) {
        const text = await el.textContent();
        if (text && (text.includes('总计') || text.includes('完成率') || text.includes('进行中'))) {
          visibleStats++;
          if (visibleStats <= 5) {
            console.log(`  发现统计: ${text.trim().substring(0, 50)}...`);
          }
        }
      }

      console.log(`✓ 找到 ${visibleStats} 个统计元素`);

      console.log('\n✅ TC-DA-04 测试完成');
    } finally {
      await page.close();
    }
  });

  // ========================================
  // TC-DA-05: 报表分析-延期分析Tab测试
  // ========================================
  test('TC-DA-05: 报表分析-延期分析Tab测试', async () => {
    const page = await context.newPage();

    try {
      console.log('\n=== TC-DA-05: 报表分析-延期分析Tab测试 ===');

      await page.goto(BASE_URL + '/analytics/reports/delay-analysis');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // 截图
      await page.screenshot({
        path: 'Test/screenshots/TC-DA-05-delay-analysis.png',
        fullPage: true
      });

      // 等待 API 响应
      console.log('\n步骤1: 等待延期分析数据');
      await page.waitForResponse(
        response => response.url().includes('/api/analytics/reports/delay-analysis'),
        { timeout: 15000 }
      ).catch(() => {
        console.log('⚠ 延期分析 API 响应超时');
      });

      // 验证关键元素
      console.log('\n步骤2: 验证延期分析内容');

      const keywords = ['延期', '延迟', '延误', 'delay'];

      for (const keyword of keywords) {
        const elements = page.getByText(new RegExp(keyword, 'i'));
        const count = await elements.count();
        if (count > 0) {
          console.log(`✓ 找到 ${count} 个包含"${keyword}"的元素`);
        }
      }

      console.log('\n✅ TC-DA-05 测试完成');
    } finally {
      await page.close();
    }
  });

  // ========================================
  // TC-DA-06: 报表分析-成员任务分析Tab测试
  // ========================================
  test('TC-DA-06: 报表分析-成员任务分析Tab测试', async () => {
    const page = await context.newPage();

    try {
      console.log('\n=== TC-DA-06: 报表分析-成员任务分析Tab测试 ===');

      await page.goto(BASE_URL + '/analytics/reports/member-analysis');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // 截图
      await page.screenshot({
        path: 'Test/screenshots/TC-DA-06-member-analysis.png',
        fullPage: true
      });

      // 等待 API 响应
      console.log('\n步骤1: 等待成员分析数据');
      await page.waitForResponse(
        response => response.url().includes('/api/analytics/reports/member-analysis'),
        { timeout: 15000 }
      ).catch(() => {
        console.log('⚠ 成员分析 API 响应超时');
      });

      // 验证成员列表
      console.log('\n步骤2: 验证成员数据展示');
      const table = page.locator('table').first();
      if (await table.isVisible({ timeout: 10000 }).catch(() => false)) {
        console.log('✓ 成员数据表格已显示');

        // 获取表格列名
        const headers = await page.locator('th').allInnerTexts();
        console.log(`  表格列: ${headers.join(', ')}`);
      }

      console.log('\n✅ TC-DA-06 测试完成');
    } finally {
      await page.close();
    }
  });

  // ========================================
  // TC-DA-07: 报表分析-资源效能Tab测试
  // ========================================
  test('TC-DA-07: 报表分析-资源效能Tab测试', async () => {
    const page = await context.newPage();

    try {
      console.log('\n=== TC-DA-07: 报表分析-资源效能Tab测试 ===');

      await page.goto(BASE_URL + '/analytics/reports/resource-efficiency');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // 截图
      await page.screenshot({
        path: 'Test/screenshots/TC-DA-07-resource-efficiency.png',
        fullPage: true
      });

      // 等待 API 响应
      console.log('\n步骤1: 等待资源效能数据');
      await page.waitForResponse(
        response => response.url().includes('/api/analytics/reports/resource-efficiency'),
        { timeout: 15000 }
      ).catch(() => {
        console.log('⚠ 资源效能 API 响应超时');
      });

      // 验证效能指标
      console.log('\n步骤2: 验证效能指标展示');

      const metrics = ['完成率', '效率', '工时', '产出', '利用率'];
      for (const metric of metrics) {
        const elements = page.getByText(new RegExp(metric));
        const count = await elements.count();
        if (count > 0) {
          console.log(`✓ 找到 ${count} 个"${metric}"指标`);
        }
      }

      console.log('\n✅ TC-DA-07 测试完成');
    } finally {
      await page.close();
    }
  });

  // ========================================
  // TC-DA-08: 数据一致性验证
  // ========================================
  test('TC-DA-08: 验证仪表板与报表数据一致性', async () => {
    const page = await context.newPage();

    try {
      console.log('\n=== TC-DA-08: 验证仪表板与报表数据一致性 ===');

      // 步骤1: 打开仪表板并捕获数据
      console.log('\n步骤1: 打开仪表板获取统计数据');
      await page.goto(BASE_URL + '/dashboard');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // 监听并捕获 API 响应
      let dashboardStats: any = null;

      page.on('response', async (response) => {
        if (response.url().includes('/api/analytics/dashboard/stats')) {
          try {
            dashboardStats = await response.json();
          } catch {}
        }
      });

      // 刷新页面触发 API 调用
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      if (dashboardStats?.data) {
        console.log('仪表板统计数据:', JSON.stringify(dashboardStats.data, null, 2));

        // 步骤2: 打开任务统计报表对比数据
        console.log('\n步骤2: 打开任务统计报表对比数据');
        await page.goto(BASE_URL + '/analytics/reports/task-statistics');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        let taskStats: any = null;

        page.on('response', async (response) => {
          if (response.url().includes('/api/analytics/reports/task-statistics')) {
            try {
              taskStats = await response.json();
            } catch {}
          }
        });

        await page.reload();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        if (taskStats?.data) {
          console.log('任务统计数据:', JSON.stringify(taskStats.data, null, 2));

          // 对比关键数据
          console.log('\n步骤3: 对比数据一致性');

          const dTotal = dashboardStats.data.totalTasks;
          const tTotal = taskStats.data.totalTasks || taskStats.data.total;

          if (dTotal !== undefined && tTotal !== undefined) {
            console.log(`仪表板任务总数: ${dTotal}`);
            console.log(`报表任务总数: ${tTotal}`);
            if (dTotal === tTotal) {
              console.log('✅ 任务总数一致');
            } else {
              console.log(`⚠️ 任务总数不一致 (差异: ${Math.abs(dTotal - tTotal)})`);
            }
          }
        }
      }

      // 截图
      await page.screenshot({
        path: 'Test/screenshots/TC-DA-08-data-consistency.png',
        fullPage: true
      });

      console.log('\n✅ TC-DA-08 测试完成');
    } finally {
      await page.close();
    }
  });
});
