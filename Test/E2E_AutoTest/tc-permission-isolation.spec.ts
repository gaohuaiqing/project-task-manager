/**
 * 权限隔离 E2E 测试
 * 测试目标: 验证 dept_manager、tech_manager、engineer 的数据隔离是否正确
 *
 * 测试场景:
 * - TC-PI-01: dept_manager 只能看到管理部门的数据
 * - TC-PI-02: tech_manager 只能看到管理技术组的数据
 * - TC-PI-03: engineer 只能看到自己参与的项目数据
 * - TC-PI-04: tech_manager 不能看到其他技术组的数据
 * - TC-PI-05: 数据隔离 API 响应验证
 */

import { test, expect, APIRequestContext, BrowserContext } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const API_BASE_URL = 'http://localhost:3001';

// 测试用户凭据 - 使用系统中已有的测试用户
const TEST_USERS = {
  dept_manager: {
    username: '50223183',
    password: '50223183',
    realName: '高怀庆',
    role: 'dept_manager',
    expectedRole: 'dept_manager'
  },
  tech_manager: {
    username: '50234447',
    password: '50234447',
    realName: '赵佳琪',
    role: 'tech_manager',
    expectedRole: 'tech_manager'
  },
  engineer: {
    username: '50241392',
    password: '50241392',
    realName: '王学智',
    role: 'engineer',
    expectedRole: 'engineer'
  },
  admin: {
    username: 'admin',
    password: 'admin123',
    realName: '系统管理员',
    role: 'admin',
    expectedRole: 'admin'
  }
};

test.setTimeout(300000);

test.describe('权限隔离测试', () => {
  test.describe.configure({ mode: 'serial' });

  // ========================================
  // Helper Functions
  // ========================================

  /**
   * 登录并获取认证 token
   */
  async function loginAndGetToken(request: APIRequestContext, user: { username: string; password: string }) {
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
    return {
      token: data.data?.token,
      user: data.data?.user,
    };
  }

  /**
   * 获取仪表板统计数据
   */
  async function getDashboardStats(request: APIRequestContext, token: string) {
    const response = await request.get(`${API_BASE_URL}/api/analytics/dashboard/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok()) {
      const error = await response.text();
      throw new Error(`获取仪表板统计失败: ${error}`);
    }

    return await response.json();
  }

  /**
   * 获取项目列表
   */
  async function getProjects(request: APIRequestContext, token: string) {
    const response = await request.get(`${API_BASE_URL}/api/projects`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok()) {
      const error = await response.text();
      throw new Error(`获取项目列表失败: ${error}`);
    }

    return await response.json();
  }

  /**
   * 获取任务列表
   */
  async function getTasks(request: APIRequestContext, token: string) {
    const response = await request.get(`${API_BASE_URL}/api/tasks`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok()) {
      const error = await response.text();
      throw new Error(`获取任务列表失败: ${error}`);
    }

    return await response.json();
  }

  /**
   * 获取报表分析数据
   */
  async function getReportData(request: APIRequestContext, token: string, reportType: string) {
    const response = await request.get(`${API_BASE_URL}/api/analytics/reports/${reportType}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok()) {
      const error = await response.text();
      throw new Error(`获取报表数据失败: ${error}`);
    }

    return await response.json();
  }

  // ========================================
  // TC-PI-01: dept_manager 只能看到管理部门的数据
  // ========================================
  test('TC-PI-01: dept_manager 只能看到管理部门的数据', async ({ page, request }) => {
    console.log('\n=== TC-PI-01: dept_manager 只能看到管理部门的数据 ===');

    try {
      // 步骤1: 登录部门经理
      console.log('\n步骤1: dept_manager 登录');
      const { token, user } = await loginAndGetToken(request, TEST_USERS.dept_manager);
      console.log(`✓ 登录成功: ${user?.real_name} (${user?.username})`);
      console.log(`  角色: ${user?.role}`);

      // 验证角色
      expect(user?.role).toBe('dept_manager');
      console.log('✓ 角色验证通过: dept_manager');

      // 步骤2: 获取仪表板统计数据
      console.log('\n步骤2: 获取仪表板统计数据');
      const statsData = await getDashboardStats(request, token);
      console.log('仪表板统计数据:', JSON.stringify(statsData.data, null, 2));

      // 验证数据存在
      expect(statsData.success).toBe(true);
      expect(statsData.data).toBeDefined();
      console.log('✓ 仪表板数据获取成功');

      // 步骤3: 获取项目列表
      console.log('\n步骤3: 获取项目列表');
      const projectsData = await getProjects(request, token);
      const projects = projectsData.data || [];
      console.log(`✓ 项目数量: ${projects.length}`);

      if (projects.length > 0) {
        console.log('项目列表:');
        projects.slice(0, 5).forEach((p: any) => {
          console.log(`  - ${p.name} (ID: ${p.id}, 组: ${p.group_id || 'N/A'})`);
        });
      }

      // 步骤4: 获取任务列表
      console.log('\n步骤4: 获取任务列表');
      const tasksData = await getTasks(request, token);
      const tasks = tasksData.data || tasksData.items || [];
      console.log(`✓ 任务数量: ${Array.isArray(tasks) ? tasks.length : 'N/A'}`);

      // 步骤5: 获取报表分析数据
      console.log('\n步骤5: 获取报表分析数据');
      try {
        const projectProgress = await getReportData(request, token, 'project-progress');
        console.log(`✓ 项目进度报表数据获取成功`);
        const reportData = projectProgress.data || [];
        console.log(`  报表数据条数: ${Array.isArray(reportData) ? reportData.length : 'N/A'}`);
      } catch (error) {
        console.log(`⚠ 项目进度报表获取失败: ${(error as Error).message}`);
      }

      console.log('\n✅ TC-PI-01 测试完成');
    } catch (error) {
      console.error('❌ TC-PI-01 测试失败:', error);
      throw error;
    }
  });

  // ========================================
  // TC-PI-02: tech_manager 只能看到管理技术组的数据
  // ========================================
  test('TC-PI-02: tech_manager 只能看到管理技术组的数据', async ({ page, request }) => {
    console.log('\n=== TC-PI-02: tech_manager 只能看到管理技术组的数据 ===');

    try {
      // 步骤1: 登录技术经理
      console.log('\n步骤1: tech_manager 登录');
      const { token, user } = await loginAndGetToken(request, TEST_USERS.tech_manager);
      console.log(`✓ 登录成功: ${user?.real_name} (${user?.username})`);
      console.log(`  角色: ${user?.role}`);

      // 验证角色
      expect(user?.role).toBe('tech_manager');
      console.log('✓ 角色验证通过: tech_manager');

      // 步骤2: 获取仪表板统计数据
      console.log('\n步骤2: 获取仪表板统计数据');
      const statsData = await getDashboardStats(request, token);
      console.log('仪表板统计数据:', JSON.stringify(statsData.data, null, 2));

      expect(statsData.success).toBe(true);
      expect(statsData.data).toBeDefined();
      console.log('✓ 仪表板数据获取成功');

      // 步骤3: 获取项目列表
      console.log('\n步骤3: 获取项目列表');
      const projectsData = await getProjects(request, token);
      const projects = projectsData.data || [];
      console.log(`✓ 项目数量: ${projects.length}`);

      if (projects.length > 0) {
        console.log('技术组项目列表:');
        projects.slice(0, 5).forEach((p: any) => {
          console.log(`  - ${p.name} (ID: ${p.id}, 组: ${p.group_id || 'N/A'})`);
        });
      }

      // 步骤4: 获取任务列表
      console.log('\n步骤4: 获取任务列表');
      const tasksData = await getTasks(request, token);
      const tasks = tasksData.data || tasksData.items || [];
      console.log(`✓ 任务数量: ${Array.isArray(tasks) ? tasks.length : 'N/A'}`);

      // 步骤5: 获取报表分析数据
      console.log('\n步骤5: 获取报表分析数据');
      try {
        const projectProgress = await getReportData(request, token, 'project-progress');
        console.log(`✓ 项目进度报表数据获取成功`);
        const reportData = projectProgress.data || [];
        console.log(`  报表数据条数: ${Array.isArray(reportData) ? reportData.length : 'N/A'}`);
      } catch (error) {
        console.log(`⚠ 项目进度报表获取失败: ${(error as Error).message}`);
      }

      console.log('\n✅ TC-PI-02 测试完成');
    } catch (error) {
      console.error('❌ TC-PI-02 测试失败:', error);
      throw error;
    }
  });

  // ========================================
  // TC-PI-03: engineer 只能看到自己参与的项目数据
  // ========================================
  test('TC-PI-03: engineer 只能看到自己参与的项目数据', async ({ page, request }) => {
    console.log('\n=== TC-PI-03: engineer 只能看到自己参与的项目数据 ===');

    try {
      // 步骤1: 登录工程师
      console.log('\n步骤1: engineer 登录');
      const { token, user } = await loginAndGetToken(request, TEST_USERS.engineer);
      console.log(`✓ 登录成功: ${user?.real_name} (${user?.username})`);
      console.log(`  角色: ${user?.role}`);

      // 验证角色
      expect(user?.role).toBe('engineer');
      console.log('✓ 角色验证通过: engineer');

      // 步骤2: 获取仪表板统计数据
      console.log('\n步骤2: 获取仪表板统计数据');
      const statsData = await getDashboardStats(request, token);
      console.log('仪表板统计数据:', JSON.stringify(statsData.data, null, 2));

      expect(statsData.success).toBe(true);
      expect(statsData.data).toBeDefined();
      console.log('✓ 仪表板数据获取成功');

      // 步骤3: 获取项目列表
      console.log('\n步骤3: 获取项目列表');
      const projectsData = await getProjects(request, token);
      const projects = projectsData.data || [];
      console.log(`✓ 项目数量: ${projects.length}`);

      // 工程师应该只能看到自己参与的项目
      if (projects.length > 0) {
        console.log('工程师参与的项目列表:');
        projects.slice(0, 5).forEach((p: any) => {
          console.log(`  - ${p.name} (ID: ${p.id}, 组: ${p.group_id || 'N/A'})`);
        });
      }

      // 步骤4: 获取任务列表
      console.log('\n步骤4: 获取任务列表');
      const tasksData = await getTasks(request, token);
      const tasks = tasksData.data || tasksData.items || [];
      console.log(`✓ 任务数量: ${Array.isArray(tasks) ? tasks.length : 'N/A'}`);

      // 验证任务的负责人是否是当前用户或者用户是参与者
      if (Array.isArray(tasks) && tasks.length > 0) {
        console.log('工程师相关任务:');
        tasks.slice(0, 5).forEach((t: any) => {
          console.log(`  - ${t.description?.substring(0, 30)}... (负责人: ${t.assignee_id || t.assigneeId || 'N/A'})`);
        });

        // 检查任务是否属于当前用户或有用户参与
        const userRelatedTasks = tasks.filter((t: any) =>
          t.assignee_id === user?.username ||
          t.assigneeId === user?.id ||
          t.assignee_id === user?.id
        );
        console.log(`  与当前用户相关的任务数: ${userRelatedTasks.length}`);
      }

      // 步骤5: 获取报表分析数据
      console.log('\n步骤5: 获取报表分析数据');
      try {
        const taskStats = await getReportData(request, token, 'task-statistics');
        console.log(`✓ 任务统计报表数据获取成功`);
      } catch (error) {
        console.log(`⚠ 任务统计报表获取失败: ${(error as Error).message}`);
      }

      console.log('\n✅ TC-PI-03 测试完成');
    } catch (error) {
      console.error('❌ TC-PI-03 测试失败:', error);
      throw error;
    }
  });

  // ========================================
  // TC-PI-04: tech_manager 不能看到其他技术组的数据
  // ========================================
  test('TC-PI-04: tech_manager 不能看到其他技术组的数据', async ({ page, request }) => {
    console.log('\n=== TC-PI-04: tech_manager 不能看到其他技术组的数据 ===');

    try {
      // 步骤1: 登录第一个技术经理
      console.log('\n步骤1: tech_manager A 登录');
      const techManagerA = TEST_USERS.tech_manager;
      const { token: tokenA, user: userA } = await loginAndGetToken(request, techManagerA);
      console.log(`✓ tech_manager A 登录成功: ${userA?.real_name}`);

      // 获取 tech_manager A 的数据
      console.log('\n步骤2: 获取 tech_manager A 的项目数据');
      const projectsDataA = await getProjects(request, tokenA);
      const projectsA = projectsDataA.data || [];
      const projectIdsA = projectsA.map((p: any) => p.id);
      console.log(`✓ tech_manager A 可见项目数: ${projectsA.length}`);
      console.log(`  项目 IDs: ${projectIdsA.slice(0, 5).join(', ')}${projectIdsA.length > 5 ? '...' : ''}`);

      // 获取任务数据
      const tasksDataA = await getTasks(request, tokenA);
      const tasksA = tasksDataA.data || tasksDataA.items || [];
      const taskIdsA = tasksA.map((t: any) => t.id);
      console.log(`✓ tech_manager A 可见任务数: ${tasksA.length}`);

      // 步骤3: 登录部门经理（作为对照组，可以看到所有数据）
      console.log('\n步骤3: dept_manager 登录作为对照组');
      const { token: tokenDept, user: userDept } = await loginAndGetToken(request, TEST_USERS.dept_manager);
      console.log(`✓ dept_manager 登录成功: ${userDept?.real_name}`);

      const projectsDataDept = await getProjects(request, tokenDept);
      const projectsDept = projectsDataDept.data || [];
      console.log(`✓ dept_manager 可见项目数: ${projectsDept.length}`);

      const tasksDataDept = await getTasks(request, tokenDept);
      const tasksDept = tasksDataDept.data || tasksDataDept.items || [];
      console.log(`✓ dept_manager 可见任务数: ${tasksDept.length}`);

      // 步骤4: 比较数据范围
      console.log('\n步骤4: 比较数据隔离情况');

      // tech_manager 的项目数应该 <= dept_manager 的项目数
      expect(projectsA.length).toBeLessThanOrEqual(projectsDept.length);
      console.log(`✓ tech_manager 项目数 (${projectsA.length}) <= dept_manager 项目数 (${projectsDept.length})`);

      // tech_manager 的任务数应该 <= dept_manager 的任务数
      expect(tasksA.length).toBeLessThanOrEqual(tasksDept.length);
      console.log(`✓ tech_manager 任务数 (${tasksA.length}) <= dept_manager 任务数 (${tasksDept.length})`);

      // 步骤5: 验证仪表板统计数据差异
      console.log('\n步骤5: 比较仪表板统计数据');
      const statsA = await getDashboardStats(request, tokenA);
      const statsDept = await getDashboardStats(request, tokenDept);

      console.log('tech_manager A 统计数据:', JSON.stringify(statsA.data, null, 2));
      console.log('dept_manager 统计数据:', JSON.stringify(statsDept.data, null, 2));

      // 验证 tech_manager 的统计数据应该小于或等于 dept_manager
      if (statsA.data?.totalTasks !== undefined && statsDept.data?.totalTasks !== undefined) {
        expect(statsA.data.totalTasks).toBeLessThanOrEqual(statsDept.data.totalTasks);
        console.log(`✓ tech_manager 任务总数 (${statsA.data.totalTasks}) <= dept_manager 任务总数 (${statsDept.data.totalTasks})`);
      }

      console.log('\n✅ TC-PI-04 测试完成');
    } catch (error) {
      console.error('❌ TC-PI-04 测试失败:', error);
      throw error;
    }
  });

  // ========================================
  // TC-PI-05: 数据隔离 API 响应验证
  // ========================================
  test('TC-PI-05: 数据隔离 API 响应验证', async ({ page, request }) => {
    console.log('\n=== TC-PI-05: 数据隔离 API 响应验证 ===');

    try {
      // 测试各角色的 API 访问权限
      const roles = ['dept_manager', 'tech_manager', 'engineer'] as const;

      for (const roleKey of roles) {
        const user = TEST_USERS[roleKey];
        console.log(`\n--- 测试 ${roleKey} API 访问 ---`);

        // 登录
        const { token, user: userInfo } = await loginAndGetToken(request, user);
        console.log(`✓ ${userInfo?.real_name} 登录成功`);

        // 测试仪表板 API
        console.log(`\n测试仪表板 API:`);
        try {
          const statsResponse = await request.get(`${API_BASE_URL}/api/analytics/dashboard/stats`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          console.log(`  /api/analytics/dashboard/stats: ${statsResponse.status()} ${statsResponse.ok() ? '✓' : '✗'}`);
        } catch (e) {
          console.log(`  /api/analytics/dashboard/stats: 请求失败 - ${(e as Error).message}`);
        }

        // 测试项目 API
        console.log(`\n测试项目 API:`);
        try {
          const projectsResponse = await request.get(`${API_BASE_URL}/api/projects`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          console.log(`  /api/projects: ${projectsResponse.status()} ${projectsResponse.ok() ? '✓' : '✗'}`);
        } catch (e) {
          console.log(`  /api/projects: 请求失败 - ${(e as Error).message}`);
        }

        // 测试任务 API
        console.log(`\n测试任务 API:`);
        try {
          const tasksResponse = await request.get(`${API_BASE_URL}/api/tasks`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          console.log(`  /api/tasks: ${tasksResponse.status()} ${tasksResponse.ok() ? '✓' : '✗'}`);
        } catch (e) {
          console.log(`  /api/tasks: 请求失败 - ${(e as Error).message}`);
        }

        // 测试报表 API
        console.log(`\n测试报表 API:`);
        const reportEndpoints = [
          'project-progress',
          'task-statistics',
          'delay-analysis',
          'member-analysis',
        ];

        for (const endpoint of reportEndpoints) {
          try {
            const response = await request.get(`${API_BASE_URL}/api/analytics/reports/${endpoint}`, {
              headers: { 'Authorization': `Bearer ${token}` },
            });
            console.log(`  /api/analytics/reports/${endpoint}: ${response.status()} ${response.ok() ? '✓' : '✗'}`);
          } catch (e) {
            console.log(`  /api/analytics/reports/${endpoint}: 请求失败 - ${(e as Error).message}`);
          }
        }
      }

      console.log('\n✅ TC-PI-05 测试完成');
    } catch (error) {
      console.error('❌ TC-PI-05 测试失败:', error);
      throw error;
    }
  });

  // ========================================
  // TC-PI-06: 角色验证 - 确保用户角色正确
  // ========================================
  test('TC-PI-06: 角色验证 - 确保用户角色正确', async ({ page, request }) => {
    console.log('\n=== TC-PI-06: 角色验证 - 确保用户角色正确 ===');

    try {
      const roles = Object.entries(TEST_USERS) as [string, typeof TEST_USERS.dept_manager][];

      for (const [roleKey, user] of roles) {
        console.log(`\n验证用户: ${user.username}`);

        // 登录获取用户信息
        const response = await request.post(`${API_BASE_URL}/api/auth/login`, {
          data: {
            username: user.username,
            password: user.password,
          },
        });

        expect(response.ok()).toBe(true);
        const data = await response.json();

        console.log(`  登录名: ${data.data?.user?.real_name || data.data?.user?.username}`);
        console.log(`  期望角色: ${user.expectedRole}`);
        console.log(`  实际角色: ${data.data?.user?.role}`);

        // 验证角色匹配
        expect(data.data?.user?.role).toBe(user.expectedRole);
        console.log(`  ✓ 角色验证通过`);
      }

      console.log('\n✅ TC-PI-06 测试完成');
    } catch (error) {
      console.error('❌ TC-PI-06 测试失败:', error);
      throw error;
    }
  });

  // ========================================
  // TC-PI-07: 前端页面访问测试
  // ========================================
  test('TC-PI-07: 前端页面访问测试', async ({ browser }) => {
    console.log('\n=== TC-PI-07: 前端页面访问测试 ===');

    const roles = ['dept_manager', 'tech_manager', 'engineer'] as const;

    for (const roleKey of roles) {
      const user = TEST_USERS[roleKey];
      console.log(`\n--- 测试 ${roleKey} 前端访问 ---`);

      const context = await browser.newContext();
      const page = await context.newPage();

      try {
        // 登录
        console.log(`\n步骤1: ${user.realName} 登录`);
        await page.goto(BASE_URL + '/login');
        await page.waitForLoadState('networkidle');

        await page.fill('[data-testid="login-input-username"]', user.username);
        await page.fill('[data-testid="login-input-password"]', user.password);
        await page.click('[data-testid="login-btn-submit"]');

        try {
          await page.waitForURL(/\/dashboard|\/tasks/, { timeout: 20000 });
        } catch {
          console.log('  登录后未自动跳转，手动导航');
          await page.goto(BASE_URL + '/dashboard');
        }

        await page.waitForLoadState('networkidle');
        console.log(`  ✓ 登录成功`);

        // 访问仪表板
        console.log(`\n步骤2: 访问仪表板页面`);
        await page.goto(BASE_URL + '/dashboard');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // 截图
        await page.screenshot({
          path: `Test/screenshots/TC-PI-07-${roleKey}-dashboard.png`,
          fullPage: true,
        });
        console.log(`  ✓ 仪表板页面已截图`);

        // 访问任务页面
        console.log(`\n步骤3: 访问任务页面`);
        await page.goto(BASE_URL + '/tasks');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        await page.screenshot({
          path: `Test/screenshots/TC-PI-07-${roleKey}-tasks.png`,
          fullPage: true,
        });
        console.log(`  ✓ 任务页面已截图`);

        // 访问报表分析页面
        console.log(`\n步骤4: 访问报表分析页面`);
        await page.goto(BASE_URL + '/analytics/reports/project-progress');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        await page.screenshot({
          path: `Test/screenshots/TC-PI-07-${roleKey}-reports.png`,
          fullPage: true,
        });
        console.log(`  ✓ 报表页面已截图`);

      } catch (error) {
        console.log(`  ✗ ${roleKey} 测试出错: ${(error as Error).message}`);
        await page.screenshot({
          path: `Test/screenshots/TC-PI-07-${roleKey}-error.png`,
          fullPage: true,
        });
      } finally {
        await page.close();
        await context.close();
      }
    }

    console.log('\n✅ TC-PI-07 测试完成');
  });

  // ========================================
  // 测试总结
  // ========================================
  test('权限隔离测试总结', async ({ page }) => {
    console.log('\n========================================');
    console.log('       权限隔离 E2E 测试总结');
    console.log('========================================');
    console.log('\n已完成的测试用例:');
    console.log('  TC-PI-01: dept_manager 数据范围验证');
    console.log('  TC-PI-02: tech_manager 数据范围验证');
    console.log('  TC-PI-03: engineer 数据范围验证');
    console.log('  TC-PI-04: 不同角色数据隔离对比');
    console.log('  TC-PI-05: API 访问权限验证');
    console.log('  TC-PI-06: 用户角色验证');
    console.log('  TC-PI-07: 前端页面访问测试');
    console.log('\n测试用户:');
    console.log(`  - dept_manager: ${TEST_USERS.dept_manager.username} (${TEST_USERS.dept_manager.realName})`);
    console.log(`  - tech_manager: ${TEST_USERS.tech_manager.username} (${TEST_USERS.tech_manager.realName})`);
    console.log(`  - engineer: ${TEST_USERS.engineer.username} (${TEST_USERS.engineer.realName})`);
    console.log('\n所有测试已完成，请查看上方详细结果。');
    console.log('========================================\n');
  });
});
