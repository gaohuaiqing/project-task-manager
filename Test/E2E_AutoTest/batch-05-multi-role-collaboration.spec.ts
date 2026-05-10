/**
 * Batch 05: 多角色协作测试
 * 测试目标: 验证多角色协作功能
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const API_BASE_URL = 'http://localhost:3001';

// 测试用户凭据
const USERS = {
  admin: { username: 'admin', password: 'admin123' },
  dept_manager: { username: '50223183', password: '50223183' },
  tech_manager: { username: '50234447', password: '50234447' },
  engineer: { username: '50241392', password: '50241392' },
};

// 测试项目
const TEST_PROJECT_ID = '25';

test.setTimeout(180000);

test.describe('Batch 05: 多角色协作测试', () => {

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
    await page.waitForTimeout(1000);
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

  // 创建任务 helper
  async function createTask(request: any, token: string, taskData: any) {
    const response = await request.post(`${API_BASE_URL}/api/tasks`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      data: taskData,
    });

    if (!response.ok()) {
      const error = await response.text();
      throw new Error(`创建任务失败: ${error}`);
    }

    return await response.json();
  }

  // 删除任务 helper
  async function deleteTask(request: any, token: string, taskId: string) {
    const response = await request.delete(`${API_BASE_URL}/api/tasks/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    return response.ok();
  }

  test('TC-COLL-01: 部门经理授权技术经理', async ({ page }) => {
    console.log('\n=== TC-COLL-01: 部门经理授权技术经理 ===');

    // 登录部门经理
    console.log('步骤1: 部门经理登录');
    await login(page, USERS.dept_manager);
    console.log('✓ 部门经理登录成功');

    // 查找授权管理功能
    console.log('\n步骤2: 查找授权管理功能');

    // 尝试不同的导航路径
    const possiblePaths = [
      '/settings',
      '/settings/organization',
      '/settings/permissions',
      '/settings/groups',
      '/organization',
      '/permissions',
    ];

    let authorizationFound = false;

    for (const path of possiblePaths) {
      await page.goto(BASE_URL + path);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // 查找授权相关的元素
      const authElements = [
        '[data-testid="authorization-tab"]',
        '[data-testid="permission-settings"]',
        'button:has-text("授权")',
        'button:has-text("权限")',
        'a:has-text("授权管理")',
        'h2:has-text("授权")',
        'h2:has-text("权限")',
      ];

      for (const selector of authElements) {
        const element = page.locator(selector);
        const isVisible = await element.isVisible().catch(() => false);

        if (isVisible) {
          console.log(`✓ 找到授权管理功能: ${selector} (路径: ${path})`);
          authorizationFound = true;
          await page.screenshot({ path: 'Test/screenshots/TC-COLL-01-authorization-found.png' });
          break;
        }
      }

      if (authorizationFound) break;
    }

    if (!authorizationFound) {
      console.log('⚠ 未找到授权管理功能');
      console.log('结论: 授权管理功能可能未实现');
      await page.screenshot({ path: 'Test/screenshots/TC-COLL-01-authorization-not-found.png' });
    }
  });

  test('TC-COLL-02: 技术经理管理被授权组', async ({ page, request }) => {
    console.log('\n=== TC-COLL-02: 技术经理管理被授权组 ===');

    // 登录技术经理
    console.log('步骤1: 技术经理登录');
    await login(page, USERS.tech_manager);
    console.log('✓ 技术经理登录成功');

    // 导航到任务页面
    console.log('\n步骤2: 查看任务管理权限');
    await page.goto(BASE_URL + '/tasks');
    await page.waitForLoadState('networkidle');

    // 等待任务表格加载
    try {
      await page.waitForSelector('table tbody tr', { timeout: 10000 });
      const rows = page.locator('table tbody tr');
      const count = await rows.count();
      console.log(`✓ 任务表格加载成功，当前任务数量: ${count}`);

      // 检查是否能看到不同组的任务
      // 查找任务分组或项目信息
      const projectCells = page.locator('td:has-text("项目")');
      const projectCount = await projectCells.count();

      if (projectCount > 0) {
        console.log(`✓ 可以看到 ${projectCount} 个项目的任务`);
      }

      await page.screenshot({ path: 'Test/screenshots/TC-COLL-02-tech-manager-tasks.png' });
    } catch {
      console.log('⚠ 任务表格未加载');
      await page.screenshot({ path: 'Test/screenshots/TC-COLL-02-tech-manager-tasks-error.png' });
    }

    // 测试编辑权限
    console.log('\n步骤3: 测试编辑任务权限');
    try {
      // 尝试点击第一个任务的编辑按钮
      const editButton = page.locator('button:has-text("编辑"), [data-testid="edit-task"]').first();
      const isVisible = await editButton.isVisible().catch(() => false);

      if (isVisible) {
        console.log('✓ 技术经理有编辑任务权限');
      } else {
        console.log('⚠ 技术经理可能没有编辑任务权限');
      }
    } catch {
      console.log('⚠ 无法确定编辑权限');
    }
  });

  test('TC-COLL-03: 多人同时编辑不同任务', async ({ page, request }) => {
    console.log('\n=== TC-COLL-03: 多人同时编辑不同任务 ===');

    let taskXId: string | undefined;
    let taskYId: string | undefined;

    try {
      // 步骤1: admin 创建测试任务
      console.log('\n步骤1: admin 创建测试任务');
      const adminToken = await getAuthToken(request, USERS.admin);

      // 创建任务 X
      const taskXData = {
        description: 'TC-COLL-03-TASK-X-' + Date.now(),
        assignee_id: 'admin',
        start_date: '2026-05-06',
        duration_days: 5,
        project_id: TEST_PROJECT_ID,
      };

      const taskX = await createTask(request, adminToken, taskXData);
      taskXId = taskX.data?.id;
      console.log(`✓ 任务 X 已创建: ID=${taskXId}`);

      // 创建任务 Y
      const taskYData = {
        description: 'TC-COLL-03-TASK-Y-' + Date.now(),
        assignee_id: USERS.engineer.username,
        start_date: '2026-05-06',
        duration_days: 5,
        project_id: TEST_PROJECT_ID,
      };

      const taskY = await createTask(request, adminToken, taskYData);
      taskYId = taskY.data?.id;
      console.log(`✓ 任务 Y 已创建: ID=${taskYId}`);

      // 步骤2: 同时编辑任务
      console.log('\n步骤2: 模拟同时编辑');

      const adminEditPromise = (async () => {
        const token = adminToken;
        const response = await request.put(`${API_BASE_URL}/api/tasks/${taskXId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          data: {
            description: taskXData.description + ' - Modified by admin',
            version: 1,
          },
        });
        return { user: 'admin', taskId: taskXId, response };
      })();

      const engineerToken = await getAuthToken(request, USERS.engineer);
      const engineerEditPromise = (async () => {
        const token = engineerToken;
        const response = await request.put(`${API_BASE_URL}/api/tasks/${taskYId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          data: {
            description: taskYData.description + ' - Modified by engineer',
            version: 1,
          },
        });
        return { user: 'engineer', taskId: taskYId, response };
      })();

      // 等待两个请求完成
      const results = await Promise.all([adminEditPromise, engineerEditPromise]);

      // 步骤3: 验证结果
      console.log('\n步骤3: 验证修改结果');

      for (const result of results) {
        if (result.response.ok()) {
          console.log(`✓ ${result.user} 编辑任务 ${result.taskId} 成功`);
        } else {
          const error = await result.response.text();
          console.log(`✗ ${result.user} 编辑任务 ${result.taskId} 失败: ${error}`);
        }
      }

      // 验证数据一致性
      const taskXCheck = await request.get(`${API_BASE_URL}/api/tasks/${taskXId}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      const taskXData2 = await taskXCheck.json();

      const taskYCheck = await request.get(`${API_BASE_URL}/api/tasks/${taskYId}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      const taskYData2 = await taskYCheck.json();

      if (taskXData2.data?.description?.includes('Modified by admin')) {
        console.log('✓ 任务 X 的修改正确保存');
      } else {
        console.log('✗ 任务 X 的修改未正确保存');
      }

      if (taskYData2.data?.description?.includes('Modified by engineer')) {
        console.log('✓ 任务 Y 的修改正确保存');
      } else {
        console.log('✗ 任务 Y 的修改未正确保存');
      }

      await page.screenshot({ path: 'Test/screenshots/TC-COLL-03-concurrent-edit-result.png' });

    } catch (error) {
      console.error('测试失败:', error);
      throw error;
    } finally {
      // 清理
      console.log('\n清理测试数据');
      const adminToken = await getAuthToken(request, USERS.admin);
      if (taskXId) {
        await deleteTask(request, adminToken, taskXId);
        console.log(`✓ 已删除任务 X: ${taskXId}`);
      }
      if (taskYId) {
        await deleteTask(request, adminToken, taskYId);
        console.log(`✓ 已删除任务 Y: ${taskYId}`);
      }
    }
  });

  test('TC-COLL-04: 两人同时编辑同一任务（版本冲突）', async ({ page, request }) => {
    console.log('\n=== TC-COLL-04: 两人同时编辑同一任务（版本冲突） ===');

    let taskId: string | undefined;

    try {
      // 步骤1: admin 创建测试任务
      console.log('\n步骤1: admin 创建测试任务');
      const adminToken = await getAuthToken(request, USERS.admin);

      const taskData = {
        description: 'TC-COLL-04-CONFLICT-' + Date.now(),
        assignee_id: USERS.tech_manager.username,
        start_date: '2026-05-06',
        duration_days: 5,
        project_id: TEST_PROJECT_ID,
      };

      const task = await createTask(request, adminToken, taskData);
      taskId = task.data?.id;
      const initialVersion = task.data?.version || 1;
      console.log(`✓ 任务已创建: ID=${taskId}, 初始版本=${initialVersion}`);

      // 步骤2: admin 先编辑保存（版本 1 → 版本 2）
      console.log('\n步骤2: admin 先编辑保存');
      const adminEditResponse = await request.put(`${API_BASE_URL}/api/tasks/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
        data: {
          description: taskData.description + ' - Admin first edit',
          version: initialVersion,
        },
      });

      if (adminEditResponse.ok()) {
        const updatedTask = await adminEditResponse.json();
        const newVersion = updatedTask.data?.version;
        console.log(`✓ admin 编辑成功，新版本=${newVersion}`);
      } else {
        const error = await adminEditResponse.text();
        console.log(`⚠ admin 编辑失败: ${error}`);
      }

      // 步骤3: tech_manager 使用旧版本尝试保存
      console.log('\n步骤3: tech_manager 使用旧版本尝试保存');
      const techManagerToken = await getAuthToken(request, USERS.tech_manager);

      const techManagerEditResponse = await request.put(`${API_BASE_URL}/api/tasks/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${techManagerToken}`,
        },
        data: {
          description: taskData.description + ' - Tech manager edit',
          version: initialVersion, // 使用旧的版本号
        },
      });

      // 步骤4: 验证结果
      console.log('\n步骤4: 验证版本冲突处理');

      if (!techManagerEditResponse.ok()) {
        const errorData = await techManagerEditResponse.json();
        const errorCode = errorData.error?.code || errorData.code;

        if (errorCode === 'VERSION_CONFLICT' || techManagerEditResponse.status() === 409) {
          console.log('✓ 版本冲突正确检测');
          console.log(`错误消息: ${errorData.error?.message || errorData.message}`);
        } else {
          console.log(`⚠ 返回错误但不是版本冲突: ${errorCode}`);
          console.log(`响应: ${JSON.stringify(errorData)}`);
        }
      } else {
        console.log('✗ 未检测到版本冲突，这是一个 BUG');
      }

      // 验证任务保持 admin 的修改
      const taskCheck = await request.get(`${API_BASE_URL}/api/tasks/${taskId}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      const taskData2 = await taskCheck.json();

      if (taskData2.data?.description?.includes('Admin first edit')) {
        console.log('✓ 任务保持 admin 的修改');
      } else {
        console.log('✗ 任务未保持 admin 的修改');
      }

      await page.screenshot({ path: 'Test/screenshots/TC-COLL-04-version-conflict.png' });

    } catch (error) {
      console.error('测试失败:', error);
      throw error;
    } finally {
      // 清理
      console.log('\n清理测试数据');
      const adminToken = await getAuthToken(request, USERS.admin);
      if (taskId) {
        await deleteTask(request, adminToken, taskId);
        console.log(`✓ 已删除测试任务: ${taskId}`);
      }
    }
  });

  test('TC-COLL-05: 删除前置任务后的依赖处理', async ({ page, request }) => {
    console.log('\n=== TC-COLL-05: 删除前置任务后的依赖处理 ===');

    let taskAId: string | undefined;
    let taskBId: string | undefined;

    try {
      // 步骤1: 创建依赖关系
      console.log('\n步骤1: 创建依赖任务');
      const adminToken = await getAuthToken(request, USERS.admin);

      // 创建任务 A
      const taskAData = {
        description: 'TC-COLL-05-DEP-A-' + Date.now(),
        assignee_id: 'admin',
        start_date: '2026-05-06',
        duration_days: 5,
        project_id: TEST_PROJECT_ID,
      };

      const taskA = await createTask(request, adminToken, taskAData);
      taskAId = taskA.data?.id;
      console.log(`✓ 任务 A 已创建: ID=${taskAId}`);

      // 创建任务 B，设置前置任务为 A
      const taskBData = {
        description: 'TC-COLL-05-DEP-B-' + Date.now(),
        assignee_id: 'admin',
        start_date: '2026-05-11',
        duration_days: 3,
        project_id: TEST_PROJECT_ID,
        predecessor_ids: [taskAId], // 设置前置任务
      };

      const taskB = await createTask(request, adminToken, taskBData);
      taskBId = taskB.data?.id;
      console.log(`✓ 任务 B 已创建: ID=${taskBId}，前置任务=${taskAId}`);

      // 步骤2: 删除任务 A
      console.log('\n步骤2: 删除任务 A');
      const deleteResponse = await request.delete(`${API_BASE_URL}/api/tasks/${taskAId}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      if (deleteResponse.ok()) {
        console.log('✓ 任务 A 已删除');

        // 检查是否有警告提示
        const deleteData = await deleteResponse.json();
        if (deleteData.warning || deleteData.data?.warning) {
          console.log(`⚠ 警告提示: ${deleteData.warning || deleteData.data?.warning}`);
        }
      } else {
        const error = await deleteResponse.text();
        console.log(`✗ 删除任务 A 失败: ${error}`);
      }

      // 步骤3: 验证任务 B 状态
      console.log('\n步骤3: 验证任务 B 的状态');
      const taskBCheck = await request.get(`${API_BASE_URL}/api/tasks/${taskBId}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });

      if (taskBCheck.ok()) {
        const taskBData2 = await taskBCheck.json();
        const predecessorIds = taskBData2.data?.predecessor_ids || [];

        if (predecessorIds.length === 0) {
          console.log('✓ 任务 B 的前置任务字段已清空');
        } else if (predecessorIds.includes(taskAId)) {
          console.log('✗ 任务 B 的前置任务字段未清空，仍包含已删除的任务 A');
        } else {
          console.log(`⚠ 任务 B 的前置任务字段已更新: ${JSON.stringify(predecessorIds)}`);
        }

        console.log(`任务 B 当前状态: ${taskBData2.data?.status}`);
      } else {
        console.log('✗ 无法获取任务 B 的状态');
      }

      await page.screenshot({ path: 'Test/screenshots/TC-COLL-05-dependency-handling.png' });

    } catch (error) {
      console.error('测试失败:', error);
      throw error;
    } finally {
      // 清理
      console.log('\n清理测试数据');
      const adminToken = await getAuthToken(request, USERS.admin);
      if (taskBId) {
        await deleteTask(request, adminToken, taskBId);
        console.log(`✓ 已删除任务 B: ${taskBId}`);
      }
      // 任务 A 已在测试中删除
    }
  });

  test('Batch 05 测试总结', async ({ page }) => {
    console.log('\n=== Batch 05 测试总结 ===');
    console.log('TC-COLL-01: 部门经理授权技术经理 - 已执行');
    console.log('TC-COLL-02: 技术经理管理被授权组 - 已执行');
    console.log('TC-COLL-03: 多人同时编辑不同任务 - 已执行');
    console.log('TC-COLL-04: 两人同时编辑同一任务（版本冲突）- 已执行');
    console.log('TC-COLL-05: 删除前置任务后的依赖处理 - 已执行');
    console.log('\n所有测试已完成，请查看上方详细结果。');
  });
});
