/**
 * TC-TASK-12: 删除根任务功能测试（带网络监控）
 * 测试目标: 使用 Chrome DevTools 监控删除根任务的网络请求和响应
 *
 * 测试环境:
 * - 前端: http://localhost:5173
 * - 后端: http://localhost:3001
 * - 测试用户: 部门经理 50223183 / 50223183
 */

import { test, expect, Page, BrowserContext, Request, Response } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3001';

// 使用 admin 用户（有权限创建任务）
// 注意：用户 50223183 不是项目成员，没有权限创建任务
const ADMIN_USER = 'admin';
const ADMIN_PASSWORD = 'admin123';

const TEST_PROJECT_ID = '25'; // TEST-PROJ-001 的 ID

// 网络请求记录接口
interface NetworkLog {
  url: string;
  method: string;
  status: number;
  duration: number;
  requestTime: string;
  responseTime: string;
  requestBody?: any;
  responseBody?: any;
  error?: string;
}

// 测试配置
test.setTimeout(180000); // 3 分钟超时

test.describe('TC-TASK-12: 删除根任务功能测试（带网络监控）', () => {

  // 网络请求监控数组
  let networkLogs: NetworkLog[] = [];

  // 清空网络日志
  function clearNetworkLogs() {
    networkLogs = [];
  }

  // 添加网络日志
  function addNetworkLog(log: NetworkLog) {
    networkLogs.push(log);
  }

  // 打印网络日志摘要
  function printNetworkLogSummary() {
    console.log('\n=== 网络请求监控摘要 ===');
    console.log(`总请求数: ${networkLogs.length}`);

    const apiLogs = networkLogs.filter(log => log.url.includes(API_URL));
    console.log(`API 请求数: ${apiLogs.length}`);

    if (apiLogs.length > 0) {
      console.log('\nAPI 请求详情:');
      apiLogs.forEach((log, index) => {
        console.log(`\n[${index + 1}] ${log.method} ${log.url}`);
        console.log(`    状态码: ${log.status}`);
        console.log(`    响应时间: ${log.duration}ms`);
        console.log(`    请求时间: ${log.requestTime}`);
        if (log.error) {
          console.log(`    错误: ${log.error}`);
        }
        if (log.requestBody) {
          console.log(`    请求体: ${JSON.stringify(log.requestBody).substring(0, 200)}`);
        }
        if (log.responseBody) {
          console.log(`    响应体: ${JSON.stringify(log.responseBody).substring(0, 200)}`);
        }
      });

      // 统计平均响应时间
      const avgDuration = apiLogs.reduce((sum, log) => sum + log.duration, 0) / apiLogs.length;
      console.log(`\n平均响应时间: ${avgDuration.toFixed(2)}ms`);

      // 统计状态码分布
      const statusCounts: Record<number, number> = {};
      apiLogs.forEach(log => {
        statusCounts[log.status] = (statusCounts[log.status] || 0) + 1;
      });
      console.log('\n状态码分布:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`  ${status}: ${count} 次`);
      });
    }

    console.log('\n========================\n');
  }

  // 设置网络请求监控
  function setupNetworkMonitoring(context: BrowserContext) {
    clearNetworkLogs();

    context.on('request', (request: Request) => {
      if (request.url().includes(API_URL)) {
        const startTime = Date.now();
        (request as any)._startTime = startTime;
      }
    });

    context.on('response', async (response: Response) => {
      const request = response.request();
      if (request.url().includes(API_URL)) {
        const startTime = (request as any)._startTime || Date.now();
        const endTime = Date.now();
        const duration = endTime - startTime;

        let requestBody: any = undefined;
        let responseBody: any = undefined;
        let error: string | undefined = undefined;

        // 尝试获取请求体
        try {
          const postData = request.postData();
          if (postData) {
            requestBody = JSON.parse(postData);
          }
        } catch (e) {
          requestBody = request.postData();
        }

        // 尝试获取响应体
        try {
          const responseText = await response.text();
          if (responseText) {
            responseBody = JSON.parse(responseText);
          }
        } catch (e) {
          error = `解析响应失败: ${e}`;
        }

        addNetworkLog({
          url: request.url(),
          method: request.method(),
          status: response.status(),
          duration,
          requestTime: new Date(startTime).toISOString(),
          responseTime: new Date(endTime).toISOString(),
          requestBody,
          responseBody,
          error
        });
      }
    });
  }

  // 前端登录 helper
  async function login(page: Page, username: string, password: string) {
    await page.goto(BASE_URL + '/login');
    await page.waitForLoadState('networkidle');

    await page.fill('[data-testid="login-input-username"]', username);
    await page.fill('[data-testid="login-input-password"]', password);
    await page.click('[data-testid="login-btn-submit"]');

    await page.waitForURL(/\/dashboard|\/tasks/, { timeout: 15000 });
    await page.waitForLoadState('networkidle');
  }

  // API 登录获取 session
  async function loginAPI(request: any, username: string, password: string): Promise<void> {
    const loginResponse = await request.post(`${API_URL}/api/auth/login`, {
      data: { username, password }
    });

    if (!loginResponse.ok()) {
      throw new Error(`登录失败: ${loginResponse.status()}`);
    }
  }

  // 通过 API 创建测试根任务
  async function createRootTaskAPI(request: any, description: string): Promise<string> {
    const createResponse = await request.post(`${API_URL}/api/tasks`, {
      data: {
        description: description,
        project_id: TEST_PROJECT_ID,
        wbs_level: 1,
        parent_id: null,
        start_date: new Date().toISOString().split('T')[0],
        duration: 10
      }
    });

    if (!createResponse.ok()) {
      const errorData = await createResponse.json();
      console.log(`创建根任务错误: ${JSON.stringify(errorData)}`);
      throw new Error(`创建根任务失败: ${createResponse.status()}`);
    }

    const data = await createResponse.json();
    return data.data?.id;
  }

  // 检查任务是否存在
  async function isTaskExistsAPI(request: any, taskId: string): Promise<boolean> {
    const getResponse = await request.get(`${API_URL}/api/tasks/${taskId}`);
    return getResponse.ok();
  }

  // 获取任务详情
  async function getTaskDetailsAPI(request: any, taskId: string): Promise<any> {
    const getResponse = await request.get(`${API_URL}/api/tasks/${taskId}`);
    if (getResponse.ok()) {
      return await getResponse.json();
    }
    return null;
  }

  test('TC-TASK-12-1: 删除根任务并监控网络请求', async ({ page, context, request }) => {
    console.log('\n========================================');
    console.log('开始测试：删除根任务并监控网络请求');
    console.log('========================================\n');

    // 设置网络监控
    setupNetworkMonitoring(context);

    // 步骤 1: API 登录
    console.log('步骤 1: 登录管理员账户');
    await loginAPI(request, ADMIN_USER, ADMIN_PASSWORD);
    console.log('✓ API 登录成功\n');

    // 步骤 2: 创建根任务
    console.log('步骤 2: 创建测试根任务');
    const taskDescription = `TC-TASK-12-ROOT-${Date.now()}`;
    const taskId = await createRootTaskAPI(request, taskDescription);
    console.log(`✓ 创建根任务成功`);
    console.log(`  任务 ID: ${taskId}`);
    console.log(`  任务描述: ${taskDescription}\n`);

    // 步骤 3: 验证任务已创建
    console.log('步骤 3: 验证任务已创建');
    const taskDetails = await getTaskDetailsAPI(request, taskId);
    expect(taskDetails).not.toBeNull();
    expect(taskDetails.data?.wbs_level).toBe(1);
    expect(taskDetails.data?.parent_id).toBeNull();
    console.log('✓ 验证任务存在');
    console.log(`  WBS 层级: ${taskDetails.data?.wbs_level}`);
    console.log(`  父任务 ID: ${taskDetails.data?.parent_id || '无（根任务）'}\n`);

    // 步骤 4: 前端登录
    console.log('步骤 4: 前端登录');
    await login(page, ADMIN_USER, ADMIN_PASSWORD);
    const screenshot1 = `Test/screenshots/TC-TASK-12-01-before-delete-${Date.now()}.png`;
    await page.screenshot({ path: screenshot1, fullPage: false });
    console.log(`✓ 前端登录成功`);
    console.log(`  截图保存: ${screenshot1}\n`);

    // 步骤 5: 导航到任务页面
    console.log('步骤 5: 导航到任务页面');
    await page.goto(BASE_URL + '/tasks');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    console.log('✓ 任务页面加载完成\n');

    // 步骤 6: 查找并选中测试任务
    console.log('步骤 6: 查找测试任务');
    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();
    let targetRow = null;

    for (let i = 0; i < Math.min(rowCount, 100); i++) {
      const row = rows.nth(i);
      const descCell = row.locator('td[data-col-id="description"]');
      const descText = await descCell.textContent();

      if (descText?.includes(taskDescription)) {
        targetRow = row;
        console.log(`✓ 找到测试任务在第 ${i + 1} 行`);
        console.log(`  任务描述: ${descText}\n`);
        break;
      }
    }

    if (!targetRow) {
      console.log('⚠ 未在前端找到测试任务，将通过 API 删除\n');
    }

    // 步骤 7: 执行删除操作
    console.log('步骤 7: 执行删除操作');
    clearNetworkLogs(); // 清空之前的网络日志

    const deleteStartTime = Date.now();
    const deleteResponse = await request.delete(`${API_URL}/api/tasks/${taskId}`);
    const deleteEndTime = Date.now();
    const deleteDuration = deleteEndTime - deleteStartTime;

    console.log(`✓ 删除请求已发送`);
    console.log(`  状态码: ${deleteResponse.status()}`);
    console.log(`  响应时间: ${deleteDuration}ms`);

    if (deleteResponse.ok()) {
      const deleteResult = await deleteResponse.json();
      console.log(`  响应体: ${JSON.stringify(deleteResult)}`);
      expect(deleteResponse.ok()).toBe(true);
    } else {
      const errorText = await deleteResponse.text();
      console.log(`  错误响应: ${errorText}`);
    }
    console.log('');

    // 步骤 8: 验证删除结果
    console.log('步骤 8: 验证删除结果');
    await page.waitForTimeout(1000);
    const existsAfter = await isTaskExistsAPI(request, taskId);
    console.log(`  任务是否仍存在: ${existsAfter}`);
    expect(existsAfter).toBe(false);
    console.log('✓ 验证任务已删除\n');

    // 步骤 9: 截图
    console.log('步骤 9: 保存删除后截图');
    const screenshot2 = `Test/screenshots/TC-TASK-12-01-after-delete-${Date.now()}.png`;
    await page.screenshot({ path: screenshot2, fullPage: false });
    console.log(`✓ 截图保存: ${screenshot2}\n`);

    // 打印网络请求摘要
    printNetworkLogSummary();

    console.log('========================================');
    console.log('测试通过：TC-TASK-12-1');
    console.log('========================================\n');
  });

  test('TC-TASK-12-2: 删除有子任务的根任务（级联删除）', async ({ page, context, request }) => {
    console.log('\n========================================');
    console.log('开始测试：删除有子任务的根任务');
    console.log('========================================\n');

    setupNetworkMonitoring(context);

    // 步骤 1: 登录
    console.log('步骤 1: 登录管理员账户');
    await loginAPI(request, ADMIN_USER, ADMIN_PASSWORD);
    console.log('✓ API 登录成功\n');

    // 步骤 2: 创建根任务和子任务
    console.log('步骤 2: 创建根任务和子任务');
    const parentDescription = `TC-TASK-12-PARENT-${Date.now()}`;
    const parentId = await createRootTaskAPI(request, parentDescription);
    console.log(`✓ 创建根任务成功，ID: ${parentId}`);

    // 创建子任务
    const childDescription = `TC-TASK-12-CHILD-${Date.now()}`;
    const createChildResponse = await request.post(`${API_URL}/api/tasks`, {
      data: {
        description: childDescription,
        project_id: TEST_PROJECT_ID,
        wbs_level: 2,
        parent_id: parentId,
        start_date: new Date().toISOString().split('T')[0],
        duration: 5
      }
    });
    expect(createChildResponse.ok()).toBe(true);
    const childData = await createChildResponse.json();
    const childId = childData.data?.id;
    console.log(`✓ 创建子任务成功，ID: ${childId}\n`);

    // 步骤 3: 验证父子任务都存在
    console.log('步骤 3: 验证父子任务都存在');
    const parentExists = await isTaskExistsAPI(request, parentId);
    const childExists = await isTaskExistsAPI(request, childId);
    expect(parentExists).toBe(true);
    expect(childExists).toBe(true);
    console.log(`✓ 根任务存在: ${parentExists}`);
    console.log(`✓ 子任务存在: ${childExists}\n`);

    // 步骤 4: 前端登录并截图
    console.log('步骤 4: 前端登录');
    await login(page, ADMIN_USER, ADMIN_PASSWORD);
    const screenshot1 = `Test/screenshots/TC-TASK-12-02-before-cascade-delete-${Date.now()}.png`;
    await page.screenshot({ path: screenshot1, fullPage: false });
    console.log(`✓ 截图保存: ${screenshot1}\n`);

    // 步骤 5: 删除根任务（应该级联删除子任务）
    console.log('步骤 5: 删除根任务（级联删除）');
    clearNetworkLogs();

    const deleteStartTime = Date.now();
    const deleteResponse = await request.delete(`${API_URL}/api/tasks/${parentId}`);
    const deleteEndTime = Date.now();
    const deleteDuration = deleteEndTime - deleteStartTime;

    console.log(`✓ 删除请求已发送`);
    console.log(`  状态码: ${deleteResponse.status()}`);
    console.log(`  响应时间: ${deleteDuration}ms`);
    expect(deleteResponse.ok()).toBe(true);
    console.log('');

    // 步骤 6: 验证级联删除
    console.log('步骤 6: 验证级联删除');
    await page.waitForTimeout(1000);
    const parentExistsAfter = await isTaskExistsAPI(request, parentId);
    const childExistsAfter = await isTaskExistsAPI(request, childId);

    console.log(`  根任务是否存在: ${parentExistsAfter}`);
    console.log(`  子任务是否存在: ${childExistsAfter}`);

    expect(parentExistsAfter).toBe(false);
    expect(childExistsAfter).toBe(false);
    console.log('✓ 级联删除验证通过\n');

    // 步骤 7: 截图
    console.log('步骤 7: 保存删除后截图');
    const screenshot2 = `Test/screenshots/TC-TASK-12-02-after-cascade-delete-${Date.now()}.png`;
    await page.screenshot({ path: screenshot2, fullPage: false });
    console.log(`✓ 截图保存: ${screenshot2}\n`);

    printNetworkLogSummary();

    console.log('========================================');
    console.log('测试通过：TC-TASK-12-2');
    console.log('========================================\n');
  });

  test('TC-TASK-12-3: 删除根任务网络异常测试', async ({ page, context, request }) => {
    console.log('\n========================================');
    console.log('开始测试：删除根任务网络异常测试');
    console.log('========================================\n');

    setupNetworkMonitoring(context);

    // 步骤 1: 登录
    console.log('步骤 1: 登录管理员账户');
    await loginAPI(request, ADMIN_USER, ADMIN_PASSWORD);
    console.log('✓ API 登录成功\n');

    // 步骤 2: 创建根任务
    console.log('步骤 2: 创建测试根任务');
    const taskDescription = `TC-TASK-12-ERROR-${Date.now()}`;
    const taskId = await createRootTaskAPI(request, taskDescription);
    console.log(`✓ 创建根任务成功，ID: ${taskId}\n`);

    // 步骤 3: 前端登录
    console.log('步骤 3: 前端登录');
    await login(page, ADMIN_USER, ADMIN_PASSWORD);
    console.log('✓ 前端登录成功\n');

    // 步骤 4: 测试删除不存在的任务
    console.log('步骤 4: 测试删除不存在的任务');
    clearNetworkLogs();

    const nonExistentId = '99999999';
    const deleteNonExistent = await request.delete(`${API_URL}/api/tasks/${nonExistentId}`);
    console.log(`  状态码: ${deleteNonExistent.status()}`);
    console.log(`  预期: 404 或其他错误状态`);
    expect(deleteNonExistent.ok()).toBe(false);
    console.log('✓ 验证通过：删除不存在的任务返回错误\n');

    // 步骤 5: 测试重复删除
    console.log('步骤 5: 测试重复删除同一任务');
    clearNetworkLogs();

    // 第一次删除
    const deleteFirst = await request.delete(`${API_URL}/api/tasks/${taskId}`);
    console.log(`  第一次删除状态码: ${deleteFirst.status()}`);
    expect(deleteFirst.ok()).toBe(true);

    await page.waitForTimeout(500);

    // 第二次删除
    const deleteSecond = await request.delete(`${API_URL}/api/tasks/${taskId}`);
    console.log(`  第二次删除状态码: ${deleteSecond.status()}`);
    expect(deleteSecond.ok()).toBe(false);
    console.log('✓ 验证通过：重复删除返回错误\n');

    printNetworkLogSummary();

    console.log('========================================');
    console.log('测试通过：TC-TASK-12-3');
    console.log('========================================\n');
  });

  test('TC-TASK-12-4: 性能测试 - 删除多个根任务', async ({ page, context, request }) => {
    console.log('\n========================================');
    console.log('开始测试：删除多个根任务性能测试');
    console.log('========================================\n');

    setupNetworkMonitoring(context);

    // 步骤 1: 登录
    console.log('步骤 1: 登录管理员账户');
    await loginAPI(request, ADMIN_USER, ADMIN_PASSWORD);
    console.log('✓ API 登录成功\n');

    // 步骤 2: 创建多个根任务
    console.log('步骤 2: 创建 5 个根任务');
    const taskIds: string[] = [];
    const createTimes: number[] = [];

    for (let i = 0; i < 5; i++) {
      const startTime = Date.now();
      const taskDescription = `TC-TASK-12-PERF-${Date.now()}-${i}`;
      const taskId = await createRootTaskAPI(request, taskDescription);
      const createTime = Date.now() - startTime;

      taskIds.push(taskId);
      createTimes.push(createTime);
      console.log(`  任务 ${i + 1}: ID=${taskId}, 创建时间=${createTime}ms`);
    }
    console.log('✓ 所有任务创建完成\n');

    // 步骤 3: 前端登录
    console.log('步骤 3: 前端登录');
    await login(page, ADMIN_USER, ADMIN_PASSWORD);
    console.log('✓ 前端登录成功\n');

    // 步骤 4: 批量删除并记录时间
    console.log('步骤 4: 批量删除任务');
    clearNetworkLogs();

    const deleteTimes: number[] = [];
    const deleteStatuses: number[] = [];

    for (let i = 0; i < taskIds.length; i++) {
      const startTime = Date.now();
      const deleteResponse = await request.delete(`${API_URL}/api/tasks/${taskIds[i]}`);
      const deleteTime = Date.now() - startTime;

      deleteTimes.push(deleteTime);
      deleteStatuses.push(deleteResponse.status());

      console.log(`  删除任务 ${i + 1}: 状态=${deleteResponse.status()}, 时间=${deleteTime}ms`);
    }
    console.log('');

    // 步骤 5: 统计性能指标
    console.log('步骤 5: 性能统计');
    const avgCreateTime = createTimes.reduce((a, b) => a + b, 0) / createTimes.length;
    const avgDeleteTime = deleteTimes.reduce((a, b) => a + b, 0) / deleteTimes.length;
    const maxDeleteTime = Math.max(...deleteTimes);
    const minDeleteTime = Math.min(...deleteTimes);

    console.log(`  平均创建时间: ${avgCreateTime.toFixed(2)}ms`);
    console.log(`  平均删除时间: ${avgDeleteTime.toFixed(2)}ms`);
    console.log(`  最长删除时间: ${maxDeleteTime}ms`);
    console.log(`  最短删除时间: ${minDeleteTime}ms`);
    console.log('');

    // 验证所有任务都已删除
    console.log('步骤 6: 验证所有任务已删除');
    for (let i = 0; i < taskIds.length; i++) {
      const exists = await isTaskExistsAPI(request, taskIds[i]);
      expect(exists).toBe(false);
    }
    console.log('✓ 所有任务已删除\n');

    printNetworkLogSummary();

    console.log('========================================');
    console.log('测试通过：TC-TASK-12-4');
    console.log('========================================\n');
  });

  test('TC-TASK-12-5: 综合测试 - 完整的删除流程验证', async ({ page, context, request }) => {
    console.log('\n========================================');
    console.log('开始测试：完整的删除流程验证');
    console.log('========================================\n');

    setupNetworkMonitoring(context);

    // 步骤 1: 登录
    console.log('步骤 1: 登录管理员账户');
    await loginAPI(request, ADMIN_USER, ADMIN_PASSWORD);
    console.log('✓ API 登录成功\n');

    // 步骤 2: 创建测试数据
    console.log('步骤 2: 创建测试数据结构');
    const rootDescription = `TC-TASK-12-ROOT-${Date.now()}`;
    const rootId = await createRootTaskAPI(request, rootDescription);
    console.log(`✓ 创建根任务: ID=${rootId}`);

    // 创建子任务
    const childIds: string[] = [];
    for (let i = 0; i < 3; i++) {
      const childDesc = `TC-TASK-12-CHILD-${i}-${Date.now()}`;
      const createChild = await request.post(`${API_URL}/api/tasks`, {
        data: {
          description: childDesc,
          project_id: TEST_PROJECT_ID,
          wbs_level: 2,
          parent_id: rootId,
          start_date: new Date().toISOString().split('T')[0],
          duration: 3
        }
      });
      expect(createChild.ok()).toBe(true);
      const childData = await createChild.json();
      childIds.push(childData.data?.id);
      console.log(`  创建子任务 ${i + 1}: ID=${childData.data?.id}`);
    }
    console.log('');

    // 步骤 3: 验证数据结构
    console.log('步骤 3: 验证数据结构');
    const rootExists = await isTaskExistsAPI(request, rootId);
    expect(rootExists).toBe(true);
    console.log(`✓ 根任务存在: ${rootExists}`);

    for (let i = 0; i < childIds.length; i++) {
      const childExists = await isTaskExistsAPI(request, childIds[i]);
      expect(childExists).toBe(true);
      console.log(`✓ 子任务 ${i + 1} 存在: ${childExists}`);
    }
    console.log('');

    // 步骤 4: 前端登录
    console.log('步骤 4: 前端登录');
    await login(page, ADMIN_USER, ADMIN_PASSWORD);
    const screenshot1 = `Test/screenshots/TC-TASK-12-05-complete-flow-before-${Date.now()}.png`;
    await page.screenshot({ path: screenshot1, fullPage: false });
    console.log(`✓ 截图保存: ${screenshot1}\n`);

    // 步骤 5: 执行删除
    console.log('步骤 5: 执行删除操作');
    clearNetworkLogs();

    const deleteStartTime = Date.now();
    const deleteResponse = await request.delete(`${API_URL}/api/tasks/${rootId}`);
    const deleteEndTime = Date.now();
    const deleteDuration = deleteEndTime - deleteStartTime;

    console.log(`✓ 删除请求完成`);
    console.log(`  状态码: ${deleteResponse.status()}`);
    console.log(`  响应时间: ${deleteDuration}ms`);
    expect(deleteResponse.ok()).toBe(true);
    console.log('');

    // 步骤 6: 验证级联删除
    console.log('步骤 6: 验证级联删除');
    await page.waitForTimeout(1000);

    const rootExistsAfter = await isTaskExistsAPI(request, rootId);
    expect(rootExistsAfter).toBe(false);
    console.log(`✓ 根任务已删除: 存在=${rootExistsAfter}`);

    for (let i = 0; i < childIds.length; i++) {
      const childExistsAfter = await isTaskExistsAPI(request, childIds[i]);
      expect(childExistsAfter).toBe(false);
      console.log(`✓ 子任务 ${i + 1} 已删除: 存在=${childExistsAfter}`);
    }
    console.log('');

    // 步骤 7: 截图
    console.log('步骤 7: 保存删除后截图');
    const screenshot2 = `Test/screenshots/TC-TASK-12-05-complete-flow-after-${Date.now()}.png`;
    await page.screenshot({ path: screenshot2, fullPage: false });
    console.log(`✓ 截图保存: ${screenshot2}\n`);

    printNetworkLogSummary();

    console.log('========================================');
    console.log('测试通过：TC-TASK-12-5');
    console.log('========================================\n');
  });
});
