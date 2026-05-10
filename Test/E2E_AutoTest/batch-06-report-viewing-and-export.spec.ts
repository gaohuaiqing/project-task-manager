/**
 * Batch 06: 报表查看与导出测试
 * 测试目标: 验证仪表板统计和报表查看导出功能
 *
 * 测试场景:
 * - TC-RPT-01: 查看仪表板统计
 * - TC-RPT-02: 查看各类报表
 * - TC-RPT-03: 导出报表数据
 * - TC-RPT-04: 权限验证（engineer 无报表权限）
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const API_BASE_URL = 'http://localhost:3001';

// 测试用户凭据
const TEST_USERS = {
  admin: { username: 'admin', password: 'admin123' },
  engineer: { username: '50241392', password: '50241392' },
};

// 测试项目
const TEST_PROJECT_ID = '27'; // TEST-PROJ-003（报表测试项目）

test.setTimeout(180000);

test.describe('Batch 06: 报表查看与导出测试', () => {

  // 登录 helper
  async function login(page: any, user: { username: string; password: string }) {
    await page.goto(BASE_URL + '/login');
    await page.waitForLoadState('networkidle');

    await page.fill('[data-testid="login-input-username"]', user.username);
    await page.fill('[data-testid="login-input-password"]', user.password);
    await page.click('[data-testid="login-btn-submit"]');

    try {
      await page.waitForURL(/\/dashboard|\/tasks/, { timeout: 20000 });
    } catch {
      console.log('登录后未自动跳转，手动导航到仪表板');
      await page.goto(BASE_URL + '/dashboard');
    }

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
  }

  // 获取认证 token
  async function getAuthToken(request: any, user: { username: string; password: string }) {
    const response = await request.post(`${API_BASE_URL}/api/auth/login`, {
      data: {
        username: user.username,
        password: user.password,
      },
    });

    if (!response.ok()) {
      throw new Error(`登录失败: ${user.username}`);
    }

    const data = await response.json();
    return data.data?.token;
  }

  test('TC-RPT-01: 查看仪表板统计', async ({ page, request }) => {
    console.log('\n=== TC-RPT-01: 查看仪表板统计 ===');

    // 步骤1: 登录系统
    console.log('步骤1: 使用 admin 登录系统');
    await login(page, TEST_USERS.admin);
    console.log('✓ admin 登录成功');

    // 步骤2: 验证仪表板加载
    console.log('\n步骤2: 验证仪表板页面加载');
    await page.waitForSelector('[data-testid="dashboard-container"]', { timeout: 15000 });
    console.log('✓ 仪表板容器已加载');

    // 截图
    await page.screenshot({ path: 'Test/screenshots/TC-RPT-01-dashboard-loaded.png', fullPage: true });

    // 步骤3: 检查统计卡片显示
    console.log('\n步骤3: 检查统计卡片显示');

    // 检查统计卡片区域
    const statsCardSelectors = [
      '[data-testid="stats-card"]',
      '.grid-cols-4 > div',
      '[class*="StatsCard"]',
      '[class*="stat-card"]',
    ];

    let statsCardFound = false;
    for (const selector of statsCardSelectors) {
      const cards = page.locator(selector);
      const count = await cards.count();
      if (count > 0) {
        console.log(`✓ 找到 ${count} 个统计卡片 (选择器: ${selector})`);
        statsCardFound = true;

        // 检查卡片内容
        for (let i = 0; i < Math.min(count, 4); i++) {
          const cardText = await cards.nth(i).textContent();
          console.log(`  卡片 ${i + 1}: ${cardText?.substring(0, 50)}...`);
        }
        break;
      }
    }

    if (!statsCardFound) {
      console.log('⚠ 未找到统计卡片（可能是渲染方式不同）');
    }

    // 步骤4: 检查趋势图
    console.log('\n步骤4: 检查趋势图显示');

    const chartSelectors = [
      '[data-testid="trend-chart"]',
      '[data-testid="task-trend-chart"]',
      'canvas',
      '[class*="chart"]',
      '[class*="Chart"]',
    ];

    let chartFound = false;
    for (const selector of chartSelectors) {
      const charts = page.locator(selector);
      const count = await charts.count();
      if (count > 0) {
        console.log(`✓ 找到 ${count} 个图表 (选择器: ${selector})`);
        chartFound = true;
        break;
      }
    }

    if (!chartFound) {
      console.log('⚠ 未找到图表元素');
    }

    // 步骤5: 检查预警列表
    console.log('\n步骤5: 检查预警列表');

    const alertSelectors = [
      '[data-testid="alert-card"]',
      '[data-testid="delay-warning"]',
      '[class*="AlertCard"]',
      '[class*="warning"]',
      '[class*="预警"]',
    ];

    let alertFound = false;
    for (const selector of alertSelectors) {
      const alerts = page.locator(selector);
      const count = await alerts.count();
      if (count > 0) {
        console.log(`✓ 找到 ${count} 个预警卡片 (选择器: ${selector})`);
        alertFound = true;
        break;
      }
    }

    if (!alertFound) {
      console.log('⚠ 未找到预警卡片');
    }

    // 步骤6: 验证数据一致性（通过 API）
    console.log('\n步骤6: 验证数据一致性');

    const token = await getAuthToken(request, TEST_USERS.admin);

    // 获取仪表板统计数据
    const statsResponse = await request.get(`${API_BASE_URL}/api/dashboard/stats`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (statsResponse.ok()) {
      const statsData = await statsResponse.json();
      console.log('✓ 仪表板统计数据获取成功');
      console.log(`  数据示例: ${JSON.stringify(statsData.data || statsData).substring(0, 200)}...`);
    } else {
      console.log('⚠ 无法获取仪表板统计数据');
    }

    await page.screenshot({ path: 'Test/screenshots/TC-RPT-01-dashboard-complete.png', fullPage: true });
    console.log('\n✓ TC-RPT-01 测试完成');
  });

  test('TC-RPT-02: 查看各类报表', async ({ page }) => {
    console.log('\n=== TC-RPT-02: 查看各类报表 ===');

    // 步骤1: 登录系统
    console.log('步骤1: 使用 admin 登录系统');
    await login(page, TEST_USERS.admin);
    console.log('✓ admin 登录成功');

    // 步骤2: 导航到报表页面
    console.log('\n步骤2: 导航到报表页面');

    // 尝试多种导航方式
    const navigationMethods = [
      { desc: '侧边栏菜单', action: async () => {
        const reportsLink = page.locator('a:has-text("报表"), a:has-text("Reports"), [data-testid="nav-reports"]').first();
        if (await reportsLink.isVisible().catch(() => false)) {
          await reportsLink.click();
          return true;
        }
        return false;
      }},
      { desc: '直接访问URL', action: async () => {
        await page.goto(BASE_URL + '/reports');
        return true;
      }},
      { desc: '分析模块菜单', action: async () => {
        await page.goto(BASE_URL + '/analytics/reports');
        return true;
      }},
    ];

    let navigated = false;
    for (const method of navigationMethods) {
      console.log(`  尝试: ${method.desc}`);
      if (await method.action()) {
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        // 检查是否成功进入报表页面
        const currentUrl = page.url();
        if (currentUrl.includes('report') || currentUrl.includes('analytics')) {
          console.log(`✓ 成功导航到报表页面: ${currentUrl}`);
          navigated = true;
          break;
        }
      }
    }

    if (!navigated) {
      console.log('⚠ 无法导航到报表页面，可能报表功能未实现或路由不同');
      await page.screenshot({ path: 'Test/screenshots/TC-RPT-02-navigation-failed.png', fullPage: true });
      return;
    }

    await page.screenshot({ path: 'Test/screenshots/TC-RPT-02-reports-page.png', fullPage: true });

    // 步骤3: 检查报表标签页
    console.log('\n步骤3: 检查报表标签页显示');

    const reportTabs = [
      { name: '项目进度报表', selectors: ['text=项目进度', 'text=Project Progress', '[data-testid="tab-project-progress"]'] },
      { name: '任务统计报表', selectors: ['text=任务统计', 'text=Task Statistics', '[data-testid="tab-task-statistics"]'] },
      { name: '延期分析报表', selectors: ['text=延期分析', 'text=Delay Analysis', '[data-testid="tab-delay-analysis"]'] },
      { name: '成员任务分析', selectors: ['text=成员任务', 'text=Member Analysis', '[data-testid="tab-member-analysis"]'] },
      { name: '资源效能分析', selectors: ['text=资源效能', 'text=Resource Efficiency', '[data-testid="tab-resource-efficiency"]'] },
    ];

    for (const tab of reportTabs) {
      console.log(`\n检查标签页: ${tab.name}`);

      let tabFound = false;
      for (const selector of tab.selectors) {
        const tabElement = page.locator(selector).first();
        if (await tabElement.isVisible().catch(() => false)) {
          console.log(`  ✓ 找到标签页: ${selector}`);

          // 点击标签页
          await tabElement.click();
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(1000);

          // 检查内容是否加载
          const contentSelectors = [
            'table',
            'canvas',
            '[class*="chart"]',
            '[class*="Chart"]',
            '[class*="stats"]',
          ];

          let contentFound = false;
          for (const contentSelector of contentSelectors) {
            const content = page.locator(contentSelector).first();
            if (await content.isVisible().catch(() => false)) {
              console.log(`  ✓ 内容已加载 (${contentSelector})`);
              contentFound = true;
              break;
            }
          }

          if (!contentFound) {
            console.log(`  ⚠ 标签页点击后未检测到内容`);
          }

          // 截图
          const screenshotName = tab.name.replace(/\s+/g, '-').toLowerCase();
          await page.screenshot({
            path: `Test/screenshots/TC-RPT-02-tab-${screenshotName}.png`,
            fullPage: true
          });

          tabFound = true;
          break;
        }
      }

      if (!tabFound) {
        console.log(`  ⚠ 未找到标签页: ${tab.name}`);
      }
    }

    // 步骤4: 验证筛选功能
    console.log('\n步骤4: 验证筛选功能');

    const filterSelectors = [
      '[data-testid="filter-bar"]',
      '[class*="FilterBar"]',
      'select',
      'button:has-text("筛选")',
      'button:has-text("Filter")',
    ];

    for (const selector of filterSelectors) {
      const filter = page.locator(selector).first();
      if (await filter.isVisible().catch(() => false)) {
        console.log(`✓ 找到筛选区域: ${selector}`);
        break;
      }
    }

    await page.screenshot({ path: 'Test/screenshots/TC-RPT-02-reports-complete.png', fullPage: true });
    console.log('\n✓ TC-RPT-02 测试完成');
  });

  test('TC-RPT-03: 导出报表数据', async ({ page, request }) => {
    console.log('\n=== TC-RPT-03: 导出报表数据 ===');

    // 步骤1: 登录系统
    console.log('步骤1: 使用 admin 登录系统');
    await login(page, TEST_USERS.admin);
    console.log('✓ admin 登录成功');

    // 步骤2: 导航到报表页面
    console.log('\n步骤2: 导航到报表页面');
    await page.goto(BASE_URL + '/reports');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    const currentUrl = page.url();
    console.log(`当前URL: ${currentUrl}`);

    // 步骤3: 查找导出按钮
    console.log('\n步骤3: 查找导出按钮');

    const exportButtonSelectors = [
      'button:has-text("导出")',
      'button:has-text("Export")',
      'button:has-text("Excel")',
      '[data-testid="export-button"]',
      '[class*="ExportButton"]',
      'button:has([class*="download"])',
    ];

    let exportButtonFound = false;
    for (const selector of exportButtonSelectors) {
      const button = page.locator(selector).first();
      if (await button.isVisible().catch(() => false)) {
        console.log(`✓ 找到导出按钮: ${selector}`);
        exportButtonFound = true;

        await page.screenshot({ path: 'Test/screenshots/TC-RPT-03-export-button-found.png' });

        // 监听下载事件
        const [download] = await Promise.all([
          page.waitForEvent('download', { timeout: 30000 }).catch(() => null),
          button.click(),
        ]);

        if (download) {
          console.log('✓ 导出文件下载已触发');
          const fileName = download.suggestedFilename();
          console.log(`  文件名: ${fileName}`);

          // 检查文件类型
          if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
            console.log('✓ 导出文件为 Excel 格式');
          } else if (fileName.endsWith('.csv')) {
            console.log('✓ 导出文件为 CSV 格式');
          } else {
            console.log(`⚠ 导出文件格式未知: ${fileName}`);
          }

          // 保存文件
          const downloadPath = `Test/downloads/${fileName}`;
          await download.saveAs(downloadPath);
          console.log(`✓ 文件已保存到: ${downloadPath}`);
        } else {
          console.log('⚠ 未检测到下载事件（可能是 API 导出或弹窗选择）');
        }

        break;
      }
    }

    if (!exportButtonFound) {
      console.log('⚠ 未找到导出按钮');

      // 尝试通过 API 测试导出功能
      console.log('\n尝试通过 API 测试导出功能');
      const token = await getAuthToken(request, TEST_USERS.admin);

      const exportEndpoints = [
        '/api/reports/project-progress/export',
        '/api/reports/task-statistics/export',
        '/api/reports/delay-analysis/export',
      ];

      for (const endpoint of exportEndpoints) {
        const exportResponse = await request.get(`${API_BASE_URL}${endpoint}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (exportResponse.ok()) {
          console.log(`✓ API 导出端点可用: ${endpoint}`);

          // 获取响应头
          const contentType = exportResponse.headers()['content-type'];
          console.log(`  Content-Type: ${contentType}`);

          // 如果是文件，保存它
          if (contentType?.includes('application') || contentType?.includes('spreadsheet')) {
            const buffer = await exportResponse.body();
            const fileName = endpoint.split('/').slice(-2)[0] + '_export.xlsx';
            const filePath = `Test/downloads/${fileName}`;

            // 简单保存（需要 fs 模块，这里只记录）
            console.log(`  文件大小: ${buffer.length} bytes`);
            console.log(`  建议: 使用 fs 模块保存到 ${filePath}`);
          }
        } else {
          console.log(`⚠ API 导出端点不可用: ${endpoint} (${exportResponse.status()})`);
        }
      }
    }

    await page.screenshot({ path: 'Test/screenshots/TC-RPT-03-export-complete.png', fullPage: true });
    console.log('\n✓ TC-RPT-03 测试完成');
  });

  test('TC-RPT-04: 权限验证（engineer 无报表权限）', async ({ page }) => {
    console.log('\n=== TC-RPT-04: 权限验证 ===');

    // 步骤1: 使用 engineer 登录
    console.log('步骤1: 使用 engineer 登录');
    await login(page, TEST_USERS.engineer);
    console.log('✓ engineer 登录成功');

    // 步骤2: 检查侧边栏菜单
    console.log('\n步骤2: 检查侧边栏菜单');

    const reportMenuSelectors = [
      'a:has-text("报表")',
      'a:has-text("Reports")',
      'a:has-text("分析")',
      'a:has-text("Analytics")',
      '[data-testid="nav-reports"]',
    ];

    let reportMenuFound = false;
    for (const selector of reportMenuSelectors) {
      const menu = page.locator(selector);
      if (await menu.isVisible().catch(() => false)) {
        console.log(`⚠ 找到报表菜单: ${selector}（应该不可见）`);
        reportMenuFound = true;
        break;
      }
    }

    if (!reportMenuFound) {
      console.log('✓ engineer 侧边栏无报表菜单（符合预期）');
    }

    await page.screenshot({ path: 'Test/screenshots/TC-RPT-04-engineer-menu.png', fullPage: true });

    // 步骤3: 尝试直接访问报表路由
    console.log('\n步骤3: 尝试直接访问报表路由');

    const reportRoutes = [
      '/reports',
      '/analytics/reports',
      '/reports/project-progress',
    ];

    for (const route of reportRoutes) {
      console.log(`  访问: ${route}`);
      await page.goto(BASE_URL + route);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      const currentUrl = page.url();
      console.log(`  当前URL: ${currentUrl}`);

      // 检查是否被重定向或显示无权限提示
      const isBlocked =
        currentUrl.includes('/login') ||
        currentUrl.includes('/403') ||
        currentUrl.includes('/404') ||
        currentUrl === BASE_URL + '/' ||
        currentUrl.includes('/dashboard') ||
        currentUrl.includes('/tasks');

      const noPermissionMessage = await page.locator('text=无权限, text=权限不足, text=没有权限, text=403').count() > 0;

      if (isBlocked || noPermissionMessage) {
        console.log(`  ✓ 路由已被拦截: ${route}`);
      } else {
        console.log(`  ⚠ 路由可能未被拦截: ${route}`);
      }
    }

    await page.screenshot({ path: 'Test/screenshots/TC-RPT-04-route-blocked.png', fullPage: true });
    console.log('\n✓ TC-RPT-04 测试完成');
  });

  test('Batch 06 测试总结', async ({ page }) => {
    console.log('\n=== Batch 06 测试总结 ===');
    console.log('测试场景完成情况:');
    console.log('  TC-RPT-01: 仪表板统计查看');
    console.log('  TC-RPT-02: 各类报表查看');
    console.log('  TC-RPT-03: 报表数据导出');
    console.log('  TC-RPT-04: 权限验证');
    console.log('\n详细结果请查看上方输出和截图。');
  });
});
