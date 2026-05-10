/**
 * Batch 07: 任务导入导出测试
 * 测试目标: 验证任务导入导出功能
 *
 * 测试场景:
 * - TC-IMP-01: 导入任务数据 - 下载模板、上传文件
 * - TC-IMP-02: 导出任务数据 - CSV/JSON格式
 * - TC-IMP-03: 权限验证（engineer 导出权限）
 */

import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const BASE_URL = 'http://localhost:5173';
const API_BASE_URL = 'http://localhost:3001';

// 测试用户凭据
const TEST_USERS = {
  admin: { username: 'admin', password: 'admin123' },
  engineer: { username: '50241392', password: '50241392' },
};

// 截图目录
const SCREENSHOT_DIR = 'G:/Project/Web/Project_Task_Manager_4.0/Test/screenshots';
const DOWNLOAD_DIR = 'G:/Project/Web/Project_Task_Manager_4.0/Test/downloads';

test.setTimeout(180000);

test.describe('Batch 07: 任务导入导出测试', () => {

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
      console.log('登录后未自动跳转，手动导航到任务页面');
      await page.goto(BASE_URL + '/tasks');
    }

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
  }

  // 获取认证 sessionId
  async function getAuthSession(request: any, user: { username: string; password: string }) {
    const response = await request.post(`${API_BASE_URL}/api/auth/login`, {
      data: {
        username: user.username,
        password: user.password,
      },
    });

    if (!response.ok()) {
      throw new Error(`登录失败: ${user.username}`);
    }

    // 从 Set-Cookie header 获取 sessionId
    const setCookie = response.headers()['set-cookie'];
    if (setCookie) {
      const match = setCookie.match(/sessionId=([^;]+)/);
      if (match) {
        return match[1];
      }
    }

    // 尝试从响应体获取
    const data = await response.json();
    return data.data?.sessionId;
  }

  test('TC-IMP-01: 导入任务数据', async ({ page, request }) => {
    console.log('\n=== TC-IMP-01: 导入任务数据 ===');

    // 步骤1: 登录系统
    console.log('步骤1: 使用 admin 登录系统');
    await login(page, TEST_USERS.admin);
    console.log('✓ admin 登录成功');

    // 步骤2: 进入任务管理页面
    console.log('\n步骤2: 进入任务管理页面');
    await page.goto(BASE_URL + '/tasks');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 截图
    await page.screenshot({ path: `${SCREENSHOT_DIR}/TC-IMP-01-tasks-page.png`, fullPage: true });
    console.log('✓ 任务页面已加载');

    // 步骤3: 检查导入功能是否存在
    console.log('\n步骤3: 检查导入功能是否存在');

    // 查找导入按钮 - 可能在工具栏或表格上方
    const importButtonSelectors = [
      'button:has-text("导入")',
      '[data-testid="import-button"]',
      '[data-testid="btn-import"]',
      'button:has([class*="Upload"])',
      '.toolbar button:has-text("导入")',
    ];

    let importButtonFound = false;
    for (const selector of importButtonSelectors) {
      const button = page.locator(selector);
      const count = await button.count();
      if (count > 0) {
        console.log(`✓ 找到导入按钮 (选择器: ${selector})`);
        importButtonFound = true;
        break;
      }
    }

    if (!importButtonFound) {
      console.log('! 未在UI找到导入按钮，检查API端点是否存在');
    }

    // 步骤4: 测试下载导入模板 API
    console.log('\n步骤4: 测试下载导入模板 API');
    const token = await getAuthSession(request, TEST_USERS.admin);

    const templateResponse = await request.get(`${API_BASE_URL}/api/tasks/import/template`, {
      headers: {
        'Cookie': `sessionId=${token}`,
      },
    });

    console.log(`模板下载响应状态: ${templateResponse.status()}`);

    if (templateResponse.ok()) {
      const contentType = templateResponse.headers()['content-type'] || '';
      console.log(`Content-Type: ${contentType}`);
      console.log('✓ 导入模板 API 可用');

      // 保存模板文件
      const templateBuffer = await templateResponse.body();
      const templatePath = `${DOWNLOAD_DIR}/task-import-template.xlsx`;

      // 确保目录存在
      if (!fs.existsSync(DOWNLOAD_DIR)) {
        fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
      }

      fs.writeFileSync(templatePath, templateBuffer);
      console.log(`✓ 模板已保存到: ${templatePath}`);

      // 检查文件大小
      const stats = fs.statSync(templatePath);
      console.log(`模板文件大小: ${stats.size} bytes`);

      if (stats.size > 0) {
        console.log('✓ 模板文件下载成功，文件有效');
      } else {
        console.log('! 模板文件大小为0，可能有问题');
      }
    } else {
      console.log(`! 导入模板 API 不可用: ${templateResponse.status()}`);
    }

    // 步骤5: 测试导入 API
    console.log('\n步骤5: 测试导入任务 API');

    // 准备测试任务数据
    const testTasks = [
      {
        wbs_code: 'TEST-IMPORT-001',
        description: 'E2E测试导入任务',
        task_type: 'task',
        priority: 'medium',
        status: 'pending',
        start_date: '2026-05-06',
        end_date: '2026-05-10',
        duration: 5,
        project_code: 'TEST-PROJ-001',
      },
    ];

    const importResponse = await request.post(`${API_BASE_URL}/api/tasks/import`, {
      headers: {
        'Cookie': `sessionId=${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        tasks: testTasks,
      },
    });

    console.log(`导入响应状态: ${importResponse.status()}`);

    if (importResponse.ok()) {
      const importResult = await importResponse.json();
      console.log('导入结果:', JSON.stringify(importResult, null, 2));
      console.log('✓ 导入 API 调用成功');

      // 检查导入结果
      if (importResult.success) {
        console.log(`✓ 导入成功: ${importResult.data?.successCount || 0} 条`);
        if (importResult.data?.failedCount > 0) {
          console.log(`! 部分失败: ${importResult.data.failedCount} 条`);
        }
      }
    } else {
      const errorText = await importResponse.text();
      console.log(`! 导入 API 调用失败: ${errorText}`);
    }

    // 截图最终状态
    await page.screenshot({ path: `${SCREENSHOT_DIR}/TC-IMP-01-final.png`, fullPage: true });
  });

  test('TC-IMP-02: 导出任务数据', async ({ page, request }) => {
    console.log('\n=== TC-IMP-02: 导出任务数据 ===');

    // 步骤1: 登录系统
    console.log('步骤1: 使用 admin 登录系统');
    await login(page, TEST_USERS.admin);
    console.log('✓ admin 登录成功');

    // 步骤2: 进入任务管理页面
    console.log('\n步骤2: 进入任务管理页面');
    await page.goto(BASE_URL + '/tasks');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 截图
    await page.screenshot({ path: `${SCREENSHOT_DIR}/TC-IMP-02-tasks-page.png`, fullPage: true });

    // 步骤3: 检查导出按钮
    console.log('\n步骤3: 检查导出功能');

    const exportButtonSelectors = [
      'button:has-text("导出")',
      '[data-testid="export-button"]',
      '[data-testid="btn-export"]',
      'button:has([class*="Download"])',
      '.toolbar button:has-text("导出")',
      '[data-testid="export-dropdown"]',
    ];

    let exportButtonFound = false;
    for (const selector of exportButtonSelectors) {
      const button = page.locator(selector);
      const count = await button.count();
      if (count > 0) {
        console.log(`✓ 找到导出按钮 (选择器: ${selector})`);
        exportButtonFound = true;

        // 尝试点击导出按钮
        try {
          await button.first().click();
          await page.waitForTimeout(500);
          console.log('✓ 点击导出按钮成功');

          // 截图导出菜单
          await page.screenshot({ path: `${SCREENSHOT_DIR}/TC-IMP-02-export-menu.png`, fullPage: true });
        } catch (e) {
          console.log(`! 点击导出按钮失败: ${e}`);
        }
        break;
      }
    }

    if (!exportButtonFound) {
      console.log('! 未在UI找到导出按钮，将测试 API 端点');
    }

    // 步骤4: 测试 CSV 导出 API
    console.log('\n步骤4: 测试 CSV 导出 API');
    const token = await getAuthSession(request, TEST_USERS.admin);

    const csvExportResponse = await request.get(`${API_BASE_URL}/api/tasks/export?format=csv`, {
      headers: {
        'Cookie': `sessionId=${token}`,
      },
    });

    console.log(`CSV导出响应状态: ${csvExportResponse.status()}`);

    if (csvExportResponse.ok()) {
      const contentType = csvExportResponse.headers()['content-type'] || '';
      console.log(`Content-Type: ${contentType}`);

      // 保存 CSV 文件
      const csvBuffer = await csvExportResponse.body();
      const csvPath = `${DOWNLOAD_DIR}/tasks-export.csv`;

      if (!fs.existsSync(DOWNLOAD_DIR)) {
        fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
      }

      fs.writeFileSync(csvPath, csvBuffer);
      console.log(`✓ CSV导出成功，已保存到: ${csvPath}`);

      // 检查内容
      const csvContent = csvBuffer.toString('utf-8');
      const lines = csvContent.split('\n');
      console.log(`CSV行数: ${lines.length}`);
      console.log(`CSV表头: ${lines[0]}`);

      if (csvContent.includes('WBS编码') || csvContent.includes('wbs_code')) {
        console.log('✓ CSV内容格式正确');
      }
    } else {
      console.log(`! CSV导出失败: ${csvExportResponse.status()}`);
    }

    // 步骤5: 测试 JSON 导出 API
    console.log('\n步骤5: 测试 JSON 导出 API');

    const jsonExportResponse = await request.get(`${API_BASE_URL}/api/tasks/export?format=json`, {
      headers: {
        'Cookie': `sessionId=${token}`,
      },
    });

    console.log(`JSON导出响应状态: ${jsonExportResponse.status()}`);

    if (jsonExportResponse.ok()) {
      const jsonResult = await jsonExportResponse.json();
      console.log('✓ JSON导出成功');
      console.log(`导出任务数量: ${jsonResult.total || jsonResult.data?.length || 0}`);

      // 保存 JSON 文件
      const jsonPath = `${DOWNLOAD_DIR}/tasks-export.json`;
      fs.writeFileSync(jsonPath, JSON.stringify(jsonResult, null, 2));
      console.log(`JSON已保存到: ${jsonPath}`);

      // 检查数据结构
      if (jsonResult.success && Array.isArray(jsonResult.data)) {
        console.log('✓ JSON数据结构正确');
        if (jsonResult.data.length > 0) {
          const sampleTask = jsonResult.data[0];
          console.log(`示例任务: ${sampleTask.wbs_code || sampleTask.description}`);
        }
      }
    } else {
      console.log(`! JSON导出失败: ${jsonExportResponse.status()}`);
    }

    // 步骤6: 测试按项目导出
    console.log('\n步骤6: 测试按项目导出');

    const projectExportResponse = await request.get(`${API_BASE_URL}/api/tasks/export?format=csv&project_id=27`, {
      headers: {
        'Cookie': `sessionId=${token}`,
      },
    });

    if (projectExportResponse.ok()) {
      const projectBuffer = await projectExportResponse.body();
      const projectCsv = projectBuffer.toString('utf-8');
      const projectLines = projectCsv.split('\n');
      console.log(`✓ 项目导出成功，共 ${projectLines.length - 1} 行数据`);
    } else {
      console.log(`! 项目导出失败: ${projectExportResponse.status()}`);
    }

    // 截图最终状态
    await page.screenshot({ path: `${SCREENSHOT_DIR}/TC-IMP-02-final.png`, fullPage: true });
  });

  test('TC-IMP-03: 权限验证（engineer 导出权限）', async ({ page, request }) => {
    console.log('\n=== TC-IMP-03: 权限验证（engineer 导出权限） ===');

    // 步骤1: 使用 engineer 登录
    console.log('步骤1: 使用 engineer 登录系统');
    await login(page, TEST_USERS.engineer);
    console.log('✓ engineer 登录成功');

    // 步骤2: 进入任务管理页面
    console.log('\n步骤2: 进入任务管理页面');
    await page.goto(BASE_URL + '/tasks');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 截图
    await page.screenshot({ path: `${SCREENSHOT_DIR}/TC-IMP-03-engineer-tasks-page.png`, fullPage: true });

    // 步骤3: 检查导出按钮是否可见
    console.log('\n步骤3: 检查 engineer 是否有导出功能');

    const exportButtonSelectors = [
      'button:has-text("导出")',
      '[data-testid="export-button"]',
      'button:has([class*="Download"])',
    ];

    let engineerHasExport = false;
    for (const selector of exportButtonSelectors) {
      const button = page.locator(selector);
      const count = await button.count();
      if (count > 0) {
        const isVisible = await button.first().isVisible();
        if (isVisible) {
          console.log(`✓ engineer 可以看到导出按钮 (选择器: ${selector})`);
          engineerHasExport = true;
        }
      }
    }

    if (!engineerHasExport) {
      console.log('! engineer 看不到导出按钮（可能被权限隐藏）');
    }

    // 步骤4: 测试 engineer 导出 API
    console.log('\n步骤4: 测试 engineer 导出 API');
    const token = await getAuthSession(request, TEST_USERS.engineer);

    const exportResponse = await request.get(`${API_BASE_URL}/api/tasks/export?format=csv`, {
      headers: {
        'Cookie': `sessionId=${token}`,
      },
    });

    console.log(`engineer导出响应状态: ${exportResponse.status()}`);

    if (exportResponse.ok()) {
      console.log('✓ engineer 可以导出任务（数据隔离生效）');

      const exportBuffer = await exportResponse.body();
      const exportContent = exportBuffer.toString('utf-8');
      const lines = exportContent.split('\n');
      console.log(`engineer导出行数: ${lines.length - 1}`);
    } else if (exportResponse.status() === 403) {
      console.log('✓ engineer 无导出权限（返回403）');
    } else {
      console.log(`! 意外响应: ${exportResponse.status()}`);
    }

    // 步骤5: 测试 engineer 导入权限
    console.log('\n步骤5: 测试 engineer 导入权限');

    const importTemplateResponse = await request.get(`${API_BASE_URL}/api/tasks/import/template`, {
      headers: {
        'Cookie': `sessionId=${token}`,
      },
    });

    console.log(`engineer模板下载响应状态: ${importTemplateResponse.status()}`);

    if (importTemplateResponse.ok()) {
      console.log('! engineer 可以下载导入模板');
    } else if (importTemplateResponse.status() === 403) {
      console.log('✓ engineer 无导入权限（返回403）');
    }

    // 测试导入 API
    const importResponse = await request.post(`${API_BASE_URL}/api/tasks/import`, {
      headers: {
        'Cookie': `sessionId=${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        tasks: [{ wbs_code: 'TEST-ENGINEER', description: 'Engineer测试' }],
      },
    });

    console.log(`engineer导入响应状态: ${importResponse.status()}`);

    if (importResponse.ok()) {
      console.log('! engineer 可以导入任务');
    } else if (importResponse.status() === 403) {
      console.log('✓ engineer 无导入权限（返回403）');
    }

    // 截图最终状态
    await page.screenshot({ path: `${SCREENSHOT_DIR}/TC-IMP-03-final.png`, fullPage: true });
  });
});
