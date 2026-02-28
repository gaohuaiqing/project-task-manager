/**
 * 压力测试脚本
 *
 * 测试系统在高并发情况下的表现：
 * 1. 100个并发用户同时创建项目
 * 2. 50个并发用户同时更新同一项目（测试乐观锁）
 * 3. 测量响应时间、吞吐量、错误率
 *
 * 使用方法：
 * npm run test:load
 */

import { performance } from 'perf_hooks';

// 测试配置
const API_BASE = 'http://localhost:3001';
const CONCURRENT_USERS = 100;
const CONCURRENT_UPDATES = 50;

// 测试结果
interface TestResults {
  testName: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
}

class LoadTester {
  private sessionIds: string[] = [];

  /**
   * 初始化测试环境
   */
  async setup(): Promise<void> {
    console.log('🔧 初始化测试环境...');

    // 创建测试会话（使用现有的admin用户）
    const createSessionPromises = Array.from({ length: 10 }, async () => {
      const response = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'admin',
          password: 'admin123'
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.session?.sessionId;
      }
      return null;
    });

    const sessions = await Promise.all(createSessionPromises);
    this.sessionIds = sessions.filter(s => s !== null) as string[];

    console.log(`✅ 测试环境已准备，获得 ${this.sessionIds.length} 个会话`);
  }

  /**
   * 清理测试环境
   */
  async teardown(): Promise<void> {
    console.log('🧹 清理测试环境...');

    // 删除测试数据
    for (const sessionId of this.sessionIds) {
      await fetch(`${API_BASE}/api/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
    }

    console.log('✅ 测试环境已清理');
  }

  /**
   * 发送请求并测量响应时间
   */
  private async makeRequest(
    endpoint: string,
    options?: RequestInit
  ): Promise<{ success: boolean; responseTime: number; status: number }> {
    const sessionId = this.sessionIds[Math.floor(Math.random() * this.sessionIds.length)];

    const startTime = performance.now();
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': sessionId,
          ...options?.headers
        }
      });

      const responseTime = performance.now() - startTime;

      // 调试输出（前10个请求）
      if (this.debugCounter < 10) {
        this.debugCounter++;
        console.log(`[DEBUG] 请求 ${this.debugCounter}: ${endpoint} - 状态: ${response.status}, ok: ${response.ok}`);
      }

      return {
        success: response.ok,
        responseTime,
        status: response.status
      };
    } catch (error: any) {
      const responseTime = performance.now() - startTime;
      if (this.debugCounter < 10) {
        console.log(`[DEBUG] 请求失败: ${error.message}`);
      }
      return {
        success: false,
        responseTime,
        status: 0
      };
    }
  }

  private debugCounter = 0;

  /**
   * 测试1：并发创建项目
   */
  async testConcurrentProjectCreation(): Promise<TestResults> {
    console.log('\n📊 测试1: 并发创建项目');
    console.log(`   请求数量: ${CONCURRENT_USERS}`);

    const startTime = performance.now();
    const responseTimes: number[] = [];
    let successCount = 0;
    let failCount = 0;

    const promises = Array.from({ length: CONCURRENT_USERS }, async (_, i) => {
      const result = await this.makeRequest('/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          code: `LOAD-TEST-${i}`,
          name: `压力测试项目 ${i}`,
          description: '这是一个压力测试项目',
          project_type: 'other'
        })
      });

      responseTimes.push(result.responseTime);
      if (result.success) {
        successCount++;
      } else {
        failCount++;
      }

      return result;
    });

    await Promise.all(promises);
    const totalTime = performance.now() - startTime;

    const results: TestResults = {
      testName: '并发创建项目',
      totalRequests: CONCURRENT_USERS,
      successfulRequests: successCount,
      failedRequests: failCount,
      avgResponseTime: responseTimes.reduce((a, b) => a + b) / responseTimes.length,
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      requestsPerSecond: (CONCURRENT_USERS / totalTime) * 1000,
      errorRate: (failCount / CONCURRENT_USERS) * 100
    };

    this.printResults(results);
    return results;
  }

  /**
   * 测试2：并发更新同一项目（乐观锁测试）
   */
  async testConcurrentProjectUpdate(): Promise<TestResults> {
    console.log('\n📊 测试2: 并发更新同一项目（乐观锁）');
    console.log(`   请求数量: ${CONCURRENT_UPDATES}`);

    // 先创建一个测试项目
    const createResult = await this.makeRequest('/api/projects', {
      method: 'POST',
      body: JSON.stringify({
        code: 'LOCK-TEST-001',
        name: '乐观锁测试项目',
        description: '用于测试乐观锁',
        project_type: 'other'
      })
    });

    if (!createResult.success) {
      throw new Error('创建测试项目失败');
    }

    const projectData = await createResult.response.json();
    const projectId = projectData.data.id;

    // 并发更新
    const startTime = performance.now();
    const responseTimes: number[] = [];
    let successCount = 0;
    let conflictCount = 0;
    let errorCount = 0;

    const promises = Array.from({ length: CONCURRENT_UPDATES }, async (_, i) => {
      const result = await this.makeRequest(`/api/projects/${projectId}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: `更新的项目 ${i}`,
          progress: Math.floor(Math.random() * 100),
          expectedVersion: 1 // 使用相同的版本号，制造冲突
        })
      });

      responseTimes.push(result.responseTime);

      if (result.status === 200) {
        successCount++;
      } else if (result.status === 409) {
        conflictCount++;
      } else {
        errorCount++;
      }

      return result;
    });

    await Promise.all(promises);
    const totalTime = performance.now() - startTime;

    const results: TestResults = {
      testName: '并发更新同一项目',
      totalRequests: CONCURRENT_UPDATES,
      successfulRequests: successCount,
      failedRequests: conflictCount + errorCount,
      avgResponseTime: responseTimes.reduce((a, b) => a + b) / responseTimes.length,
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      requestsPerSecond: (CONCURRENT_UPDATES / totalTime) * 1000,
      errorRate: ((conflictCount + errorCount) / CONCURRENT_UPDATES) * 100
    };

    this.printResults(results);

    // 额外输出冲突信息
    console.log(`   冲突数量: ${conflictCount}`);
    console.log(`   其他错误: ${errorCount}`);

    // 清理测试项目
    await this.makeRequest(`/api/projects/${projectId}`, {
      method: 'DELETE'
    });

    return results;
  }

  /**
   * 测试3：混合负载测试
   */
  async testMixedWorkload(): Promise<TestResults> {
    console.log('\n📊 测试3: 混合负载');
    console.log(`   操作数量: 200 (50% 读取, 30% 创建, 20% 更新)`);

    const operations = [
      // 100次读取
      ...Array.from({ length: 100 }, () => ({
        method: 'GET',
        endpoint: '/api/projects'
      })),
      // 60次创建
      ...Array.from({ length: 60 }, (_, i) => ({
        method: 'POST',
        endpoint: '/api/projects',
        body: JSON.stringify({
          code: `MIX-TEST-${i}`,
          name: `混合测试项目 ${i}`,
          project_type: 'other'
        })
      })),
      // 40次更新
      ...Array.from({ length: 40 }, (_, i) => ({
        method: 'PUT',
        endpoint: '/api/projects/1', // 假设项目ID为1存在
        body: JSON.stringify({
          progress: i * 2
        })
      }))
    ];

    // 随机打乱顺序
    operations.sort(() => Math.random() - 0.5);

    const startTime = performance.now();
    const responseTimes: number[] = [];
    let successCount = 0;
    let failCount = 0;

    const promises = operations.map(async (op) => {
      const result = await this.makeRequest(op.endpoint, {
        method: op.method || 'GET',
        body: op.body ? JSON.stringify(op.body) : undefined
      });

      responseTimes.push(result.responseTime);
      if (result.success) {
        successCount++;
      } else {
        failCount++;
      }

      return result;
    });

    await Promise.all(promises);
    const totalTime = performance.now() - startTime;

    const results: TestResults = {
      testName: '混合负载',
      totalRequests: operations.length,
      successfulRequests: successCount,
      failedRequests: failCount,
      avgResponseTime: responseTimes.reduce((a, b) => a + b) / responseTimes.length,
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      requestsPerSecond: (operations.length / totalTime) * 1000,
      errorRate: (failCount / operations.length) * 100
    };

    this.printResults(results);
    return results;
  }

  /**
   * 打印测试结果
   */
  private printResults(results: TestResults): void {
    console.log('\n📈 测试结果:');
    console.log(`   总请求数: ${results.totalRequests}`);
    console.log(`   成功请求: ${results.successfulRequests}`);
    console.log(`   失败请求: ${results.failedRequests}`);
    console.log(`   平均响应时间: ${results.avgResponseTime.toFixed(2)}ms`);
    console.log(`   最小响应时间: ${results.minResponseTime.toFixed(2)}ms`);
    console.log(`   最大响应时间: ${results.maxResponseTime.toFixed(2)}ms`);
    console.log(`   吞吐量: ${results.requestsPerSecond.toFixed(2)} 请求/秒`);
    console.log(`   错误率: ${results.errorRate.toFixed(2)}%`);

    // 性能评估
    if (results.avgResponseTime < 100) {
      console.log('   ✅ 性能: 优秀');
    } else if (results.avgResponseTime < 500) {
      console.log('   ⚠️  性能: 良好');
    } else {
      console.log('   ❌ 性能: 需要优化');
    }

    if (results.errorRate < 1) {
      console.log('   ✅ 稳定性: 优秀');
    } else if (results.errorRate < 5) {
      console.log('   ⚠️  稳定性: 良好');
    } else {
      console.log('   ❌ 稳定性: 需要改进');
    }
  }

  /**
   * 运行所有测试
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 开始压力测试\n');

    try {
      await this.setup();

      const test1 = await this.testConcurrentProjectCreation();
      await new Promise(resolve => setTimeout(resolve, 1000)); // 间隔1秒

      const test2 = await this.testConcurrentProjectUpdate();
      await new Promise(resolve => setTimeout(resolve, 1000));

      const test3 = await this.testMixedWorkload();

      // 汇总报告
      console.log('\n' + '='.repeat(60));
      console.log('📊 压力测试汇总报告');
      console.log('='.repeat(60));

      const allTests = [test1, test2, test3];
      const totalRequests = allTests.reduce((sum, t) => sum + t.totalRequests, 0);
      const totalSuccessful = allTests.reduce((sum, t) => sum + t.successfulRequests, 0);
      const totalFailed = allTests.reduce((sum, t) => sum + t.failedRequests, 0);
      const avgResponseTime = allTests.reduce((sum, t) => sum + t.avgResponseTime, 0) / allTests.length;
      const overallErrorRate = (totalFailed / totalRequests) * 100;

      console.log(`\n总计请求数: ${totalRequests}`);
      console.log(`成功请求: ${totalSuccessful} (${((totalSuccessful / totalRequests) * 100).toFixed(2)}%)`);
      console.log(`失败请求: ${totalFailed} (${overallErrorRate.toFixed(2)}%)`);
      console.log(`平均响应时间: ${avgResponseTime.toFixed(2)}ms`);

      console.log('\n' + '='.repeat(60));
      console.log('✅ 压力测试完成！');
      console.log('='.repeat(60) + '\n');

    } catch (error) {
      console.error('❌ 压力测试失败:', error);
    } finally {
      await this.teardown();
    }
  }
}

// ==================== CLI入口 ====================

async function main() {
  const tester = new LoadTester();

  // 检查服务器是否运行
  try {
    const response = await fetch(`${API_BASE}/health`);
    if (!response.ok) {
      throw new Error('服务器响应异常');
    }
  } catch (error) {
    console.error('❌ 无法连接到服务器，请确保服务器正在运行');
    console.error(`   服务器地址: ${API_BASE}`);
    process.exit(1);
  }

  await tester.runAllTests();
}

main().catch(console.error);
